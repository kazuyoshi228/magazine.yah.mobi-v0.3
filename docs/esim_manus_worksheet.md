# 【作業指示書】Japan eSIM クラスタ 全57記事ドラフト作成（MANUS向け）

> 発注: magazine.yah.mobi（yah. のコンテンツ事業）／ 2026-07-15
> 納品物: **日本語MDファイル 57本**（`content/esim/ja/<slug>.md`）
> あなた（MANUS）の担当: **MDドラフトの作成のみ**。CMS/Firestoreへの反映・公開は発注側（Claude/人間）が行う。
> ゴールドリファレンス（この形を厳密に踏襲）: [content/esim/ja/esim-chatgpt.md](../content/esim/ja/esim-chatgpt.md)
> クエリ在庫（想像で作らず、ここから拾う）: [docs/esim_query_ledger.csv](esim_query_ledger.csv)
> 設計背景: [docs/esim_cluster_design.md](esim_cluster_design.md)

---

## 0. これは何か（30秒で）

訪日旅行者の「通信の悩み」クエリ803本を体系化した **NerdWallet型のトピック権威サイト**を作る。狙いは3つの離脱理由を消すこと＝**最安・最短購買・実測の道具**。各記事は必ず「消す離脱理由（hesitation）」を1つ持ち、道具や比較表や購入ページへ**手渡す（handoff）**。

差別化の堀＝**JP-IP（日本IPアドレス）**。yah.mobileのeSIMは日本の回線（**IIJ＝NTT docomo回線を借用するMVNO**）に直結し日本IPで通信するため、ChatGPT・Instagram・TikTokが日本国内と同条件で使える。中国本土経由や第三国経由の安いeSIMではこれが崩れる——この事実を軸に据える。

> **回線表記の統一ルール**: 回線に言及する時は「**IIJ（NTT docomo回線のMVNO）**」と書く。本体の自社plansは名称に「(IIJ)」、競合比較表は Network「NTT docomo」と表記しており、どちらも正（IIJがdocomo回線を借用）。矛盾して見えないよう上記の書き方に統一する。

---

## 1. 絶対ルール（違反＝差し戻し）

1. **価格・料金の数字を本文に書かない。** 「¥2,600」「980円から」等を一切書かない。価格は本体システム（SSOT）が配信時に自動で焼き込む。あなたは価格に触れず、`priceBindings`（後述）に**どのプランを出すかの意図だけ**を注記で残す。
2. **クエリは想像で作らない。** primaryQuery / secondaryQueries は必ず [esim_query_ledger.csv](esim_query_ledger.csv) の該当クラスタ行から拾う（1記事あたり8〜12行を消化）。台帳に無い言い回しを創作しない。
3. **`status` は必ず `draft`。** 公開（published）にしない。公開判断は人間が行う。
4. **誇張・独自技術の詐称をしない。** 「日本IPはyah.mobile独自技術」等の嘘を書かない。日本回線直結型なら他社でも同条件になる、と正直に書く（リファレンス記事の「正直な整理」節を踏襲）。
5. **冒頭に `directAnswer`（直接回答）を置く。** 定義文＋事実＋確認日。これがAIに引用される条件（GEO）。
6. **日本語のみ。** 今回は ja マスター57本だけ。多言語展開は後工程。
7. **未確認の事実には `〔要確認・編集: …〕` マーカーを本文に残す。** 断定せず、確認ポイントを明示する。

---

## 2. 成果物とファイル規約

- 形式: Markdown（front-matter + 本文）。1記事1ファイル。
- パス: **`content/esim/ja/<slug>.md`**（section=esim / lang=ja は固定）。
- ファイル名 = `<slug>.md`。slugは英小文字・数字・ハイフンのみ（本指示書 §8 の表で指定済み）。
- 文字コード: UTF-8。改行: LF。

---

## 3. front-matter 完全スキーマ

**リファレンス記事 [esim-chatgpt.md](../content/esim/ja/esim-chatgpt.md) の front-matter を丸ごとテンプレにコピーして、各フィールドを差し替える**のが最も安全。以下は各キーの意味と必須/任意。

