import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Globe, PenLine } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export type Lang = "ja" | "en" | "ko" | "zh-TW";

interface HeaderProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

const LANG_LABELS: Record<Lang, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어",
  "zh-TW": "繁體中文",
};

const NAV_ITEMS: Record<Lang, { label: string; href: string }[]> = {
  ja: [
    { label: "通信", href: "/articles?category=esim" },
    { label: "ガジェット", href: "/articles?category=gadget" },
    { label: "グルメ", href: "/articles?category=gourmet" },
    { label: "旅行", href: "/articles?category=travel" },
  ],
  en: [
    { label: "eSIM", href: "/articles?category=esim" },
    { label: "Gadgets", href: "/articles?category=gadget" },
    { label: "Gourmet", href: "/articles?category=gourmet" },
    { label: "Travel", href: "/articles?category=travel" },
  ],
  ko: [
    { label: "eSIM", href: "/articles?category=esim" },
    { label: "가젯", href: "/articles?category=gadget" },
    { label: "맛식", href: "/articles?category=gourmet" },
    { label: "여행", href: "/articles?category=travel" },
  ],
  "zh-TW": [
    { label: "eSIM", href: "/articles?category=esim" },
    { label: "數位裝置", href: "/articles?category=gadget" },
    { label: "美食", href: "/articles?category=gourmet" },
    { label: "旅遊", href: "/articles?category=travel" },
  ],
};

const CTA_LABEL: Record<Lang, string> = {
  ja: "eSIMを購入",
  en: "Buy eSIM",
  ko: "eSIM 구매",
  "zh-TW": "購買eSIM",
};

// Hamburger SVG icon
function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="16" height="1.5" fill="#000000" rx="0.75" />
      <rect x="2" y="9.25" width="16" height="1.5" fill="#000000" rx="0.75" />
      <rect x="2" y="13.5" width="16" height="1.5" fill="#000000" rx="0.75" />
    </svg>
  );
}

// Close SVG icon
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <line x1="4" y1="4" x2="16" y2="16" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="4" x2="4" y2="16" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Header({ lang, onLangChange }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setLangOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const navItems = NAV_ITEMS[lang];
  const ctaLabel = CTA_LABEL[lang];
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: "#F7F7F7",
        borderBottom: scrolled ? "1px solid #D7D7D7" : "1px solid transparent",
        transition: "border-color 200ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          height: "56px",
          gap: "0",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, marginRight: "2rem", textDecoration: "none" }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 566.93 566.93"
            style={{ width: "36px", height: "36px", flexShrink: 0 }}
            aria-hidden="true"
          >
            <path
              d="M147.14,404.09l-19.59-4.23c8.84-40.93,46.85-121.28,115.36-174.88,66.73-52.21,145.23-65.9,196.45-61.3l-1.79,19.96c-16.37-1.47-102.11-5.62-182.31,57.13-64.32,50.32-99.9,125.25-108.13,163.33Z"
              fill="#000000"
            />
          </svg>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: "1.0625rem",
              letterSpacing: "-0.02em",
              color: "#000000",
              lineHeight: 1,
            }}
          >
            <span style={{ fontWeight: 700 }}>yah.</span>
            <span style={{ fontWeight: 300, color: "#555555" }}>magazine</span>
          </span>
        </Link>

        {/* Desktop Nav — hidden on mobile */}
        {!isMobile && (
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0",
              flex: 1,
            }}
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#000000",
                  padding: "0 1rem",
                  height: "56px",
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "2px solid transparent",
                  transition: "border-color 160ms cubic-bezier(0.23, 1, 0.32, 1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderBottomColor = "#000000";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent";
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "auto" }}>
          {/* Admin CMS link (管理者ログイン時のみ表示) */}
          {isAdmin && (
            <Link
              href="/admin/cms"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#555555",
                border: "1px solid #D7D7D7",
                padding: "0.375rem 0.75rem",
                transition: "border-color 160ms",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#000")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#D7D7D7")}
            >
              <PenLine size={12} strokeWidth={1.5} />
              {!isMobile && <span>CMS</span>}
            </Link>
          )}
          {/* Language switcher */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setLangOpen((v) => !v); setMenuOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#555555",
                background: "none",
                border: "1px solid #D7D7D7",
                padding: "0.375rem 0.75rem",
                cursor: "pointer",
                transition: "border-color 160ms",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#000")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#D7D7D7")}
              aria-label="Change language"
            >
              <Globe size={12} strokeWidth={1.5} />
              <span>{lang === "zh-TW" ? "繁中" : lang.toUpperCase()}</span>
            </button>
            {langOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  backgroundColor: "#F7F7F7",
                  border: "1px solid #D7D7D7",
                  minWidth: "140px",
                  zIndex: 200,
                  animation: "fadeInUp 150ms cubic-bezier(0.23, 1, 0.32, 1) both",
                }}
              >
                {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      onLangChange(l);
                      setLangOpen(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "0.625rem 1rem",
                      fontSize: "0.8125rem",
                      fontWeight: l === lang ? 500 : 400,
                      color: l === lang ? "#000000" : "#555555",
                      background: l === lang ? "#EBEBEB" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 120ms",
                    }}
                    onMouseEnter={(e) => {
                      if (l !== lang) (e.currentTarget as HTMLElement).style.background = "#F0F0F0";
                    }}
                    onMouseLeave={(e) => {
                      if (l !== lang) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* eSIM CTA — desktop only */}
          {!isMobile && (
            <a
              href="https://yah.mobi/app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ fontSize: "0.6875rem", padding: "0.5rem 1.25rem" }}
            >
              {ctaLabel}
            </a>
          )}

          {/* Hamburger — mobile only */}
          {isMobile && (
            <button
              onClick={() => { setMenuOpen((v) => !v); setLangOpen(false); }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.375rem",
                color: "#000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer menu */}
      {isMobile && menuOpen && (
        <div
          style={{
            position: "fixed",
            top: "56px",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#F7F7F7",
            zIndex: 99,
            overflowY: "auto",
            animation: "fadeInUp 180ms cubic-bezier(0.23, 1, 0.32, 1) both",
          }}
        >
          <div style={{ padding: "1.5rem 1.25rem" }}>
            {navItems.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  color: "#000000",
                  padding: "1rem 0",
                  borderBottom: i < navItems.length - 1 ? "1px solid #EBEBEB" : "none",
                  display: "block",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://yah.mobi/app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                marginTop: "1.5rem",
                display: "flex",
                justifyContent: "center",
                width: "100%",
                fontSize: "0.875rem",
                padding: "0.875rem 1.5rem",
              }}
            >
              {ctaLabel}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
