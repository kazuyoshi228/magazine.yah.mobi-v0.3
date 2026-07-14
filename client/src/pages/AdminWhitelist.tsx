import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listWhitelist, addToWhitelist, removeFromWhitelist } from "@/lib/db";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Plus, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";

export default function AdminWhitelist() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdmin = !!user && user.role === "admin";

  const { data: entries, refetch } = useQuery({
    queryKey: ["whitelist"],
    queryFn: listWhitelist,
    enabled: isAdmin,
  });

  const addMutation = useMutation({
    mutationFn: () => addToWhitelist(email, user?.email ?? null),
    onSuccess: () => {
      toast.success(`${email.trim().toLowerCase()} を管理者に追加しました。`);
      setEmail("");
      refetch();
    },
    onError: (e: Error) => toast.error(e.message || "追加に失敗しました。"),
  });

  const removeMutation = useMutation({
    mutationFn: (target: string) => removeFromWhitelist(target),
    onSuccess: () => {
      toast.success("管理者から削除しました。");
      setDeleteConfirm(null);
      refetch();
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
        <p style={{ fontSize: "1.125rem", color: "#555555" }}>この画面へのアクセスには管理者権限が必要です。</p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <a href="/login" className="btn-primary">ログイン画面へ</a>
          <Link href="/" className="btn-outline">ホームへ戻る</Link>
        </div>
      </div>
    );
  }

  const inputStyle = {
    flex: 1,
    padding: "0.75rem 1rem",
    fontSize: "0.9375rem",
    border: "1px solid #D7D7D7",
    backgroundColor: "#FFFFFF",
    color: "#000000",
    outline: "none",
    fontFamily: "inherit",
  } as const;

  return (
    <>
      <SeoHead title="管理者ホワイトリスト" noindex />

      <div style={{ backgroundColor: "#F7F7F7", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ backgroundColor: "#000000", color: "#FFFFFF", padding: "1.25rem 0", position: "sticky", top: 0, zIndex: 100 }}>
          <div className="container" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href="/admin/cms" style={{ color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem" }}>
              <ArrowLeft size={13} strokeWidth={1.5} />
              CMS管理
            </Link>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <h1 style={{ fontSize: "1rem", fontWeight: 500, color: "#FFFFFF", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={16} strokeWidth={1.5} />
              管理者ホワイトリスト
            </h1>
          </div>
        </div>

        <div className="container" style={{ padding: "2rem 0", maxWidth: "760px" }}>
          <p style={{ fontSize: "0.875rem", color: "#555555", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            ここに登録したメールアドレスの Google アカウントでログインすると、記事CMSと本画面にアクセスできます。
            追加は即時に反映されます（ログイン中のユーザーは次回のページ読み込みで有効）。
          </p>

          {/* Add form */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) addMutation.mutate(); }}
              placeholder="editor@example.com"
              style={inputStyle}
            />
            <button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !email.trim()}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", opacity: (addMutation.isPending || !email.trim()) ? 0.6 : 1, whiteSpace: "nowrap" }}
            >
              <Plus size={13} strokeWidth={2} />
              追加
            </button>
          </div>

          {/* List */}
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D7D7D7" }}>
            {!entries || entries.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "#999999" }}>
                <p>ホワイトリストは空です。</p>
                <p style={{ fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                  （現在はカスタムクレームで管理者になっています。ここに自分のメールを追加しておくと確実です）
                </p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #D7D7D7" }}>
                    {["メールアドレス", "追加者", "追加日", ""].map((h) => (
                      <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", fontSize: "0.625rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#999999" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const isSelf = e.email === user.email?.toLowerCase();
                    return (
                      <tr key={e.email} style={{ borderBottom: "1px solid #EBEBEB" }}>
                        <td style={{ padding: "1rem 1.25rem", fontSize: "0.9375rem", fontFamily: "monospace" }}>
                          {e.email}
                          {isSelf && <span style={{ marginLeft: "0.5rem", fontSize: "0.6875rem", color: "#999", fontFamily: "inherit" }}>(自分)</span>}
                        </td>
                        <td style={{ padding: "1rem 1.25rem", fontSize: "0.8125rem", color: "#555555" }}>{e.addedBy ?? "—"}</td>
                        <td style={{ padding: "1rem 1.25rem", fontSize: "0.75rem", color: "#999999" }}>
                          {new Date(e.addedAt).toLocaleDateString("ja-JP")}
                        </td>
                        <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                          {deleteConfirm === e.email ? (
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => removeMutation.mutate(e.email)}
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
                              onClick={() => setDeleteConfirm(e.email)}
                              style={{ color: "#D7D7D7", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", background: "none", border: "none", cursor: "pointer", transition: "color 150ms" }}
                              onMouseEnter={(ev) => ((ev.currentTarget as HTMLElement).style.color = "#999999")}
                              onMouseLeave={(ev) => ((ev.currentTarget as HTMLElement).style.color = "#D7D7D7")}
                              title="ホワイトリストから削除"
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                              削除
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
