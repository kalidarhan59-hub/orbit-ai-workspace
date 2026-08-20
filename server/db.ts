import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  agents,
  files,
  localAccounts,
  memoryNotes,
  messages,
  threads,
  type InsertUser,
  users,
  userSettings,
} from "../drizzle/schema";
import type { OrbitAttachment, OrbitMessageRole } from "../shared/orbit";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { ...user, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) updateSet[field] = user[field] ?? null;
  });
  if (user.role !== undefined) updateSet.role = user.role;
  else if (user.openId === ENV.ownerOpenId) updateSet.role = "admin";
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getLocalAccount(username: string) {
  const db = await requireDb();
  const result = await db.select().from(localAccounts).where(eq(localAccounts.username, username)).limit(1);
  return result[0] ?? null;
}

export async function getLocalAccountUser(username: string) {
  const db = await requireDb();
  const result = await db
    .select({ account: localAccounts, user: users })
    .from(localAccounts)
    .innerJoin(users, eq(localAccounts.userId, users.id))
    .where(eq(localAccounts.username, username))
    .limit(1);
  return result[0] ?? null;
}

export async function createLocalAccount(input: { username: string; passwordHash: string; openId: string }) {
  const db = await requireDb();
  const existing = await getLocalAccount(input.username);
  if (existing) return null;
  await db.insert(users).values({ openId: input.openId, name: input.username, email: null, loginMethod: "local", lastSignedIn: new Date() });
  const user = await getUserByOpenId(input.openId);
  if (!user) throw new Error("Не удалось создать учётную запись.");
  await db.insert(localAccounts).values({ userId: user.id, username: input.username, passwordHash: input.passwordHash });
  return user;
}

export async function listAgents(userId: number) {
  const db = await requireDb();
  return db.select().from(agents).where(and(eq(agents.userId, userId), eq(agents.status, "active"))).orderBy(desc(agents.updatedAt));
}

export async function getAgent(userId: number, id: string) {
  const db = await requireDb();
  const result = await db.select().from(agents).where(and(eq(agents.userId, userId), eq(agents.id, id))).limit(1);
  return result[0];
}

export async function saveAgent(input: {
  userId: number;
  id?: string;
  name: string;
  description?: string;
  systemPrompt: string;
  modelId?: string;
  memoryEnabled: boolean;
}) {
  const db = await requireDb();
  const id = input.id ?? nanoid(16);
  if (input.id) {
    await db
      .update(agents)
      .set({
        name: input.name,
        description: input.description ?? null,
        systemPrompt: input.systemPrompt,
        modelId: input.modelId ?? null,
        memoryEnabled: input.memoryEnabled,
        updatedAt: new Date(),
      })
      .where(and(eq(agents.userId, input.userId), eq(agents.id, id)));
  } else {
    await db.insert(agents).values({ ...input, id, description: input.description ?? null, modelId: input.modelId ?? null });
  }
  return getAgent(input.userId, id);
}

export async function archiveAgent(userId: number, id: string) {
  const db = await requireDb();
  await db.update(agents).set({ status: "archived", updatedAt: new Date() }).where(and(eq(agents.userId, userId), eq(agents.id, id)));
}

export async function listThreads(userId: number) {
  const db = await requireDb();
  return db.select().from(threads).where(eq(threads.userId, userId)).orderBy(desc(threads.updatedAt));
}

export async function getThread(userId: number, id: string) {
  const db = await requireDb();
  const result = await db.select().from(threads).where(and(eq(threads.userId, userId), eq(threads.id, id))).limit(1);
  return result[0];
}

export async function createThread(input: { userId: number; title: string; agentId?: string; modelId?: string }) {
  const db = await requireDb();
  const id = nanoid(16);
  await db.insert(threads).values({ id, ...input, agentId: input.agentId ?? null, modelId: input.modelId ?? null });
  return getThread(input.userId, id);
}

export async function touchThread(userId: number, id: string, title?: string) {
  const db = await requireDb();
  await db.update(threads).set({ ...(title ? { title } : {}), updatedAt: new Date() }).where(and(eq(threads.userId, userId), eq(threads.id, id)));
}

export async function listMessages(userId: number, threadId: string) {
  const db = await requireDb();
  return db.select().from(messages).where(and(eq(messages.userId, userId), eq(messages.threadId, threadId))).orderBy(messages.createdAt);
}

export async function addMessage(input: {
  userId: number;
  threadId: string;
  role: OrbitMessageRole;
  content: string;
  attachments?: OrbitAttachment[];
}) {
  const db = await requireDb();
  const id = nanoid(16);
  await db.insert(messages).values({ ...input, id, attachments: input.attachments ?? null });
  const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  return result[0];
}

export async function listFiles(userId: number) {
  const db = await requireDb();
  return db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.createdAt));
}

export async function saveFile(input: { userId: number; threadId?: string; name: string; storageKey: string; url: string; mimeType: string; size: number }) {
  const db = await requireDb();
  const id = nanoid(16);
  await db.insert(files).values({ ...input, id, threadId: input.threadId ?? null });
  const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return result[0];
}

export async function listMemory(userId: number, agentId?: string) {
  const db = await requireDb();
  const filter = agentId ? and(eq(memoryNotes.userId, userId), eq(memoryNotes.agentId, agentId)) : eq(memoryNotes.userId, userId);
  return db.select().from(memoryNotes).where(filter).orderBy(desc(memoryNotes.isPinned), desc(memoryNotes.createdAt));
}

export async function addMemory(input: { userId: number; agentId?: string; content: string; source?: "user" | "agent" | "chat"; isPinned?: boolean }) {
  const db = await requireDb();
  const id = nanoid(16);
  await db.insert(memoryNotes).values({ id, ...input, agentId: input.agentId ?? null, source: input.source ?? "user", isPinned: input.isPinned ?? false });
  const result = await db.select().from(memoryNotes).where(eq(memoryNotes.id, id)).limit(1);
  return result[0];
}

export async function deleteMemory(userId: number, id: string) {
  const db = await requireDb();
  await db.delete(memoryNotes).where(and(eq(memoryNotes.userId, userId), eq(memoryNotes.id, id)));
}

export async function getSettings(userId: number) {
  const db = await requireDb();
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function saveSettings(input: { userId: number; defaultModel?: string; defaultSystemPrompt?: string; behavior: "balanced" | "concise" | "detailed" }) {
  const db = await requireDb();
  await db
    .insert(userSettings)
    .values({ ...input, defaultModel: input.defaultModel ?? null, defaultSystemPrompt: input.defaultSystemPrompt ?? null })
    .onDuplicateKeyUpdate({ set: { defaultModel: input.defaultModel ?? null, defaultSystemPrompt: input.defaultSystemPrompt ?? null, behavior: input.behavior, updatedAt: new Date() } });
  return getSettings(input.userId);
}
