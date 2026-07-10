import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";


const PLATFORM_OPTIONS = [
  { value: "blog", label: "ブログ" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "tiktok", label: "TikTok" },
  { value: "note", label: "note" },
  { value: "other", label: "その他" },
];

export default function AdminCurators() {
  const { user, loading: authLoading } = useAuth();
  const [editItem, setEditItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const utils = trpc.useUtils();
  const { data: curators = [], isLoading } = trpc.curators.list.useQuery();
  const upsert = trpc.curators.upsert.useMutation({
    onSuccess: () => { utils.curators.list.invalidate(); setShowForm(false); setEditItem(null); },
  });
  const remove = trpc.curators.delete.useMutation({
    onSuccess: () => utils.curators.list.invalidate(),
  });

  if (authLoading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  if (!user) { window.location.href = "/login"; return null; }
  if (user.role !== "admin") return <div style={{ padding: 40 }}>管理者権限が必要です。</div>;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsert.mutate({
      id: editItem?.id,
      name: fd.get("name") as string,
      url: fd.get("url") as string,
      platform: fd.get("platform") as string || undefined,
      notes: fd.get("notes") as string || undefined,
      isActive: fd.get("isActive") === "true",
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <a href="/admin" style={{ fontSize: 12, color: "#999", textDecoration: "none" }}>← Admin</a>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px", letterSpacing: "-0.02em" }}>Curator</h1>
            <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
              参考にするブロガー・インフルエンサーのURLを登録します。記事生成時にAIがこれらを参照します。
            </p>
          </div>
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            style={{ padding: "8px 16px", background: "#000", color: "#fff", border: "none", borderRadius: 2, fontSize: 12, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}
          >
            + URLを追加
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div style={{ background: "#fff", border: "1px solid #D7D7D7", borderRadius: 4, padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600 }}>{editItem ? "Curatorを編集" : "新しいCuratorを追加"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>名前 / アカウント名</label>
                <input name="name" defaultValue={editItem?.name || ""} required placeholder="例: 旅するフォトグラファー田中"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>プラットフォーム</label>
                <select name="platform" defaultValue={editItem?.platform || "blog"}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13 }}>
                  {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>URL</label>
                <input name="url" type="url" defaultValue={editItem?.url || ""} required placeholder="https://..."
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>メモ（任意）</label>
                <textarea name="notes" defaultValue={editItem?.notes || ""} rows={3}
                  placeholder="このCuratorの特徴、参考にする点など"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13, boxSizing: "border-box", resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>ステータス</label>
                <select name="isActive" defaultValue={editItem?.isActive !== false ? "true" : "false"}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13 }}>
                  <option value="true">有効（AIが参照する）</option>
                  <option value="false">無効（AIが参照しない）</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <button type="submit" disabled={upsert.isPending}
                  style={{ padding: "8px 20px", background: "#000", color: "#fff", border: "none", borderRadius: 2, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                  {upsert.isPending ? "保存中..." : "保存"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }}
                  style={{ padding: "8px 16px", background: "transparent", color: "#666", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13, cursor: "pointer" }}>
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Curators List */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>読み込み中...</div>
        ) : curators.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #D7D7D7", borderRadius: 4, padding: 48, textAlign: "center" }}>
            <p style={{ color: "#999", fontSize: 14, margin: "0 0 8px" }}>Curatorが登録されていません。</p>
            <p style={{ color: "#bbb", fontSize: 12, margin: "0 0 20px" }}>参考にするブロガーやインフルエンサーのURLを追加してください。</p>
            <button onClick={() => setShowForm(true)}
              style={{ padding: "10px 20px", background: "#000", color: "#fff", border: "none", borderRadius: 2, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              + URLを追加
            </button>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #D7D7D7", borderRadius: 4, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #D7D7D7", background: "#F7F7F7" }}>
                  <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, color: "#999", fontWeight: 500 }}>名前</th>
                  <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, color: "#999", fontWeight: 500 }}>プラットフォーム</th>
                  <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, color: "#999", fontWeight: 500 }}>URL</th>
                  <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, color: "#999", fontWeight: 500 }}>メモ</th>
                  <th style={{ padding: "10px 20px", textAlign: "center", fontSize: 11, color: "#999", fontWeight: 500 }}>状態</th>
                  <th style={{ padding: "10px 20px", textAlign: "right", fontSize: 11, color: "#999", fontWeight: 500 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {curators.map((c, idx) => (
                  <tr key={c.id} style={{ borderBottom: idx < curators.length - 1 ? "1px solid #F0F0F0" : "none" }}>
                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#666" }}>
                      {PLATFORM_OPTIONS.find(p => p.value === c.platform)?.label || c.platform || "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12 }}>
                      <a href={c.url} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#333", textDecoration: "underline", textUnderlineOffset: 2, wordBreak: "break-all" }}>
                        {c.url.replace(/^https?:\/\//, "").slice(0, 50)}{c.url.length > 55 ? "..." : ""}
                      </a>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 12, color: "#666", maxWidth: 200 }}>
                      {c.notes ? <span title={c.notes}>{c.notes.slice(0, 60)}{c.notes.length > 60 ? "..." : ""}</span> : "—"}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 2, fontSize: 11, fontWeight: 500,
                        background: c.isActive ? "#000" : "#F0F0F0",
                        color: c.isActive ? "#fff" : "#999",
                      }}>
                        {c.isActive ? "有効" : "無効"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <button onClick={() => { setEditItem(c); setShowForm(true); }}
                        style={{ background: "none", border: "none", fontSize: 12, color: "#555", cursor: "pointer", marginRight: 8 }}>編集</button>
                      <button onClick={() => { if (confirm("削除しますか？")) remove.mutate({ id: c.id }); }}
                        style={{ background: "none", border: "none", fontSize: 12, color: "#999", cursor: "pointer" }}>削除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {curators.length > 0 && (
          <p style={{ fontSize: 12, color: "#aaa", marginTop: 16, textAlign: "center" }}>
            有効なCurator {curators.filter(c => c.isActive).length}件 がAI記事生成時に参照されます。
          </p>
        )}
      </div>
    </div>
  );
}
