# CLAUDE.md — magazine.yah.mobi v0.3

このリポジトリは **magazine.yah.mobi**（Firebaseプロジェクト `magazine-yah-mobi`）＝ヘッドレス構成の**"胴体"**（編集システム＋記事ストア＋SEO/GEO配信）。訪日旅行者向け eSIM（yah.mobile）× 宿泊（yah.homes）の統合コンテンツ事業を支える。

## 戦略の軸（必読）

- 事業戦略: [docs/blueprint_content_marketing_v9.md](docs/blueprint_content_marketing_v9.md)
- **軸＝「迷わせない」** ＝ 訪日客が通信で迷う3つの離脱理由を消す:
  - **最安**（フック・§5）／**最短購買**（マシン・§6）／**便利な実測道具**（堀・§7）— 全部**コーパス（確認の資産化）**の上。
- 判断は**保守基準**（成熟ラグ6ヶ月・CVR1%）。数値前提はスプレッドシート。

## コンテンツ・パイプライン（真実の源 = Firestore）

**非技術の外部編集者が独立して編集できるよう、真実の源は Firestore（CMS）。** MD は Claude の下書き投入経路＋git バックアップ。

```
編集者 → /admin/cms（ログイン→ビジュアルフォーム→ draft/published）   ← 独立して回す（Claude/git 不要）
Claude → content/<section>/<lang>/<slug>.md（下書き）
   │  pnpm check（型）→ pnpm md（dry-run 検証）→ pnpm md:write（draft として投入）
   ▼
Firestore articles/{slug}   ← 真実の源
   │  人間が CMS で裏どり・仕上げ・公開（status: published）
   ▼
functions seoserver → /articles/:slug（SSR+JSON-LD+FAQPage+hreflang+#seo-content）・/llms.txt・/sitemap.xml
```

- **編集面**: 編集者＝`/admin/cms`（v9フィールド layer/hesitation/handoff/faq 等に対応済み）。Claude＝`content/**.md` の下書きのみ。
- **パス規約**: `content/esim/ja/compare.md` → section=esim / lang=ja / slug=compare（front-matter の `slug` 優先）。一等市民パスは `/esim/{lang}/{slug}`・`/guides/{lang}/{slug}`（v9 §8-1・**ドメインは未決**）。
- **スキーマ**: front-matter・CMSフォーム・`shared/types.ts` の `ArticleDoc`/`ArticleTranslation` を揃える（型を正本に）。
- **出力コントラクト**（SEO/GEOはHTML出力で決まる。Firestoreスキーマは入力）: [docs/draft_compare_ja.md](docs/draft_compare_ja.md) 参照。動的価格は**必ずSSRで焼き込む**（クライアントfetch禁止＝GEOの数値が不可視）。
- **git バックアップ**: Firestore → `content/*.md` を定期エクスポート（版管理・未実装）。

## 鉄則（絶対・v9 §8-2）

0. **仕様書 → 承認 → 実装 → （承認後）デプロイ の手順を必ず踏む。** 実装・本番デプロイはユーザーの明示的な指示があるまで行わない。細部の確認回答を着工・デプロイの承認と解釈しない（2026-07-21 発注者指示・yah.homes-v2/CLAUDE.md と共通ルール）。
0-2. **デプロイ承認後の作業完了時は `git push` まで行う。** 未プッシュのコミットを溜めない（2026-07-21 発注者指示）。


1. **Claude は公開しない。** `status: published` への昇格は人間（編集者が CMS で／`import-md.mjs --allow-publish`）。AI/スクリプトに公開権限を持たせない。
2. **Claude は本番 Firestore に直接書かない。** 投入は `import-md.mjs` 経由の **draft** のみ。**編集者が CMS で持った記事を Claude が上書き import しない**（新規 slug or 明示依頼のみ）。
3. **価格・在庫など runtime は Firestore/CMS のみ。** MDに持たない。価格は単一ソース（記事・比較・llms.txt・決済でズレない・§8-3③）。

## 記事の型（品質ゲート lean・v9 §9-4）

- 各記事は **「消す離脱理由」を1つ**持ち、**道具/比較表/`/buy?ref=` へ手渡す**（`hesitation` + `handoff`）。
- **冒頭に directAnswer**（定義文＋数値＋確認日＝GEO引用条件）。
- **クエリは拾う、想像で作らない**（サジェスト/Naver知恵袋/コンシェルジュログ/道具の「該当なしバケツ」・§9-3）。着手前に検索ボリューム実査。
- front-matter 必須: `slug` `category` `schemaType` `status` `layer` ＋ 各言語 `title`/`directAnswer`/`metaTitle`/`metaDescription`。

## コマンド

```bash
pnpm check                       # 型チェック（tsc --noEmit）
pnpm md content/esim/ja/compare.md   # dry-run（書き込みなし・検証）
pnpm md:emu                      # エミュレータへ書込（要 firebase emulators:start）
pnpm md:write                    # 本番へ書込（要 GOOGLE_APPLICATION_CREDENTIALS）
#   本番公開まで:  node scripts/import-md.mjs --write --allow-publish  （人間のみ）
# ※スクリプト名が "md" なのは、"import" が pnpm の組み込みコマンドと衝突するため。
```

## 地図

- `docs/` … 戦略（v6〜v9）・企画（content_plan_batch1）・compareドラフト＋出力コントラクト
- `content/` … 記事の真実の源（MD）
- `scripts/` … `import-md.mjs`（MD→Firestore）・`seed-firestore.mjs`・`set-admin.mjs`
- `shared/types.ts` … ドメイン型（front-matterの正本）
- `functions/src/index.ts` … `seoserver`（SSR/GEO出力）
- `client/src/` … CMS編集UI（React SPA）

## 未決事項（判断待ち・着手前に確認）

- **配信ドメイン**: seoserver `BASE_URL="https://magazine.yah.mobi"` vs v9 §8-1「本体 yah.mobi へ統合」。コードがv8の統合判断に未追従。
- **compareの動的表**: 価格表は `body` ではなくコンポーネント（`<CompareGrid>`）＋`priceBindings` をSSRで焼く（seoserver側の追加が必要）。
- **TH（タイ語）**: `Lang` は現状4言語。追加時は `Record<Lang,…>` 箇所（`client/src/pages/CmsArticleEdit.tsx`）・`LANGS`・seoserver hreflang をまとめて対応。
- **カテゴリ**: `CATEGORIES` に gourmet/travel が残存（v8/v9で層に再定義）。当面は `layer` を戦略軸に。
