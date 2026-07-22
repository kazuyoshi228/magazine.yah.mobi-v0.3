/**
 * CompareGrid / 動的価格の焼き込みロジック（クライアント & CMSプレビュー共用）。
 *
 * seoserver（functions/src/index.ts）にも同一仕様の実装があります（別パッケージのため複製・
 * ArticleDetail の renderMarkdown 複製と同じ方針）。ここを変えたら seoserver 側も揃えること。
 *
 * - {{key}}          → plans の priceJpy を焼き込み（例: {{yah_7d_3gb}} → 980）
 * - {{updated_date}} → 実勢価格の確認日
 * - {{updated_time}} → 取得時刻（JST）
 * - 〔動的コンポーネント: `<CompareGrid bindings="...">`〕 → 罫線付き比較表（最安ハイライト）
 * - その他の未実装コンポーネント（RoamingVsEsim 等）は 〔…〕 を剥がし、行内テキストは残す
 */
import type { Plan } from "@shared/types";

export interface PriceMeta {
  date: string;
  time: string;
}

const SENTINEL = "%%COMPAREGRID%%";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtJpy(n: number): string {
  return n.toLocaleString("ja-JP");
}

function jstParts(ms: number): { date: string; time: string } {
  const d = new Date(ms);
  const date = d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }); // YYYY-MM-DD
  const time = d.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false });
  return { date, time };
}

/** plans から確認日・取得時刻を決める（confirmedDate 優先、なければ updatedAt から導出）。 */
export function computePriceMeta(plans: Plan[]): PriceMeta {
  const latestMs = plans.reduce((m, p) => Math.max(m, p.updatedAt ?? 0), 0) || Date.now();
  const dates = plans.map((p) => p.confirmedDate).filter((d): d is string => !!d).sort();
  const jst = jstParts(latestMs);
  return { date: dates.length ? dates[dates.length - 1] : jst.date, time: jst.time };
}

/** テキスト中の {{...}} を実値へ置換。未知キーは「—」。 */
export function substitutePlaceholders(text: string | undefined | null, plans: Plan[], meta: PriceMeta): string {
  if (!text) return text ?? "";
  const map = new Map(plans.map((p) => [p.key, p]));
  return text.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_m, key: string) => {
    if (key === "updated_date") return meta.date;
    if (key === "updated_time") return meta.time;
    const p = map.get(key);
    return p ? fmtJpy(p.priceJpy) : "—";
  });
}

const TYPE_LABEL: Record<string, string> = { esim: "eSIM", wifi: "レンタルWiFi", sim: "空港SIM", roaming: "ローミング" };

/** priceBindings から罫線付き自社プラン表 HTML を生成（自社のみのため最安バッジは付けない）。
 *  asOfDate に記事の公開日（"2026年7月15日" 等）を渡すと「◯◯時点」と表示する。 */
export function buildCompareTableHtml(bindings: string[], plans: Plan[], meta: PriceMeta, asOfDate?: string): string {
  const map = new Map(plans.map((p) => [p.key, p]));
  const rows = bindings.map((k) => map.get(k)).filter((p): p is Plan => !!p);
  if (!rows.length) return "";
  const hasPlaceholder = rows.some((r) => r.source === "placeholder");
  const bodyHtml = rows
    .map((r) => {
      return `<tr><td>${escapeHtml(r.provider)}</td><td>${escapeHtml(`${r.days}日 / ${r.data}`)}</td><td style="text-align:right;">¥${fmtJpy(r.priceJpy)}</td><td>${TYPE_LABEL[r.providerType] ?? escapeHtml(r.providerType)}</td></tr>`;
    })
    .join("");
  const when = asOfDate ? `${asOfDate}時点` : `${meta.date}時点`;
  const caption = `${when}の価格（yah.mobile 本体の価格ソースと同一）${hasPlaceholder ? "／※サンプル価格・要差し替え" : ""}`;
  return (
    `<table class="compare-grid">` +
    `<caption style="caption-side:top;text-align:left;font-size:0.8em;color:#666;padding-bottom:0.4em;">${escapeHtml(caption)}</caption>` +
    `<thead><tr><th>事業者</th><th>プラン</th><th style="text-align:right;">価格</th><th>種別</th></tr></thead>` +
    `<tbody>${bodyHtml}</tbody></table>`
  );
}

/**
 * 本文 Markdown を、価格焼き込み＋CompareGrid 表つきの HTML に変換。
 * renderMarkdown は呼び出し側（クライアント/CMS）の実装を渡す。
 */
export function renderCompareBody(body: string, plans: Plan[], renderMarkdown: (md: string) => string): string {
  const meta = computePriceMeta(plans);
  let bindings: string[] = [];
  let b = body.replace(/^>?[ \t]*〔動的コンポーネント[：:][\s\S]*?〕[^\n]*$/gm, (block) => {
    if (/CompareGrid/.test(block)) {
      const m = block.match(/bindings="([^"]*)"/);
      if (m) bindings = m[1].split(",").map((s) => s.trim()).filter(Boolean);
      return `\n\n${SENTINEL}\n\n`;
    }
    // 未実装コンポーネント: 〔…〕 を剥がして行内テキストのみ残す
    return block.replace(/^>?[ \t]*〔動的コンポーネント[：:][\s\S]*?〕/, "").trim();
  });
  b = substitutePlaceholders(b, plans, meta);
  let html = renderMarkdown(b);
  const table = bindings.length ? buildCompareTableHtml(bindings, plans, meta) : "";
  html = html.split(`<p>${SENTINEL}</p>`).join(table).split(SENTINEL).join(table);
  return html;
}
