import { describe, expect, it } from "vitest";
import { expandSpeechAbbreviations, findPreferredMaleVoice, hasSpeechSynthesis, sanitizeTextForSpeech, sortSystemVoices, splitTextForSpeech, VOICE_OUTPUT_UNAVAILABLE_MESSAGE } from "./voice";

describe("voice output fallback", () => {
  it("detects that a browser without speech synthesis must remain text-only", () => {
    expect(hasSpeechSynthesis(undefined)).toBe(false);
    expect(VOICE_OUTPUT_UNAVAILABLE_MESSAGE).toContain("Ответ показан текстом");
  });

  it("accepts a browser-compatible speech synthesis surface", () => {
    expect(hasSpeechSynthesis({ speechSynthesis: { speak: () => undefined, cancel: () => undefined } })).toBe(true);
  });
});

describe("browser voice selection", () => {
  const voice = (name: string, lang: string, localService = true) => ({ name, lang, localService, voiceURI: `${name}-${lang}`, default: false } as SpeechSynthesisVoice);

  it("prioritizes a likely Russian male system voice", () => {
    const female = voice("Milena", "ru-RU");
    const male = voice("Dmitry", "ru-RU");
    expect(findPreferredMaleVoice([female, male])).toBe(male);
    expect(sortSystemVoices([female, male])[0]).toBe(male);
  });

  it("falls back to the available Russian voice without claiming gender certainty", () => {
    const russian = voice("Russian System", "ru-RU");
    expect(findPreferredMaleVoice([russian])?.voiceURI).toBe(russian.voiceURI);
  });
});

describe("spoken text sanitizer", () => {
  it("splits long answers into natural speech phrases at sentence boundaries", () => {
    expect(splitTextForSpeech("Привет! Как ваши дела? Я готов помочь.")).toEqual(["Привет", "Как ваши дела", "Я готов помочь"]);
  });

  it("expands common Russian abbreviations without truncating the surrounding words", () => {
    const result = expandSpeechAbbreviations("ИИ помогает работать с API, т.е. с интерфейсом, и т.д.");
    expect(result).toContain("искусственный интеллект");
    expect(result).toContain("эй пи ай");
    expect(result).toContain("то есть");
    expect(result).toContain("так далее");
    expect(result).toContain("интерфейсом");
  });

  it("keeps full technical words while making them pronounceable", () => {
    const result = sanitizeTextForSpeech("HTML и JavaScript работают вместе с GPT.");
    expect(result).toContain("эйч ти эм эл");
    expect(result).toContain("джаваскрипт");
    expect(result).toContain("джи пи ти");
  });

  it("removes markup, punctuation symbols, urls, and code fences from spoken output", () => {
    const result = sanitizeTextForSpeech("## Ответ: готов! **Важно**, [ссылка](https://example.com) и `код`.\n```ts\nconst x = 1;\n```");
    expect(result).toContain("Ответ готов");
    expect(result).toContain("ссылка");
    expect(result).toContain("Я подготовил код");
    expect(result).not.toMatch(/[\*#`{}[\]|]/);
    expect(result).not.toContain("https://");
  });
});
