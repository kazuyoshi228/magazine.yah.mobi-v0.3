import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getArticleForEdit,
  createArticle as createArticleDoc,
  updateArticleMeta,
  upsertTranslation as upsertTranslationDoc,
  uploadImageFile,
  listPlans,
  listAuthors,
} from "@/lib/db";
import { renderCompareBody } from "@/lib/compareGrid";
import { CATEGORIES, LANGS as ALL_LANGS, type Lang, type SchemaType, type ArticleStatus, type CategorySlug, type ArticleTranslation, type Layer, type PageType, type Hesitation, type DistributionSurface } from "@shared/types";
import { useAuth } from "@/_core/hooks/useAuth";

import { ArrowLeft, Save, Eye, Upload, X, ImagePlus, Table } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";

interface CmsArticleEditProps {
  /** 記事slug（docId）。新規作成時は null */
  articleId: string | null;
}

const LANGS = ALL_LANGS as readonly Lang[];
const LANG_LABELS: Record<Lang, string> = { ja: "日本語", en: "English", ko: "한국어", "zh-TW": "繁體中文", th: "ไทย" };

// 選択肢が固定の戦略フィールド（チップ式チェックボックスで選ぶ）
const DISTRIBUTION_OPTIONS: { value: DistributionSurface; label: string }[] = [
  { value: "esim", label: "eSIM" },
  { value: "guides", label: "ガイド" },
  { value: "homes", label: "宿泊（homes）" },
];
const MARKET_OPTIONS: { value: string; label: string }[] = [
  { value: "KO", label: "韓国 KO" },
  { value: "TW", label: "台湾 TW" },
  { value: "TH", label: "タイ TH" },
  { value: "HK", label: "香港 HK" },
  { value: "SG", label: "シンガポール SG" },
  { value: "ID", label: "インドネシア ID" },
];
// 既知の受け先ツール（これ以外に /buy?ref=… 等は自由入力欄で追加）
const HANDOFF_TOOLS: { value: string; label: string }[] = [
  { value: "gb-diagnosis", label: "GB診断" },
  { value: "carrier-roaming", label: "ローミング比較" },
  { value: "device-checker", label: "機種チェッカー" },
];

// カンマ区切り文字列（既存のstate形）を配列として扱うヘルパー
const csvItems = (csv: string): string[] => csv.split(",").map((s) => s.trim()).filter(Boolean);
const csvHas = (csv: string, v: string): boolean => csvItems(csv).includes(v);
const toggleCsv = (csv: string, v: string): string => {
  const items = csvItems(csv);
  return (items.includes(v) ? items.filter((i) => i !== v) : [...items, v]).join(", ");
};

const emptyTranslation = (): ArticleTranslation => ({
  title: "", excerpt: "", body: "", directAnswer: "", metaTitle: "", metaDescription: "",
});

