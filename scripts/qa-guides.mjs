/**
 * qa-guides.mjs — yah.homes ガイド記事の機械的検品（外注・AIどちらが作業しても事故を止める）
 *
 * 正本: docs/spec_yah_homes_editorial_canon.md
 * ここで見るのは「人が見落とす・AIが指示されないと見ない」種類の欠陥だけ。
 * 文章の良し悪し（自然さ・トーン）は対象外＝そこは人/AIの仕事。
 *
 * 検査内容（すべて 2026-07-17 に実際に事故った実例に対応）:
 *   1. 物件セクションの重複        … 同じ2棟を1記事で2回紹介していないか
 *   2. テンプレCTA見出しとの衝突    … 本文見出しが yah.homes 側テンプレの見出しと同一でないか
 *   3. 関連ガイドの重複            … 関連ガイド節が2本無いか
 *   4. 内部リンクの形式            … 本文は必ずプレフィックス無し /guides/{slug}/（テンプレが言語別に変換する）
 *   5. ネイティブ語彙              … 台湾=包棟がある / 韓国=독채がある・풀빌라が無い
 *   6. 汎用フック文の残置          … 記事テーマと無関係な「水回り/駐車場/静けさ」等が残っていないか
 *   7. 必須フィールド              … title/directAnswer/metaTitle/metaDescription
 *   8. 未公開記事へのリンク         … 公開記事が draft にリンクしていないか（読者には404）
 *   9. 二重エスケープ（--live）     … &amp;#39; 等がライブHTMLに出ていないか
 *
 * 実行:
 *   node scripts/qa-guides.mjs           # Firestore(feed) を検査（速い）
 *   node scripts/qa-guides.mjs --live    # ライブHTMLの二重エスケープ・200 も検査（遅い）
 * 失敗があれば終了コード 1（CI/デプロイ前ゲートに使える）。
 */

const FEED = "https://magazine.yah.mobi/feeds/homes.json";
const SITE = "https://yah.homes";
const LIVE = process.argv.includes("--live");

const LANGS = ["ja", "zh-TW", "ko", "en", "th"];
/** 言語別 URL プレフィックス（DEFAULT_LOCALE=en なので en はルート） */
const PREFIX = { en: "", ja: "/ja", ko: "/ko", "zh-TW": "/zh", th: "/th" };

/** yah.homes 側テンプレが全ガイド末尾に自動で出す見出し（本文でこれと同じ見出しを作らない） */
const TEMPLATE_HEADINGS = ["福岡・都心の一棟貸しなら", "Stay with yah.homes"];

/** 関連ガイド節の見出し（言語別の正規表記）。これ以外の表記ゆれも重複検出のため拾う。 */
const RELATED_RE = /^##\s+(関連ガイド|相關指南|관련 가이드|Related guides?|คู่มือที่เกี่ยวข้อง|ไกด์ที่เกี่ยวข้อง|More guides)\s*$/i;

/**
 * 汎用テンプレのフック文（「この記事で書いた『水回りの数』『駐車場』『住宅地の静けさ』を…」）の検出。
 * 単語単体だと誤検知する（whole-house は「人数別の選び方」で水回りの数を正当に論じている）ため、
 * **汎用3特徴のうち2つが近接して出現**した場合のみ「貼り付けたまま直していない」と判定する。
 */
const GENERIC_HOOK_PAIRS = [
  ["水回りの数", "住宅地の静けさ"],
  ["수도 설비", "주택가의 조용함"],
  ["물 쓰는 공간", "주택가의 조용함"],
  ["衛浴數量", "住宅區的"],
  ["จำนวนจุดน้ำ", "ความเงียบของย่าน"],
  ["water fixtures", "residential area"],
  ["number of bathrooms", "residential"],
];
const NEAR = 120; // この文字数以内に両方あれば同じ一文＝汎用フック

/** ネイティブ語彙（正本 §2）。zh-TW=包棟 / ko=독채 は必須、풀빌라 は禁止（プールが無いため）。 */
const VOCAB = {
  "zh-TW": { must: ["包棟"], ban: [] },
  ko: { must: ["독채"], ban: ["풀빌라"] },
};

const REQUIRED_FIELDS = ["title", "directAnswer", "metaTitle", "metaDescription"];

const errors = [];
const warns = [];
const err = (slug, lang, msg) => errors.push(`${slug} [${lang}] ${msg}`);
const warn = (slug, lang, msg) => warns.push(`${slug} [${lang}] ${msg}`);

const feed = await (await fetch(`${FEED}?ts=${Date.now()}`)).json();
// feed は公開記事のみ。ここに無い slug へのリンクは読者には 404 になる。
const publishedSlugs = new Set(feed.map((a) => a.slug));
console.log(`検査対象: ${feed.length} 記事 × ${LANGS.length} 言語\n`);

