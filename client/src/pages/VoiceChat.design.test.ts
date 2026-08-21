import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./VoiceChat.tsx", import.meta.url), "utf8");

describe("Voice Chat reference-inspired design", () => {
  it("keeps the immersive visual language and accessible controls", () => {
    expect(source).toContain("quickPrompts");
    expect(source).toContain("activeVoiceName");
    expect(source).toContain("rounded-[2rem]");
    expect(source).toContain("border-violet-300/20");
    expect(source).toContain("aria-label=\"Настройки голоса\"");
    expect(source).toContain("<TranscriptCard");
  });
});
