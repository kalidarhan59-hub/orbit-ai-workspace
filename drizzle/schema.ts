import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import type { OrbitAttachment } from "../shared/orbit";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const agents = mysqlTable("orbit_agents", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt").notNull(),
  modelId: varchar("modelId", { length: 160 }),
  memoryEnabled: boolean("memoryEnabled").default(true).notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const threads = mysqlTable("orbit_threads", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull(),
  agentId: varchar("agentId", { length: 32 }),
  title: varchar("title", { length: 180 }).notNull(),
  modelId: varchar("modelId", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const messages = mysqlTable("orbit_messages", {
  id: varchar("id", { length: 32 }).primaryKey(),
  threadId: varchar("threadId", { length: 32 }).notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  attachments: json("attachments").$type<OrbitAttachment[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const files = mysqlTable("orbit_files", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull(),
  threadId: varchar("threadId", { length: 32 }),
  name: varchar("name", { length: 180 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 700 }).notNull(),
  mimeType: varchar("mimeType", { length: 160 }).notNull(),
  size: int("size").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const memoryNotes = mysqlTable("orbit_memory_notes", {
  id: varchar("id", { length: 32 }).primaryKey(),
  userId: int("userId").notNull(),
  agentId: varchar("agentId", { length: 32 }),
  content: text("content").notNull(),
  source: mysqlEnum("source", ["user", "agent", "chat"]).default("user").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userSettings = mysqlTable("orbit_user_settings", {
  userId: int("userId").primaryKey(),
  defaultModel: varchar("defaultModel", { length: 160 }),
  defaultSystemPrompt: text("defaultSystemPrompt"),
  behavior: mysqlEnum("behavior", ["balanced", "concise", "detailed"]).default("balanced").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