for (const a of feed) {
  for (const lang of LANGS) {
    const t = a.translations?.[lang];
    if (!t) { warn(a.slug, lang, "翻訳が無い"); continue; }
    const body = t.body ?? "";
    const h2 = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

    // 7. 必須フィールド
    for (const f of REQUIRED_FIELDS) {
      if (!t[f] || String(t[f]).trim() === "") err(a.slug, lang, `必須フィールド欠落: ${f}`);
    }

    // 1. 物件セクションの重複
    const propHeads = h2.filter((h) => /yah\.homes/i.test(h));
    if (propHeads.length > 1) {
      err(a.slug, lang, `物件セクションが ${propHeads.length} 本ある（1本にする）: ${propHeads.join(" / ")}`);
    }

    // 2. テンプレCTA見出しとの衝突
    for (const h of h2) {
      const bare = h.replace(/^→\s*/, "").replace(/（.*?）|\(.*?\)/g, "").trim();
      if (TEMPLATE_HEADINGS.some((tpl) => bare === tpl)) {
        err(a.slug, lang, `本文見出しが yah.homes テンプレのCTA見出しと同一: 「${h}」`);
      }
    }

    // 3. 関連ガイドの重複
    const relHeads = h2.filter((h) => RELATED_RE.test(`## ${h}`));
    if (relHeads.length > 1) err(a.slug, lang, `関連ガイド節が ${relHeads.length} 本ある: ${relHeads.join(" / ")}`);

    // 4. 内部リンクの形式（正本 §5）
    //    テンプレが localizedPath() で言語プレフィックスを無条件付与するため、
    //    本文にプレフィックスを書くと /ja/ja/guides/… となり 404 になる。
    for (const m of body.matchAll(/\]\((\/[^)\s]*guides\/[^)\s]*)\)/g)) {
      const href = m[1];
      if (/^\/(ja|ko|zh|th|en)\/guides\//.test(href)) {
        err(a.slug, lang, `内部リンクに言語プレフィックスが付いている（404になる。/guides/… にする）: ${href}`);
      } else if (!/^\/guides\//.test(href)) {
        err(a.slug, lang, `内部リンクの形式が不正（/guides/{slug}/ にする）: ${href}`);
      } else if (!href.endsWith("/")) {
        err(a.slug, lang, `内部リンクの末尾スラッシュが無い: ${href}`);
      } else {
        // 8. リンク先が公開されているか（draft へのリンクは読者には 404）
        const target = href.match(/^\/guides\/([a-z0-9-]+)\/$/)?.[1];
        if (target && !publishedSlugs.has(target)) {
          err(a.slug, lang, `未公開（draft）の記事にリンクしている＝読者には404: /guides/${target}/`);
        }
      }
    }

    // 5. ネイティブ語彙
    const v = VOCAB[lang];
    if (v) {
      const all = [t.title, t.metaTitle, t.directAnswer, body].join(" ");
      for (const k of v.must) if (!all.includes(k)) err(a.slug, lang, `ネイティブ検索語が入っていない: 「${k}」`);
      for (const k of v.ban) if (all.includes(k)) err(a.slug, lang, `使ってはいけない語が入っている: 「${k}」`);
    }

    // 6. 汎用フック文の残置（2語が近接＝貼り付けたまま）
    for (const [x, y] of GENERIC_HOOK_PAIRS) {
      const i = body.indexOf(x);
      if (i < 0) continue;
      const j = body.indexOf(y, Math.max(0, i - NEAR));
      if (j >= 0 && Math.abs(j - i) <= NEAR) {
        err(a.slug, lang, `記事テーマと無関係な汎用フック文が残っている（「${x}」と「${y}」が同一文に）— 記事のテーマに合わせて書き換える`);
      }
    }
  }

  // FAQ 長の言語間ずれ（警告のみ）
  const faqLens = LANGS.map((l) => a.translations?.[l]?.faq?.length).filter((x) => x != null);
  if (new Set(faqLens).size > 1) warn(a.slug, "-", `FAQ数が言語で不一致: ${faqLens.join("/")}`);
}

// 8. ライブHTML: 二重エスケープ・到達性
if (LIVE) {
  console.log("ライブHTMLを検査中（--live）…");
  const DBL = /&amp;(#\d+|#x[0-9a-fA-F]+|quot|apos|lt|gt|nbsp|amp);/g;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const a of feed) {
    for (const lang of LANGS) {
      if (!a.translations?.[lang]) continue;
      const url = `${SITE}${PREFIX[lang]}/guides/${a.slug}/`;
      let html = null;
      for (let i = 0; i < 3 && html === null; i++) {
        try {
          const r = await fetch(url);
          if (r.status === 200) html = await r.text();
          else if (i === 2) err(a.slug, lang, `HTTP ${r.status}: ${url}`);
        } catch { if (i === 2) err(a.slug, lang, `到達不能: ${url}`); }
        if (html === null) await sleep(400 * (i + 1));
      }
      if (!html) continue;
      const hits = html.match(DBL) || [];
      if (hits.length) err(a.slug, lang, `二重エスケープ ${hits.length}件（${[...new Set(hits)].slice(0, 3).join(",")}）: ${url}`);
      await sleep(100);
    }
  }
}

// ── 結果 ──
console.log("");
if (warns.length) {
  console.log(`⚠️  警告 ${warns.length}件`);
  warns.forEach((w) => console.log("   " + w));
  console.log("");
}
if (errors.length) {
  console.log(`❌ 検品NG: ${errors.length}件`);
  errors.forEach((e) => console.log("   " + e));
  console.log("\n直し方は docs/spec_yah_homes_editorial_canon.md §4（踏んではいけない罠）を参照。");
  process.exit(1);
}
console.log(`✅ 検品OK（${feed.length}記事 × ${LANGS.length}言語${LIVE ? " + ライブHTML" : ""}）— 既知の欠陥は検出されず`);
