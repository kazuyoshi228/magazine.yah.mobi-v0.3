import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import SeoHead from "@/components/SeoHead";
import type { Lang } from "@/components/Header";
import { Wifi, UtensilsCrossed, MapPin, Cpu } from "lucide-react";

interface ArticleListProps {
  lang: Lang;
}

const PAGE_COPY: Record<Lang, {
  title: string;
  desc: string;
  keywords: string;
  all: string;
  esim: string;
  gadget: string;
  gourmet: string;
  travel: string;
  langFilter: string;
  noArticles: string;
  loading: string;
}> = {
  ja: {
    title: "記事一覧",
    desc: "日本旅行に役立つeSIM・ガジェット・グルメ・旅行情報を現地目線で発信。福岡ラーメン、もつ鍋、屋台、訪日eSIMなど実用的なガイドを掲載しています。",
    keywords: "日本旅行,eSIM,福岡ラーメン,もつ鍋,屋台,訪日,グルメ,旅行ガイド,ガジェット",
    all: "すべて",
    esim: "eSIM通信",
    gadget: "ガジェット",
    gourmet: "グルメ",
    travel: "旅行",
    langFilter: "言語",
    noArticles: "記事がまだありません。",
    loading: "読み込み中...",
  },
  en: {
    title: "Articles",
    desc: "Japan travel guides covering eSIM, gadgets, gourmet spots, and travel tips. Practical local insights for your next Japan trip.",
    keywords: "Japan travel, eSIM Japan, Fukuoka ramen, Japan gourmet, gadgets, travel guide",
    all: "All",
    esim: "eSIM",
    gadget: "Gadgets",
    gourmet: "Gourmet",
    travel: "Travel",
    langFilter: "Language",
    noArticles: "No articles yet.",
    loading: "Loading...",
  },
  ko: {
    title: "기사 목록",
    desc: "일본 여행에 유용한 eSIM, 가젯, 맛집, 여행 정보를 현지 시각으로 전달합니다. 후쿠오카 라멘부터 일본 eSIM까지 실용적인 가이드를 제공합니다.",
    keywords: "일본여행, 일본eSIM, 후쿠오카라멘, 일본맛집, 여행가이드, 가젯",
    all: "전체",
    esim: "eSIM",
    gadget: "가젯",
    gourmet: "맛식",
    travel: "여행",
    langFilter: "언어",
    noArticles: "아직 기사가 없습니다.",
    loading: "로딩 중...",
  },
  "zh-TW": {
    title: "文章列表",
    desc: "日本旅遊實用指南，涵蓋 eSIM、數位裝置、美食及旅遊資訊。從福岡拉麵到日本 eSIM，提供最實用的旅遊建議。",
    keywords: "日本旅遊, 日本eSIM, 福岡拉麵, 日本美食, 旅遊指南, 數位裝置",
    all: "全部",
    esim: "eSIM",
    gadget: "數位裝置",
    gourmet: "美食",
    travel: "旅遊",
    langFilter: "語言",
    noArticles: "暫無文章。",
    loading: "載入中...",
  },
};

