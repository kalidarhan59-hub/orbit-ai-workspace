import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateImage, listImageModels } from "./_core/imageGeneration";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "../shared/const";
import {
  addMemory,
  addMessage,
  archiveAgent,
  createThread,
  deleteMemory,
  getAgent,
  getSettings,
  getThread,
  listAgents,
  listFiles,
  listMemory,
  listMessages,
  listThreads,
  saveAgent,
  saveFile,
  saveSettings,
  touchThread,
} from "./db";
import { buildAssistantInstructions, formatAttachmentContext, isImageRequest, safeFileName, titleFromMessage } from "./orbit";
import { storageGetSignedUrl, storagePut } from "./storage";
import { createLocalAccount, getLocalAccountUser } from "./db";
import { hashPassword, localOpenId, normalizeUsername, verifyPassword } from "./localAuth";
import { sdk } from "./_core/sdk";

const usernameSchema = z.string().trim().min(3, "Логин должен содержать не менее 3 символов.").max(48).regex(/^[a-zA-Z0-9._-]+$/, "Используйте латинские буквы, цифры, точку, дефис или подчёркивание.");
const passwordSchema = z.string().min(8, "Пароль должен содержать не менее 8 символов.").max(128);

const attachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(180),
  url: z.string().min(1).max(700),
  key: z.string().max(512).optional(),
  mimeType: z.string().min(1).max(160),
  size: z.number().int().nonnegative().max(16 * 1024 * 1024).optional(),
  kind: z.enum(["upload", "generated"]).optional(),
});

const modelMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  attachments: z.array(attachmentSchema).nullable().optional(),
});

