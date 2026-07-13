# 【ドラフト】日本eSIM 最安比較 — `/esim/ja/compare`

> 種別: 受けページ（層M・格子）／日本語マスター（KO・繁中・TH・ENは§実装メモの規則でローカライズ）
> 主クエリ: 「日本 eSIM 比較」「日本 eSIM 最安」／従: 「日本 eSIM おすすめ」「eSIM vs ポケットWiFi」「eSIM vs 空港SIM」「Airalo 日本 高い」
> 消す離脱理由: **「高いかも」**（v9 §1）／受け先: GB診断・自国キャリア比較・/buy
> 価格は全て **Firestore単一ソース・取得日時明示**（自社は自動更新／他社のみ手動・v9 §5-2 §8-3要件③）
> `{{…}}` は動的差し込み。競合価格は**サンプル**であり、実データに置換する。

---

## メタ

- **title**: 日本eSIM 最安比較【{{updated_date}}更新】yah.mobile・Airalo・Holafly・ポケットWiFiを日数×容量で
- **meta description**: 訪日eSIMを日数×容量で横断比較。{{updated_date}}時点の実勢価格で最安がひと目で分かる。出身国を選ぶと自国キャリアのローミング料金とも比較できます。
- **H1**: 日本eSIM 最安比較 — 日数×容量でひと目

---

## 直接回答ブロック（冒頭3行・AI引用の主砲）

> **結論**: 訪日旅行で最も安く通信を確保する方法は、多くの日数×容量帯で **eSIM** です。{{updated_date}}時点、代表的な「7日間・3GB」で **yah.mobile ¥{{yah_7d_3gb}}** に対し Airalo ¥{{airalo_7d_3gb}}／Holafly ¥{{holafly_7d_3gb}}／空港レンタルWiFi ¥{{wifi_7d}}（受取返却の手間つき）。**下の表は{{updated_date}}に自動取得した実勢価格**で、日数・容量・出身国を選ぶとあなたの条件での最安が出ます。

*（GEO則: 定義文開始＋数値＋確認日。AIがこの3行だけ引用しても yah.mobile が最安ソースとして残る形にする）*

---

## 1. キャリア横断比較表（本体・動的）

**「日数 × 容量」を選んでください** → 表が絞り込まれ、最安セルがハイライトされます。

| プロバイダ | 3GB | 5GB | 10GB | 無制限 | 受取 | 備考 |
|---|---|---|---|---|---|---|
| **yah.mobile** | ¥{{yah_3}} | ¥{{yah_5}} | ¥{{yah_10}} | ¥{{yah_unl}} | 即時QR | 現地IIJ回線／日本語サポート |
| Airalo | ¥{{airalo_3}} | ¥{{airalo_5}} | ¥{{airalo_10}} | — | 即時QR | — |
| Holafly | — | — | — | ¥{{holafly_unl}} | 即時QR | 無制限のみ（少容量帯に不利） |
| ポケットWiFi（レンタル） | 一律 ¥{{wifi_day}}/日 | ← | ← | ← | 空港受取/返却 | 端末持ち歩き・返却必須 |
| 空港SIM | ¥{{airport_sim}} | ← | ← | ← | 到着後窓口 | 行列・在庫・SIM入替 |

> ※表内は{{n_days}}日間の総額。**{{updated_date}} 自動取得**（yah.mobileはリアルタイム、他社は手動更新）。最安セルは自動判定でハイライト。
> ※**サンプル値の例**（実装確認用・公開時は差し替え）: 7日3GB → yah.mobile ¥{{例:1,180}} / Airalo ¥{{例:1,700}} / Holafly（無制限のみ）¥{{例:3,400}} / レンタルWiFi ¥{{例:5,500}}。

**この帯でのあなたの最安 → 〔{{cheapest_provider}} ¥{{cheapest_price}}〕** → [このプランを見る（/buy?ref=compare）]

---

## 2. 自国キャリアのローミング vs eSIM（出身国フィルタ・層1接続）

**出身国を選ぶと、自国キャリアの日本ローミング料金を先頭に並べて比較します**（＝海外SIMを買う前の一番の疑問に答える）。

| 選択: 〔{{home_country}}〕 | 日本での{{n_days}}日 | 実質 | eSIMとの差 |
|---|---|---|---|
| 自国キャリア ローミング（{{home_carrier}}） | ¥{{roaming_price}} | {{roaming_note}} | **+¥{{roaming_gap}} 高い** |
| **yah.mobile eSIM** | ¥{{yah_price}} | 使い切り型 | — |

> 例: 韓国 SKT／台湾 中華電信／タイ AIS など。**ローミングは1日あたり課金で総額が跳ねやすい** → 日数が伸びるほどeSIMが有利。
> 詳しい各社ローミングは → [自国キャリア別ローミング比較（層1記事）へ]

