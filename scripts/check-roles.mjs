/**
 * check-roles.mjs — 権限の現状を確認する（読み取りのみ・変更しない）
 * ロール分離導入後に「誰も締め出していないか」を検証するために使う。
 *   node scripts/check-roles.mjs
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

initializeApp({ credential: applicationDefault(), projectId: "magazine-yah-mobi" });
const db = getFirestore();
const auth = getAuth();

console.log("=== admin_whitelist の登録状況 ===");
const snap = await db.collection("admin_whitelist").get();
if (snap.empty) console.log("  （空）");
for (const d of snap.docs) {
  const x = d.data();
  // rules と同じ判定: role 未設定 = admin 扱い（後方互換）
  const effective = x.role === "editor" ? "editor" : "admin";
  console.log(`  ${d.id.padEnd(38)} role=${(x.role ?? "(未設定)").padEnd(10)} → 実効: ${effective}`);
}

console.log("\n=== カスタムクレーム admin（whitelist が壊れても効く安全網）===");
let found = 0;
let pageToken;
do {
  const res = await auth.listUsers(1000, pageToken);
  for (const u of res.users) {
    if (u.customClaims?.admin === true) { console.log(`  ✅ ${u.email} (claim admin=true)`); found++; }
  }
  pageToken = res.pageToken;
} while (pageToken);
if (!found) console.log("  ⚠️ クレーム admin を持つユーザーが居ません（whitelist のみに依存＝安全網なし）");

console.log("\n判定:");
console.log("  ・実効 admin が1人以上いれば、公開できる人が居る＝OK");
console.log("  ・外注は role=editor で追加する（記事は編集できるが status を変更できない）");
