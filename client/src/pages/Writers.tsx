import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import SeoHead from "@/components/SeoHead";
import { Bot, User } from "lucide-react";

const LANG_LABELS: Record<string, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어",
  "zh-TW": "繁體中文",
};

function WriterBadge({ type }: { type: "human" | "ai" }) {
  if (type === "human") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0.25rem 0.625rem",
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "#EEF6FF",
          color: "#1D6FD8",
          border: "1px solid #BFD9F7",
          borderRadius: "2px",
        }}
      >
        <User size={10} strokeWidth={2} />
        Human
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.25rem 0.625rem",
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: "#F3F0FF",
        color: "#6B3FD8",
        border: "1px solid #D4CAFF",
        borderRadius: "2px",
      }}
    >
      <Bot size={10} strokeWidth={2} />
      AI
    </span>
  );
}

export default function Writers() {
  const { data: writers, isLoading } = trpc.aiWriters.listPublic.useQuery();
  const [filter, setFilter] = useState<"all" | "human" | "ai">("all");

  const filtered = writers?.filter((w) => {
    if (!w.isActive) return false;
    if (filter === "all") return true;
    return w.writerType === filter;
  }) ?? [];

  return (
    <>
      <SeoHead
        title="Writers | Yah. Magazine"
        description="Meet the writers behind Yah. Magazine — a mix of human travel experts and AI personas covering Japan's food, culture, and travel scene."
        keywords="yah magazine writers, japan travel writers, ai writers, human writers, fukuoka guide"
      />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "4rem 1.5rem 6rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "3rem" }}>
          <Link href="/" style={{ fontSize: "0.8125rem", color: "#888", textDecoration: "none", letterSpacing: "0.05em" }}>
            ← Back to Magazine
          </Link>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#111",
              margin: "1.5rem 0 0.75rem",
              lineHeight: 1.15,
            }}
          >
            Our Writers
          </h1>
          <p style={{ fontSize: "1rem", color: "#555", lineHeight: 1.7, maxWidth: "560px" }}>
            Yah. Magazine is written by a team of human travel experts and AI editorial personas — each with a distinct voice and specialty.
          </p>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.75rem" }}>
            {(["all", "human", "ai"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "0.375rem 1rem",
                  fontSize: "0.8125rem",
                  fontWeight: filter === f ? 600 : 400,
                  letterSpacing: "0.05em",
                  textTransform: "capitalize",
                  border: "1px solid",
                  borderColor: filter === f ? "#111" : "#D7D7D7",
                  background: filter === f ? "#111" : "transparent",
                  color: filter === f ? "#fff" : "#555",
                  cursor: "pointer",
                  transition: "all 0.15s ease-out",
                }}
              >
                {f === "all" ? "All" : f === "human" ? "Human" : "AI"}
              </button>
            ))}
          </div>
        </div>

        {/* Writers grid */}
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: "220px", background: "#F5F5F5", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "4rem 0" }}>No writers found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem" }}>
            {filtered.map((writer) => (
              <div
                key={writer.id}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8E8E8",
                  padding: "1.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  transition: "box-shadow 0.18s ease-out, transform 0.18s ease-out",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                {/* Avatar + badge */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  {writer.avatarUrl ? (
                    <img
                      src={writer.avatarUrl}
                      alt={writer.name}
                      style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #F0F0F0" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        background: writer.writerType === "human" ? "#EEF6FF" : "#F3F0FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        border: "2px solid #F0F0F0",
                      }}
                    >
                      {writer.writerType === "human" ? (
                        <User size={22} color={writer.writerType === "human" ? "#1D6FD8" : "#6B3FD8"} strokeWidth={1.5} />
                      ) : (
                        <Bot size={22} color="#6B3FD8" strokeWidth={1.5} />
                      )}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <h2
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: "1.0625rem",
                          fontWeight: 700,
                          color: "#111",
                          margin: 0,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {writer.name}
                      </h2>
                      <WriterBadge type={writer.writerType as "human" | "ai"} />
                    </div>
                    {/* Languages */}
                    {writer.languages && (
                      <p style={{ fontSize: "0.75rem", color: "#999", margin: "0.25rem 0 0", letterSpacing: "0.03em" }}>
                        {writer.languages
                          .split(",")
                          .map((l) => LANG_LABELS[l.trim()] ?? l.trim())
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {writer.bio && (
                  <p style={{ fontSize: "0.875rem", color: "#555", lineHeight: 1.65, margin: 0 }}>
                    {writer.bio.length > 140 ? writer.bio.slice(0, 140) + "…" : writer.bio}
                  </p>
                )}

                {/* Tone / specialty */}
                {(writer.tone || writer.categorySpecialties) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "auto" }}>
                    {writer.tone && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          padding: "0.2rem 0.5rem",
                          background: "#F5F5F5",
                          color: "#666",
                          border: "1px solid #E8E8E8",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {writer.tone}
                      </span>
                    )}
                    {writer.categorySpecialties?.split(",").slice(0, 3).map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: "0.6875rem",
                          padding: "0.2rem 0.5rem",
                          background: "#F5F5F5",
                          color: "#666",
                          border: "1px solid #E8E8E8",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
