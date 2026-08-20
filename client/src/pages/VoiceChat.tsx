import { OrbitPage } from "@/components/OrbitPage";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { hasSpeechSynthesis, VOICE_OUTPUT_UNAVAILABLE_MESSAGE } from "@/lib/voice";
import { AudioLines, Bot, MessageSquareText, Mic, MicOff, Radio, Sparkles, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "unsupported";
type BrowserRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export default function VoiceChat() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [liveText, setLiveText] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const utils = trpc.useUtils();

  const ask = trpc.assistant.send.useMutation({
    onSuccess: (result) => {
      const answer = result.assistantMessage?.content?.trim() || "Я не получил текстовый ответ. Попробуйте сформулировать вопрос иначе.";
      setThreadId(result.thread.id);
      setLastAnswer(answer);
      utils.history.list.invalidate();
      speak(answer);
    },
    onError: (error) => {
      setVoiceState("idle");
      toast.error(error.message || "Не удалось получить ответ ORBIT.");
    },
  });

  useEffect(() => () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const speak = (text: string) => {
    if (!hasSpeechSynthesis(window)) {
      setVoiceState("idle");
      toast.info(VOICE_OUTPUT_UNAVAILABLE_MESSAGE);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ru-RU";
    utterance.rate = 0.98;
    utterance.pitch = 1;
    const russianVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ru"));
    if (russianVoice) utterance.voice = russianVoice;
    utterance.onstart = () => setVoiceState("speaking");
    utterance.onend = () => setVoiceState("idle");
    utterance.onerror = () => setVoiceState("idle");
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const submitTranscript = (text: string) => {
    const question = text.trim();
    if (!question) {
      setVoiceState("idle");
      toast.info("Я не услышал фразу. Нажмите на орбиту и попробуйте ещё раз.");
      return;
    }
    setLastQuestion(question);
    setLiveText("");
    setVoiceState("thinking");
    ask.mutate({ ...(threadId ? { threadId } : {}), content: question, attachments: [], mode: "chat", modelId: "orbit-intelligence" });
  };

  const startListening = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceState("unsupported");
      toast.error("В этом браузере нет распознавания речи. Используйте Chrome или Edge либо отправьте запрос текстом.");
      return;
    }
    window.speechSynthesis?.cancel();
    try {
      const recognition: BrowserRecognition = new Recognition();
      recognition.lang = "ru-RU";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (event: any) => {
        let interim = "";
        let finalText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const text = event.results[index][0]?.transcript ?? "";
          if (event.results[index].isFinal) finalText += text;
          else interim += text;
        }
        setLiveText((finalText || interim).trim());
        if (finalText.trim()) submitTranscript(finalText);
      };
      recognition.onerror = (event) => {
        if (event.error !== "aborted") toast.error(event.error === "not-allowed" ? "Разрешите доступ к микрофону, чтобы начать разговор." : "Не удалось распознать речь. Попробуйте ещё раз.");
        setVoiceState("idle");
      };
      recognition.onend = () => setVoiceState((state) => state === "listening" ? "idle" : state);
      recognitionRef.current = recognition;
      setLiveText("");
      setVoiceState("listening");
      recognition.start();
    } catch {
      setVoiceState("idle");
      toast.error("Не удалось начать голосовой разговор.");
    }
  };

  const stopAll = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setVoiceState("idle");
  };

  const isActive = voiceState === "listening" || voiceState === "thinking" || voiceState === "speaking";
  const stateCopy: Record<VoiceState, { title: string; description: string }> = {
    idle: { title: "Нажмите на орбиту, чтобы начать", description: "Скажите вопрос — ORBIT распознает речь, ответит и озвучит результат." },
    listening: { title: "Слушаю вас…", description: liveText || "Говорите естественно. По завершении фразы ORBIT начнёт отвечать." },
    thinking: { title: "ORBIT думает…", description: "Вопрос распознан. Я готовлю структурированный ответ." },
    speaking: { title: "ORBIT отвечает голосом", description: "Вы можете остановить озвучивание в любой момент." },
    unsupported: { title: "Голосовой ввод недоступен", description: "Для разговора откройте ORBIT в Chrome или Edge и разрешите доступ к микрофону." },
  };

  return <OrbitPage eyebrow="Разговор в реальном времени" title="Voice Chat" action={<Button onClick={stopAll} variant="outline" disabled={!isActive} className="border-white/[0.12] bg-white/[0.03] text-slate-100 hover:bg-white/[0.08]"><Square className="mr-2 size-4" /> Остановить</Button>}>
    <div className="relative flex min-h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#10182a] px-5 py-8 sm:px-10 lg:py-12">
      <div className="pointer-events-none absolute -left-24 top-[-10rem] size-[28rem] rounded-full bg-violet-500/[0.10] blur-[105px]" />
      <div className="pointer-events-none absolute bottom-[-12rem] right-[-7rem] size-[26rem] rounded-full bg-cyan-300/[0.08] blur-[100px]" />
      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center text-center">
        <button type="button" onClick={isActive ? stopAll : startListening} disabled={voiceState === "thinking"} aria-label={isActive ? "Остановить голосовой разговор" : "Начать голосовой разговор"} className={cn("voice-orbit group relative grid size-48 place-items-center rounded-full border transition-all duration-300 sm:size-56", voiceState === "listening" && "border-cyan-200/80 bg-cyan-300/15 shadow-[0_0_90px_rgba(103,232,249,.35)]", voiceState === "thinking" && "border-violet-200/70 bg-violet-400/15 shadow-[0_0_90px_rgba(167,139,250,.3)]", voiceState === "speaking" && "border-emerald-200/70 bg-emerald-300/12 shadow-[0_0_90px_rgba(110,231,183,.25)]", (voiceState === "idle" || voiceState === "unsupported") && "border-violet-300/35 bg-violet-400/10 hover:border-violet-200/75 hover:bg-violet-400/16 hover:shadow-[0_0_85px_rgba(167,139,250,.28)]")}>{voiceState === "listening" ? <AudioLines className="size-12 text-cyan-100" /> : voiceState === "thinking" ? <Bot className="size-12 animate-pulse text-violet-100" /> : voiceState === "speaking" ? <Volume2 className="size-12 text-emerald-100" /> : <Mic className="size-12 text-violet-100 transition-transform duration-200 group-hover:scale-110" />}<span className="pointer-events-none absolute inset-4 rounded-full border border-white/[0.08]" /><span className={cn("pointer-events-none absolute -inset-5 rounded-full border border-current opacity-0", voiceState === "listening" && "animate-ping opacity-30 text-cyan-200", voiceState === "speaking" && "animate-pulse opacity-25 text-emerald-200")} /></button>
        <p className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">{stateCopy[voiceState].title}</p><p aria-live="polite" className="mt-3 max-w-lg text-sm leading-6 text-slate-400">{stateCopy[voiceState].description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-slate-400"><Radio className="size-3.5 text-cyan-300" /> Русская речь</span><span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-slate-400"><Volume2 className="size-3.5 text-emerald-300" /> Голосовой ответ</span><span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-slate-400"><Sparkles className="size-3.5 text-violet-300" /> ORBIT Intelligence</span></div>
      </div>
      <div className="relative mx-auto grid w-full max-w-4xl gap-4 border-t border-white/[0.07] pt-6 md:grid-cols-2"><TranscriptCard icon={<MessageSquareText className="size-4 text-cyan-200" />} title="Вы сказали" content={lastQuestion || liveText || "После нажатия на орбиту ваша фраза появится здесь."} /><TranscriptCard icon={<Volume2 className="size-4 text-emerald-200" />} title="ORBIT ответил" content={lastAnswer || "Ответ будет показан текстом и одновременно озвучен."} /></div>
    </div>
  </OrbitPage>;
}

function TranscriptCard({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) { return <section className="rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-left"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{icon}{title}</div><p className="mt-3 line-clamp-4 min-h-12 text-sm leading-6 text-slate-300">{content}</p></section>; }
