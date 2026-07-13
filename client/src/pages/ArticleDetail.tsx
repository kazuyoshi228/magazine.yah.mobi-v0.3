import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Wifi, UtensilsCrossed, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getArticleBySlug, listPlans } from "@/lib/db";
import { renderCompareBody, substitutePlaceholders, computePriceMeta } from "@/lib/compareGrid";
import SeoHead from "@/components/SeoHead";
import type { Lang } from "@/components/Header";
import { useAnalytics } from "@/hooks/useAnalytics";

interface ArticleDetailProps {
  slug: string;
  lang: Lang;
}

const CTA_COPY: Record<Lang, { esimHeadline: string; esimSub: string; esimBtn: string; homesHeadline: string; homesSub: string; homesBtn: string; backToList: string }> = {
  ja: {
    esimHeadline: "日本旅行の前に、eSIMを準備しよう。",
    esimSub: "空港に着いた瞬間から、QRコードをスキャンするだけで全国どこでも接続できます。",
    esimBtn: "eSIMを購入",
    homesHeadline: "福岡に泊まるなら、yah.homes。",
    homesSub: "地元に根ざした宿泊体験。福岡の文化・食・人と出会う、yah.homesのステイをご体験ください。",
    homesBtn: "宿泊を探す",
    backToList: "記事一覧に戻る",
  },
  en: {
    esimHeadline: "Get your eSIM before you land.",
    esimSub: "Scan a QR code and you're online the moment you arrive in Japan.",
    esimBtn: "Buy eSIM",
    homesHeadline: "Stay in Fukuoka with yah.homes.",
    homesSub: "Authentic stays rooted in local culture. Discover Fukuoka's food, people, and neighborhoods.",
    homesBtn: "Find a Stay",
    backToList: "Back to Articles",
  },
  ko: {
    esimHeadline: "일본 여행 전에 eSIM을 준비하세요.",
    esimSub: "QR 코드 스캔만으로 공항 도착 즉시 연결됩니다.",
    esimBtn: "eSIM 구매",
    homesHeadline: "후쿠오카 숙박은 yah.homes.",
    homesSub: "현지 문화에 뿌리를 둔 숙박 경험. 후쿠오카의 음식, 사람, 동네를 발견하세요.",
    homesBtn: "숙소 찾기",
    backToList: "기사 목록으로 돌아가기",
  },
  "zh-TW": {
    esimHeadline: "出發日本前，先準備好 eSIM。",
    esimSub: "掃描 QR 碼，抵達日本即刻上線。",
    esimBtn: "購買eSIM",
    homesHeadline: "在福岡住宿，選 yah.homes。",
    homesSub: "植根於在地文化的住宿體驗。探索福岡的美食、人情與街道。",
    homesBtn: "尋找住宿",
    backToList: "返回文章列表",
  },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  esim: <Wifi size={14} strokeWidth={1.5} />,
  gourmet: <UtensilsCrossed size={14} strokeWidth={1.5} />,
  travel: <MapPin size={14} strokeWidth={1.5} />,
};

function buildArticleSchema(article: any, translation: any, lang: string) {
  const schemaType = article.articles?.schemaType ?? "Article";
  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    headline: translation?.title ?? "",
    description: translation?.excerpt ?? translation?.metaDescription ?? "",
    image: article.articles?.thumbnailUrl ?? undefined,
    datePublished: article.articles?.publishedAt ? new Date(article.articles.publishedAt).toISOString() : undefined,
    dateModified: article.articles?.updatedAt ? new Date(article.articles.updatedAt).toISOString() : undefined,
    inLanguage: lang,
    publisher: {
      "@type": "Organization",
      name: "yah.magazine",
      url: "https://magazine.yah.mobi",
    },
    url: `https://magazine.yah.mobi/articles/${article.articles?.slug}`,
  };
}

