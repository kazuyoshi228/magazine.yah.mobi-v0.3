# 作業指示書: yah.mobile 側 — まとめ買い実装 + LP改善（CVR5%目標）

**日付**: 2026-07-17 ／ **発注元**: magazine側セッション（戦略・設計確定済み）
**参照**: [esim_bulk_plan_design.md](esim_bulk_plan_design.md)（設計の正本・経済計算つき）
**この文書だけで作業可能なように書いてある。不明点は設計正本を参照。**

## 背景（1分で）

- 台湾Google広告が稼働中（CPC実勢¥99〜150・繁中・検索のみ）。LP診断で CVR を殺す問題を特定済み
- 実測経済性: **単価¥2,600×単品のみでは広告が構造的赤字**。生存条件は「**平均単価¥4,000以上 × 平均枚数1.5以上**」
- そのための2本柱: **① 売り場を20GB中心に組み替え（Phase A・軽作業）② まとめ買い機能（Phase B・本丸）**

---

# 🔴 A-0【緊急・最優先】GA計測が7/20から全停止 — Cookie同意バナー消失

**症状（実測 2026-07-21朝）**: GA4への受信が7/20からゼロ（7/19までは正常・広告は7/20に21クリック配信済みなのに記録なし）。
**原因（ブラウザ実査で特定済み）**:
- dataLayerの consent default が **analytics_storage: "denied"**（同意までGA送信しない設定）
- なのに **Cookie同意バナーがDOMに存在しない**（7/19には「拒絕/全部接受」が表示されていた。localStorageに同意フラグも無し）
- → 誰も同意できない → **全訪問者の計測がゼロ**
**修正（どちらか・即日）**:
1. 同意バナーを復活（7/19時点の挙動に戻す）
2. または consent default の analytics_storage を **granted** に変更（主要市場TW/JP/KRはGDPR圏外。anonymize_ip は維持。バナーはオプトアウト用として残す）
**注意**: purchase(サーバー送信)も client_id はブラウザ側gtag生成に依存 → gtag停止中の購入は紐付け欠損リスク。**7/20〜修正までの期間はデータ欠測として扱う**（CVR判定の分母から除外）。
**受け入れ基準**: 同意なし初回訪問（シークレットウィンドウ）で /g/collect リクエストが飛ぶこと・GA4リアルタイムに表示されること。

---

# Phase A: LP即効修正（先にやる・軽い・CVR直撃）

## A-1. プラン表示の組み替え【最重要】
現状: 6プラン表示（1/3/5/10/20/50GB）・「熱門」バッジが10GBに付いている。
変更:
- **売り場は 10GB(¥2,600) / 20GB(¥4,000) / 50GB(¥7,200) の3枚のみ**
- **「熱門」バッジを 20GB に移す**（デフォルト選択も20GB）
- 1GB/3GB/5GB は売り場から撤去 → **トップアップ（既存加值導線）でのみ販売**（プラン自体はSSOTに残す。表示制御のみ）
- 各カードに **¥/GB を併記**: 10GB=¥260/GB → 20GB=¥200/GB → 50GB=¥144/GB（「大きいほど得」の階段を見せる）

## A-2. 広告着地の最短化
- プランセクションに **アンカーID `#plans`** を付与（広告最終URLを `/zh-TW/app#plans` にするため。広告側の変更は発注元がやる）
- ヒーローCTA「立即購買eSIM」直下の小プラン表記を **20GB · 30天 · ¥4,000 · 含稅** に変更（現在10GB表記）

## A-3. モバイル描画の修正【実測バグ】
- スクロール時に**プランセクションが真っ白のまま表示される**現象を確認済み（フェードイン演出が発火しない）。canvasネオンアニメも重く、自動ブラウザでスクロールが30秒タイムアウトするレベル
- 対処: **プランカードは演出なしで即表示**。ヒーローのcanvasアニメはモバイルで簡素化 or 停止。Lighthouse mobile で LCP < 2.5s を目安に

