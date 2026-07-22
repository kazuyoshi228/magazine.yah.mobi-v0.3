import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const WRITE = process.env.DO_WRITE === "1";
const NEW_TITLE = "Tenjin vs Hakata: Where to Stay in Fukuoka? A Local's Answer [2026]";
const NEW_DESC = "Both are good — but locals stay in the riverside area between them. An honest Tenjin vs Hakata comparison: access, food, prices, plus the third option most guides miss.";
initializeApp({ credential: applicationDefault(), projectId: "magazine-yah-mobi" });
const db = getFirestore();
const ref = db.doc("articles/fukuoka-where-to-stay");
const snap = await ref.get();
const d = snap.data();
console.log("現行 metaTitle:", d.translations.en.metaTitle);
console.log("現行 metaDesc :", (d.translations.en.metaDescription||"").slice(0,120));
console.log("\n新 metaTitle:", NEW_TITLE, `(${NEW_TITLE.length}字)`);
console.log("新 metaDesc :", NEW_DESC, `(${NEW_DESC.length}字)`);
console.log(`\nstatus=${d.status}(不変) / en のみ更新・他言語/本文/h1 不可侵`);
if (!WRITE) { console.log("※dry-run"); process.exit(0); }
await ref.update({
  "translations.en.metaTitle": NEW_TITLE,
  "translations.en.metaDescription": NEW_DESC,
  updatedAt: Date.now(),
});
const a = (await ref.get()).data();
console.log(`\n📝 書込完了 status=${a.status}${a.status===d.status?"維持✓":"⚠️"} / zh metaTitle不変=${a.translations["zh-TW"].metaTitle===d.translations["zh-TW"].metaTitle?"✓":"✗"}`);
