import { useEffect, useRef, useCallback } from "react";
import { nanoid } from "nanoid";
import { trackEvent } from "@/lib/db";
import type { CtaTarget } from "@shared/types";

// ─── AI Crawler User-Agent patterns ──────────────────────────────────────────
const AI_CRAWLER_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /GPTBot/i, name: "GPTBot" },
  { pattern: /ChatGPT-User/i, name: "ChatGPT-User" },
  { pattern: /OAI-SearchBot/i, name: "OAI-SearchBot" },
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

function getCurrentLang(): string {
  try {
    return localStorage.getItem("yah_lang") ?? "ja";
  } catch {
    return "ja";
  }
}

function getCountryFromBrowser(): string {
  try {
    const langs = navigator.languages ?? [navigator.language];
    const primary = langs[0] ?? "";
    const parts = primary.split("-");
    if (parts.length >= 2) return parts[parts.length - 1].toUpperCase();
    const langMap: Record<string, string> = {
      ja: "JP", ko: "KR", zh: "TW", en: "US", de: "DE", fr: "FR", th: "TH", vi: "VN",
    };
    return langMap[parts[0]] ?? "XX";
  } catch {
    return "XX";
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAnalytics(opts?: { articleId?: string }) {
  const trackedRef = useRef(false);

  // Track page view on mount
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    const ua = navigator.userAgent;
    const { isAi, name: crawlerName } = detectAiCrawler(ua);

    trackEvent({
      type: isAi ? "ai_crawl" : "pageview",
      path: window.location.pathname,
      articleSlug: opts?.articleId,
      sessionId: getSessionId(),
      lang: getCurrentLang(),
      country: getCountryFromBrowser(),
      referrer: document.referrer.slice(0, 512) || undefined,
      userAgent: ua.slice(0, 256),
      crawlerName,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // CTA click tracker
  const trackCtaClick = useCallback(
    (target: CtaTarget, articleId?: string) => {
      trackEvent({
        type: "cta_click",
        path: window.location.pathname,
        target,
        articleSlug: articleId ?? opts?.articleId,
        sessionId: getSessionId(),
        lang: getCurrentLang(),
        referrer: document.referrer.slice(0, 512) || undefined,
      });
    },
    [opts?.articleId],
  );

  return { trackCtaClick };
}
