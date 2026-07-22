/**
 * seoserver — SEO/GEO 配信用の唯一の Cloud Function（BaaS-first 最小構成）
 *
 * Hosting rewrites 経由で以下を配信する:
 *   /llms.txt        … AI クローラー向けサイト概要 + 公開記事一覧
 *   /sitemap.xml     … サイトマップ
 *   /articles        … SPA テンプレート（一覧ページ既定メタ）
 *   /articles/:slug  … SPA テンプレートに記事メタ + JSON-LD + hreflang +
 *                      クローラー可読の記事本文 (#seo-content) を注入
 *
 * SPA 側（main.tsx）は起動時に #seo-content を除去するため、
 * 人間には通常の SPA、JS を実行しないクローラーには完全な記事 HTML が見える。
 */
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

initializeApp();
const db = getFirestore();

const BASE_URL = "https://magazine.yah.mobi";
const LANGS = ["ja", "en", "ko", "zh-TW", "th"] as const;
type Lang = (typeof LANGS)[number];

interface Translation {
  title: string;
  excerpt: string;
  body: string;
  directAnswer: string;
  metaTitle: string;
  metaDescription: string;
  faq?: Array<{ q: string; a: string }>;
}
interface ArticleDoc {
  slug: string;
  categorySlug: string;
  schemaType: string;
  status: string;
  thumbnailUrl: string | null;
  publishedAt: number | null;
  updatedAt: number;
  languages: Lang[];
  translations: Partial<Record<Lang, Translation>>;
  priceBindings?: string[];
  showCompetitorTable?: boolean;
  fieldReport?: string | null;
  fieldReportMode?: "field" | "assumed" | null;
  // v9 配信面（design_guides_pipeline.md）
  distribution?: string[];
  layer?: string;
  hesitation?: string | null;
  handoff?: string[];
  primaryQuery?: string;
  secondaryQueries?: string[];
  confirmedDate?: string | null;
  canonical?: string | null;
  /** 著者スナップショット（CMSで選択時に保存・email は含まない） */
  author?: { id: string; name: string; title: string; photoUrl: string | null } | null;
}

/**
 * homes専用記事（distributionにhomesを含み、esim/guidesを含まない）。
 * magazineの表示面（記事ページ・sitemap・llms.txt）には載せず、
 * /feeds/homes.json 経由で yah.homes だけに配信する（canonical混乱の根絶）。
 */
function isHomesOnly(a: ArticleDoc): boolean {
  const d = a.distribution ?? [];
  return d.includes("homes") && !d.includes("esim") && !d.includes("guides");
}

/**
 * ヘッド（別ドメイン）が正規URLを持つ記事の、その正規URL。
 * eSIM記事の正規面は yah.mobi ヘッド（実URL: /guides/esim/{lang}/{slug}）。
 * magazine の SSR ページは GEO 用に残すが、canonical はヘッドへ向けて重複を解消する。
 * 判定は保存 canonical（例 "/esim/ja/esim-chatgpt"）の先頭セクションで行う（distribution 未設定でも効く）。
 * homes は magazine では 404 のため対象外。
 */
function headCanonical(a: ArticleDoc, lang: Lang): string | null {
  const m = (a.canonical ?? "").match(/^\/(esim)\/[a-z-]+\/([a-z0-9-]+)\/?$/i);
  if (!m) return null;
  return `https://yah.mobi/guides/esim/${lang}/${m[2]}`;
}
/** ヘッドが正規URLを持つ記事か（magazine の sitemap から除外するため・lang 非依存）。 */
function isHeadOwned(a: ArticleDoc): boolean {
  return /^\/esim\//.test(a.canonical ?? "");
}

interface Plan {
  key: string;
  provider: string;
  providerType: string;
  days: number;
  data: string;
  priceJpy: number;
  source: string;
  sourceUrl?: string | null;
  confirmedDate?: string | null;
  updatedAt: number;
  note?: string | null;
}

// ─── SPA テンプレート ─────────────────────────────────────────────────────────
const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(here, "../assets/index.html");
const FALLBACK_TEMPLATE = `<!doctype html><html lang="ja"><head><meta charset="UTF-8" /><title>magazine.yah.mobi</title></head><body><div id="root"></div></body></html>`;