async function buildModelMessages(input: {
  history: Array<z.infer<typeof modelMessageSchema>>;
  instructions: string;
}) {
  const messagesForModel: Array<Record<string, unknown>> = [{ role: "system", content: input.instructions }];
  for (const message of input.history.slice(-16)) {
    const attachments = message.attachments ?? [];
    const parts: Array<Record<string, unknown>> = [{ type: "text", text: `${message.content}${formatAttachmentContext(attachments)}` }];
    for (const attachment of attachments) {
      if (!attachment.key || attachment.kind === "generated") continue;
      const signedUrl = await storageGetSignedUrl(attachment.key);
      if (attachment.mimeType.startsWith("image/")) {
        parts.push({ type: "image_url", image_url: { url: signedUrl, detail: "auto" } });
      } else if (/^(application\/pdf|audio\/|video\/)/.test(attachment.mimeType)) {
        parts.push({ type: "file_url", file_url: { url: signedUrl, mime_type: attachment.mimeType } });
      }
    }
    messagesForModel.push({ role: message.role, content: parts.length === 1 ? message.content + formatAttachmentContext(attachments) : parts });
  }
  return messagesForModel;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(z.object({ username: usernameSchema, password: passwordSchema, confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Пароли не совпадают." })).mutation(async ({ ctx, input }) => {
      const username = normalizeUsername(input.username);
      const user = await createLocalAccount({ username, passwordHash: await hashPassword(input.password), openId: localOpenId(username) });
      if (!user) throw new TRPCError({ code: "CONFLICT", message: "Этот логин уже занят." });
      const token = await sdk.createSessionToken(user.openId, { name: user.name || username });
      ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
      return { id: user.id, name: user.name, loginMethod: "local" as const };
    }),
    login: publicProcedure.input(z.object({ username: usernameSchema, password: passwordSchema })).mutation(async ({ ctx, input }) => {
      const account = await getLocalAccountUser(normalizeUsername(input.username));
      if (!account || !(await verifyPassword(input.password, account.account.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Неверный логин или пароль." });
      const token = await sdk.createSessionToken(account.user.openId, { name: account.user.name || account.account.username });
      ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
      return { id: account.user.id, name: account.user.name, loginMethod: "local" as const };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  assistant: router({
    models: protectedProcedure.query(async () => {
      const { data } = await listLLMModels();
      return [
        { id: "orbit-intelligence", label: "ORBIT Intelligence", provider: "ORBIT", description: "Оптимальный встроенный режим: самостоятельно выбирает доступную интегрированную модель." },
        ...data.map((model) => ({ id: model.id, label: model.id, provider: model.id.split("-")[0] ?? "AI", description: "Доступная интегрированная модель" })),
      ];
    }),
    imageModels: protectedProcedure.query(async () => (await listImageModels()).models),
    send: protectedProcedure
      .input(z.object({ threadId: z.string().optional(), agentId: z.string().optional(), modelId: z.string().optional(), content: z.string().min(1).max(12000), attachments: z.array(attachmentSchema).max(5).default([]), mode: z.enum(["chat", "image"]).default("chat") }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const existingThread = input.threadId ? await getThread(userId, input.threadId) : undefined;
        if (input.threadId && !existingThread) throw new TRPCError({ code: "NOT_FOUND", message: "Беседа не найдена или недоступна." });
        const thread = existingThread ?? (await createThread({ userId, title: titleFromMessage(input.content), agentId: input.agentId, modelId: input.modelId }));
        if (!thread) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Не удалось создать беседу." });
        const userMessage = await addMessage({ userId, threadId: thread.id, role: "user", content: input.content, attachments: input.attachments });
        await touchThread(userId, thread.id, existingThread ? undefined : titleFromMessage(input.content));

        if (isImageRequest(input.content, input.mode)) {
          try {
            const image = await generateImage({ prompt: input.content });
            if (!image.url) throw new Error("Image service returned no URL");
            const assistantMessage = await addMessage({
              userId,
              threadId: thread.id,
              role: "assistant",
              content: "Готово. Сгенерированное изображение показано ниже.",
              attachments: [{ name: "Сгенерированное изображение", url: image.url, mimeType: "image/png", kind: "generated" }],
            });
            await touchThread(userId, thread.id);
            return { thread, userMessage, assistantMessage, mode: "image" as const };
          } catch {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Не удалось сгенерировать изображение. Попробуйте уточнить запрос." });
          }
        }

        const [agent, settings, memory, history] = await Promise.all([
          input.agentId ? getAgent(userId, input.agentId) : Promise.resolve(undefined),
          getSettings(userId),
          listMemory(userId, input.agentId),
          listMessages(userId, thread.id),
        ]);
        if (input.agentId && !agent) throw new TRPCError({ code: "NOT_FOUND", message: "Агент не найден или недоступен." });
        const instructions = buildAssistantInstructions({
          defaultPrompt: settings?.defaultSystemPrompt,
          agentPrompt: agent?.systemPrompt,
          agentName: agent?.name,
          memoryNotes: agent?.memoryEnabled ? memory.slice(0, 10) : [],
        });
        const modelMessages = await buildModelMessages({ history, instructions });
        try {
          const preferredModel = input.modelId || agent?.modelId || settings?.defaultModel;
          const selectedModel = preferredModel === "orbit-intelligence" ? undefined : preferredModel;
          const response = await invokeLLM({
            ...(selectedModel ? { model: selectedModel } : {}),
            messages: modelMessages as any,
          });
          const responseContent = response.choices?.[0]?.message?.content;
          const content = typeof responseContent === "string" && responseContent.trim()
            ? responseContent.trim()
            : "Модель не вернула текстовый ответ.";
          const assistantMessage = await addMessage({ userId, threadId: thread.id, role: "assistant", content });
          await touchThread(userId, thread.id);
          return { thread, userMessage, assistantMessage, mode: "chat" as const };
        } catch (error) {
          console.error("[ORBIT] LLM response failed", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Модель временно недоступна. Сообщение сохранено, попробуйте повторить запрос." });
        }
      }),
  }),
  agents: router({
    list: protectedProcedure.query(({ ctx }) => listAgents(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) => getAgent(ctx.user.id, input.id)),
    save: protectedProcedure.input(z.object({ id: z.string().optional(), name: z.string().min(2).max(120), description: z.string().max(500).optional(), systemPrompt: z.string().min(10).max(8000), modelId: z.string().max(160).optional(), memoryEnabled: z.boolean().default(true) })).mutation(({ ctx, input }) => saveAgent({ ...input, userId: ctx.user.id })),
    archive: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => archiveAgent(ctx.user.id, input.id)),
  }),
  history: router({
    list: protectedProcedure.query(({ ctx }) => listThreads(ctx.user.id)),
    get: protectedProcedure.input(z.object({ threadId: z.string() })).query(async ({ ctx, input }) => {
      const thread = await getThread(ctx.user.id, input.threadId);
      if (!thread) throw new TRPCError({ code: "NOT_FOUND", message: "Беседа не найдена." });
      return { thread, messages: await listMessages(ctx.user.id, input.threadId) };
    }),
    create: protectedProcedure.input(z.object({ title: z.string().min(1).max(180), agentId: z.string().optional(), modelId: z.string().optional() })).mutation(({ ctx, input }) => createThread({ ...input, userId: ctx.user.id })),
  }),
  files: router({
    list: protectedProcedure.query(({ ctx }) => listFiles(ctx.user.id)),
    upload: protectedProcedure.input(z.object({ name: z.string().min(1).max(180), mimeType: z.string().min(1).max(160), base64: z.string().min(1).max(23_000_000), threadId: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const raw = input.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(raw, "base64");
      if (buffer.length === 0 || buffer.length > 16 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Файл должен быть не больше 16 МБ." });
      if (!/^(image\/|audio\/|video\/|text\/|application\/(pdf|json|csv))/.test(input.mimeType)) throw new TRPCError({ code: "UNSUPPORTED_MEDIA_TYPE", message: "Этот формат пока не поддерживается." });
      const name = safeFileName(input.name);
      const stored = await storagePut(`${ctx.user.id}/orbit/${Date.now()}-${name}`, buffer, input.mimeType);
      const file = await saveFile({ userId: ctx.user.id, threadId: input.threadId, name, storageKey: stored.key, url: stored.url, mimeType: input.mimeType, size: buffer.length });
      return { ...file, kind: "upload" as const };
    }),
    transcribe: protectedProcedure.input(z.object({ audioUrl: z.string().min(1).optional(), storageKey: z.string().min(1).optional(), language: z.string().max(12).optional() }).refine((value) => value.audioUrl || value.storageKey, { message: "Укажите аудиофайл для распознавания." })).mutation(async ({ input }) => {
      const audioUrl = input.storageKey ? await storageGetSignedUrl(input.storageKey) : input.audioUrl!;
      const result = await transcribeAudio({ audioUrl, language: input.language ?? "ru" });
      if ("error" in result) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
      return result;
    }),
  }),
  memory: router({
    list: protectedProcedure.input(z.object({ agentId: z.string().optional() })).query(({ ctx, input }) => listMemory(ctx.user.id, input.agentId)),
    add: protectedProcedure.input(z.object({ agentId: z.string().optional(), content: z.string().min(2).max(4000), isPinned: z.boolean().default(false) })).mutation(({ ctx, input }) => addMemory({ ...input, userId: ctx.user.id, source: "user" })),
    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => deleteMemory(ctx.user.id, input.id)),
  }),
  settings: router({
    get: protectedProcedure.query(({ ctx }) => getSettings(ctx.user.id)),
    save: protectedProcedure.input(z.object({ defaultModel: z.string().max(160).optional(), defaultSystemPrompt: z.string().max(8000).optional(), behavior: z.enum(["balanced", "concise", "detailed"]) })).mutation(({ ctx, input }) => saveSettings({ ...input, userId: ctx.user.id })),
  }),
});

export type AppRouter = typeof appRouter;
