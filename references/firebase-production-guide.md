# Firebase 本番運用 移行ガイド

このドキュメントは「Manus WebDev で開発 → Firebase / Cloud Run で本番運用」を実現するための手順書です。

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│  開発環境 (Manus WebDev)         本番環境 (Firebase)         │
│                                                             │
│  認証:  Firebase Auth ──────────── Firebase Auth            │
│  DB:    TiDB Serverless ─────────── TiDB / PlanetScale      │
│  Storage: Manus Forge S3 ────────── AWS S3                  │
│  LLM:   Manus Forge LLM ─────────── OpenAI API              │
│  通知:  Manus Forge Push ─────────── console.warn (要実装)   │
│  Hosting: Manus WebDev ──────────── Firebase App Hosting    │
└─────────────────────────────────────────────────────────────┘
```

---

## 環境変数マッピング

| 変数名 | Manus 開発 | Firebase 本番 | 必須 |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | ✅ |
| `PORT` | `3000` | `8080` | ✅ |
| `DATABASE_URL` | 自動注入 | Secret Manager | ✅ |
| `JWT_SECRET` | 自動注入 | Secret Manager | ✅ |
| `FIREBASE_PROJECT_ID` | 自動注入 | 自動注入 | ✅ |
| `FIREBASE_CLIENT_EMAIL` | 自動注入 | 自動注入 | ✅ |
| `FIREBASE_PRIVATE_KEY` | 自動注入 | 自動注入 | ✅ |
| `VITE_FIREBASE_API_KEY` | 自動注入 | 手動設定 | ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | 自動注入 | 手動設定 | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | 自動注入 | 手動設定 | ✅ |
| `STORAGE_PROVIDER` | `manus`（デフォルト） | `s3` | ✅ |
| `AWS_S3_BUCKET` | 不要 | Secret Manager | S3使用時 |
| `AWS_REGION` | 不要 | `ap-northeast-1` | S3使用時 |
| `AWS_ACCESS_KEY_ID` | 不要 | Secret Manager | S3使用時 |
| `AWS_SECRET_ACCESS_KEY` | 不要 | Secret Manager | S3使用時 |
| `LLM_PROVIDER` | `manus`（デフォルト） | `openai` | LLM使用時 |
| `OPENAI_API_KEY` | 不要 | Secret Manager | LLM使用時 |
| `BUILT_IN_FORGE_API_URL` | 自動注入 | **設定不要** | ❌ |
| `BUILT_IN_FORGE_API_KEY` | 自動注入 | **設定不要** | ❌ |

---

## デプロイ手順

### 1. Firebase プロジェクトの準備

```bash
# Firebase CLI インストール
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクト初期化（既存プロジェクトに接続）
firebase use YOUR_FIREBASE_PROJECT_ID
```

### 2. Google Cloud Secret Manager にシークレットを登録

```bash
# DATABASE_URL
echo -n "mysql://user:pass@host:3306/db?ssl=..." | \
  gcloud secrets create DATABASE_URL --data-file=-

# JWT_SECRET
openssl rand -base64 32 | \
  gcloud secrets create JWT_SECRET --data-file=-

# AWS S3 認証情報
echo -n "your-bucket-name" | gcloud secrets create AWS_S3_BUCKET --data-file=-
echo -n "ap-northeast-1" | gcloud secrets create AWS_REGION --data-file=-
echo -n "AKIAIOSFODNN7EXAMPLE" | gcloud secrets create AWS_ACCESS_KEY_ID --data-file=-
echo -n "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" | \
  gcloud secrets create AWS_SECRET_ACCESS_KEY --data-file=-

# OpenAI API Key（LLM使用時）
echo -n "sk-..." | gcloud secrets create OPENAI_API_KEY --data-file=-
```

### 3. Firebase App Hosting でバックエンドを作成

```bash
# App Hosting バックエンド作成（GitHub リポジトリと連携）
firebase apphosting:backends:create \
  --project YOUR_FIREBASE_PROJECT_ID \
  --location asia-northeast1

