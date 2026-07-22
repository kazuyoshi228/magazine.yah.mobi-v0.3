/**
 * merge-villa-ja.mjs — fukuoka-villa の ja 翻訳のみを Firestore にマージ書き込み
 *
 * 背景: B案改稿（docs/spec_villa_rescue_202607.md・2026-07-21 発注者承認「デプロイまで進めて良いよ」）
 * 鉄則遵守:
 *   - translations.ja のみ dot-path update。status / 他4言語 / 公開状態は一切触らない
 *   - 事前バックアップ: scratchpad/backup_fukuoka-villa.json（取得済みであること）
 * 実行:
 *   node scripts/merge-villa-ja.mjs            # dry-run
 *   node scripts/merge-villa-ja.mjs --write    # 本番へマージ（要 ADC）
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");
const SC = "/private/tmp/claude-501/-Users-kazuyoshi228-Desktop-magazine-yah-mobi-v0-3/ab3d3fb7-d407-4272-adfb-146d195c69c1/scratchpad";

if (!existsSync(`${SC}/backup_fukuoka-villa.json`)) {
  console.error("❌ バックアップが無い。先に本番docをscratchpadへ退避すること");
  process.exit(1);
}

const raw = readFileSync("content/guides/ja/fukuoka-villa.md", "utf-8");
const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
const fmRaw = m[1];
const body = m[2].replace(/\n---\n〔骨組みメモ（公開前に処理）[\s\S]*$/, "").trim();
const get = (k) => (fmRaw.match(new RegExp("^" + k + ": (.*)$", "m")) || [])[1];
const faq = [...fmRaw.matchAll(/^ {2}- "(.+?)\|\|(.+?)"$/gm)].map((x) => ({ q: x[1], a: x[2] }));

const ja = {
  title: get("title"),
  excerpt: get("excerpt"),
  directAnswer: get("directAnswer"),
  metaTitle: get("metaTitle"),
  metaDescription: get("metaDescription"),
  faq,
  body,
};

console.log(`新ja: faq=${ja.faq.length} body=${ja.body.length}字 metaTitle=${ja.metaTitle}`);
const errs = [];
if (ja.faq.length !== 8) errs.push(`faq が8問でない (${ja.faq.length})`);
if (!ja.title || !ja.excerpt || !ja.directAnswer || !ja.metaTitle || !ja.metaDescription) errs.push("front-matter 欠落");
if (ja.body.length < 3000) errs.push(`body が短すぎる (${ja.body.length})`);
if (!ja.directAnswer.includes("4万円台")) errs.push("directAnswer に価格レンジが無い");
if (ja.body.includes("骨組みメモ")) errs.push("骨組みメモの除去漏れ");
if (errs.length) { console.error("❌ 検証NG:\n - " + errs.join("\n - ")); process.exit(1); }
console.log("✅ 検証OK");

if (!WRITE) { console.log("[dry-run] 書き込みなし。--write で本番へ"); process.exit(0); }

initializeApp({ credential: applicationDefault(), projectId: "magazine-yah-mobi" });
const db = getFirestore();
const ref = db.doc("articles/fukuoka-villa");
const before = (await ref.get()).data();
console.log(`書込前: status=${before.status} langs=${Object.keys(before.translations).join(",")}`);
await ref.update({
  "translations.ja": ja,
  confirmedDate: "2026-07-21",
  updatedAt: FieldValue.serverTimestamp(),
});
const after = (await ref.get()).data();
console.log(`✅ 書込後: status=${after.status}(不変) langs=${Object.keys(after.translations).join(",")} ja.faq=${after.translations.ja.faq.length}`);
