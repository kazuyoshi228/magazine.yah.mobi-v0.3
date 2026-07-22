/**
 * merge-fields.mjs — scratchpad の <PREFIX>_<slug>.json にある「そのファイルに入っている言語・フィールドだけ」を
 * translations.<lang>.<field> に dot-path で更新する（汎用）。
 * 鉄則②厳守: ファイルに無い言語・フィールド・status は一切触らない。
 *
 *   SLUGS=fukuoka-chushajo-tsuki PREFIX=merged node scripts/merge-fields.mjs            # dry-run
 *   SLUGS=... PREFIX=merged DO_WRITE=1 node scripts/merge-fields.mjs                    # 書き込み
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const SC = "/private/tmp/claude-501/-Users-kazuyoshi228-Desktop-magazine-yah-mobi-v0-3/ab3d3fb7-d407-4272-adfb-146d195c69c1/scratchpad";
const PREFIX = process.env.PREFIX ?? "merged";
const WRITE = process.env.DO_WRITE === "1";
const SLUGS = (process.env.SLUGS ?? "").split(",").filter(Boolean);
const OK_LANGS = ["ja", "zh-TW", "ko", "en", "th"];
const OK_FIELDS = ["title", "excerpt", "directAnswer", "metaTitle", "metaDescription", "faq", "body"];

if (!SLUGS.length) { console.log("SLUGS=<slug[,slug]> を指定してください"); process.exit(1); }
initializeApp({ credential: applicationDefault(), projectId: "magazine-yah-mobi" });
const db = getFirestore();

let ok = 0, err = 0, wrote = 0;
console.log(`=== merge-fields (${WRITE ? "WRITE" : "dry-run"}) ${PREFIX}_* ===\n`);

for (const slug of SLUGS) {
  const f = `${SC}/${PREFIX}_${slug}.json`;
  if (!existsSync(f)) { console.log(`⏭ ${slug}: ${PREFIX} 無し`); continue; }
  const data = JSON.parse(readFileSync(f, "utf-8"));
  const ref = db.doc(`articles/${slug}`);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`❌ ${slug}: Firestore に存在せず`); err++; continue; }
  const cur = snap.data();

  const update = {};
  for (const [lang, obj] of Object.entries(data)) {
    if (lang === "slug") continue;
    if (!OK_LANGS.includes(lang)) { console.log(`❌ ${slug}: 未知の言語 ${lang}`); err++; continue; }
    for (const [field, val] of Object.entries(obj)) {
      if (!OK_FIELDS.includes(field)) { console.log(`❌ ${slug}[${lang}]: 未知のフィールド ${field}`); err++; continue; }
      update[`translations.${lang}.${field}`] = val;
    }
    console.log(`  ${slug}[${lang}] 更新フィールド: ${Object.keys(obj).join(", ")}`);
  }
  if (!Object.keys(update).length) continue;
  const untouched = OK_LANGS.filter((l) => !(l in data));
  console.log(`✅ ${slug}: status=${cur.status}(不変) / 触らない言語: ${untouched.join(",") || "なし"}`);
  ok++;
  if (WRITE) {
    update["updatedAt"] = Date.now();
    await ref.update(update);
    const a = (await ref.get()).data();
    console.log(`   📝 書込完了（status=${a.status} ${a.status === cur.status ? "維持✓" : "⚠️変化"}）`);
    wrote++;
  }
}
console.log(`\n--- OK ${ok} / err ${err} / 書込 ${wrote} ---`);
if (!WRITE) console.log("※ dry-run。DO_WRITE=1 で書き込み");
