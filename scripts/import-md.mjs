/**
 * content/**\/*.md → Firestore articles/{slug}（BaaS-first / v9 スキーマ）
 *
 * 依存なし（最小 front-matter パーサ内蔵）。既定は dry-run（書き込みなし・検証と写像を表示）。
 *
 * パス規約:  content/<section>/<lang>/<slug>.md
 *   section = esim | guides …（/esim/{lang}/{slug} 等の一等市民パス）
 *   lang    = 直上ディレクトリ名（ja/en/ko/zh-TW/th）
 *   slug    = ファイル名（front-matter の slug が優先）
 *
 * front-matter（YAML サブセット: scalar / [a,b] / ブロック配列 / # コメント）:
 *   記事レベル:  slug category schemaType status layer pageType hesitation handoff
 *              primaryQuery secondaryQueries confirmedDate sources distribution
 *              priceBindings canonical market thumbnailUrl
 *   翻訳レベル:  title excerpt directAnswer metaTitle metaDescription
 *              faq（ブロック配列で "質問||回答" 形式）
 *   本文:       front-matter 直後の Markdown が translations[lang].body
 *
 * 承認ゲート（v9 §8-2）: status:published の書き込みは --allow-publish を人間が明示した時のみ。
 *   スクリプト/AI に公開権限を持たせない。既定では draft のみ書き込み可。
 *
 * 実行:
 *   dry-run（全件）:        node scripts/import-md.mjs
 *   dry-run（単体）:        node scripts/import-md.mjs content/esim/ja/compare.md
 *   本番へ下書き書込（単体）: node scripts/import-md.mjs --write content/esim/ja/compare.md
 *   本番へ全件書込:          node scripts/import-md.mjs --write --all   ← --all の明示が必須（ガード①）
 *   本番へ公開込み（人間）:   ... --write --allow-publish
 *
 * 安全ガード:
 *   ① --write でファイル未指定なら --all 必須（誤コピペで全件上書きする事故の防止）
 *   ② CMS側の updatedAt が MDファイルの更新時刻より新しい記事はスキップ（鉄則②:
 *      編集者がCMSで直した記事を古いMDで潰さない）。意図的な上書きは --force。
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const PROJECT_ID = process.env.SEED_PROJECT_ID ?? "magazine-yah-mobi";
const CONTENT_ROOT = path.resolve(process.cwd(), "content");
const KNOWN_LANGS = ["ja", "en", "ko", "zh-TW", "th"];
const KNOWN_STATUS = ["draft", "published", "archived"];

const args = process.argv.slice(2);
const FLAGS = new Set(args.filter((a) => a.startsWith("--")));
const FILE_ARGS = args.filter((a) => !a.startsWith("--"));
const WRITE = FLAGS.has("--write");
const ALLOW_PUBLISH = FLAGS.has("--allow-publish");
const SKIP_VALIDATION = FLAGS.has("--skip-validation");
const ALL = FLAGS.has("--all");
const FORCE = FLAGS.has("--force");

// ガード①: --write の全件書き込みは --all を人間が明示した時のみ（誤コピペ・引数忘れ対策）
if (WRITE && FILE_ARGS.length === 0 && !ALL) {
  console.error("⛔ --write の全件書き込みには --all の明示が必要です（誤操作防止）。");
  console.error("   単体: node scripts/import-md.mjs --write content/esim/ja/xxx.md");
  console.error("   全件: node scripts/import-md.mjs --write --all");
  process.exit(1);
}
// エミュレータ専用のプレビュー公開（MD の status は draft のまま、書き込み時だけ published 扱い）。
// 本番では絶対に効かない（FIRESTORE_EMULATOR_HOST 必須）。
const AS_PUBLISHED = FLAGS.has("--as-published");
if (AS_PUBLISHED && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("❌ --as-published はエミュレータ専用です（FIRESTORE_EMULATOR_HOST を設定してください）");
  process.exit(1);
}

// ─── 最小 YAML(サブセット) front-matter パーサ ────────────────────────────────
function parseScalar(raw) {
  const s = raw.trim();
  if (s === "" || s === "~" || s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
function parseInlineArray(raw) {
  const inner = raw.trim().slice(1, -1).trim();
  if (!inner) return [];
  // カンマ分割（引用符内のカンマは非対応＝lean。必要なら js-yaml へ）
  return inner.split(",").map((x) => parseScalar(x));
}
function parseFrontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  const body = text.slice(m[0].length);
  const lines = m[1].split(/\r?\n/);
  const data = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trim().startsWith("#")) { i++; continue; }
    const kv = line.match(/^([A-Za-z0-9_]+):(.*)$/);
    if (!kv) { i++; continue; }
    const key = kv[1];
    const rest = kv[2].trim();
    if (rest === "") {
      // ブロック配列 or 空
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
        items.push(parseScalar(lines[j].replace(/^\s*-\s+/, "")));
        j++;
      }
      data[key] = items;
      i = j;
    } else if (rest.startsWith("[")) {
      data[key] = parseInlineArray(rest);
      i++;
    } else {
      data[key] = parseScalar(rest);
      i++;
    }
  }
  return { data, body };
}

// ─── content/ の走査 ──────────────────────────────────────────────────────────
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}
function derivePathParts(file) {
  const rel = path.relative(CONTENT_ROOT, file);
  const parts = rel.split(path.sep);
  const filename = parts[parts.length - 1].replace(/\.md$/, "");
  const lang = parts[parts.length - 2];
  const section = parts.slice(0, -2).join("/"); // esim, guides, …
  return { section, lang, filename };
}

// ─── ファイル → per-lang レコード ─────────────────────────────────────────────
function readRecord(file) {
  const { section, lang, filename } = derivePathParts(file);
  const mtimeMs = statSync(file).mtimeMs;
  const { data, body } = parseFrontMatter(readFileSync(file, "utf-8"));
  const slug = data.slug ?? filename;
  const faq = Array.isArray(data.faq)
    ? data.faq.map((s) => {
        const [q, a] = String(s).split("||");
        return { q: (q ?? "").trim(), a: (a ?? "").trim() };
      })
    : undefined;
  return {
    file, section, lang, slug, mtimeMs,
    article: {
      slug,
      categorySlug: data.category ?? "esim",
      schemaType: data.schemaType ?? "Article",
      status: data.status ?? "draft",
      thumbnailUrl: data.thumbnailUrl ?? null,
      layer: data.layer,
      pageType: data.pageType ?? "article",
      hesitation: data.hesitation ?? null,
      handoff: data.handoff ?? [],
      primaryQuery: data.primaryQuery,
      secondaryQueries: data.secondaryQueries ?? [],
      confirmedDate: data.confirmedDate ?? null,
      sources: data.sources ?? [],
      distribution: data.distribution ?? ["esim"],
      priceBindings: data.priceBindings ?? [],
      showCompetitorTable: data.showCompetitorTable ?? false,
      fieldReport: data.fieldReport ?? null,
      fieldReportMode: data.fieldReportMode ?? null,
      canonical: data.canonical ?? null,
      market: data.market ?? [],
    },
    translation: {
      title: data.title ?? "",
      excerpt: data.excerpt ?? "",
      body: body.trim(),
      directAnswer: data.directAnswer ?? "",
      metaTitle: data.metaTitle ?? "",
      metaDescription: data.metaDescription ?? "",
      ...(faq ? { faq } : {}),
    },
  };
}

// ─── slug でグループ化 → ArticleDoc ───────────────────────────────────────────
function assemble(records) {
  const bySlug = new Map();
  for (const r of records) {
    if (!KNOWN_LANGS.includes(r.lang)) {
      console.warn(`⚠️ 未知の言語ディレクトリ: ${r.lang}（${r.file}）— スキップ`);
      continue;
    }
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, { article: r.article, translations: {}, files: {}, mtimeMs: 0 });
    const g = bySlug.get(r.slug);
    if (g.translations[r.lang]) console.warn(`⚠️ 言語重複: ${r.slug} / ${r.lang}`);
    g.translations[r.lang] = r.translation;
    g.files[r.lang] = r.file;
    g.mtimeMs = Math.max(g.mtimeMs, r.mtimeMs); // ガード②用: 最新MDファイルの更新時刻
    // 記事レベルは ja を優先。ja 以外で先に読まれた場合の上書き最小化
    if (r.lang === "ja") g.article = r.article;
  }
  return bySlug;
}

// ─── 検証（品質ゲート lean・v9 §9-4） ─────────────────────────────────────────
function validate(slug, g) {
  const errs = [];
  const warns = [];
  const a = g.article;
  if (!a.slug) errs.push("slug 必須");
  if (!KNOWN_STATUS.includes(a.status)) errs.push(`status 不正: ${a.status}`);
  if (!a.layer) errs.push("layer 必須（M/0/1/1.5/3/season/権威）");
  if (!["esim", "gadget", "gourmet", "travel"].includes(a.categorySlug)) errs.push(`category 不正: ${a.categorySlug}`);
  for (const [lang, t] of Object.entries(g.translations)) {
    if (!t.title) errs.push(`[${lang}] title 必須`);
    if (!t.directAnswer) errs.push(`[${lang}] directAnswer 必須（GEO 冒頭直接回答）`);
    if (!t.metaTitle) errs.push(`[${lang}] metaTitle 必須`);
    if (!t.metaDescription) errs.push(`[${lang}] metaDescription 必須`);
  }
  // ソフト警告（迷わせない・出力コントラクト）
  if (["M", "0", "1", "1.5", "3"].includes(a.layer) && !a.confirmedDate) warns.push("confirmedDate 未設定（GEO 鮮度）");
  if (a.pageType !== "landing" && a.hesitation == null && a.layer !== "1.5" && a.layer !== "3") warns.push("hesitation 未設定（迷わせない）");
  if ((a.handoff ?? []).length === 0) warns.push("handoff 未設定（受け先/buy）");
  return { errs, warns };
}

function toArticleDoc(g, now, existing) {
  const a = g.article;
  const publishing = a.status === "published";
  return {
    slug: a.slug,
    categorySlug: a.categorySlug,
    schemaType: a.schemaType,
    status: a.status,
    thumbnailUrl: a.thumbnailUrl,
    publishedAt: publishing ? (existing?.publishedAt ?? now) : (existing?.publishedAt ?? null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    languages: Object.keys(g.translations),
    translations: g.translations,
    // v9 フィールド
    layer: a.layer,
    pageType: a.pageType,
    hesitation: a.hesitation,
    handoff: a.handoff,
    primaryQuery: a.primaryQuery ?? null,
    secondaryQueries: a.secondaryQueries,
    confirmedDate: a.confirmedDate,
    sources: a.sources,
    distribution: a.distribution,
    priceBindings: a.priceBindings,
    showCompetitorTable: a.showCompetitorTable,
    // CMS専用フィールド（MDに無い）は既存doc から退避する。
    // set(merge:false)＝全置換のため、退避しないと再import（例: 多言語化）で消える。
    // author は「CMSで著者を選んだ時のスナップショット」＝MDには無い → 必ず existing を継ぐ。
    author: a.author ?? existing?.author ?? null,
    fieldReport: a.fieldReport ?? existing?.fieldReport ?? null,
    fieldReportMode: a.fieldReportMode ?? existing?.fieldReportMode ?? null,
    canonical: a.canonical,
    market: a.market,
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────
const files = FILE_ARGS.length
  ? FILE_ARGS.map((f) => path.resolve(process.cwd(), f))
  : walk(CONTENT_ROOT);

if (files.length === 0) {
  console.error(`対象 .md がありません（${CONTENT_ROOT}）`);
  process.exit(1);
}

const groups = assemble(files.map(readRecord));

let hasError = false;
const toWrite = [];
for (const [slug, g] of groups) {
  const { errs, warns } = SKIP_VALIDATION ? { errs: [], warns: [] } : validate(slug, g);
  console.log(`\n── ${slug} [${g.article.layer ?? "?"} / ${g.article.pageType} / ${g.article.status}] langs=${Object.keys(g.translations).join(",")}`);
  warns.forEach((w) => console.log(`   ⚠️ ${w}`));
  if (errs.length) { hasError = true; errs.forEach((e) => console.log(`   ❌ ${e}`)); continue; }
  if (g.article.status === "published" && WRITE && !ALLOW_PUBLISH) {
    console.log("   ⛔ status:published の書き込みは --allow-publish（人間の承認）が必要 — この記事はスキップ");
    continue;
  }
  toWrite.push([slug, g]);
  if (!WRITE) console.log(`   ✅ 検証OK（dry-run: 書き込みなし）`);
}

if (!WRITE) {
  console.log(`\n[dry-run] 検証: ${groups.size} 件 / 書き込み可: ${toWrite.length} 件 / エラー: ${hasError ? "あり" : "なし"}`);
  console.log("書き込むには --write を付与（本番公開は --allow-publish も）。");
  process.exit(hasError ? 1 : 0);
}

// ── 書き込み ──
initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: PROJECT_ID } : { credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const now = Date.now();
let wrote = 0;
let skipped = 0;
for (const [slug, g] of toWrite) {
  const ref = db.collection("articles").doc(slug);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : null;

  // ガード②（鉄則②）: CMS側の更新がMDファイルより新しい記事は上書きしない（--force で明示上書き）。
  // 編集者がCMSで直した内容を、古いMDバックアップで潰す事故を防ぐ。
  if (existing && !FORCE && existing.updatedAt > g.mtimeMs) {
    const cmsDate = new Date(existing.updatedAt).toISOString().slice(0, 16).replace("T", " ");
    console.log(`   ⏭️ スキップ: articles/${slug} — CMS側が新しい（CMS更新 ${cmsDate} > MD更新）。上書きするには --force`);
    skipped++;
    continue;
  }

  const doc = toArticleDoc(g, now, existing);
  if (AS_PUBLISHED) { doc.status = "published"; doc.publishedAt = doc.publishedAt ?? now; }
  await ref.set(doc, { merge: false });
  console.log(`✅ 書込: articles/${slug} (${doc.status})`);
  wrote++;
}
console.log(`\n完了: ${wrote} 件書き込み${skipped ? ` / ${skipped} 件スキップ（CMS側が新しい）` : ""}。`);
process.exit(hasError ? 1 : 0);
