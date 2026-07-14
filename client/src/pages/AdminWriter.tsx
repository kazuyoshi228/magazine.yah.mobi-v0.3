import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, PenLine, CheckSquare, AlertTriangle, BookOpen } from "lucide-react";
import SeoHead from "@/components/SeoHead";

/* ライター（受注編集者）向け作業マニュアル。
   正本は docs/spec_outsourcing_ja.md・CLAUDE.md。食い違う場合はそちらが優先。 */

const CHECKLIST = [
  "冒頭に directAnswer：定義文＋数値＋確認日（GEOで引用される条件）",
  "消す離脱理由を1つ持つ（hesitation: price / hassle / anxiety）",
  "手渡し先がある（handoff: 道具 or /buy?ref=…）＝読者を次の行動へ送る",
  "クエリは実査：主クエリ・従クエリが実在（検索ボリューム根拠を添付）。想像で作らない",
  "一次情報の確認：価格・実測・手順・日付に出典を明記し confirmedDate を入れる",
  "front-matter 必須項目：slug / category / schemaType / status / layer ＋ 各言語 title / directAnswer / metaTitle / metaDescription",
  "価格・在庫は本文に直書きしない（runtime 値は plans から。{{price}} 束縛）",
  "本文と FAQ・比較表の数値が矛盾しない（AIは矛盾を嫌う＝GEOで不利）",
  "誤字脱字・事実誤り・不自然な機械翻訳臭がない",
];

const RULES = [
  { title: "公開しない", body: "status: published への昇格は発注者の最終承認のみ。あなたは「公開可」を申請するところまで。" },
  { title: "本番データを壊さない", body: "既存の編集済み記事を無断で上書きしない。価格・在庫（runtime）は CMS/plans のみで扱う。" },
  { title: "一次情報主義", body: "数値には必ず出典と確認日。裏の取れない数値は載せない（「該当なしバケツ」に退避）。" },
];

const NG = [
  "検索需要を確認せず「想像のキーワード」で記事を作った",
  "価格を出典なしで書いた／本文に価格を直書きした",
  "AI 下書きを“リライト”して逆に事実を壊した",
  "KO / zh-TW をネイティブ確認なしで公開申請した",
  "発注者の承認前に公開した",
];

const FLOW = [
  { step: "1", label: "下書きを開く", body: "AI（Claude）が投入した draft 記事を CMS一覧 から開く。ゼロからの執筆はしない。" },
  { step: "2", label: "クエリ実査", body: "狙うキーワードの検索ボリューム・実在を確認し、根拠（ツール名・数値）を残す。" },
  { step: "3", label: "一次情報の確認", body: "価格・実測・手順・日付を一次情報で裏どり。出典と確認日（confirmedDate）を記録する。ここが報酬の中心。" },
  { step: "4", label: "編集・QA", body: "事実誤り・戦略不整合・トーンを直し、下の受入チェックリストを全て満たす。" },
  { step: "5", label: "公開可を申請", body: "front-matter を整えたら status は draft のまま、発注者へ「公開可」を申請。公開は発注者のみが行う。" },
];

const sectionTitle: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#000000",
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "1rem",
};

const card: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D7D7D7",
  padding: "1.5rem 1.75rem",
  marginBottom: "1.5rem",
};