---

## 3. 機種・OS対応（層0接続・「使えるか不安」を消す）

| 機種例 | eSIM対応 | デュアルSIM | メッセンジャー番号維持 |
|---|---|---|---|
| iPhone XS以降 | ○ | ○ | 設定ガイドへ |
| Galaxy S20以降 | ○ | ○（一部制限） | KakaoTalk認証ガイドへ |
| Xiaomi / OPPO 主要機種 | 機種による | 機種による | 機種チェッカーで確認 |

> **あなたの機種で使えるか30秒で確認 → [機種×eSIM対応チェッカーへ]**

---

## 4. 正直な但し書き（透明性＝信頼＝AI引用の条件）

**最安が常に正解ではありません。あなたの条件で競合が勝つ場合も正直に書きます:**

- **超短期（1〜2日）で少容量**: 各社の最低額が拮抗。到着後すぐ使うだけなら差はわずか。
- **とにかく容量無制限で使い倒す**: 重量級ユーザーは Holafly の無制限が総額で有利になる帯があります。
- **複数国を1枚で回る**: 日本単独ではなく周遊なら、リージョン型eSIM（Airalo等）が便利な場合があります。

*yah.mobile が有利なのは「日本・数日〜2週間・数GB〜中容量」帯。上記に当てはまる方は、下の GB診断で最適を出してください（自社が最安でない条件も正直に提示します）。*

---

## 5. 選び方（→ GB診断へ手渡し・迷わせない）

「結局どれ？」→ **日数・人数・使い方（地図/SNS/動画/テザリング）を入れると、あなたに必要なGBと最安プランを出します。**

**→ [GB診断（30秒）であなたの最安を出す]**

---

## 6. 価格の透明性（なぜこの比較を信じてよいか）

- **yah.mobile の価格は本サイトの決済と同一のFirestoreから取得**。記事・比較・決済で1円もズレません（v9 §8-3要件③）。
- **取得日時を毎回明示**（{{updated_date}} {{updated_time}}）。古い価格で判断させません。
- 他社価格は手動更新（更新日を併記）。**古い可能性がある行はその旨を表示**します。

---

## 7. FAQ（Schema: FAQPage）

**Q. 日本旅行で一番安い通信は？**
A. 多くの日数×容量帯で eSIM が最安です。{{updated_date}}時点、7日3GBで yah.mobile ¥{{yah_7d_3gb}}。レンタルWiFiや空港SIMは受取返却や行列の手間ぶん割高になりがちです。

**Q. Airaloと比べてどう？**
A. 日本単独・数日〜2週間・数GB帯では yah.mobile が安い傾向（現地IIJ回線・日本語サポート）。複数国周遊ならAiraloのリージョン型が便利な場合があります。上の表で条件別に確認できます。

**Q. eSIMにしたらLINE／KakaoTalkの認証や番号はどうなる？**
A. 既存アカウントの認証は維持できます（日本番号が付与されますが、メッセンジャーの認証は既存のまま）。機種別の手順は各ガイドへ。

---

## 8. CTA

- 主: **[あなたの最安プランを見る（/buy?ref=compare）]** ＋ 動的価格ウィジェット（実勢価格・Airalo差・現地通貨・取得日時をSSRで焼き込み）
- 副: [GB診断で最適容量を出す] / [自国キャリア比較] / [機種チェッカー]

---

## 実装メモ（開発向け）

- **データ源**: yah.mobile＝Firestore（決済と同一・リアルタイム）／競合＝手動テーブル（`updated_at`必須・古い行はUIで警告）。llms.txt と同一ソース（v9 §2-5）。
- **SSR/プリレンダ**: 価格・直接回答ブロック・比較表はサーバ側で焼き込み（AIクローラー/SEOのSSR要件・v9 §8-2）。
- **パーソナライズ**: 日数×容量×出身国×機種のフィルタはクライアント。**出力面限定の肝＝「あなたの条件での最安」はこのページでしか出ない**（AIには「条件別比較がある」と存在だけ引用させる・v9 §7-3）。
- **多言語（§9-1）**: 「翻訳」ではなく**列の並べ替え** — 出身国既定で自国キャリアを先頭に。KO/繁中/TH/ENは同一コンポーネントの locale 差し替え。
- **計測**: 最安セルクリック／GB診断遷移／/buy を4段ファネルで（v9 §10）。`?ref=compare` パススルー必須。
- **Schema**: `Product`（各プラン）＋`FAQPage`＋`Table`。`priceValidUntil`/`dateModified` に取得日時。

---

## 出力コントラクト（SEO/GEO — スキーマは入力、これが本体）

> 検索エンジン/AIクローラーはFirestoreを見ない。**見えるのはレンダHTMLだけ。** front-matter/Firestoreの各フィールドが「何をHTML/JSON-LD/タグとして emit するか」を固定する。人が毎回入れ忘れない＝一貫してSEO/GEOレバーを吐く。