let templateCache: string | null = null;
function getTemplate(): string {
  if (templateCache) return templateCache;
  templateCache = existsSync(TEMPLATE_PATH) ? readFileSync(TEMPLATE_PATH, "utf-8") : FALLBACK_TEMPLATE;
  return templateCache;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * ArticleDetail.tsx の renderMarkdown と同一仕様の依存ゼロ Markdown → HTML。
 * 本文は admin 専用 CMS からのみ書き込まれる信頼済みコンテンツで、
 * HTML 直書き（既存記事）も許容するためエスケープしない（クライアント実装と同一挙動）。
 */

/**
 * lean Markdown表 → <table>（GFM形式・renderMarkdown の前段で適用）。
 * クライアントと seoserver の両方に同一実装を置く（片方を変えたら両方揃える）。
 */
function renderTables(md: string): string {
  return md.replace(/((?:^\|.*\|[ \t]*$\n?)+)/gm, (block) => {
    const rows = block.trim().split("\n").map((r) => r.trim()).filter(Boolean);
    if (rows.length < 2 || !/^\|(?:\s*:?-+:?\s*\|)+$/.test(rows[1])) return block;
    const cells = (row: string) => row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const thead = `<thead><tr>${cells(rows[0]).map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
    return `\n<table class="md-table">${thead}${tbody}</table>\n`;
  });
}

/** 物件写真の自動リンク: handoff の /booking/{key} に対応する画像（アンカー外）を
    yah.homes の予約ページへのリンクで包む（client と同一仕様） */
function linkPropertyImages(html: string, handoff: string[]): string {
  const targets = handoff.filter((h) => h.startsWith("/booking/"));
  if (!targets.length) return html;
  return html
    .split(/(<a\b[\s\S]*?<\/a>)/g)
    .map((seg, i) => {
      if (i % 2 === 1) return seg;
      let out = seg;
      for (const href of targets) {
        const key = href.split("/").pop() as string;
        out = out.replace(new RegExp(`<img[^>]*src="[^"]*${key}[^"]*"[^>]*/?>`, "g"), (img) => `<a href="https://yah.homes${href}">${img}</a>`);
      }
      return out;
    })
    .join("");
}

/** 目次: 本文h2にidを振り、3本以上あれば先頭に目次を付ける（client と同一規約） */
function withToc(html: string, lang: Lang): string {
  const items: { id: string; text: string }[] = [];
  const body = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (_m, attrs: string, inner: string) => {
    const id = `sec-${items.length + 1}`;
    items.push({ id, text: inner.replace(/<[^>]+>/g, "").trim() });
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
  if (items.length < 3) return body;
  const label = lang === "ja" ? "目次" : lang === "ko" ? "목차" : lang === "zh-TW" ? "目錄" : "Contents";
  const toc = `<nav><p>${label}</p><ol>${items.map((i) => `<li><a href="#${i.id}">${i.text}</a></li>`).join("")}</ol></nav>`;
  return toc + body;
}

function renderMarkdown(md: string): string {
  const html = renderTables(md)
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    // 手渡し見出し規約: 「## → 見出し」は矢印アイコン付き（client と同一仕様）
    .replace(/^## → (.+)$/gm, '<h2 class="h2-handoff">$1</h2>')
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "</p><p>");
  return `<p>${html}</p>`;
}

// ─── CompareGrid / 動的価格の焼き込み ───────────────────────────────────────────
// client/src/lib/compareGrid.ts と同一仕様（別パッケージのため複製）。片方を変えたら両方揃える。
const COMPARE_SENTINEL = "%%COMPAREGRID%%";
const PLAN_TYPE_LABEL: Record<string, string> = { esim: "eSIM", wifi: "レンタルWiFi", sim: "空港SIM", roaming: "ローミング" };

function fmtJpy(n: number): string {
  return n.toLocaleString("ja-JP");
}

function computePriceMeta(plans: Plan[]): { date: string; time: string } {
  const latestMs = plans.reduce((m, p) => Math.max(m, p.updatedAt ?? 0), 0) || Date.now();
  const d = new Date(latestMs);
  const dates = plans.map((p) => p.confirmedDate).filter((x): x is string => !!x).sort();
  const date = dates.length ? dates[dates.length - 1] : d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const time = d.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false });
  return { date, time };
}

function substitutePlaceholders(text: string, plans: Plan[], meta: { date: string; time: string }): string {
  if (!text) return text;
  const map = new Map(plans.map((p) => [p.key, p]));
  return text.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_m, key: string) => {
    if (key === "updated_date") return meta.date;
    if (key === "updated_time") return meta.time;
    const p = map.get(key);
    return p ? fmtJpy(p.priceJpy) : "—";
  });
}

function buildCompareTableHtml(bindings: string[], plans: Plan[], meta: { date: string; time: string }, asOfDate?: string): string {
  const map = new Map(plans.map((p) => [p.key, p]));
  const rows = bindings.map((k) => map.get(k)).filter((p): p is Plan => !!p);
  if (!rows.length) return "";
  const hasPlaceholder = rows.some((r) => r.source === "placeholder");
  const bodyHtml = rows
    .map((r) => {
      return `<tr><td>${esc(r.provider)}</td><td>${esc(`${r.days}日 / ${r.data}`)}</td><td style="text-align:right;">¥${fmtJpy(r.priceJpy)}</td><td>${PLAN_TYPE_LABEL[r.providerType] ?? esc(r.providerType)}</td></tr>`;
    })
    .join("");
  const when = asOfDate ? `${asOfDate}時点` : `${meta.date}時点`;
  const caption = `${when}の価格（yah.mobile 本体の価格ソースと同一）${hasPlaceholder ? "／※サンプル価格・要差し替え" : ""}`;
  return (
    `<table class="compare-grid">` +
    `<caption style="caption-side:top;text-align:left;font-size:0.8em;color:#666;padding-bottom:0.4em;">${esc(caption)}</caption>` +
    `<thead><tr><th>事業者</th><th>プラン</th><th style="text-align:right;">価格</th><th>種別</th></tr></thead>` +
    `<tbody>${bodyHtml}</tbody></table>`
  );
}

function renderCompareBody(body: string, plans: Plan[]): string {
  const meta = computePriceMeta(plans);
  let bindings: string[] = [];
  let b = body.replace(/^>?[ \t]*〔動的コンポーネント[：:][\s\S]*?〕[^\n]*$/gm, (block) => {
    if (/CompareGrid/.test(block)) {
      const m = block.match(/bindings="([^"]*)"/);
      if (m) bindings = m[1].split(",").map((s) => s.trim()).filter(Boolean);
      return `\n\n${COMPARE_SENTINEL}\n\n`;
    }
    return block.replace(/^>?[ \t]*〔動的コンポーネント[：:][\s\S]*?〕/, "").trim();
  });
  b = substitutePlaceholders(b, plans, meta);
  let html = renderMarkdown(b);
  const table = bindings.length ? buildCompareTableHtml(bindings, plans, meta) : "";
  html = html.split(`<p>${COMPARE_SENTINEL}</p>`).join(table).split(COMPARE_SENTINEL).join(table);
  return html;
}

// yah.mobile 本体プランの単一の真実の源（SSOT）。plans は公開読み取り可（firestore.rules: allow read: if true）。
// 自社価格は本体で更新すれば magazine にも自動追随する（鉄則③・価格の二重管理をしない）。
const SSOT_PROJECT_ID = "yah-mobile-v1-3ed24";
const SSOT_API_KEY = "AIzaSyDlX00FbPP_Ij709LN0Xtrc26VjFh-57Js"; // web APIキー（公開値・読み取り専用）

/** Firestore REST の型付き値を素の JS 値へ。 */
function unwrapFsValue(v: Record<string, unknown> | undefined): unknown {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  return undefined;
}

/** SSOT（yah.mobile 本体）の有効な自社プランを magazine の Plan 形へ写像。docId をそのまま key にする（案A: priceBindings は SSOT docId を指す）。 */
async function getSelfPlansFromSSOT(): Promise<Plan[]> {
  try {
    const url =
      `https://firestore.googleapis.com/v1/projects/${SSOT_PROJECT_ID}` +
      `/databases/(default)/documents/plans?pageSize=300&key=${SSOT_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { documents?: Array<{ name: string; fields?: Record<string, Record<string, unknown>> }> };
    const docs = json.documents ?? [];
    return docs
      .map((d) => {
        const f = d.fields ?? {};
        const id = d.name.split("/").pop() ?? "";
        const isActive = String(unwrapFsValue(f.isActive) ?? "true");
        const dataGb = String(unwrapFsValue(f.dataGb) ?? "");
        const days = Number(unwrapFsValue(f.validityDays) ?? 0);
        const priceJpy = Number(unwrapFsValue(f.priceJpy) ?? 0);
        const updatedAt = Number(unwrapFsValue(f.updatedAt) ?? 0);
        const name = String(unwrapFsValue(f.name) ?? "");
        return { id, isActive, dataGb, days, priceJpy, updatedAt, name };
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

// 競合比較表「How we compare.」の SSOT（本体 competitorPlans/main・公開読み取り可）。
// yah.mobile 行＋競合各社の完成済み比較表。magazine では手管理せず、そのまま焼き込む。
interface CompetitorTable {
  columns: Array<{ id: string; label: string }>;
  rows: Array<{ serviceName: string; isHighlight: boolean; cells: Record<string, string> }>;
  updatedAt: number;
}

async function getCompetitorTable(): Promise<CompetitorTable | null> {
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
        return {
          serviceName: String(unwrapFsValue(rf.serviceName) ?? ""),
          isHighlight: unwrapFsValue(rf.isHighlight) === true,
          cells,
        };
      });
    return { columns, rows, updatedAt: Number(unwrapFsValue(f.updatedAt) ?? 0) };
  } catch {
    return null;
  }
}

function buildCompetitorTableHtml(table: CompetitorTable, lang: Lang): string {
  if (!table.columns.length || !table.rows.length) return "";
  const head = table.columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const body = table.rows
    .map((r) => {
      const style = r.isHighlight ? ' style="font-weight:700;background:#EAF7EE;"' : "";
      const tds = table.columns
        .map((c, i) => {
          const v = c.id === "service" ? r.serviceName : (r.cells[c.id] ?? "—");
          return `<td${i === 0 ? style : ""}>${esc(v)}</td>`;
        })
        .join("");
      return `<tr${r.isHighlight ? style : ""}>${tds}</tr>`;
    })
    .join("");
  const date = table.updatedAt ? new Date(table.updatedAt).toISOString().slice(0, 10) : "";
  const cap = lang === "ja" ? `${date} 時点の比較（他社は概算・自社が最安を強調）` : `Comparison as of ${date}`;
  return (
    `<table class="competitor-grid">` +
    `<caption style="caption-side:top;text-align:left;font-size:0.8em;color:#666;padding-bottom:0.4em;">${esc(cap)}</caption>` +
    `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
  );
}

/**
 * 記事に焼き込む自社プラン群（priceBindings 用）。本体 SSOT（plans）のみ（案A・key=SSOT docId）。
 * 競合は competitorPlans SSOT の比較表（showCompetitorTable）で扱うため、ここには混ぜない。
 */
async function getPlans(): Promise<Plan[]> {
  return getSelfPlansFromSSOT();
}

const AI_CRAWLERS: Array<[RegExp, string]> = [
  [/GPTBot/i, "GPTBot"],
  [/ChatGPT-User/i, "ChatGPT-User"],
  [/OAI-SearchBot/i, "OAI-SearchBot"],
  [/ClaudeBot/i, "ClaudeBot"],
  [/anthropic-ai/i, "Anthropic"],
  [/PerplexityBot/i, "PerplexityBot"],
  [/Google-Extended/i, "Google-Extended"],
  [/Bytespider/i, "Bytespider"],
  [/CCBot/i, "CCBot"],
  [/DuckAssistBot/i, "DuckAssistBot"],
  [/cohere-ai/i, "Cohere"],
];

function logAiCrawl(ua: string, reqPath: string): void {
  const hit = AI_CRAWLERS.find(([re]) => re.test(ua));
  if (!hit) return;
  db.collection("events")
    .add({
      type: "ai_crawl",
      path: reqPath.slice(0, 512),
      userAgent: ua.slice(0, 256),
      crawlerName: hit[1],
      createdAt: Date.now(),
      _serverTs: FieldValue.serverTimestamp(),
    })
    .catch(() => undefined);
}

async function getPublishedArticles(): Promise<ArticleDoc[]> {
  const snap = await db
    .collection("articles")
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(500)
    .get();
  return snap.docs.map((d) => d.data() as ArticleDoc);
}

// ─── /feeds/homes.json（yah.homes 配信用フィード・design_guides_pipeline.md） ────
async function renderHomesFeed(): Promise<string> {
  const articles = (await getPublishedArticles()).filter((a) => (a.distribution ?? []).includes("homes"));
  const feed = articles.map((a) => ({
    slug: a.slug,
    layer: a.layer ?? null,
    hesitation: a.hesitation ?? null,
    handoff: a.handoff ?? [],
    primaryQuery: a.primaryQuery ?? null,
    confirmedDate: a.confirmedDate ?? null,
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    thumbnailUrl: a.thumbnailUrl,
    author: a.author ?? null,
    languages: a.languages ?? [],
    translations: a.translations,
  }));
  return JSON.stringify(feed);
}

// ─── /feeds/esim.json（yah.mobile 配信用フィード・esim_pipeline_magazine.md） ────
// homes feed の対称。ヘッド(yah.mobile Astro)が build時に取得し /guides/esim/{lang}/{slug} を静的描画する。
// 価格の数値は載せない（鉄則③）。priceBindings(docID) のみ渡し、ヘッドが自前SSOTで焼く。
async function renderEsimFeed(): Promise<string> {
  const articles = (await getPublishedArticles()).filter((a) => (a.distribution ?? ["esim"]).includes("esim"));
  const feed = articles.map((a) => ({
    slug: a.slug,
    categorySlug: a.categorySlug,
    schemaType: a.schemaType,
    layer: a.layer ?? null,
    hesitation: a.hesitation ?? null,
    handoff: a.handoff ?? [],
    primaryQuery: a.primaryQuery ?? null,
    secondaryQueries: a.secondaryQueries ?? [],
    confirmedDate: a.confirmedDate ?? null,
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    thumbnailUrl: a.thumbnailUrl,
    author: a.author ?? null,
    languages: a.languages ?? [],
    priceBindings: a.priceBindings ?? [],          // ★SSOT docID（数値でない）
    showCompetitorTable: a.showCompetitorTable ?? false,
    fieldReport: a.fieldReport ?? null,            // ★実地レポート（一次データ・Markdown）
    fieldReportMode: a.fieldReportMode ?? null,    // "field"=実測 / "assumed"=想定
    // 正規URLはヘッドが slug×lang から /guides/esim/{lang}/{slug} で確定する。
    // ここは記事保存値の参考パス（既定言語ぶん）を渡す。
    canonical: a.canonical ?? null,
    translations: a.translations,
  }));
  return JSON.stringify(feed);
}

// ─── llms.txt ─────────────────────────────────────────────────────────────────
async function renderLlmsTxt(): Promise<string> {
  const articles = (await getPublishedArticles()).filter((a) => !isHomesOnly(a));
  const lines = articles
    .map((a) => {
      const t = a.translations.en ?? a.translations.ja;
      if (!t) return null;
      // ヘッドが正規面を持つ記事は、AIも正規URL（ヘッド）へ誘導する。
      const lang: Lang = a.translations.en ? "en" : "ja";
      const url = headCanonical(a, lang) ?? `${BASE_URL}/articles/${a.slug}`;
      return `- [${t.title}](${url}): ${t.excerpt ?? ""}`.trim();
    })
    .filter(Boolean)
    .join("\n");

  return `# yah.magazine — Content Hub for Japan Travel & eSIM

> magazine.yah.mobi is a multilingual content marketing site by yah. (yah.mobi).
> We publish first-hand guides on gourmet dining, travel, and eSIM connectivity in Japan —
> written by a Japan-based team, for visitors from South Korea, Taiwan, and English-speaking markets.

## About yah.

yah. is a Japan-based travel-tech company offering eSIM data plans (yah.mobile), curated accommodations (yah.homes), and travel content (yah.magazine).

- yah.mobile eSIM store: https://yah.mobi/app
- yah.homes accommodations: https://yah.homes
- yah.magazine content hub: ${BASE_URL}

## Content Categories

- **Gourmet** — First-hand restaurant guides with real prices, photos and queue info (our editorial focus)
- **Travel** — Destination guides, itineraries, travel tips for Japan
- **eSIM & Connectivity** — How to set up eSIM for Japan, carrier comparisons, live pricing at https://yah.mobi/llms.txt

## Published Articles

${lines || "(No articles published yet.)"}

## Language Coverage

This site publishes content in Japanese (ja), English (en), Korean (ko), and Traditional Chinese (zh-TW).
Each article may have multiple language variants accessible via the \`?lang=\` query parameter.

## Sitemap

Full sitemap: ${BASE_URL}/sitemap.xml
`;
}

// ─── sitemap.xml ──────────────────────────────────────────────────────────────
async function renderSitemap(): Promise<string> {
  // homes（magazine非配信）とヘッド所有（正規はヘッド側）を sitemap から除外し、矛盾シグナルを断つ。
  const articles = (await getPublishedArticles()).filter((a) => !isHomesOnly(a) && !isHeadOwned(a));
  const staticUrls = [
    { loc: `${BASE_URL}/`, priority: "1.0" },
    { loc: `${BASE_URL}/articles`, priority: "0.9" },
    { loc: `${BASE_URL}/articles?category=gourmet`, priority: "0.8" },
    { loc: `${BASE_URL}/articles?category=esim`, priority: "0.8" },
    { loc: `${BASE_URL}/articles?category=travel`, priority: "0.8" },
  ];
  const entries = [
    ...staticUrls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`),
    ...articles.map((a) => {
      const lastmod = new Date(a.updatedAt ?? Date.now()).toISOString().split("T")[0];
      return `  <url><loc>${BASE_URL}/articles/${a.slug}</loc><lastmod>${lastmod}</lastmod><priority>0.7</priority></url>`;
    }),
  ].join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

// ─── 記事ページ（メタ + JSON-LD + クローラー向け本文の注入） ────────────────────
// 管理用プレフィックス「W1-03｜」を配信タイトルから除去（クローラー/AIに社内番号を見せない）
function stripWavePrefix(s: string): string {
  return (s ?? "").replace(/^W\d+-\d+\s*[｜|]\s*/, "");
}

function buildHeadTags(a: ArticleDoc, t: Translation, lang: Lang, plans: Plan[], meta: { date: string; time: string }): string {
  const sub = (s: string) => stripWavePrefix(substitutePlaceholders(s, plans, meta));
  const title = sub(t.metaTitle || t.title);
  const desc = sub(t.metaDescription || t.excerpt || "");
  const selfUrl = `${BASE_URL}/articles/${a.slug}`;
  // 正規URL: ヘッド(yah.mobi等)が正規面を持つ記事はそちらへ向け、重複コンテンツを解消。
  // それ以外（magazine自身が正規）は自URL。og:url・JSON-LD・canonical で統一する。
  const url = headCanonical(a, lang) ?? selfUrl;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": a.schemaType || "Article",
    headline: sub(t.title),
    description: sub(t.excerpt || desc),
    image: a.thumbnailUrl || undefined,
    datePublished: a.publishedAt ? new Date(a.publishedAt).toISOString() : undefined,
    dateModified: a.updatedAt ? new Date(a.updatedAt).toISOString() : undefined,
    inLanguage: lang,
    publisher: { "@type": "Organization", name: "yah.magazine", url: BASE_URL },
    author: a.author
      ? { "@type": "Person", name: a.author.name, ...(a.author.title ? { jobTitle: a.author.title } : {}), ...(a.author.photoUrl ? { image: a.author.photoUrl } : {}) }
      : undefined,
    url,
  };
  const hreflang = (a.languages ?? [])
    .map((l) => {
      const langCode = l as Lang;
      // ヘッドが正規面を持つなら各言語のヘッドURL、そうでなければ magazine の ?lang= 形式。
      const href = headCanonical(a, langCode) ?? `${selfUrl}?lang=${l}`;
      return `<link rel="alternate" hreflang="${l}" href="${href}" />`;
    })
    .join("\n    ");
  const faqScript =
    t.faq && t.faq.length
      ? `<script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: t.faq.map((f) => ({
            "@type": "Question",
            name: sub(f.q),
            acceptedAnswer: { "@type": "Answer", text: sub(f.a) },
          })),
        })}</script>`
      : "";
  const fullTitle = /yah\.(magazine|mobi)/i.test(title) ? title : `${title} | yah.magazine`;
  return [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${url}" />`,
    a.thumbnailUrl ? `<meta property="og:image" content="${esc(a.thumbnailUrl)}" />` : "",
    hreflang,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    faqScript,
  ]
    .filter(Boolean)
    .join("\n    ");
}

