export const VOICE_OUTPUT_UNAVAILABLE_MESSAGE = "Голосовой вывод недоступен в этом браузере. Ответ показан текстом.";

export function hasSpeechSynthesis(target: unknown): target is { speechSynthesis: { speak: (utterance: SpeechSynthesisUtterance) => void; cancel: () => void } } {
  if (!target || typeof target !== "object") return false;
  const synthesis = (target as { speechSynthesis?: unknown }).speechSynthesis as { speak?: unknown; cancel?: unknown } | undefined;
  return typeof synthesis?.speak === "function" && typeof synthesis.cancel === "function";
}

const maleVoiceHints = /male|man|муж|мужск|dmitry|dmitri|yuri|yuriy|alex|aleks|pavel|paul|artem|bogdan|mikhail|michael|google русский муж|microsoft.*(david|mark|pavel|dmitry|yuri|online.*natural)/i;
const femaleVoiceHints = /female|woman|жен|женск|milena|alena|elena|katya|irina|google.*жен|microsoft.*zira/i;

export function isLikelyMaleVoice(voice: SpeechSynthesisVoice): boolean {
  return maleVoiceHints.test(voice.name);
}

/** Returns available voices with Russian voices first and likely male voices ahead of neutral voices. */
export function sortSystemVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const language = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;
  if (language.startsWith("ru")) score += 100;
  else if (language.startsWith("uk") || language.startsWith("kk")) score += 25;
  if (maleVoiceHints.test(name)) score += 35;
  if (femaleVoiceHints.test(name)) score -= 35;
  if (voice.localService) score += 4;
  return score;
}

/** Prefer a Russian system voice that is likely male; never claims a male voice exists when it does not. */
export function findPreferredMaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return sortSystemVoices(voices).find((voice) => voice.lang.toLowerCase().startsWith("ru") && maleVoiceHints.test(voice.name))
    || sortSystemVoices(voices).find((voice) => voice.lang.toLowerCase().startsWith("ru"));
}

/** Expand common abbreviations and technical tokens before the browser voice receives text. */
export function expandSpeechAbbreviations(input: string): string {
  const boundary = (token: string, flags = "gi") => new RegExp(`(^|[^A-Za-zА-Яа-яЁё0-9])${token}(?=$|[^A-Za-zА-Яа-яЁё0-9])`, flags);
  const replacements: Array<[RegExp, string]> = [
    [boundary("т\\.\\s*д\\.?"), "$1так далее"],
    [boundary("т\\.\\s*п\\.?"), "$1тому подобное"],
    [boundary("т\\.\\s*е\\.?"), "$1то есть"],
    [boundary("т\\.\\s*к\\.?"), "$1так как"],
    [boundary("и\\.\\s*о\\.?"), "$1исполняющий обязанности"],
    [boundary("и\\s+т\\s+д"), "$1и так далее"],
    [boundary("и\\s+т\\s+п"), "$1и тому подобное"],
    [boundary("ИИ", "g"), "$1искусственный интеллект"],
    [boundary("AI"), "$1искусственный интеллект"],
    [boundary("API"), "$1эй пи ай"],
    [boundary("URL"), "$1ссылка"],
    [boundary("HTML"), "$1эйч ти эм эл"],
    [boundary("CSS"), "$1си эс эс"],
    [boundary("JavaScript"), "$1джаваскрипт"],
    [boundary("JS"), "$1джей эс"],
    [boundary("UX\\/UI"), "$1пользовательский опыт и интерфейс"],
    [boundary("PDF"), "$1пи ди эф"],
    [boundary("GPT"), "$1джи пи ти"],
    [boundary("SQL"), "$1эс кью эл"],
    [boundary("HTTPS?"), "$1протокол передачи данных"],
    [boundary("РФ", "g"), "$1Российская Федерация"],
    [boundary("США", "g"), "$1Соединённые Штаты Америки"],
  ];
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), input);
}

/** Converts an AI answer into clean spoken Russian without reading markup or punctuation aloud. */
export function splitTextForSpeech(input: string): string[] {
  return expandSpeechAbbreviations(input)
    .replace(/```[\s\S]*?```/g, " Я подготовил код, он показан на экране. ")
    .split(/(?:[.!?…]+|[\n\r]+|[;:]+)+/)
    .map((part) => sanitizeTextForSpeech(part))
    .filter((part) => part.length > 0);
}

export function sanitizeTextForSpeech(input: string): string {
  return expandSpeechAbbreviations(input)
    .replace(/```[\s\S]*?```/g, " Я подготовил код, он показан на экране. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[{}[\]<>*_#|~^=\\/]+/g, " ")
    .replace(/[.,!?;:()«»"“”„…%]+/g, " ")
    .replace(/https?:\/\/\S+/gi, " ссылку ")
    .replace(/\bhttps?\s*:\s*\/\s*\/\S+/gi, " ссылку ")
    .replace(/\s+/g, " ")
    .trim();
}
