import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";
import {
  getAllCategories,
  getPublishedArticles,
  getArticleBySlug,
  getArticleTranslations,
  getArticleTranslation,
  createArticle,
  updateArticle,
  upsertArticleTranslation,
  getAllArticlesAdmin,
  getArticleById,
  deleteArticle,
  createSubscriber,
  getAllSubscribers,
  getSubscriberCount,
  getAllBrandGuidelines,
  upsertBrandGuideline,
  deleteBrandGuideline,
  getAllCurators,
  upsertCurator,
  deleteCurator,
  recordPageView,
  recordCtaClick,
  getAllAiWriters,
  getAiWriterById,
  upsertAiWriter,
  deleteAiWriter,
  getKpiSummary,
  getDailyPvTimeseries,
  getDailyCtaTimeseries,
  getTopPages,
  getCountryDistribution,
  getAiCrawlerBreakdown,
  getLangDistribution,
} from "./db";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Writer guard middleware (admin or writer)
const writerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'writer'].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "CMS へのアクセスには writer 以上の権限が必要です。" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Categories ─────────────────────────────────────────────────────────────
  categories: router({
    list: publicProcedure.query(() => getAllCategories()),
  }),

  // ─── Articles (public) ──────────────────────────────────────────────────────
  articles: router({
    list: publicProcedure
      .input(
        z.object({
          categorySlug: z.string().optional(),
          lang: z.enum(["ja", "en", "ko", "zh-TW"]).optional(),
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(({ input }) =>
        getPublishedArticles({
          categorySlug: input.categorySlug,
          lang: input.lang,
          limit: input.limit,
          offset: input.offset,
        })
      ),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string(), lang: z.enum(["ja", "en", "ko", "zh-TW"]).default("ja") }))
      .query(async ({ input }) => {
        const article = await getArticleBySlug(input.slug);
        if (!article) throw new TRPCError({ code: "NOT_FOUND" });
        const translation = await getArticleTranslation(article.articles.id, input.lang);
        const allTranslations = await getArticleTranslations(article.articles.id);
        return { article, translation, allTranslations };
      }),
  }),

    // ─── CMS (admin) ────────────────────────────────────────────────────────────
  cms: router({
    listAll: writerProcedure.query(() => getAllArticlesAdmin()),

    // Upload thumbnail image (base64) and return the storage URL
    uploadThumbnail: writerProcedure
      .input(
        z.object({
          articleId: z.number(),
          base64: z.string().min(1),
          mimeType: z.string().default("image/jpeg"),
          filename: z.string().default("thumbnail.jpg"),
        })
      )
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `thumbnails/article-${input.articleId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        // Update article thumbnailUrl
        await updateArticle(input.articleId, { thumbnailUrl: url });
        return { url };
      }),

    uploadImage: writerProcedure
      .input(
        z.object({
          base64: z.string().min(1),
          mimeType: z.string().default("image/jpeg"),
          filename: z.string().default("image.jpg"),
        })
      )
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `images/inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),

    getById: writerProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const article = await getArticleById(input.id);
        if (!article) throw new TRPCError({ code: "NOT_FOUND" });
        const translations = await getArticleTranslations(input.id);
        return { article, translations };
      }),

    create: writerProcedure
      .input(
        z.object({
          slug: z.string().min(1),
          categoryId: z.number(),
          schemaType: z.enum(["Article", "HowTo", "FAQPage"]).default("Article"),
          status: z.enum(["draft", "published", "archived"]).default("draft"),
          thumbnailUrl: z.string().optional(),
          publishedAt: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await createArticle({
          slug: input.slug,
          categoryId: input.categoryId,
          schemaType: input.schemaType,
          status: input.status,
          thumbnailUrl: input.thumbnailUrl,
          publishedAt: input.publishedAt,
        });
        return { id };
      }),

    update: writerProcedure
      .input(
        z.object({
          id: z.number(),
          slug: z.string().min(1).optional(),
          categoryId: z.number().optional(),
          schemaType: z.enum(["Article", "HowTo", "FAQPage"]).optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
          thumbnailUrl: z.string().optional().nullable(),
          publishedAt: z.date().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateArticle(id, data as any);
        return { success: true };
      }),

    upsertTranslation: writerProcedure
      .input(
        z.object({
          articleId: z.number(),
          lang: z.enum(["ja", "en", "ko", "zh-TW"]),
          title: z.string().min(1),
          excerpt: z.string().optional(),
          body: z.string().min(1),
          directAnswer: z.string().optional(),
          metaTitle: z.string().optional(),
          metaDescription: z.string().optional(),
          schemaData: z.any().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Auto-generate directAnswer via LLM if empty
        let directAnswer = input.directAnswer;
        if (!directAnswer || directAnswer.trim() === "") {
          try {
            const langLabel: Record<string, string> = {
              ja: "日本語",
              en: "English",
              ko: "한국어",
              "zh-TW": "繁體中文",
            };
            const lang = langLabel[input.lang] ?? input.lang;
            const bodySnippet = input.body.replace(/<[^>]+>/g, "").slice(0, 2000);
            const res = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `You are a travel content editor. Write a concise, factual direct-answer paragraph (2-3 sentences, ${lang}) that directly answers the key question implied by the article title. This will be used as a GEO (Generative Engine Optimization) answer block shown at the top of the article. Do NOT use markdown, bullet points, or headings. Plain text only.`,
                },
                {
                  role: "user",
                  content: `Article title: ${input.title}\n\nArticle body (excerpt):\n${bodySnippet}`,
                },
              ],
            });
            const rawContent = res?.choices?.[0]?.message?.content;
            directAnswer = (typeof rawContent === "string" ? rawContent : "").trim();
          } catch (e) {
            // LLM failure is non-fatal — save without directAnswer
            console.error("[directAnswer LLM] failed:", e);
          }
        }
        await upsertArticleTranslation({ ...input, directAnswer } as any);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // delete remains admin-only
        await deleteArticle(input.id);
        return { success: true };
      }),
  }),

  // ─── Analytics (tracking + admin dashboard) ────────────────────────────────
  analytics: router({
    // Public: record a page view (fire-and-forget)
    trackPageView: publicProcedure
      .input(z.object({
        path: z.string().max(512),
        articleId: z.number().optional(),
        sessionId: z.string().max(64).optional(),
        lang: z.string().max(8).optional(),
        referrer: z.string().max(512).optional(),
        userAgent: z.string().max(256).optional(),
        isAiCrawler: z.boolean().default(false),
        crawlerName: z.string().max(64).optional(),
        country: z.string().max(8).optional(),
      }))
      .mutation(async ({ input }) => {
        await recordPageView(input);
        return { ok: true };
      }),

    // Public: record a CTA click (fire-and-forget)
    trackCtaClick: publicProcedure
      .input(z.object({
        target: z.enum(["yah_mobile", "yah_homes", "esim_buy", "esim_hero", "esim_article"]),
        sourcePath: z.string().max(512),
        articleId: z.number().optional(),
        sessionId: z.string().max(64).optional(),
        lang: z.string().max(8).optional(),
        referrer: z.string().max(512).optional(),
      }))
      .mutation(async ({ input }) => {
        await recordCtaClick(input);
        return { ok: true };
      }),

    // Admin: KPI summary
    kpiSummary: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(({ input }) => getKpiSummary(input.days)),

    // Admin: daily PV/UV timeseries
    dailyPv: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(({ input }) => getDailyPvTimeseries(input.days)),

    // Admin: daily CTA clicks timeseries
    dailyCta: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(({ input }) => getDailyCtaTimeseries(input.days)),

    // Admin: top pages
    topPages: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30), limit: z.number().min(1).max(50).default(10) }))
      .query(({ input }) => getTopPages(input.days, input.limit)),

    // Admin: country distribution
    countryDist: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(({ input }) => getCountryDistribution(input.days)),

    // Admin: AI crawler breakdown
    aiCrawlers: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(({ input }) => getAiCrawlerBreakdown(input.days)),

    // Admin: language distribution
    langDist: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(({ input }) => getLangDistribution(input.days)),
  }),

  // ─── Subscribers ────────────────────────────────────────────────────────────
  subscribers: router({
    subscribe: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(256),
          email: z.string().email().max(320),
          lang: z.enum(["ja", "en", "ko", "zh-TW"]).default("ja"),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await createSubscriber(input);
          // Notify owner
          await notifyOwner({
            title: "新しいメールマガジン登録",
            content: `名前: ${input.name}\nメール: ${input.email}\n言語: ${input.lang}`,
          });
          return { success: true };
        } catch (err: any) {
          if (err?.message?.includes("Duplicate") || err?.code === "ER_DUP_ENTRY") {
            throw new TRPCError({ code: "CONFLICT", message: "このメールアドレスはすでに登録されています。" });
          }
          throw err;
        }
      }),

        list: adminProcedure.query(() => getAllSubscribers()),
    count: adminProcedure.query(() => getSubscriberCount()),
  }),

  // ─── Brand Guidelines (admin) ──────────────────────────────────────────────────────────────────────────────────
  brandGuidelines: router({
    list: adminProcedure.query(() => getAllBrandGuidelines()),
    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          category: z.string().min(1).max(128),
          key: z.string().min(1).max(128),
          value: z.string().min(1),
          description: z.string().optional(),
          sortOrder: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const id = await upsertBrandGuideline(input as any);
        return { id };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBrandGuideline(input.id);
        return { success: true };
      }),
  }),

  // ─── Curators (admin) ─────────────────────────────────────────────────────────────────────────────────────────────────
  curators: router({
    list: adminProcedure.query(() => getAllCurators()),
    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1).max(256),
          url: z.string().url(),
          platform: z.string().max(64).optional(),
          notes: z.string().optional(),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        const id = await upsertCurator(input as any);
        return { id };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCurator(input.id);
        return { success: true };
      }),
  }),
  // ─── AI Writers (admin) ──────────────────────────────────────────────────────
  aiWriters: router({
    // Public: list active writers for /writers page
    listPublic: publicProcedure.query(() => getAllAiWriters()),
    list: adminProcedure.query(() => getAllAiWriters()),
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getAiWriterById(input.id)),
    upsert: adminProcedure
      .input(
        z.object({
          id: z.number().optional(),
          name: z.string().min(1).max(256),
          slug: z.string().min(1).max(128),
          avatarUrl: z.string().optional(),
          bio: z.string().optional(),
          tone: z.string().max(128).optional(),
          persona: z.string().optional(),
          writingStyle: z.string().optional(),
          forbiddenWords: z.string().optional(),
          sampleText: z.string().optional(),
          languages: z.string().default("ja"),
          categorySpecialties: z.string().optional(),
          isActive: z.boolean().default(true),
          sortOrder: z.number().default(0),
          writerType: z.enum(["human", "ai"]).default("ai"),
        })
      )
      .mutation(async ({ input }) => {
        const id = await upsertAiWriter(input as any);
        return { id };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAiWriter(input.id);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
