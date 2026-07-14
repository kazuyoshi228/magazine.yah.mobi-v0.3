import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Wifi, UtensilsCrossed, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getArticleBySlug, listPlans } from "@/lib/db";
import { renderCompareBody, substitutePlaceholders, computePriceMeta } from "@/lib/compareGrid";
import SeoHead from "@/components/SeoHead";
import type { Lang } from "@/components/Header";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/_core/hooks/useAuth";

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
  th: {
    esimHeadline: "เตรียม eSIM ให้พร้อมก่อนเที่ยวญี่ปุ่น",
    esimSub: "สแกน QR โค้ดแล้วออนไลน์ได้ทันทีที่ถึงญี่ปุ่น",
    esimBtn: "ซื้อ eSIM",
    homesHeadline: "พักฟุกุโอกะกับ yah.homes",
    homesSub: "ที่พักที่หยั่งรากในวัฒนธรรมท้องถิ่น ค้นพบอาหาร ผู้คน และย่านต่างๆ ของฟุกุโอกะ",
    homesBtn: "ดูที่พัก",
    backToList: "กลับไปหน้ารายการ",
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
    author: article.articles?.author
      ? { "@type": "Person", name: article.articles.author.name, ...(article.articles.author.title ? { jobTitle: article.articles.author.title } : {}) }
      : undefined,
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
  const cta = CTA_COPY[lang] ?? CTA_COPY.en;

  // homes専売記事は一般公開しない（canonicalはyah.homes）が、管理者にはCMSプレビュー用に表示する
  const { user } = useAuth();
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

  const homesOnlyBlocked = data?.article.articles.homesOnly && user?.role !== "admin";
  if (error || !data || homesOnlyBlocked) {
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
    lang === "en" || lang === "th" ? article.categories?.nameEn :
    lang === "ko" ? article.categories?.nameKo :
    article.categories?.nameZhTw;

  const publishedDate = article.articles?.publishedAt
    ? new Date(article.articles.publishedAt).toLocaleDateString(
        lang === "ja" ? "ja-JP" : lang === "ko" ? "ko-KR" : lang === "zh-TW" ? "zh-TW" : lang === "th" ? "th-TH" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : "";

  const hreflangLinks = allTranslations.map((t) => ({
    lang: t.lang,
    href: `https://magazine.yah.mobi/articles/${slug}?lang=${t.lang}`,
  }));

  const schemaJson = buildArticleSchema(article, translation, lang);

  // 目次: 本文h2にidを振り、3本以上あれば冒頭に目次を出す（yah.homes guidesと同一規約）
  const rawBodyHtml = translation?.body ? renderCompareBody(translation.body, plans, renderMarkdown) : "";
  const tocItems: { id: string; text: string }[] = [];
  const bodyHtml = rawBodyHtml.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (_m, attrs: string, inner: string) => {
    const id = `sec-${tocItems.length + 1}`;
    tocItems.push({ id, text: inner.replace(/<[^>]+>/g, "").trim() });
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
  // 物件写真の自動リンク（テンプレート機能・seoserver と同一仕様）:
  // handoff の /booking/{key} に対応する画像（アンカー外）を予約ページへのリンクで包む
  const bookingTargets = (article.articles?.handoff ?? []).filter((h: string) => h.startsWith("/booking/"));
  const linkedBodyHtml = !bookingTargets.length
    ? bodyHtml
    : bodyHtml
        .split(/(<a\b[\s\S]*?<\/a>)/g)
        .map((seg, i) => {
          if (i % 2 === 1) return seg;
          let out = seg;
          for (const href of bookingTargets) {
            const key = href.split("/").pop()!;
            out = out.replace(new RegExp(`<img[^>]*src="[^"]*${key}[^"]*"[^>]*/?>`, "g"), (img) => `<a href="https://yah.homes${href}" target="_blank" rel="noopener noreferrer">${img}</a>`);
          }
          return out;
        })
        .join("");
  const showToc = tocItems.length >= 3;
  const tocLabel = lang === "ja" ? "目次" : lang === "ko" ? "목차" : lang === "zh-TW" ? "目錄" : "Contents";
  const faqLabel = lang === "ja" ? "よくある質問" : lang === "ko" ? "자주 묻는 질문" : lang === "zh-TW" ? "常見問題" : "FAQ";

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

      {data.article.articles.homesOnly && (
        <div style={{ backgroundColor: "#000000", color: "#FFFFFF", textAlign: "center", padding: "0.5rem", fontSize: "0.75rem", letterSpacing: "0.08em" }}>
          homes専売記事のプレビュー（管理者のみ表示・一般公開面は yah.homes/guides）
        </div>
      )}

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

          {/* Byline（著者・CMSで選択すると自動反映） */}
          {article.articles?.author && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1.5rem" }}>
              {article.articles.author.photoUrl && (
                <img
                  src={article.articles.author.photoUrl}
                  alt={article.articles.author.name}
                  style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
                  loading="lazy"
                />
              )}
              <div>
                <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 600, color: "#111111" }}>{article.articles.author.name}</p>
                {article.articles.author.title && (
                  <p style={{ margin: 0, fontSize: "0.6875rem", color: "#999999" }}>{article.articles.author.title}</p>
                )}
              </div>
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
                Summary
              </p>
              <p style={{ margin: 0, fontSize: "1.0625rem", lineHeight: 1.75 }}>
                {substitutePlaceholders(translation.directAnswer, plans, computePriceMeta(plans))}
              </p>
            </div>
          )}

          {/* 目次（h2が3本以上のとき） */}
          {showToc && (
            <nav className="md-toc">
              <p className="md-toc-label">{tocLabel}</p>
              <ol>
                {tocItems.map((item) => (
                  <li key={item.id}><a href={`#${item.id}`}>{item.text}</a></li>
                ))}
              </ol>
            </nav>
          )}

          {/* Body */}
          {translation?.body ? (
            <div
              className="prose-yah"
              dangerouslySetInnerHTML={{ __html: linkedBodyHtml }}
            />
          ) : (
            <div style={{ padding: "3rem 0", textAlign: "center", color: "#999999" }}>
              <p>コンテンツがまだありません。</p>
            </div>
          )}

          {/* FAQ（CMSのfaqフィールドから自動表示） */}
          {translation?.faq && translation.faq.length > 0 && (
            <section className="md-faq">
              <h2>{faqLabel}</h2>
              {translation.faq.map((f, i) => (
                <details key={i}>
                  <summary>{substitutePlaceholders(f.q, plans, computePriceMeta(plans))}</summary>
                  <p>{substitutePlaceholders(f.a, plans, computePriceMeta(plans))}</p>
                </details>
              ))}
            </section>
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

/**
 * lean Markdown表 → <table>（GFM形式・renderMarkdown の前段で適用）。
 * クライアントと seoserver の両方に同一実装を置く（片方を変えたら両方揃える）。
 */
function renderTables(md: string): string {
  return md.replace(/((?:^\|.*\|[ \t]*$\n?)+)/gm, (block) => {
    const rows = block.trim().split("\n").map((r) => r.trim()).filter(Boolean);
    if (rows.length < 2 || !/^\|(?:\s*:?-+:?\s*\|)+$/.test(rows[1])) return block;
    const cells = (row: string) => row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const thead = `<thead><tr>${cells(rows[0]).map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
    return `\n<table class="md-table">${thead}${tbody}</table>\n`;
  });
}

function renderMarkdown(md: string): string {
  let html = renderTables(md)
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    // 手渡し見出し規約: 「## → 見出し」は矢印アイコン付き（seoserver と同一仕様）
    .replace(/^## → (.+)$/gm, '<h2 class="h2-handoff">$1</h2>')
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Images（リンクより先に処理。seoserver の renderMarkdown と同一仕様）
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
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
