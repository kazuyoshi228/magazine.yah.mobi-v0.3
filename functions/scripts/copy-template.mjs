/**
 * Hosting のビルド成果物（dist/public/index.html）を SSR テンプレートとして
 * functions/assets/ にコピーする。functions のデプロイパッケージに同梱される。
 * 先に `pnpm build`（ルート）で Vite ビルドを済ませておくこと。
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../../dist/public/index.html");
const destDir = path.resolve(here, "../assets");
const dest = path.join(destDir, "index.html");

if (!existsSync(src)) {
  console.warn(`[copy-template] ${src} がありません。先にルートで \`pnpm build\` を実行してください。`);
  process.exit(0); // ビルド自体は失敗させない（emulator用フォールバックがある）
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-template] index.html → functions/assets/ にコピーしました`);
