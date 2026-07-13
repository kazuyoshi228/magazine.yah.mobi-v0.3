/**
 * magazine.yah.mobi — 共有ドメイン型（BaaS-first / Firestore）
 *
 * Firestore コレクション:
 *   articles/{slug}   … 記事本体（翻訳4言語をネストしたマップで保持）
 *   events/{autoId}   … 計測イベント（pageview / cta_click / ai_crawl）
 *
 * カテゴリはマスタ4件固定のため DB を持たず定数で扱う。
 */

// TH（タイ語・v9 の対象市場）は将来追加。Lang へ "th" を足す際は Record<Lang,…> を使う
// 箇所（client/src/pages/CmsArticleEdit.tsx 等）・LANGS・seoserver の hreflang もまとめて対応する。
export type Lang = "ja" | "en" | "ko" | "zh-TW";
export const LANGS: readonly Lang[] = ["ja", "en", "ko", "zh-TW"] as const;

export type SchemaType = "Article" | "HowTo" | "FAQPage";
export type ArticleStatus = "draft" | "published" | "archived";
export type CategorySlug = "esim" | "gadget" | "gourmet" | "travel";

// ─── v9 戦略軸（迷わせない・クエリ層・出力コントラクト） ───────────────────────
/** クエリ層（v9 §9-1） */
export type Layer = "M" | "0" | "1" | "1.5" | "3" | "season";
/** 消す離脱理由（v9 §1）: 高いかも / 面倒 / 自分に合うか不安 */
export type Hesitation = "price" | "hassle" | "anxiety";
/** 記事 / 受けページ / 格子（v9 §8-1） */
export type PageType = "article" | "landing" | "grid";
/** 配信面（v9 §7-2） */
export type DistributionSurface = "esim" | "guides" | "homes";

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
  /** FAQPage Schema 用（v9 §9-4・任意） */
  faq?: Array<{ q: string; a: string }>;
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

  // ─── v9 戦略フィールド（すべて任意＝既存ドキュメントと後方互換） ───────────────
  /** クエリ層（v9 §9-1） */
  layer?: Layer;
  /** 記事 / 受けページ / 格子（既定: "article"） */
  pageType?: PageType;
  /** 消す離脱理由（v9 §1・権威/集客記事は null） */
  hesitation?: Hesitation | null;
  /** 受け先（tool id または "/buy?ref=…"） */
  handoff?: string[];
  /** 主クエリ（クエリ在庫表連携・v9 §9-3） */
  primaryQuery?: string;
  /** 従クエリ 5〜10 */
  secondaryQueries?: string[];
  /** 確認日（ISO 8601 date・GEO/一次情報） */
  confirmedDate?: string | null;
  /** 出典（GEO・E-E-A-T） */
  sources?: string[];
  /** 配信面（既定: ["esim"]・v9 §7-2） */
  distribution?: DistributionSurface[];
  /** 動的価格キー（Firestore 束縛・格子/道具用・v9 §5-2） */
  priceBindings?: string[];
  /** rel=canonical（既定: 自 path・v9 出力コントラクト） */
  canonical?: string | null;
  /** 対象市場（KO/TW/TH/HK/SG/ID） */
  market?: string[];
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
