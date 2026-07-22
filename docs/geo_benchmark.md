# GEO定点観測 — 「日本eSIM最安」をAIが誰から引くか

月1回、同条件で記録する。目標: yah.mobile が引用ソース入り → 「最安」回答の主語になる。

---

## 2026-07-19（ベースライン・初回）

### クエリ1: "cheapest Japan eSIM 2026 price comparison"（EN）
**AI回答の内容**: Travelsim Asia（10GB $16.49）・eSIM4（1GB $2.98/無制限）・Saily・Nomad を比較して回答。
**引用ソース（＝AIの情報源になっているサイト）**:
- esimdb.com（比較DB・180+プロバイダ）★両言語に登場
- travelsimasia.com / esim4.com / travelesimexpert.com（585プラン比較）
- tokyocheapo.com（実測レビュー系）/ japan-wireless.com / findingalexx.com / roafly.com
- **yah.mobile: 不在**

### クエリ2: 「日本 eSIM 最便宜 比較 2026」（繁中）
**AI回答の内容**: Wi-Go（CMHK=中國移動香港系）が最安・MobiMatter 20GB $13.99・Ubigi 10GB/7天 $14 等。
**引用ソース**:
- beurlife.com（這就是人生・台湾有名旅行ブログ）——**タイトルに「首選原生卡最穩定」＝原生語彙が最上位ブログに存在**
- shin.tw（阿新筆記）/ waysim.net / ok-sim.com / prepaidsim.cdjapan / esimdb.com
- **yah.mobile: 不在**

### 発見
1. **AIはプロバイダ公式でなく「比較サイト＋ブロガー」から答えを組む**（Airaloすら情報源としては不在）。→ 勝ち筋は (a)自前の比較コンテンツを引用可能な形式で出す (b)**AIが引く比較サイト/ブロガーに掲載される**の二本立て
2. **esimdb.com が両言語で登場する要衝**。プロバイダ登録の可否を要調査——載れば価格ソートDB経由でAI回答に入る最短路の可能性
3. **絶対最安は既に激戦**: GlobaleSIM 10GB/30天 $13.60(≒¥2,100) や MobiMatter 20GB $13.99(≒¥2,170) など、当社(¥2,600/¥4,000)より安い**中華系・格安ブランドが存在**。→ 「無条件の最安」主張はAI検証で負ける恐れ。**「日本原生回線（docomo）での最安」「原生×最安」に主張を絞るのが正直かつ防衛可能**（台湾トップブログの「原生卡最穩定」観点とも一致）
4. 台湾ブログ勢（beurlife・阿新・林氏璧）がAI回答の入口——KOL/アフィリの重要性を再確認（growth worksheet H案）

### 次回アクション
- [ ] esimdb.com へ掲載申請（下記§参照・調査済み）
- [ ] 比較表の主張を「日本原生回線最安」に精緻化（Schema.org Offer・更新日つき・SSR）
- [ ] yah.mobi側 llms.txt 設置
- [ ] 次回観測: 2026-08 中旬（同2クエリ＋ "日本 esim 原生 最便宜"）

---

# esimdb.com 掲載申請（調査結果・2026-07-19）

## なぜ重要か
GEOベンチマークで **esimdb.com はEN/繁中両方のAI回答の引用源**に登場する唯一の比較DB（180+社掲載・毎日更新表示）。掲載されれば価格ソートDB経由でAI回答（ChatGPT/Perplexity/AI Overview）に入る最短水路。

## 申請方法（調査済み）
- 公開の申請フォームは無し。**`support@esimdb.com` へメール**（Product Hunt上のeSIMDB公式回答で確認）
- 掲載条件: **オンラインで購入・設定が完結するプリペイドデータプラン** → yah.mobileは該当
- esimdbはアフィリエイトで収益化 → **提携プログラムの有無が採否・露出に効く可能性**（growth worksheet H案「比較メディア25%レーン」と直結。「準備中・意向あり」だけでも書く）

## 送信前チェックリスト
- [ ] EN購入フローが通ること（OAuth修理済み・テスト購入済み ✓）
- [ ] `#compare` アンカー未実装の間は比較表URLを `https://yah.mobi/en/app` にする
- [ ] 送信は人間（山田さん）が行う

## メールドラフト（EN）
```
To: support@esimdb.com
Subject: Provider listing request — yah.mobile (Japan travel eSIM)

Hi eSIMDB team,

We'd like to request a listing for yah.mobile, a Japan-focused travel eSIM
provider. We meet your criteria: prepaid data plans, purchased and set up
fully online (QR / one-tap install).

- Website: https://yah.mobi (EN / zh-TW / more)
- Network: NTT docomo (native Japanese network, Japan IP)
- Plans (tax included):
    10GB / 30 days — ¥2,600
    20GB / 30 days — ¥4,000
    50GB / 30 days — ¥7,200
    (top-ups available; no artificial speed caps)
- Instant delivery: QR by email, iOS 17.4+ one-tap install
- Support: 24/7 multilingual chat
- We publish a daily-updated price comparison vs other Japan eSIMs
  (verified every morning JST): https://yah.mobi/en/app

We're also preparing an affiliate/partner program and would be glad to
discuss a partnership.

Anything else you need for the listing, just let us know.

Best regards,
Kazuyoshi Yamada
yah.mobile (Bonfire Inc.)
```

## 返信後に要求されがちなもの（備え）
- プラン一覧のフィード/API → **SSOT（Firestore plans）から自動生成可能**（要求されたら実装）
- ロゴ素材・アフィリエイト条件（H案: 25%を提示できる）

## ステータス
- 2026-07-19: 調査完了・ドラフト作成。**送信待ち（人間の手で）**
