/**
 * add-joshikai-related.mjs（使い捨て）
 * yah.homes 側テンプレの自動「関連ガイド」を廃止したため、
 * 唯一 本文に関連ガイド節を持たない fukuoka-joshikai-party に、
 * 他記事と同じ表記・リンク形式でキュレーション済みの節を追加する。
 *
 *   node scripts/add-joshikai-related.mjs            # dry-run
 *   DO_WRITE=1 node scripts/add-joshikai-related.mjs # 書き込み
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.env.DO_WRITE === "1";
const SLUG = "fukuoka-joshikai-party";
// 言語別: 見出し表記 と リンクのプレフィックス（他記事の既存慣習に一致させる）
const CONV = {
  ja: { head: "関連ガイド", pfx: "/ja" },
  "zh-TW": { head: "相關指南", pfx: "/zh" },
  ko: { head: "관련 가이드", pfx: "/ko" },
  en: { head: "Related guides", pfx: "" },
  th: { head: "คู่มือที่เกี่ยวข้อง", pfx: "/th" },
};
// 本文の相互リンクと一致させたキュレーション（ヴィラ→人数→記念日→ピラー）
const RELATED = ["fukuoka-villa", "fukuoka-4-6nin-hotel-hikaku", "fukuoka-kinenbi-kashikiri", "fukuoka-whole-house"];

const feed = await (await fetch("https://magazine.yah.mobi/feeds/homes.json?ts=" + Date.now())).json();
const titleOf = (slug, lang) => feed.find((x) => x.slug === slug)?.translations?.[lang]?.title;

initializeApp({ credential: applicationDefault(), projectId: "magazine-yah-mobi" });
const db = getFirestore();
const ref = db.doc(`articles/${SLUG}`);
const snap = await ref.get();
if (!snap.exists) { console.log("❌ 記事が存在しない"); process.exit(1); }
const d = snap.data();

const update = {};
for (const [lang, c] of Object.entries(CONV)) {
  const body = d.translations?.[lang]?.body;
  if (!body) { console.log(`❌ ${lang}: body 無し`); process.exit(1); }
  if (new RegExp(`^##\\s+${c.head}\\s*$`, "m").test(body)) { console.log(`⏭ ${lang}: 既に関連ガイド節あり — スキップ`); continue; }
  const items = RELATED.map((s) => {
    const t = titleOf(s, lang);
    if (!t) throw new Error(`${s} の ${lang} タイトルが無い`);
    return `- [${t}](${c.pfx}/guides/${s}/)`;
  }).join("\n");
  const section = `\n\n## ${c.head}\n\n${items}\n`;
  const nb = body.replace(/\s*$/, "") + section;
  update[`translations.${lang}.body`] = nb;
  console.log(`✅ ${lang.padEnd(5)}: 「${c.head}」節を追加 (${body.length}→${nb.length}字) / リンク4本 ${c.pfx}/guides/…`);
}

console.log(`\nstatus=${d.status}（不変）/ 更新言語=${Object.keys(update).length}`);
if (!WRITE) { console.log("※ dry-run。DO_WRITE=1 で書き込み"); process.exit(0); }
update["updatedAt"] = Date.now();
await ref.update(update);
const a = (await ref.get()).data();
console.log(`\n📝 書込完了 status=${a.status} ${a.status === d.status ? "維持✓" : "⚠️変化"}`);
