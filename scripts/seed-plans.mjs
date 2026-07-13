/**
 * seed-plans.mjs — content/plans.json → Firestore `plans` コレクション
 *
 * `plans` は価格の単一ソース（CLAUDE.md 鉄則③）。CompareGrid / {{price}} 焼き込みが参照する。
 * docId = plan.key（例: "yah_7d_3gb"）。
 *
 * 既定は dry-run（検証のみ・書き込みなし）。実際に書くには --write（人間が実行）。
 *   node scripts/seed-plans.mjs                 # dry-run（差分表示）
 *   node scripts/seed-plans.mjs --write         # 本番へ upsert（要 ADC / GOOGLE_APPLICATION_CREDENTIALS）
 *   node scripts/seed-plans.mjs --emu --write   # エミュレータへ（要 firebase emulators:start）
 *
 * ※価格は runtime データ。Claude/スクリプトは値を推測しない。plans.json の実勢価格は人間が確認して記入する。
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.resolve(here, "../content/plans.json");
const PROJECT_ID = process.env.SEED_PROJECT_ID ?? "magazine-yah-mobi";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const EMU = args.includes("--emu");

if (EMU && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
}

const REQUIRED = ["key", "provider", "providerType", "days", "data", "priceJpy", "source"];
const PROVIDER_TYPES = new Set(["esim", "wifi", "sim", "roaming"]);
const SOURCES = new Set(["live", "manual", "placeholder"]);

function validate(p, i) {
  for (const f of REQUIRED) {
    if (p[f] === undefined || p[f] === null || p[f] === "") throw new Error(`plans[${i}] (${p.key ?? "?"}): 必須フィールド "${f}" が空です。`);
  }
  if (!/^[a-z0-9_]+$/.test(p.key)) throw new Error(`plans[${i}]: key "${p.key}" は英小文字・数字・_ のみ。`);
  if (!PROVIDER_TYPES.has(p.providerType)) throw new Error(`plans[${i}] (${p.key}): providerType "${p.providerType}" が不正。`);
  if (!SOURCES.has(p.source)) throw new Error(`plans[${i}] (${p.key}): source "${p.source}" が不正。`);
  if (typeof p.priceJpy !== "number" || p.priceJpy <= 0) throw new Error(`plans[${i}] (${p.key}): priceJpy が数値でない。`);
  if (typeof p.days !== "number" || p.days <= 0) throw new Error(`plans[${i}] (${p.key}): days が数値でない。`);
}

const raw = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
const confirmedDate = raw.confirmedDate ?? null;
const plans = raw.plans ?? [];

const seen = new Set();
plans.forEach((p, i) => {
  validate(p, i);
  if (seen.has(p.key)) throw new Error(`plans[${i}]: key "${p.key}" が重複。`);
  seen.add(p.key);
});

const placeholders = plans.filter((p) => p.source === "placeholder");

console.log(`\n${plans.length} 件のプランを検証しました（key 重複なし）。`);
for (const p of plans) {
  const flag = p.source === "placeholder" ? " ⚠️サンプル" : "";
  console.log(`  · ${p.key.padEnd(20)} ${p.provider} ${p.days}日 ${p.data} ¥${p.priceJpy.toLocaleString("ja-JP")}${flag}`);
}
if (placeholders.length) {
  console.log(`\n⚠️  ${placeholders.length} 件が source="placeholder"（要差し替えサンプル）です。本番公開前に実勢価格へ更新してください。`);
}

if (!WRITE) {
  console.log(`\n（dry-run。書き込むには --write を付けてください。）\n`);
  process.exit(0);
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

const now = Date.now();
const batch = db.batch();
for (const p of plans) {
  const doc = {
    key: p.key,
    provider: p.provider,
    providerType: p.providerType,
    days: p.days,
    data: p.data,
    priceJpy: p.priceJpy,
    source: p.source,
    sourceUrl: p.sourceUrl ?? null,
    confirmedDate: p.confirmedDate ?? confirmedDate,
    note: p.note ?? null,
    updatedAt: now,
  };
  batch.set(db.collection("plans").doc(p.key), doc, { merge: true });
}
await batch.commit();
console.log(`\n✅ plans コレクションへ ${plans.length} 件 upsert しました。\n`);
process.exit(0);
