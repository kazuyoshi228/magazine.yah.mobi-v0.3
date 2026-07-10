import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";


const CATEGORY_OPTIONS = [
  { value: "color", label: "カラー" },
  { value: "typography", label: "タイポグラフィ" },
  { value: "tone", label: "トーン・ボイス" },
  { value: "forbidden", label: "禁止事項" },
  { value: "layout", label: "レイアウト" },
  { value: "imagery", label: "イメージ・写真" },
  { value: "other", label: "その他" },
];

const INITIAL_DATA = [
  { category: "color", key: "primary_color", value: "#000000", description: "プライマリカラー（黒）", sortOrder: 1 },
  { category: "color", key: "background_color", value: "#F7F7F7", description: "背景カラー（ライトグレー）", sortOrder: 2 },
  { category: "color", key: "border_color", value: "#D7D7D7", description: "ボーダーカラー（グレー）", sortOrder: 3 },
  { category: "color", key: "accent_color", value: "#555555", description: "アクセントカラー（ダークグレー）", sortOrder: 4 },
  { category: "forbidden", key: "forbidden_blue", value: "#2563eb", description: "使用禁止：ブルー系（ブランドカラー外）", sortOrder: 1 },
  { category: "forbidden", key: "forbidden_orange", value: "#ea580c", description: "使用禁止：オレンジ系（ブランドカラー外）", sortOrder: 2 },
  { category: "forbidden", key: "forbidden_red", value: "#dc2626", description: "使用禁止：レッド系（ブランドカラー外）", sortOrder: 3 },
  { category: "typography", key: "heading_font", value: "National 2", description: "見出しフォント", sortOrder: 1 },
  { category: "typography", key: "body_font", value: "Noto Sans JP", description: "本文フォント（日本語）", sortOrder: 2 },
  { category: "tone", key: "voice", value: "落ち着いた、知的、旅行者に寄り添う", description: "ブランドボイス", sortOrder: 1 },
  { category: "tone", key: "forbidden_tone", value: "過度に感嘆符を使用しない。誇大表現を避ける。", description: "禁止トーン", sortOrder: 2 },
  { category: "forbidden", key: "forbidden_emoji", value: "絵文字（emoji）使用禁止", description: "UIおよびコンテンツ全般で絵文字を使用しない。SVGアイコンを使用すること。", sortOrder: 4 },
];

