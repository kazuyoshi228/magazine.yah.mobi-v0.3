/**
 * Firestore シード: 記事「福岡ラーメン・もつ鍋巡り」（旧 seed-article32.mjs の移植）
 *
 * - articles/fukuoka-ramen-motsu-nabe-guide を作成/上書き
 * - 本文中の旧ストレージ画像（/manus-storage/*）を現行サイトから取得して
 *   Firebase Storage にミラーし、URL を書き換える（取得失敗時は旧URLのまま警告）
 *
 * 認証: GOOGLE_APPLICATION_CREDENTIALS または gcloud ADC
 * 実行: node scripts/seed-firestore.mjs
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";

const PROJECT_ID = process.env.SEED_PROJECT_ID ?? "magazine-yah-mobi";
const BUCKET = process.env.STORAGE_BUCKET ?? `${PROJECT_ID}.firebasestorage.app`;
const LIVE_ORIGIN = "https://magazine.yah.mobi"; // 旧サイトが生きている間に画像を回収する

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID, storageBucket: BUCKET });
const db = getFirestore();
const bucket = getStorage().bucket();

// ─── 旧画像のミラー ────────────────────────────────────────────────────────────
const LEGACY_IMAGES = [
  "/manus-storage/ramen-shop-lantern_58d579b1.jpg",
  "/manus-storage/ramen-shop-crowded_bdd1838f.jpg",
  "/manus-storage/ramen-shop-night-tokyo_f041b974.jpg",
];

async function mirrorImage(legacyPath) {
  const url = `${LIVE_ORIGIN}${legacyPath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const dest = `images/${legacyPath.split("/").pop()}`;
  const token = randomUUID();
  await bucket.file(dest).save(buf, {
    metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
}

const urlMap = {};
for (const p of LEGACY_IMAGES) {
  try {
    urlMap[p] = await mirrorImage(p);
    console.log(`📷 mirrored: ${p}`);
  } catch (e) {
    console.warn(`⚠️ 画像取得失敗（旧URLのまま継続）: ${p} — ${e.message}`);
  }
}
const rewrite = (s) => Object.entries(urlMap).reduce((acc, [from, to]) => acc.replaceAll(from, to), s);

// ─── 記事コンテンツ（日本語・本文はHTML） ──────────────────────────────────────
const slug = "fukuoka-ramen-motsu-nabe-guide";
const title = "福岡ラーメン・もつ鍋巡り——屋台文化とスマホナビの完全ガイド";
const excerpt =
  "博多豚骨の名店から中洲の屋台、もつ鍋の老舗まで。Google Mapsとスマホナビを駆使して福岡グルメを完全攻略するための実践ガイド。";
const directAnswer =
  "福岡グルメの核心は「博多豚骨ラーメン」「もつ鍋」「中洲の屋台」の3つ。大砲ラーメン本店（久留米）や楽天地（天神）など地元の名店は路地裏や繁華街の外に多く、Google Mapsのナビと安定したデータ通信があれば1泊2日で効率よく巡れる。屋台は19時以降開店・現金払いが基本。";
const metaTitle = "福岡ラーメン・もつ鍋巡り完全ガイド——屋台文化とスマホナビで名店を制覇 | magazine.yah.mobi";
const metaDescription =
  "大砲ラーメン・一双・ぶっとびなど博多豚骨の名店から、中洲の屋台、もつ鍋の老舗まで。Google MapsとeSIMを活用した福岡グルメ完全攻略ガイド。住所・Google Mapsリンク付き。";

const body = rewrite(`
<p>福岡は、日本で最も「食で旅する」価値のある都市のひとつだ。博多豚骨ラーメン、もつ鍋、屋台文化——どれも他の都市では味わえない固有の食文化である。しかし、名店は観光スポットから外れた路地裏に潜んでいることが多く、スマホナビなしでは辿り着けない場合も少なくない。本記事では、現地に精通したチームが厳選した福岡グルメの名店と、スマホを使った効率的な巡り方を徹底解説する。</p>

<h2>博多豚骨ラーメン——昔ながらの名店4選</h2>

<p>博多ラーメンの真髄は、白濁した豚骨スープと極細麺の組み合わせにある。観光客向けにアレンジされた店ではなく、地元の常連が通い続ける「本物」を選んだ。</p>

<img src="/manus-storage/ramen-shop-lantern_58d579b1.jpg" alt="昔ながらの提灯が並ぶラーメン店の外観" style="width:100%;border-radius:8px;margin:1.5rem 0;" />
<p style="font-size:0.75rem;color:#aaa;text-align:right;margin-top:-0.75rem;">Photo by Pexels / Free License</p>

<h3>大砲ラーメン 本店（久留米）</h3>
<p>1953年創業。博多豚骨の源流とも言われる久留米ラーメンの老舗中の老舗。白濁した濃厚スープは、70年以上継ぎ足し続けた「呼び戻しスープ」から生まれる。福岡市内からは電車で約40分だが、ラーメン好きなら必ず訪れるべき一軒だ。</p>
<ul>
  <li><strong>住所：</strong>福岡県久留米市通外町12-8</li>
  <li><strong>営業時間：</strong>11:00〜21:00（月曜定休）</li>
  <li><a href="https://maps.google.com/?q=大砲ラーメン+久留米" target="_blank" rel="noopener">Google Mapsで開く →</a></li>
</ul>

<h3>ラーメン一双（博多区）</h3>
<p>博多駅から徒歩圏内にありながら、地元客の支持が厚い一軒。豚骨100%の白濁スープに、博多伝統の極細麺。替え玉文化を初めて体験するなら、ここが最適だ。行列ができることも多いが、回転が速いので待ち時間は短い。</p>
<ul>
  <li><strong>住所：</strong>福岡県福岡市博多区博多駅前3-23-12</li>
  <li><strong>営業時間：</strong>11:00〜翌3:00（無休）</li>
  <li><a href="https://maps.google.com/?q=ラーメン一双+博多" target="_blank" rel="noopener">Google Mapsで開く →</a></li>
</ul>

<h3>ぶっとびラーメン（中央区）</h3>
<p>その名の通り「ぶっとぶ」ほど濃厚な豚骨スープが特徴。深夜まで営業しているため、屋台巡りの締めとして訪れる地元客も多い。カウンター席のみのこぢんまりとした店構えが、昭和の博多ラーメン店の雰囲気を今に伝えている。</p>
<ul>
  <li><strong>住所：</strong>福岡県福岡市中央区大名2-1-28</li>
  <li><strong>営業時間：</strong>18:00〜翌4:00（日曜定休）</li>
  <li><a href="https://maps.google.com/?q=ぶっとびラーメン+福岡" target="_blank" rel="noopener">Google Mapsで開く →</a></li>
</ul>

<h3>はっちゃんラーメン（博多区）</h3>
<p>博多の下町・住吉エリアに店を構える老舗。観光客よりも地元の職人や会社員が多く通う、飾り気のない一軒だ。シンプルな豚骨ラーメンに、卓上の辛子高菜・ごまをたっぷり加えるのが博多流の食べ方。</p>
<ul>
  <li><strong>住所：</strong>福岡県福岡市博多区住吉3-1-6</li>
  <li><strong>営業時間：</strong>11:30〜15:00 / 18:00〜22:00（日曜定休）</li>
  <li><a href="https://maps.google.com/?q=はっちゃんラーメン+博多" target="_blank" rel="noopener">Google Mapsで開く →</a></li>
</ul>

<h2>もつ鍋——福岡が誇る冬の名物鍋</h2>

<p>もつ鍋は、牛や豚のホルモン（もつ）をニラ・キャベツとともに醤油または味噌ベースのスープで煮込む福岡発祥の鍋料理だ。コラーゲンたっぷりのスープは、一度食べたら忘れられない深みがある。</p>

<img src="/manus-storage/ramen-shop-crowded_bdd1838f.jpg" alt="夜の繁盛店に並ぶ人々" style="width:100%;border-radius:8px;margin:1.5rem 0;" />
<p style="font-size:0.75rem;color:#aaa;text-align:right;margin-top:-0.75rem;">Photo by Pexels / Free License</p>

<h3>楽天地（中央区）</h3>
<p>1946年創業、もつ鍋の元祖とも言われる老舗。醤油ベースのあっさりしたスープに、新鮮なもつとたっぷりのニラが入る。予約必須の人気店だが、Google Mapsから日本語・英語で予約できる。</p>
<ul>
  <li><strong>住所：</strong>福岡県福岡市中央区天神4-2-20</li>
  <li><strong>営業時間：</strong>17:00〜23:00（月曜定休）</li>
  <li><a href="https://maps.google.com/?q=楽天地+もつ鍋+福岡" target="_blank" rel="noopener">Google Mapsで開く →</a></li>
</ul>

<h3>もつ鍋 一藤（博多区）</h3>
<p>博多駅から徒歩5分。観光客にも利用しやすいアクセスの良さと、本格的なもつ鍋の味を両立している。味噌・醤油・塩の3種類のスープから選べる。</p>
<ul>
  <li><strong>住所：</strong>福岡県福岡市博多区博多駅前2-8-12</li>
  <li><strong>営業時間：</strong>17:00〜23:30（無休）</li>
  <li><a href="https://maps.google.com/?q=もつ鍋一藤+博多" target="_blank" rel="noopener">Google Mapsで開く →</a></li>
</ul>

<h2>中洲の屋台——福岡の夜を彩る食文化</h2>

<p>中洲川端エリアに広がる屋台街は、福岡を代表する夜の食文化だ。ラーメン・おでん・焼き鳥・中華まで、約100軒の屋台が那珂川沿いに並ぶ。観光客にも地元客にも開かれた場所だが、いくつかのマナーを知っておくと、より楽しめる。</p>

<img src="/manus-storage/ramen-shop-night-tokyo_f041b974.jpg" alt="夜のラーメン街の賑わい" style="width:100%;border-radius:8px;margin:1.5rem 0;" />
<p style="font-size:0.75rem;color:#aaa;text-align:right;margin-top:-0.75rem;">Photo by Pexels / Free License</p>

<h3>屋台の楽しみ方——スマホ活用術</h3>
<ul>
  <li><strong>Google Mapsで「中洲屋台」と検索：</strong>現在地から最寄りの屋台街まで徒歩ルートを表示。夜間の屋台は19時以降に開店するものが多い。</li>
  <li><strong>食べログ・ぐるなびで事前チェック：</strong>人気屋台は口コミが豊富。写真で雰囲気を確認してから訪問できる。</li>
  <li><strong>Google翻訳カメラ：</strong>メニューが日本語のみの場合でも、カメラをかざすだけでリアルタイム翻訳が可能。</li>
  <li><strong>現金を用意：</strong>屋台の多くはキャッシュレス非対応。事前にコンビニATMで現金を引き出しておこう。</li>
</ul>

<h2>スマホナビで効率よく回るモデルルート</h2>

<p>福岡グルメを1泊2日で効率よく巡るためのモデルルートを提案する。移動はすべて地下鉄・徒歩で完結できる。</p>

<table style="width:100%;border-collapse:collapse;margin:1.5rem 0;">
  <thead>
    <tr style="background:#f5f5f5;">
      <th style="padding:0.75rem;text-align:left;border:1px solid #ddd;">時間帯</th>
      <th style="padding:0.75rem;text-align:left;border:1px solid #ddd;">スポット</th>
      <th style="padding:0.75rem;text-align:left;border:1px solid #ddd;">移動手段</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:0.75rem;border:1px solid #ddd;">1日目 昼</td>
      <td style="padding:0.75rem;border:1px solid #ddd;">ラーメン一双（博多駅前）</td>
      <td style="padding:0.75rem;border:1px solid #ddd;">博多駅から徒歩5分</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:0.75rem;border:1px solid #ddd;">1日目 夜</td>
      <td style="padding:0.75rem;border:1px solid #ddd;">中洲屋台街（ラーメン・おでん）</td>
      <td style="padding:0.75rem;border:1px solid #ddd;">地下鉄中洲川端駅から徒歩3分</td>
    </tr>
    <tr>
      <td style="padding:0.75rem;border:1px solid #ddd;">2日目 昼</td>
      <td style="padding:0.75rem;border:1px solid #ddd;">はっちゃんラーメン（住吉）</td>
      <td style="padding:0.75rem;border:1px solid #ddd;">地下鉄祇園駅から徒歩5分</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:0.75rem;border:1px solid #ddd;">2日目 夜</td>
      <td style="padding:0.75rem;border:1px solid #ddd;">もつ鍋 楽天地（天神）</td>
      <td style="padding:0.75rem;border:1px solid #ddd;">地下鉄天神駅から徒歩5分</td>
    </tr>
  </tbody>
</table>

<h2>福岡グルメ巡りに欠かせないeSIMの準備</h2>

<p>Google Mapsのナビ、食べログでの口コミ確認、Google翻訳カメラ——これらすべては安定したモバイルデータ通信があってこそ機能する。福岡到着後すぐにスマホナビを使い始めるためには、日本到着前にeSIMを設定しておくことが最も確実な方法だ。</p>

<p>yah.mobileのeSIMは、出発前にオンラインで購入・設定が完了し、日本到着と同時に自動接続される。空港のSIMカード販売店に並ぶ必要もなく、ポケットWi-Fiを返却する手間もない。福岡グルメを最大限に楽しむための「通信インフラ」として、ぜひ検討してほしい。</p>

<div style="background:#F7F7F7;border-left:4px solid #000000;padding:1.25rem 1.5rem;border-radius:0 4px 4px 0;margin:2rem 0;">
  <p style="margin:0;font-weight:600;">📱 yah.mobileのeSIMで福岡グルメを快適に</p>
  <p style="margin:0.5rem 0 0;">日本到着前に設定完了。空港に着いた瞬間からGoogle Mapsが使える。</p>
  <a href="https://yah.mobi/app" target="_blank" rel="noopener" style="display:inline-block;margin-top:0.75rem;background:#000000;color:#fff;padding:0.5rem 1.25rem;border-radius:2px;text-decoration:none;font-weight:600;letter-spacing:0.04em;">yah.mobileを見る →</a>
</div>

<h2>福岡に泊まるなら——yah.homesのご紹介</h2>

<p>中洲・天神・博多駅エリアへのアクセスが良く、グループ旅行にも対応した一棟貸しの宿泊施設をお探しなら、yah.homesをご覧いただきたい。キッチン付きの物件では、地元スーパーで購入した食材を使ってもつ鍋を自炊することも可能だ。</p>

<div style="background:#F7F7F7;border-left:4px solid #000000;padding:1.25rem 1.5rem;border-radius:0 4px 4px 0;margin:2rem 0;">
  <p style="margin:0;font-weight:600;">🏠 yah.homes — 福岡の一棟貸し宿泊施設</p>
  <p style="margin:0.5rem 0 0;">清川・高砂エリアを中心に、グループ旅行・長期滞在に対応した物件を展開。</p>
  <a href="https://yah.homes" target="_blank" rel="noopener" style="display:inline-block;margin-top:0.75rem;background:#000000;color:#fff;padding:0.5rem 1.25rem;border-radius:2px;text-decoration:none;font-weight:600;letter-spacing:0.04em;">yah.homesを見る →</a>
</div>
`.trim());

// ─── Firestore へ書き込み ──────────────────────────────────────────────────────
const now = Date.now();
const thumbnailUrl = urlMap["/manus-storage/ramen-shop-lantern_58d579b1.jpg"] ?? `${LIVE_ORIGIN}/manus-storage/ramen-shop-lantern_58d579b1.jpg`;

const ref = db.collection("articles").doc(slug);
const existing = await ref.get();

await ref.set(
  {
    slug,
    categorySlug: "gourmet",
    schemaType: "Article",
    status: "published",
    thumbnailUrl,
    publishedAt: existing.exists ? (existing.data().publishedAt ?? now) : now,
    createdAt: existing.exists ? (existing.data().createdAt ?? now) : now,
    updatedAt: now,
    languages: ["ja"],
    translations: {
      ja: { title, excerpt, body, directAnswer, metaTitle, metaDescription },
    },
  },
  { merge: false },
);

console.log(`\n✅ シード完了: articles/${slug}`);
console.log(`   URL: /articles/${slug}`);
