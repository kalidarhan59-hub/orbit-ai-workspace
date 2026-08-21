import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chatSource = readFileSync(new URL("./Chat.tsx", import.meta.url), "utf8");

describe("Chat full-width layout", () => {
  it("keeps the conversation area full width without a right context aside", () => {
    expect(chatSource).toContain('className="min-h-[calc(100vh-10rem)] w-full"');
    expect(chatSource).not.toContain("<aside");
    expect(chatSource).toContain('aria-label="Прикрепить файл"');
    expect(chatSource).toContain("<ScrollArea");
  });
});
