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
const LANGS = ["ja", "en", "ko", "zh-TW"] as const;
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
function renderMarkdown(md: string): string {
  const html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
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

// ─── llms.txt ─────────────────────────────────────────────────────────────────
async function renderLlmsTxt(): Promise<string> {
  const articles = await getPublishedArticles();
  const lines = articles
    .map((a) => {
      const t = a.translations.en ?? a.translations.ja;
      if (!t) return null;
      return `- [${t.title}](${BASE_URL}/articles/${a.slug}): ${t.excerpt ?? ""}`.trim();
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
  const articles = await getPublishedArticles();
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
function buildHeadTags(a: ArticleDoc, t: Translation, lang: Lang): string {
  const title = t.metaTitle || t.title;
  const desc = t.metaDescription || t.excerpt || "";
  const url = `${BASE_URL}/articles/${a.slug}`;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": a.schemaType || "Article",
    headline: t.title,
    description: t.excerpt || desc,
    image: a.thumbnailUrl || undefined,
    datePublished: a.publishedAt ? new Date(a.publishedAt).toISOString() : undefined,
    dateModified: a.updatedAt ? new Date(a.updatedAt).toISOString() : undefined,
    inLanguage: lang,
    publisher: { "@type": "Organization", name: "yah.magazine", url: BASE_URL },
    url,
  };
  const hreflang = (a.languages ?? [])
    .map((l) => `<link rel="alternate" hreflang="${l}" href="${url}?lang=${l}" />`)
    .join("\n    ");
  const faqScript =
    t.faq && t.faq.length
      ? `<script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: t.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
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

function buildSeoContent(a: ArticleDoc, t: Translation, lang: Lang): string {
  const date = a.publishedAt ? new Date(a.publishedAt).toISOString().split("T")[0] : "";
  return `<div id="seo-content">
<article>
<h1>${esc(t.title)}</h1>
${date ? `<p><time datetime="${date}">${date}</time> · ${esc(a.categorySlug)} · yah.magazine</p>` : ""}
${t.directAnswer ? `<section><h2>${lang === "ja" ? "直接回答" : "Direct Answer"}</h2><p>${esc(t.directAnswer)}</p></section>` : ""}
${renderMarkdown(t.body)}
${
  t.faq && t.faq.length
    ? `<section><h2>${lang === "ja" ? "よくある質問" : "FAQ"}</h2>${t.faq
        .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
        .join("\n")}</section>`
    : ""
}
<footer><p><a href="https://yah.mobi/app">Get a Japan eSIM at yah.mobile</a> · <a href="https://yah.homes">Stay in Fukuoka with yah.homes</a></p></footer>
</article>
</div>`;
}

async function renderArticlePage(slug: string, lang: Lang): Promise<{ status: number; html: string }> {
  const template = getTemplate();
  const snap = await db.collection("articles").doc(slug).get();
  const a = snap.exists ? (snap.data() as ArticleDoc) : null;
  if (!a || a.status !== "published") {
    return { status: 404, html: template };
  }
  const t = a.translations[lang] ?? a.translations.ja ?? Object.values(a.translations)[0];
  if (!t) return { status: 404, html: template };

  // <title> をテンプレートから除去してから head タグ群を注入（重複防止）
  let html = template.replace(/<title>[\s\S]*?<\/title>/, "");
  html = html.replace("</head>", `    ${buildHeadTags(a, t, lang)}\n  </head>`);
  html = html.replace(/(<body[^>]*>)/, `$1\n${buildSeoContent(a, t, lang)}`);
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
