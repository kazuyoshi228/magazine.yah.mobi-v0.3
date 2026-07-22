# 実装設計図 ①：magazine（胴体）側 — eSIM配管

> 対象リポ: **magazine.yah.mobi_v0.3**（このリポ）。相方: [yah.mobi側 →](esim_pipeline_yahmobi.md)。全体戦略: [esim_pipeline_plan.md](esim_pipeline_plan.md)。
> magazine の役割 = **作る・貯める・配る**（編集・Firestoreストア・feed配信）。**見せる（レンダリング）は yah.mobi 側**。
> 原則: 二重描画しない／価格数値をfeedに載せない（鉄則③）／Claudeは公開しない。

---

## 0. magazine がやること（3つだけ）

1. **`/feeds/esim.json` を吐く**（eSIM記事＋全翻訳＋価格束縛キーをJSON）。← 本丸・小
2. **移行済み記事を magazine 自ドメインで出さない**（canonical一本化・301）。← 切替時
3. **プレビュー**: yah.mobi(Astro)が下書きを直読みできるようにする（公開前確認）。

境界（yah.mobiとの契約）= **`/feeds/esim.json` の形**（§2）。ここさえ合っていれば両者は独立して実装できる。

---

## 1. `/feeds/esim.json` 実装（`renderHomesFeed` の対称）

**ファイル**: `functions/src/index.ts`
**参考**: 既存 `renderHomesFeed()`（index.ts:417）と `/feeds/homes.json` ルート（index.ts:645）。

### 1-1. `renderEsimFeed()` を追加
- 対象記事: `getPublishedArticles()` のうち `distribution` に `"esim"` を含むもの（`isHomesOnly` は除外）。
- homes feed との差分: **記事レベルに `priceBindings` と `showCompetitorTable` を必ず含める**（yah.mobiが価格表/競合表を描くのに必要）。
- `canonical`: **yah.mobi の絶対URL**を吐く（表示面の正規URL。§3参照）。

### 1-2. ルート追加
`/feeds/homes.json` の隣に `/feeds/esim.json`（同ヘッダ: `application/json`・`Cache-Control: public, max-age=300, s-maxage=600`・`Access-Control-Allow-Origin: *`）。

### 1-3. 受入基準
- `curl https://magazine.yah.mobi/feeds/esim.json` が全eSIM公開記事を返す。
- 各要素に `priceBindings`・`showCompetitorTable`・全言語 `translations`（`directAnswer`/`body`/`faq` 含む）・`canonical`(yah.mobi絶対URL) がある。
- 価格の**数値は含まれない**（`priceBindings` の docID のみ）。

---

## 2. feed の形（＝yah.mobiとの契約・確定版）

```jsonc
// GET https://magazine.yah.mobi/feeds/esim.json  → 配列
[
  {
    // ── 記事レベル ──
    "slug": "esim-chatgpt",
    "categorySlug": "esim",
    "schemaType": "Article",
    "layer": "M",
    "hesitation": "anxiety",
    "handoff": ["device-checker", "/buy?ref=esim-chatgpt"],
    "primaryQuery": "日本 eSIM ChatGPT 使える",
    "secondaryQueries": ["..."],
    "confirmedDate": "2026-07-15",
    "publishedAt": 1752... ,
    "updatedAt": 1752... ,
    "thumbnailUrl": null,
    "author": { "id": "...", "name": "...", "title": "...", "photoUrl": null },
    "languages": ["ja"],
    "priceBindings": ["PAK783GRS", "PYTKZG843"],   // ★SSOT docID（数値でない）
    "showCompetitorTable": true,                    // ★競合表を出すか
    "fieldReport": "## 実地レポート\n2026-07-20 …（Markdown・一次データ・画像![](…)含む）",  // ★空ならnull
    "fieldReportMode": "field",                     // "field"=実測 / "assumed"=想定 / null=準備中
    "canonical": "https://yah.mobi/guides/esim/ja/esim-chatgpt",  // ★表示面の正規URL /guides/{section}/{lang}/{slug}

    // ── 翻訳（全言語） ──
    "translations": {
      "ja": {
        "title": "W1-03｜ChatGPTが使える…",        // プレフィックス除去は表示側
        "excerpt": "…",
        "body": "## 見出し\n…（Markdown）",
        "directAnswer": "…（GEO冒頭・確認日入り）",
        "metaTitle": "…",
        "metaDescription": "…",
        "faq": [{ "q": "…", "a": "…" }]
      }
    }
  }
]
```

> **不変条件**: 価格は `priceBindings`(docID) のみ。実額は yah.mobi が本体SSOT(plans)から焼く。`title` の `Wx-yy｜` は**除去しない**（表示側で除去）。`canonical` は必ず yah.mobi 絶対URL。

---

## 3. canonical と移行（301）

- eSIM記事は既に magazine `/articles/<slug>` で公開・被リンク有り → **404でなく301**で資産を移す。
- **移行フラグ**: 記事に「canonicalは yah.mobi」を示すマーカーを持たせる（案: `distribution` に `"mobile"` を追加、または新フィールド `canonicalHost`）。
  - マーカー無し = 従来どおり magazine が `/articles/<slug>` を描画（P0〜P2は無害維持）。
  - マーカー有り = magazine は `/articles/<slug>` を **301 → `canonical`(yah.mobi)** にリダイレクトし、sitemap/llms.txtからも外す。
- `isMobileOnly(a)` を新設（`isHomesOnly` と同型）: マーカー有りのeSIM記事は magazine 表示面から外す。

### 実装ポイント（`functions/src/index.ts`）
- `renderArticlePage()` の先頭: `isMobileOnly(a)` なら `301` + `Location: a.canonical`。
- `renderSitemap()` / `renderLlmsTxt()`: `isMobileOnly` を除外に追加。

---

## 4. プレビュー（公開前の下書き確認）

yah.mobi(Astro)の消費側は、本番=feed / プレビュー=ローカルMD直読み、を切替える（yah.homesの `GUIDES_LOCAL_DIR` と同型・詳細はyah.mobi設計図）。
- **magazine側の対応**: 特になし。`content/esim/**/*.md` がそのまま下書きソース。yah.mobiのビルドが `../magazine.yah.mobi_v0.3/content/esim` を読む前提でパスを揃えるだけ。

---

## 5. magazine側タスク一覧・受入

| # | タスク | ファイル | 受入基準 | Phase |
|---|---|---|---|---|
| M1 | `renderEsimFeed()` | index.ts | §1-3 を満たす | P0 |
| M2 | `/feeds/esim.json` ルート | index.ts | 200・JSON・CORS | P0 |
| M3 | feed `canonical` を yah.mobi絶対URLで生成 | index.ts | §2 の contract 通り | P0 |
| M4 | `isMobileOnly()` ＋ 301＋sitemap/llms除外 | index.ts | マーカー記事が301・非マーカーは従来通り | P3 |
| M5 | （必要なら）移行マーカー field を型/CMSに追加 | shared/types.ts, CMS | CMSで切替可 | P3 |

- **P0（M1〜M3）は今すぐ・無害**（既存 `/articles/` 描画は一切変えない）。
- **M4/M5 は canonical切替（P3）時のみ有効化**。

---

## 6. 守ること
- 価格数値をfeedに載せない（`priceBindings` docIDのみ）。
- Claudeは feed実装も draft/検証のみ。デプロイは `pnpm run deploy:prod`（hosting+seoserver同時）。
- canonicalは必ず yah.mobi 単一。移行は301。
