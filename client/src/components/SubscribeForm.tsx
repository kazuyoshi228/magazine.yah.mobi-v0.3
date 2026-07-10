import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { Lang } from "./Header";

interface SubscribeFormProps {
  lang: Lang;
}

const FORM_COPY: Record<Lang, {
  namePlaceholder: string;
  emailPlaceholder: string;
  submit: string;
  success: string;
  duplicate: string;
  error: string;
}> = {
  ja: {
    namePlaceholder: "お名前",
    emailPlaceholder: "メールアドレス",
    submit: "登録する",
    success: "登録が完了しました。ありがとうございます！",
    duplicate: "このメールアドレスはすでに登録されています。",
    error: "登録に失敗しました。もう一度お試しください。",
  },
  en: {
    namePlaceholder: "Your name",
    emailPlaceholder: "Email address",
    submit: "Subscribe",
    success: "You're subscribed! Thank you.",
    duplicate: "This email is already subscribed.",
    error: "Subscription failed. Please try again.",
  },
  ko: {
    namePlaceholder: "이름",
    emailPlaceholder: "이메일 주소",
    submit: "구독하기",
    success: "구독이 완료되었습니다. 감사합니다!",
    duplicate: "이미 등록된 이메일 주소입니다.",
    error: "구독에 실패했습니다. 다시 시도해 주세요.",
  },
  "zh-TW": {
    namePlaceholder: "您的姓名",
    emailPlaceholder: "電子郵件地址",
    submit: "訂閱",
    success: "訂閱成功！感謝您。",
    duplicate: "此電子郵件已訂閱。",
    error: "訂閱失敗，請再試一次。",
  },
};

export default function SubscribeForm({ lang }: SubscribeFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const copy = FORM_COPY[lang];

  const subscribe = trpc.subscribers.subscribe.useMutation({
    onSuccess: () => {
      setDone(true);
      toast.success(copy.success);
    },
    onError: (err) => {
      if (err.data?.code === "CONFLICT") {
        toast.error(copy.duplicate);
      } else {
        toast.error(copy.error);
      }
    },
  });

  if (done) {
    return (
      <div
        style={{
          padding: "1.25rem 1.5rem",
          backgroundColor: "#F7F7F7",
          borderLeft: "3px solid #000000",
          fontSize: "0.9375rem",
          color: "#000000",
        }}
      >
        {copy.success}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) return;
        subscribe.mutate({ name: name.trim(), email: email.trim(), lang });
      }}
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={copy.namePlaceholder}
        required
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          fontSize: "0.9375rem",
          border: "1px solid #D7D7D7",
          backgroundColor: "#FFFFFF",
          color: "#000000",
          outline: "none",
          transition: "border-color 160ms",
        }}
        onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#000000")}
        onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#D7D7D7")}
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={copy.emailPlaceholder}
        required
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          fontSize: "0.9375rem",
          border: "1px solid #D7D7D7",
          backgroundColor: "#FFFFFF",
          color: "#000000",
          outline: "none",
          transition: "border-color 160ms",
        }}
        onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#000000")}
        onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#D7D7D7")}
      />
      <button
        type="submit"
        disabled={subscribe.isPending}
        className="btn-primary"
        style={{ justifyContent: "center", opacity: subscribe.isPending ? 0.6 : 1 }}
      >
        {subscribe.isPending ? "…" : copy.submit}
      </button>
    </form>
  );
}