```yaml
---
# ── 必須（欠けると検証エラー） ──
slug: esim-japan-ip            # §8の表で指定。ファイル名と一致
category: esim                 # 全記事 "esim" 固定
schemaType: Article            # 基本 Article。手順ものは HowTo、Q&A集約は FAQPage
status: draft                  # 必ず draft
layer: "M"                     # §8の表で指定（M/0/1/1.5/3/season/権威）
title: W1-04｜日本のIPで使えるeSIMとは — 見分け方と理由   # 頭に "W1-04｜" 等の管理プレフィックスを付ける
directAnswer: 日本旅行用のeSIMには…（定義＋事実＋「2026年7月時点」等の確認日を必ず含む・2〜4文）
metaTitle: 日本IPで使えるeSIMの選び方【2026年7月確認】    # ★プレフィックス(W1-04｜)は付けない
metaDescription: 日本旅行用eSIMの…（120字前後・検索意図に一致）

# ── 強く推奨（v9戦略フィールド。品質ゲート対象） ──
pageType: article              # 基本 article。ピラー(P1)は landing、総合比較(compare)は grid
hesitation: anxiety            # 消す離脱理由: price（高いかも）/ hassle（面倒）/ anxiety（不安）。§8の表で指定
handoff: ["device-checker", "/buy?ref=<slug>"]   # 手渡し先。§8の表で指定
primaryQuery: 日本 eSIM 日本のIPアドレス           # 台帳から拾った主クエリ1本
secondaryQueries: ["...", "...", "..."]           # 台帳から拾った関連クエリ 7〜11本
confirmedDate: 2026-07-15       # 事実の確認日（GEO引用条件）
canonical: /esim/ja/<slug>      # 固定形式
market: [KO, TW, HK, TH, SG, ID]  # 主な訪日客市場。基本この6つでOK
distribution: [esim]            # 配信面。esim 固定

# ── 任意（台帳突合・将来のマトリクス用。付けても無害・importerは解釈しないものもある） ──
phase: pre                     # pre/transit/during/post（旅行フェーズ）。§8の表で指定
cluster: P3_JPIP差別化          # 台帳のcluster列と対応させる
excerpt: （一覧・SNS用の要約1〜2文）
sources: []                    # 参照した実在ソースのURL（あれば）

# ── 価格プラン（§5参照・数字は書かない） ──
priceBindings: []              # ★空のまま。本文末に「どのプランを出すべきか」を注記で残す（Claudeが本体docIDを設定）
showCompetitorTable: false     # compare/vs記事は true。本体の競合比較表「How we compare.」がFAQ直前に自動挿入される
---
```

**title のプレフィックス規約**: すべて頭に `W1-01｜` 〜 `W4-18｜` を付ける（§8の表の通し番号）。人間が1本ずつレビューする時の目印。**metaTitle には付けない**（検索表示用のため）。

---

## 4. 本文の構造テンプレート

リファレンス記事の見出し構成を踏襲する。**オファー（価格・購入）を後ろに埋めない**のが要点。おおむね以下の順:

1. **導入（H2なしの1〜2段落）** — 悩みの情景から入り、「原因は○○」と早めに核心を出す。
2. **仕組み/理由の説明（H2）** — 必要なら比較表（Markdown表）で整理。※表に価格の数字は入れない。
3. **見分け方/やり方（H2）** — チェックリスト（`- [ ]`）や手順。実機スクショが効くなら `〔要撮影: …〕`。
4. **yah.mobileの場合（H2・正直な整理）** — 推しつつ独自技術の詐称はしない。IIJ回線直結＝日本IP、という事実ベース。
5. **プラン表（自動挿入）** — 本文に書かず priceBindings で指定（§5）。**この直後にオファーが来るよう、4の後は締めの内部リンクだけにする**。
6. 内部リンク1〜2本で締める。

> **❌「まとめ」H2は作らない。** directAnswerと重複し、オファーを下に押しやるだけ。要点はdirectAnswerが担う。締めは内部リンク2本で十分。

### FAQ（front-matterの `faq:` に記載。4〜6問）
- 形式は **`"質問||回答"`** の1行（`||`区切り）。リファレンス記事の `faq:` ブロックを参照。
- 台帳の疑問形クエリ（「なぜ」「できますか」）を質問に採用する。
- **必ず1問は「反論処理」**を入れる（購入直前の不安を潰す）。例:「yah.mobileは中国を経由していませんか？」「本当に日本IP？」等。事実＋確認手段で答える。

