import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import { Plus, Edit2, Trash2, Users, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";

type Tab = "articles" | "subscribers";

const STATUS_COLORS: Record<string, string> = {
  published: "#000000",
  draft: "#999999",
  archived: "#D7D7D7",
};

export default function CmsAdmin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("articles");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const canAccessCms = !!user && ['admin', 'writer'].includes(user.role);
  const isAdmin = !!user && user.role === 'admin';
  const { data: articles, refetch: refetchArticles } = trpc.cms.listAll.useQuery(undefined, { enabled: canAccessCms });
  const { data: subscribers } = trpc.subscribers.list.useQuery(undefined, { enabled: !!user && user.role === "admin" });
  const { data: subCount } = trpc.subscribers.count.useQuery(undefined, { enabled: !!user && user.role === "admin" });

  const deleteArticle = trpc.cms.delete.useMutation({
    onSuccess: () => {
      toast.success("記事を削除しました。");
      setDeleteConfirm(null);
      refetchArticles();
    },
    onError: () => toast.error("削除に失敗しました。"),
  });

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid #D7D7D7", borderTopColor: "#000000", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
        <p style={{ fontSize: "1.125rem", color: "#555555" }}>管理者ログインが必要です。</p>
        <a href="/login" className="btn-primary">ログイン</a>
      </div>
    );
  }

  if (!['admin', 'writer'].includes(user.role)) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
        <p style={{ fontSize: "1.125rem", color: "#555555" }}>CMS へのアクセスには writer 以上の権限が必要です。</p>
        <Link href="/" className="btn-outline">ホームへ戻る</Link>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="CMS管理" noindex />

      <div style={{ backgroundColor: "#F7F7F7", minHeight: "100vh" }}>
        {/* Admin header */}
        <div style={{ backgroundColor: "#000000", color: "#FFFFFF", padding: "1.5rem 0" }}>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="label-section" style={{ color: "rgba(255,255,255,0.4)", marginBottom: "0.25rem" }}>yah.magazine</p>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 500, color: "#FFFFFF", margin: 0, letterSpacing: "-0.02em" }}>CMS管理</h1>
            </div>
            <Link href="/" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              サイトを見る →
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #D7D7D7", padding: "1.5rem 0" }}>
          <div className="container">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <FileText size={14} strokeWidth={1.5} color="#555555" />
                  <span className="label-section">記事数</span>
                </div>
                <p style={{ fontSize: "2rem", fontWeight: 500, margin: 0, letterSpacing: "-0.03em" }}>
                  {articles?.length ?? 0}
                </p>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Eye size={14} strokeWidth={1.5} color="#555555" />
                  <span className="label-section">公開中</span>
                </div>
                <p style={{ fontSize: "2rem", fontWeight: 500, margin: 0, letterSpacing: "-0.03em" }}>
                  {articles?.filter((a) => a.status === "published").length ?? 0}
                </p>
              </div>
              <div>
                {isAdmin && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Users size={14} strokeWidth={1.5} color="#555555" />
                  <span className="label-section">購読者数</span>
                </div>
              )}
                {isAdmin && (
                <p style={{ fontSize: "2rem", fontWeight: 500, margin: 0, letterSpacing: "-0.03em" }}>
                  {subCount ?? 0}
                </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #D7D7D7" }}>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex" }}>
              {[
                { key: "articles" as Tab, label: "記事管理" },
                ...(isAdmin ? [{ key: "subscribers" as Tab, label: "購読者管理" }] : []),
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: tab === t.key ? "#000000" : "#999999",
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${tab === t.key ? "#000000" : "transparent"}`,
                    padding: "1rem 1.25rem",
                    cursor: "pointer",
                    transition: "color 150ms, border-color 150ms",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === "articles" && (
              <Link
                href="/admin/cms/new"
                className="btn-primary"
                style={{ fontSize: "0.6875rem", padding: "0.5rem 1.25rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
              >
                <Plus size={12} strokeWidth={2} />
                新規記事
              </Link>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "2rem 0" }}>
          <div className="container">
            {tab === "articles" && (
              <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D7D7D7" }}>
                {!articles || articles.length === 0 ? (
                  <div style={{ padding: "4rem", textAlign: "center", color: "#999999" }}>
                    <p>記事がまだありません。</p>
                    <Link href="/admin/cms/new" className="btn-primary" style={{ marginTop: "1rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                      <Plus size={12} strokeWidth={2} />
                      最初の記事を作成
                    </Link>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #D7D7D7" }}>
                        {["タイトル / スラッグ", "カテゴリ", "ステータス", "公開日", "操作"].map((h) => (
                          <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", fontSize: "0.625rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#999999", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {articles.map((a) => (
                        <tr key={a.id} style={{ borderBottom: "1px solid #EBEBEB" }}>
                          <td style={{ padding: "1rem 1.25rem" }}>
                            <p style={{ fontSize: "0.9375rem", fontWeight: 500, margin: 0, marginBottom: "0.25rem" }}>{a.categoryNameJa}</p>
                            <p style={{ fontSize: "0.75rem", color: "#999999", margin: 0, fontFamily: "monospace" }}>{a.slug}</p>
                          </td>
                          <td style={{ padding: "1rem 1.25rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#555555" }}>{a.categorySlug}</span>
                          </td>
                          <td style={{ padding: "1rem 1.25rem" }}>
                            <span style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: STATUS_COLORS[a.status] ?? "#999999" }}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ padding: "1rem 1.25rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#999999" }}>
                              {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("ja-JP") : "—"}
                            </span>
                          </td>
                          <td style={{ padding: "1rem 1.25rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <Link
                                href={`/admin/cms/${a.id}`}
                                style={{ color: "#555555", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", transition: "color 150ms" }}
                                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#000000")}
                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#555555")}
                              >
                                <Edit2 size={13} strokeWidth={1.5} />
                                編集
                              </Link>
                              {isAdmin && (deleteConfirm === a.id ? (
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    onClick={() => deleteArticle.mutate({ id: a.id })}
                                    style={{ fontSize: "0.75rem", color: "#FFFFFF", backgroundColor: "#000000", border: "none", padding: "0.25rem 0.625rem", cursor: "pointer" }}
                                  >
                                    確認
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    style={{ fontSize: "0.75rem", color: "#555555", backgroundColor: "transparent", border: "1px solid #D7D7D7", padding: "0.25rem 0.625rem", cursor: "pointer" }}
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(a.id)}
                                  style={{ color: "#D7D7D7", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", background: "none", border: "none", cursor: "pointer", transition: "color 150ms" }}
                                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#999999")}
                                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#D7D7D7")}
                                >
                                  <Trash2 size={13} strokeWidth={1.5} />
                                  削除
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === "subscribers" && (
              <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D7D7D7" }}>
                {!subscribers || subscribers.length === 0 ? (
                  <div style={{ padding: "4rem", textAlign: "center", color: "#999999" }}>
                    <p>購読者がまだいません。</p>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #D7D7D7" }}>
                        {["名前", "メールアドレス", "言語", "ステータス", "登録日"].map((h) => (
                          <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", fontSize: "0.625rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#999999" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((s) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #EBEBEB" }}>
                          <td style={{ padding: "1rem 1.25rem", fontSize: "0.9375rem" }}>{s.name}</td>
                          <td style={{ padding: "1rem 1.25rem", fontSize: "0.875rem", color: "#555555" }}>{s.email}</td>
                          <td style={{ padding: "1rem 1.25rem" }}>
                            <span style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555555" }}>{s.lang}</span>
                          </td>
                          <td style={{ padding: "1rem 1.25rem" }}>
                            <span style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: s.status === "active" ? "#000000" : "#999999" }}>
                              {s.status}
                            </span>
                          </td>
                          <td style={{ padding: "1rem 1.25rem", fontSize: "0.75rem", color: "#999999" }}>
                            {new Date(s.createdAt).toLocaleDateString("ja-JP")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
