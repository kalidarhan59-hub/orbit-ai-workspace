export const VOICE_OUTPUT_UNAVAILABLE_MESSAGE = "Ответ показан текстом: озвучивание не поддерживается этим браузером.";

export function hasSpeechSynthesis(target: unknown): target is { speechSynthesis: { speak: (utterance: SpeechSynthesisUtterance) => void; cancel: () => void } } {
  if (!target || typeof target !== "object") return false;
  const synthesis = (target as { speechSynthesis?: unknown }).speechSynthesis as { speak?: unknown; cancel?: unknown } | undefined;
  return typeof synthesis?.speak === "function" && typeof synthesis.cancel === "function";
}
