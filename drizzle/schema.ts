import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  firebaseUid: varchar("firebaseUid", { length: 128 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarUrl: text("avatarUrl"),
  role: mysqlEnum("role", ["user", "admin", "writer"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Categories ───────────────────────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  nameJa: varchar("nameJa", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  nameKo: varchar("nameKo", { length: 128 }).notNull(),
  nameZhTw: varchar("nameZhTw", { length: 128 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// ─── Articles ─────────────────────────────────────────────────────────────────
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  categoryId: int("categoryId").notNull(),
  schemaType: mysqlEnum("schemaType", ["Article", "HowTo", "FAQPage"]).default("Article").notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  thumbnailKey: varchar("thumbnailKey", { length: 512 }),
  featuredImageUrl: text("featuredImageUrl"),
  authorId: int("authorId"),
  writerId: int("writerId"),  // FK → ai_writers.id
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

// ─── Article Language Variants ────────────────────────────────────────────────
export const articleTranslations = mysqlTable("article_translations", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  lang: mysqlEnum("lang", ["ja", "en", "ko", "zh-TW"]).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt"),
  body: text("body").notNull(),
  // GEO direct-answer block content
  directAnswer: text("directAnswer"),
  // SEO meta
  metaTitle: varchar("metaTitle", { length: 256 }),
  metaDescription: text("metaDescription"),
  // Schema Markup structured data (JSON string)
  schemaData: json("schemaData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArticleTranslation = typeof articleTranslations.$inferSelect;
export type InsertArticleTranslation = typeof articleTranslations.$inferInsert;

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;

export const articleTags = mysqlTable("article_tags", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  tagId: int("tagId").notNull(),
});

// ─── Subscribers ──────────────────────────────────────────────────────────────
export const subscribers = mysqlTable("subscribers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  lang: mysqlEnum("lang", ["ja", "en", "ko", "zh-TW"]).default("ja").notNull(),
  status: mysqlEnum("status", ["active", "unsubscribed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = typeof subscribers.$inferInsert;

// ─── Page Views ────────────────────────────────────────────────────────────────────────────────
export const pageViews = mysqlTable("page_views", {
  id: int("id").autoincrement().primaryKey(),
  // Page path e.g. "/", "/articles/slug", "/articles"
  path: varchar("path", { length: 512 }).notNull(),
  // Optional article reference
  articleId: int("articleId"),
  // Session identifier (anonymous, stored in localStorage)
  sessionId: varchar("sessionId", { length: 64 }),
  // Language of the page at time of view
  lang: varchar("lang", { length: 8 }),
  // Country inferred from Accept-Language header
  country: varchar("country", { length: 8 }),
  // Referrer URL (truncated)
  referrer: varchar("referrer", { length: 512 }),
  // User-Agent (truncated for storage efficiency)
  userAgent: varchar("userAgent", { length: 256 }),
  // Whether this is an AI crawler
  isAiCrawler: boolean("isAiCrawler").default(false).notNull(),
  // AI crawler bot name if detected
  crawlerName: varchar("crawlerName", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;

// ─── CTA Clicks ───────────────────────────────────────────────────────────────────────────────
export const ctaClicks = mysqlTable("cta_clicks", {
  id: int("id").autoincrement().primaryKey(),
  // Which CTA was clicked
  target: mysqlEnum("target", ["yah_mobile", "yah_homes", "esim_buy", "esim_hero", "esim_article"]).notNull(),
  // Source page path
  sourcePath: varchar("sourcePath", { length: 512 }).notNull(),
  // Optional article reference
  articleId: int("articleId"),
  sessionId: varchar("sessionId", { length: 64 }),
  lang: varchar("lang", { length: 8 }),
  referrer: varchar("referrer", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CtaClick = typeof ctaClicks.$inferSelect;
export type InsertCtaClick = typeof ctaClicks.$inferInsert;

// ─── AI Crawl Logs ─────────────────────────────────────────────────────────────────────────────
export const aiCrawlLogs = mysqlTable("ai_crawl_logs", {
  id: int("id").autoincrement().primaryKey(),
  crawlerName: varchar("crawlerName", { length: 64 }).notNull(),
  path: varchar("path", { length: 512 }).notNull(),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiCrawlLog = typeof aiCrawlLogs.$inferSelect;

// ─── Brand Guidelines ──────────────────────────────────────────────────────────────────────────────────────────────
export const brandGuidelines = mysqlTable("brand_guidelines", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 128 }).notNull(), // e.g. "color", "typography", "tone", "forbidden"
  key: varchar("key", { length: 128 }).notNull(),           // e.g. "primary_color", "forbidden_color_blue"
  value: text("value").notNull(),                           // e.g. "#000000" or "Do not use blue (#2563eb)"
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandGuideline = typeof brandGuidelines.$inferSelect;
export type InsertBrandGuideline = typeof brandGuidelines.$inferInsert;

// ─── Curators ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const curators = mysqlTable("curators", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  url: text("url").notNull(),
  platform: varchar("platform", { length: 64 }),  // e.g. "blog", "instagram", "youtube", "twitter"
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Curator = typeof curators.$inferSelect;
export type InsertCurator = typeof curators.$inferInsert;

// ─── AI Writers ───────────────────────────────────────────────────────────────
export const aiWriters = mysqlTable("ai_writers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  // Writing tone: e.g. "casual", "formal", "journalistic", "conversational"
  tone: varchar("tone", { length: 128 }),
  // Target persona description
  persona: text("persona"),
  // Writing style notes (sentence length, structure, etc.)
  writingStyle: text("writingStyle"),
  // Comma-separated forbidden words/phrases
  forbiddenWords: text("forbiddenWords"),
  // Sample text to demonstrate the writer's voice
  sampleText: text("sampleText"),
  // Languages this writer covers
  languages: varchar("languages", { length: 256 }).default("ja").notNull(),
  // Category specialties (comma-separated slugs)
  categorySpecialties: varchar("categorySpecialties", { length: 512 }),
  // Writer type: 'human' for human writers, 'ai' for AI-generated personas
  writerType: mysqlEnum("writerType", ["human", "ai"]).default("ai").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiWriter = typeof aiWriters.$inferSelect;
export type InsertAiWriter = typeof aiWriters.$inferInsert;