function buildSeoContent(a: ArticleDoc, t: Translation, lang: Lang, plans: Plan[], meta: { date: string; time: string }, competitor: CompetitorTable | null): string {
  const date = a.publishedAt ? new Date(a.publishedAt).toISOString().split("T")[0] : "";
  // プラン表の「◯◯時点の価格」＝記事の公開日（JST）。未公開なら確認日→なければ本日。
  const asOfMs = a.publishedAt ?? a.updatedAt ?? Date.now();
  const asOfDate = new Date(asOfMs).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" });
  const sub = (s: string) => substitutePlaceholders(s, plans, meta);
  return `<div id="seo-content">
<article>
<h1>${esc(stripWavePrefix(sub(t.title)))}</h1>
${date ? `<p><time datetime="${date}">${date}</time> · ${esc(a.categorySlug)} · yah.magazine</p>` : ""}
${t.directAnswer ? `<section><h2>Summary</h2><p>${esc(sub(t.directAnswer))}</p></section>` : ""}
${withToc(linkPropertyImages(renderCompareBody(t.body, plans), a.handoff ?? []), lang)}
${
  // 実地レポート（一次データ・E-E-A-T/GEOの核）。本文直後に静的HTMLで焼き込み。空なら出さない。
  a.fieldReport
    ? `<section class="field-report"><h2>${lang === "ja" ? `実地レポート${a.fieldReportMode === "assumed" ? "（編集部の想定・実測前）" : "（実測）"}` : "Field report"}</h2>${renderMarkdown(a.fieldReport)}</section>`
    : ""
}
${
  // 通信カテゴリの定型: priceBindings のプラン表を FAQ 直前に自動挿入（最新価格をSSRで焼き込み＝GEO/堀）
  a.priceBindings && a.priceBindings.length
    ? `<section><h2>${lang === "ja" ? "現在のプランと価格" : "Current plans & prices"}</h2>${buildCompareTableHtml(a.priceBindings, plans, meta, asOfDate)}<p><a href="https://yah.mobi/app?ref=${esc(a.slug)}">${lang === "ja" ? "yah.mobileでeSIMを購入する →" : "Get your Japan eSIM at yah.mobile →"}</a></p></section>`
    : ""
}
${
  // compare/vs記事の定型: 本体 competitorPlans SSOT の「How we compare.」比較表を FAQ 直前に挿入
  a.showCompetitorTable && competitor
    ? `<section><h2>${lang === "ja" ? "他社との比較" : "How we compare"}</h2>${buildCompetitorTableHtml(competitor, lang)}</section>`
    : ""
}
${
  t.faq && t.faq.length
    ? `<section><h2>${lang === "ja" ? "よくある質問" : "FAQ"}</h2>${t.faq
        .map((f) => `<h3>${esc(sub(f.q))}</h3><p>${esc(sub(f.a))}</p>`)
        .join("\n")}</section>`
    : ""
}
<footer><p><a href="https://yah.mobi/app?ref=${esc(a.slug)}">Get a Japan eSIM at yah.mobile</a> · <a href="https://yah.homes">Stay in Fukuoka with yah.homes</a></p></footer>
</article>
</div>`;
}

