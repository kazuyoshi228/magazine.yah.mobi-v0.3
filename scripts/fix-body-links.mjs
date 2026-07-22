/**
 * fix-body-links.mjs — 記事本文の内部リンクを正しい規約に正規化する
 *
 * 背景（2026-07-17 発見）:
 *   yah.homes 側テンプレ（guides/[slug].astro）は本文の全 href に localizedPath() で
 *   言語プレフィックスを**無条件に付与**する。
 *     localizedPath("ja", "/guides/x/")     → /ja/guides/x/    ✅
 *     localizedPath("ja", "/ja/guides/x/")  → /ja/ja/guides/x/ ❌ 404
 *   本文に言語プレフィックス付きで書いていたため、内部リンク 340本中 248本が 404 だった。
 *
 * 正しい規約: **本文はプレフィックス無し `/guides/{slug}/`（末尾スラッシュ必須）**。
 *   言語別の変換はテンプレに任せる（/booking/kiyokawa と同じ扱い）。
 *
 *   node scripts/fix-body-links.mjs            # dry-run
 *   DO_WRITE=1 node scripts/fix-body-links.mjs # 書き込み
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.env.DO_WRITE === "1";
const LANGS = ["ja", "zh-TW", "ko", "en", "th"];

initializeApp({ credential: applicationDefault(), projectId: "magazine-yah-mobi" });
const db = getFirestore();

/** 言語プレフィックスを剥がし、末尾スラッシュを付ける */
function normalize(body) {
  let n = 0;
  // ](/ja|/ko|/zh|/th|/en + /guides/slug...) → ](/guides/slug/)
  let out = body.replace(/\]\(\/(?:ja|ko|zh|th|en)(\/guides\/[a-z0-9-]+)\/?\)/g, (_m, p) => { n++; return `](${p}/)`; });
  // ](/guides/slug) 末尾スラッシュ無し → ](/guides/slug/)
  out = out.replace(/\]\((\/guides\/[a-z0-9-]+)\)/g, (_m, p) => { n++; return `](${p}/)`; });
  return { out, n };
}

const snap = await db.collection("articles").get();
let touched = 0, fixedLinks = 0;
console.log(`=== fix-body-links (${WRITE ? "WRITE" : "dry-run"}) ===\n`);

for (const d of snap.docs) {
  const data = d.data();
  const update = {};
  let per = 0;
  for (const lang of LANGS) {
    const body = data.translations?.[lang]?.body;
    if (typeof body !== "string") continue;
    const { out, n } = normalize(body);
    if (n > 0 && out !== body) { update[`translations.${lang}.body`] = out; per += n; }
  }
  if (per === 0) continue;
  touched++; fixedLinks += per;
  console.log(`${WRITE ? "📝" : "  "} ${d.id.padEnd(30)} リンク ${per} 本を修正 (status=${data.status} 不変)`);
  if (WRITE) {
    update["updatedAt"] = Date.now();
    await d.ref.update(update);
  }
}

console.log(`\n--- 記事 ${touched} 件 / リンク ${fixedLinks} 本 ---`);
if (!WRITE) console.log("※ dry-run。DO_WRITE=1 で書き込み（body のみ更新・status は触らない）");
