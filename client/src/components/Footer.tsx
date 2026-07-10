import { Link } from "wouter";
import type { Lang } from "./Header";

interface FooterProps {
  lang: Lang;
}

const FOOTER_COPY: Record<Lang, {
  tagline: string;
  desc: string;
  services: string;
  esimLabel: string;
  homesLabel: string;
  magazineLabel: string;
  legal: string;
  privacy: string;
  terms: string;
  copyright: string;
}> = {
  ja: {
    tagline: "Read Here. Go There.",
    desc: "通信・ガジェット・グルメ・旅行情報を通じて、日本旅行をより豊かにするコンテンツをお届けします。",
    services: "サービス",
    esimLabel: "yah.mobile — Japan eSIM",
    homesLabel: "yah.homes — 福岡の宿",
    magazineLabel: "yah.magazine — 旅行ガイド",
    legal: "法的情報",
    privacy: "プライバシーポリシー",
    terms: "利用規約",
    copyright: "© 2025 yah. All rights reserved.",
  },
  en: {
    tagline: "Read Here. Go There.",
    desc: "eSIM, gadgets, gourmet tips, and travel insights to make your Japan trip richer.",
    services: "Services",
    esimLabel: "yah.mobile — Japan eSIM",
    homesLabel: "yah.homes — Fukuoka Stays",
    magazineLabel: "yah.magazine — Travel Guide",
    legal: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    copyright: "© 2025 yah. All rights reserved.",
  },
  ko: {
    tagline: "Read Here. Go There.",
    desc: "통신·가젯·맛집·여행 정보를 통해 일본 여행을 더욱 풍요롭게 만드는 콘텐츠를 전달합니다.",
    services: "서비스",
    esimLabel: "yah.mobile — Japan eSIM",
    homesLabel: "yah.homes — 후쿠오카 숙박",
    magazineLabel: "yah.magazine — 여행 가이드",
    legal: "법적 정보",
    privacy: "개인정보 처리방침",
    terms: "이용약관",
    copyright: "© 2025 yah. All rights reserved.",
  },
  "zh-TW": {
    tagline: "Read Here. Go There.",
    desc: "透過通訊、數位裝置、美食與旅遊資訊，為您的日本之旅帶來更豐富的體驗。",
    services: "服務",
    esimLabel: "yah.mobile — Japan eSIM",
    homesLabel: "yah.homes — 福岡住宿",
    magazineLabel: "yah.magazine — 旅遊指南",
    legal: "法律資訊",
    privacy: "隱私政策",
    terms: "服務條款",
    copyright: "© 2025 yah. All rights reserved.",
  },
};

export default function Footer({ lang }: FooterProps) {
  const copy = FOOTER_COPY[lang];

  return (
    <footer
      style={{
        backgroundColor: "#F7F7F7",
        color: "#000000",
        paddingTop: "3.5rem",
        paddingBottom: "2rem",
        borderTop: "1px solid #D7D7D7",
      }}
    >
      <div className="container">
        {/* Top grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "2.5rem",
            paddingBottom: "2.5rem",
            borderBottom: "1px solid #D7D7D7",
          }}
          className="md:grid-cols-3"
        >
          {/* Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: "1.125rem",
                letterSpacing: "-0.02em",
                marginBottom: "0.875rem",
              }}
            >
              {/* yah. arc mark — black on light background */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 566.93 566.93"
                style={{ width: "32px", height: "32px", flexShrink: 0 }}
                aria-hidden="true"
              >
                <path
                  d="M147.14,404.09l-19.59-4.23c8.84-40.93,46.85-121.28,115.36-174.88,66.73-52.21,145.23-65.9,196.45-61.3l-1.79,19.96c-16.37-1.47-102.11-5.62-182.31,57.13-64.32,50.32-99.9,125.25-108.13,163.33Z"
                  fill="#000000"
                />
              </svg>
              <span style={{ fontWeight: 700, color: "#000000" }}>yah.</span>
              <span style={{ fontWeight: 300, color: "#555555" }}>magazine</span>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.7,
                color: "#555555",
                maxWidth: "none",
                margin: 0,
              }}
            >
              {copy.desc}
            </p>
            <p
              style={{
                marginTop: "1.25rem",
                fontSize: "0.9375rem",
                fontWeight: 400,
                color: "#999999",
                letterSpacing: "0.01em",
                fontStyle: "italic",
              }}
            >
              {copy.tagline}
            </p>
          </div>

          {/* Services — logo-only links */}
          <div>
            <p className="label-section" style={{ color: "#999999", marginBottom: "1.25rem" }}>
              {copy.services}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* yah.mobile */}
              <li>
                <a
                  href="https://yah.mobi/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-block", opacity: 0.7, transition: "opacity 150ms" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
                  aria-label="yah.mobile — Japan eSIM"
                >
                  <img
                    src="/manus-storage/yah.mobile_logo_width_f8faa888.svg"
                    alt="yah.mobile"
                    style={{ height: "22px", width: "auto", filter: "brightness(0)", display: "block" }}
                  />
                </a>
              </li>
              {/* yah.homes */}
              <li>
                <a
                  href="https://yah.homes"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-block", opacity: 0.7, transition: "opacity 150ms" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
                  aria-label="yah.homes — Fukuoka Stays"
                >
                  <img
                    src="/manus-storage/logo_yah_CMYK_cifo_aa64f11d.svg"
                    alt="yah.homes"
                    style={{ height: "32px", width: "auto", filter: "brightness(0)", display: "block" }}
                  />
                </a>
              </li>
              {/* yah.magazine */}
              <li>
                <Link
                  href="/"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", opacity: 0.7, transition: "opacity 150ms", textDecoration: "none" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
                  aria-label="yah.magazine"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 566.93 566.93"
                    style={{ width: "22px", height: "22px", flexShrink: 0 }}
                    aria-hidden="true"
                  >
                    <path
                      d="M147.14,404.09l-19.59-4.23c8.84-40.93,46.85-121.28,115.36-174.88,66.73-52.21,145.23-65.9,196.45-61.3l-1.79,19.96c-16.37-1.47-102.11-5.62-182.31,57.13-64.32,50.32-99.9,125.25-108.13,163.33Z"
                      fill="#000000"
                    />
                  </svg>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9375rem", lineHeight: 1 }}>
                    <span style={{ fontWeight: 700, color: "#000000" }}>yah.</span>
                    <span style={{ fontWeight: 300, color: "#555555" }}>magazine</span>
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="label-section" style={{ color: "#999999", marginBottom: "1rem" }}>
              {copy.legal}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <li>
                <a
                  href="https://yah.mobi/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.875rem", color: "#555555", transition: "color 150ms" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#000000")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#555555")}
                >
                  {copy.privacy}
                </a>
              </li>
              <li>
                <a
                  href="https://yah.mobi/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.875rem", color: "#555555", transition: "color 150ms" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#000000")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#555555")}
                >
                  {copy.terms}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <p style={{ fontSize: "0.75rem", color: "#999999", margin: 0 }}>
            {copy.copyright}
          </p>
          <p style={{ fontSize: "0.75rem", color: "#BBBBBB", margin: 0, letterSpacing: "0.05em" }}>
            magazine.yah.mobi
          </p>
        </div>
      </div>
    </footer>
  );
}
