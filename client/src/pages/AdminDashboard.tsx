import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────
type DayRange = 7 | 14 | 30 | 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number | undefined | null) =>
  n == null ? "—" : n.toLocaleString("ja-JP");

const COUNTRY_NAMES: Record<string, string> = {
  ja: "日本語",
  en: "英語",
  ko: "韓国語",
  "zh-TW": "繁体字",
  JP: "日本",
  US: "米国",
  KR: "韓国",
  TW: "台湾",
  HK: "香港",
  SG: "シンガポール",
  CN: "中国",
  AU: "オーストラリア",
  GB: "英国",
  DE: "ドイツ",
  FR: "フランス",
  CA: "カナダ",
  TH: "タイ",
  VN: "ベトナム",
};

const PIE_COLORS = [
  "#000000",
  "#444444",
  "#888888",
  "#aaaaaa",
  "#cccccc",
  "#e0e0e0",
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #D7D7D7",
        borderRadius: 2,
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "#888", textTransform: "uppercase", fontWeight: 500 }}>
        {label}
      </span>
      {loading ? (
        <Skeleton style={{ height: 36, width: 100 }} />
      ) : (
        <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: "#000" }}>
          {typeof value === "number" ? fmt(value) : value}
        </span>
      )}
      {sub && <span style={{ fontSize: 12, color: "#aaa" }}>{sub}</span>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#000" }}>{title}</h2>
      {sub && <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ─── Day Range Selector ───────────────────────────────────────────────────────
function DayRangeSelector({
  value,
  onChange,
}: {
  value: DayRange;
  onChange: (d: DayRange) => void;
}) {
  const options: DayRange[] = [7, 14, 30, 90];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          style={{
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: value === d ? 700 : 400,
            background: value === d ? "#000" : "transparent",
            color: value === d ? "#fff" : "#666",
            border: "1px solid #D7D7D7",
            borderRadius: 2,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {d}日
        </button>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [days, setDays] = useState<DayRange>(30);

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  // Redirect if not admin
  if (!authLoading && isAuthenticated && user?.role !== "admin") {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ color: "#888" }}>管理者権限が必要です。</p>
      </div>
    );
  }

  return <DashboardContent days={days} setDays={setDays} />;
}

function DashboardContent({
  days,
  setDays,
}: {
  days: DayRange;
  setDays: (d: DayRange) => void;
}) {
  const daysInput = useMemo(() => ({ days }), [days]);

  const { data: kpi, isLoading: kpiLoading } = trpc.analytics.kpiSummary.useQuery(daysInput);
  const { data: dailyPv, isLoading: pvLoading } = trpc.analytics.dailyPv.useQuery(daysInput);
  const { data: dailyCta, isLoading: ctaLoading } = trpc.analytics.dailyCta.useQuery(daysInput);
  const { data: topPages, isLoading: topLoading } = trpc.analytics.topPages.useQuery(daysInput);
  const { data: countryDist } = trpc.analytics.countryDist.useQuery(daysInput);
  const { data: aiCrawlers } = trpc.analytics.aiCrawlers.useQuery(daysInput);
  const { data: langDist } = trpc.analytics.langDist.useQuery(daysInput);
  const { data: subscriberCount } = trpc.subscribers.count.useQuery();

  // Process daily PV data for chart
  const pvChartData = useMemo(() => {
    if (!dailyPv) return [];
    return dailyPv.map((row) => ({
      date: String(row.date).slice(5), // MM-DD
      PV: Number(row.pv),
      UV: Number(row.uv),
      AIクロール: Number(row.aiCrawls),
    }));
  }, [dailyPv]);

  // Process CTA data for chart
  const ctaChartData = useMemo(() => {
    if (!dailyCta) return [];
    const byDate: Record<string, { date: string; mobile: number; homes: number; esim: number }> = {};
    for (const row of dailyCta) {
      const d = String(row.date).slice(5);
      if (!byDate[d]) byDate[d] = { date: d, mobile: 0, homes: 0, esim: 0 };
      if (row.target === "yah_mobile") byDate[d].mobile += Number(row.count);
      if (row.target === "yah_homes") byDate[d].homes += Number(row.count);
      if (["esim_buy", "esim_hero", "esim_article"].includes(row.target)) byDate[d].esim += Number(row.count);
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyCta]);

  // Bounce rate estimate: sessions with only 1 PV / total sessions
  const bounceRate = useMemo(() => {
    if (!kpi || !kpi.totalUv || !kpi.totalPv) return null;
    // Rough estimate: if avg pages/session < 1.5, high bounce
    const pps = kpi.totalPv / Math.max(kpi.totalUv, 1);
    return pps;
  }, [kpi]);

  const s = {
    page: {
      background: "#F7F7F7",
      minHeight: "100vh",
      padding: "32px 0 80px",
    } as React.CSSProperties,
    inner: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "0 24px",
    } as React.CSSProperties,
    section: {
      background: "#fff",
      border: "1px solid #D7D7D7",
      borderRadius: 2,
      padding: "24px 28px",
      marginBottom: 24,
    } as React.CSSProperties,
    grid2: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: 24,
      marginBottom: 24,
    } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <div style={s.inner}>
        {/* Header */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", margin: "0 0 4px" }}>
              magazine.yah.mobi
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#000" }}>Analytics Dashboard</h1>
          </div>
          <DayRangeSelector value={days} onChange={setDays} />
        </div>

        {/* KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <KpiCard label="ページビュー" value={kpi?.totalPv ?? 0} sub={`過去${days}日間`} loading={kpiLoading} />
          <KpiCard label="ユニーク訪問者" value={kpi?.totalUv ?? 0} sub={`過去${days}日間`} loading={kpiLoading} />
          <KpiCard
            label="ページ/セッション"
            value={bounceRate != null ? bounceRate.toFixed(1) : "—"}
            sub="平均閲覧ページ数"
            loading={kpiLoading}
          />
          <KpiCard label="AIクロール" value={kpi?.aiCrawls ?? 0} sub="GPTBot / Claude等" loading={kpiLoading} />
          <KpiCard label="CTAクリック計" value={kpi?.ctaTotal ?? 0} sub="全CTA合計" loading={kpiLoading} />
          <KpiCard label="→ yah.mobile" value={kpi?.mobileClicks ?? 0} sub="eSIM購入送客" loading={kpiLoading} />
          <KpiCard label="→ yah.homes" value={kpi?.homesClicks ?? 0} sub="物件送客" loading={kpiLoading} />
          <KpiCard label="メルマガ登録" value={subscriberCount ?? 0} sub="累計アクティブ" loading={kpiLoading} />
        </div>

        {/* PV/UV Chart */}
        <div style={s.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
            <SectionHeader title="訪問者数の推移" sub="日別ページビュー・ユニーク訪問者・AIクロール" />
          </div>
          {pvLoading ? (
            <Skeleton style={{ height: 280 }} />
          ) : pvChartData.length === 0 ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 14 }}>
              データがありません。記事ページへのアクセスが記録されると表示されます。
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={pvChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#000" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#555" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#555" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip
                  contentStyle={{ border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="PV" stroke="#000" fill="url(#pvGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="UV" stroke="#555" fill="url(#uvGrad)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="AIクロール" stroke="#aaa" fill="none" strokeWidth={1} dot={false} strokeDasharray="2 3" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CTA Chart */}
        <div style={s.section}>
          <SectionHeader title="CTAクリック推移" sub="yah.mobile（eSIM購入）・yah.homes・eSIMボタン別の日別クリック数" />
          {ctaLoading ? (
            <Skeleton style={{ height: 260 }} />
          ) : ctaChartData.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 14 }}>
              データがありません。CTAボタンがクリックされると表示されます。
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ctaChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip contentStyle={{ border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="mobile" name="yah.mobile" fill="#000" radius={[2, 2, 0, 0]} />
                <Bar dataKey="homes" name="yah.homes" fill="#555" radius={[2, 2, 0, 0]} />
                <Bar dataKey="esim" name="eSIMボタン" fill="#aaa" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom 2-col grid */}
        <div style={s.grid2}>
          {/* Top Pages */}
          <div style={s.section}>
            <SectionHeader title="人気ページ TOP10" sub="ページビュー順" />
            {topLoading ? (
              <Skeleton style={{ height: 200 }} />
            ) : !topPages || topPages.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13 }}>データがありません</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E8E8E8" }}>
                    <th style={{ textAlign: "left", padding: "6px 0", color: "#888", fontWeight: 500, fontSize: 11 }}>ページ</th>
                    <th style={{ textAlign: "right", padding: "6px 0", color: "#888", fontWeight: 500, fontSize: 11 }}>PV</th>
                    <th style={{ textAlign: "right", padding: "6px 0", color: "#888", fontWeight: 500, fontSize: 11 }}>UV</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((p, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F0F0F0" }}>
                      <td style={{ padding: "8px 0", color: "#333", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.path}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 0", fontWeight: 600 }}>{fmt(Number(p.pv))}</td>
                      <td style={{ textAlign: "right", padding: "8px 0", color: "#666" }}>{fmt(Number(p.uv))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* AI Crawlers */}
          <div style={s.section}>
            <SectionHeader title="AIクローラー内訳" sub="GPTBot・ClaudeBot・Google-Extended等" />
            {!aiCrawlers || aiCrawlers.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13 }}>AIクローラーのアクセスはまだありません</p>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={aiCrawlers.map((r) => ({ name: r.crawlerName ?? "Unknown", value: Number(r.count) }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {aiCrawlers.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 8 }}>
                  {aiCrawlers.map((r, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[idx % PIE_COLORS.length], display: "inline-block" }} />
                      <span style={{ color: "#444" }}>{r.crawlerName ?? "Unknown"}</span>
                      <span style={{ color: "#888" }}>{fmt(Number(r.count))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Country Distribution */}
          <div style={s.section}>
            <SectionHeader title="国別訪問者" sub="Accept-Languageから推定" />
            {!countryDist || countryDist.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13 }}>データがありません</p>
            ) : (
              <div>
                {countryDist.slice(0, 8).map((r, i) => {
                  const total = countryDist.reduce((s, x) => s + Number(x.count), 0);
                  const pct = total > 0 ? Math.round((Number(r.count) / total) * 100) : 0;
                  const label = COUNTRY_NAMES[r.country ?? ""] ?? r.country ?? "不明";
                  return (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: "#333" }}>{label}</span>
                        <span style={{ color: "#666" }}>{fmt(Number(r.count))} ({pct}%)</span>
                      </div>
                      <div style={{ height: 4, background: "#F0F0F0", borderRadius: 2 }}>
                        <div style={{ height: 4, background: "#000", borderRadius: 2, width: `${pct}%`, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Language Distribution */}
          <div style={s.section}>
            <SectionHeader title="言語別訪問者" sub="ページ閲覧時の言語設定" />
            {!langDist || langDist.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13 }}>データがありません</p>
            ) : (
              <div>
                {langDist.map((r, i) => {
                  const total = langDist.reduce((s, x) => s + Number(x.count), 0);
                  const pct = total > 0 ? Math.round((Number(r.count) / total) * 100) : 0;
                  const label = COUNTRY_NAMES[r.lang ?? ""] ?? r.lang ?? "不明";
                  return (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: "#333" }}>{label}</span>
                        <span style={{ color: "#666" }}>{fmt(Number(r.count))} ({pct}%)</span>
                      </div>
                      <div style={{ height: 4, background: "#F0F0F0", borderRadius: 2 }}>
                        <div style={{ height: 4, background: "#555", borderRadius: 2, width: `${pct}%`, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Admin quick links */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="/admin/cms"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "#000",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: 2,
              letterSpacing: "0.04em",
            }}
          >
            記事管理 →
          </a>
          <a
            href="/admin/brand-guidelines"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "transparent",
              color: "#000",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid #D7D7D7",
              borderRadius: 2,
            }}
          >
            ブランドガイダンス →
          </a>
          <a
            href="/admin/curators"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "transparent",
              color: "#000",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid #D7D7D7",
              borderRadius: 2,
            }}
          >
            Curator →
          </a>
          <a
            href="/admin/ai-writers"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "transparent",
              color: "#000",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid #D7D7D7",
              borderRadius: 2,
            }}
          >
            AIライター →
          </a>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "transparent",
              color: "#000",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid #D7D7D7",
              borderRadius: 2,
            }}
          >
            サイトを表示 →
          </a>
        </div>
      </div>
    </div>
  );
}
