import { eq, desc, and, sql, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  articles,
  articleTranslations,
  categories,
  subscribers,
  tags,
  articleTags,
  type Article,
  type ArticleTranslation,
  type Category,
  type InsertArticle,
  type InsertArticleTranslation,
  type InsertSubscriber,
  aiWriters,
  type AiWriter,
  type InsertAiWriter,
} from "../drizzle/schema";
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function getUserByFirebaseUid(firebaseUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserByFirebase(data: {
  firebaseUid: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: "user" | "admin";
}): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert firebase user: database not available"); return; }
  const now = new Date();
  await db
    .insert(users)
    .values({
      firebaseUid: data.firebaseUid,
      name: data.name ?? null,
      email: data.email ?? null,
      avatarUrl: data.avatarUrl ?? null,
      role: data.role ?? "user",
      lastSignedIn: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        name: data.name ?? null,
        email: data.email ?? null,
        avatarUrl: data.avatarUrl ?? null,
        lastSignedIn: now,
        updatedAt: now,
      },
    });
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.sortOrder);
}

// ─── Articles ─────────────────────────────────────────────────────────────────
export async function getPublishedArticles(opts?: {
  categorySlug?: string;
  lang?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  // Build query with joins
  const query = db
    .select({
      id: articles.id,
      slug: articles.slug,
      schemaType: articles.schemaType,
      thumbnailUrl: articles.thumbnailUrl,
      publishedAt: articles.publishedAt,
      categoryId: articles.categoryId,
      categorySlug: categories.slug,
      categoryNameJa: categories.nameJa,
      categoryNameEn: categories.nameEn,
      categoryNameKo: categories.nameKo,
      categoryNameZhTw: categories.nameZhTw,
      translationId: articleTranslations.id,
      lang: articleTranslations.lang,
      title: articleTranslations.title,
      excerpt: articleTranslations.excerpt,
      metaTitle: articleTranslations.metaTitle,
      metaDescription: articleTranslations.metaDescription,
    })
    .from(articles)
    .innerJoin(categories, eq(articles.categoryId, categories.id))
    .innerJoin(articleTranslations, eq(articleTranslations.articleId, articles.id))
    .where(
      and(
        eq(articles.status, "published"),
        opts?.lang ? eq(articleTranslations.lang, opts.lang as any) : undefined,
        opts?.categorySlug ? eq(categories.slug, opts.categorySlug) : undefined,
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);

  return query;
}

export async function getArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(articles)
    .innerJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(aiWriters, eq(articles.writerId, aiWriters.id))
    .where(eq(articles.slug, slug))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getArticleTranslations(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(articleTranslations).where(eq(articleTranslations.articleId, articleId));
}

export async function getArticleTranslation(articleId: number, lang: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(articleTranslations)
    .where(and(eq(articleTranslations.articleId, articleId), eq(articleTranslations.lang, lang as any)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createArticle(data: InsertArticle): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(articles).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

export async function updateArticle(id: number, data: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(articles).set(data).where(eq(articles.id, id));
}

export async function upsertArticleTranslation(data: InsertArticleTranslation) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(articleTranslations)
    .where(and(eq(articleTranslations.articleId, data.articleId), eq(articleTranslations.lang, data.lang)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(articleTranslations).set(data).where(eq(articleTranslations.id, existing[0].id));
  } else {
    await db.insert(articleTranslations).values(data);
  }
}

export async function getAllArticlesAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      status: articles.status,
      schemaType: articles.schemaType,
      thumbnailUrl: articles.thumbnailUrl,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      categoryId: articles.categoryId,
      categorySlug: categories.slug,
      categoryNameJa: categories.nameJa,
    })
    .from(articles)
    .innerJoin(categories, eq(articles.categoryId, categories.id))
    .orderBy(desc(articles.updatedAt));
}

export async function getArticleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(articleTranslations).where(eq(articleTranslations.articleId, id));
  await db.delete(articleTags).where(eq(articleTags.articleId, id));
  await db.delete(articles).where(eq(articles.id, id));
}

// ─── Subscribers ──────────────────────────────────────────────────────────────
export async function createSubscriber(data: InsertSubscriber) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(subscribers).values(data);
}

export async function getAllSubscribers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
}

export async function getSubscriberCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(subscribers).where(eq(subscribers.status, "active"));
  return result[0]?.count ?? 0;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
import {
  pageViews,
  ctaClicks,
  aiCrawlLogs,
  type InsertPageView,
  type InsertCtaClick,
} from "../drizzle/schema";

export async function recordPageView(data: InsertPageView) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(pageViews).values(data);
  } catch (e) {
    console.warn("[Analytics] Failed to record page view:", e);
  }
}

export async function recordCtaClick(data: InsertCtaClick) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(ctaClicks).values(data);
  } catch (e) {
    console.warn("[Analytics] Failed to record CTA click:", e);
  }
}

export async function recordAiCrawl(data: { crawlerName: string; path: string; userAgent?: string }) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(aiCrawlLogs).values(data);
  } catch (e) {
    console.warn("[Analytics] Failed to record AI crawl:", e);
  }
}

