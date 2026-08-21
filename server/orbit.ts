import { ORBIT_CREATION_MODES, type OrbitAttachment, type OrbitTaskMode } from "@shared/orbit";
export { ORBIT_CREATION_MODES } from "@shared/orbit";
export type { OrbitTaskMode } from "@shared/orbit";

type PromptConfig = {
  defaultPrompt?: string | null;
  agentPrompt?: string | null;
  agentName?: string | null;
  memoryNotes: Array<{ content: string }>;
};


export const MANUS_PROFILE_MODELS = {
  "manus-1.6-max": "claude-opus-4-7",
  "manus-1.6-lite": "gpt-5-mini",
} as const;

export function resolveModelId(modelId: string | undefined): string | undefined {
  if (!modelId || modelId === "orbit-intelligence") return undefined;
  return MANUS_PROFILE_MODELS[modelId as keyof typeof MANUS_PROFILE_MODELS] || modelId;
}

export function buildModelCatalog(availableIds: string[]) {
  const available = new Set(availableIds);
  const profiles = [
    available.has(MANUS_PROFILE_MODELS["manus-1.6-max"]) ? { id: "manus-1.6-max", label: "Manus 1.6 Max", provider: "Manus", description: "Максимальный профиль ORBIT на базе доступной сильной модели." } : null,
    available.has(MANUS_PROFILE_MODELS["manus-1.6-lite"]) ? { id: "manus-1.6-lite", label: "Manus 1.6 Lite", provider: "Manus", description: "Быстрый и экономичный профиль ORBIT для повседневных задач." } : null,
  ].filter((profile): profile is { id: string; label: string; provider: string; description: string } => Boolean(profile));
  return profiles;
}

export function titleFromMessage(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 72 ? `${normalized.slice(0, 69)}…` : normalized || "Новая беседа";
}

export function buildAssistantInstructions({
  defaultPrompt,
  agentPrompt,
  agentName,
  memoryNotes,
}: PromptConfig): string {
  const memory = memoryNotes.length
    ? memoryNotes.map((note, index) => `${index + 1}. ${note.content}`).join("\n")
    : "Постоянных заметок пока нет.";

  return [
    "Вы — ORBIT, надёжный AI-ассистент в рабочем пространстве пользователя.",
    "Отвечайте по-русски, если пользователь не просит другой язык. Форматируйте ответ в Markdown.",
    "Не раскрывайте внутренние рассуждения. Вместо этого кратко описывайте проверяемые действия и ограничения.",
    "Не утверждайте, что выполнили внешнее действие, если оно не подтверждено результатом инструмента.",
    "Когда пользователь просит код, HTML, CSS, React или сайт, подготовьте самодостаточный, копируемый код прямо в ответе Markdown. Кратко объясните, как его сохранить или запустить, но не заявляйте о публикации, создании файла или развёртывании без подтверждённого результата.",
    defaultPrompt?.trim() ? `Настройки пользователя:\n${defaultPrompt.trim()}` : "",
    agentPrompt?.trim()
      ? `Инструкции активного агента${agentName ? ` «${agentName}»` : ""}:\n${agentPrompt.trim()}`
      : "",
    `Разрешённая память агента:\n${memory}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function isImageRequest(content: string, mode: OrbitTaskMode) {
  if (mode === "image") return true;
  return /(^|\s)(создай|сгенерируй|нарисуй|generate|create)\s+(?:мне\s+)?(?:изображение|картинк|image|illustration)/i.test(
    content,
  );
}


export function safeFileName(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]/g, "-");
  return trimmed.slice(0, 120) || "attachment";
}

/**
 * Storage presigning accepts ASCII paths only. Keep the original readable name
 * for the user, but encode every non-safe path character deterministically.
 */
export function safeStorageFileName(name: string): string {
  const encoded = Array.from(safeFileName(name).normalize("NFKC"))
    .map((character) => /[A-Za-z0-9._-]/.test(character) ? character : `-${character.codePointAt(0)?.toString(16)}-`)
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$|\.{2,}/g, "");
  return encoded.slice(0, 180) || "attachment";
}

export function formatAttachmentContext(attachments: OrbitAttachment[]) {
  if (!attachments.length) return "";
  return `\n\nВложенные материалы пользователя:\n${attachments
    .map((file) => `- ${file.name} (${file.mimeType})`)
    .join("\n")}`;
}
