import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  addMemory: vi.fn(),
  addMessage: vi.fn(),
  archiveAgent: vi.fn(),
  createThread: vi.fn(),
  deleteMemory: vi.fn(),
  getAgent: vi.fn(),
  getSettings: vi.fn(),
  getThread: vi.fn(),
  listAgents: vi.fn(),
  listFiles: vi.fn(),
  listMemory: vi.fn(),
  listMessages: vi.fn(),
  listThreads: vi.fn(),
  saveAgent: vi.fn(),
  saveFile: vi.fn(),
  saveSettings: vi.fn(),
  touchThread: vi.fn(),
}));

const llm = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
}));

vi.mock("./db", () => db);
vi.mock("./_core/llm", () => llm);

import { appRouter } from "./routers";

function userContext(id: number): TrpcContext {
  return {
    user: {
      id,
      openId: `user-${id}`,
      email: `user-${id}@example.com`,
      name: `User ${id}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("ORBIT protected procedure behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getSettings.mockResolvedValue(null);
    db.listMemory.mockResolvedValue([]);
    db.listMessages.mockResolvedValue([]);
    db.touchThread.mockResolvedValue(undefined);
    llm.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "Готовый ответ **ORBIT**." } }] });
  });

  it("creates messages and invokes the model only in the authenticated user's thread", async () => {
    const thread = { id: "thread-1", userId: 1, agentId: null, title: "Новая задача", modelId: null, createdAt: new Date(), updatedAt: new Date() };
    db.createThread.mockResolvedValue(thread);
    db.addMessage
      .mockResolvedValueOnce({ id: "message-user", threadId: thread.id, userId: 1, role: "user", content: "Помоги с планом", attachments: null, createdAt: new Date() })
      .mockResolvedValueOnce({ id: "message-assistant", threadId: thread.id, userId: 1, role: "assistant", content: "Готовый ответ **ORBIT**.", attachments: null, createdAt: new Date() });

    const result = await appRouter.createCaller(userContext(1)).assistant.send({ content: "Помоги с планом", attachments: [], mode: "chat" });

    expect(db.createThread).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }));
    expect(db.addMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({ userId: 1, threadId: thread.id, role: "user" }));
    expect(db.addMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({ userId: 1, threadId: thread.id, role: "assistant" }));
    expect(llm.invokeLLM).toHaveBeenCalledTimes(1);
    expect(result.assistantMessage?.content).toContain("ORBIT");
  });

  it("passes the current user ID to every user-scoped read procedure", async () => {
    db.listThreads.mockResolvedValue([]);
    db.listFiles.mockResolvedValue([]);
    db.listMemory.mockResolvedValue([]);
    db.getSettings.mockResolvedValue(null);

    const caller = appRouter.createCaller(userContext(2));
    await caller.history.list();
    await caller.files.list();
    await caller.memory.list({});
    await caller.settings.get();

    expect(db.listThreads).toHaveBeenCalledWith(2);
    expect(db.listFiles).toHaveBeenCalledWith(2);
    expect(db.listMemory).toHaveBeenCalledWith(2, undefined);
    expect(db.getSettings).toHaveBeenCalledWith(2);
  });

  it("does not expose a thread owned by a different user", async () => {
    db.getThread.mockImplementation(async (userId: number, id: string) => userId === 1 && id === "thread-1" ? { id, userId, title: "Private" } : undefined);

    await expect(appRouter.createCaller(userContext(2)).history.get({ threadId: "thread-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.getThread).toHaveBeenCalledWith(2, "thread-1");
  });
});