// Helper: convert Date to MySQL-compatible datetime string
function toMysqlDatetime(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// KPI summary: total PV, UV, AI crawls, CTA clicks (last N days)
export async function getKpiSummary(days = 30) {
  const db = await getDb();
  if (!db) return { totalPv: 0, totalUv: 0, aiCrawls: 0, ctaTotal: 0, mobileClicks: 0, homesClicks: 0, newSubscribers: 0 };

  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [pvRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, sinceDate), eq(pageViews.isAiCrawler, false)));

  const [uvRow] = await db
    .select({ count: sql<number>`count(distinct ${pageViews.sessionId})` })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, sinceDate), eq(pageViews.isAiCrawler, false)));

  const [aiRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, sinceDate), eq(pageViews.isAiCrawler, true)));

  const [ctaRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ctaClicks)
    .where(gte(ctaClicks.createdAt, sinceDate));

  const [mobileRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ctaClicks)
    .where(and(gte(ctaClicks.createdAt, sinceDate), eq(ctaClicks.target, "yah_mobile")));

  const [homesRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ctaClicks)
    .where(and(gte(ctaClicks.createdAt, sinceDate), eq(ctaClicks.target, "yah_homes")));

  const [subRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscribers)
    .where(gte(subscribers.createdAt, sinceDate));

  return {
    totalPv: pvRow?.count ?? 0,
    totalUv: uvRow?.count ?? 0,
    aiCrawls: aiRow?.count ?? 0,
    ctaTotal: ctaRow?.count ?? 0,
    mobileClicks: mobileRow?.count ?? 0,
    homesClicks: homesRow?.count ?? 0,
    newSubscribers: subRow?.count ?? 0,
  };
}

// Daily PV/UV timeseries for the last N days
export async function getDailyPvTimeseries(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      date: sql<string>`DATE(createdAt)`,
      pv: sql<number>`count(*)`,
      uv: sql<number>`count(distinct sessionId)`,
      aiCrawls: sql<number>`sum(case when isAiCrawler = 1 then 1 else 0 end)`,
    })
    .from(pageViews)
    .where(gte(pageViews.createdAt, sinceDate))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);
  return rows;
}

// Daily CTA clicks timeseries
export async function getDailyCtaTimeseries(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      date: sql<string>`DATE(createdAt)`,
      target: ctaClicks.target,
      count: sql<number>`count(*)`,
    })
    .from(ctaClicks)
    .where(gte(ctaClicks.createdAt, sinceDate))
    .groupBy(sql`DATE(createdAt)`, ctaClicks.target)
    .orderBy(sql`DATE(createdAt)`);
  return rows;
}

// Top pages by PV
export async function getTopPages(days = 30, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      path: pageViews.path,
      pv: sql<number>`count(*)`,
      uv: sql<number>`count(distinct ${pageViews.sessionId})`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, sinceDate), eq(pageViews.isAiCrawler, false)))
    .groupBy(pageViews.path)
    .orderBy(sql`count(*) desc`)
    .limit(limit);
}

// Country distribution
export async function getCountryDistribution(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      country: pageViews.country,
      count: sql<number>`count(*)`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, sinceDate), eq(pageViews.isAiCrawler, false)))
    .groupBy(pageViews.country)
    .orderBy(sql`count(*) desc`)
    .limit(20);
}

// AI crawler breakdown
export async function getAiCrawlerBreakdown(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      crawlerName: pageViews.crawlerName,
      count: sql<number>`count(*)`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, sinceDate), eq(pageViews.isAiCrawler, true)))
    .groupBy(pageViews.crawlerName)
    .orderBy(sql`count(*) desc`);
}

// Language distribution
export async function getLangDistribution(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      lang: pageViews.lang,
      count: sql<number>`count(*)`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, sinceDate), eq(pageViews.isAiCrawler, false)))
    .groupBy(pageViews.lang)
    .orderBy(sql`count(*) desc`);
}

// ─── Brand Guidelines ─────────────────────────────────────────────────────────
import { brandGuidelines, curators, type BrandGuideline, type InsertBrandGuideline, type Curator, type InsertCurator } from "../drizzle/schema";

export async function getAllBrandGuidelines() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brandGuidelines).orderBy(brandGuidelines.category, brandGuidelines.sortOrder);
}

export async function upsertBrandGuideline(data: InsertBrandGuideline & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(brandGuidelines).set(rest).where(eq(brandGuidelines.id, id));
    return id;
  }
  const [res] = await db.insert(brandGuidelines).values(data);
  return (res as any).insertId as number;
}

export async function deleteBrandGuideline(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(brandGuidelines).where(eq(brandGuidelines.id, id));
}

// ─── Curators ─────────────────────────────────────────────────────────────────
export async function getAllCurators() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(curators).orderBy(curators.createdAt);
}

export async function upsertCurator(data: InsertCurator & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(curators).set(rest).where(eq(curators.id, id));
    return id;
  }
  const [res] = await db.insert(curators).values(data);
  return (res as any).insertId as number;
}

export async function deleteCurator(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(curators).where(eq(curators.id, id));
}

// ─── AI Writers ───────────────────────────────────────────────────────────────
export async function getAllAiWriters() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiWriters).orderBy(aiWriters.sortOrder, aiWriters.createdAt);
}

export async function getAiWriterById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(aiWriters).where(eq(aiWriters.id, id));
  return row ?? null;
}

export async function upsertAiWriter(data: InsertAiWriter & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(aiWriters).set(rest).where(eq(aiWriters.id, id));
    return id;
  }
  const [res] = await db.insert(aiWriters).values(data);
  return (res as any).insertId as number;
}

export async function deleteAiWriter(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(aiWriters).where(eq(aiWriters.id, id));
}
