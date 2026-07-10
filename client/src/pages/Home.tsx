import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Wifi, UtensilsCrossed, MapPin, Cpu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listPublishedArticles } from "@/lib/db";
import SeoHead from "@/components/SeoHead";
import type { Lang } from "@/components/Header";
import { useAnalytics } from "@/hooks/useAnalytics";

interface HomeProps {
  lang: Lang;
}

const HERO_COPY: Record<Lang, { eyebrow: string; headline: string; sub: string }> = {
  ja: {
    eyebrow: "Japan Travel Guide",
    headline: "Read Here.\nGo There.",
    sub: "通信・ガジェット・グルメ・旅行情報を通じて、日本旅行をより豊かにするコンテンツをお届けします。",
  },
  en: {
    eyebrow: "Japan Travel Guide",
    headline: "Read Here.\nGo There.",
    sub: "eSIM, gadgets, gourmet tips, and travel insights to make your Japan trip richer.",
  },
  ko: {
    eyebrow: "Japan Travel Guide",
    headline: "Read Here.\nGo There.",
    sub: "통신·가젯·맛집·여행 정보를 통해 일본 여행을 더욱 풍요롭게 만드는 콘텐츠를 전달합니다.",
  },
  "zh-TW": {
    eyebrow: "Japan Travel Guide",
    headline: "Read Here.\nGo There.",
    sub: "透過通訊、數位裝置、美食與旅遊資訊，為您的日本之旅帶來更豐富的體驗。",
  },
};

const CATEGORY_COPY: Record<Lang, { esim: string; gadget: string; gourmet: string; travel: string; latest: string; viewAll: string }> = {
  ja: { esim: "eSIM通信基盤", gadget: "ガジェット", gourmet: "グルメ×通信", travel: "旅行×通信", latest: "最新記事", viewAll: "すべて見る" },
  en: { esim: "eSIM & Connectivity", gadget: "Gadgets", gourmet: "Gourmet & Connectivity", travel: "Travel & Connectivity", latest: "Latest Articles", viewAll: "View All" },
  ko: { esim: "eSIM 통신", gadget: "가젯", gourmet: "맛식 × 통신", travel: "여행 × 통신", latest: "최신 기사", viewAll: "전체 보기" },
  "zh-TW": { esim: "eSIM通訊", gadget: "數位裝置", gourmet: "美食×通訊", travel: "旅行×通訊", latest: "最新文章", viewAll: "查看全部" },
};

const CTA_COPY: Record<Lang, { eyebrow: string; headline: string; sub: string; btn: string }> = {
  ja: {
    eyebrow: "yah.mobile",
    headline: "日本のどこでも、\nつながり続ける。",
    sub: "KDDI回線対応のeSIM。空港に着いた瞬間から、QRコードをスキャンするだけで全国どこでも接続できます。",
    btn: "eSIMを購入",
  },
  en: {
    eyebrow: "yah.mobile",
    headline: "Stay connected\nacross Japan.",
    sub: "Japan eSIM powered by KDDI. Scan a QR code and you're online the moment you land.",
    btn: "Buy eSIM",
  },
  ko: {
    eyebrow: "yah.mobile",
    headline: "일본 어디서나\n연결되세요.",
    sub: "KDDI 네트워크 기반 일본 eSIM. QR 코드 스캔만으로 공항 도착 즉시 연결됩니다.",
    btn: "eSIM 구매",
  },
  "zh-TW": {
    eyebrow: "yah.mobile",
    headline: "在日本隨時\n保持連線。",
    sub: "KDDI 網路支援的日本 eSIM。掃描 QR 碼，抵達日本即刻上線。",
    btn: "購買eSIM",
  },
};

const HOMES_COPY: Record<Lang, { eyebrow: string; headline: string; sub: string; btn: string }> = {
  ja: {
    eyebrow: "yah.homes",
    headline: "福岡の暮らしを、\n旅人へ。",
    sub: "地元に根ざした宿泊体験。福岡の文化・食・人と出会う、yah.homesのステイをご体験ください。",
    btn: "宿泊を探す",
  },
  en: {
    eyebrow: "yah.homes",
    headline: "Live like a local\nin Fukuoka.",
    sub: "Authentic stays rooted in local culture. Discover Fukuoka's food, people, and neighborhoods.",
    btn: "Find a Stay",
  },
  ko: {
    eyebrow: "yah.homes",
    headline: "후쿠오카에서\n현지인처럼 살아보세요.",
    sub: "현지 문화에 뿌리를 둔 숙박 경험. 후쿠오카의 음식, 사람, 동네를 발견하세요.",
    btn: "숙소 찾기",
  },
  "zh-TW": {
    eyebrow: "yah.homes",
    headline: "在福岡\n像當地人一樣生活。",
    sub: "植根於在地文化的住宿體驗。探索福岡的美食、人情與街道。",
    btn: "尋找住宿",
  },
};

