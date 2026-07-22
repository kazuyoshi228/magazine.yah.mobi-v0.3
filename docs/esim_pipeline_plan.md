# ヘッドレス配管 実施計画書 — magazine（胴体）× yah.mobile（表示面）

> 作成: 2026-07-15。対象: **headless magazine の content を yah.mobile 側で表示させる配管**と、**yah.mobile 公開面の静的化（SEO/GEO）**。
> 位置づけ: magazine.yah.mobi＝編集システム＋記事ストア＋SEO/GEO配信（胴体）。表示面（ヘッド）は yah.homes / yah.mobile。
> 既に yah.homes 向けに同型の配管が通っている（`/feeds/homes.json` → yah.homes(Astro)）。**その型を yah.mobile に拡張し、あわせて yah.mobile 公開面を静的化する。**

---

## 0. 何を配管し、何を直すのか

2つを同時に扱う:
1. **content 配管**: magazine の eSIM 記事を feed で吐き、yah.mobile 側で表示（canonical を yah.mobi に寄せる）。
2. **yah.mobile 公開面の静的化**: 現状 yah.mobi はサイト全体が **body/GEO ほぼゼロ**（後述の実測）。集客の器そのものを直す。

---

## 1. 実測所見（yah.mobi の現状SEO）※2026-07-15 実測

| 項目 | 実測 | 意味 |
|---|---|---|
| `#root` の可視テキスト | **空** | 本文はクライアント描画のみ。静的HTMLに本文が無い |
| hosting rewrite | `** → /index.html` | 完全なSPAフォールバック。ページ描画のSSR関数は無い（stripeWebhook/analyticsEvents/llmsTxtのみ） |
| 静的HTML内の価格/プラン | `¥`0・`GB`0・`IIJ`0 | 価格も本文もクローラーに渡っていない |
| head メタ | title/description/OG15/JSON-LD1 | メタは有り。リンクプレビュー・基本索引はOK |

**結論**:
- **body本文SEO**: Googleは後からJS描画するので"完全0"ではないが弱い。
- **GEO（GPTBot等のAIクローラー）**: **ほぼJS未実行 → 空bodyを見る → 実質ゼロ**。
- これは**トップ/プラン紹介ページも同じ**＝売り場そのものがAIに引用されない。
- magazine の seoserver が本物の静的HTML（directAnswer・プラン表・競合表・FAQを `#seo-content` に焼き込み・実測確認済み）を出しているのは、**この穴を胴体が代行している**からに他ならない。

---

## 2. アーキ決定 — 「面で割る」（Astro公開面 ＋ React アプリ）

yah.mobi 全体を書き換えない。**性格の違う2面に割る。**

```
yah.mobi
├── /（トップ）         ┐
├── /plans（プラン紹介）  ├─ Astro 静的（SEO/GEO）           ← 新設・yah.homesと同構成
├── /guides/esim/{lang}/{slug} ＋ PurchaseDrawer を React島で埋め込み
│      （＝magazineガイド）
├── /app（購入）        ┐
├── /my（アカウント）    ├─ React SPA そのまま（SEO不要・稼働維持） ← 無改修
└── /login             ┘
    ※ hosting rewrite: /app,/my,/login → SPA、それ以外 → Astro
```

| 面 | 中身 | SEO | 器 |
|---|---|---|---|
| **公開/集客面** | トップ・プラン紹介・ガイド（読ませる静的） | ◎必須（今ゼロ） | **Astro 静的** |
| **アプリ面** | 認証・realtime Firestore・Stripe・QR・注文・ドロワー | ✕不要（ログイン背後） | **React SPA（現状維持）** |

**なぜ全書き換えでないか（辛口）**:
- /app は**動いている売り場**（決済・履行・QR・メール完成）。framework全書換は**稼働収益パイプラインを、SEOが及ばない領域で壊すリスク**。
- Astro島で重いログインアプリを動かすのは"Astroの中でReact SPA"＝本末転倒。
- Manus（FOR_MANUS.md/manus.space）で構築・配信＝プラットフォーム制約を要確認。移行はroute単位・可逆で。

---

## 3. 既存の正解パターン（homes・これを真似る）