### 内部リンク（本文末に必ず）
- ピラーへ: `[日本eSIM完全ガイド](/articles/japan-esim-guide)`
- 比較へ: `[日本eSIM比較表](/articles/compare)`
- **⚠️ 実在するページ/道具にのみリンクする。** `[機種×eSIM対応チェッカー]` のような**未実装ツールを角括弧で書かない**（リンクにならず「壊れた表記」として読者に見える）。道具が未実装なら、その導線は書かず handoff（front-matter）に残すだけにする。
- 購入CTA・プレフィックス除去・著者署名は**テンプレが自動処理**するので本文に書かない（§3 の title プレフィックスは付ける／表示側で自動除去される）。

### 要確認マーカー
- 断定できない事実（回線名の対外表記、キャンペーン、他社の最新仕様など）は本文に `〔要確認・編集: …〕` を残す。編集者が裏どりする。

### 文字数の目安（実文字数・日本語。長さより「速く答えて手渡す」を優先）
訪日客はスマホで斜め読み。冗長より**簡潔＋表/チェックリスト**。ただし薄弱化を避けるため独自価値（仕組み・確認手段・実測）は必ず入れる。

| タイプ | 本文 実文字数 | directAnswer |
|---|---|---|
| ピラー(P1) | 2,500–4,000字 | 200–250字 |
| 換金/CV(P2/P3/C1) | **1,500–2,200字** | **150–200字** |
| 道具/シーン/知識(C5/C7/C10) | 1,000–1,600字 | 120–160字 |
| トラブル/手順(C2/C3) | 1,000–1,600字 | 120–160字 |

- directAnswerは**AIが抜き出せる長さ**に。定義＋数値＋確認日を2〜3文で。長すぎると引用条件が希釈される。
- 「まとめ」はdirectAnswerの繰り返しになりがち。**2行以内**に圧縮し、最後は道具/比較/購入への内部リンクで締める。

### 画像の方針（重要）
- **ストック写真（旅行イメージ等）は貼らない**（yah.homes原則・SEO価値なし・制作を遅らせるだけ）。
- **MANUSは実機スクショを撮れない**。画像が効く箇所には画像を作らず、**`〔要撮影: ○○のスクショ〕` マーカーだけ残す**（後で人間が実機で撮影して差し込む）。
- 実スクショが効く記事タイプ（マーカーを積極的に置く）:
  - **JP-IP系**（IP確認サイトで「Japan」表示・SNSが開いている画面）＝この事業最大の証拠
  - **設定howto**（iPhone/Android のeSIM設定画面の各ステップ）
  - **実測系(C6)**（新幹線・地方での速度計測アプリのスクショ）＝堀そのもの
- アイキャッチ/OGPは公開ブロッカーではない（後回し可）。front-matterの `thumbnailUrl` は空でよい。

---

## 5. 価格プラン（priceBindings）の扱い — 数字は書かない

価格は本体（yah.mobile）の単一ソースから配信時に自動で焼き込まれる。**あなたは docID を知らないし、書かなくてよい。** 代わりに、価格を見せるべき記事は**本文の最後**に次の形の注記を1行残す:

```
〔priceBindings指定: HERO（10GB/30日）＋ 5GB/30日 を表示。ClaudeがSSOT docIDを設定〕
```

どの記事に価格表を出すべきかは §8 の表の「価格表」列（●=出す／空=不要）に従う。原則:
- **換金系（P1/P2/P3/C1・帰国チャージC8のtopup）**＝出す（●）
- **知識・トラブル・シーンの一部**＝不要（空）

本文中に「料金」「価格」の見出しを作る場合も、数字は書かず「下のプラン表参照」と誘導する。

### 競合価格・比較表も書かない（本体SSOTが自動挿入）
比較記事（vs ○○・総合比較）で**競合他社の価格や比較表を本文に書かない**。front-matterに `showCompetitorTable: true` を立てるだけで、本体（yah.mobi/admin/competitorPlans）が管理する**「How we compare.」比較表**（自社＝最安を強調、Airalo・Ubigi 等の実勢を横並び）がFAQ直前に自動で焼き込まれる。あなたは比較表を作らず、**比較の"観点"（速度・サポート・IP・受取不要 等）を文章で解説する**ことに集中する。§8 の「競合表」列が ● の記事に `showCompetitorTable: true` を付ける。

