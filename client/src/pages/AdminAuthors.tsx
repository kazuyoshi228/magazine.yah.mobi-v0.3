import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listAuthors, saveAuthor, deleteAuthor, uploadImageFile } from "@/lib/db";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, UserPlus, Trash2, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";
import type { AuthorDoc } from "@shared/types";

/* 著者マスタ管理。ここで登録した著者を記事編集画面で選ぶと、
   記事ページ・feed・JSON-LD の byline に自動反映される。
   email はログイン（Firebase Auth）のメールと突き合わせ、
   記事編集時のデフォルト著者判定に使う。 */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  fontSize: "0.875rem",
  border: "1px solid #D7D7D7",
  backgroundColor: "#FFFFFF",
  color: "#000000",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "#555555",
  marginBottom: "0.375rem",
};

export default function AdminAuthors() {
  const { user, loading } = useAuth();
  const isAdmin = !!user && user.role === "admin";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const { data: authors = [], refetch } = useQuery({
    queryKey: ["cms", "authors"],
    queryFn: listAuthors,
    enabled: isAdmin,
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setTitle("");
    setPhotoUrl("");
    setFormOpen(false);
  };

  const startEdit = (a: AuthorDoc) => {
    setEditingId(a.id);
    setName(a.name);
    setEmail(a.email);
    setTitle(a.title);
    setPhotoUrl(a.photoUrl ?? "");
    setFormOpen(true);
  };

  const save = useMutation({
    mutationFn: () => saveAuthor({ id: editingId ?? undefined, name, email, title, photoUrl: photoUrl || null }),
    onSuccess: () => {
      toast.success(editingId ? "著者を更新しました。" : "著者を登録しました。");
      resetForm();
      refetch();
    },
    onError: (e: Error) => toast.error(e.message || "保存に失敗しました。"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAuthor(id),
    onSuccess: () => {
      toast.success("著者を削除しました。既存記事の byline は残ります（記事側で選び直すと消えます）。");
      refetch();
    },
    onError: () => toast.error("削除に失敗しました。"),
  });

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("画像は5MB以内にしてください。"); return; }
    setUploading(true);
    try {
      const url = await uploadImageFile(file, "authors");
      setPhotoUrl(url);
      toast.success("顔写真をアップロードしました。");
    } catch {
      toast.error("アップロードに失敗しました。");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid #D7D7D7", borderTopColor: "#000000", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
        <p style={{ fontSize: "1.125rem", color: "#555555" }}>このページの閲覧には管理者権限が必要です。</p>
        <a href="/login" className="btn-primary">ログイン</a>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Author 管理 | yah.magazine CMS" description="著者マスタの管理" noindex />
      <div style={{ backgroundColor: "#F7F7F7", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ backgroundColor: "#000000", color: "#FFFFFF", padding: "1.5rem 0" }}>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="label-section" style={{ color: "rgba(255,255,255,0.4)", marginBottom: "0.25rem" }}>yah.magazine</p>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 500, color: "#FFFFFF", margin: 0, letterSpacing: "-0.02em" }}>Author 管理</h1>
            </div>
            <Link href="/admin/cms" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <ArrowLeft size={13} strokeWidth={1.5} />
              CMS管理へ戻る
            </Link>
          </div>
        </div>

        <div className="container" style={{ maxWidth: "800px", padding: "2.5rem 1.5rem 4rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "#555555", lineHeight: 1.8, marginBottom: "1.5rem" }}>
            登録した著者は記事編集画面で選択でき、記事ページ・配信feedの署名（byline）に自動反映されます。
            Eメールはログインメールと突き合わせ、その著者が記事を新規作成すると自動で本人がデフォルト著者になります。
          </p>

          {/* 新規登録ボタン / フォーム */}
          {!formOpen ? (
            <button className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }} onClick={() => { resetForm(); setFormOpen(true); }}>
              <UserPlus size={14} strokeWidth={1.5} />
              著者を登録
            </button>
          ) : (
            <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D7D7D7", padding: "1.5rem 1.75rem", marginBottom: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <p style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
                  {editingId ? "著者を編集" : "著者を登録"}
                </p>
                <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#999999" }}><X size={16} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                  {/* 顔写真 */}
                  <div style={{ flexShrink: 0 }}>
                    <label style={labelStyle}>顔写真</label>
                    <label htmlFor="author-photo" style={{ display: "block", width: "88px", height: "88px", borderRadius: "50%", border: "1px solid #D7D7D7", overflow: "hidden", cursor: uploading ? "wait" : "pointer", backgroundColor: "#F0F0F0", position: "relative" }}>
                      {photoUrl ? (
                        <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.625rem", color: "#999999", textAlign: "center", padding: "0 0.5rem" }}>
                          {uploading ? "..." : "クリックして選択"}
                        </span>
                      )}
                    </label>
                    <input id="author-photo" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhoto} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>名前 *</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="山田 一慶" />
                    </div>
                    <div>
                      <label style={labelStyle}>属性・肩書き</label>
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="yah.homes 運営 / 調査できる編集者 など" />
                    </div>
                    <div>
                      <label style={labelStyle}>Eメール（ログインメールと同じものを登録）*</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="writer@example.com" />
                    </div>
                  </div>
                </div>
                <div>
                  <button className="btn-primary" disabled={save.isPending || uploading} onClick={() => save.mutate()}>
                    {save.isPending ? "保存中..." : editingId ? "更新する" : "登録する"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 一覧 */}
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D7D7D7" }}>
            {authors.length === 0 && (
              <p style={{ padding: "1.5rem", fontSize: "0.875rem", color: "#999999", margin: 0 }}>著者はまだ登録されていません。</p>
            )}
            {authors.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.5rem", borderTop: "1px solid #EEEEEE" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#F0F0F0", flexShrink: 0 }}>
                  {a.photoUrl && <img src={a.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: 0 }}>{a.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "#999999", margin: 0 }}>{a.title}{a.title && " ・ "}{a.email}</p>
                </div>
                <button onClick={() => startEdit(a)} style={{ background: "none", border: "1px solid #D7D7D7", padding: "0.375rem", cursor: "pointer", color: "#555555" }} title="編集">
                  <Edit2 size={13} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => { if (window.confirm(`「${a.name}」を削除しますか？`)) remove.mutate(a.id); }}
                  style={{ background: "none", border: "1px solid #D7D7D7", padding: "0.375rem", cursor: "pointer", color: "#555555" }}
                  title="削除"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
