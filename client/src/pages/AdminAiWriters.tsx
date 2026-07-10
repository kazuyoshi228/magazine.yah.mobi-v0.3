import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type WriterForm = {
  id?: number;
  name: string;
  slug: string;
  avatarUrl: string;
  bio: string;
  tone: string;
  persona: string;
  writingStyle: string;
  forbiddenWords: string;
  sampleText: string;
  languages: string;
  categorySpecialties: string;
  isActive: boolean;
  sortOrder: number;
  writerType: "human" | "ai";
};

const EMPTY_FORM: WriterForm = {
  name: "",
  slug: "",
  avatarUrl: "",
  bio: "",
  tone: "",
  persona: "",
  writingStyle: "",
  forbiddenWords: "",
  sampleText: "",
  languages: "ja",
  categorySpecialties: "",
  isActive: true,
  sortOrder: 0,
  writerType: "ai",
};

const TONE_OPTIONS = [
  "カジュアル・親しみやすい",
  "ジャーナリスティック・客観的",
  "旅行ガイド・実用的",
  "グルメ評論・情緒的",
  "テック・ガジェット解説",
  "フォーマル・丁寧",
];

const LANGUAGE_OPTIONS = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
  { value: "zh-TW", label: "繁體中文" },
];

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function AdminAiWriters() {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<WriterForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: writers = [], isLoading } = trpc.aiWriters.list.useQuery();
  const upsert = trpc.aiWriters.upsert.useMutation({
    onSuccess: () => {
      utils.aiWriters.list.invalidate();
      setOpen(false);
      toast.success(form.id ? "AIライターを更新しました" : "AIライターを追加しました");
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.aiWriters.delete.useMutation({
    onSuccess: () => {
      utils.aiWriters.list.invalidate();
      setDeleteConfirm(null);
      toast.success("AIライターを削除しました");
    },
    onError: (e) => toast.error(e.message),
  });

  if (authLoading) return <div style={{ padding: 40, textAlign: "center" }}>読み込み中...</div>;
  if (!user) {
    window.location.href = "/login";
    return null;
  }
  if (user.role !== "admin") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p>管理者権限が必要です。</p>
        <Link href="/">ホームへ戻る</Link>
      </div>
    );
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(w: typeof writers[number]) {
    setForm({
      id: w.id,
      name: w.name ?? "",
      slug: w.slug ?? "",
      avatarUrl: w.avatarUrl ?? "",
      bio: w.bio ?? "",
      tone: w.tone ?? "",
      persona: w.persona ?? "",
      writingStyle: w.writingStyle ?? "",
      forbiddenWords: w.forbiddenWords ?? "",
      sampleText: w.sampleText ?? "",
      languages: w.languages ?? "ja",
      categorySpecialties: w.categorySpecialties ?? "",
      isActive: w.isActive ?? true,
      sortOrder: w.sortOrder ?? 0,
      writerType: (w.writerType as "human" | "ai") ?? "ai",
    });
    setOpen(true);
  }

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: f.id ? f.slug : slugify(name),
    }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("名前とスラッグは必須です");
      return;
    }
    upsert.mutate({
      ...form,
      id: form.id,
      avatarUrl: form.avatarUrl || undefined,
      bio: form.bio || undefined,
      tone: form.tone || undefined,
      persona: form.persona || undefined,
      writingStyle: form.writingStyle || undefined,
      forbiddenWords: form.forbiddenWords || undefined,
      sampleText: form.sampleText || undefined,
      categorySpecialties: form.categorySpecialties || undefined,
    });
  }

  const activeWriters = writers.filter((w) => w.isActive);
  const inactiveWriters = writers.filter((w) => !w.isActive);

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #D7D7D7", padding: "16px 0" }}>
        <div className="container" style={{ maxWidth: 960, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/admin" style={{ color: "#888", fontSize: 14, textDecoration: "none" }}>
              ← Admin
            </Link>
            <span style={{ color: "#D7D7D7" }}>/</span>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>AIライター管理</h1>
          </div>
          <Button onClick={openNew} style={{ background: "#000", color: "#fff", borderRadius: 2 }}>
            + 新しいライターを追加
          </Button>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 960, padding: "32px 16px" }}>
        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          <Card>
            <CardContent style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{writers.length}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>登録ライター数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{activeWriters.length}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>アクティブ</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{inactiveWriters.length}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>非アクティブ</div>
            </CardContent>
          </Card>
        </div>

        {/* Writer Cards */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#888" }}>読み込み中...</div>
        ) : writers.length === 0 ? (
          <Card>
            <CardContent style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>AIライターがまだ登録されていません</div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>
                「新しいライターを追加」からプロフィール・文体・ペルソナを設定してください。
              </div>
              <Button onClick={openNew} style={{ background: "#000", color: "#fff", borderRadius: 2 }}>
                + 最初のライターを追加
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {writers.map((w) => (
              <Card key={w.id} style={{ opacity: w.isActive ? 1 : 0.6 }}>
                <CardContent style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "#F0F0F0",
                        border: "1px solid #D7D7D7",
                        overflow: "hidden",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                      }}
                    >
                      {w.avatarUrl ? (
                        <img src={w.avatarUrl} alt={w.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        "✍️"
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 17, fontWeight: 700 }}>{w.name}</span>
                        <span style={{ fontSize: 12, color: "#888", fontFamily: "monospace" }}>@{w.slug}</span>
                        {/* Human / AI badge */}
                        {(w as any).writerType === "human" ? (
                          <Badge style={{ fontSize: 11, background: "#EEF6FF", color: "#1D6FD8", border: "1px solid #BFD9F7" }}>Human</Badge>
                        ) : (
                          <Badge style={{ fontSize: 11, background: "#F3F0FF", color: "#6B3FD8", border: "1px solid #D4CAFF" }}>AI</Badge>
                        )}
                        {!w.isActive && (
                          <Badge variant="outline" style={{ fontSize: 11, color: "#888" }}>
                            非アクティブ
                          </Badge>
                        )}
                      </div>

                      {w.bio && (
                        <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px", lineHeight: 1.6 }}>{w.bio}</p>
                      )}

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {w.tone && (
                          <Badge variant="secondary" style={{ fontSize: 11 }}>
                            🎭 {w.tone}
                          </Badge>
                        )}
                        {w.languages && w.languages.split(",").map((lang) => (
                          <Badge key={lang} variant="outline" style={{ fontSize: 11 }}>
                            {LANGUAGE_OPTIONS.find((l) => l.value === lang.trim())?.label ?? lang.trim()}
                          </Badge>
                        ))}
                        {w.categorySpecialties && w.categorySpecialties.split(",").map((cat) => (
                          <Badge key={cat} variant="outline" style={{ fontSize: 11, borderColor: "#000" }}>
                            #{cat.trim()}
                          </Badge>
                        ))}
                      </div>

                      {w.persona && (
                        <div style={{ marginTop: 10, padding: "8px 12px", background: "#F7F7F7", borderLeft: "3px solid #000", fontSize: 12, color: "#555", lineHeight: 1.6 }}>
                          <strong style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 2 }}>ペルソナ</strong>
                          {w.persona.length > 120 ? w.persona.slice(0, 120) + "…" : w.persona}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(w)}
                        style={{ borderRadius: 2, fontSize: 13 }}
                      >
                        編集
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(w.id)}
                        style={{ borderRadius: 2, fontSize: 13, color: "#cc0000", borderColor: "#cc0000" }}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle>{form.id ? "AIライターを編集" : "新しいAIライターを追加"}</DialogTitle>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "4px 0" }}>
            {/* Basic Info */}
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                基本情報
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label style={{ fontSize: 13 }}>名前 *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="例：Yuki Tanaka"
                    style={{ marginTop: 4, borderRadius: 2 }}
                  />
                </div>
                <div>
                  <Label style={{ fontSize: 13 }}>スラッグ *</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="例：yuki-tanaka"
                    style={{ marginTop: 4, borderRadius: 2, fontFamily: "monospace" }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Label style={{ fontSize: 13 }}>ライター種別</Label>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {(["ai", "human"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, writerType: type }))}
                      style={{
                        padding: "0.375rem 1rem",
                        fontSize: 13,
                        fontWeight: form.writerType === type ? 600 : 400,
                        border: "1px solid",
                        borderColor: form.writerType === type ? (type === "human" ? "#1D6FD8" : "#6B3FD8") : "#D7D7D7",
                        background: form.writerType === type ? (type === "human" ? "#EEF6FF" : "#F3F0FF") : "transparent",
                        color: form.writerType === type ? (type === "human" ? "#1D6FD8" : "#6B3FD8") : "#555",
                        cursor: "pointer",
                        borderRadius: 2,
                      }}
                    >
                      {type === "human" ? "Human (人間)" : "AI"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Label style={{ fontSize: 13 }}>アバター画像URL</Label>
                <Input
                  value={form.avatarUrl}
                  onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                  placeholder="https://..."
                  style={{ marginTop: 4, borderRadius: 2 }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <Label style={{ fontSize: 13 }}>プロフィール（Bio）</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="ライターの経歴・専門分野・バックグラウンドを記述してください"
                  rows={3}
                  style={{ marginTop: 4, borderRadius: 2, resize: "vertical" }}
                />
              </div>
            </section>

            <Separator />

            {/* Tone & Persona */}
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                文書トーン・マナー
              </h3>
              <div>
                <Label style={{ fontSize: 13 }}>トーン</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tone: t }))}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 2,
                        border: form.tone === t ? "2px solid #000" : "1px solid #D7D7D7",
                        background: form.tone === t ? "#000" : "#fff",
                        color: form.tone === t ? "#fff" : "#333",
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <Input
                  value={form.tone}
                  onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
                  placeholder="または自由入力..."
                  style={{ marginTop: 8, borderRadius: 2 }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <Label style={{ fontSize: 13 }}>ペルソナ設定</Label>
                <Textarea
                  value={form.persona}
                  onChange={(e) => setForm((f) => ({ ...f, persona: e.target.value }))}
                  placeholder="例：30代の旅行好きな台湾人女性に向けて、親友が教えてくれるような温かみのある口調で書く。専門用語は避け、実体験に基づいたリアルな情報を優先する。"
                  rows={4}
                  style={{ marginTop: 4, borderRadius: 2, resize: "vertical" }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <Label style={{ fontSize: 13 }}>文体・スタイルノート</Label>
                <Textarea
                  value={form.writingStyle}
                  onChange={(e) => setForm((f) => ({ ...f, writingStyle: e.target.value }))}
                  placeholder="例：・1文は60字以内&#10;・見出しは体言止め&#10;・箇条書きより段落で書く&#10;・数字は必ず具体的に（「多い」→「約30店舗」）"
                  rows={4}
                  style={{ marginTop: 4, borderRadius: 2, resize: "vertical" }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <Label style={{ fontSize: 13 }}>禁止ワード・フレーズ（カンマ区切り）</Label>
                <Input
                  value={form.forbiddenWords}
                  onChange={(e) => setForm((f) => ({ ...f, forbiddenWords: e.target.value }))}
                  placeholder="例：激安, 超おすすめ, 絶対, 最高, 完璧"
                  style={{ marginTop: 4, borderRadius: 2 }}
                />
              </div>
            </section>

            <Separator />

            {/* Sample Text */}
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                サンプルテキスト（文体の参考）
              </h3>
              <Textarea
                value={form.sampleText}
                onChange={(e) => setForm((f) => ({ ...f, sampleText: e.target.value }))}
                placeholder="このライターの文体・トーンを示す短いサンプル文章を入力してください。AI記事生成時の参考として使用されます。"
                rows={5}
                style={{ borderRadius: 2, resize: "vertical" }}
              />
            </section>

            <Separator />

            {/* Coverage */}
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                担当言語・カテゴリ
              </h3>
              <div>
                <Label style={{ fontSize: 13 }}>担当言語（カンマ区切り）</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const langs = form.languages.split(",").map((l) => l.trim()).filter(Boolean);
                    const selected = langs.includes(lang.value);
                    return (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => {
                          const newLangs = selected
                            ? langs.filter((l) => l !== lang.value)
                            : [...langs, lang.value];
                          setForm((f) => ({ ...f, languages: newLangs.join(", ") }));
                        }}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 2,
                          border: selected ? "2px solid #000" : "1px solid #D7D7D7",
                          background: selected ? "#000" : "#fff",
                          color: selected ? "#fff" : "#333",
                          fontSize: 12,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {lang.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Label style={{ fontSize: 13 }}>専門カテゴリ（カンマ区切りのスラッグ）</Label>
                <Input
                  value={form.categorySpecialties}
                  onChange={(e) => setForm((f) => ({ ...f, categorySpecialties: e.target.value }))}
                  placeholder="例：gourmet, travel, esim"
                  style={{ marginTop: 4, borderRadius: 2 }}
                />
              </div>
            </section>

            <Separator />

            {/* Settings */}
            <section>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                設定
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <Label style={{ fontSize: 13 }}>アクティブ（AI記事生成で使用する）</Label>
              </div>
              <div style={{ marginTop: 12 }}>
                <Label style={{ fontSize: 13 }}>表示順（数字が小さいほど上位）</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  style={{ marginTop: 4, borderRadius: 2, width: 100 }}
                />
              </div>
            </section>
          </div>

          <DialogFooter style={{ marginTop: 8 }}>
            <Button variant="outline" onClick={() => setOpen(false)} style={{ borderRadius: 2 }}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={upsert.isPending}
              style={{ background: "#000", color: "#fff", borderRadius: 2 }}
            >
              {upsert.isPending ? "保存中..." : form.id ? "更新する" : "追加する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent style={{ maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle>AIライターを削除しますか？</DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 14, color: "#555" }}>この操作は取り消せません。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} style={{ borderRadius: 2 }}>
              キャンセル
            </Button>
            <Button
              onClick={() => deleteConfirm !== null && del.mutate({ id: deleteConfirm })}
              disabled={del.isPending}
              style={{ background: "#cc0000", color: "#fff", borderRadius: 2 }}
            >
              {del.isPending ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
