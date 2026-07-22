# 【作業指示書】yah.mobi ヘッド側 — eSIMガイドの feed消費 & 静的描画

> 対象: **yah.mobi（yah-mobile-v4・Astro公開面）**。Astroの骨組みは構築済み前提。
> ゴール: magazine の `/feeds/esim.json` を消費し、**`yah.mobi/guides/esim/{lang}/{slug}` を静的（SSG）描画**する。GEO（AIに本文・価格・FAQが静的HTMLで見える）が生命線。
> 相方（胴体・実装済み）: [magazine側 →](esim_pipeline_magazine.md) ／ 全体: [esim_pipeline_plan.md](esim_pipeline_plan.md)。
> 参考の正解実装: **yah.homes-v2 `src/lib/guides.ts`（feed消費）・`BaseLayout.astro`（canonical/hreflang/JSON-LD）**。同じ型を踏襲する。

---

## 0. やること（5つ）

1. **feed消費**: build時に `https://magazine.yah.mobi/feeds/esim.json` を取得（プレビューはローカルMD直読み）。
2. **ルート**: `src/pages/guides/[section]/[lang]/[slug].astro`（section=esim）で全記事×全言語を `getStaticPaths` 展開。
3. **描画**: 契約順で静的HTML化（§3）。**価格・競合表は自前SSOT（Firestore: plans / competitorPlans）から焼く**（feedには数値が無い）。
4. **head**: canonical / hreflang / JSON-LD（Article + FAQPage）/ OG。
5. **hosting rewrite**: `/guides/**` → Astro、`/app,/my,/login` → 既存SPA（無改修）。

**絶対に触らない**: `/app`・`/my`・`/login`（稼働中の購入SPA）。ビルドは既存の `vite build`（SPA）と Astro（公開面）が共存する構成にする。

---

## 1. URL規約（確定）

- **`https://yah.mobi/guides/{section}/{lang}/{slug}`**（例: `/guides/esim/ja/esim-chatgpt`）
- `{section}` は当面 `esim` 固定。`{lang}` は **ja も明示**（全言語対称）。
- **magazine保管 `content/{section}/{lang}/{slug}.md` と1:1**。
- canonical はこの絶対URL。

---

## 2. feed消費（`src/lib/esimGuides.ts`）

yah.homes `guides.ts` と同型:

```ts
const FEED_URL = "https://magazine.yah.mobi/feeds/esim.json";
// 本番: build時に fetch（?ts= でキャッシュ回避）
// プレビュー: 環境変数で ../magazine.yah.mobi_v0.3/content/esim の *.md を直読み（公開前の下書き確認）
```
- 1ビルド1取得のキャッシュ（yah.homes と同じ）。
- feedは**記事の配列**。各要素の形は §5。

---

## 3. 描画順（magazine SSRと同一契約・厳守）

**directAnswer → 本文 → 実地レポート → プラン表 → 競合表 → FAQ → CTA**

各パーツの規則（magazineの出力に一致させる）:

| パーツ | ソース | 規則 |
|---|---|---|
| **タイトル(h1)** | `translations[lang].title` | **プレフィックス除去**: `^W\d+-\d+\s*[｜\|]\s*` を削る（例「W1-03｜○○」→「○○」） |
| **directAnswer** | `translations[lang].directAnswer` | `<section>` 冒頭に。GEO引用の核 |
| **本文** | `translations[lang].body`（Markdown） | Markdown→HTML。画像 `![](…)` も描く |
| **実地レポート** | `fieldReport`（Markdown）／`fieldReportMode` | 非nullなら本文直後に**緑枠**。見出し「実地レポート（実測 / 編集部の想定・実測前）」。画像含む。**E-E-A-T/GEOの核** |
| **プラン表** | `priceBindings`（docID配列）＋**自前SSOT plans** | docIDで plans を引き表に。**最安バッジは付けない**。キャプション＝「{記事の公開日}時点の価格」 |
| **競合表** | `showCompetitorTable`（bool）＋**自前SSOT competitorPlans/main** | true なら「How we compare.」表。**yah.mobile行を強調** |
| **FAQ** | `translations[lang].faq`（配列 {q,a}） | `<section>`＋**FAQPage JSON-LD** |
| **CTA / 購入** | — | §6（その場ドロワー or deep-link） |

> **価格の数値は feed に無い。** `priceBindings`(docID) と `showCompetitorTable`(flag) だけ来る。**数値は必ず自前SSOT（yah-mobile-v1-3ed24 の Firestore plans / competitorPlans）から取得**して焼く（鉄則③・yah.mobiが価格の持ち主）。