| 層 | 実装 | ファイル |
|---|---|---|
| 胴体（feed） | `/feeds/homes.json`＝homes配信記事＋全翻訳をJSON。CORS`*`・s-maxage=600 | magazine `functions/src/index.ts:417` |
| ヘッド（消費） | Astro SSG が **build時に feed fetch** → 静的生成。canonical=yah.homes | yah.homes-v2 `src/lib/guides.ts:46` |
| プレビュー | `GUIDES_LOCAL_DIR` で magazine の `content/guides` を直読み | guides.ts:116 |
| 胴体（重複回避） | `isHomesOnly()`＝homes記事は magazine の `/articles/` で404。canonicalはyah.homes | index.ts:65,603 |

設計思想: 一記事一canonical。胴体は「作る・貯める・配る」、ヘッドは「見せる」。二重描画を作らない。

---

## 4. content 配管 — `/feeds/esim.json`

homes feed は記事レベルの `priceBindings`/`showCompetitorTable` を持たない。eSIMではこれが要る。

- **記事レベル**: `slug` `categorySlug` `schemaType` `layer` `hesitation` `handoff` `primaryQuery` `secondaryQueries` `confirmedDate` `publishedAt` `updatedAt` `thumbnailUrl` `author` `languages` **`priceBindings`** **`showCompetitorTable`** `canonical`
- **翻訳（全言語）**: `title`（プレフィックス除去は表示側）`excerpt` `body` `directAnswer` `metaTitle` `metaDescription` `faq`
- **価格の数値は載せない**（鉄則③）。`priceBindings`（docID）だけ渡し、**yah.mobile が自前SSOTで焼き込む**（yah.mobileはplans/competitorPlansの持ち主なので遠隔取得不要＝magazineより素直）。

実装（magazine胴体）: `renderEsimFeed()`＋ルート `/feeds/esim.json`（`renderHomesFeed`/`/feeds/homes.json` の対称ミラー・小）。

---

## 5. 記事内「その場ドロワー」— PurchaseDrawer を共有React島に

**要望**: yah.mobileのガイドで購入ボタン → **遷移せず同ページでドロワーが即開く**。

**本体の実態**: `PurchaseDrawer` は制御コンポーネント（`open`/`initialPlanId`）で `AppPage.tsx:326` にマウント。deep-link（`?open&plan=`）実装済み。だが **firebase/firestore・useAuth・callable(checkout)・react-i18next・framer-motion・qrcode に密結合**＝現状はSPA専用。

**やること**:
1. **PurchaseDrawer を "SPA外でもマウントできる共有部品" に切り出す**（同一Firebaseプロジェクト yah-mobile-v1-3ed24 なので auth/plans/checkout callable はそのまま届く）。
2. Astro のガイドページに `client:load` の **React島**として埋め込み。
3. ガイドの「購入」ボタン＋プラン表の各行が `openDrawer(HERO_docID)` を呼ぶ → **同ページでドロワー起動**（プラン表はSSOT docIDを持つのでそのまま渡す）。

**注意（別軸）**: ドロワーが開くのは自由だが、**購入完了は招待制（allowed_emails）＋購入前ログイン**ゲートに当たる（付録）。「開く体験」と「買える開放」は別問題。

---

## 6. hosting rewrite の分岐（yah.mobi）

```
/api/**                         → 既存 Functions（stripeWebhook 等）
/app, /app/**, /my/**, /login   → React SPA（index.html）
/assets/**                      → 静的アセット
/**（上記以外＝トップ/plans/esim）→ Astro 静的出力
```
- 移行途中は「まだAstro化していないrouteはSPAへ」のフォールバックで**route単位に切替・いつでも戻せる**。
- canonical混乱を避けるため、同一URLを両器から出さない（rewriteで排他）。

---

## 7. 実装タスク（repo別）

### magazine（胴体）
1. `renderEsimFeed()` ＋ `/feeds/esim.json`（§4）。
2. `isMobileOnly()` 導入（yah.mobiがヘッドの記事は magazine `/articles/` で出さない）。**切替時に有効化**。
3. `content/esim` のプレビュー直読みパス対応（ヘッドの `GUIDES_LOCAL_DIR` 相当）。