const SUBSCRIBE_COPY: Record<Lang, { eyebrow: string; headline: string; sub: string }> = {
  ja: { eyebrow: "Newsletter", headline: "最新情報をお届けします。", sub: "日本旅行に役立つeSIM・グルメ・旅行情報を定期的にお届けします。" },
  en: { eyebrow: "Newsletter", headline: "Stay in the loop.", sub: "Get the latest eSIM guides, gourmet tips, and travel insights for Japan." },
  ko: { eyebrow: "Newsletter", headline: "최신 정보를 받아보세요.", sub: "일본 여행에 유용한 eSIM, 맛집, 여행 정보를 정기적으로 전달합니다." },
  "zh-TW": { eyebrow: "Newsletter", headline: "掌握最新資訊。", sub: "定期獲取日本旅遊的 eSIM 指南、美食推薦與旅遊資訊。" },
};

const CATEGORY_ICONS = {
  esim: <Wifi size={16} strokeWidth={1.5} />,
  gadget: <Cpu size={16} strokeWidth={1.5} />,
  gourmet: <UtensilsCrossed size={16} strokeWidth={1.5} />,
  travel: <MapPin size={16} strokeWidth={1.5} />,
};

function ArticleCard({ article, lang }: { article: any; lang: Lang }) {
  const catName =
    lang === "ja" ? article.categoryNameJa :
    lang === "en" ? article.categoryNameEn :
    lang === "ko" ? article.categoryNameKo :
    article.categoryNameZhTw;

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(
        lang === "ja" ? "ja-JP" : lang === "ko" ? "ko-KR" : lang === "zh-TW" ? "zh-TW" : "en-US",
        { year: "numeric", month: "short", day: "numeric" }
      )
    : "";

  return (
    <Link href={`/articles/${article.slug}`}>
      <article className="article-card" style={{ cursor: "pointer" }}>
        {/* Thumbnail */}
        <div
          style={{
            aspectRatio: "16/9",
            backgroundColor: "#EBEBEB",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {article.thumbnailUrl ? (
            <img
              src={article.thumbnailUrl}
              alt={article.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#999999",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="8" width="24" height="16" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="11" cy="14" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 20L10 15L15 19L20 14L28 20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
        {/* Content */}
        <div style={{ padding: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.625rem",
            }}
          >
            <span
              style={{
                fontSize: "0.625rem",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#555555",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              {CATEGORY_ICONS[article.categorySlug as keyof typeof CATEGORY_ICONS]}
              {catName}
            </span>
            {date && (
              <>
                <span style={{ color: "#D7D7D7", fontSize: "0.625rem" }}>·</span>
                <span style={{ fontSize: "0.625rem", color: "#999999" }}>{date}</span>
              </>
            )}
          </div>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 500,
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              color: "#000000",
              margin: 0,
              marginBottom: "0.5rem",
            }}
          >
            {article.title}
          </h3>
          {article.excerpt && (
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.6,
                color: "#555555",
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {article.excerpt}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

export default function Home({ lang }: HomeProps) {
  const hero = HERO_COPY[lang];
  const cat = CATEGORY_COPY[lang];
  const cta = CTA_COPY[lang];
  const homes = HOMES_COPY[lang];
  const sub = SUBSCRIBE_COPY[lang];

  const { trackCtaClick } = useAnalytics();

  const { data: esimArticles } = useQuery({
    queryKey: ["articles", "esim", lang],
    queryFn: () => listPublishedArticles({ categorySlug: "esim", lang, limit: 3 }),
  });
  const { data: gourmetArticles } = useQuery({
    queryKey: ["articles", "gourmet", lang],
    queryFn: () => listPublishedArticles({ categorySlug: "gourmet", lang, limit: 3 }),
  });
  const { data: travelArticles } = useQuery({
    queryKey: ["articles", "travel", lang],
    queryFn: () => listPublishedArticles({ categorySlug: "travel", lang, limit: 3 }),
  });
  const { data: latestArticles } = useQuery({
    queryKey: ["articles", "latest", lang],
    queryFn: () => listPublishedArticles({ lang, limit: 6 }),
  });

  const siteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "yah.magazine",
    url: "https://magazine.yah.mobi",
    description: hero.sub,
    inLanguage: lang,
  };

  const seoDescription: Record<Lang, string> = {
    ja: "博多豚骨ラーメン・もつ鍋・屋台から訪日eSIMまで。福岡・東京・京都など日本各地のグルメ・旅行・通信情報を現地目線でお届けするトラベルマガジンです。",
    en: "Japan travel magazine covering eSIM, gourmet spots, local guides, and gadgets. From Fukuoka ramen to Tokyo street food — plan smarter, travel richer.",
    ko: "일본 여행 매거진. 후쿠오카 라멘·모츠나베부터 도쿄 맛집, 교토 관광, 일본 eSIM까지 현지 시각으로 전달하는 트래블 가이드입니다.",
    "zh-TW": "日本旅遊雜誌，涵蓋福岡拉麵、東京美食、京都觀光及日本 eSIM 等旅遊通訊資訊，以在地視角為您提供最實用的旅遊指南。",
  };

  const seoKeywords: Record<Lang, string> = {
    ja: "日本旅行,eSIM,福岡ラーメン,もつ鍋,屋台,訪日,グルメ,旅行ガイド,yah.magazine",
    en: "Japan travel, eSIM Japan, Fukuoka ramen, Japan gourmet, travel guide, yah.magazine",
    ko: "일본여행, 일본eSIM, 후쿠오카라멘, 일본맛집, 여행가이드, yah.magazine",
    "zh-TW": "日本旅遊, 日本eSIM, 福岡拉麵, 日本美食, 旅遊指南, yah.magazine",
  };

  return (
    <>
      <SeoHead
        title={lang === "ja" ? "日本旅行ガイド — eSIM・グルメ・旅行情報" : "Japan Travel Guide — eSIM, Gourmet & Travel"}
        description={seoDescription[lang]}
        keywords={seoKeywords[lang]}
        schemaJson={siteSchema}
        lang={lang}
      />

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: "#F7F7F7",
          color: "#000000",
          paddingTop: "5rem",
          paddingBottom: "5rem",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid #D7D7D7",
        }}
      >
        {/* Subtle background texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(ellipse 80% 60% at 70% 50%, rgba(0,0,0,0.02) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          className="container hero-grid"
          style={{ position: "relative" }}
        >
          {/* Left: text */}
          <div>
            <p
              className="label-section animate-fade-in"
              style={{ marginBottom: "1.5rem" }}
            >
              {hero.eyebrow}
            </p>
            <h1
              className="headline-xl animate-fade-in stagger-1"
              style={{
                color: "#000000",
                whiteSpace: "pre-line",
                marginBottom: "1.5rem",
              }}
            >
              {hero.headline}
            </h1>
            <p
              className="body-lg animate-fade-in stagger-2"
              style={{
                color: "#555555",
                marginBottom: "2.5rem",
              }}
            >
              {hero.sub}
            </p>
            <div className="animate-fade-in stagger-3" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a
                href="https://yah.mobi/app"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "#000000",
                  color: "#FFFFFF",
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.75rem 1.75rem",
                  border: "1px solid #000000",
                  cursor: "pointer",
                  transition: "opacity 160ms",
                }}
              >
                {cta.btn}
                <ArrowRight size={13} strokeWidth={1.5} />
              </a>
              <Link
                href="/articles"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "transparent",
                  color: "#000000",
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.75rem 1.75rem",
                  border: "1px solid #D7D7D7",
                  cursor: "pointer",
                  transition: "border-color 160ms, color 160ms",
                }}
              >
                {cat.latest}
              </Link>
            </div>
          </div>

          {/* Right: hero image */}
          <div
            className="hero-image animate-fade-in stagger-2"
            style={{ display: "flex", justifyContent: "flex-end" }}
          >
            <img
              src="/manus-storage/sushi_anime_phone_d2d2cbfd.png"
              alt="Japan travel — eSIM, gourmet & travel guide"
              style={{
                width: "100%",
                maxWidth: "560px",
                height: "420px",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>
      </section>

      {/* ─── Latest Articles ──────────────────────────────────────────────── */}
      {latestArticles && latestArticles.length > 0 && (
        <section style={{ padding: "4rem 0", backgroundColor: "#F7F7F7" }}>
          <div className="container">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "2rem" }}>
              <div>
                <p className="label-section" style={{ marginBottom: "0.5rem" }}>{cat.latest}</p>
              </div>
              <Link
                href="/articles"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#555555",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  transition: "color 150ms",
                }}
              >
                {cat.viewAll} <ArrowRight size={12} strokeWidth={1.5} />
              </Link>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
                gap: "1.5rem",
              }}
            >
              {latestArticles.map((a, i) => (
                <div key={a.id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 4)}`}>
                  <ArticleCard article={a} lang={lang} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── eSIM Section ─────────────────────────────────────────────────── */}
      {esimArticles && esimArticles.length > 0 && (
        <section style={{ padding: "4rem 0", backgroundColor: "#FFFFFF" }}>
          <div className="container">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "2rem" }}>
              <div>
                <p className="label-section" style={{ marginBottom: "0.5rem" }}>{cat.esim}</p>
              </div>
              <Link
                href="/articles?category=esim"
                style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555555", display: "flex", alignItems: "center", gap: "0.375rem" }}
              >
                {cat.viewAll} <ArrowRight size={12} strokeWidth={1.5} />
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: "1.5rem" }}>
              {esimArticles.map((a) => <ArticleCard key={a.id} article={a} lang={lang} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── yah.mobile CTA Banner ────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: "#000000",
          color: "#FFFFFF",
          padding: "4rem 0",
          position: "relative",
          overflow: "hidden",
          backgroundImage: "url('/manus-storage/yah-mobile-bg_3cfb0835.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Subtle dark overlay to keep text readable */}
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 0 }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "2rem",
              alignItems: "center",
            }}
            className="md:grid-cols-2"
          >
            <div>
              <img
                src="/manus-storage/yah.mobile_logo_width_f8faa888.svg"
                alt="yah.mobile"
                style={{ height: "28px", width: "auto", marginBottom: "1.5rem", filter: "brightness(0) invert(1)" }}
              />
              <h2
                className="headline-lg"
                style={{ color: "#FFFFFF", whiteSpace: "pre-line", marginBottom: "1.25rem" }}
              >
                {cta.headline}
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "rgba(255,255,255,0.65)", marginBottom: "2rem", maxWidth: "440px" }}>
                {cta.sub}
              </p>
              <a
                href="https://yah.mobi/app"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCtaClick("yah_mobile")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "#FFFFFF",
                  color: "#000000",
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.875rem 2rem",
                  border: "1px solid #FFFFFF",
                  cursor: "pointer",
                  transition: "opacity 160ms",
                }}
              >
                {cta.btn}
                <ArrowRight size={13} strokeWidth={1.5} />
              </a>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {[
                lang === "ja" ? "✓ KDDI（4G/5G）回線対応" : "✓ KDDI (4G/5G) network",
                lang === "ja" ? "✓ QRコードをスキャンするだけ" : "✓ Scan QR code to activate",
                lang === "ja" ? "✓ 24/7 多言語サポート" : "✓ 24/7 multilingual support",
                lang === "ja" ? "✓ リアルタイム使用量確認" : "✓ Real-time usage tracking",
              ].map((feat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.9375rem", color: "rgba(255,255,255,0.75)" }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured Articles (between mobile & homes) ─────────────────── */}
      <section style={{ padding: "4rem 0", backgroundColor: "#F7F7F7", borderTop: "1px solid #D7D7D7" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "2rem" }}>
            <div>
              <p className="label-section" style={{ marginBottom: "0.25rem" }}>{cat.latest}</p>
            </div>
            <Link
              href="/articles"
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#555555",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                transition: "color 150ms",
              }}
            >
              {cat.viewAll} <ArrowRight size={12} strokeWidth={1.5} />
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
              gap: "1.5rem",
            }}
          >
            {latestArticles && latestArticles.length > 0
              ? latestArticles.slice(0, 2).map((a, i) => (
                  <div key={a.id} className={`animate-fade-in-up stagger-${i + 1}`}>
                    <ArticleCard article={a} lang={lang} />
                  </div>
                ))
              : [0, 1].map((i) => (
                  <div
                    key={i}
                    className={`animate-fade-in-up stagger-${i + 1}`}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D7D7D7",
                      padding: "2rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    {/* Thumbnail placeholder */}
                    <div
                      style={{
                        width: "100%",
                        height: "180px",
                        backgroundColor: "#EBEBEB",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", color: "#999999", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {lang === "ja" ? "記事画像" : "Article Image"}
                      </span>
                    </div>
                    {/* Category tag */}
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 500,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#999999",
                      }}
                    >
                      {lang === "ja" ? "カテゴリー" : "Category"}
                    </span>
                    {/* Title placeholder */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ height: "1.25rem", backgroundColor: "#EBEBEB", borderRadius: "2px", width: "85%" }} />
                      <div style={{ height: "1.25rem", backgroundColor: "#EBEBEB", borderRadius: "2px", width: "60%" }} />
                    </div>
                    {/* Excerpt placeholder */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                      <div style={{ height: "0.875rem", backgroundColor: "#F0F0F0", borderRadius: "2px", width: "100%" }} />
                      <div style={{ height: "0.875rem", backgroundColor: "#F0F0F0", borderRadius: "2px", width: "75%" }} />
                    </div>
                    {/* CTA hint */}
                    <p style={{ fontSize: "0.8125rem", color: "#BBBBBB", margin: 0, marginTop: "0.5rem" }}>
                      {lang === "ja" ? "記事投稿待ち" : "Coming soon"}
                    </p>
                  </div>
                ))
            }
          </div>
        </div>
      </section>

      {/* ─── Gourmet Section ──────────────────────────────────────────────── */}
      {gourmetArticles && gourmetArticles.length > 0 && (
        <section style={{ padding: "4rem 0", backgroundColor: "#F7F7F7" }}>
          <div className="container">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "2rem" }}>
              <p className="label-section">{cat.gourmet}</p>
              <Link href="/articles?category=gourmet" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555555", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                {cat.viewAll} <ArrowRight size={12} strokeWidth={1.5} />
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: "1.5rem" }}>
              {gourmetArticles.map((a) => <ArticleCard key={a.id} article={a} lang={lang} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── Travel Section ───────────────────────────────────────────────── */}
      {travelArticles && travelArticles.length > 0 && (
        <section style={{ padding: "4rem 0", backgroundColor: "#FFFFFF" }}>
          <div className="container">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "2rem" }}>
              <p className="label-section">{cat.travel}</p>
              <Link href="/articles?category=travel" style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555555", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                {cat.viewAll} <ArrowRight size={12} strokeWidth={1.5} />
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: "1.5rem" }}>
              {travelArticles.map((a) => <ArticleCard key={a.id} article={a} lang={lang} />)}
            </div>
          </div>
        </section>
      )}

      {/* ─── yah.homes CTA ────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "5rem 0",
          position: "relative",
          overflow: "hidden",
          backgroundImage: "url('/manus-storage/yah-homes-bg_151b3983.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Dark overlay for text readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            zIndex: 0,
          }}
        />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: "600px" }}>
            <img
              src="/manus-storage/logo_yah_CMYK_cifo_aa64f11d.svg"
              alt="yah.homes"
              style={{
                height: "80px",
                width: "auto",
                marginBottom: "1.5rem",
                display: "block",
                filter: "invert(1) brightness(2)",
              }}
            />
            <h2
              className="headline-lg"
              style={{ whiteSpace: "pre-line", marginBottom: "1.25rem", color: "#FFFFFF" }}
            >
              {homes.headline}
            </h2>
            <p
              style={{
                fontSize: "1rem",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.75)",
                marginBottom: "2rem",
              }}
            >
              {homes.sub}
            </p>
            <a
              href="https://yah.homes"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("yah_homes")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "transparent",
                color: "#FFFFFF",
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0.75rem 1.75rem",
                border: "1px solid rgba(255,255,255,0.7)",
                cursor: "pointer",
                transition: "all 160ms",
                textDecoration: "none",
              }}
            >
              {homes.btn}
              <ArrowRight size={13} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </section>

      {/* ─── Newsletter Subscribe ─────────────────────────────────────────── */}
      {/* Newsletter section — hidden */}
    </>
  );
}
