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

const storage = vi.hoisted(() => ({
  storageGetSignedUrl: vi.fn(),
  storagePut: vi.fn(),
}));

const imageService = vi.hoisted(() => ({
  generateImage: vi.fn(),
  listImageModels: vi.fn(),
}));

const voiceService = vi.hoisted(() => ({ transcribeAudio: vi.fn() }));

vi.mock("./db", () => db);
vi.mock("./_core/llm", () => llm);
vi.mock("./storage", () => storage);
vi.mock("./_core/imageGeneration", () => imageService);
vi.mock("./_core/voiceTranscription", () => voiceService);

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

  it("offers ORBIT Intelligence as a truthful auto-routing mode alongside available models", async () => {
    llm.listLLMModels.mockResolvedValue({ data: [{ id: "integrated-model" }] });

    const models = await appRouter.createCaller(userContext(1)).assistant.models();

    expect(models[0]).toMatchObject({ id: "orbit-intelligence", label: "ORBIT Intelligence", provider: "ORBIT" });
    expect(models).toContainEqual(expect.objectContaining({ id: "integrated-model" }));
  });

  it("keeps generated images inline in the assistant conversation", async () => {
    const thread = { id: "thread-image", userId: 1, agentId: null, title: "Изображение", modelId: null, createdAt: new Date(), updatedAt: new Date() };
    db.createThread.mockResolvedValue(thread);
    db.addMessage
      .mockResolvedValueOnce({ id: "message-user", threadId: thread.id, userId: 1, role: "user", content: "Создай изображение", attachments: null, createdAt: new Date() })
      .mockResolvedValueOnce({ id: "message-image", threadId: thread.id, userId: 1, role: "assistant", content: "Готово", attachments: [], createdAt: new Date() });
    imageService.generateImage.mockResolvedValue({ url: "https://storage.example/orbit-image.png" });

    const result = await appRouter.createCaller(userContext(1)).assistant.send({ content: "Создай изображение", attachments: [], mode: "image" });

    expect(imageService.generateImage).toHaveBeenCalledWith({ prompt: "Создай изображение" });
    expect(db.addMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({ attachments: [expect.objectContaining({ kind: "generated", mimeType: "image/png" })] }));
    expect(result.mode).toBe("image");
  });

  it("passes the current user through agent save/archive and history creation", async () => {
    db.saveAgent.mockResolvedValue({ id: "agent-1", userId: 1, name: "Researcher" });
    db.createThread.mockResolvedValue({ id: "thread-2", userId: 1, title: "Research" });
    const caller = appRouter.createCaller(userContext(1));

    await caller.agents.save({ name: "Researcher", systemPrompt: "Проверяй источники и формируй краткие выводы.", memoryEnabled: true });
    await caller.agents.archive({ id: "agent-1" });
    await caller.history.create({ title: "Research" });

    expect(db.saveAgent).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, name: "Researcher" }));
    expect(db.archiveAgent).toHaveBeenCalledWith(1, "agent-1");
    expect(db.createThread).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, title: "Research" }));
  });

  it("stores a safe user-scoped attachment and transcribes its signed URL", async () => {
    storage.storagePut.mockResolvedValue({ key: "1/orbit/note.txt", url: "https://storage.example/note.txt" });
    db.saveFile.mockResolvedValue({ id: "file-1", userId: 1, name: "note.txt", storageKey: "1/orbit/note.txt", url: "https://storage.example/note.txt", mimeType: "text/plain", size: 2 });
    storage.storageGetSignedUrl.mockResolvedValue("https://signed.example/audio.webm");
    voiceService.transcribeAudio.mockResolvedValue({ text: "Проверенный текст" });
    const caller = appRouter.createCaller(userContext(1));

    await caller.files.upload({ name: "Заметка.txt", mimeType: "text/plain", base64: "data:text/plain;base64,SGk=" });
    const transcript = await caller.files.transcribe({ storageKey: "1/orbit/audio.webm", language: "ru" });

    expect(storage.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^1\/orbit\/\d+-[\x00-\x7F]+$/), expect.any(Buffer), "text/plain");
    expect(db.saveFile).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, name: "Заметка.txt", size: 2 }));
    expect(voiceService.transcribeAudio).toHaveBeenCalledWith({ audioUrl: "https://signed.example/audio.webm", language: "ru" });
    expect(transcript).toEqual({ text: "Проверенный текст" });
  });

  it("uses a storage-key signed URL for WebM audio and converts a provider failure into an actionable transcription error", async () => {
    storage.storageGetSignedUrl.mockResolvedValue("https://signed.example/recording.webm");
    voiceService.transcribeAudio.mockResolvedValue({ error: "Transcription service request failed", code: "TRANSCRIPTION_FAILED", details: "502 upstream" });

    await expect(appRouter.createCaller(userContext(1)).files.transcribe({ storageKey: "1/orbit/recording.webm", language: "ru" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Не удалось распознать голосовую запись. Попробуйте сказать фразу ещё раз или загрузите аудио в формате webm, mp3, wav, ogg или m4a." });
    expect(storage.storageGetSignedUrl).toHaveBeenCalledWith("1/orbit/recording.webm");
    expect(voiceService.transcribeAudio).toHaveBeenCalledWith({ audioUrl: "https://signed.example/recording.webm", language: "ru" });
  });
});
