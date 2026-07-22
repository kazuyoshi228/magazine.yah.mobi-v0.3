/**
 * Firestore データ層（旧 tRPC ルーターの置き換え）
 *
 * 公開系は firestore.rules により status == "published" のみ読み取り可。
 * 管理系（作成・更新・削除・下書き読み取り）は admin カスタムクレーム必須。
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit as qLimit,
  arrayUnion,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import {
  type ArticleDoc,
  type ArticleListRow,
  type ArticleAdminRow,
  type ArticleDetailData,
  type ArticleTranslation,
  type ArticleStatus,
  type CategorySlug,
  type SchemaType,
  type EventDoc,
  type Lang,
  type Layer,
  type PageType,
  type Hesitation,
  type DistributionSurface,
  type Plan,
  type AuthorDoc,
  type ArticleAuthor,
  LANGS,
  getCategory,
} from "@shared/types";

const articlesCol = collection(db, "articles");

/** homes専売記事（distributionにhomesを含みesim/guidesを含まない）。
    magazineには載せず /feeds/homes.json 経由でyah.homesのみに配信（seoserverと同一仕様）。 */
function isHomesOnly(a: ArticleDoc): boolean {
  const d = a.distribution ?? [];
  return d.includes("homes") && !d.includes("esim") && !d.includes("guides");
}
const plansCol = collection(db, "plans");

// yah.mobile 本体プランの SSOT（公開読み取り可）。案A: 自社価格はここを直読みし、選択時に SSOT docId を priceBindings に保存。
const SSOT_PROJECT_ID = "yah-mobile-v1-3ed24";
const SSOT_API_KEY = "AIzaSyDlX00FbPP_Ij709LN0Xtrc26VjFh-57Js"; // web APIキー（公開値・読み取り専用）

function unwrapFsValue(v: Record<string, unknown> | undefined): unknown {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  return undefined;
}

