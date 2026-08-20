import { describe, expect, it } from "vitest";
import { buildAssistantInstructions, isImageRequest, ORBIT_CREATION_MODES, safeFileName, safeStorageFileName, titleFromMessage } from "./orbit";

describe("ORBIT assistant helpers", () => {
  it("builds instructions with user, agent, and scoped memory", () => {
    const prompt = buildAssistantInstructions({
      defaultPrompt: "Будь точным.",
      agentPrompt: "Проверяй источники.",
      agentName: "Исследователь",
      memoryNotes: [{ content: "Пользователь предпочитает таблицы." }],
    });
    expect(prompt).toContain("Будь точным.");
    expect(prompt).toContain("Проверяй источники.");
    expect(prompt).toContain("Пользователь предпочитает таблицы.");
    expect(prompt).toContain("Не раскрывайте внутренние рассуждения.");
  });

  it("identifies explicit image requests and returns safe file names", () => {
    expect(isImageRequest("Создай изображение ночного города", "chat")).toBe(true);
    expect(isImageRequest("Помоги составить план", "chat")).toBe(false);
    expect(isImageRequest("любой текст", "image")).toBe(true);
    expect(safeFileName("../../report:final?.pdf")).toBe("..-..-report-final-.pdf");
  });

  it("derives compact conversation titles", () => {
    expect(titleFromMessage("   Исследуй рынок AI-инструментов   ")).toBe("Исследуй рынок AI-инструментов");
    expect(titleFromMessage("a".repeat(100))).toHaveLength(70);
  });

  it("keeps the intelligence and image mode contract explicit", () => {
    expect(ORBIT_CREATION_MODES).toEqual(["chat", "image"]);
  });

  it("asks regular Intelligence chat to return copyable code rather than claim a site was published", () => {
    const instructions = buildAssistantInstructions({ memoryNotes: [] });
    expect(instructions).toContain("самодостаточный, копируемый код");
    expect(instructions).toContain("не заявляйте о публикации");
  });

  it("preserves a readable Unicode display filename while emitting an ASCII-only storage filename", () => {
    expect(safeFileName("Отчёт за август 2026.pdf")).toBe("Отчёт за август 2026.pdf");
    const storageName = safeStorageFileName("Отчёт за август 2026.pdf");
    expect(storageName).toMatch(/^[\x00-\x7F]+$/);
    expect(storageName).toContain(".pdf");
  });
});
