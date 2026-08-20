import { describe, expect, it } from "vitest";
import { buildAssistantInstructions, isImageRequest, safeFileName, titleFromMessage } from "./orbit";

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
});
