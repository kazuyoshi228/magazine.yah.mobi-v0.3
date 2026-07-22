/**
 * merge-translations.mjs — 台湾(zh-TW)・韓国(ko)翻訳のネイティブ語彙版を Firestore にマージ書き込み
 *
 * 鉄則②厳守:
 *   - translations["zh-TW"] と translations["ko"] のみ更新（dot-path update）
 *   - status / translations.ja / translations.en / translations.th は一切触らない
 *   - 公開状態(published)を変えない・公開昇格しない
 *
 * 入力: scratchpad の rewritten_<slug>.json（{"zh-TW":{7keys}, "ko":{7keys}}）
 * 実行:
 *   node scripts/merge-translations.mjs            # dry-run（検証のみ・書き込まない）
 *   node scripts/merge-translations.mjs --write    # 本番へマージ書き込み（要 ADC/GOOGLE_APPLICATION_CREDENTIALS）
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const SC = "/private/tmp/claude-501/-Users-kazuyoshi228-Desktop-magazine-yah-mobi-v0-3/ab3d3fb7-d407-4272-adfb-146d195c69c1/scratchpad";
const PROJECT_ID = process.env.SEED_PROJECT_ID ?? "magazine-yah-mobi";
const WRITE = process.argv.includes("--write");
const REQ_KEYS = ["title", "excerpt", "directAnswer", "metaTitle", "metaDescription", "faq", "body"];
const LANGS = ["zh-TW", "ko"];

const SLUGS = [
  "fukuoka-whole-house", "fukuoka-villa", "fukuoka-4-6nin-hotel-hikaku",
  "fukuoka-chushajo-tsuki", "fukuoka-renpaku-kitchen", "fukuoka-kinenbi-kashikiri",
  "fukuoka-family-stay", "fukuoka-event-stay", "fukuoka-where-to-stay",
  "fukuoka-natsu-umi-family",
];

function validateLangObj(slug, lang, obj, origLen) {
  const errs = [];
  if (!obj || typeof obj !== "object") { errs.push(`${lang}: オブジェクトが無い`); return errs; }
  for (const k of REQ_KEYS) if (!(k in obj)) errs.push(`${lang}: キー欠落 ${k}`);
  if (obj.faq && !Array.isArray(obj.faq)) errs.push(`${lang}: faq が配列でない`);
  if (Array.isArray(obj.faq)) {
    obj.faq.forEach((f, i) => { if (!f || !f.q || !f.a) errs.push(`${lang}: faq[${i}] に q/a 欠落`); });
    if (origLen != null && obj.faq.length !== origLen) errs.push(`⚠️ ${lang}: faq長 ${obj.faq.length}≠原文 ${origLen}`);
  }
  if (typeof obj.body !== "string" || obj.body.length < 300) errs.push(`${lang}: body が短すぎる(${obj.body?.length})`);
  return errs;
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

let okCount = 0, errCount = 0, wrote = 0;
console.log(`=== merge-translations (${WRITE ? "WRITE" : "dry-run"}) project=${PROJECT_ID} ===\n`);

for (const slug of SLUGS) {
  const rf = `${SC}/rewritten_${slug}.json`;
  const af = `${SC}/article_${slug}.json`;
  if (!existsSync(rf)) { console.log(`⏭  ${slug}: rewritten ファイル無し（スキップ）`); continue; }

  let rew, orig = {};
  try { rew = JSON.parse(readFileSync(rf, "utf-8")); } catch (e) { console.log(`❌ ${slug}: JSON parse 失敗 ${e}`); errCount++; continue; }
  try { orig = JSON.parse(readFileSync(af, "utf-8")); } catch { /* noop */ }

  // 検証
  let errs = [];
  for (const lang of LANGS) {
    const origLen = orig?.[lang]?.faq?.length;
    errs = errs.concat(validateLangObj(slug, lang, rew[lang], origLen));
  }
  const hardErrs = errs.filter(e => !e.startsWith("⚠️"));
  errs.filter(e => e.startsWith("⚠️")).forEach(w => console.log(`   ${w}`));
  if (hardErrs.length) { console.log(`❌ ${slug}: 検証NG\n   - ${hardErrs.join("\n   - ")}`); errCount++; continue; }

  // 既存doc確認（status/ja を触らないことの担保・存在確認）
  const ref = db.doc(`articles/${slug}`);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`❌ ${slug}: Firestore に存在しない（スキップ）`); errCount++; continue; }
  const cur = snap.data();
  const curStatus = cur.status;
  const langsBefore = (cur.languages || []).join(",");

  console.log(`✅ ${slug}: 検証OK  status=${curStatus}(不変) langs=[${langsBefore}]  zh/ko更新`);
  okCount++;

  if (WRITE) {
    await ref.update({
      "translations.zh-TW": rew["zh-TW"],
      "translations.ko": rew["ko"],
      languages: FieldValue.arrayUnion("zh-TW", "ko"),
      updatedAt: Date.now(),
    });
    // status を書き換えていないことを再確認
    const after = (await ref.get()).data();
    if (after.status !== curStatus) console.log(`   ⚠️ status が変化した！ ${curStatus}→${after.status}（要調査）`);
    else console.log(`   📝 書込完了（status=${after.status} 維持）`);
    wrote++;
  }
}

console.log(`\n--- 集計: 検証OK ${okCount} / エラー ${errCount} / 書込 ${wrote} ---`);
if (!WRITE) console.log("※ dry-run。書き込むには --write を付与（status/ja/en/th は不可侵・zh-TW/ko のみ更新）");
