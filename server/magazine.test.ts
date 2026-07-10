import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 1, slug: "esim", nameJa: "eSIM通信基盤", nameEn: "eSIM & Connectivity", nameKo: "eSIM 통신", nameZhTw: "eSIM通訊", sortOrder: 1 },
    { id: 2, slug: "gourmet", nameJa: "グルメ×通信", nameEn: "Gourmet & Connectivity", nameKo: "미식 × 통신", nameZhTw: "美食×通訊", sortOrder: 2 },
    { id: 3, slug: "travel", nameJa: "旅行×通信", nameEn: "Travel & Connectivity", nameKo: "여행 × 통신", nameZhTw: "旅行×通訊", sortOrder: 3 },
  ]),
  getPublishedArticles: vi.fn().mockResolvedValue([
    {
      id: 1,
      slug: "japan-esim-guide",
      schemaType: "HowTo",
      thumbnailUrl: null,
      publishedAt: new Date("2025-01-01"),
      categoryId: 1,
      categorySlug: "esim",
      categoryNameJa: "eSIM通信基盤",
      categoryNameEn: "eSIM & Connectivity",
      categoryNameKo: "eSIM 통신",
      categoryNameZhTw: "eSIM通訊",
      translationId: 1,
      lang: "ja",
      title: "日本でeSIMを使う方法",
      excerpt: "日本旅行でeSIMを使う完全ガイド",
      metaTitle: null,
      metaDescription: null,
    },
  ]),
  getArticleBySlug: vi.fn().mockResolvedValue({
    articles: {
      id: 1,
      slug: "japan-esim-guide",
      status: "published",
      schemaType: "HowTo",
      thumbnailUrl: null,
      publishedAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
      categoryId: 1,
    },
    categories: {
      id: 1,
      slug: "esim",
      nameJa: "eSIM通信基盤",
      nameEn: "eSIM & Connectivity",
      nameKo: "eSIM 통신",
      nameZhTw: "eSIM通訊",
      sortOrder: 1,
    },
  }),
  getArticleTranslations: vi.fn().mockResolvedValue([
    {
      id: 1,
      articleId: 1,
      lang: "ja",
      title: "日本でeSIMを使う方法",
      excerpt: "日本旅行でeSIMを使う完全ガイド",
      body: "## はじめに\n\neSIMとは...",
      directAnswer: "eSIMは空港到着後すぐに使えます。",
      metaTitle: null,
      metaDescription: null,
      schemaData: null,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    },
  ]),
  getArticleTranslation: vi.fn().mockResolvedValue({
    id: 1,
    articleId: 1,
    lang: "ja",
    title: "日本でeSIMを使う方法",
    excerpt: "日本旅行でeSIMを使う完全ガイド",
    body: "## はじめに\n\neSIMとは...",
    directAnswer: "eSIMは空港到着後すぐに使えます。",
    metaTitle: null,
    metaDescription: null,
    schemaData: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  }),
  getAllSubscribers: vi.fn().mockResolvedValue([]),
  getSubscriberCount: vi.fn().mockResolvedValue(0),
  createSubscriber: vi.fn().mockResolvedValue(undefined),
  getAllArticlesAdmin: vi.fn().mockResolvedValue([]),
  getArticleById: vi.fn().mockResolvedValue(null),
  createArticle: vi.fn().mockResolvedValue(1),
  updateArticle: vi.fn().mockResolvedValue(undefined),
  upsertArticleTranslation: vi.fn().mockResolvedValue(undefined),
  deleteArticle: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      firebaseUid: "admin-firebase-uid",
      email: "admin@yah.mobi",
      name: "Admin",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("categories.list", () => {
  it("returns a list of categories", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("slug");
  });
});

describe("articles.list", () => {
  it("returns published articles with default params", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.articles.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts categorySlug and lang filters", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.articles.list({ categorySlug: "esim", lang: "ja", limit: 10, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("articles.bySlug", () => {
  it("returns article with translations for a valid slug", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.articles.bySlug({ slug: "japan-esim-guide", lang: "ja" });
    expect(result).not.toBeNull();
    expect(result?.article?.articles?.slug).toBe("japan-esim-guide");
    expect(result?.translation).toBeDefined();
  });
});

describe("subscribers.subscribe", () => {
  it("accepts a valid email subscription", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.subscribers.subscribe({
      name: "Test User",
      email: "test@example.com",
      lang: "ja",
    });
    expect(result).toHaveProperty("success", true);
  });

  it("rejects an invalid email", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.subscribers.subscribe({ name: "Test", email: "not-an-email", lang: "ja" })
    ).rejects.toThrow();
  });
});

describe("cms.listAll (admin only)", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.cms.listAll()).rejects.toThrow();
  });

  it("returns articles list for admin users", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.cms.listAll();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("subscribers.list (admin only)", () => {
  it("throws for non-admin users", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.subscribers.list()).rejects.toThrow();
  });

  it("returns subscriber list for admin", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.subscribers.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated context", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated context", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });
});
