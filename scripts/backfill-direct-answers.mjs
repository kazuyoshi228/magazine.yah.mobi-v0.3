/**
 * Backfill directAnswer for all article_translations where it is empty.
 * Uses the same LLM prompt as the upsertTranslation procedure.
 * Run: node scripts/backfill-direct-answers.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
// Node 22 has native fetch built-in

dotenv.config();

const DB_URL = process.env.DATABASE_URL;
const LLM_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const LLM_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DB_URL || !LLM_API_URL || !LLM_API_KEY) {
  console.error("Missing env: DATABASE_URL / BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY");
  process.exit(1);
}

const langLabel = { ja: "日本語", en: "English", ko: "한국어", "zh-TW": "繁體中文" };

async function invokeLLM(messages) {
  const res = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({ model: "claude-sonnet-4-5", messages }),
  });
  if (!res.ok) throw new Error(`LLM error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

async function main() {
  const conn = await createConnection(DB_URL);

  const [rows] = await conn.execute(
    "SELECT id, articleId, lang, title, body FROM article_translations WHERE directAnswer IS NULL OR directAnswer = ''"
  );

  console.log(`Found ${rows.length} translations with empty directAnswer.`);

  for (const row of rows) {
    const { id, articleId, lang, title, body } = row;
    const langName = langLabel[lang] ?? lang;
    const bodySnippet = (body || "").replace(/<[^>]+>/g, "").slice(0, 2000);

    console.log(`\n[${id}] Article ${articleId} (${lang}): "${title}"`);

    try {
      const directAnswer = await invokeLLM([
        {
          role: "system",
          content: `You are a travel content editor. Write a concise, factual direct-answer paragraph (2-3 sentences, ${langName}) that directly answers the key question implied by the article title. This will be used as a GEO (Generative Engine Optimization) answer block shown at the top of the article. Do NOT use markdown, bullet points, or headings. Plain text only.`,
        },
        {
          role: "user",
          content: `Article title: ${title}\n\nArticle body (excerpt):\n${bodySnippet}`,
        },
      ]);

      await conn.execute("UPDATE article_translations SET directAnswer = ? WHERE id = ?", [
        directAnswer,
        id,
      ]);

      console.log(`  ✓ Generated (${directAnswer.length} chars): ${directAnswer.slice(0, 80)}...`);
    } catch (e) {
      console.error(`  ✗ Failed for id=${id}:`, e.message);
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  await conn.end();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
