# magazine.yah.mobi — Project TODO

## Phase 3: DB Schema & Project Foundation
- [x] DB schema: articles, categories, article_languages, subscribers, tags tables
- [x] Generate and apply DB migration SQL
- [x] Server-side tRPC routers: articles, cms, subscribers, seo

## Phase 4: Design System & Global Layout
- [x] Global CSS: brand tokens (#F7F7F7, #000, #D7D7D7), National 2 / Noto Sans JP fonts
- [x] Sticky header: yah. logo, category nav, language switcher, "eSIMを購入" CTA
- [x] Footer: yah.homes + yah.mobile links, brand tagline
- [x] Responsive layout: mobile-first, hamburger menu
- [x] Scroll-to-top on route change

## Phase 5: Pages
- [x] Home page: hero section (#F7F7F7 background), category article grid, yah.mobile CTA banner
- [x] Article list page: category filter, language filter, article card grid
- [x] Article detail page: Schema Markup, GEO answer block (left black border), CTA at bottom
- [x] 404 page

## Phase 6: CMS & Email Subscription
- [x] CMS admin: article list, create/edit form (title, body, category, language, schema type, status, thumbnail)
- [x] Markdown editor with preview
- [x] Subscriber form: name + email, owner notification
- [x] Subscriber list management (admin only)

## Phase 7: SEO Infrastructure
- [x] Dynamic OGP + meta tags per page/article
- [x] Schema Markup auto-injection (Article / HowTo / FAQPage)
- [x] hreflang tag auto-generation per article language variant
- [x] /sitemap.xml endpoint
- [x] /llms.txt endpoint
- [x] /robots.txt

## Phase 8: Final QA
- [x] Vitest unit tests for routers (13 tests passing)
- [x] Visual QA: desktop + mobile screenshots
- [x] Checkpoint save

## Admin Dashboard
- [x] DBスキーマ拡張：page_views / cta_clicks / ai_crawl_logs テーブル追加
- [x] サーバー：トラッキングエンドポイント（POST /api/track）実装
- [x] サーバー：アナリティクスtRPCルーター（analytics router）実装
- [x] フロントエンド：/admin ダッシュボードページ（KPIカード・グラフ・CTA分析）
- [x] クライアントサイドトラッキング（PV・CTAクリック・AIクローラー検出）
- [x] 管理者認証ガード（Manus OAuth + admin role）

## Hero Image Placeholder
- [x] HEROセクションを2カラムレイアウトに変更（左：テキスト、右：画像）
- [x] Adobe Stockプレビュー画像をWebP変換・S3アップロード（/manus-storage/hero-placeholder_67a8cb12.webp）
- [x] レスポンシブ対応：モバイルでは画像非表示・1カラム表示

## 2026-06-26 修正・機能追加
- [x] 記事CTAボックスの青（#2563eb）・オレンジ（#ea580c）をブランドカラーに変更
- [x] /adminにブランドガイダンス管理ページを追加（DB保存・CRUD）
- [x] /adminにCurator管理ページを追加（URL・メモ保存・CRUD）
- [x] ニュースレターセクションを削除
- [x] コンテンツ幅：全ページで.containerクラス（max-width:1200px）を統一使用
- [x] フッターの説明文を1行に変更（white-space:nowrap）
- [x] brand_guidelines・curators テーブルをDBに追加

## AIライター管理機能
- [x] DBスキーマ：ai_writers テーブル追加（name, slug, avatar_url, bio, tone, persona, writing_style, forbidden_words, sample_text, is_active）
- [x] マイグレーションSQL生成・適用
- [x] tRPCルーター：aiWriters CRUD（list / upsert / delete）
- [x] /admin/ai-writers ページ実装（一覧・追加・編集・削除）
- [x] AdminDashboard に AIライター管理リンクを追加
- [x] App.tsx にルート追加

## 著者セクション（AIライター連動）
- [x] articlesテーブルにwriter_id（外部キー → ai_writers）を追加・マイグレーション適用
- [x] getArticleBySlugにwriter情報をJOINして返すよう更新
- [x] 記事詳細ページに著者セクションUI追加（アバター・名前・Bio・担当言語）
- [x] 記事32番にwriter_idを設定（テスト用ライターを登録して紐付け）

## 2026-06-26 幅修正・GitHub連動
- [x] 記事#32のコンテンツ幅ズレ修正（prose-yah ul padding-left: 0 に変更）
- [x] prose-yah table スタイル追加（overflow-x: auto、th/td スタイル）
- [x] GitHub連動確認（user_github remote: kazuyoshi228/magazine-yah-mobi）

## directAnswer 自動生成（LLM）
- [x] upsertTranslation 手続き：directAnswer が空の場合に invokeLLM で自動生成
- [x] 既存記事の directAnswer を一括生成するスクリプト実行
- [x] 動作確認・チェックポイント保存

## / ページ SEO修正
- [x] meta description を 50～160文字に拡張（各言語対応）
- [x] SeoHead に keywords プロプを追加し meta keywords タグを出力
- [x] ホームページに日本語・英語・韓国語・繁中の keywords を設定

## 記事一覧・カテゴリ別ページ SEO強化
- [x] /articles ページに meta description・keywords を設定（言語別）
- [x] カテゴリ別ページ（/articles?category=xxx）に動的 meta description・keywords を設定

## CMS 記事編集 - アイキャッチ画像変更機能
- [x] CmsArticleEdit にアイキャッチ画像アップロード・変更 UI を追加
- [x] S3 storagePut を使った画像アップロード tRPC エンドポイントを追加（cms.uploadThumbnail）
- [x] 画像アップロード時に articles テーブルの thumbnailUrl を自動更新

## /writers ページ（人間/AI バッジ）
- [x] ai_writers テーブルに writer_type ENUM('human','ai') カラム追加・マイグレーション適用
- [x] Kazuyoshi Yamada を human に更新
- [x] aiWriters.listPublic エンドポイントを追加（公開アクセス可）
- [x] /writers 公開ページを実装（All/Human/AIフィルター・バッジ付き一覧）
- [x] AdminAiWritersにライター種別セレクターとバッジを追加
- [x] App.tsxに/writersルートを追加

## CMS インライン画像アップロード
- [x] cms.uploadImage tRPC プロシージャを追加（base64 → S3 → URL 返却）
- [x] CmsArticleEdit マークダウンエディターに「画像を挿入」ボタンを追加
- [x] ドラッグ&ドロップでエディターに画像を貼り付けると自動アップロード・Markdown 挿入
- [x] アップロード中のローディング表示
- [x] テスト・チェックポイント保存

## Firebase Auth 実装（Manus OAuth 置き換え）
- [x] firebase-admin / firebase パッケージをインストール
- [x] 環境変数に Firebase 設定を追加（FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN）
- [x] users テーブルに firebase_uid ・ avatar_url カラムを追加・マイグレーション適用
- [x] server/_core/firebase-admin.ts を作成（Admin SDK 初期化・接続テスト成功）
- [x] server/_core/oauth.ts に /api/auth/firebase/session ・ /api/auth/firebase/logout エンドポイント追加
- [x] server/_core/context.ts に Firebase トークン検証ロジックを追加
- [x] client/src/lib/firebase.ts を作成（Client SDK 初期化・ signInWithGoogle ・ signOutFirebase）
- [x] client/src/_core/hooks/useAuth.ts を Firebase Auth ベースに書き換え（login / logout 関数）
- [x] /login ページ作成（Google サインインボタン）
- [x] 全管理ページの getLoginUrl() を /login に変更
- [x] Firebase Admin SDK 接続テスト成功（listUsers API 正常応答）
- [x] 実際の Google ログインフローの動作確認（ブラウザテスト）
- [x] Manus OAuth 関連のコードを最終的に削除（動作確認後）

## writer ロール追加・管理者設定・Manus OAuth 削除
- [x] DB: role ENUM に 'writer' を追加・マイグレーション適用
- [x] サーバー: writerProcedure（writer 以上のみ）を追加・CMS ルーターに適用
- [x] フロントエンド: /admin/cms/* は writer 以上、/admin/* は admin のみアクセス可
- [x] kazuyoshi.yamada@bonfire.co.jp を admin ロールに設定（Firebase UID で特定）
- [x] Manus OAuth 関連コードを削除（getLoginUrl, sdk.ts の OAuth 部分, /api/oauth/callback）
- [x] テスト・チェックポイント保存

## Firebase 本番運用互換性対応
- [x] Firebase ID Token 自動更新（onIdTokenChanged でクッキー再設定）
- [x] Firebase Session Cookie 移行スキップ（ID Token 自動更新方式で十分なため不要に判断）
- [x] LLM 抽象化（既存 invokeLLM は OpenAI 互換 API、LLM_PROVIDER 環境変数で切り替え可）
- [x] ファイルストレージ抽象化（STORAGE_PROVIDER=manus|s3 で切り替え可能に）
- [x] オーナー通知フォールバック（Manus Forge が未設定時は console.warn のみ）
- [x] Firebase App Hosting 設定ファイル（apphosting.yaml）生成
- [x] Dockerfile 生成（Cloud Run 直接デプロイ用）
- [x] 環境変数テンプレート（.env.example）はシステム制限のため references/ にマッピング記載
- [x] references/firebase-production-guide.md 作成（移行手順ドキュメント）
- [x] TypeScript コンパイルエラーなし確認・テスト通過（13 tests passed）

## 本番デプロイ修正（vite 依存エラーの根本解決・ゼロから再設計）
- [x] esbuild のバンドル出力を検証し vite 依存連鎖を完全特定（動的importでもローカルファイルはインライン展開され vite 静的importが残ることを確認）
- [x] vite.ts の `import "vite"` をトップレベルから関数内の動的importへ移動（本番では未評価）
- [x] 動的import分割代入の `as` 構文を `:` に修正（esbuild互換）
- [x] ローカルで NODE_ENV=production + prod依存のみ（vite未インストール）で起動成功を実証
- [x] テスト通過（13 tests）・TypeScript エラー0件