export default function ArticleDetail({ slug, lang }: ArticleDetailProps) {
  const cta = CTA_COPY[lang];

  const { data, isLoading, error } = useQuery({
    queryKey: ["article", slug, lang],
    queryFn: () => getArticleBySlug(slug, lang),
  });
  // 価格プラン（CompareGrid・{{price}} 焼き込み）。価格を持たない記事でも実害はない。
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: listPlans, staleTime: 5 * 60_000 });
  const articleId = data?.article?.articles?.id;
  const { trackCtaClick } = useAnalytics({ articleId });

  if (isLoading) {
    return (
      <div style={{ backgroundColor: "#F7F7F7", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid #D7D7D7", borderTopColor: "#000000", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ backgroundColor: "#F7F7F7", minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
        <p style={{ fontSize: "1.125rem", color: "#555555" }}>記事が見つかりませんでした。</p>
        <Link href="/articles" className="btn-outline">{cta.backToList}</Link>
      </div>
    );
  }

  const { article, translation, allTranslations } = data;
  const catSlug = article.categories?.slug ?? "";
  const catName =
    lang === "ja" ? article.categories?.nameJa :
    lang === "en" ? article.categories?.nameEn :
    lang === "ko" ? article.categories?.nameKo :
    article.categories?.nameZhTw;

  const publishedDate = article.articles?.publishedAt
    ? new Date(article.articles.publishedAt).toLocaleDateString(
        lang === "ja" ? "ja-JP" : lang === "ko" ? "ko-KR" : lang === "zh-TW" ? "zh-TW" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : "";

  const hreflangLinks = allTranslations.map((t) => ({
    lang: t.lang,
    href: `https://magazine.yah.mobi/articles/${slug}?lang=${t.lang}`,
  }));

  const schemaJson = buildArticleSchema(article, translation, lang);

  return (
    <>
      <SeoHead
        title={translation?.metaTitle ?? translation?.title ?? slug}
        description={translation?.metaDescription ?? translation?.excerpt ?? ""}
        ogImage={article.articles?.thumbnailUrl ?? undefined}
        ogType="article"
        canonical={`https://magazine.yah.mobi/articles/${slug}`}
        lang={lang}
        hreflangLinks={hreflangLinks}
        schemaJson={schemaJson}
      />

      {/* Article header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #D7D7D7", padding: "2.5rem 0 2rem" }}>
        <div className="container" style={{ maxWidth: "800px" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <Link
              href="/articles"
              style={{ fontSize: "0.75rem", color: "#999999", display: "flex", alignItems: "center", gap: "0.375rem", transition: "color 150ms" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#000000")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#999999")}
            >
              <ArrowLeft size={12} strokeWidth={1.5} />
              {cta.backToList}
            </Link>
          </div>

          {/* Category + date */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555555", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              {CATEGORY_ICONS[catSlug]}
              {catName}
            </span>
            {publishedDate && (
              <>
                <span style={{ color: "#D7D7D7" }}>·</span>
                <span style={{ fontSize: "0.6875rem", color: "#999999" }}>{publishedDate}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="headline-lg" style={{ marginBottom: "1rem" }}>
            {translation?.title ?? slug}
          </h1>

          {/* Excerpt */}
          {translation?.excerpt && (
            <p style={{ fontSize: "1.125rem", lineHeight: 1.7, color: "#555555", marginBottom: "0" }}>
              {translation.excerpt}
            </p>
          )}

          {/* Language variants */}
          {allTranslations.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
              {allTranslations.map((t) => (
                <a
                  key={t.lang}
                  href={`/articles/${slug}?lang=${t.lang}`}
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 500,
                    padding: "0.25rem 0.625rem",
                    border: `1px solid ${t.lang === lang ? "#000000" : "#D7D7D7"}`,
                    backgroundColor: t.lang === lang ? "#000000" : "transparent",
                    color: t.lang === lang ? "#FFFFFF" : "#555555",
                    transition: "all 150ms",
                  }}
                >
                  {t.lang === "zh-TW" ? "繁中" : t.lang.toUpperCase()}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail — 全幅ヒーローにせず、本文コラム幅・画角そのままで表示（2026-07-14 仕様変更） */}
      {article.articles?.thumbnailUrl && (
        <div className="container" style={{ maxWidth: "800px", paddingTop: "2rem" }}>
          <img
            src={article.articles.thumbnailUrl}
            alt={translation?.title ?? slug}
            style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: "4px" }}
            loading="lazy"
          />
        </div>
      )}

      {/* Article body */}
      <div style={{ backgroundColor: "#F7F7F7", padding: "3rem 0" }}>
        <div className="container" style={{ maxWidth: "800px" }}>

          {/* Direct Answer Block (GEO) */}
          {translation?.directAnswer && (
            <div className="direct-answer-block" style={{ marginBottom: "2.5rem" }}>
              <p style={{ margin: 0, fontWeight: 500, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555555", marginBottom: "0.625rem" }}>
                {lang === "ja" ? "直接回答" : lang === "ko" ? "직접 답변" : lang === "zh-TW" ? "直接回答" : "Direct Answer"}
              </p>
              <p style={{ margin: 0, fontSize: "1.0625rem", lineHeight: 1.75 }}>
                {substitutePlaceholders(translation.directAnswer, plans, computePriceMeta(plans))}
              </p>
            </div>
          )}

          {/* Body */}
          {translation?.body ? (
            <div
              className="prose-yah"
              dangerouslySetInnerHTML={{ __html: renderCompareBody(translation.body, plans, renderMarkdown) }}
            />
          ) : (
            <div style={{ padding: "3rem 0", textAlign: "center", color: "#999999" }}>
              <p>コンテンツがまだありません。</p>
            </div>
          )}

          {/* eSIM CTA */}
          <div
            style={{
              marginTop: "3rem",
              padding: "2rem",
              backgroundColor: "#000000",
              color: "#FFFFFF",
            }}
          >
            <p className="label-section" style={{ color: "rgba(255,255,255,0.4)", marginBottom: "0.75rem" }}>yah.mobile</p>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 500, color: "#FFFFFF", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
              {cta.esimHeadline}
            </h3>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: "1.5rem" }}>
              {cta.esimSub}
            </p>
            <a
              href="https://yah.mobi/app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("esim_article", articleId)}
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
                padding: "0.75rem 1.75rem",
                border: "1px solid #FFFFFF",
                cursor: "pointer",
                transition: "opacity 160ms",
              }}
            >
              {cta.esimBtn}
              <ArrowRight size={13} strokeWidth={1.5} />
            </a>
          </div>

          {/* yah.homes CTA */}
          <div
            style={{
              marginTop: "1.5rem",
              padding: "2rem",
              backgroundColor: "#FFFFFF",
              border: "1px solid #D7D7D7",
            }}
          >
            <p className="label-section" style={{ marginBottom: "0.75rem" }}>yah.homes</p>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 500, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
              {cta.homesHeadline}
            </h3>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.7, color: "#555555", marginBottom: "1.5rem" }}>
              {cta.homesSub}
            </p>
            <a
              href="https://yah.homes"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCtaClick("yah_homes", articleId)}
              className="btn-outline"
            >
              {cta.homesBtn}
              <ArrowRight size={13} strokeWidth={1.5} />
            </a>
          </div>


        </div>
      </div>
    </>
  );
}

// Minimal Markdown → HTML renderer (no external deps)
function renderMarkdown(md: string): string {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Blockquote
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    // Horizontal rule
    .replace(/^---$/gm, "<hr>")
    // Paragraphs (double newline)
    .replace(/\n\n/g, "</p><p>")
    // Wrap li in ul
    .replace(/(<li>[\s\S]*<\/li>)/g, "<ul>$1</ul>");

  return `<p>${html}</p>`;
}