/** 固定選択肢をチップ式で選ぶ（値は既存のカンマ区切り文字列を維持）。 */
function ChipToggles({ options, csv, onChange }: {
  options: { value: string; label: string }[];
  csv: string;
  onChange: (next: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {options.map((o) => {
        const checked = csvHas(csv, o.value);
        return (
          <label
            key={o.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              fontSize: "0.8125rem",
              border: `1px solid ${checked ? "#000000" : "#D7D7D7"}`,
              background: checked ? "#000000" : "#FFFFFF",
              color: checked ? "#FFFFFF" : "#333333",
              padding: "0.375rem 0.625rem",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input type="checkbox" checked={checked} onChange={() => onChange(toggleCsv(csv, o.value))} style={{ display: "none" }} />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

/** 自由入力のタグ欄（1語1チップ・Enter/カンマで確定・✕で削除）。値はカンマ区切り文字列を維持。 */
function TagInput({ csv, onChange, placeholder }: {
  csv: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const items = csvItems(csv);
  const add = (raw: string) => {
    const v = raw.trim();
    setDraft("");
    if (!v || items.includes(v)) return;
    onChange([...items, v].join(", "));
  };
  const removeAt = (i: number) => onChange(items.filter((_, idx) => idx !== i).join(", "));
  return (
    <div style={{ border: "1px solid #D7D7D7", background: "#FFFFFF", padding: "0.4rem", display: "flex", flexWrap: "wrap", gap: "0.375rem", alignItems: "center" }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "#F0F0F0", border: "1px solid #D7D7D7", padding: "0.25rem 0.5rem", fontSize: "0.8125rem" }}>
          {it}
          <button type="button" onClick={() => removeAt(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 0, lineHeight: 1, display: "flex" }} title="削除">
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
          else if (e.key === "Backspace" && draft === "" && items.length) { removeAt(items.length - 1); }
        }}
        onBlur={() => add(draft)}
        placeholder={items.length ? "" : placeholder}
        style={{ border: "none", outline: "none", flex: 1, minWidth: "120px", fontSize: "0.875rem", padding: "0.25rem", fontFamily: "inherit", background: "transparent" }}
      />
    </div>
  );
}

export default function CmsArticleEdit({ articleId }: CmsArticleEditProps) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeLang, setActiveLang] = useState<Lang>("ja");
  const [preview, setPreview] = useState(false);

  // Article meta
  const [slug, setSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState<CategorySlug>("gourmet");
  const [schemaType, setSchemaType] = useState<SchemaType>("Article");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // v9 戦略フィールド（記事レベル）。配列系はカンマ区切り文字列で保持し保存時に配列化。
  const [layer, setLayer] = useState<Layer | "">("");
  const [pageType, setPageType] = useState<PageType>("article");
  const [hesitation, setHesitation] = useState<Hesitation | "">("");
  const [handoff, setHandoff] = useState("");
  const [primaryQuery, setPrimaryQuery] = useState("");
  const [secondaryQueries, setSecondaryQueries] = useState("");
  const [confirmedDate, setConfirmedDate] = useState("");
  const [distribution, setDistribution] = useState("esim");
  const [market, setMarket] = useState("");
  const [authorId, setAuthorId] = useState("");

  // Translations per lang
  const [translations, setTranslations] = useState<Record<Lang, ArticleTranslation>>({
    ja: emptyTranslation(), en: emptyTranslation(), ko: emptyTranslation(), "zh-TW": emptyTranslation(), th: emptyTranslation(),
  });

  const isAdmin = !!user && user.role === "admin";

  const { data: existingData } = useQuery({
    queryKey: ["cms", "article", articleId],
    queryFn: () => getArticleForEdit(articleId!),
    enabled: articleId !== null && isAdmin,
  });
  // 価格プラン（プレビューで {{price}} 焼き込み・CompareGrid 表を実値表示）
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: listPlans, staleTime: 5 * 60_000, enabled: isAdmin });
  // 著者マスタ。新規記事ではログインメールと一致する著者をデフォルト選択（Auth連携）
  const { data: authors = [] } = useQuery({ queryKey: ["cms", "authors"], queryFn: listAuthors, staleTime: 5 * 60_000, enabled: isAdmin });
  useEffect(() => {
    if (articleId === null && !authorId && user?.email) {
      const mine = authors.find((a) => a.email === user.email!.toLowerCase());
      if (mine) setAuthorId(mine.id);
    }
  }, [authors, articleId, authorId, user?.email]);

  // Populate form when editing
  useEffect(() => {
    if (existingData) {
      setSlug(existingData.slug);
      setCategorySlug(existingData.categorySlug);
      setSchemaType(existingData.schemaType);
      setStatus(existingData.status);
      setThumbnailUrl(existingData.thumbnailUrl ?? "");
      setLayer(existingData.layer ?? "");
      setPageType(existingData.pageType ?? "article");
      setHesitation(existingData.hesitation ?? "");
      setHandoff((existingData.handoff ?? []).join(", "));
      setPrimaryQuery(existingData.primaryQuery ?? "");
      setSecondaryQueries((existingData.secondaryQueries ?? []).join(", "));
      setConfirmedDate(existingData.confirmedDate ?? "");
      setDistribution((existingData.distribution ?? ["esim"]).join(", "));
      setMarket((existingData.market ?? []).join(", "));
      setAuthorId(existingData.author?.id ?? "");
      setTranslations((prev) => {
        const next = { ...prev };
        for (const l of LANGS) {
          const t = existingData.translations[l];
          if (t) next[l] = { ...emptyTranslation(), ...t };
        }
        return next;
      });
    }
  }, [existingData]);

  const parseList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const v9Fields = () => ({
    layer: layer || undefined,
    pageType,
    hesitation: hesitation || null,
    handoff: parseList(handoff),
    primaryQuery: primaryQuery || undefined,
    secondaryQueries: parseList(secondaryQueries),
    confirmedDate: confirmedDate || null,
    distribution: parseList(distribution) as DistributionSurface[],
    market: parseList(market),
    author: (() => {
      const a = authors.find((x) => x.id === authorId);
      return a ? { id: a.id, name: a.name, title: a.title, photoUrl: a.photoUrl } : null;
    })(),
  });

  const createArticle = useMutation({
    mutationFn: () => createArticleDoc({ slug, categorySlug, schemaType, status, thumbnailUrl: thumbnailUrl || null, ...v9Fields() }),
    onSuccess: (data) => {
      toast.success("記事を作成しました。");
      navigate(`/admin/cms/${data.id}`);
    },
    onError: (e: Error) => toast.error(e.message || "作成に失敗しました。"),
  });

  const updateArticle = useMutation({
    mutationFn: () => updateArticleMeta(articleId!, { categorySlug, schemaType, status, thumbnailUrl: thumbnailUrl || null, ...v9Fields() }),
    onSuccess: () => toast.success("記事を更新しました。"),
    onError: () => toast.error("更新に失敗しました。"),
  });

  const upsertTranslation = useMutation({
    mutationFn: (input: { lang: Lang; t: ArticleTranslation }) => upsertTranslationDoc(articleId!, input.lang, input.t),
    onSuccess: () => toast.success(`${LANG_LABELS[activeLang]}の翻訳を保存しました。`),
    onError: () => toast.error("保存に失敗しました。"),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!articleId) { toast.error("先に記事を作成してください。"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("画像は5MB以内にしてください。"); return; }
    setUploadingImage(true);
    try {
      const url = await uploadImageFile(file, "thumbnails");
      setThumbnailUrl(url);
      await updateArticleMeta(articleId, { thumbnailUrl: url });
      toast.success("画像をアップロードしました。");
    } catch {
      toast.error("画像のアップロードに失敗しました。");
    } finally {
      setUploadingImage(false);
    }
  };

  // Insert arbitrary markdown at cursor position in the textarea
  const insertMarkdownAtCursor = (markdown: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const current = translations[activeLang].body;
      const newBody = current.slice(0, start) + markdown + current.slice(end);
      updateTranslation("body", newBody);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + markdown.length, start + markdown.length);
      });
    } else {
      updateTranslation("body", translations[activeLang].body + "\n" + markdown);
    }
  };

  const insertImageMarkdown = (url: string, filename: string) => {
    insertMarkdownAtCursor(`![${filename}](${url})`);
  };

  const insertTableTemplate = () => {
    insertMarkdownAtCursor(
      "\n| 見出し1 | 見出し2 | 見出し3 |\n|---|---|---|\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |\n"
    );
  };

  const processInlineImageFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error("画像は8MB以内にしてください。"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { toast.error("JPEG・PNG・WebP・GIF のみ対応しています。"); return; }
    setUploadingInlineImage(true);
    try {
      const url = await uploadImageFile(file, "images");
      insertImageMarkdown(url, file.name.replace(/\.[^.]+$/, ""));
      toast.success("画像を挿入しました。");
    } catch {
      toast.error("画像のアップロードに失敗しました。");
    } finally {
      setUploadingInlineImage(false);
    }
  };

  const handleInlineImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processInlineImageFile(file);
    e.target.value = "";
  };

  const handleEditorDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void processInlineImageFile(file);
  };

  const handleSaveMeta = () => {
    if (!slug.trim()) { toast.error("スラッグを入力してください。"); return; }
    if (articleId === null) {
      createArticle.mutate();
    } else {
      updateArticle.mutate();
    }
  };

  const handleSaveTranslation = () => {
    if (!articleId) { toast.error("先に記事メタを保存してください。"); return; }
    const t = translations[activeLang];
    if (!t.title.trim()) { toast.error("タイトルを入力してください。"); return; }
    if (!t.body.trim()) { toast.error("本文を入力してください。"); return; }
    upsertTranslation.mutate({ lang: activeLang, t });
  };

  const updateTranslation = (field: keyof ArticleTranslation, value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], [field]: value },
    }));
  };

  if (loading) {
    return <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "24px", height: "24px", border: "2px solid #D7D7D7", borderTopColor: "#000000", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>;
  }

  if (!user) {
    return <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}><p>管理者ログインが必要です。</p><a href="/login" className="btn-primary">ログイン</a></div>;
  }

  if (!isAdmin) {
    return <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}><p>CMSへのアクセスには管理者権限が必要です。</p><Link href="/" className="btn-outline">ホームへ戻る</Link></div>;
  }

  const currentTranslation = translations[activeLang];

  // FAQ（翻訳レベル・FAQPage Schema 用）
  const faqItems = currentTranslation.faq ?? [];
  const setFaqItems = (next: Array<{ q: string; a: string }>) =>
    setTranslations((prev) => ({ ...prev, [activeLang]: { ...prev[activeLang], faq: next } }));
  const addFaq = () => setFaqItems([...faqItems, { q: "", a: "" }]);
  const updateFaqItem = (i: number, key: "q" | "a", value: string) =>
    setFaqItems(faqItems.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)));
  const removeFaq = (i: number) => setFaqItems(faqItems.filter((_, idx) => idx !== i));

  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "0.9375rem",
    border: "1px solid #D7D7D7",
    backgroundColor: "#FFFFFF",
    color: "#000000",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.6875rem",
    fontWeight: 500,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#555555",
    marginBottom: "0.5rem",
  };

  return (
    <>
      <SeoHead title={articleId ? "記事編集" : "新規記事"} noindex />

      <div style={{ backgroundColor: "#F7F7F7", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ backgroundColor: "#000000", color: "#FFFFFF", padding: "1.25rem 0" }}>
          <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Link href="/admin/cms" style={{ color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", transition: "color 150ms" }}>
                <ArrowLeft size={13} strokeWidth={1.5} />
                CMS管理
              </Link>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <h1 style={{ fontSize: "1rem", fontWeight: 500, color: "#FFFFFF", margin: 0 }}>
                {articleId ? "記事編集" : "新規記事"}
              </h1>
            </div>
            {articleId && (
              <a
                href={`/articles/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem" }}
              >
                <Eye size={13} strokeWidth={1.5} />
                プレビュー
              </a>
            )}
          </div>
        </div>

        <div className="container" style={{ padding: "2rem 0", display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", alignItems: "start" }}>
          {/* Main editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Lang tabs */}
            <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D7D7D7" }}>
              <div style={{ display: "flex", borderBottom: "1px solid #D7D7D7" }}>
                {LANGS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setActiveLang(l)}
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: activeLang === l ? "#000000" : "#999999",
                      background: "none",
                      border: "none",
                      borderBottom: `2px solid ${activeLang === l ? "#000000" : "transparent"}`,
                      padding: "0.875rem 1.25rem",
                      cursor: "pointer",
                      transition: "color 150ms",
                      marginBottom: "-1px",
                    }}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>

              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label style={labelStyle}>タイトル *</label>
                  <input type="text" value={currentTranslation.title} onChange={(e) => updateTranslation("title", e.target.value)} style={inputStyle} placeholder="記事タイトル" />
                </div>
                <div>
                  <label style={labelStyle}>抜粋</label>
                  <textarea value={currentTranslation.excerpt} onChange={(e) => updateTranslation("excerpt", e.target.value)} style={{ ...inputStyle, height: "80px", resize: "vertical" }} placeholder="記事の概要（一覧ページに表示）" />
                </div>
                <div>
                  <label style={labelStyle}>直接回答ブロック（GEO最適化）</label>
                  <textarea value={currentTranslation.directAnswer} onChange={(e) => updateTranslation("directAnswer", e.target.value)} style={{ ...inputStyle, height: "80px", resize: "vertical" }} placeholder="AIや検索エンジンへの直接回答テキスト" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>本文（Markdown） *</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        id="inline-image-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        style={{ display: "none" }}
                        onChange={handleInlineImageSelect}
                      />
                      <label
                        htmlFor="inline-image-input"
                        style={{
                          fontSize: "0.6875rem",
                          color: uploadingInlineImage ? "#999" : "#333",
                          background: "none",
                          border: "1px solid #D7D7D7",
                          padding: "0.25rem 0.625rem",
                          cursor: uploadingInlineImage ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          pointerEvents: uploadingInlineImage ? "none" : "auto",
                        }}
                        title="画像をアップロードして本文に挿入"
                      >
                        <ImagePlus size={11} strokeWidth={1.5} />
                        {uploadingInlineImage ? "アップロード中..." : "画像を挿入"}
                      </label>
                      <button
                        onClick={insertTableTemplate}
                        style={{ fontSize: "0.6875rem", color: "#333", background: "none", border: "1px solid #D7D7D7", padding: "0.25rem 0.625rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem" }}
                        title="カーソル位置に表のひな形を挿入します（| で区切って編集）"
                      >
                        <Table size={11} strokeWidth={1.5} />
                        表を挿入
                      </button>
                      <button
                        onClick={() => setPreview((v) => !v)}
                        style={{ fontSize: "0.6875rem", color: preview ? "#000000" : "#555555", fontWeight: preview ? 600 : 400, background: preview ? "#F0F0F0" : "none", border: "1px solid #D7D7D7", padding: "0.25rem 0.625rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem" }}
                        title="入力の右側に表示結果を並べます"
                      >
                        <Eye size={11} strokeWidth={1.5} />
                        {preview ? "プレビューを閉じる" : "プレビュー"}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: preview ? "1fr 1fr" : "1fr", gap: "1rem", alignItems: "stretch" }}>
                    <textarea
                      ref={textareaRef}
                      value={currentTranslation.body}
                      onChange={(e) => updateTranslation("body", e.target.value)}
                      onDrop={handleEditorDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                      onDragLeave={() => setIsDraggingOver(false)}
                      style={{
                        ...inputStyle,
                        height: "500px",
                        resize: "vertical",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                        outline: isDraggingOver ? "2px dashed #000" : undefined,
                        backgroundColor: isDraggingOver ? "#F0F0F0" : undefined,
                        transition: "background-color 0.15s, outline 0.15s",
                      }}
                      placeholder="# 見出し&#10;&#10;本文をMarkdown形式で入力してください。&#10;画像はドラッグ&amp;ドロップまたは「画像を挿入」ボタンでアップロードできます。"
                    />
                    {preview && (
                      <div
                        className="prose-yah"
                        style={{ height: "500px", overflowY: "auto", padding: "1rem 1.25rem", backgroundColor: "#F7F7F7", border: "1px solid #D7D7D7" }}
                        dangerouslySetInnerHTML={{ __html: linkPropertyImages(renderCompareBody(currentTranslation.body, plans, renderMarkdown), parseList(handoff)) }}
                      />
                    )}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={labelStyle}>メタタイトル</label>
                    <input type="text" value={currentTranslation.metaTitle} onChange={(e) => updateTranslation("metaTitle", e.target.value)} style={inputStyle} placeholder="SEO用タイトル（省略可）" />
                  </div>
                  <div>
                    <label style={labelStyle}>メタディスクリプション</label>
                    <input type="text" value={currentTranslation.metaDescription} onChange={(e) => updateTranslation("metaDescription", e.target.value)} style={inputStyle} placeholder="SEO用説明文（省略可）" />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>FAQ（FAQPage Schema）</label>
                    <button onClick={addFaq} type="button" style={{ fontSize: "0.6875rem", color: "#333", background: "none", border: "1px solid #D7D7D7", padding: "0.25rem 0.625rem", cursor: "pointer" }}>+ 質問を追加</button>
                  </div>
                  {faqItems.length === 0 && <p style={{ fontSize: "0.75rem", color: "#999", margin: 0 }}>質問はまだありません。冒頭3行の直接回答とセットでGEO引用に効きます。</p>}
                  {faqItems.map((f, i) => (
                    <div key={i} style={{ border: "1px solid #E5E5E5", padding: "0.75rem", marginBottom: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input type="text" value={f.q} onChange={(e) => updateFaqItem(i, "q", e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="質問" />
                        <button onClick={() => removeFaq(i)} type="button" style={{ background: "none", border: "1px solid #D7D7D7", padding: "0.5rem", cursor: "pointer", color: "#999" }} title="削除"><X size={13} /></button>
                      </div>
                      <textarea value={f.a} onChange={(e) => updateFaqItem(i, "a", e.target.value)} style={{ ...inputStyle, height: "60px", resize: "vertical" }} placeholder="回答" />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveTranslation}
                  disabled={upsertTranslation.isPending || !articleId}
                  className="btn-primary"
                  style={{ justifyContent: "center", opacity: (upsertTranslation.isPending || !articleId) ? 0.6 : 1, display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <Save size={13} strokeWidth={1.5} />
                  {upsertTranslation.isPending ? "保存中..." : `${LANG_LABELS[activeLang]}を保存`}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar: article meta */}
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #D7D7D7", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555555", margin: 0 }}>記事設定</p>

            <div>
              <label style={labelStyle}>スラッグ *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                style={{ ...inputStyle, backgroundColor: articleId ? "#F5F5F5" : "#FFFFFF" }}
                placeholder="article-slug"
                disabled={articleId !== null}
              />
              {articleId !== null && <p style={{ fontSize: "0.6875rem", color: "#999", marginTop: "0.375rem" }}>スラッグは作成後に変更できません。</p>}
            </div>

            <div>
              <label style={labelStyle}>カテゴリ</label>
              <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value as CategorySlug)} style={{ ...inputStyle, appearance: "none" }}>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.nameJa} ({c.slug})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Schema Type</label>
              <select value={schemaType} onChange={(e) => setSchemaType(e.target.value as SchemaType)} style={{ ...inputStyle, appearance: "none" }}>
                <option value="Article">Article</option>
                <option value="HowTo">HowTo</option>
                <option value="FAQPage">FAQPage</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>ステータス</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ArticleStatus)} style={{ ...inputStyle, appearance: "none" }}>
                <option value="draft">下書き (draft)</option>
                <option value="published">公開 (published)</option>
                <option value="archived">アーカイブ (archived)</option>
              </select>
            </div>

            <div style={{ borderTop: "1px solid #E5E5E5", paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555555", margin: 0 }}>戦略設定（v9・迷わせない）</p>
              <div>
                <label style={labelStyle}>層 Layer *</label>
                <select value={layer} onChange={(e) => setLayer(e.target.value as Layer | "")} style={{ ...inputStyle, appearance: "none" }}>
                  <option value="">— 選択 —</option>
                  <option value="M">M: 王道（マネーページ）</option>
                  <option value="0">0: eSIMグリッド</option>
                  <option value="1">1: ローミング比較</option>
                  <option value="1.5">1.5: 旅のハウツー</option>
                  <option value="3">3: 福岡実測データ</option>
                  <option value="season">季節</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>ページ種別</label>
                <select value={pageType} onChange={(e) => setPageType(e.target.value as PageType)} style={{ ...inputStyle, appearance: "none" }}>
                  <option value="article">記事</option>
                  <option value="landing">受けページ</option>
                  <option value="grid">格子</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>消す離脱理由</label>
                <select value={hesitation} onChange={(e) => setHesitation(e.target.value as Hesitation | "")} style={{ ...inputStyle, appearance: "none" }}>
                  <option value="">— なし（集客/権威）—</option>
                  <option value="price">高いかも</option>
                  <option value="hassle">面倒</option>
                  <option value="anxiety">自分に合うか不安</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>著者</label>
                <select value={authorId} onChange={(e) => setAuthorId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                  <option value="">— 未設定 —</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}{a.title ? `（${a.title}）` : ""}</option>
                  ))}
                </select>
                <p style={{ fontSize: "0.625rem", color: "#999999", margin: "0.25rem 0 0" }}>登録は「Author管理」から。保存すると記事ページ・配信feedの署名に反映されます。</p>
              </div>
              <div>
                <label style={labelStyle}>確認日</label>
                <input type="date" value={confirmedDate} onChange={(e) => setConfirmedDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>受け先 handoff</label>
                <ChipToggles options={HANDOFF_TOOLS} csv={handoff} onChange={setHandoff} />
                <input
                  type="text"
                  value={handoff}
                  onChange={(e) => setHandoff(e.target.value)}
                  style={{ ...inputStyle, marginTop: "0.5rem", fontSize: "0.8125rem" }}
                  placeholder="/buy?ref=compare など（カンマ区切り・チップ選択もここに反映）"
                />
                <p style={{ fontSize: "0.6875rem", color: "#999", marginTop: "0.375rem" }}>上のツールはクリックで追加/解除。/buy?ref= 等はこの欄に直接記入。</p>
              </div>
              <div>
                <label style={labelStyle}>主クエリ</label>
                <input type="text" value={primaryQuery} onChange={(e) => setPrimaryQuery(e.target.value)} style={inputStyle} placeholder="일본 이심 카카오톡 인증" />
              </div>
              <div>
                <label style={labelStyle}>従クエリ</label>
                <TagInput csv={secondaryQueries} onChange={setSecondaryQueries} placeholder="語句を入力して Enter" />
                <p style={{ fontSize: "0.6875rem", color: "#999", marginTop: "0.375rem" }}>1語ずつ入力して Enter（またはカンマ）でタグ化。✕で削除。</p>
              </div>
              <div>
                <label style={labelStyle}>配信面</label>
                <ChipToggles options={DISTRIBUTION_OPTIONS} csv={distribution} onChange={setDistribution} />
              </div>
              <div>
                <label style={labelStyle}>対象市場</label>
                <ChipToggles options={MARKET_OPTIONS} csv={market} onChange={setMarket} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>アイキャッチ画像</label>
              {thumbnailUrl && (
                <div style={{ position: "relative", marginBottom: "0.75rem" }}>
                  <img src={thumbnailUrl} alt="thumbnail" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", border: "1px solid #D7D7D7" }} />
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl("")}
                    style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
                    title="画像を削除"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: articleId ? "pointer" : "not-allowed", opacity: articleId ? 1 : 0.5 }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  disabled={!articleId || uploadingImage}
                  style={{ display: "none" }}
                />
                <span
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem", border: "1px solid #D7D7D7", fontSize: "0.8125rem", fontWeight: 500, letterSpacing: "0.05em", background: uploadingImage ? "#F5F5F5" : "#FFFFFF", width: "100%", justifyContent: "center" }}
                >
                  <Upload size={14} strokeWidth={1.5} />
                  {uploadingImage ? "アップロード中..." : thumbnailUrl ? "画像を変更" : "画像をアップロード"}
                </span>
              </label>
              {!articleId && <p style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.375rem" }}>先に記事を作成すると画像をアップロードできます。</p>}
              <input type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} style={{ ...inputStyle, marginTop: "0.5rem", fontSize: "0.8125rem" }} placeholder="URLを直接入力する場合はこちらに記入..." />
            </div>

            <button
              onClick={handleSaveMeta}
              disabled={createArticle.isPending || updateArticle.isPending}
              className="btn-primary"
              style={{ justifyContent: "center", opacity: (createArticle.isPending || updateArticle.isPending) ? 0.6 : 1, display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Save size={13} strokeWidth={1.5} />
              {articleId ? "設定を更新" : "記事を作成"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** 本文プレビュー用の簡易 Markdown → HTML 変換（ブロック単位・表/箇条書き/引用対応）。
 * 依存追加なし。CMS プレビューと同等の見た目は .prose-yah（index.css）が担う。
 * 生成した本文HTMLは admin 専用プレビューでのみ dangerouslySetInnerHTML される。 */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** 物件写真の自動リンク（ArticleDetail / seoserver と同一仕様） */
function linkPropertyImages(html: string, handoff: string[]): string {
  const targets = handoff.filter((h) => h.startsWith("/booking/"));
  if (!targets.length) return html;
  return html
    .split(/(<a\b[\s\S]*?<\/a>)/g)
    .map((seg, i) => {
      if (i % 2 === 1) return seg;
      let out = seg;
      for (const href of targets) {
        const key = href.split("/").pop()!;
        out = out.replace(new RegExp(`<img[^>]*src="[^"]*${key}[^"]*"[^>]*/?>`, "g"), (img) => `<a href="https://yah.homes${href}" target="_blank" rel="noopener noreferrer">${img}</a>`);
      }
      return out;
    })
    .join("");
}

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function renderMarkdown(md: string): string {
  const lines = escapeHtml(md).replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let paragraph: string[] = [];
  const flushPara = () => {
    if (paragraph.length) {
      out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      flushPara();
      i++;
      continue;
    }

    // 表: 現在行に | があり、次行が区切り（|---|---|）
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      lines[i + 1].includes("-") &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])
    ) {
      flushPara();
      const header = splitTableRow(line);
      i += 2; // ヘッダ行＋区切り行を消費
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      let t = "<table><thead><tr>" + header.map((h) => `<th>${renderInline(h)}</th>`).join("") + "</tr></thead><tbody>";
      for (const r of rows) t += "<tr>" + r.map((c) => `<td>${renderInline(c)}</td>`).join("") + "</tr>";
      t += "</tbody></table>";
      out.push(t);
      continue;
    }

    // 見出し（「## → 見出し」は手渡し見出し＝矢印アイコン付き。client/seoserver と同一仕様）
    const h = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (h) {
      flushPara();
      const level = h[1].length;
      const handoff = level === 2 && h[2].startsWith("→ ");
      const text = handoff ? h[2].slice(2) : h[2];
      out.push(`<h${level}${handoff ? ' class="h2-handoff"' : ""}>${renderInline(text)}</h${level}>`);
      i++;
      continue;
    }

    // 水平線
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushPara();
      out.push("<hr />");
      i++;
      continue;
    }

    // 引用
    if (/^>\s?/.test(trimmed)) {
      flushPara();
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${renderInline(quote.join(" "))}</blockquote>`);
      continue;
    }

    // 箇条書き（・）
    if (/^[-*]\s+/.test(trimmed)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      out.push("<ul>" + items.map((it) => `<li>${renderInline(it)}</li>`).join("") + "</ul>");
      continue;
    }

    // 番号付きリスト
    if (/^\d+\.\s+/.test(trimmed)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      out.push("<ol>" + items.map((it) => `<li>${renderInline(it)}</li>`).join("") + "</ol>");
      continue;
    }

    // 段落
    paragraph.push(trimmed);
    i++;
  }
  flushPara();
  return out.join("\n");
}
