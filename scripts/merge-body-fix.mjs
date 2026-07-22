/**
 * merge-body-fix.mjs — 差し替え版 body を translations.<lang>.body のみ更新
 * 鉄則②厳守: body 以外・status・他フィールドは触らない。
 *
 * 入力: scratchpad/<PREFIX>_<slug>.json（{lang:{body}}）と、比較用の <BASE>_<slug>.json
 * 実行:
 *   PREFIX=merged BASE=dup node scripts/merge-body-fix.mjs            # dry-run
 *   PREFIX=merged BASE=dup DO_WRITE=1 node scripts/merge-body-fix.mjs # 書き込み
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const SC = "/private/tmp/claude-501/-Users-kazuyoshi228-Desktop-magazine-yah-mobi-v0-3/ab3d3fb7-d407-4272-adfb-146d195c69c1/scratchpad";
const PROJECT_ID = process.env.SEED_PROJECT_ID ?? "magazine-yah-mobi";
const PREFIX = process.env.PREFIX ?? "merged";
const BASE = process.env.BASE ?? "dup";
const WRITE = process.env.DO_WRITE === "1";
const LANGS = ["ja", "zh-TW", "ko", "en", "th"];
const SLUGS = (process.env.SLUGS ?? "fukuoka-natsu-umi-family,fukuoka-kinenbi-kashikiri,fukuoka-renpaku-kitchen,fukuoka-4-6nin-hotel-hikaku").split(",");

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

let ok = 0, err = 0, wrote = 0;
console.log(`=== merge-body-fix (${WRITE ? "WRITE" : "dry-run"}) ${PREFIX}_* → translations.<lang>.body ===\n`);

for (const slug of SLUGS) {
  const nf = `${SC}/${PREFIX}_${slug}.json`, of = `${SC}/${BASE}_${slug}.json`;
  if (!existsSync(nf)) { console.log(`⏭ ${slug}: ${PREFIX} 無し`); continue; }
  const nw = JSON.parse(readFileSync(nf, "utf-8"));
  const cur = existsSync(of) ? JSON.parse(readFileSync(of, "utf-8")) : {};
  const update = {};
  let bad = false;
  for (const lang of LANGS) {
    const nb = nw[lang]?.body, ob = cur[lang]?.body || "";
    if (typeof nb !== "string" || nb.length < 300) { console.log(`  ❌ ${slug}[${lang}]: body 不正`); bad = true; continue; }
    const ratio = ob ? nb.length / ob.length : 1;
    if (ob && (ratio < 0.6 || ratio > 1.3)) { console.log(`  ⚠️ ${slug}[${lang}]: 長さ乖離 ${ob.length}→${nb.length}`); }
    update[`translations.${lang}.body`] = nb;
  }
  if (bad) { err++; continue; }

  const ref = db.doc(`articles/${slug}`);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`  ❌ ${slug}: Firestore に存在せず`); err++; continue; }
  const st = snap.data().status;
  console.log(`✅ ${slug}: 検証OK status=${st}(不変) 5言語のbody更新`);
  ok++;
  if (WRITE) {
    update["updatedAt"] = Date.now();
    await ref.update(update);
    const after = (await ref.get()).data();
    console.log(`   📝 書込完了（status=${after.status} ${after.status === st ? "維持✓" : "⚠️変化"} / ja健在=${after.translations?.ja?.title ? "✓" : "✗"}）`);
    wrote++;
  }
}
console.log(`\n--- OK ${ok} / err ${err} / 書込 ${wrote} ---`);
if (!WRITE) console.log("※ dry-run。DO_WRITE=1 で書き込み");