export default function AdminWriter() {
  const { user, loading } = useAuth();
  const isAdmin = !!user && user.role === "admin";

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
        <p style={{ fontSize: "1.125rem", color: "#555555" }}>このページの閲覧にはログインが必要です。</p>
        <a href="/login" className="btn-primary">ログイン</a>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Writer — 作業マニュアル | yah.magazine CMS" description="受注編集者向けの作業マニュアル" noindex />
      <div style={{ backgroundColor: "#F7F7F7", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ backgroundColor: "#000000", color: "#FFFFFF", padding: "1.5rem 0", position: "sticky", top: 0, zIndex: 100 }}>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="label-section" style={{ color: "rgba(255,255,255,0.4)", marginBottom: "0.25rem" }}>yah.magazine</p>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 500, color: "#FFFFFF", margin: 0, letterSpacing: "-0.02em" }}>Writer — 作業マニュアル</h1>
            </div>
            <Link href="/admin/cms" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <ArrowLeft size={13} strokeWidth={1.5} />
              CMS管理へ戻る
            </Link>
          </div>
        </div>

        <div className="container" style={{ maxWidth: "800px", padding: "2.5rem 1.5rem 4rem" }}>
          {/* 一行サマリ */}
          <div style={{ ...card, borderLeft: "3px solid #000000" }}>
            <p style={{ fontSize: "0.9375rem", lineHeight: 1.8, color: "#111111", margin: 0 }}>
              あなたの仕事は<strong>「確認・QA・公開仕上げ」</strong>です。きれいな文章ではなく、
              「その価格は本当か」「そのクエリは実在するか」を潰す作業に報酬が支払われます。
              初稿はAIが投入済み — 白紙から書くことはありません。
            </p>
            <p style={{ fontSize: "0.75rem", color: "#999999", margin: "0.75rem 0 0" }}>
              下書きの品質が低い場合は全部書き直さず、発注者へエスカレーションしてください（下書きはAI側で改善します）。
            </p>
          </div>

          {/* フロー */}
          <div style={card}>
            <h2 style={sectionTitle}><PenLine size={14} strokeWidth={1.5} />1記事の作業フロー</h2>
            {FLOW.map((f) => (
              <div key={f.step} style={{ display: "flex", gap: "1rem", padding: "0.75rem 0", borderTop: "1px solid #EEEEEE" }}>
                <div style={{ flexShrink: 0, width: "1.75rem", height: "1.75rem", borderRadius: "50%", backgroundColor: "#000000", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600 }}>{f.step}</div>
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: "0 0 0.25rem" }}>{f.label}</p>
                  <p style={{ fontSize: "0.8125rem", lineHeight: 1.7, color: "#555555", margin: 0 }}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 受入チェックリスト */}
          <div style={card}>
            <h2 style={sectionTitle}><CheckSquare size={14} strokeWidth={1.5} />完成の定義（受入チェックリスト）</h2>
            <p style={{ fontSize: "0.75rem", color: "#999999", margin: "0 0 0.75rem" }}>すべて満たして「完成」。1つでも欠ければ差し戻しです。</p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {CHECKLIST.map((c, i) => (
                <li key={i} style={{ fontSize: "0.8125rem", lineHeight: 1.7, color: "#333333", padding: "0.5rem 0", borderTop: "1px solid #EEEEEE", display: "flex", gap: "0.625rem" }}>
                  <span style={{ color: "#999999" }}>☐</span>{c}
                </li>
              ))}
            </ul>
          </div>

          {/* 鉄則 */}
          <div style={card}>
            <h2 style={sectionTitle}><BookOpen size={14} strokeWidth={1.5} />鉄則（厳守）</h2>
            {RULES.map((r, i) => (
              <div key={i} style={{ padding: "0.75rem 0", borderTop: "1px solid #EEEEEE" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111111", margin: "0 0 0.25rem" }}>{i + 1}. {r.title}</p>
                <p style={{ fontSize: "0.8125rem", lineHeight: 1.7, color: "#555555", margin: 0 }}>{r.body}</p>
              </div>
            ))}
          </div>

          {/* NG例 */}
          <div style={{ ...card, borderColor: "#000000" }}>
            <h2 style={sectionTitle}><AlertTriangle size={14} strokeWidth={1.5} />NG例（差し戻し／契約見直し）</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {NG.map((n, i) => (
                <li key={i} style={{ fontSize: "0.8125rem", lineHeight: 1.7, color: "#333333", padding: "0.5rem 0", borderTop: "1px solid #EEEEEE", display: "flex", gap: "0.625rem" }}>
                  <span>✕</span>{n}
                </li>
              ))}
            </ul>
          </div>

          <p style={{ fontSize: "0.75rem", color: "#999999", lineHeight: 1.7 }}>
            付録 — Layer: M（王道/マネー）/ 0（eSIMグリッド）/ 1（ローミング比較）/ 1.5（旅ハウツー）/ 3（福岡実測）/ season（季節）。
            Hesitation: price（高いかも）/ hassle（面倒）/ anxiety（自分に合うか不安）。
            詳細な条件・単価は発注仕様書（docs/spec_outsourcing_ja.md）を正本とします。
          </p>
        </div>
      </div>
    </>
  );
}
