import type { Express } from "express";
import { getDb } from "./db";
import { articles, articleTranslations, categories } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const BASE_URL = "https://magazine.yah.mobi";
const LANGS = ["ja", "en", "ko", "zh-TW"] as const;

// ─── Sitemap XML ─────────────────────────────────────────────────────────────
async function generateSitemap(): Promise<string> {
  const db = await getDb();

  const staticUrls = [
    { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${BASE_URL}/articles`, priority: "0.9", changefreq: "daily" },
    { loc: `${BASE_URL}/articles?category=esim`, priority: "0.8", changefreq: "weekly" },
    { loc: `${BASE_URL}/articles?category=gourmet`, priority: "0.8", changefreq: "weekly" },
    { loc: `${BASE_URL}/articles?category=travel`, priority: "0.8", changefreq: "weekly" },
  ];

  let articleUrls: { loc: string; lastmod: string; priority: string }[] = [];

  if (db) {
    try {
      const rows = await db
        .select({
          slug: articles.slug,
          updatedAt: articles.updatedAt,
          lang: articleTranslations.lang,
        })
        .from(articles)
        .innerJoin(articleTranslations, eq(articleTranslations.articleId, articles.id))
        .where(eq(articles.status, "published"));

      // Deduplicate by slug (one entry per article, not per translation)
      const seen = new Set<string>();
      for (const row of rows) {
        if (!seen.has(row.slug)) {
          seen.add(row.slug);
          articleUrls.push({
            loc: `${BASE_URL}/articles/${row.slug}`,
            lastmod: row.updatedAt ? new Date(row.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            priority: "0.7",
          });
        }
      }
    } catch (e) {
      console.error("[SEO] Sitemap DB error:", e);
    }
  }

  const urlEntries = [
    ...staticUrls.map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    ),
    ...articleUrls.map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`
    ),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;
}

// ─── llms.txt ─────────────────────────────────────────────────────────────────
async function generateLlmsTxt(): Promise<string> {
  const db = await getDb();

  let articleLines = "";

  if (db) {
    try {
      const rows = await db
        .select({
          slug: articles.slug,
          title: articleTranslations.title,
          excerpt: articleTranslations.excerpt,
          lang: articleTranslations.lang,
          publishedAt: articles.publishedAt,
        })
        .from(articles)
        .innerJoin(articleTranslations, eq(articleTranslations.articleId, articles.id))
        .where(and(eq(articles.status, "published"), eq(articleTranslations.lang, "en")));

      articleLines = rows
        .map(
          (r) =>
            `- [${r.title}](${BASE_URL}/articles/${r.slug}): ${r.excerpt ?? ""}`.trim()
        )
        .join("\n");
    } catch (e) {
      console.error("[SEO] llms.txt DB error:", e);
    }
  }

  return `# yah.magazine — Content Hub for Japan Travel & eSIM

> magazine.yah.mobi is a multilingual content marketing site by yah. (yah.mobi).
> We publish guides on eSIM connectivity, gourmet dining, and travel in Japan — primarily for visitors from Japan, South Korea, Taiwan, and English-speaking markets.

## About yah.

yah. is a Japan-based travel-tech company offering eSIM data plans (yah.mobile), curated accommodations (yah.homes), and travel content (yah.magazine).

- yah.mobile eSIM store: https://yah.mobi/app
- yah.homes accommodations: https://yah.homes
- yah.magazine content hub: https://magazine.yah.mobi

## Content Categories

- **eSIM & Connectivity** — How to set up eSIM for Japan, carrier comparisons, data plan guides
- **Gourmet** — Restaurant guides, food culture, dining tips for travelers
- **Travel** — Destination guides, itineraries, travel tips for Japan

## Published Articles

${articleLines || "(No articles published yet.)"}

## Language Coverage

This site publishes content in Japanese (ja), English (en), Korean (ko), and Traditional Chinese (zh-TW).
Each article may have multiple language variants accessible via the \`?lang=\` query parameter.

## Sitemap

Full sitemap: ${BASE_URL}/sitemap.xml

## Contact

For content partnerships or press inquiries, visit: https://yah.mobi
`;
}

// ─── Register Routes ──────────────────────────────────────────────────────────
export function registerSeoRoutes(app: Express) {
  // robots.txt
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
      `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml

# Content marketing site — yah.magazine
# Powered by yah. (https://yah.mobi)
`
    );
  });

  // sitemap.xml
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const xml = await generateSitemap();
      res.type("application/xml").send(xml);
    } catch (e) {
      console.error("[SEO] Sitemap error:", e);
      res.status(500).send("Sitemap generation failed");
    }
  });

  // llms.txt
  app.get("/llms.txt", async (_req, res) => {
    try {
      const txt = await generateLlmsTxt();
      res.type("text/plain; charset=utf-8").send(txt);
    } catch (e) {
      console.error("[SEO] llms.txt error:", e);
      res.status(500).send("llms.txt generation failed");
    }
  });
}
