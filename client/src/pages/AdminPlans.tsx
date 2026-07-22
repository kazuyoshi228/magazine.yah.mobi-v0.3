import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { listSelfPlansFromSSOT, getCompetitorTableFromSSOT } from "@/lib/db";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, ExternalLink } from "lucide-react";
import SeoHead from "@/components/SeoHead";

/* プラン（価格）ビューア — すべて本体（yah.mobile）SSOTの読み取り専用ミラー。
   ・自社プラン: plans コレクション（yah.mobi/admin/plans）
   ・競合比較表: competitorPlans/main（yah.mobi/admin/competitorPlans）
   magazine 側では価格を一切手管理しない（鉄則③・価格の単一ソース）。
   記事編集の priceBindings は自社プランのdocIDを、showCompetitorTable は競合比較表を参照する。 */

export default function AdminPlans() {
  const { user, loading } = useAuth();
  const isAdmin = !!user && user.role === "admin";

  const { data: selfPlans = [], isLoading: loadingSelf } = useQuery({
    queryKey: ["plans", "ssot-self"],
    queryFn: listSelfPlansFromSSOT,
    enabled: isAdmin,
  });
  const { data: competitor, isLoading: loadingComp } = useQuery({
    queryKey: ["plans", "ssot-competitor"],
    queryFn: getCompetitorTableFromSSOT,
    enabled: isAdmin,
  });

  if (loading) return <div style={{ padding: "4rem", textAlign: "center", color: "#999" }}>読み込み中...</div>;
  if (!isAdmin) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <p style={{ marginBottom: "1.5rem", color: "#555" }}>このページは管理者のみアクセスできます。</p>
        <a href="/login" className="btn-primary">ログイン画面へ</a>
      </div>
    );
  }

  const selfSorted = [...selfPlans].sort((a, b) => a.priceJpy - b.priceJpy);

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <SeoHead title="プラン価格（SSOTビューア） | yah.magazine CMS" description="本体SSOTの価格ミラー" noindex />
      <Link href="/admin/cms" style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#555", marginBottom: "0.75rem" }}>
        <ArrowLeft size={13} /> CMSへ戻る
      </Link>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>プラン価格（SSOTビューア）</h1>
      <p style={{ fontSize: "0.75rem", color: "#999", marginBottom: "2rem", lineHeight: 1.6 }}>
        価格は<strong>すべて本体（yah.mobile）が単一ソース</strong>で、ここは読み取り専用のミラーです。magazine 側では価格を手管理しません。
        記事編集の <code>priceBindings</code> は自社プランのdocID、<code>競合比較表を挿入</code> は下の比較表を参照します。
      </p>

      {/* 自社プラン（plans SSOT・読み取り専用） */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1a7f37", margin: 0 }}>
            自社 yah.mobile プラン（SSOT・読み取り専用）
          </p>
          <a href="https://yah.mobi/admin/plans" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", color: "#555", textDecoration: "underline" }}>
            yah.mobi/admin/plans で編集 <ExternalLink size={11} />
          </a>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #1a7f37", textAlign: "left" }}>
              <th style={{ padding: "0.5rem" }}>key（本体docID）</th>
              <th style={{ padding: "0.5rem" }}>プラン名</th>
              <th style={{ padding: "0.5rem" }}>内容</th>
              <th style={{ padding: "0.5rem", textAlign: "right" }}>価格</th>
              <th style={{ padding: "0.5rem" }}>確認日</th>
            </tr>
          </thead>
          <tbody>
            {loadingSelf && <tr><td colSpan={5} style={{ padding: "1rem", textAlign: "center", color: "#999" }}>読み込み中...</td></tr>}
            {!loadingSelf && selfSorted.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "1rem", textAlign: "center", color: "#999" }}>本体の有効なプランを取得できませんでした。</td></tr>
            )}
            {selfSorted.map((p) => (
              <tr key={p.key} style={{ borderBottom: "1px solid #E5E5E5", background: "#F7FBF8" }}>
                <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.7rem" }}>{p.key}</td>
                <td style={{ padding: "0.5rem" }}>{p.note ?? "—"}</td>
                <td style={{ padding: "0.5rem" }}>{p.days}日 / {p.data}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>¥{p.priceJpy.toLocaleString()}</td>
                <td style={{ padding: "0.5rem", fontSize: "0.75rem", color: "#555" }}>{p.confirmedDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: "0.625rem", color: "#999", margin: "0.5rem 0 0" }}>
          記事編集の priceBindings は上の key（本体docID）を指定します。価格を変えると全記事に自動追随します。
        </p>
      </div>

      {/* 競合比較表（competitorPlans SSOT・読み取り専用） */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555", margin: 0 }}>
            競合比較表「How we compare.」（SSOT・読み取り専用）
          </p>
          <a href="https://yah.mobi/admin/competitorPlans" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.6875rem", color: "#555", textDecoration: "underline" }}>
            yah.mobi/admin/competitorPlans で編集 <ExternalLink size={11} />
          </a>
        </div>
        {loadingComp && <p style={{ fontSize: "0.8125rem", color: "#999" }}>読み込み中...</p>}
        {!loadingComp && !competitor && <p style={{ fontSize: "0.8125rem", color: "#999" }}>競合比較表を取得できませんでした。</p>}
        {competitor && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #000", textAlign: "left" }}>
                {competitor.columns.map((c) => <th key={c.id} style={{ padding: "0.5rem" }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {competitor.rows.map((r, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid #E5E5E5", background: r.isHighlight ? "#EAF7EE" : undefined, fontWeight: r.isHighlight ? 700 : 400 }}>
                  {competitor.columns.map((c) => (
                    <td key={c.id} style={{ padding: "0.5rem" }}>{c.id === "service" ? r.serviceName : (r.cells[c.id] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ fontSize: "0.625rem", color: "#999", margin: "0.5rem 0 0" }}>
          記事編集で「競合比較表を挿入」をオンにすると、この表がFAQ直前に焼き込まれます。行・価格の編集は本体側で。
        </p>
      </div>
    </div>
  );
}
