/**
 * 管理者権限（custom claim: admin=true）を付与する。
 *
 * 前提: 対象ユーザーが一度 Google ログイン済みであること。
 * 認証: GOOGLE_APPLICATION_CREDENTIALS にサービスアカウントJSONのパスを設定するか、
 *       gcloud ADC（application-default login）を利用。
 *
 * 実行: node scripts/set-admin.mjs kazuyoshi.yamada@bonfire.co.jp
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email) {
  console.error("使い方: node scripts/set-admin.mjs <email>");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: "magazine-yah-mobi" });
const auth = getAuth();

const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { admin: true });
console.log(`✅ ${email} (uid=${user.uid}) に admin クレームを付与しました。`);
console.log("   反映にはユーザーの再ログイン（またはトークン更新）が必要です。");
