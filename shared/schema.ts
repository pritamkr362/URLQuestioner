import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const contentSessions = pgTable("content_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url"), // Optional - null for PDF uploads and topic-only sessions
  title: text("title"),
  topic: text("topic").notNull(),
  extractedContent: text("extracted_content"), // Optional - null for topic-only sessions
  wordCount: integer("word_count"),
  readTime: integer("read_time"),
  modelUsed: text("model_used"),
  sourceType: text("source_type").notNull().default("url"), // 'url', 'pdf', or 'topic-only'
  fileName: text("file_name"), // For PDF uploads
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => contentSessions.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  modelUsed: text("model_used"), // Track which model generated assistant responses
  timestamp: timestamp("timestamp").default(sql`now()`),
});

export const insertContentSessionSchema = createInsertSchema(contentSessions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export type InsertContentSession = z.infer<typeof insertContentSessionSchema>;
export type ContentSession = typeof contentSessions.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