## A-4. 言語の統一
- 対応機種セクションが英語のまま（「STEP 1 — SELECT YOUR DEVICE BRAND」「BEFORE YOU CHECK」等）→ **繁中化**（他言語ページも同様にローカライズキーへ）

## A-5. 下部占有の削減
- Cookieバナーを1行化（初回のみ・再訪では非表示）。チャットバブルと合わせ画面下25%が塞がっている

## A-6. チャット修復
- コンソールに `[ChatWidgetFirebase] permission-denied` が連発。Firestoreセキュリティルールを確認し、チャットのフローノード読取を修復（「24/7支援」の看板が実際は壊れている状態）

## A-7. 決済摩擦の緩和（表現のみ・軽く）
- 使用步驟02「註冊並付款」に **「Google登入3秒・免填表格」** 等、摩擦の小ささを明示

## A-8. ゲスト購入 — ログイン壁の撤去【保留: 修理後データで判定・2026-07-19更新】

> **状態更新**: begin_checkout→purchase 全滅の真因は **OAuthクライアント削除（401: deleted_client）** と判明し、**修理済み**。よってA-8は「確定実行」から「**修理後の実測で判定**」に変更。
> **判定基準（修理後の累計データで）**: begin_checkout → purchase 通過率が
> - **50%以上** → ログイン壁は実害小。A-8は見送り（Apple Pay有効化のみ検討）
> - **30%未満** → A-8を実行（下記設計のまま）
> - 30〜50% → Apple Pay/Google Pay有効化を先行し再測定

**根拠（実測）**: 7/18 セッション10 → begin_checkout 4（40%・非常に高い）→ **purchase 0**。Stripe側は**未完了決済すらゼロ**＝4人全員がStripe到達前に離脱。Firebase Authは**全員匿名のまま・Googleログイン越えは開設以来ゼロ**。→ **CVRの唯一のボトルネック＝Googleログイン壁**と確定。

**改修**（匿名認証が既に動いているため下地あり）:
```
現在:  訪問(匿名UID) → 購入ボタン → Google登入必須 → 全滅
改修:  訪問(匿名UID) → 購入ボタン → Stripe Checkout 直行
        ・メールは決済画面で取得（Stripe Checkoutの標準機能）
        ・注文は匿名UIDに紐付け（既存の注文モデルそのまま）
        ・QR/固有リンクは取得メールに送信（B-3の配布設計と整合）
        → 購入完了画面で「保存QR碼・查用量 → Google登入(任意)」
          （Firebase匿名→Googleのアカウントリンクで昇格。linkWithCredential）
```
- あわせて **Apple Pay / Google Pay** を Stripe Checkout で有効化（モバイル88%）
- 受け入れ基準: **ログインなしで購入完了→メールでQR受領**まで通ること。purchase イベントの client_id/party_size/bulk_qty 付与は従来通り

**優先度: A-1（熱門→20GB）と並ぶ最上位。** ファネル実測上、これを直すまで広告予算の全開は無意味。

## A-9. GEO対応 — AIに引用される構造（geo_benchmark.md 2026-07-19の実査に基づく）

**背景**: AI検索（ChatGPT/Perplexity/AI Overview）は「日本eSIM最安」の回答を**比較サイトとブログから**組む（実査でプロバイダ公式は引用されず）。自サイトが引用源に入るには**機械可読・検証可能な構造**が必須。

1. **比較表のSSR/静的HTML化**
   - 現在の価格比較表（vs Airalo/Ubigi/Any Fone）が**JSレンダリング依存ならサーバー側で焼き込む**（クローラ・LLMがJS無しで読める状態に）
   - 表に必ず含める: 各社の**具体価格・GB/日数・取得日**・「毎朝9時(JST)照合・最終更新: YYYY-MM-DD」
2. **Schema.org 構造化データ**
   - 各プランに `Product` + `Offer`（price・priceCurrency: JPY・availability・**priceValidUntil**）
   - 比較セクションに `AggregateOffer`（lowPrice/highPrice/offerCount）
   - JSON-LDで`<head>`に出力。プラン価格はSSOTから生成（ハードコード禁止）
