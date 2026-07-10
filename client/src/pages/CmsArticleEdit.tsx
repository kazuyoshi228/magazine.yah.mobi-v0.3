import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import { ArrowLeft, Save, Eye, Upload, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import SeoHead from "@/components/SeoHead";

interface CmsArticleEditProps {
  articleId: number | null;
}

type Lang = "ja" | "en" | "ko" | "zh-TW";
const LANGS: Lang[] = ["ja", "en", "ko", "zh-TW"];
const LANG_LABELS: Record<Lang, string> = { ja: "日本語", en: "English", ko: "한국어", "zh-TW": "繁體中文" };

export default function CmsArticleEdit({ articleId }: CmsArticleEditProps) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeLang, setActiveLang] = useState<Lang>("ja");
  const [preview, setPreview] = useState(false);

  // Article meta
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState<number>(1);
  const [schemaType, setSchemaType] = useState<"Article" | "HowTo" | "FAQPage">("Article");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Translations per lang
  const [translations, setTranslations] = useState<Record<Lang, {
    title: string;
    excerpt: string;
    body: string;
    directAnswer: string;
    metaTitle: string;
    metaDescription: string;
  }>>({
    ja: { title: "", excerpt: "", body: "", directAnswer: "", metaTitle: "", metaDescription: "" },
    en: { title: "", excerpt: "", body: "", directAnswer: "", metaTitle: "", metaDescription: "" },
    ko: { title: "", excerpt: "", body: "", directAnswer: "", metaTitle: "", metaDescription: "" },
    "zh-TW": { title: "", excerpt: "", body: "", directAnswer: "", metaTitle: "", metaDescription: "" },
  });

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: existingData } = trpc.cms.getById.useQuery(
    { id: articleId! },
    { enabled: articleId !== null && !!user && ['admin', 'writer'].includes(user.role) }
  );

  // Populate form when editing
  useEffect(() => {
    if (existingData) {
      const { article, translations: existingTranslations } = existingData;
      setSlug(article.slug);
      setCategoryId(article.categoryId);
      setSchemaType(article.schemaType as any);
      setStatus(article.status as any);
      setThumbnailUrl(article.thumbnailUrl ?? "");

      const newTranslations = { ...translations };
      existingTranslations.forEach((t) => {
        if (LANGS.includes(t.lang as Lang)) {
          newTranslations[t.lang as Lang] = {
            title: t.title,
            excerpt: t.excerpt ?? "",
            body: t.body,
            directAnswer: t.directAnswer ?? "",
            metaTitle: t.metaTitle ?? "",
            metaDescription: t.metaDescription ?? "",
          };
        }
      });
      setTranslations(newTranslations);
    }
  }, [existingData]);

  const createArticle = trpc.cms.create.useMutation({
    onSuccess: (data) => {
      toast.success("記事を作成しました。");
      navigate(`/admin/cms/${data.id}`);
    },
    onError: () => toast.error("作成に失敗しました。"),
  });

  const updateArticle = trpc.cms.update.useMutation({
    onSuccess: () => toast.success("記事を更新しました。"),
    onError: () => toast.error("更新に失敗しました。"),
  });

  const upsertTranslation = trpc.cms.upsertTranslation.useMutation({
    onSuccess: () => toast.success(`${LANG_LABELS[activeLang]}の翻訳を保存しました。`),
    onError: () => toast.error("保存に失敗しました。"),
  });

  const uploadThumbnail = trpc.cms.uploadThumbnail.useMutation({
    onSuccess: (data) => {
      setThumbnailUrl(data.url);
      toast.success("画像をアップロードしました。");
    },
    onError: () => toast.error("画像のアップロードに失敗しました。"),
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!articleId) { toast.error("先に記事を作成してください。"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("画像は5MB以内にしてください。"); return; }
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1];
      uploadThumbnail.mutate(
        { articleId, base64, mimeType: file.type, filename: file.name },
        { onSettled: () => setUploadingImage(false) }
      );
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const uploadImage = trpc.cms.uploadImage.useMutation({
    onError: () => toast.error("画像のアップロードに失敗しました。"),
  });

  // Insert markdown image at cursor position in the textarea
  const insertImageMarkdown = (url: string, filename: string) => {
    const ta = textareaRef.current;
    const markdown = `![${filename}](${url})`;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const current = translations[activeLang].body;
      const newBody = current.slice(0, start) + markdown + current.slice(end);
      updateTranslation("body", newBody);
      // Restore cursor after inserted text
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + markdown.length, start + markdown.length);
      });
    } else {
      updateTranslation("body", translations[activeLang].body + "\n" + markdown);
    }
  };

  const processInlineImageFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error("画像は8MB以内にしてください。"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { toast.error("JPEG・PNG・WebP・GIF のみ対応しています。"); return; }
    setUploadingInlineImage(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1];
      uploadImage.mutate(
        { base64, mimeType: file.type, filename: file.name },
        {
          onSuccess: (data) => {
            insertImageMarkdown(data.url, file.name.replace(/\.[^.]+$/, ""));
            toast.success("画像を挿入しました。");
          },
          onSettled: () => setUploadingInlineImage(false),
        }
      );
    };
    reader.readAsDataURL(file);
  };

  const handleInlineImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processInlineImageFile(file);
    e.target.value = "";
  };

  const handleEditorDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) processInlineImageFile(file);
  };

  const handleSaveMeta = () => {
    if (!slug.trim()) { toast.error("スラッグを入力してください。"); return; }
    if (articleId === null) {
      createArticle.mutate({ slug, categoryId, schemaType, status, thumbnailUrl: thumbnailUrl || undefined });
    } else {
      updateArticle.mutate({ id: articleId, slug, categoryId, schemaType, status, thumbnailUrl: thumbnailUrl || null });
    }
  };

  const handleSaveTranslation = () => {
    if (!articleId) { toast.error("先に記事メタを保存してください。"); return; }
    const t = translations[activeLang];
    if (!t.title.trim()) { toast.error("タイトルを入力してください。"); return; }
    if (!t.body.trim()) { toast.error("本文を入力してください。"); return; }
    upsertTranslation.mutate({ articleId, lang: activeLang, ...t });
  };

  const updateTranslation = (field: string, value: string) => {
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

  if (!['admin', 'writer'].includes(user.role)) {
    return <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}><p>CMSへのアクセスには writer 以上の権限が必要です。</p><Link href="/" className="btn-outline">ホームへ戻る</Link></div>;
  }

  const currentTranslation = translations[activeLang];

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
                      {/* Inline image upload button */}
                      {!preview && (
                        <>
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
                        </>
                      )}
                      <button
                        onClick={() => setPreview((v) => !v)}
                        style={{ fontSize: "0.6875rem", color: "#555555", background: "none", border: "1px solid #D7D7D7", padding: "0.25rem 0.625rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem" }}
                      >
                        <Eye size={11} strokeWidth={1.5} />
                        {preview ? "編集" : "プレビュー"}
                      </button>
                    </div>
                  </div>
                  {preview ? (
                    <div
                      className="prose-yah"
                      style={{ minHeight: "400px", padding: "1rem", backgroundColor: "#F7F7F7", border: "1px solid #D7D7D7" }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(currentTranslation.body) }}
                    />
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={currentTranslation.body}
                      onChange={(e) => updateTranslation("body", e.target.value)}
                      onDrop={handleEditorDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                      onDragLeave={() => setIsDraggingOver(false)}
                      style={{
                        ...inputStyle,
                        height: "400px",
                        resize: "vertical",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                        outline: isDraggingOver ? "2px dashed #000" : undefined,
                        backgroundColor: isDraggingOver ? "#F0F0F0" : undefined,
                        transition: "background-color 0.15s, outline 0.15s",
                      }}
                      placeholder="# 見出し&#10;&#10;本文をMarkdown形式で入力してください。&#10;画像はドラッグ&amp;ドロップまたは「画像を挿入」ボタンでアップロードできます。"
                    />
                  )}
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
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} style={inputStyle} placeholder="article-slug" />
            </div>

            <div>
              <label style={labelStyle}>カテゴリ</label>
              <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} style={{ ...inputStyle, appearance: "none" }}>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameJa} ({c.slug})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Schema Type</label>
              <select value={schemaType} onChange={(e) => setSchemaType(e.target.value as any)} style={{ ...inputStyle, appearance: "none" }}>
                <option value="Article">Article</option>
                <option value="HowTo">HowTo</option>
                <option value="FAQPage">FAQPage</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>ステータス</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ ...inputStyle, appearance: "none" }}>
                <option value="draft">下書き (draft)</option>
                <option value="published">公開 (published)</option>
                <option value="archived">アーカイブ (archived)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>アイキャッチ画像</label>
              {/* Image preview */}
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
              {/* Upload button */}
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
              {/* Manual URL fallback */}
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

function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "</p><p>");
  return `<p>${html}</p>`;
}