---

## 6. クエリの拾い方（台帳の使い方）

1. [esim_query_ledger.csv](esim_query_ledger.csv) を開く。`cluster` 列が §8 表の「cluster」と対応。
2. 担当記事のクラスタ行から、意味が近いクエリを **8〜12本**選ぶ。
3. 最も検索意図が代表的な1本を `primaryQuery`、残りを `secondaryQueries` に入れる。
4. 選んだ行は「消化済み」として台帳の該当行末に記事slugをメモ（`article_slug` 列を追加してよい）。**重複配分を避ける。**
5. 台帳に無い言い回しを足したい場合は、実在ソース（Reddit/知恵袋/サジェスト等）を確認した場合のみ。**AIでの水増しは禁止。**

---

## 7. 品質ゲート チェックリスト（各記事・提出前に自己点検）

- [ ] front-matter 必須5種（slug/category/schemaType/status/layer）＋言語必須4種（title/directAnswer/metaTitle/metaDescription）が埋まっている
- [ ] `status: draft`
- [ ] title に `Wx-yy｜` プレフィックス、metaTitle には無し
- [ ] directAnswer に「事実＋確認日（2026年7月時点 等）」がある
- [ ] hesitation を1つ持ち、handoff で道具/比較/購入へ手渡している
- [ ] primary/secondaryQueries が台帳由来（創作でない）
- [ ] **本文に価格の数字が一切無い**
- [ ] FAQ 4〜6問（`"Q||A"` 形式）＋**うち1問は反論処理**
- [ ] **「まとめ」H2を作っていない**（directAnswerで代替）
- [ ] 内部リンクは**実在ページのみ**（未実装ツールを角括弧で書いていない）
- [ ] 誇張・独自技術詐称が無い（正直な但し書きがある）
- [ ] 未確認事実に `〔要確認・編集: …〕`
- [ ] **文字数が§4の目安レンジ内**（冗長でない・directAnswerが太すぎない）
- [ ] **ストック画像を貼っていない**（画像が要る箇所は `〔要撮影: …〕` マーカーのみ）

---

## 8. 全57記事リスト（Wave別・この通りに作る）

> layer: M=王道マネーページ / 0=eSIMグリッド / 1=ハウツー / 1.5=シーン / 3=実測（堀）/ 権威=知識
> hesitation: price/hassle/anxiety　｜　価格表: ●=priceBindings指定あり
> handoff 略記: DC=device-checker / GB=gb-diagnosis / BUY=/buy?ref=<slug> / CMP=/articles/compare / SUP=サポート導線

### W1（10本）— 堀と換金を最初に占有

> 価格表●=自社プラン表(priceBindings)／競合表●=`showCompetitorTable: true`（本体「How we compare.」比較表を挿入）

| # | slug | title（頭に付ける） | cluster | layer | pageType | hesitation | handoff | 価格表 | 競合表 | 主テーマ / 主クエリの方向 |
|---|---|---|---|---|---|---|---|:--:|:--:|---|
| 01 | japan-esim-guide | W1-01｜日本eSIM完全ガイド | P1 | M | landing | anxiety | DC,CMP,BUY | ● | ● | ピラー。全記事のハブ。「日本 eSIM おすすめ/選び方」 |
| 02 | esim-chatgpt | W1-02｜ChatGPTが使える日本eSIMの選び方 | P3 | M | article | anxiety | DC,BUY | ● | | **作成済み（リファレンス）**。再作成不要 |
| 03 | esim-japan-ip | W1-03｜日本のIPで使えるeSIMとは | P3 | M | article | anxiety | DC,BUY | ● | | 「日本 eSIM 日本のIPアドレス 取得」IPの国＝経由地 |
| 04 | esim-sns | W1-04｜Instagram・TikTokが使える日本eSIM | P3 | M | article | anxiety | DC,BUY | ● | | 「日本 eSIM SNS/Instagram/TikTok 使える」 |
| 05 | esim-vpn-fuyou | W1-05｜日本旅行でVPNは要る？eSIMとの関係 | P3 | 0 | article | anxiety | BUY | | | 「日本 eSIM VPN 必要/不要」日本IPならVPN不要論 |
| 06 | compare | W1-06｜日本eSIM比較表（総合） | P2 | M | grid | price | CMP,BUY | ● | ● | 総合比較。「日本 eSIM 比較 おすすめ」 |
| 07 | esim-vs-pocket-wifi | W1-07｜eSIM vs ポケットWiFi | P2 | 1 | article | price | CMP,BUY | ● | ● | 「eSIM ポケットWiFi どっち/比較」 |
| 08 | esim-vs-airport-sim | W1-08｜eSIM vs 空港SIM | P2 | 1 | article | price | CMP,BUY | ● | ● | 「eSIM 空港SIM 比較」 |
| 09 | esim-vs-roaming | W1-09｜eSIM vs 海外ローミング | P2 | 1 | article | price | CMP,BUY | ● | ● | 「eSIM ローミング 比較/どっちが安い」 |
| 10 | esim-vs-airalo | W1-10｜yah.mobile vs Airalo（日本eSIM） | P2 | 1 | article | price | CMP,BUY | ● | ● | 「Airalo 日本 比較/評判」 |