async function renderArticlePage(slug: string, lang: Lang): Promise<{ status: number; html: string }> {
  const template = getTemplate();
  const snap = await db.collection("articles").doc(slug).get();
  const a = snap.exists ? (snap.data() as ArticleDoc) : null;
  if (!a || a.status !== "published" || isHomesOnly(a)) {
    // homes専用記事はmagazine側では配信しない（正規URLはyah.homes/guides/）
    return { status: 404, html: template };
  }
  const t = a.translations[lang] ?? a.translations.ja ?? Object.values(a.translations)[0];
  if (!t) return { status: 404, html: template };

  // 価格プランと競合比較表を SSR で焼き込む（GEO: クローラーに数値を見せる）。必要な記事だけ取得。
  const [plans, competitor] = await Promise.all([
    a.priceBindings && a.priceBindings.length ? getPlans() : Promise.resolve([] as Plan[]),
    a.showCompetitorTable ? getCompetitorTable() : Promise.resolve(null),
  ]);
  const meta = computePriceMeta(plans);

  // <title> をテンプレートから除去してから head タグ群を注入（重複防止）
  let html = template.replace(/<title>[\s\S]*?<\/title>/, "");
  html = html.replace("</head>", `    ${buildHeadTags(a, t, lang, plans, meta)}\n  </head>`);
  html = html.replace(/(<body[^>]*>)/, `$1\n${buildSeoContent(a, t, lang, plans, meta, competitor)}`);
  return { status: 200, html };
}

