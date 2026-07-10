/**
 * magazine.yah.mobi — 共有ドメイン型（BaaS-first / Firestore）
 *
 * Firestore コレクション:
 *   articles/{slug}   … 記事本体（翻訳4言語をネストしたマップで保持）
 *   events/{autoId}   … 計測イベント（pageview / cta_click / ai_crawl）
 *
 * カテゴリはマスタ4件固定のため DB を持たず定数で扱う。
 */

export type Lang = "ja" | "en" | "ko" | "zh-TW";
export const LANGS: readonly Lang[] = ["ja", "en", "ko", "zh-TW"] as const;

export type SchemaType = "Article" | "HowTo" | "FAQPage";
export type ArticleStatus = "draft" | "published" | "archived";
export type CategorySlug = "esim" | "gadget" | "gourmet" | "travel";

// ─── Categories（固定マスタ） ─────────────────────────────────────────────────
export interface Category {
  slug: CategorySlug;
  nameJa: string;
  nameEn: string;
  nameKo: string;
  nameZhTw: string;
  sortOrder: number;
}

export const CATEGORIES: readonly Category[] = [
  { slug: "esim", nameJa: "通信", nameEn: "eSIM & Connectivity", nameKo: "통신", nameZhTw: "通訊", sortOrder: 0 },
  { slug: "gadget", nameJa: "ガジェット", nameEn: "Gadgets", nameKo: "가젯", nameZhTw: "數位裝置", sortOrder: 1 },
  { slug: "gourmet", nameJa: "グルメ", nameEn: "Gourmet", nameKo: "미식", nameZhTw: "美食", sortOrder: 2 },
  { slug: "travel", nameJa: "旅行", nameEn: "Travel", nameKo: "여행", nameZhTw: "旅遊", sortOrder: 3 },
] as const;

export function getCategory(slug: string): Category {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[0];
}

// ─── Articles ─────────────────────────────────────────────────────────────────
export interface ArticleTranslation {
  title: string;
  excerpt: string;
  body: string; // Markdown
  directAnswer: string; // GEO 直接回答ブロック
  metaTitle: string;
  metaDescription: string;
}

/** articles/{slug} ドキュメント。docId = slug（一意性を Firestore が担保） */
export interface ArticleDoc {
  slug: string;
  categorySlug: CategorySlug;
  schemaType: SchemaType;
  status: ArticleStatus;
  thumbnailUrl: string | null;
  /** epoch ms。draft の間は null */
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
  /** translations のキー一覧（言語フィルタ用の非正規化） */
  languages: Lang[];
  translations: Partial<Record<Lang, ArticleTranslation>>;
}

/** 一覧表示用のフラット行（旧 tRPC articles.list 互換） */
export interface ArticleListRow {
  id: string; // = slug
  slug: string;
  schemaType: SchemaType;
  thumbnailUrl: string | null;
  publishedAt: number | null;
  categorySlug: CategorySlug;
  categoryNameJa: string;
  categoryNameEn: string;
  categoryNameKo: string;
  categoryNameZhTw: string;
  lang: Lang;
  title: string;
  excerpt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

/** 管理一覧用の行（旧 cms.listAll 互換） */
export interface ArticleAdminRow {
  id: string; // = slug
  slug: string;
  status: ArticleStatus;
  schemaType: SchemaType;
  thumbnailUrl: string | null;
  publishedAt: number | null;
  updatedAt: number;
  categorySlug: CategorySlug;
  categoryNameJa: string;
}

/** 記事詳細の返却形（旧 articles.bySlug 互換） */
export interface ArticleDetailData {
  article: {
    articles: {
      id: string; // = slug
      slug: string;
      schemaType: SchemaType;
      status: ArticleStatus;
      thumbnailUrl: string | null;
      publishedAt: number | null;
      updatedAt: number;
      categorySlug: CategorySlug;
    };
    categories: Category;
    ai_writers: null; // v1 では著者機能なし
  };
  translation: (ArticleTranslation & { lang: Lang }) | null;
  allTranslations: Array<ArticleTranslation & { lang: Lang }>;
}

// ─── Events（計測） ───────────────────────────────────────────────────────────
export type EventType = "pageview" | "cta_click" | "ai_crawl";
export type CtaTarget = "yah_mobile" | "yah_homes" | "esim_buy" | "esim_hero" | "esim_article";

export interface EventDoc {
  type: EventType;
  path: string;
  articleSlug?: string;
  target?: CtaTarget;
  sessionId?: string;
  lang?: string;
  country?: string;
  referrer?: string;
  userAgent?: string;
  crawlerName?: string;
  createdAt: number;
}
