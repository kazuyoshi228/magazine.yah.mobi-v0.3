/**
 * remove-dangling-link.mjs（使い捨て）
 * 公開記事から未公開（draft）記事へのリンクを外す。読者には 404 になるため。
 * 対象: fukuoka-renpaku-kitchen（全5言語）→ /guides/yanagibashi-market/（draft）
 *
 * リンクは「市場の楽しみ方は〜ガイドへ」という丸括弧の補足の中にあり、
 * 補足ごと削除しても本文（柳橋連合市場が徒歩圏＝価値ある記述）はそのまま残る。
 *
 *   node scripts/remove-dangling-link.mjs            # dry-run
 *   DO_WRITE=1 node scripts/remove-dangling-link.mjs # 書き込み
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.env.DO_WRITE === "1";
const SLUG = "fukuoka-renpaku-kitchen";
const TARGET = "](/guides/yanagibashi-market/)";
const LANGS = ["ja", "zh-TW", "ko", "en", "th"];
const OPEN = ["（", "("];
const CLOSE = ["）", ")"];

/** TARGET を含む丸括弧の補足（開き括弧〜閉じ括弧）をまるごと取り除く */
function stripAside(body) {
  const li = body.indexOf(TARGET);
  if (li < 0) return null;
  // markdown リンクの開始 [ を後方検索
  const br = body.lastIndexOf("[", li);
  if (br < 0) return null;
  // その手前の開き括弧を後方検索
  let start = -1;
  for (let i = br; i >= 0 && br - i < 200; i--) {
    if (OPEN.includes(body[i])) { start = i; break; }
  }
  if (start < 0) return null;
  // TARGET の直後から閉じ括弧を前方検索
  let end = -1;
  for (let i = li + TARGET.length; i < body.length && i - li < 200; i++) {
    if (CLOSE.includes(body[i])) { end = i; break; }
  }
  if (end < 0) return null;
  // 半角括弧の直前の空白も一緒に落とす
  let s = start;
  if (body[start] === "(" && body[start - 1] === " ") s = start - 1;
  const removed = body.slice(s, end + 1);
  return { out: body.slice(0, s) + body.slice(end + 1), removed };
}

initializeApp({ credential: applicationDefault(), projectId: "magazine-yah-mobi" });
const db = getFirestore();
const ref = db.doc(`articles/${SLUG}`);
const snap = await ref.get();
if (!snap.exists) { console.log("❌ 記事が無い"); process.exit(1); }
const d = snap.data();

const update = {};
for (const lang of LANGS) {
  const body = d.translations?.[lang]?.body;
  if (!body) { console.log(`⏭ ${lang}: body 無し`); continue; }
  if (!body.includes(TARGET)) { console.log(`⏭ ${lang}: 対象リンク無し（既に処理済み？）`); continue; }
  const r = stripAside(body);
  if (!r) { console.log(`❌ ${lang}: 補足の範囲を特定できず — 手動で確認が必要`); process.exit(1); }
  if (r.out.includes(TARGET)) { console.log(`❌ ${lang}: リンクが残っている（複数箇所？）`); process.exit(1); }
  update[`translations.${lang}.body`] = r.out;
  console.log(`✅ ${lang.padEnd(5)} 削除: ${r.removed.slice(0, 70)}${r.removed.length > 70 ? "…" : ""}`);
  console.log(`         (${body.length} → ${r.out.length} 字)`);
}

console.log(`\nstatus=${d.status}（不変）/ 更新言語=${Object.keys(update).length}`);
if (!WRITE) { console.log("※ dry-run。DO_WRITE=1 で書き込み"); process.exit(0); }
update["updatedAt"] = Date.now();
await ref.update(update);
const a = (await ref.get()).data();
console.log(`\n📝 書込完了 status=${a.status} ${a.status === d.status ? "維持✓" : "⚠️変化"}`);