const LANG_LABELS: Record<Lang, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어",
  "zh-TW": "繁體中文",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  esim: <Wifi size={14} strokeWidth={1.5} />,
  gadget: <Cpu size={14} strokeWidth={1.5} />,
  gourmet: <UtensilsCrossed size={14} strokeWidth={1.5} />,
  travel: <MapPin size={14} strokeWidth={1.5} />,
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
        <div style={{ aspectRatio: "16/9", backgroundColor: "#EBEBEB", overflow: "hidden" }}>
          {article.thumbnailUrl ? (
            <img src={article.thumbnailUrl} alt={article.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999999" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="8" width="24" height="16" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="11" cy="14" r="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 20L10 15L15 19L20 14L28 20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
        <div style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
            <span style={{ fontSize: "0.625rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555555", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              {CATEGORY_ICONS[article.categorySlug]}
              {catName}
            </span>
            {date && (
              <>
                <span style={{ color: "#D7D7D7", fontSize: "0.625rem" }}>·</span>
                <span style={{ fontSize: "0.625rem", color: "#999999" }}>{date}</span>
              </>
            )}
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 500, lineHeight: 1.4, letterSpacing: "-0.01em", color: "#000000", margin: 0, marginBottom: "0.5rem" }}>
            {article.title}
          </h3>
          {article.excerpt && (
            <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#555555", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {article.excerpt}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

export default function ArticleList({ lang }: ArticleListProps) {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialCategory = params.get("category") || "";

  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [langFilter, setLangFilter] = useState<Lang>(lang);

  useEffect(() => {
    setLangFilter(lang);
  }, [lang]);

  const copy = PAGE_COPY[lang];

  const { data: articles, isLoading } = trpc.articles.list.useQuery({
    categorySlug: categoryFilter || undefined,
    lang: langFilter,
    limit: 50,
    offset: 0,
  });

  const categories = [
    { slug: "", label: copy.all, icon: null },
    { slug: "esim", label: copy.esim, icon: CATEGORY_ICONS.esim },
    { slug: "gadget", label: copy.gadget, icon: CATEGORY_ICONS.gadget },
    { slug: "gourmet", label: copy.gourmet, icon: CATEGORY_ICONS.gourmet },
    { slug: "travel", label: copy.travel, icon: CATEGORY_ICONS.travel },
  ];

  // Dynamic SEO based on active category filter
  const CATEGORY_SEO: Record<string, Record<Lang, { title: string; desc: string; keywords: string }>> = {
    esim: {
      ja: { title: "eSIM・通信記事一覧", desc: "日本訪問にeSIMは必須。KDDI回線対応の訪日eSIMの選び方・設定方法・おすすめプランを詳しく解説します。", keywords: "eSIM,訪日eSIM,日本eSIM,KDDI,SIMカード,通信" },
      en: { title: "eSIM & Connectivity Guides", desc: "Everything you need to know about Japan eSIM. Compare plans, setup guides, and tips for staying connected across Japan.", keywords: "Japan eSIM, eSIM Japan, KDDI eSIM, Japan SIM card, connectivity" },
      ko: { title: "eSIM · 통신 가이드", desc: "일본 eSIM 선택법부터 설정 방법까지. 일본 어디서나 연결되는 eSIM 가이드입니다.", keywords: "일본eSIM, 일본유심, 일본통신, KDDI" },
      "zh-TW": { title: "eSIM · 通訊指南", desc: "日本 eSIM 選購指南、設定教學及最佳方案推薦，讓您在日本隨時保持連線。", keywords: "日本eSIM, 日本SIM卡, KDDI, 日本通訊" },
    },
    gadget: {
      ja: { title: "ガジェット記事一覧", desc: "旅行を快適にするガジェット・テクノロジー情報。モバイルバッテリー、イヤホン、カメラなど旅行に役立つガジェットを紹介。", keywords: "ガジェット,旅行ガジェット,モバイルバッテリー,イヤホン,カメラ" },
      en: { title: "Gadget & Tech Guides", desc: "Best travel gadgets and tech gear for Japan trips. From portable batteries to cameras and earphones for the modern traveler.", keywords: "travel gadgets, Japan tech, portable battery, earphones, camera" },
      ko: { title: "가젯 · 테크 가이드", desc: "일본 여행을 편리하게 해주는 가젯 정보. 포터블 배터리부터 이어폰까지 여행 필수 가젯을 소개합니다.", keywords: "여행가젯, 일본테크, 포터블배터리, 이어폰" },
      "zh-TW": { title: "數位裝置指南", desc: "旅遊必備數位裝置推薦，包括行動電源、耳機、相機等旅行必備科技產品。", keywords: "旅遊數位裝置, 日本科技, 行動電源, 耳機" },
    },
    gourmet: {
      ja: { title: "グルメ記事一覧", desc: "福岡ラーメン・もつ鍋・屋台、東京ストリートフードなど日本各地のグルメ情報。現地取材に基づいた実用的なグルメガイド。", keywords: "福岡ラーメン,もつ鍋,屋台,日本グルメ,訪日グルメ,居酒屋" },
      en: { title: "Japan Gourmet Guides", desc: "Discover the best food in Japan. Fukuoka ramen, motsu nabe, yatai street food, Tokyo eats and more — curated by local food lovers.", keywords: "Fukuoka ramen, Japan food, motsu nabe, yatai, Japan gourmet, street food" },
      ko: { title: "일본 맛집 가이드", desc: "후쿠오카 라멘·모츠나베·야타이부터 도쿄 맛집까지. 현지 시각으로 제안하는 일본 미식 가이드입니다.", keywords: "후쿠오카라멘, 모츠나베, 야타이, 일본맛집, 일본미식" },
      "zh-TW": { title: "日本美食指南", desc: "福岡拉麵、内臟火锅、屋台街頭美食到東京美食，由居民美食愛好者精心整理的日本美食指南。", keywords: "福岡拉麵, 内臟火锅, 屋台, 日本美食, 美食指南" },
    },
    travel: {
      ja: { title: "旅行記事一覧", desc: "福岡・東京・京都など日本各地の旅行ガイド。アクセス方法・観光スポット・実用情報を現地目線でお届け。", keywords: "日本旅行,福岡観光,東京観光,京都観光,旅行ガイド,訪日" },
      en: { title: "Japan Travel Guides", desc: "Comprehensive travel guides for Japan. Fukuoka, Tokyo, Kyoto and beyond — access tips, sightseeing spots, and practical travel info.", keywords: "Japan travel, Fukuoka travel, Tokyo travel, Kyoto travel, Japan sightseeing" },
      ko: { title: "일본 여행 가이드", desc: "후쿠오카·도쿄·교토 등 일본 여행 가이드. 교통편의점부터 관광지까지 현지 시각으로 안내합니다.", keywords: "일본여행, 후쿠오카여행, 도쿄여행, 교토여행, 일본관광" },
      "zh-TW": { title: "日本旅遊指南", desc: "福岡、東京、京都等日本各地旅遊指南。交通資訊、景點推薦及實用旅行建議一次準備就緒。", keywords: "日本旅遊, 福岡旅遊, 東京旅遊, 京都旅遊, 日本觀光" },
    },
  };

  const activeCatSeo = categoryFilter ? CATEGORY_SEO[categoryFilter]?.[lang] : null;
  const seoTitle = activeCatSeo?.title ?? copy.title;
  const seoDesc = activeCatSeo?.desc ?? copy.desc;
  const seoKeywords = activeCatSeo?.keywords ?? copy.keywords;

  return (
    <>
      <SeoHead title={seoTitle} description={seoDesc} keywords={seoKeywords} lang={lang} />

      {/* Page header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #D7D7D7", padding: "2.5rem 0 0" }}>
        <div className="container">
          <p className="label-section" style={{ marginBottom: "0.5rem" }}>magazine.yah.mobi</p>
          <h1 className="headline-lg" style={{ marginBottom: "1.5rem" }}>{copy.title}</h1>

                    {/* Filters */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {/* Category tabs — horizontally scrollable on mobile, no wrap */}
            <div
              style={{
                display: "flex",
                gap: "0",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                marginLeft: "-1.5rem",
                marginRight: "-1.5rem",
                paddingLeft: "1.5rem",
                paddingRight: "1.5rem",
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setCategoryFilter(cat.slug)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    fontSize: "0.6875rem",
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    color: categoryFilter === cat.slug ? "#000000" : "#999999",
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${categoryFilter === cat.slug ? "#000000" : "transparent"}`,
                    padding: "0.75rem 1.25rem",
                    cursor: "pointer",
                    transition: "color 150ms, border-color 150ms",
                  }}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
            {/* Language filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 0", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>
                {copy.langFilter}:
              </span>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                {(["ja", "en", "ko", "zh-TW"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLangFilter(l)}
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 500,
                      padding: "0.25rem 0.625rem",
                      border: `1px solid ${langFilter === l ? "#000000" : "#D7D7D7"}`,
                      backgroundColor: langFilter === l ? "#000000" : "transparent",
                      color: langFilter === l ? "#FFFFFF" : "#555555",
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                  >
                    {l === "zh-TW" ? "繁中" : l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Article grid */}
      <div style={{ backgroundColor: "#F7F7F7", padding: "3rem 0", minHeight: "50vh" }}>
        <div className="container">
          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: "1.5rem" }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} style={{ backgroundColor: "#FFFFFF", border: "1px solid #D7D7D7", aspectRatio: "4/5" }}>
                  <div style={{ height: "56%", backgroundColor: "#EBEBEB" }} />
                  <div style={{ padding: "1.25rem" }}>
                    <div style={{ height: "0.5rem", backgroundColor: "#EBEBEB", marginBottom: "0.75rem", width: "40%" }} />
                    <div style={{ height: "1rem", backgroundColor: "#EBEBEB", marginBottom: "0.5rem" }} />
                    <div style={{ height: "0.875rem", backgroundColor: "#EBEBEB", width: "80%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : articles && articles.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: "1.5rem" }}>
              {articles.map((a, i) => (
                <div key={a.translationId} className={`animate-fade-in-up stagger-${Math.min((i % 4) + 1, 4)}`}>
                  <ArticleCard article={a} lang={lang} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "5rem 0", color: "#999999" }}>
              <p style={{ fontSize: "1rem" }}>{copy.noArticles}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