### 移植元（magazineのロジック＝出力の正本）
以下の関数の出力に合わせる（`functions/src/index.ts`）:
- `buildCompareTableHtml`（プラン表・最安バッジ無し版）
- `buildCompetitorTableHtml`（競合表・yah.mobile強調）
- `computePriceMeta`（確認日時のJST整形）
- `renderMarkdown`（本文・実地レポート）

---

## 4. head（BaseLayout流用）

- `canonical = https://yah.mobi/guides/esim/{lang}/{slug}`
- `hreflang`（`languages` の各言語）
- **JSON-LD**: `Article`（headline=プレフィックス除去後）＋ `FAQPage`（faqがあれば）
- OG（title/description/url）。description は `translations[lang].metaDescription`
- `<title>` は `metaTitle`（プレフィックス無し）

---

## 5. feed の形（＝契約・この形が来る）

```jsonc
// GET https://magazine.yah.mobi/feeds/esim.json → 配列
[
  {
    "slug": "esim-chatgpt",
    "categorySlug": "esim",
    "schemaType": "Article",
    "layer": "M",
    "hesitation": "anxiety",
    "handoff": ["device-checker", "/buy?ref=esim-chatgpt"],
    "primaryQuery": "…",
    "secondaryQueries": ["…"],
    "confirmedDate": "2026-07-15",
    "publishedAt": 1752…,
    "updatedAt": 1752…,
    "thumbnailUrl": null,
    "author": { "id":"…","name":"…","title":"…","photoUrl":null },
    "languages": ["ja"],
    "priceBindings": ["PAK783GRS","PYTKZG843"],   // ← SSOT docID。数値でない
    "showCompetitorTable": true,                   // ← 競合表を出すか
    "fieldReport": "## 実地レポート\n2026-07-20 …（Markdown・画像![](…)含む）",  // ← 空ならnull
    "fieldReportMode": "field",                    // "field"=実測 / "assumed"=想定 / null
    "canonical": "/guides/esim/ja/esim-chatgpt",   // 参考。正はヘッドが絶対URLで確定
    "translations": {
      "ja": { "title":"W1-03｜…", "excerpt":"…", "body":"## …(Markdown)", "directAnswer":"…", "metaTitle":"…", "metaDescription":"…", "faq":[{"q":"…","a":"…"}] }
    }
  }
]
```

**不変条件**: 価格の数値は載っていない。`title` のプレフィックスは**ヘッドが除去**。canonicalはヘッドが絶対URLで確定。

---

## 6. 購入導線（その場ドロワー）

- **v1（先に出す）**: 購入ボタン＋プラン表の各行を **`/app?open=true&plan={docID}` へdeep-link**（1遷移でドロワーが開く）。SEOを先に立てる。
- **v2（後で格上げ）**: `PurchaseDrawer` を **Astro React島**（`client:load`）として埋め込み、`openDrawer(docID)` で**遷移なし・同ページ**でドロワー起動。同一Firebaseプロジェクトなので auth/plans/checkout callable はそのまま届く。
- 注意: ドロワーは開くが**購入完了は招待制＋ログイン**ゲート（別軸）。「開く」と「買える」は別。

---

## 7. hosting rewrite（`firebase.json`）

```
/api/**                          → 既存 Functions（stripeWebhook 等）※現状維持
/app, /app/**, /my/**, /login    → 既存 SPA（index.html）※現状維持
/assets/**, *.js/css/img         → 静的アセット
/guides/**（および / /plans）     → Astro 静的出力
```
- 移行途中は「未Astro化のrouteはSPAへ」フォールバックで route単位・可逆。
- 同一URLを両器から出さない（canonical混乱防止）。

---

## 8. 受入基準（これを満たせば完了）

1. `curl https://yah.mobi/guides/esim/ja/esim-chatgpt`（**JS実行前の静的HTML**）に、テキストで:
   - directAnswer / 本文 / **実地レポート（あれば）** / **¥2,600等の価格** / 競合各社 / FAQ が入っている（＝GEOでAIが読める）
2. h1 に `W1-03｜` プレフィックスが**出ていない**
3. `<link rel="canonical" href="https://yah.mobi/guides/esim/ja/esim-chatgpt">` がある
4. Article + FAQPage の JSON-LD がある
5. `/app` は無改修で従来通り動く
6. **まず esim-chatgpt 1本**で1〜5を検証 → OKなら横展開

---

## 9. 守ること（鉄則）

- **価格・在庫・注文は yah.mobile SSOT が正**（plans / competitorPlans / orders）。feedからは docID とフラグのみ受け取り、**数値は自前SSOTから焼く**。
- **canonical = yah.mobi単一**。magazine側が301で寄せる（重複index禁止）。
- **JS実行前のHTMLに本文・価格・FAQ・実地レポートが入っていること**を常に確認（GEOの生命線）。
- feed/URLに個人情報を載せない。
