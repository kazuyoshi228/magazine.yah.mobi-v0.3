import { Link } from "wouter";
import type { Lang } from "./Header";

interface FooterProps {
  lang: Lang;
}

// 上部グリッド（ブランド説明・サービス・法的情報）は2026-07-14に削除。
// 最下段のバー（コピーライト＋Adminリンク）のみ残す。
export default function Footer(_props: FooterProps) {
  return (
    <footer
      style={{
        backgroundColor: "#F7F7F7",
        color: "#000000",
        paddingTop: "1.5rem",
        paddingBottom: "1.5rem",
        borderTop: "1px solid #D7D7D7",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <p style={{ fontSize: "0.75rem", color: "#999999", margin: 0 }}>
            © 2025 yah. All rights reserved.
          </p>
          <p style={{ fontSize: "0.75rem", color: "#BBBBBB", margin: 0, letterSpacing: "0.05em" }}>
            magazine.yah.mobi
            {" · "}
            <Link
              href="/login"
              style={{ color: "#BBBBBB", transition: "color 150ms" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#555555")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#BBBBBB")}
            >
              Admin
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