### A. フィールド → 出力の対応（emit contract）

| front-matter / Firestore | emit する出力 | 効くレバー |
|---|---|---|
| `direct_answer`（**要追加**） | 冒頭 `<p>` に定義文開始＋数値＋確認日 | GEO本丸（数値+40%・定義文+2.1倍） |
| `price_bindings` | **ビルド時に解決した数値**を表セル＋直接回答＋ウィジェットHTMLへ焼く | GEO（数値）・SEO（可視価格） |
| `primary_query`/`secondary_queries` | `<title>`/`<h1>`/`<h2>`見出し | SEO |
| `schema:` | `<script type="application/ld+json">`（下記C）を実際に emit | SEO・AI Overviews |
| `lang` + `hreflang_cluster`（**要追加**） | 全言語版を相互に `<link rel="alternate" hreflang="…">` | SEO（多言語） |
| `canonical`（**要追加**・既定=自`path`） | `<link rel="canonical">`（homes配信は原本へ・§11-4） | SEO（重複回避） |
| `updated`/`confirmed_date` | 可視「{{updated_date}}更新」＋JSON-LD `dateModified` | SEO/GEO（鮮度） |
| `handoff`/`layer` | 本文内リンク（GB診断・自国キャリア比較・/buy）＋層ピラミッド内部リンク | SEO（内部リンク） |
| `distribution`/`market` | sitemap登録・配信面ルーティング（guides/homes/esim） | SEO（発見性） |
| `sources` | 出典リンク＋（該当時）専門家引用 | GEO（+115%）・E-E-A-T |

### B. ビルド要件（クローラーに"見える形"で吐く）

1. **価格はSSR/プリレンダで焼き込む**（クライアントfetch禁止）。**焼かないとGEOの主砲＝数値が不可視**。
2. **価格変更で再ビルド or ISR再検証** — 焼いたHTMLの数値と`取得日時`を新鮮に保つ（古い数値のAI引用を防ぐ）。
3. **sitemap.xml を `content/` 構造から自動生成**＋更新時に ping。
4. **robots で AIクローラーを許可**（GPTBot/PerplexityBot/Google-Extended 等）。Sailyの逆をやる（§3）。
5. **hreflang クラスタは全言語で相互リンク**（KO/繁中/TH/EN/ja が互いを指す。片方向は無効）。
6. **canonical**: 自ページ＝自`path`。homes配信の複製は必ず `yah.mobi/guides/` 原本へ（§11-4）。
7. **Core Web Vitals**: 静的＋Firebase Hosting CDN。価格ウィジェットで CLS を出さない（高さ予約）。

### C. JSON-LD テンプレ（emit 実体）

```html
<!-- 各プラン -->
<script type="application/ld+json">
{ "@context":"https://schema.org", "@type":"Product",
  "name":"yah.mobile 日本eSIM 7日3GB",
  "offers":{ "@type":"Offer", "price":"{{yah_7d_3gb}}", "priceCurrency":"JPY",
             "priceValidUntil":"{{updated_date}}", "availability":"InStock",
             "url":"https://yah.mobi/buy/…?ref=compare" },
  "dateModified":"{{updated_datetime}}" }
</script>
<!-- FAQ3問 → FAQPage / パンくず → BreadcrumbList / 比較表 → ItemList も同様に emit -->
```

### D. 「入力→出力」の分離（原則）

- **入力（MD/著述）**: `direct_answer`・見出し・出典・確認日・handoff — 人/AIが書く。
- **出力（ビルドが emit）**: SSR HTML・JSON-LD・hreflang・canonical・sitemap・llms.txt — **スクリプトが機械的に**。
- **実行時（Firestoreのみ）**: 動的価格の実値・A/B・閲覧数 — MDに持たない。
- llms.txt と本ページの数値は**同一Firestore源**（1円もズレない・§8-3③）。

> **要追加フィールド（現スキーマの不足）**: `direct_answer` / `hreflang_cluster` / `canonical` / `bot_allow`。これらを `_template.md` のフロントマターに足すと、出力コントラクトが全記事で自動的に効く。

---

## 迷わせない・品質ゲート チェック

- [x] 消す離脱理由を明示（**高いかも**）
- [x] 自社面限定へ手渡し（GB診断・条件別最安はこのページ限定＝AIに漏れない）
- [x] 冒頭3行に定義文＋数値＋確認日（AI引用条件）
- [x] 正直な但し書き（競合が勝つ条件）＝透明性で信頼
- [x] /buy?ref= ＋ Airalo差ウィジェット
- [x] 価格は単一ソース・取得日時明示（要件③）
- [ ] **公開前に潰す**: 競合サンプル値を実データに置換／各社ローミング実査／FAQのSchema実装
