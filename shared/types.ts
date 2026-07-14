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
export type Lang = "ja" | "en" | "ko" | "zh-TW" | "th";
export const LANGS: readonly Lang[] = ["ja", "en", "ko", "zh-TW", "th"] as const;

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
  /** 著者（選択時に authors からスナップショット保存。email は含めない＝公開面に出る） */
  author?: ArticleAuthor | null;
  /** Google（Search Console）へのURL登録を済ませたか（CMS一覧のINDEXチェック・手動管理） */
  googleIndexed?: boolean;
}

/** 記事に非正規化して保存する著者情報（公開可能なフィールドのみ） */
export interface ArticleAuthor {
  id: string;
  name: string;
  title: string;
  photoUrl: string | null;
}

/** 著者（authors/{id}）。email は Firebase Auth のログインメールと突き合わせる */
export interface AuthorDoc {
  id: string;
  name: string;
  /** ログインメール（Auth連携・記事編集時のデフォルト著者判定に使用） */
  email: string;
  /** 属性・肩書き（例: 調査できる編集者 / yah.homes 運営） */
  title: string;
  /** 顔写真URL（Storage authors/） */
  photoUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

/** 価格プランの提供形態（v9 §5-2・CompareGrid） */
export type PlanProviderType = "esim" | "wifi" | "sim" | "roaming";

/**
 * 価格プラン（`plans` コレクション・価格の単一ソース＝鉄則③）。
 * docId = key（例: "yah_7d_3gb"）。記事の priceBindings がこの key を指す。
 * SSR/クライアントで {{key}} → priceJpy を焼き込み、CompareGrid 表を描画する。
 * source: "live"=決済と同一Firestore由来 / "manual"=競合の手動更新 / "placeholder"=要差し替えサンプル。
 */
export interface Plan {
  key: string;
  provider: string;
  providerType: PlanProviderType;
  /** 有効日数 */
  days: number;
  /** 容量表示（"3GB" / "5GB" / "10GB" / "無制限"） */
  data: string;
  /** 価格（円・税込） */
  priceJpy: number;
  source: "live" | "manual" | "placeholder";
  /** 競合の出典URL（provenance・GEO/E-E-A-T） */
  sourceUrl?: string | null;
  /** 確認日（ISO 8601 date） */
  confirmedDate?: string | null;
  /** 更新時刻（ms） */
  updatedAt: number;
  /** 補足（"要差し替え" など） */
  note?: string | null;
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
  /** 日本語タイトル（ja翻訳が無い場合は他言語のタイトルで代替） */
  titleJa: string | null;
  /** Google登録済みフラグ（INDEXチェックボックス） */
  googleIndexed: boolean;
  /** 翻訳が存在する言語（一覧の言語バッジ表示用） */
  languages: Lang[];
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
      author?: ArticleAuthor | null;
      /** homes専売（magazine表示面では管理者プレビューのみ許可） */
      homesOnly?: boolean;
      handoff?: string[];
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