### W2（14本）— 道具連携（購入・設定・トラブル・容量）

| # | slug | title | cluster | layer | hesitation | handoff | 価格表 | 主テーマ |
|---|---|---|---|---|---|---|:--:|---|
| 11 | esim-where-to-buy | W2-11｜日本eSIMはどこで買う？ | C1 | 1 | hassle | BUY | ● | 「日本 eSIM どこで買う/購入」 |
| 12 | esim-when-to-buy | W2-12｜eSIMはいつ買う？出発前の準備 | C1 | 1 | hassle | BUY | ● | 「eSIM いつ買う/前日/当日」 |
| 13 | esim-payment | W2-13｜eSIMの支払い方法 | C1 | 1 | hassle | BUY | ● | 「eSIM 支払い/クレジットカード」 |
| 14 | esim-iphone-setup | W2-14｜iPhoneのeSIM設定手順 | C2 | 1 | hassle | DC | | 「iPhone eSIM 設定/インストール」HowTo |
| 15 | esim-android-setup | W2-15｜AndroidのeSIM設定手順 | C2 | 1 | hassle | DC | | 「Android/Pixel/Galaxy eSIM 設定」HowTo |
| 16 | esim-compatible-devices | W2-16｜eSIM対応機種の確認方法 | C2 | 1 | anxiety | DC | | 「eSIM 対応機種/確認」 |
| 17 | esim-dual-sim | W2-17｜デュアルSIMの使い方（日本旅行） | C2 | 1 | hassle | DC | | 「デュアルSIM eSIM 設定/切替」 |
| 18 | esim-activation | W2-18｜eSIMの開通（アクティベート）手順 | C2 | 1 | hassle | SUP | | 「eSIM 開通/アクティベート/QR」HowTo |
| 19 | esim-not-connecting | W2-19｜eSIMが繋がらない時の対処 | C3 | 1 | anxiety | SUP | | 「eSIM 繋がらない/圏外」 |
| 20 | esim-slow | W2-20｜eSIMが遅い時の対処 | C3 | 1 | anxiety | SUP | | 「eSIM 遅い/速度」 |
| 21 | esim-activation-failed | W2-21｜eSIMの開通に失敗した時 | C3 | 1 | anxiety | SUP | | 「eSIM 開通できない/エラー」 |
| 22 | esim-how-many-gb | W2-22｜日本旅行に何GB必要？ | C5 | 0 | price | GB,BUY | ● | 「日本旅行 eSIM 何GB/データ量」 |
| 23 | esim-unlimited-truth | W2-23｜eSIM「無制限」の実際 | C5 | 0 | price | GB,CMP | ● | 「eSIM 無制限 速度制限/本当」 |
| 24 | esim-data-remaining | W2-24｜eSIMのデータ残量を確認する | C5 | 1 | hassle | GB | | 「eSIM 残量 確認/使いすぎ」 |

### W3（15本）— C7シーン別（2Fへの橋）

> 全て layer=1.5・pageType=article・hesitation=anxiety（もしくはシーンに合わせhassle）・handoff=DC or BUY・phase=during（一部pre）。価格表は不要（空）。各シーン記事は将来そのカテゴリのハブに昇格できる見出し構造にする。

