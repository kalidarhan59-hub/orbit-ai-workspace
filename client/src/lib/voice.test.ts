import { describe, expect, it } from "vitest";
import { hasSpeechSynthesis, VOICE_OUTPUT_UNAVAILABLE_MESSAGE } from "./voice";

describe("voice output fallback", () => {
  it("detects that a browser without speech synthesis must remain text-only", () => {
    expect(hasSpeechSynthesis(undefined)).toBe(false);
    expect(VOICE_OUTPUT_UNAVAILABLE_MESSAGE).toContain("Ответ показан текстом");
  });

  it("accepts a browser-compatible speech synthesis surface", () => {
    expect(hasSpeechSynthesis({ speechSynthesis: { speak: () => undefined, cancel: () => undefined } })).toBe(true);
  });
});