### yah.mobile（表示面の新設＋切り出し）※本丸
4. **Astro 公開面を新設**（yah.homes構成を流用）。ルーティング／レイアウト／canonical／hreflang／JSON-LD。
5. `/feeds/esim.json` 消費（build時fetch・yah.homes `guides.ts` と同型）→ `/guides/esim/{lang}/{slug}` を静的生成。
6. **プラン表/競合表を自前SSOT（plans/competitorPlans）で焼き込み**（magazineの描画をAstro/JSに移植・価格数値はSSOTから）。
7. **PurchaseDrawer を共有部品化 → Astro React島**（§5）。
8. **hosting rewrite を §6 に更新**。
9. トップ/プラン紹介ページを Astro 静的化（売り場のGEO確保・段階的）。

---

## 8. canonical・重複・移行

- **一記事一canonical。** eSIM記事を magazine と yah.mobi の両方でindexさせない。
- eSIM記事は既に magazine で公開・被リンクあり → 移行は **301リダイレクト**（magazine `/articles/<esim>` → `yah.mobi/guides/esim/...`）でSEO資産を移す（homesは404だがeSIMは301）。
- feed の `canonical` はヘッドの正規URLを指す。

---

## 9. 段階リリース（ビッグバンにしない・route単位・可逆）

| Phase | 内容 | ゲート |
|---|---|---|
| **P0 feed** | magazine `/feeds/esim.json` 新設。既存 `/articles/` 描画は維持（無害・並行） | feedが全eSIM記事＋価格系フィールドを正しく吐く |
| **P1 Astro骨＋ガイド1本** | yah.mobiにAstro公開面の骨（レイアウト/canonical）＋ **esim-chatgpt 1本**を `/guides/esim/ja/esim-chatgpt` に静的描画（プラン表/競合表/JSON-LD含む） | SSRでdirectAnswer・価格・FAQがクローラー/AIに見える |
| **P2 ドロワー島** | PurchaseDrawer 共有部品化 → ガイドに島埋め込み。**同ページ購入**を通す | ボタン→同ページdrawer→（招待客で）決済まで |
| **P3 canonical切替** | 検証OKの記事から canonical を yah.mobi に。magazine側301＋isMobileOnly | SearchConsoleで yah.mobi版index・magazine版301認識 |
| **P4 公開面拡張** | トップ/プラン紹介をAstro静的化。57本を順次移行。llms.txt/sitemapをヘッド基準に | 換金クエリ順位がドメイン移行で落ちていない |

**原則**: P0（feed）は今すぐ無害に敷ける。P1（Astro骨＋1本）が本丸。/app は全Phaseで無改修。

---

## 10. 判断が要る点（着手前）

1. **yah.mobi 公開面のAstro新設にGO**か（本計画の前提）。Manus/配信の制約確認を含む。
2. **URL規約**: **`/guides/{section}/{lang}/{slug}` で確定**（例 `/guides/esim/ja/esim-chatgpt`・content保管構造と1:1）。
3. **移行タイミング/単位**: eSIM記事は公開済み。301必須。どの単位で切替えるか。
4. **プラン表描画の移植**: magazine の `buildCompareTableHtml`/`buildCompetitorTableHtml` 相当を Astro/JS 側に移す（価格はSSOT直読み）。

---

## 11. 守ること（鉄則）

- **価格・在庫・注文は yah.mobile SSOT が正。** magazine は読み取りのみ・書き換えない（鉄則③）。ヘッドがyah.mobileだと価格描画は自前SSOTで完結し健全。
- **Claude は公開しない。** feed・Astro実装とも draft/検証を経て人間が反映。
- **canonicalを二重化しない。** 移行は必ず301。
- feed/URLに個人情報を載せない（`ref`は記事slugのみ）。

---

## 付録: 購買属性配管（別軸・後段）

content配管とは別に、**送客→購買の属性（`?ref=`を注文に刻む・記事別CVR）** が残る。ヘッドがyah.mobileに統合され、ガイドと/appが同一ドメイン・同一Firebaseになると**この属性配管は大幅に簡単**（cookie/クロスドメイン不要）。要点:
- yah.mobile本体は現状 **招待制（allowed_emails）＋購入前ログイン必須**＝一般客はまだ買えない（購買開放は経営判断）。
- initCheckout callable は `utm_source` を受ける口が既にあり、`?ref=` を注文に保存する改修は小さい。
- 属性の単一の真実 = **注文の `ref`**（cookieに依存しない）。詳細は content配管 P3 到達後に別途設計。