| # | slug | title | cluster | phase | 主テーマ |
|---|---|---|---|---|---|
| 25 | esim-scene-city | W3-25｜街歩き×通信（地図・翻訳・SNS） | C7 | during | 街中散歩の通信 |
| 26 | esim-scene-hiking | W3-26｜登山・ハイキング×通信（電波・オフライン地図） | C7 | during | 登山の電波/緊急 |
| 27 | esim-scene-transit | W3-27｜移動×通信（新幹線・地下鉄） | C7 | transit | 交通移動中の通信 |
| 28 | esim-scene-shopping | W3-28｜ショッピング×通信（免税・地図・翻訳） | C7 | during | 買い物の通信 |
| 29 | esim-scene-airport | W3-29｜空港・飛行機×通信（到着直後の開通） | C7 | transit | 空港での通信 |
| 30 | esim-scene-winter | W3-30｜スキー・雪山×通信 | C7 | during | ウィンタースポーツ |
| 31 | esim-scene-gourmet | W3-31｜グルメ×通信（予約・翻訳・決済） | C7 | during | 飲食店での通信 |
| 32 | esim-scene-onsen | W3-32｜温泉・リゾート×通信（マナーと電波） | C7 | during | 温泉地の通信 |
| 33 | esim-scene-sports | W3-33｜スポーツ観戦×通信（スタジアム混雑） | C7 | during | 観戦時の通信 |
| 34 | esim-scene-business | W3-34｜ビジネス出張×通信（テザリング・経費） | C7 | during | 出張の通信 |
| 35 | esim-scene-study | W3-35｜留学・長期滞在×通信 | C7 | during | 長期滞在の通信 |
| 36 | esim-scene-hotel-wifi | W3-36｜ホテルWiFi×eSIM（宿の通信） | C7 | during | 宿泊の通信（homes連携） |
| 37 | esim-scene-medical | W3-37｜医療・緊急×通信（119・多言語） | C7 | during | 緊急時の通信 |
| 38 | esim-scene-events | W3-38｜祭り・花火・イベント×通信（混雑） | C7 | during | イベントの通信 |
| 39 | esim-scene-special | W3-39｜特殊シナリオ×通信（クルーズ・離島 等） | C7 | during | 特殊ケースの通信 |

### W4（18本）— ブランド比較残・空港別・機能・実測（堀）・帰国・知識

