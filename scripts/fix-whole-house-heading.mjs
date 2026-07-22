/**
 * fix-whole-house-heading.mjs（使い捨て）
 * fukuoka-whole-house の ja 本文の物件セクション見出しが、
 * yah.homes 側テンプレの末尾CTA見出し「福岡・都心の一棟貸しなら」と完全に一致し、
 * 1ページに同じ見出しが2回出ていたため、記事固有の文言に変更する。
 * 他言語はテンプレ("Stay with yah.homes")と重複していないため無変更。
 *
 *   node scripts/fix-whole-house-heading.mjs            # dry-run
 *   DO_WRITE=1 node scripts/fix-whole-house-heading.mjs # 書き込み
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.env.DO_WRITE === "1";
const OLD = "## → 福岡・都心の一棟貸しなら（yah.homes の2棟）";
const NEW = "## → 福岡市中央区の一棟貸し2棟（yah.homes）";

initializeApp({ credential: applicationDefault(), projectId: "magazine-yah-mobi" });
const db = getFirestore();
const ref = db.doc("articles/fukuoka-whole-house");
const snap = await ref.get();
if (!snap.exists) { console.log("❌ 記事が存在しない"); process.exit(1); }
const d = snap.data();
const b = d.translations?.ja?.body ?? "";
if (!b.includes(OLD)) { console.log("❌ 旧見出しが見つからない — 中止（既に修正済み？）"); process.exit(1); }
const nb = b.replace(OLD, NEW);

console.log(`status=${d.status}（不変）/ ja.body ${b.length}→${nb.length}字`);
console.log(`  旧: ${OLD}`);
console.log(`  新: ${NEW}`);
console.log(`  他言語: 無変更（テンプレCTAと重複していないため）`);

if (!WRITE) { console.log("\n※ dry-run。DO_WRITE=1 で書き込み"); process.exit(0); }
await ref.update({ "translations.ja.body": nb, updatedAt: Date.now() });
const a = (await ref.get()).data();
console.log(`\n📝 書込完了 status=${a.status} ${a.status === d.status ? "維持✓" : "⚠️変化"} / 旧見出し残存=${a.translations.ja.body.includes(OLD) ? "❌あり" : "✅なし"}`);
