import { readFileSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const SC="/private/tmp/claude-501/-Users-kazuyoshi228-Desktop-magazine-yah-mobi-v0-3/ab3d3fb7-d407-4272-adfb-146d195c69c1/scratchpad";
const WRITE=process.env.DO_WRITE==="1";
initializeApp({credential:applicationDefault(),projectId:"magazine-yah-mobi"});
const db=getFirestore();
for (const slug of ["fukuoka-joshikai-party","fukuoka-chushajo-tsuki"]) {
  const th=JSON.parse(readFileSync(`${SC}/thfix_${slug}.json`,"utf-8")).th;
  const ref=db.doc(`articles/${slug}`);
  const snap=await ref.get(); if(!snap.exists){console.log("❌",slug,"無し");continue;}
  const st=snap.data().status;
  const upd={}; for(const [k,v] of Object.entries(th)) upd[`translations.th.${k}`]=v;
  console.log(`${slug}: status=${st}(不変) th更新フィールド=${Object.keys(th).join(",")}`);
  if(WRITE){ upd["updatedAt"]=Date.now(); await ref.update(upd);
    const a=(await ref.get()).data();
    console.log(`  📝 書込完了 status=${a.status}${a.status===st?"維持✓":"⚠️"} / th健在=${a.translations?.th?.title?"✓":"✗"} / ja無変更=${a.translations?.ja?.title?"✓":"✗"}`);
  }
}
if(!WRITE) console.log("\n※dry-run。DO_WRITE=1 で書き込み（translations.th のみ）");