export default function AdminBrandGuidelines() {
  const { user, loading: authLoading } = useAuth();
  const [editItem, setEditItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const utils = trpc.useUtils();
  const { data: guidelines = [], isLoading } = trpc.brandGuidelines.list.useQuery();
  const upsert = trpc.brandGuidelines.upsert.useMutation({
    onSuccess: () => { utils.brandGuidelines.list.invalidate(); setShowForm(false); setEditItem(null); },
  });
  const remove = trpc.brandGuidelines.delete.useMutation({
    onSuccess: () => utils.brandGuidelines.list.invalidate(),
  });

  if (authLoading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  if (!user) {
    window.location.href = "/login";
    return null;
  }
  if (user.role !== "admin") return <div style={{ padding: 40 }}>管理者権限が必要です。</div>;

  const grouped = CATEGORY_OPTIONS.map(cat => ({
    ...cat,
    items: guidelines.filter(g => g.category === cat.value),
  })).filter(cat => cat.items.length > 0 || cat.value === "color");

  const handleSeed = async () => {
    for (const item of INITIAL_DATA) {
      await upsert.mutateAsync(item as any);
    }
    setSeeded(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsert.mutate({
      id: editItem?.id,
      category: fd.get("category") as string,
      key: fd.get("key") as string,
      value: fd.get("value") as string,
      description: fd.get("description") as string || undefined,
      sortOrder: Number(fd.get("sortOrder")) || 0,
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <a href="/admin" style={{ fontSize: 12, color: "#999", textDecoration: "none" }}>← Admin</a>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 4px", letterSpacing: "-0.02em" }}>ブランドガイダンス</h1>
            <p style={{ fontSize: 13, color: "#666", margin: 0 }}>記事生成・デザイン制作時のブランドルールを管理します。AIはこれらのルールを参照します。</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {guidelines.length === 0 && (
              <button
                onClick={handleSeed}
                style={{ padding: "8px 16px", background: "#555", color: "#fff", border: "none", borderRadius: 2, fontSize: 12, cursor: "pointer" }}
              >
                デフォルト設定を読み込む
              </button>
            )}
            <button
              onClick={() => { setEditItem(null); setShowForm(true); }}
              style={{ padding: "8px 16px", background: "#000", color: "#fff", border: "none", borderRadius: 2, fontSize: 12, cursor: "pointer", fontWeight: 600 }}
            >
              + ルールを追加
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div style={{ background: "#fff", border: "1px solid #D7D7D7", borderRadius: 4, padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600 }}>{editItem ? "ルールを編集" : "新しいルールを追加"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>カテゴリー</label>
                <select name="category" defaultValue={editItem?.category || "color"} required
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13 }}>
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>キー（識別子）</label>
                <input name="key" defaultValue={editItem?.key || ""} required placeholder="例: primary_color"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>値</label>
                <input name="value" defaultValue={editItem?.value || ""} required placeholder="例: #000000 または テキストルール"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>説明（任意）</label>
                <input name="description" defaultValue={editItem?.description || ""} placeholder="このルールの説明"
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>表示順</label>
                <input name="sortOrder" type="number" defaultValue={editItem?.sortOrder ?? 0}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #D7D7D7", borderRadius: 2, fontSize: 13, boxSizing: "border-box" }} />
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

        {/* Guidelines Table */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>読み込み中...</div>
        ) : guidelines.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #D7D7D7", borderRadius: 4, padding: 40, textAlign: "center" }}>
            <p style={{ color: "#999", fontSize: 14, margin: "0 0 16px" }}>ブランドガイダンスが未設定です。</p>
            <button onClick={handleSeed} style={{ padding: "10px 20px", background: "#000", color: "#fff", border: "none", borderRadius: 2, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              デフォルト設定を読み込む
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {CATEGORY_OPTIONS.map(cat => {
              const items = guidelines.filter(g => g.category === cat.value);
              if (items.length === 0) return null;
              return (
                <div key={cat.value} style={{ background: "#fff", border: "1px solid #D7D7D7", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ padding: "12px 20px", borderBottom: "1px solid #D7D7D7", background: "#F7F7F7" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555" }}>{cat.label}</span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #D7D7D7" }}>
                        <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, color: "#999", fontWeight: 500 }}>キー</th>
                        <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, color: "#999", fontWeight: 500 }}>値</th>
                        <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, color: "#999", fontWeight: 500 }}>説明</th>
                        <th style={{ padding: "10px 20px", textAlign: "right", fontSize: 11, color: "#999", fontWeight: 500 }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: idx < items.length - 1 ? "1px solid #F0F0F0" : "none" }}>
                          <td style={{ padding: "12px 20px", fontSize: 13, fontFamily: "monospace", color: "#333" }}>{item.key}</td>
                          <td style={{ padding: "12px 20px", fontSize: 13 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {item.value.startsWith("#") && (
                                <span style={{ width: 16, height: 16, borderRadius: 2, background: item.value, border: "1px solid #D7D7D7", flexShrink: 0 }} />
                              )}
                              <span style={{ fontFamily: item.value.startsWith("#") ? "monospace" : "inherit" }}>{item.value}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 20px", fontSize: 12, color: "#666" }}>{item.description || "—"}</td>
                          <td style={{ padding: "12px 20px", textAlign: "right" }}>
                            <button onClick={() => { setEditItem(item); setShowForm(true); }}
                              style={{ background: "none", border: "none", fontSize: 12, color: "#555", cursor: "pointer", marginRight: 8 }}>編集</button>
                            <button onClick={() => { if (confirm("削除しますか？")) remove.mutate({ id: item.id }); }}
                              style={{ background: "none", border: "none", fontSize: 12, color: "#999", cursor: "pointer" }}>削除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