3. **llms.txt を yah.mobi ルートに設置**
   - 筆頭に価格比較ページ・プラン一覧。各行に1行説明（magazine側の llms.txt と同じ流儀）
4. **主張の文言を「日本原生回線（docomo）での最安」に統一**
   - 根拠: 絶対最安は中華系格安（GlobaleSIM $13.60/10GB等）が存在し、AIの照合で「cheapest」主張は落とされる。**「原生回線最安」は正直・検証可能・台湾の評価軸（原生卡最穩定）とも一致**
   - 引用されやすい直接回答文をLP冒頭付近に1文: 「2026年◯月時点、日本原生回線（NTT docomo）のeSIMで10GB/30日 ¥2,600は最安値です（毎朝他社照合）」形式（多言語）

**受け入れ基準**: ①curl（JS無し）で比較表と価格が取得できる ②リッチリザルトテストでOffer/AggregateOfferが検出される ③ https://yah.mobi/llms.txt が返る

**Phase A 受け入れ基準**: モバイル実機(中位機種)で ①1スクロール以内に20GB¥4,000が見える ②プラン空白が出ない ③全文繁中 ④`/zh-TW/app#plans` で直接プランに着地

---

# Phase B: まとめ買い（P0・本丸）

## B-1. SSOT（Firestore: yah-mobile-v1-3ed24）

新設 `config/bulkDiscount`（単一ドキュメント・プランは増やさない）:
```json
{
  "enabled": true,
  "tiers": [
    { "minQty": 2, "pct": 5 },
    { "minQty": 3, "pct": 10 },
    { "minQty": 4, "pct": 15 },
    { "minQty": 5, "pct": 20 }
  ],
  "maxQtyPerOrder": 8,
  "marginFloorPct": 55,
  "appliesTo": ["plan_10gb", "plan_20gb", "plan_50gb"]
}
```
- 20%が上限（6枚以上も20%）。トップアップ各種はラダー対象外
- 割引率をコード側にハードコードしない（価格の単一ソース原則）

## B-2. 購入UI — party_size ファースト

```
Step1  プランセクション冒頭に質問チップ:「幾位一起去日本？」 [1][2][3][4][5+]
       ・1タップ・スキップ可・未選択時は現行表示のまま
Step2  選択後、全プランカードの価格を「每人 ¥3,400」形式に切替
       ・バッジ「4人分まとめて15%OFF」
Step3  チェックアウト: 枚数の初期値=選択人数（1〜8で編集自由）
       ・強制しない。「只買自己的也OK」を明記
       ・枚数変更で割引・每人価格を即時再計算
```
- Stripe: line_item quantity で対応（SKU分裂しない）。合計金額＝割引後

## B-3. 配布 — eSIMごとの固有リンク

- 注文内の各eSIMに **推測不能トークンの固有URL**（例 `/e/{token}`）を発行
- リンク先（受取人の言語で表示）:
  1. **「在這台手機直接安裝」ボタン**（iOS17.4+ ユニバーサルリンク / Android LPA scheme）**←必須**。同一端末では画面上のQRをスキャンできないため、直接インストールが主・QR表示はフォールバック
  2. インストール手順・サポートチャット導線
- 幹事（購入者）のマイページ: 各eSIMの **未送付/未開封/已開通** ステータス一覧・ラベル任意入力（爸爸/媽媽…）
- **「用Email寄送」フォーム**（宛先入力→システム送信・開封追跡）。LINE/Kakao/WhatsAppは幹事が固有URLを自分で転送
- 誤送信対応: 未開通リンクの無効化→再発行を購入者ができる

## B-4. 返金（確定ポリシー）

- **原則返金不可**（購入前チェックボックスで同意・現FAQの記載と整合済み）
- 例外対応（運営の個別判断）: **未開通（プロファイル未DL）のeSIMのみ**・**支払単価（割引後）をそのまま返す**・**ラダー再計算はしない**
- 実装: Stripe partial refund（amount=支払単価）＋該当プロファイル失効＋GA4 `refund` イベント（transaction_id・value）。P0は管理側手動でよい