// ─── HTTP entry ───────────────────────────────────────────────────────────────
export const seoserver = onRequest(
  { region: "asia-northeast1", memory: "256MiB", maxInstances: 5 },
  async (req, res) => {
    const ua = req.headers["user-agent"] ?? "";
    const reqPath = req.path;
    logAiCrawl(String(ua), reqPath);

    try {
      if (reqPath === "/llms.txt") {
        res.set("Content-Type", "text/plain; charset=utf-8");
        res.set("Cache-Control", "public, max-age=300, s-maxage=600");
        res.send(await renderLlmsTxt());
        return;
      }
      if (reqPath === "/sitemap.xml") {
        res.set("Content-Type", "application/xml; charset=utf-8");
        res.set("Cache-Control", "public, max-age=300, s-maxage=600");
        res.send(await renderSitemap());
        return;
      }
      if (reqPath === "/feeds/homes.json") {
        res.set("Content-Type", "application/json; charset=utf-8");
        res.set("Cache-Control", "public, max-age=300, s-maxage=600");
        res.set("Access-Control-Allow-Origin", "*");
        res.send(await renderHomesFeed());
        return;
      }
      if (reqPath === "/feeds/esim.json") {
        res.set("Content-Type", "application/json; charset=utf-8");
        res.set("Cache-Control", "public, max-age=300, s-maxage=600");
        res.set("Access-Control-Allow-Origin", "*");
        res.send(await renderEsimFeed());
        return;
      }
      const m = reqPath.match(/^\/articles\/([a-z0-9-]+)\/?$/);
      if (m) {
        const langParam = String(req.query.lang ?? "ja");
        const lang: Lang = (LANGS as readonly string[]).includes(langParam) ? (langParam as Lang) : "ja";
        const { status, html } = await renderArticlePage(m[1], lang);
        res.status(status);
        res.set("Content-Type", "text/html; charset=utf-8");
        res.set("Cache-Control", status === 200 ? "public, max-age=300, s-maxage=600" : "no-cache");
        res.send(html);
        return;
      }
      // /articles（一覧）などその他: SPA テンプレートをそのまま返す
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "public, max-age=300, s-maxage=600");
      res.send(getTemplate());
    } catch (err) {
      console.error("[seoserver] error:", err);
      res.status(500).set("Content-Type", "text/html; charset=utf-8").send(getTemplate());
    }
  },
);
