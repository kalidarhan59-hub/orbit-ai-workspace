export const VOICE_OUTPUT_UNAVAILABLE_MESSAGE = "Голосовой вывод недоступен в этом браузере. Ответ показан текстом.";

export function hasSpeechSynthesis(target: unknown): target is { speechSynthesis: { speak: (utterance: SpeechSynthesisUtterance) => void; cancel: () => void } } {
  if (!target || typeof target !== "object") return false;
  const synthesis = (target as { speechSynthesis?: unknown }).speechSynthesis as { speak?: unknown; cancel?: unknown } | undefined;
  return typeof synthesis?.speak === "function" && typeof synthesis.cancel === "function";
}

const maleVoiceHints = /male|man|муж|мужск|dmitry|dmitri|yuri|yuriy|alex|aleks|pavel|paul|google русский муж|microsoft.*david|microsoft.*mark/i;
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

/** Converts an AI answer into clean spoken Russian without reading markup or punctuation aloud. */
export function sanitizeTextForSpeech(input: string): string {
  return input
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
