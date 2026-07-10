import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { nanoid } from "nanoid";

// ─── AI Crawler User-Agent patterns ──────────────────────────────────────────
const AI_CRAWLER_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /GPTBot/i, name: "GPTBot" },
  { pattern: /ChatGPT-User/i, name: "ChatGPT-User" },
  { pattern: /ClaudeBot/i, name: "ClaudeBot" },
  { pattern: /Claude-Web/i, name: "Claude-Web" },
  { pattern: /anthropic-ai/i, name: "Anthropic" },
  { pattern: /Google-Extended/i, name: "Google-Extended" },
  { pattern: /Googlebot/i, name: "Googlebot" },
  { pattern: /Bingbot/i, name: "Bingbot" },
  { pattern: /PerplexityBot/i, name: "PerplexityBot" },
  { pattern: /YouBot/i, name: "YouBot" },
  { pattern: /cohere-ai/i, name: "Cohere" },
  { pattern: /Applebot/i, name: "Applebot" },
  { pattern: /facebookexternalhit/i, name: "Facebook" },
  { pattern: /Twitterbot/i, name: "Twitterbot" },
  { pattern: /LinkedInBot/i, name: "LinkedInBot" },
  { pattern: /Slackbot/i, name: "Slackbot" },
  { pattern: /DuckAssistBot/i, name: "DuckAssistBot" },
  { pattern: /Bytespider/i, name: "Bytespider" },
  { pattern: /PetalBot/i, name: "PetalBot" },
  { pattern: /SemrushBot/i, name: "SemrushBot" },
  { pattern: /AhrefsBot/i, name: "AhrefsBot" },
];

function detectAiCrawler(ua: string): { isAi: boolean; name?: string } {
  for (const { pattern, name } of AI_CRAWLER_PATTERNS) {
    if (pattern.test(ua)) return { isAi: true, name };
  }
  return { isAi: false };
}

// ─── Session ID (persisted in sessionStorage) ─────────────────────────────────
function getSessionId(): string {
  try {
    const key = "yah_sid";
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = nanoid(16);
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return nanoid(16);
  }
}

// ─── Language from URL or localStorage ───────────────────────────────────────
function getCurrentLang(): string {
  try {
    return localStorage.getItem("yah_lang") ?? "ja";
  } catch {
    return "ja";
  }
}

// ─── Country from Accept-Language header (client-side approximation) ──────────
function getCountryFromBrowser(): string {
  try {
    const langs = navigator.languages ?? [navigator.language];
    const primary = langs[0] ?? "";
    // Extract region code: "ja-JP" → "JP", "ko-KR" → "KR", "zh-TW" → "TW"
    const parts = primary.split("-");
    if (parts.length >= 2) return parts[parts.length - 1].toUpperCase();
    // Fallback: map language to likely country
    const langMap: Record<string, string> = {
      ja: "JP",
      ko: "KR",
      zh: "TW",
      en: "US",
      de: "DE",
      fr: "FR",
      th: "TH",
      vi: "VN",
    };
    return langMap[parts[0]] ?? "XX";
  } catch {
    return "XX";
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAnalytics(opts?: { articleId?: number }) {
  const trackPv = trpc.analytics.trackPageView.useMutation();
  const trackCta = trpc.analytics.trackCtaClick.useMutation();
  const trackedRef = useRef(false);

  // Track page view on mount
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    const ua = navigator.userAgent;
    const { isAi, name: crawlerName } = detectAiCrawler(ua);
    const sessionId = getSessionId();
    const lang = getCurrentLang();
    const country = getCountryFromBrowser();

    trackPv.mutate({
      path: window.location.pathname,
      articleId: opts?.articleId,
      sessionId,
      lang,
      referrer: document.referrer.slice(0, 512) || undefined,
      userAgent: ua.slice(0, 256),
      isAiCrawler: isAi,
      crawlerName: crawlerName,
      country,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // CTA click tracker
  const trackCtaClick = useCallback(
    (
      target: "yah_mobile" | "yah_homes" | "esim_buy" | "esim_hero" | "esim_article",
      articleId?: number
    ) => {
      const sessionId = getSessionId();
      const lang = getCurrentLang();
      trackCta.mutate({
        target,
        sourcePath: window.location.pathname,
        articleId: articleId ?? opts?.articleId,
        sessionId,
        lang,
        referrer: document.referrer.slice(0, 512) || undefined,
      });
    },
    [opts?.articleId, trackCta]
  );

  return { trackCtaClick };
}
