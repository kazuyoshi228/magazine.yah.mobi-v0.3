import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listAllArticlesAdmin, deleteArticle as deleteArticleDoc } from "@/lib/db";
import { useAuth } from "@/_core/hooks/useAuth";

import { Plus, Edit2, Trash2, FileText, Eye, ShieldCheck, PenLine, Users, ChevronUp, ChevronDown, Languages, UserRound } from "lucide-react";
import { CATEGORIES, type ArticleAdminRow, type CategorySlug } from "@shared/types";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";

const STATUS_COLORS: Record<string, string> = {
  published: "#000000",
  draft: "#999999",
  archived: "#D7D7D7",
};

type SortKey = "category" | "status" | "publishedAt";

// 全公開記事数（言語計）の目標: 30記事×5言語（月間1,000人流入計画）
const PUBLISHED_PAGES_GOAL = 150;

// ステータスの表示順（公開中→下書き→アーカイブ）
const STATUS_ORDER: Record<string, number> = { published: 0, draft: 1, archived: 2 };

interface CmsAdminProps {
  /** カテゴリ絞り込み（/admin/cms/esim 等）。undefined = 全記事 */
  category?: CategorySlug;
}

export default function CmsAdmin({ category }: CmsAdminProps) {
  const { user, loading } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortRows = (rows: ArticleAdminRow[]): ArticleAdminRow[] => {
    if (!sortKey) return rows;
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "category") cmp = a.categorySlug.localeCompare(b.categorySlug);
      else if (sortKey === "status") cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      else if (sortKey === "publishedAt") cmp = (a.publishedAt ?? 0) - (b.publishedAt ?? 0); // 未公開(null)は最古扱い
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  };

  const isAdmin = !!user && user.role === "admin";
  const { data: allArticles, refetch: refetchArticles } = useQuery({
    queryKey: ["cms", "articles"],
    queryFn: listAllArticlesAdmin,
    enabled: isAdmin,
  });
  // カテゴリ絞り込み（URL /admin/cms/{category}）。統計カード・一覧の両方に効く
  const articles = category ? allArticles?.filter((a) => a.categorySlug === category) : allArticles;

  const deleteArticle = useMutation({
    mutationFn: (slug: string) => deleteArticleDoc(slug),
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

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
        <p style={{ fontSize: "1.125rem", color: "#555555" }}>CMS へのアクセスには管理者権限が必要です。</p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <a href="/login" className="btn-primary">ログイン画面へ</a>
          <Link href="/" className="btn-outline">ホームへ戻る</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="CMS管理" noindex />

      <div style={{ backgroundColor: "#F7F7F7", minHeight: "100vh" }}>
        {/* Admin header */}
        <div style={{ backgroundColor: "#000000", color: "#FFFFFF", padding: "1.5rem 0", position: "sticky", top: 0, zIndex: 100 }}>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="label-section" style={{ color: "rgba(255,255,255,0.4)", marginBottom: "0.25rem" }}>yah.magazine</p>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 500, color: "#FFFFFF", margin: 0, letterSpacing: "-0.02em" }}>CMS管理</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <Link href="/admin/authors" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <Users size={13} strokeWidth={1.5} />
                Author
              </Link>
              <Link href="/admin/writer" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <PenLine size={13} strokeWidth={1.5} />
                Writer
              </Link>
              <Link href="/admin/whitelist" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <ShieldCheck size={13} strokeWidth={1.5} />
                管理者
              </Link>
            </div>
          </div>
        </div>

        {/* カテゴリタブ（URLで切替 = 計測・共有しやすい） */}
        <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #D7D7D7" }}>
          <div className="container" style={{ display: "flex", gap: "0.25rem", overflowX: "auto" }}>
            {[{ slug: null as CategorySlug | null, label: "すべて" }, ...CATEGORIES.map((c) => ({ slug: c.slug as CategorySlug | null, label: c.nameJa }))].map((t) => {
              const active = (category ?? null) === t.slug;
              return (
                <Link
                  key={t.label}
                  href={t.slug ? `/admin/cms/${t.slug}` : "/admin/cms"}
                  style={{
                    padding: "0.75rem 1.125rem",
                    fontSize: "0.8125rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? "#000000" : "#999999",
                    borderBottom: active ? "2px solid #000000" : "2px solid transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Stats（カード形式） */}
        <div style={{ padding: "1.5rem 0", borderBottom: "1px solid #D7D7D7" }}>
          <div className="container">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              {([
                { icon: <FileText size={14} strokeWidth={1.5} color="#555555" />, label: "記事数", value: articles?.length ?? 0 },
                { icon: <Eye size={14} strokeWidth={1.5} color="#555555" />, label: "公開中", value: articles?.filter((a) => a.status === "published").length ?? 0 },
                { icon: <Languages size={14} strokeWidth={1.5} color="#555555" />, label: "ドラフト数", value: articles?.filter((a) => a.status === "draft").length ?? 0 },
                {
                  icon: <UserRound size={14} strokeWidth={1.5} color="#555555" />,
                  label: `全公開記事数（言語計・目標${PUBLISHED_PAGES_GOAL}）`,
                  value: (() => {
                    const n = articles?.filter((a) => a.status === "published").reduce((sum, a) => sum + a.languages.length, 0) ?? 0;
                    const pct = Math.round((n / PUBLISHED_PAGES_GOAL) * 1000) / 10;
                    return (
                      <span>
                        {n}
                        <span style={{ fontSize: "0.875rem", color: "#999999", fontWeight: 400 }}> / {PUBLISHED_PAGES_GOAL}</span>
                        <span style={{ fontSize: "0.875rem", color: "#000000", fontWeight: 600, marginLeft: "0.5rem" }}>{pct}%</span>
                        <span style={{ display: "block", marginTop: "0.5rem", height: "4px", backgroundColor: "#EBEBEB", borderRadius: "2px", overflow: "hidden" }}>
                          <span style={{ display: "block", height: "100%", width: `${Math.min(100, pct)}%`, backgroundColor: "#000000" }} />
                        </span>
                      </span>
                    );
                  })(),
                },
              ] as { icon: React.ReactNode; label: string; value: React.ReactNode }[]).map((c) => (
                <div key={c.label} style={{ backgroundColor: "#FFFFFF", border: "1px solid #D7D7D7", borderRadius: "4px", padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    {c.icon}
                    <span className="label-section">{c.label}</span>
                  </div>
                  <p style={{ fontSize: "2rem", fontWeight: 500, margin: 0, letterSpacing: "-0.03em" }}>{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #D7D7D7" }}>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#000000" }}>
              記事管理
            </span>
            <Link
              href="/admin/cms/new"
              className="btn-primary"
              style={{ fontSize: "0.6875rem", padding: "0.5rem 1.25rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
            >
              <Plus size={12} strokeWidth={2} />
              新規記事
            </Link>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "2rem 0" }}>
          <div className="container">
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
                      {([
                        { label: "記事", key: null },
                        { label: "言語", key: null },
                        { label: "カテゴリ", key: "category" as SortKey },
                        { label: "ステータス", key: "status" as SortKey },
                        { label: "公開日", key: "publishedAt" as SortKey },
                        { label: "操作", key: null },
                      ]).map((h) => (
                        <th
                          key={h.label}
                          onClick={h.key ? () => toggleSort(h.key!) : undefined}
                          title={h.key ? "クリックでソート（再クリックで昇順/降順切替）" : undefined}
                          style={{
                            padding: "0.875rem 1.25rem",
                            textAlign: "left",
                            fontSize: "0.625rem",
                            fontWeight: 500,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: sortKey === h.key && h.key ? "#000000" : "#999999",
                            whiteSpace: "nowrap",
                            cursor: h.key ? "pointer" : "default",
                            userSelect: "none",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                            {h.label}
                            {h.key && sortKey === h.key && (sortAsc ? <ChevronUp size={11} strokeWidth={2} /> : <ChevronDown size={11} strokeWidth={2} />)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortRows(articles).map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid #EBEBEB" }}>
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <Link href={`/admin/cms/${a.id}`} style={{ display: "block" }}>
                            <p
                              style={{ fontSize: "0.9375rem", fontWeight: 500, margin: 0, lineHeight: 1.4, transition: "color 150ms" }}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#555555")}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#000000")}
                            >
                              {a.titleJa ?? <span style={{ color: "#999999" }}>（タイトル未入力）</span>}
                            </p>
                            <p style={{ fontSize: "0.6875rem", color: "#999999", margin: "0.25rem 0 0", fontFamily: "monospace" }}>{a.slug}</p>
                          </Link>
                        </td>
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                            {a.languages.length === 0 ? (
                              <span style={{ fontSize: "0.6875rem", color: "#D7D7D7" }}>—</span>
                            ) : (
                              a.languages.map((l) => (
                                <span key={l} style={{ fontSize: "0.625rem", fontWeight: 500, letterSpacing: "0.04em", border: "1px solid #D7D7D7", color: "#555555", padding: "0.125rem 0.375rem", whiteSpace: "nowrap" }}>
                                  {l === "zh-TW" ? "繁中" : l.toUpperCase()}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "1rem 1.25rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "#555555" }}>{a.categoryNameJa} ({a.categorySlug})</span>
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
                            {deleteConfirm === a.id ? (
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  onClick={() => deleteArticle.mutate(a.id)}
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
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
