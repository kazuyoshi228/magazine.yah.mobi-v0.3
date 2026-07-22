# 🔴 緊急指示書: GA計測全停止の復旧（Cookie同意バナー消失）

**日付**: 2026-07-21 ／ **優先度: 最上位・即日** ／ 発注元: magazine側セッション
**この1件だけの単独指示書。他のPhase A/B作業（esim_yahmobi_workorder_bulk_lp.md）より先にやる。**

---

## 1. 症状

- **GA4（yah-mobile-v1.1 / G-DVVQ3D5M6Z）への受信が 2026-07-20 からゼロ**
- 7/19までは正常（purchase¥550・イベント各種を受信済み）
- 7/20は広告が21クリック配信されているのに、GA4のアクティブユーザー **0**・過去30分 **0**
- ＝集計ラグではなく**受信停止**

## 2. 原因（2026-07-21朝、実ブラウザで特定済み）

https://yah.mobi/zh-TW/app をシークレット相当の新規セッションで開いて検査した結果:

| 検査項目 | 結果 |
|---|---|
| gtag.js の読み込み | ✅ 正常（`googletagmanager.com/gtag/js?id=G-DVVQ3D5M6Z`） |
| dataLayer の consent default | ❌ **`analytics_storage: "denied"`**（ad系もすべてdenied・`wait_for_update: 500`） |
| Cookie同意バナー | ❌ **DOMに存在しない**（`[class*="cookie"], [class*="consent"]` セレクタで0件） |
| localStorage の同意フラグ | ❌ なし（キーは `_grecaptcha` と `yah_mobile_lang` のみ） |
| /g/collect リクエスト | ❌ **1件も発火しない** |

**因果**: consent default = denied のまま、**同意を取得するバナーが描画されなくなった** → 訪問者は誰も analytics_storage を granted にできない → **全訪問者の計測が永久にゼロ**。

**時系列**: 7/19の診断時にはバナー（「拒絕」「全部接受」ボタン）が表示されていた。7/19深夜〜7/20のデプロイでバナーが消えた（または描画条件が壊れた）と推定。**直近のデプロイ差分を確認すること**。

## 3. 修正（どちらか選択・推奨は案B）

**案A: バナーを復活させる（最小差分）**
- 7/19時点の表示・挙動に戻す（初回訪問で表示 → 「全部接受」で `gtag('consent','update',{analytics_storage:'granted'})` → localStorage等に保存）
- 消えた原因（コンポーネントの条件分岐・ビルド外れ・CSS等）をデプロイ差分から特定

**案B: consent default を granted に変更（推奨・シンプル）**
```js
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted'   // ← ここだけ denied → granted
});
```
- 根拠: 主要市場は台湾・日本・韓国＝GDPR圏外。`anonymize_ip: true` は維持済み。分析Cookieのデフォルト許可は一般的な運用
- バナーは「オプトアウト（拒絶）用」として復活させるのが望ましいが、計測復旧を優先し**後追いで可**
- 将来EU向けを強化する場合のみ、地域判定でEU圏だけdeniedに切り替える

## 4. 受け入れ基準（必ず確認）

1. **シークレットウィンドウ**（同意履歴なし）で https://yah.mobi/zh-TW/app を開く
2. DevTools → Network → フィルタ `collect` → **`/g/collect` リクエストが発火する**こと（page_view）
3. スクロール・プランタップで `view_section` / `select_item` も発火すること
4. **GA4リアルタイム**（yah-mobile-v1.1）に自分のアクセスが表示されること
5. モバイル実機（Safari）でも同様に確認

## 5. 復旧後の注意（発注元で対応・参考）

- **7/20〜復旧時刻までは欠測期間**として扱う（CVR判定・ファネル分析の分母から除外）
- gtag停止中に発生した購入は client_id 紐付けが欠損している可能性（purchase自体はStripe Webhook経由でGA4に届くが、流入元アトリビューション不可）
- 復旧確認後、magazine側でGA4リアルタイムを監視して受信再開を確認する

## 6. 再発防止（余裕があれば）

- デプロイ後チェックリストに「シークレットで /g/collect 発火確認」を追加
- consent まわりのコードに「変更時は計測が止まりうる」旨のコメントを残す
