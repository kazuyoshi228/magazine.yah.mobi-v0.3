/**
 * observe.mjs — yah.homes 福岡クラスタの定点観測（認証不要ぶん）
 *
 * 測るもの（公開HTTPのみ・どの環境でも動く）:
 *   - sitemap の /guides/ ページ数
 *   - feed の記事数・5言語カバー率・内部リンク(関連ガイド)保持率
 *   - 主要URLの健全性（各言語で 200 が返るか）
 *   - llms.txt(GEO)到達
 * スナップショットを docs/観測ログ.jsonl に1行追記し、サマリを表示。
 *
 * 訪問者数（GA4 organic）・掲載(GSC impressions/index)は認証が要るため別途（本ファイル末尾に手順）。
 *
 * 実行: node scripts/observe.mjs
 */
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

const FEED = "https://magazine.yah.mobi/feeds/homes.json";
const SITEMAP = "https://yah.homes/sitemap-0.xml";
const LLMS = "https://yah.homes/llms.txt";
const LOG = path.resolve(process.cwd(), "docs/観測ログ.jsonl");
const cb = () => `?ts=${Date.now()}`;

async function head(url) {
  try { const r = await fetch(url, { method: "GET" }); return r.status; } catch { return 0; }
}

const now = new Date();
const stamp = now.toISOString();

// ① feed: 記事数・5言語率・関連ガイド率
let feedStat = { articles: 0, fiveLang: 0, related: 0 };
try {
  const feed = await (await fetch(FEED + cb())).json();
  feedStat.articles = feed.length;
  for (const a of feed) {
    const langs = Object.keys(a.translations || {});
    if (langs.length >= 5) feedStat.fiveLang++;
    const ja = a.translations?.ja?.body || "";
    if (ja.includes("関連ガイド")) feedStat.related++;
  }
} catch (e) { feedStat.error = String(e); }

// ② sitemap: /guides/ ページ数
let sitemapGuides = 0;
try {
  const xml = await (await fetch(SITEMAP + cb())).text();
  sitemapGuides = (xml.match(/\/guides\//g) || []).length;
} catch { /* noop */ }

// ③ 主要URL健全性（換金記事4本 × 5言語プレフィックス）
const PREFIX = { en: "", ja: "/ja", ko: "/ko", "zh-TW": "/zh", th: "/th" };
const CHECK = ["fukuoka-4-6nin-hotel-hikaku", "fukuoka-chushajo-tsuki", "fukuoka-renpaku-kitchen", "fukuoka-kinenbi-kashikiri"];
let ok = 0, total = 0;
for (const slug of CHECK) {
  for (const p of Object.values(PREFIX)) {
    total++;
    const code = await head(`https://yah.homes${p}/guides/${slug}/`);
    if (code === 200) ok++;
  }
}

// ④ llms.txt
const llms = await head(LLMS);

const snapshot = {
  at: stamp,
  feed: feedStat,
  sitemapGuides,
  urlHealth: { ok, total, pct: total ? Math.round((ok / total) * 100) : 0 },
  llmsTxt: llms,
  // 訪問者(GA4)・掲載(GSC)は認証後にここへ追加: gaOrganicSessions, gscImpressions, gscIndexed …
};

try { appendFileSync(LOG, JSON.stringify(snapshot) + "\n"); } catch { /* noop */ }

// 前回との差分
let prev = null;
try {
  const lines = readFileSync(LOG, "utf-8").trim().split("\n");
  if (lines.length >= 2) prev = JSON.parse(lines[lines.length - 2]);
} catch { /* noop */ }

console.log(`=== 観測 ${stamp} ===`);
console.log(`feed記事: ${feedStat.articles} / 5言語: ${feedStat.fiveLang} / 関連ガイド保持: ${feedStat.related}`);
console.log(`sitemap /guides/ ページ: ${sitemapGuides}`);
console.log(`URL健全性(換金4本×5言語): ${ok}/${total} (${snapshot.urlHealth.pct}%)`);
console.log(`llms.txt: ${llms}`);
if (prev) {
  console.log(`--- 前回(${prev.at?.slice(0,10)})比 ---`);
  console.log(`  記事: ${feedStat.articles - prev.feed.articles >= 0 ? "+" : ""}${feedStat.articles - prev.feed.articles} / URL健全: ${snapshot.urlHealth.pct - prev.urlHealth.pct >= 0 ? "+" : ""}${snapshot.urlHealth.pct - prev.urlHealth.pct}pt`);
}
console.log(`\n（訪問者数=GA4 / 掲載=GSC は認証後に統合。観測シート §4-5 参照）`);
