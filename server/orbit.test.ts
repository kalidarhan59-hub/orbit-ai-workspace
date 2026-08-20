import { describe, expect, it } from "vitest";
import { buildAssistantInstructions, extractHtmlArtifact, isImageRequest, ORBIT_CREATION_MODES, safeFileName, titleFromMessage } from "./orbit";

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

  it("extracts a complete website document for a generated HTML artifact", () => {
    expect(extractHtmlArtifact("Готово\n<!doctype html><html><body>ORBIT</body></html>\nИнструкция")).toBe("<!doctype html><html><body>ORBIT</body></html>");
  });

  it("keeps the intelligence, image, and website mode contract explicit", () => {
    expect(ORBIT_CREATION_MODES).toEqual(["chat", "image", "website"]);
  });
});
