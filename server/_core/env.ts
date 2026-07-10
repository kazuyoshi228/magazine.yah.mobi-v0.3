export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // ── Manus Forge (development) ────────────────────────────────────────────
  // Auto-injected in Manus WebDev. Leave blank in production.
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // ── LLM (production) ─────────────────────────────────────────────────────
  // When forgeApiUrl/forgeApiKey are blank, invokeLLM uses these instead.
  // Set OPENAI_API_KEY + optionally OPENAI_BASE_URL for any OpenAI-compatible API.
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com",

  // ── Storage ───────────────────────────────────────────────────────────────
  // "manus" = Manus Forge presign API (dev default)
  // "s3"    = AWS S3 direct upload (production)
  storageProvider: (process.env.STORAGE_PROVIDER ?? "manus") as "manus" | "s3",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  awsRegion: process.env.AWS_REGION ?? "ap-northeast-1",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",

  // ── Firebase Auth ─────────────────────────────────────────────────────────
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ?? "",
};
