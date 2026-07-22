# 実装設計図 ②：yah.mobi（表示面）側 — eSIM配管

> 対象リポ: **yah-mobile-v4_latest**（yah.mobiのアプリ）。相方: [magazine側 →](esim_pipeline_magazine.md)。全体戦略: [esim_pipeline_plan.md](esim_pipeline_plan.md)。
> yah.mobi の役割 = **見せる（レンダリング）＋売る**。記事は magazine の feed から取り、**yah.mobi ドメインで静的（Astro）描画**し、価格は自前SSOT（plans/competitorPlans）で焼く。
> 前提: yah.mobi は現状 **body/GEO ほぼゼロ**（SPAで#root空）。公開面を静的化してこれを直す。

---

## 0. yah.mobi がやること（面で割る）

```
yah.mobi
├── /・/plans・/guides/**   → 【新設】Astro 静的（SEO/GEO）＋ドロワーReact島
└── /app・/my・/login       → 【現状維持】React SPA（無改修）
    hosting rewrite: /app系→SPA、それ以外→Astro
```

1. **Astro 公開面を新設**（yah.homes-v2 構成を流用）。
2. **magazine `/feeds/esim.json` を消費** → `/guides/esim/{lang}/{slug}` を静的生成。
3. **プラン表/競合表を自前SSOT（plans/competitorPlans）で焼き込み**。
4. **PurchaseDrawer を共有React島に切り出し** → ガイドで「同ページ即ドロワー」。
5. **hosting rewrite を分岐**。/app は一切触らない。

---

## 1. URL規約（確定）

- **`https://yah.mobi/guides/{section}/{lang}/{slug}`**（例: `/guides/esim/ja/esim-chatgpt`）。
- 構造: `/guides/`（コンテンツの傘・yah.homesと統一・将来拡張可）＋ `{section}=esim`（キーワード）＋ `{lang}`（ja も明示）＋ `{slug}`。
- **magazine の保管構造 `content/{section}/{lang}/{slug}.md` と1:1対応**（変換が自明）。
- **デフォルト言語 ja も `/ja/` を明示**（全言語対称・hreflang/canonicalが素直）。
- ※ magazine の feed が吐く `canonical` はこの絶対URL。両者一致が不変条件。

---

## 2. Astro 公開面の新設（yah.homes-v2 を型に）

**参考実装**: `yah.homes-v2/src/lib/guides.ts`（feed消費）・`src/layouts/BaseLayout.astro`（canonical/hreflang/JSON-LD焼き込み）・`src/pages/[...locale]/`（locale routing）。

### 2-1. feed消費（`src/lib/esimGuides.ts`）
```ts
const FEED_URL = "https://magazine.yah.mobi/feeds/esim.json";
// 本番: build時に fetch（yah.homes guides.ts:65 と同型・?ts= でキャッシュ回避）
// プレビュー: GUIDES_PREVIEW 時は ../magazine.yah.mobi_v0.3/content/esim の MD を直読み
```
- build時fetch → 全記事を静的生成（Astro SSG）。キャッシュ変数で1ビルド1取得。

### 2-2. ルート（`src/pages/guides/[section]/[lang]/[slug].astro`）
- `getStaticPaths()` で feed × languages を展開（section は当面 `esim` 固定・将来拡張）。
- 描画順（magazineのSSRと同一契約）: **directAnswer → 本文 → 実地レポート → プラン表 → 競合表 → FAQ**。
  - **実地レポート（一次データ）**: feedの `fieldReport`（Markdown・画像`![](…)`含む）が非nullなら、本文直後に緑枠で描く（`fieldReportMode`で「実測/想定」ラベル）。E-E-A-T/GEOの核。
- `title` の `Wx-yy｜` プレフィックスを**表示側で除去**（magazineテンプレと同じ正規表現 `^W\d+-\d+\s*[｜|]\s*`）。

### 2-3. head 焼き込み（BaseLayout流用）
- `canonical = https://yah.mobi/guides/esim/{lang}/{slug}`
- `hreflang`（languages分）・OG・**Article + FAQPage JSON-LD**（magazine `buildHeadTags` 相当を移植）。

---

## 3. プラン表・競合表（自前SSOTで焼く）

yah.mobi は plans/competitorPlans の**持ち主**。magazineのように遠隔RESTで取らず、**直読み**で焼ける（速い・確実）。

