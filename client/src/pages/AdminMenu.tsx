import { useAuth } from "@/_core/hooks/useAuth";


// SVG icon components
const IconChart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const IconEdit = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconPen = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const IconPalette = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
    <path d="M12 2C6.5 2 2 6.5 2 12a10 10 0 0 0 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const IconLink = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

type MenuItem = {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    href: "/admin",
    icon: <IconChart />,
    title: "Analytics Dashboard",
    description: "ページビュー・ユニーク訪問者・CTAクリック・AIクロールの推移を確認",
  },
  {
    href: "/admin/cms",
    icon: <IconEdit />,
    title: "記事管理（CMS）",
    description: "記事の作成・編集・公開・削除。多言語翻訳の管理も可能",
  },
  {
    href: "/admin/ai-writers",
    icon: <IconPen />,
    title: "AIライター管理",
    description: "AIライターのプロフィール・文書トーン・ペルソナ・文体スタイルを設定",
  },
  {
    href: "/admin/brand-guidelines",
    icon: <IconPalette />,
    title: "ブランドガイダンス",
    description: "ブランドカラー・禁止色・フォント・トーンのルールを管理",
  },
  {
    href: "/admin/curators",
    icon: <IconLink />,
    title: "Curator（参考URL）",
    description: "参考にするブロガー・インフルエンサーのURLを登録。AI記事生成時に参照",
  },
];

export default function AdminMenu() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F7F7" }}>
        <span style={{ color: "#888", fontSize: 14 }}>読み込み中...</span>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  if (user.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <p style={{ fontSize: 15, color: "#555" }}>管理者権限が必要です。</p>
        <a href="/" style={{ fontSize: 13, color: "#000" }}>ホームへ戻る</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #D7D7D7", padding: "16px 0" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/admin" style={{ color: "#888", fontSize: 14, textDecoration: "none" }}>
            ← Admin
          </a>
          <span style={{ color: "#D7D7D7" }}>/</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>管理メニュー</h1>
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 28 }}>
          magazine.yah.mobi の管理機能一覧です。
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {MENU_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "24px",
                background: "#fff",
                border: "1px solid #D7D7D7",
                borderRadius: 4,
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.15s, box-shadow 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#000";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#D7D7D7";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
              }}
            >
              <div style={{ color: "#000", width: 24, height: 24 }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{item.description}</div>
              </div>
              <div style={{ marginTop: "auto", fontSize: 12, color: "#000", fontWeight: 600 }}>
                開く →
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
