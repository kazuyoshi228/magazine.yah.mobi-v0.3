/**
 * apply-uc-fixes.mjs — ultracode QA の確定修正を Firestore に適用（鉄則②厳守）
 *
 *   - translations.<lang>.<field> のみ dot-path 更新。status・他言語・他フィールドは触らない
 *   - 適用前に対象docの全文バックアップを scratchpad に保存
 *   - fixes JSON 形式: { "<slug>": { "<lang>": [ { "field": "body", "find": "...", "replace": "..." } ] } }
 *   - find は対象フィールド内で一意に一致しなければエラー（誤爆防止）
 *   - --write で本番適用・--qa-stamp で ultracodeQaAt/Findings も記録
 *
 * 実行:
 *   node scripts/apply-uc-fixes.mjs <fixes.json>            # dry-run
 *   node scripts/apply-uc-fixes.mjs <fixes.json> --write [--qa-stamp]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import admin from "firebase-admin";

const WRITE = process.argv.includes("--write");
const STAMP = process.argv.includes("--qa-stamp");
const fixesPath = process.argv[2];
if (!fixesPath) { console.error("usage: node scripts/apply-uc-fixes.mjs <fixes.json> [--write] [--qa-stamp]"); process.exit(1); }
const FIXES = JSON.parse(readFileSync(fixesPath, "utf8"));

const BK = "/private/tmp/claude-501/-Users-kazuyoshi228-Desktop-magazine-yah-mobi-v0-3/f01d1a22-a56e-45ee-9e47-2f93719ce3dc/scratchpad/uc_qa/backup";
mkdirSync(BK, { recursive: true });

admin.initializeApp({ projectId: "magazine-yah-mobi" });
const db = admin.firestore();

let totalApplied = 0, hadError = false;
for (const [slug, langs] of Object.entries(FIXES)) {
  const ref = db.collection("articles").doc(slug);
  const snap = await ref.get();
  if (!snap.exists) { console.error(`❌ ${slug}: doc not found`); hadError = true; continue; }
  const data = snap.data();
  writeFileSync(`${BK}/${slug}.backup.${Date.now()}.json`, JSON.stringify(data, null, 1));

  const update = {};
  let count = 0;
  for (const [lang, fixes] of Object.entries(langs)) {
    const tr = data.translations?.[lang];
    if (!tr) { console.error(`❌ ${slug}/${lang}: translation missing`); hadError = true; continue; }
    // フィールドごとに逐次適用（同一フィールド複数fixに対応）
    const fields = {};
    for (const f of fixes) {
      if (f.field === "faq") {
        const faq = fields.faq ?? JSON.parse(JSON.stringify(tr.faq ?? []));
        let occ = 0;
        for (const item of faq) for (const k of ["q", "a"]) if (typeof item[k] === "string") occ += item[k].split(f.find).length - 1;
        if (occ === 0) { console.error(`❌ ${slug}/${lang}.faq: find not found: ${f.find.slice(0, 60)}`); hadError = true; continue; }
        if (occ > 1 && !f.all) { console.error(`❌ ${slug}/${lang}.faq: find matches ${occ}x: ${f.find.slice(0, 60)}`); hadError = true; continue; }
        for (const item of faq) for (const k of ["q", "a"]) if (typeof item[k] === "string" && item[k].includes(f.find)) item[k] = f.all ? item[k].split(f.find).join(f.replace) : item[k].replace(f.find, f.replace);
        fields.faq = faq;
        count++;
        continue;
      }
      const cur = fields[f.field] ?? tr[f.field];
      if (typeof cur !== "string") { console.error(`❌ ${slug}/${lang}.${f.field}: not a string field`); hadError = true; continue; }
      const occurrences = cur.split(f.find).length - 1;
      if (occurrences === 0) { console.error(`❌ ${slug}/${lang}.${f.field}: find not found: ${f.find.slice(0, 60)}`); hadError = true; continue; }
      if (occurrences > 1 && !f.all) { console.error(`❌ ${slug}/${lang}.${f.field}: find matches ${occurrences}x (set "all":true to replace all): ${f.find.slice(0, 60)}`); hadError = true; continue; }
      fields[f.field] = f.all ? cur.split(f.find).join(f.replace) : cur.replace(f.find, f.replace);
      count++;
    }
    for (const [field, val] of Object.entries(fields)) update[`translations.${lang}.${field}`] = val;
  }

  if (STAMP) { update["ultracodeQaAt"] = Date.now(); update["ultracodeQaFindings"] = count; }
  console.log(`${WRITE ? "✍️" : "🧪"} ${slug}: ${count} fix(es) → ${Object.keys(update).filter(k => k.startsWith("translations")).length} field update(s)${STAMP ? " + QA stamp" : ""}`);
  totalApplied += count;
  if (WRITE && !hadError && Object.keys(update).length > 0) await ref.update(update);
}

console.log(`\n${WRITE ? "適用完了" : "dry-run 完了"}: ${totalApplied} 件${hadError ? " ⚠️ エラーあり（該当docはスキップ/要確認）" : ""}`);
process.exit(hadError ? 1 : 0);