- **入力**: 記事の `priceBindings`（feed由来のdocID配列）・`showCompetitorTable`（bool）。
- **プラン表**: `priceBindings` の docID で plans を引き、`buildCompareTableHtml` 相当を Astro/JS に移植（**最安バッジ無し**・キャプションは**記事の公開日**「◯年◯月◯日時点の価格」）。
- **競合表**: `showCompetitorTable` が真なら competitorPlans/main を引いて表を描く（yah.mobile列を強調）。
- **移植元**（magazine・参照のみ）: `functions/src/index.ts` の `buildCompareTableHtml` / `buildCompetitorTableHtml` / `computePriceMeta`。ロジックはそのまま、データ源をSSOT直読みに。

### 受入基準
- `/guides/esim/ja/esim-chatgpt` の**静的HTML**（JS実行前）に、¥2,600等の価格・競合各社・FAQが**テキストで入っている**（＝GEOでAIが読める）。

---

## 4. 「その場ドロワー」— PurchaseDrawer を共有React島に

**現状**: `PurchaseDrawer` は `AppPage.tsx:326` に SPA専用マウント。firebase/useAuth/callable(checkout)/i18n/framer-motion/qrcode に密結合。deep-link（`?open&plan=`）実装済み。

### 4-1. 共有部品化
- `PurchaseDrawer` と依存（Firebase init・auth・plans・checkout callable・i18n）を、**SPA外からもマウントできる形**に切り出す（同一Firebaseプロジェクト yah-mobile-v1-3ed24 なので全部届く）。
- グローバルな `openDrawer(planId, opts?)` を公開（今は AppPage ローカルstate）。

### 4-2. Astro島として埋め込み
- ガイドページに `<PurchaseDrawerIsland client:load />`（React island）を1つ置く。
- ガイドの「購入」ボタン＋**プラン表の各行**が `openDrawer(<docID>)` を呼ぶ → **遷移せず同ページでドロワー起動**。docIDはプラン表が既に保持。

### 4-3. 段階
- v1: 島化前は購入ボタンを `/app?open=true&plan=<docID>` にdeep-link（1遷移・SEOは先に出す）。
- v2: 島化して「同ページ即時」に格上げ。

**注意**: ドロワーは開くが、**購入完了は招待制＋ログインゲート**（別軸・付録）。開く体験と買える開放は別。

---

## 5. hosting rewrite（`firebase.json`）

```
/api/**                          → 既存 Functions（stripeWebhook 等）※現状維持
/app, /app/**, /my/**, /login    → React SPA（index.html）※現状維持
/assets/**, *.js/css/img         → 静的アセット
/**（上記以外＝ / /plans /guides）  → Astro 静的出力
```
- 途中移行は「未Astro化のrouteはSPAへ」フォールバックで **route単位・可逆**。
- 同一URLを両器から出さない（canonical混乱防止）。

---

## 6. yah.mobi側タスク一覧・受入

| # | タスク | 参考/場所 | 受入基準 | Phase |
|---|---|---|---|---|
| Y1 | Astro公開面の骨（layout/canonical/hreflang/JSON-LD） | yah.homes-v2流用 | 空ページがcanonical付きで静的出力 | P1 |
| Y2 | `esimGuides.ts`（feed消費・プレビュー直読み） | guides.ts同型 | build時にfeed取得・全記事展開 | P1 |
| Y3 | `/esim/[lang]/[slug].astro`（directAnswer/本文/FAQ/JSON-LD/プレフィックス除去） | buildHeadTags移植 | **esim-chatgpt 1本**が静的描画 | P1 |
| Y4 | プラン表/競合表をSSOT直読みで焼き込み | buildCompareTableHtml移植 | 静的HTMLに¥2,600/競合/FAQがテキストで入る | P1 |
| Y5 | PurchaseDrawer 共有部品化＋`openDrawer()` | AppPage.tsx:326 | SPA外からドロワーが開く | P2 |
| Y6 | ガイドにドロワー島＋ボタン/行から `openDrawer(docID)` | — | 同ページで即ドロワー | P2 |
| Y7 | hosting rewrite 分岐（§5） | firebase.json | /app系はSPA・他はAstro | P1〜 |
| Y8 | トップ/プラン紹介をAstro静的化 | Y1流用 | 売り場のGEO確保 | P4 |

- **P1の山場は Y3/Y4**（1記事が"GEOで読める静的HTML"になること）。ここを esim-chatgpt で検証してから横展開。
- **/app（Y5対象の元コード以外）は全Phase無改修**。

---

## 7. 守ること
- 価格・在庫・注文は**自前SSOTが正**（plans/competitorPlans/orders）。feedからは docID/フラグのみ受け取る。
- canonical = yah.mobi単一（magazine側が301で寄せる）。二重index禁止。
- 公開面の静的化で、**JS実行前のHTMLに本文/価格/FAQが入っている**ことを常に確認（GEOの生命線）。
- Manus/配信の制約を着手前に確認（framework追加の可否）。
