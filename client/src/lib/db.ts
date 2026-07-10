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
  LANGS,
  getCategory,
} from "@shared/types";

const articlesCol = collection(db, "articles");

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
}

/** 新規作成。docId = slug。既存 slug は拒否 */
export async function createArticle(meta: ArticleMetaInput): Promise<{ id: string }> {
  const refDoc = doc(articlesCol, meta.slug);
  const existing = await getDoc(refDoc);
  if (existing.exists()) throw new Error(`slug "${meta.slug}" は既に使われています。`);
  const now = Date.now();
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

export async function deleteArticle(slug: string): Promise<void> {
  await deleteDoc(doc(articlesCol, slug));
}

/** 画像アップロード（Firebase Storage）→ 公開URLを返す */
export async function uploadImageFile(file: File, folder: "thumbnails" | "images"): Promise<string> {
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