| # | slug | title | cluster | layer | hesitation | handoff | 価格表 | 競合表 | 主テーマ |
|---|---|---|---|---|---|---|:--:|:--:|---|
| 40 | esim-vs-ubigi | W4-40｜yah.mobile vs Ubigi | P2 | 1 | price | CMP,BUY | ● | ● | 「Ubigi 日本 比較」※SSOT比較表に収録あり |
| 41 | esim-vs-anyphone | W4-41｜yah.mobile vs Any Phone | P2 | 1 | price | CMP,BUY | ● | ● | 「Any Phone 日本 比較」※SSOT比較表に収録あり |
| 42 | esim-cheapest | W4-42｜日本eSIM 最安はどこ？ | P2 | 1 | price | CMP,BUY | ● | ● | 「日本 eSIM 最安/安い」総当たり最安訴求 |
| 43 | esim-airport-narita | W4-43｜成田空港で使うeSIM | P2 | 1 | hassle | BUY | ● | | 「成田 eSIM/SIM 受取不要」 |
| 44 | esim-airport-haneda | W4-44｜羽田空港で使うeSIM | P2 | 1 | hassle | BUY | ● | | 「羽田 eSIM」 |
| 45 | esim-airport-kansai | W4-45｜関西空港で使うeSIM | P2 | 1 | hassle | BUY | ● | | 「関空 eSIM」 |
| 46 | esim-airport-fukuoka | W4-46｜福岡空港で使うeSIM | P2 | 1 | hassle | BUY | ● | | 「福岡 eSIM」（homes連携） |
| 47 | esim-vs-carrier-short | W4-47｜eSIM vs キャリア短期プラン（ahamo等） | P2 | 1 | price | CMP | ● | | 「ahamo/povo 短期 訪日」 |
| 48 | esim-vs-wifi-brands | W4-48｜eSIM vs レンタルWiFi各社 | P2 | 1 | price | CMP,BUY | ● | | 「レンタルWiFi 比較 訪日」 |
| 49 | esim-tethering | W4-49｜eSIMでテザリングは使える？ | C4 | 1 | anxiety | DC | | | 「eSIM テザリング/PC」 |
| 50 | esim-line-kakao-auth | W4-50｜eSIMでLINE・KakaoTalk認証は？ | C4 | 1 | anxiety | SUP | | | 「eSIM LINE/カカオ 認証/SMS」既存kakaotalk-authと統合注意→〔要確認〕 |
| 51 | esim-carrier-quality | W4-51｜日本のeSIM回線品質（docomo/SoftBank/IIJ） | C6 | 3 | anxiety | — | | | 実測。「日本 eSIM 回線/どこ」堀 |
| 52 | esim-shinkansen-signal | W4-52｜新幹線での電波（eSIM実測） | C6 | 3 | anxiety | — | | | 「新幹線 電波/eSIM」実測・堀 |
| 53 | esim-rural-signal | W4-53｜地方・田舎での電波（eSIM実測） | C6 | 3 | anxiety | — | | | 「地方/田舎 電波 eSIM」実測・堀 |
| 54 | esim-delete | W4-54｜使い終わったeSIMの削除 | C8 | 1 | hassle | — | | | 「eSIM 削除/消す」 |
| 55 | esim-expiry-reuse | W4-55｜eSIMの有効期限と再利用 | C8 | 1 | hassle | BUY | | | 「eSIM 期限/再利用/次回」 |
| 56 | esim-topup | W4-56｜eSIMのチャージ・延長 | C8 | 1 | price | BUY | ● | | 「eSIM チャージ/追加/延長」topupプラン束縛 |
| 57 | esim-what-is | W4-57｜eSIMとは？（訪日旅行者向け基礎） | C10 | 権威 | anxiety | DC | | | 「eSIMとは/仕組み」知識・GEO素材 |

> ※W4-40〜42のブランド: 本体の競合比較表SSOT（yah.mobi/admin/competitorPlans）に現在収録されているのは **Airalo・Ubigi・Any Phone**（Holafly/Saily は未収録）。vs記事のブランドはSSOT収録に合わせた。他ブランドを追加したい場合は先に本体の比較表へ行を足す。

---

## 9. 納品と、その後の工程（Claude側）

**あなたの納品**: `content/esim/ja/*.md` の56本（#02は作成済みのため除く）を、上記規約で作成し提出。

提出後、発注側（Claude/人間）が行う工程は以下（あなたの作業外・参考）:
1. `priceBindings` に本体SSOTの実docIDを設定（`showCompetitorTable` はMANUSがfront-matterで指定済み）
2. `node scripts/import-md.mjs content/esim/ja/<slug>.md`（dry-run検証）
3. `pnpm md:write content/esim/ja/<slug>.md`（Firestoreへ **draft** で投入）
4. **CMSで著者を設定**（署名＝E-E-A-T/GEO。MDに著者欄は無いので必ずCMSで。著者未設定のまま公開しない）
5. 人間がCMSで裏どり・仕上げ・**公開（published）**

> テンプレが自動でやること（＝あなたが本文に書かなくてよい）: **title の `Wx-yy｜` プレフィックスは表示時に自動除去**／**購入CTAは `?ref=<slug>` 付きで自動生成**／プラン表・競合表・FAQの整形。あなたは front-matter を正しく埋めることに集中する。

**つまりあなたは「検証（dry-run）を通るdraft MD」を作れば完了。** 迷ったら §7 のチェックリストとリファレンス記事 [esim-chatgpt.md](../content/esim/ja/esim-chatgpt.md) に戻る。

---

## 付録: よくある差し戻し理由

- ❌ 本文に「980円〜」等の価格数字 → §1-1 違反
- ❌ secondaryQueries が台帳に無い創作クエリ → §1-2 違反
- ❌ directAnswer に確認日が無い → GEO条件を満たさない
- ❌ title と metaTitle が同じ（両方にプレフィックス）→ §3 違反
- ❌ FAQが `Q||A` 形式でない／改行で分けている → 検証で落ちる
- ❌ 「yah.mobile独自技術で日本IP」等の誇張 → §1-4 違反