## B-5. 計測（必須・これがないと検証不能）

- `purchase` イベント（既存のStripe Webhook→GA4 MP送信）に **カスタムパラメータ追加**:
  - `party_size`（Step1の選択値・未選択はnull）
  - `bulk_qty`（購入枚数）
- **items配列を全eコマースイベントに付与**（view_item_list / select_item / **begin_checkout** / add_payment_info / purchase）: `{item_id, item_name(プラン名: "Japan eSIM 20GB"), price, quantity}`。※select_item/add_payment_info/purchaseは付与済み確認、**begin_checkoutは欠落**しているので追加
- GA4側: party_size / bulk_qty をカスタムディメンション登録
- **party_size − bulk_qty のギャップ＝テザリング需要の実測**として週次観測する（発注元で分析）

## B-5b. begin_checkout / add_payment_info の再発火バグ修正【計測精度・優先度中】

**症状（実測 2026-07-19）**: begin_checkout が **1ユーザーあたり1.5回**発火。Stripeから戻る/リロード/タブ復帰で**再発火**している（マウント時発火が原因と推定）。
**影響**: ファネル分母が水増し → **CVR・A-8判定（通過率30%/50%）が不正確**になる。
**修正**:
```
❌ 現状（推定）: チェックアウト画面のマウント時に発火   useEffect(()=>{ track('begin_checkout') }, [])
✅ 修正: 「購入手続きへ」ボタンのクリックハンドラ内で1回だけ  onClick={()=>{ track('begin_checkout'); goToStripe() }}
```
- add_payment_info も同様の位置か確認し、明示アクション時のみに
- select_item(タップ)・purchase(サーバー送信)は正しいので触らない
- **当面の運用回避**: 修正までのCVR判定は begin_checkout でなく **purchase / select_item** を基準にする（再発火の影響を受けない指標）

## B-6. スクロール計測（view_section）— 既に実装済み・確認のみ

- `view_section`（section: hero/plans/compare/compatibility/faq/chat/contact）は**既に発火・GA4で確認済み** ✓
- 改善点: sectionパラメータの無い view_section が混在（GA4探索で空section行が112件）→ 全 view_section に section を必ず付与

**Phase B 受け入れ基準**: ①人数選択→每人価格表示→枚数付き決済が通る ②5枚購入で合計¥16,000(20GB)になる ③各eSIMの固有リンクから別端末で開通できる ④GA4のpurchaseにparty_size/bulk_qty/items が載る ⑤begin_checkoutが1アクション1回だけ発火

---

## A-10. Microsoft Clarity 導入（無料・録画/ヒートマップ）

- GA4は「どこで落ちたか(数字)」まで。Clarityは「**なぜ落ちたか(録画・スクロール/クリックヒートマップ・レイジクリック)**」を補完
- 導入: clarity.microsoft.com でプロジェクト作成（URL: https://yah.mobi）→ 発行される clarity.js スニペットを**全ページ `<head>`** に設置（GTM経由でも可）
- 発注元がアカウント作成→スニペットを本書に貼付 → 実装は yah.mobi 側

---

# Phase C: 後続（着手不要・予告のみ）

- 返金セルフサービス／グループ・シェア設計計算機（人数×日数→最適構成）／KR(Kakao)・EN(WhatsApp/email)向け配布文言
- ※ゲスト決済(A-8)は「修理後CVRの実測で判定」に移動（本書冒頭A-8参照）

# 発注元（magazine側）が並行してやること — 参考

- 広告最終URLを `/zh-TW/app#plans` へ変更・「去日本」見出し追加・まとめ買い見出しはB完成後に投入
- 攻撃対象の実証データ収集（検索語句・CVR）継続。CVR実測が出たら上限CPC再調整

# 禁止事項（鉄則の継承）

- 価格・割引率をコードやMDにハードコードしない（SSOT: Firestoreのみ）
- 「吃到飽/無制限」を name・コピー・URLパスで名乗らない（無制限プランは存在しない。速度訴求は「不會人為限速」の現行表現を維持）
- 公開・本番反映の最終判断は人間
