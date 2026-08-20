import { ORBIT_CREATION_MODES, type OrbitAttachment, type OrbitTaskMode } from "@shared/orbit";
export { ORBIT_CREATION_MODES } from "@shared/orbit";
export type { OrbitTaskMode } from "@shared/orbit";

type PromptConfig = {
  defaultPrompt?: string | null;
  agentPrompt?: string | null;
  agentName?: string | null;
  memoryNotes: Array<{ content: string }>;
};


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

export function buildWebsiteInstructions(baseInstructions: string) {
  return [
    baseInstructions,
    "Режим создания сайта: подготовьте один автономный, адаптивный HTML-документ для запроса пользователя.",
    "Верните полный документ от <!doctype html> до </html> без Markdown-ограждений. Включайте стили и небольшой JavaScript только внутри документа.",
    "Не добавляйте внешние ключи, фиктивные отзывы, платёжные формы или утверждения о публикации. После HTML кратко укажите, как открыть сохранённый файл.",
  ].join("\n\n");
}

export function extractHtmlArtifact(content: string) {
  const match = content.match(/<!doctype html[\s\S]*?<\/html>/i) ?? content.match(/<html[\s\S]*?<\/html>/i);
  return match?.[0] ?? null;
}

export function safeFileName(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]/g, "-");
  return trimmed.slice(0, 120) || "attachment";
}

export function formatAttachmentContext(attachments: OrbitAttachment[]) {
  if (!attachments.length) return "";
  return `\n\nВложенные материалы пользователя:\n${attachments
    .map((file) => `- ${file.name} (${file.mimeType})`)
    .join("\n")}`;
}