# GitHub リポジトリを接続し、main ブランチへの push で自動デプロイ
```

### 4. apphosting.yaml の確認

`apphosting.yaml` に本番用の環境変数が設定されていることを確認してください。
`secret:` キーワードで参照している値は Secret Manager から自動取得されます。

### 5. データベースマイグレーション

本番 DB への初回マイグレーションは、ローカルから `DATABASE_URL` を本番値に設定して実行します。

```bash
DATABASE_URL="mysql://..." pnpm drizzle-kit migrate
```

---

## Cloud Run への直接デプロイ（Firebase App Hosting を使わない場合）

```bash
# Docker イメージをビルドして Google Artifact Registry に push
gcloud builds submit \
  --tag asia-northeast1-docker.pkg.dev/YOUR_PROJECT/magazine-yah-mobi/app:latest

# Cloud Run にデプロイ
gcloud run deploy magazine-yah-mobi \
  --image asia-northeast1-docker.pkg.dev/YOUR_PROJECT/magazine-yah-mobi/app:latest \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,AWS_S3_BUCKET=AWS_S3_BUCKET:latest,AWS_ACCESS_KEY_ID=AWS_ACCESS_KEY_ID:latest,AWS_SECRET_ACCESS_KEY=AWS_SECRET_ACCESS_KEY:latest" \
  --set-env-vars "NODE_ENV=production,STORAGE_PROVIDER=s3,AWS_REGION=ap-northeast-1"
```

---

## ストレージ移行（Manus S3 → AWS S3）

既存の Manus S3 に保存されたファイルは、本番移行時に AWS S3 へコピーが必要です。

```bash
# aws-cli でコピー（Manus S3 のバケット名は Manus サポートに確認）
aws s3 sync s3://manus-bucket/your-app/ s3://your-production-bucket/ \
  --region ap-northeast-1
```

DB の `fileKey` / `url` カラムも `/manus-storage/` → `/storage/` に更新が必要です。

```sql
-- DB の URL パスを更新（本番移行後に実行）
UPDATE articles SET thumbnail_url = REPLACE(thumbnail_url, '/manus-storage/', '/storage/')
WHERE thumbnail_url LIKE '/manus-storage/%';
```

---

## LLM 移行（Manus Forge → OpenAI）

`LLM_PROVIDER=openai` と `OPENAI_API_KEY` を設定するだけで切り替わります。
`server/_core/llm.ts` の `invokeLLM` は OpenAI 互換 API を呼び出すため、
モデル名を `gpt-4o-mini` 等に変更する必要があります。

```typescript
// routers.ts での使用例（本番環境）
const res = await invokeLLM({
  model: "gpt-4o-mini",   // OpenAI モデル名を明示
  messages: [...],
});
```

---

## 通知チャネルの実装（本番用）

現在の `notifyOwner` は Manus Forge が未設定の場合 `console.warn` にフォールバックします。
本番環境では `server/_core/notification.ts` の fallback ブロックを以下のいずれかに置き換えてください。

### SendGrid（メール通知）

```bash
pnpm add @sendgrid/mail
```

```typescript
// server/_core/notification.ts の fallback ブロックを置き換え
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
await sgMail.send({
  to: process.env.NOTIFICATION_EMAIL_TO!,
  from: "noreply@magazine.yah.mobi",
  subject: title,
  text: content,
});
return true;
```

### Slack Webhook

```typescript
await fetch(process.env.SLACK_WEBHOOK_URL!, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: `*${title}*\n${content}` }),
});
return true;
```

---

## チェックリスト

- [ ] Firebase プロジェクト作成・Firebase Auth 有効化
- [ ] Google Cloud Secret Manager にシークレット登録
- [ ] AWS S3 バケット作成・IAM ユーザー作成（最小権限）
- [ ] `apphosting.yaml` の secret 参照を確認
- [ ] 本番 DB へのマイグレーション実行
- [ ] Firebase App Hosting バックエンド作成・GitHub 連携
- [ ] カスタムドメイン（magazine.yah.mobi）の DNS 設定
- [ ] 既存ファイルの S3 移行（`/manus-storage/` → `/storage/`）
- [ ] DB の URL パス更新 SQL 実行
- [ ] 通知チャネルの実装（SendGrid / Slack）
- [ ] 本番環境での動作確認（ログイン・記事投稿・画像アップロード）