/** SSOT（yah.mobile 本体）の有効な自社プランを Plan 形で取得。key = SSOT docId。 */
export async function listSelfPlansFromSSOT(): Promise<Plan[]> {
  try {
    const url =
      `https://firestore.googleapis.com/v1/projects/${SSOT_PROJECT_ID}` +
      `/databases/(default)/documents/plans?pageSize=300&key=${SSOT_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { documents?: Array<{ name: string; fields?: Record<string, Record<string, unknown>> }> };
    return (json.documents ?? [])
      .map((d) => {
        const f = d.fields ?? {};
        const id = d.name.split("/").pop() ?? "";
        return {
          id,
          isActive: String(unwrapFsValue(f.isActive) ?? "true"),
          dataGb: String(unwrapFsValue(f.dataGb) ?? ""),
          days: Number(unwrapFsValue(f.validityDays) ?? 0),
          priceJpy: Number(unwrapFsValue(f.priceJpy) ?? 0),
          updatedAt: Number(unwrapFsValue(f.updatedAt) ?? 0),
          name: String(unwrapFsValue(f.name) ?? ""),
        };
      })
      .filter((p) => p.isActive === "true" && p.id && p.priceJpy > 0)
      .map<Plan>((p) => ({
        key: p.id,
        provider: "yah.mobile",
        providerType: "esim",
        days: p.days,
        data: p.dataGb ? `${p.dataGb}GB` : "",
        priceJpy: p.priceJpy,
        source: "live",
        confirmedDate: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : null,
        updatedAt: p.updatedAt,
        note: p.name || null,
      }));
  } catch {
    return [];
  }
}

/**
 * 価格プラン（CompareGrid・{{price}} 焼き込み・チップ用）。自社（yah.mobile SSOT）のみ。
 * 競合は competitorPlans SSOT の比較表で扱うため、per-plan の一覧には混ぜない。
 */
export async function listPlans(): Promise<Plan[]> {
  return listSelfPlansFromSSOT();
}

/** magazine 側で手管理するプランのみ（＝競合）。自社は SSOT にあるためここには含めない。 */
export async function listMagazinePlans(): Promise<Plan[]> {
  const snap = await getDocs(plansCol);
  return snap.docs.map((d) => d.data() as Plan);
}

/** 競合比較表「How we compare.」。本体 competitorPlans/main SSOT（公開読み取り可）を取得。 */
export type CompetitorTable = {
  columns: Array<{ id: string; label: string }>;
  rows: Array<{ serviceName: string; isHighlight: boolean; cells: Record<string, string> }>;
  updatedAt: number;
};

export async function getCompetitorTableFromSSOT(): Promise<CompetitorTable | null> {
  try {
    const url =
      `https://firestore.googleapis.com/v1/projects/${SSOT_PROJECT_ID}` +
      `/databases/(default)/documents/competitorPlans/main?key=${SSOT_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
    const f = json.fields ?? {};
    const colArr = ((f.columns as { arrayValue?: { values?: unknown[] } })?.arrayValue?.values ?? []) as Array<{ mapValue: { fields: Record<string, Record<string, unknown>> } }>;
    const columns = colArr
      .map((c) => c.mapValue.fields)
      .filter((cf) => unwrapFsValue(cf.isActive) !== false)
      .sort((a, b) => Number(unwrapFsValue(a.sortOrder) ?? 0) - Number(unwrapFsValue(b.sortOrder) ?? 0))
      .map((cf) => ({ id: String(unwrapFsValue(cf.id) ?? ""), label: String(unwrapFsValue(cf.label) ?? "") }));
    const rowArr = ((f.rows as { arrayValue?: { values?: unknown[] } })?.arrayValue?.values ?? []) as Array<{ mapValue: { fields: Record<string, Record<string, unknown>> } }>;
    const rows = rowArr
      .map((r) => r.mapValue.fields)
      .filter((rf) => unwrapFsValue(rf.isActive) !== false)
      .sort((a, b) => Number(unwrapFsValue(a.sortOrder) ?? 0) - Number(unwrapFsValue(b.sortOrder) ?? 0))
      .map((rf) => {
        const cellFields = ((rf.cells as { mapValue?: { fields?: Record<string, Record<string, unknown>> } })?.mapValue?.fields ?? {}) as Record<string, Record<string, unknown>>;
        const cells: Record<string, string> = {};
        for (const [k, v] of Object.entries(cellFields)) cells[k] = String(unwrapFsValue(v) ?? "");
        return { serviceName: String(unwrapFsValue(rf.serviceName) ?? ""), isHighlight: unwrapFsValue(rf.isHighlight) === true, cells };
      });
    return { columns, rows, updatedAt: Number(unwrapFsValue(f.updatedAt) ?? 0) };
  } catch {
    return null;
  }
}

/** プラン upsert（docId = key。magazine 側の競合価格のみ。自社は本体 SSOT で更新する） */
export async function savePlan(p: Omit<Plan, "updatedAt">): Promise<void> {
  await setDoc(doc(plansCol, p.key), { ...p, updatedAt: Date.now() });
}

export async function deletePlan(key: string): Promise<void> {
  await deleteDoc(doc(plansCol, key));
}

// ─── Public reads ─────────────────────────────────────────────────────────────

/**
 * 公開記事一覧。Firestore クエリは status+publishedAt のみ（複合インデックス1本）とし、
 * カテゴリ・言語は取得後にフィルタする（記事数が小さい前提のミニマル設計）。
 */
export async function listPublishedArticles(opts: {
  categorySlug?: string;
  lang?: Lang;
  limit?: number;
}): Promise<ArticleListRow[]> {
  const snap = await getDocs(
    query(articlesCol, where("status", "==", "published"), orderBy("publishedAt", "desc"), qLimit(100)),
  );
  const rows: ArticleListRow[] = [];
  for (const d of snap.docs) {
    const a = d.data() as ArticleDoc;
    if (isHomesOnly(a)) continue; // homes専売記事はmagazineの表示面に出さない（seoserverと同一仕様）
    if (opts.categorySlug && a.categorySlug !== opts.categorySlug) continue;
    const lang = opts.lang ?? "ja";
    const t = a.translations[lang];
    if (!t) continue; // 指定言語の翻訳がない記事は一覧に出さない（旧 innerJoin と同じ挙動）
    const cat = getCategory(a.categorySlug);
    rows.push({
      id: d.id,
      slug: a.slug,
      schemaType: a.schemaType,
      thumbnailUrl: a.thumbnailUrl ?? null,
      publishedAt: a.publishedAt ?? null,
      categorySlug: a.categorySlug,
      categoryNameJa: cat.nameJa,
      categoryNameEn: cat.nameEn,
      categoryNameKo: cat.nameKo,
      categoryNameZhTw: cat.nameZhTw,
      lang,
      title: t.title,
      excerpt: t.excerpt || null,
      metaTitle: t.metaTitle || null,
      metaDescription: t.metaDescription || null,
    });
    if (rows.length >= (opts.limit ?? 20)) break;
  }
  return rows;
}

/** 記事詳細（旧 articles.bySlug 互換の形で返す） */
export async function getArticleBySlug(slug: string, lang: Lang): Promise<ArticleDetailData | null> {
  let a: ArticleDoc;
  try {
    const snap = await getDoc(doc(articlesCol, slug));
    if (!snap.exists()) return null;
    a = snap.data() as ArticleDoc;
  } catch {
    // 非公開記事への一般アクセスは rules で permission-denied になる
    return null;
  }
  const withLang = (l: Lang): (ArticleTranslation & { lang: Lang }) | null => {
    const t = a.translations[l];
    return t ? { ...t, lang: l } : null;
  };
  const translation = withLang(lang) ?? withLang("ja") ?? LANGS.map(withLang).find(Boolean) ?? null;
  const allTranslations = LANGS.map(withLang).filter((t): t is ArticleTranslation & { lang: Lang } => t !== null);
  return {
    article: {
      articles: {
        id: a.slug,
        slug: a.slug,
        schemaType: a.schemaType,
        status: a.status,
        thumbnailUrl: a.thumbnailUrl ?? null,
        publishedAt: a.publishedAt ?? null,
        updatedAt: a.updatedAt,
        categorySlug: a.categorySlug,
        author: a.author ?? null,
        homesOnly: isHomesOnly(a),
        handoff: a.handoff ?? [],
        priceBindings: a.priceBindings ?? [],
        showCompetitorTable: a.showCompetitorTable ?? false,
        fieldReport: a.fieldReport ?? null,
        fieldReportMode: a.fieldReportMode ?? null,
      },
      categories: getCategory(a.categorySlug),
      ai_writers: null,
    },
    translation,
    allTranslations,
  };
}

// ─── Admin (CMS) ─────────────────────────────────────────────────────────────

export async function listAllArticlesAdmin(): Promise<ArticleAdminRow[]> {
  const snap = await getDocs(query(articlesCol, orderBy("updatedAt", "desc")));
  return snap.docs.map((d) => {
    const a = d.data() as ArticleDoc;
    // 翻訳の実在で言語を判定（languages フィールドは古い記事で欠けている場合がある）
    const langs = LANGS.filter((l) => !!a.translations?.[l]?.title || !!a.translations?.[l]?.body);
    const titleJa = a.translations?.ja?.title || langs.map((l) => a.translations[l]?.title).find(Boolean) || null;
    return {
      id: d.id,
      slug: a.slug,
      status: a.status,
      schemaType: a.schemaType,
      thumbnailUrl: a.thumbnailUrl ?? null,
      publishedAt: a.publishedAt ?? null,
      updatedAt: a.updatedAt,
      categorySlug: a.categorySlug,
      categoryNameJa: getCategory(a.categorySlug).nameJa,
      titleJa,
      googleIndexed: a.googleIndexed ?? false,
      ultracodeQaAt: a.ultracodeQaAt ?? null,
      ultracodeQaFindings: a.ultracodeQaFindings ?? 0,
      fieldReportStatus: a.fieldReport ? (a.fieldReportMode === "assumed" ? "assumed" : "field") : null,
      languages: langs,
    };
  });
}

/** 編集画面用: ステータス問わず1件取得（admin のみ rules が通す） */
export async function getArticleForEdit(slug: string): Promise<ArticleDoc | null> {
  const snap = await getDoc(doc(articlesCol, slug));
  return snap.exists() ? (snap.data() as ArticleDoc) : null;
}

export interface ArticleMetaInput {
  slug: string;
  categorySlug: CategorySlug;
  schemaType: SchemaType;
  status: ArticleStatus;
  thumbnailUrl: string | null;
  // v9 戦略フィールド（任意）
  layer?: Layer;
  pageType?: PageType;
  hesitation?: Hesitation | null;
  handoff?: string[];
  primaryQuery?: string;
  secondaryQueries?: string[];
  confirmedDate?: string | null;
  distribution?: DistributionSurface[];
  market?: string[];
  author?: ArticleAuthor | null;
  /** 通信カテゴリ: FAQ直前に自動挿入されるプラン表（自社SSOT docID） */
  priceBindings?: string[];
  /** compare/vs記事: 本体 competitorPlans SSOT の「How we compare.」比較表を挿入 */
  showCompetitorTable?: boolean;
  /** 実地レポート（一次データ）。AI本文と独立に後から編集。 */
  fieldReport?: string | null;
  fieldReportMode?: "field" | "assumed" | null;
}

/** 新規作成。docId = slug。既存 slug は拒否 */
export async function createArticle(meta: ArticleMetaInput): Promise<{ id: string }> {
  const refDoc = doc(articlesCol, meta.slug);
  const existing = await getDoc(refDoc);
  if (existing.exists()) throw new Error(`slug "${meta.slug}" は既に使われています。`);
  const now = Date.now();
  // 未設定の任意フィールドは ignoreUndefinedProperties により自動的に落ちる（firebase.ts）
  const data: ArticleDoc = {
    slug: meta.slug,
    categorySlug: meta.categorySlug,
    schemaType: meta.schemaType,
    status: meta.status,
    thumbnailUrl: meta.thumbnailUrl,
    publishedAt: meta.status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
    languages: [],
    translations: {},
    layer: meta.layer,
    pageType: meta.pageType ?? "article",
    hesitation: meta.hesitation ?? null,
    handoff: meta.handoff ?? [],
    primaryQuery: meta.primaryQuery,
    secondaryQueries: meta.secondaryQueries ?? [],
    confirmedDate: meta.confirmedDate ?? null,
    distribution: meta.distribution ?? ["esim"],
    market: meta.market ?? [],
    author: meta.author ?? null,
    priceBindings: meta.priceBindings ?? [],
    showCompetitorTable: meta.showCompetitorTable ?? false,
    fieldReport: meta.fieldReport ?? null,
    fieldReportMode: meta.fieldReportMode ?? null,
  };
  await setDoc(refDoc, data);
  return { id: meta.slug };
}

/** メタ更新（slug の変更は不可 — docId が slug のため） */
export async function updateArticleMeta(
  slug: string,
  patch: Partial<Omit<ArticleMetaInput, "slug">>,
): Promise<void> {
  const update: Record<string, unknown> = { ...patch, updatedAt: Date.now() };
  if (patch.status === "published") {
    const current = await getArticleForEdit(slug);
    if (current && !current.publishedAt) update.publishedAt = Date.now();
  }
  await updateDoc(doc(articlesCol, slug), update);
}

export async function upsertTranslation(slug: string, lang: Lang, t: ArticleTranslation): Promise<void> {
  await updateDoc(doc(articlesCol, slug), {
    [`translations.${lang}`]: t,
    languages: arrayUnion(lang),
    updatedAt: Date.now(),
  });
}

/** INDEXチェック（Google登録済みフラグ）の切替 */
export async function setArticleIndexed(slug: string, v: boolean): Promise<void> {
  await updateDoc(doc(articlesCol, slug), { googleIndexed: v });
}

export async function deleteArticle(slug: string): Promise<void> {
  await deleteDoc(doc(articlesCol, slug));
}

/** 画像アップロード（Firebase Storage）→ 公開URLを返す */
export async function uploadImageFile(file: File, folder: "thumbnails" | "images" | "authors"): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const r = storageRef(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}

// ─── Events（計測・fire and forget） ─────────────────────────────────────────

export function trackEvent(ev: Omit<EventDoc, "createdAt">): void {
  const data: EventDoc = { ...ev, createdAt: Date.now() };
  // undefined フィールドは Firestore が拒否するため除去
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  addDoc(collection(db, "events"), clean).catch(() => {
    /* 計測失敗は無視 */
  });
}

// ─── 著者マスタ（authors/{id}・admin のみ） ──────────────────────────────────

const authorsCol = collection(db, "authors");

export async function listAuthors(): Promise<AuthorDoc[]> {
  const snap = await getDocs(query(authorsCol, orderBy("createdAt", "asc")));
  return snap.docs.map((d) => d.data() as AuthorDoc);
}

/** 作成/更新（id 指定で upsert）。email は小文字正規化して Auth と突き合わせる */
export async function saveAuthor(input: { id?: string; name: string; email: string; title: string; photoUrl: string | null }): Promise<string> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("メールアドレスの形式が正しくありません。");
  if (!input.name.trim()) throw new Error("名前を入力してください。");
  const now = Date.now();
  const id = input.id ?? doc(authorsCol).id;
  const refDoc = doc(authorsCol, id);
  const existing = input.id ? await getDoc(refDoc) : null;
  const data: AuthorDoc = {
    id,
    name: input.name.trim(),
    email,
    title: input.title.trim(),
    photoUrl: input.photoUrl,
    createdAt: existing?.exists() ? (existing.data() as AuthorDoc).createdAt : now,
    updatedAt: now,
  };
  await setDoc(refDoc, data);
  return id;
}

export async function deleteAuthor(id: string): Promise<void> {
  await deleteDoc(doc(authorsCol, id));
}

/** 直近30日のユニークビジター数（pageview の distinct sessionId・admin専用）。
    複合インデックス不要にするため createdAt 範囲のみで引き、type/クローラーはクライアント側で除外。 */
export async function countUniqueVisitors30d(opts?: { articleSlugs?: Set<string> }): Promise<number> {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const snap = await getDocs(
    query(collection(db, "events"), where("createdAt", ">=", cutoff), qLimit(10000)),
  );
  const sids = new Set<string>();
  for (const d of snap.docs) {
    const e = d.data() as EventDoc;
    if (e.type !== "pageview" || !e.sessionId || e.crawlerName) continue;
    // カテゴリ絞り込み時は、そのカテゴリの記事slugへのpageviewのみ数える
    if (opts?.articleSlugs && (!e.articleSlug || !opts.articleSlugs.has(e.articleSlug))) continue;
    sids.add(e.sessionId);
  }
  return sids.size;
}

// ─── 管理者ホワイトリスト（email をドキュメントIDに使用） ─────────────────────

const whitelistCol = collection(db, "admin_whitelist");

/** editor は記事を編集できるが status を変更できない（公開は admin のみ・firestore.rules で強制）。 */
export type WhitelistRole = "admin" | "editor";

export interface WhitelistEntry {
  email: string;
  addedBy: string | null;
  addedAt: number;
  /** 未設定の既存エントリは admin 扱い（後方互換）。 */
  role?: WhitelistRole;
}

export async function listWhitelist(): Promise<WhitelistEntry[]> {
  const snap = await getDocs(query(whitelistCol, orderBy("addedAt", "desc")));
  return snap.docs.map((d) => d.data() as WhitelistEntry);
}

/** email を正規化（小文字・トリム）。ルール側は token.email をそのまま照合するため小文字前提。 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function addToWhitelist(
  email: string,
  addedBy: string | null,
  role: WhitelistRole = "editor",
): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("メールアドレスの形式が正しくありません。");
  }
  await setDoc(doc(whitelistCol, normalized), {
    email: normalized,
    addedBy,
    addedAt: Date.now(),
    role,
  } satisfies WhitelistEntry);
}

export async function removeFromWhitelist(email: string): Promise<void> {
  await deleteDoc(doc(whitelistCol, normalizeEmail(email)));
}
