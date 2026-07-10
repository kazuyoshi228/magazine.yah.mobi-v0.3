import { useEffect } from "react";

interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  canonical?: string;
  lang?: string;
  hreflangLinks?: { lang: string; href: string }[];
  schemaJson?: object;
  noindex?: boolean;
}

const SITE_NAME = "yah.magazine";
const BASE_URL = "https://magazine.yah.mobi";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.jpg`;

export default function SeoHead({
  title,
  description,
  keywords,
  ogImage,
  ogType = "website",
  canonical,
  lang = "ja",
  hreflangLinks,
  schemaJson,
  noindex = false,
}: SeoHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Japan Travel & eSIM Guide`;
  const metaDesc =
    description ||
    "日本旅行をもっとスマートに。eSIM・グルメ・旅行ガイドをお届けするyah.magazineです。";
  const ogImg = ogImage || DEFAULT_OG_IMAGE;
  const canonicalUrl = canonical || (typeof window !== "undefined" ? window.location.href : BASE_URL);

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Helper to set/create meta
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (selector.includes("property=")) {
          el.setAttribute("property", selector.match(/property="([^"]+)"/)?.[1] || "");
        } else {
          el.setAttribute("name", selector.match(/name="([^"]+)"/)?.[1] || "");
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    const setLink = (rel: string, href: string, hreflang?: string) => {
      let selector = `link[rel="${rel}"]`;
      if (hreflang) selector += `[hreflang="${hreflang}"]`;
      let el = document.querySelector(selector) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        if (hreflang) el.setAttribute("hreflang", hreflang);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    // Basic meta
    setMeta('meta[name="description"]', "content", metaDesc);
    if (keywords) {
      setMeta('meta[name="keywords"]', "content", keywords);
    }
    if (noindex) {
      setMeta('meta[name="robots"]', "content", "noindex,nofollow");
    } else {
      setMeta('meta[name="robots"]', "content", "index,follow");
    }

    // OGP
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", metaDesc);
    setMeta('meta[property="og:image"]', "content", ogImg);
    setMeta('meta[property="og:type"]', "content", ogType);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[property="og:site_name"]', "content", SITE_NAME);
    setMeta('meta[property="og:locale"]', "content", lang === "ja" ? "ja_JP" : lang === "ko" ? "ko_KR" : lang === "zh-TW" ? "zh_TW" : "en_US");

    // Twitter Card
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", metaDesc);
    setMeta('meta[name="twitter:image"]', "content", ogImg);

    // Canonical
    setLink("canonical", canonicalUrl);

    // hreflang
    if (hreflangLinks) {
      // Remove old hreflang links
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
      hreflangLinks.forEach(({ lang: l, href }) => {
        setLink("alternate", href, l);
      });
      // x-default
      const defaultLink = hreflangLinks.find((l) => l.lang === "ja") || hreflangLinks[0];
      if (defaultLink) setLink("alternate", defaultLink.href, "x-default");
    }

    // Schema.org JSON-LD
    const existingSchema = document.querySelector('script[type="application/ld+json"][data-yah]');
    if (existingSchema) existingSchema.remove();
    if (schemaJson) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-yah", "true");
      script.textContent = JSON.stringify(schemaJson);
      document.head.appendChild(script);
    }

    // html lang
    document.documentElement.setAttribute("lang", lang);
  }, [fullTitle, metaDesc, ogImg, ogType, canonicalUrl, lang, hreflangLinks, schemaJson, noindex]);

  return null;
}
