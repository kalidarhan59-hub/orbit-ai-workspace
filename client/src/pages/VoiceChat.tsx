import { OrbitPage } from "@/components/OrbitPage";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { findPreferredMaleVoice, hasSpeechSynthesis, isLikelyMaleVoice, sanitizeTextForSpeech, sortSystemVoices, splitTextForSpeech, VOICE_OUTPUT_UNAVAILABLE_MESSAGE } from "@/lib/voice";
import { AudioLines, Bot, Check, ChevronDown, MessageSquareText, Mic, Radio, Settings2, Sparkles, Square, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "unsupported";
type BrowserRecognition = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void; onresult: ((event: any) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null };

export default function VoiceChat() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [liveText, setLiveText] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rate, setRate] = useState(0.98);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechRunRef = useRef(0);
  const utils = trpc.useUtils();

  const isActive = voiceState === "listening" || voiceState === "thinking" || voiceState === "speaking";
  const orderedVoices = useMemo(() => sortSystemVoices(voices), [voices]);
  const russianVoices = useMemo(() => orderedVoices.filter((voice) => voice.lang.toLowerCase().startsWith("ru")), [orderedVoices]);
  const hasMaleRussianVoice = useMemo(() => russianVoices.some(isLikelyMaleVoice), [russianVoices]);

  const ask = trpc.assistant.send.useMutation({
    onSuccess: (result) => {
      const answer = result.assistantMessage?.content?.trim() || "Я не получил текстовый ответ. Попробуйте сформулировать вопрос иначе.";
      setThreadId(result.thread.id);
      setLastAnswer(answer);
      utils.history.list.invalidate();
      speak(answer);
    },
    onError: (error) => { setVoiceState("idle"); toast.error(error.message || "Не удалось получить ответ ORBIT."); },
  });

  useEffect(() => {
    const loadVoices = () => {
      const next = window.speechSynthesis?.getVoices() ?? [];
      setVoices(next);
      if (!selectedVoice) {
        const preferred = findPreferredMaleVoice(next) || next[0];
        if (preferred) setSelectedVoice(preferred.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, [selectedVoice]);

  useEffect(() => () => stopAll(), []);

  const startAudioMeter = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const average = data.reduce((sum, value) => sum + value, 0) / Math.max(1, data.length);
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
        animationRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* Recognition can still work when the browser owns the microphone permission. */ }
  };

  const stopAudioMeter = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    setAudioLevel(0);
  };

  const speak = (text: string) => {
    if (!hasSpeechSynthesis(window)) { setVoiceState("idle"); toast.info(VOICE_OUTPUT_UNAVAILABLE_MESSAGE); return; }
    window.speechSynthesis.cancel();
    const chunks = splitTextForSpeech(text);
    if (!chunks.length) { setVoiceState("idle"); return; }
    const runId = ++speechRunRef.current;
    const voice = voices.find((item) => item.voiceURI === selectedVoice) || findPreferredMaleVoice(voices) || russianVoices[0];
    let index = 0;
    const speakNext = () => {
      if (runId !== speechRunRef.current || index >= chunks.length) { if (runId === speechRunRef.current) setVoiceState("idle"); return; }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = "ru-RU";
      utterance.rate = Math.min(1.08, Math.max(0.88, rate));
      utterance.pitch = 0.92;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => setVoiceState("speaking");
      utterance.onend = () => window.setTimeout(speakNext, 95);
      utterance.onerror = () => { if (runId === speechRunRef.current) setVoiceState("idle"); };
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  };

  const submitTranscript = (text: string) => {
    const question = text.trim();
    if (!question) { setVoiceState("idle"); toast.info("Я не услышал фразу. Попробуйте ещё раз."); return; }
    setLastQuestion(question); setLiveText(""); setVoiceState("thinking"); stopAudioMeter();
    ask.mutate({ ...(threadId ? { threadId } : {}), content: question, attachments: [], mode: "chat", modelId: "orbit-intelligence" });
  };

  const startListening = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setVoiceState("unsupported"); toast.error("В этом браузере нет распознавания речи. Используйте Chrome или Edge."); return; }
    window.speechSynthesis?.cancel();
    try {
      const recognition: BrowserRecognition = new Recognition();
      recognition.lang = "ru-RU"; recognition.interimResults = true; recognition.continuous = false;
      recognition.onresult = (event: any) => {
        let interim = ""; let finalText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) { const text = event.results[index][0]?.transcript ?? ""; if (event.results[index].isFinal) finalText += text; else interim += text; }
        setLiveText((finalText || interim).trim()); if (finalText.trim()) submitTranscript(finalText);
      };
      recognition.onerror = (event) => { stopAudioMeter(); if (event.error !== "aborted") toast.error(event.error === "not-allowed" ? "Разрешите доступ к микрофону." : "Не удалось распознать речь. Попробуйте ещё раз."); setVoiceState("idle"); };
      recognition.onend = () => { stopAudioMeter(); setVoiceState((state) => state === "listening" ? "idle" : state); };
      recognitionRef.current = recognition; setLiveText(""); setVoiceState("listening"); void startAudioMeter(); recognition.start();
    } catch { stopAudioMeter(); setVoiceState("idle"); toast.error("Не удалось начать голосовой разговор."); }
  };

  function stopAll() { recognitionRef.current?.abort(); recognitionRef.current = null; stopAudioMeter(); speechRunRef.current += 1; window.speechSynthesis?.cancel(); setVoiceState("idle"); }

  const stateCopy: Record<VoiceState, { title: string; description: string }> = {
    idle: { title: "Готов слушать", description: "Нажмите на орбиту и говорите — ORBIT ответит голосом." },
    listening: { title: "Слушаю вас…", description: liveText || "Говорите естественно. Я распознаю вашу фразу." },
    thinking: { title: "ORBIT думает…", description: "Вопрос распознан. Готовлю ответ." },
    speaking: { title: "ORBIT отвечает голосом", description: "Нажмите на орбиту или кнопку остановки, чтобы прервать ответ." },
    unsupported: { title: "Голосовой ввод недоступен", description: "Откройте ORBIT в Chrome или Edge и разрешите доступ к микрофону." },
  };

  return <OrbitPage eyebrow="Разговор в реальном времени" title="Voice Chat" action={<div className="flex items-center gap-2"><Button onClick={() => setSettingsOpen((open) => !open)} variant="outline" className="border-white/[0.12] bg-white/[0.03] text-slate-100 hover:bg-white/[0.08]" aria-label="Настройки голоса"><Settings2 className="size-4" /></Button><Button onClick={stopAll} variant="outline" disabled={!isActive} className="border-white/[0.12] bg-white/[0.03] text-slate-100 hover:bg-white/[0.08]"><Square className="mr-2 size-4" /> Остановить</Button></div>}>
    <div className="relative flex min-h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#10182a] px-5 py-8 sm:px-10 lg:py-12">
      <div className="pointer-events-none absolute -left-24 top-[-10rem] size-[28rem] rounded-full bg-violet-500/[0.10] blur-[105px]" /><div className="pointer-events-none absolute bottom-[-12rem] right-[-7rem] size-[26rem] rounded-full bg-cyan-300/[0.08] blur-[100px]" />
      {settingsOpen && <div className="absolute right-5 top-5 z-20 w-[min(21rem,calc(100%-2.5rem))] rounded-2xl border border-white/[0.1] bg-[#0d1426]/95 p-4 text-left shadow-2xl backdrop-blur-xl"><div className="flex items-center justify-between"><p className="font-medium text-white">Настройки голоса</p><button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white" aria-label="Закрыть настройки"><X className="size-4" /></button></div><label className="mt-4 block text-xs text-slate-400">Системный голос</label><select value={selectedVoice} onChange={(event) => setSelectedVoice(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[0.1] bg-[#111b30] px-3 py-2 text-sm text-white outline-none"><option value="">Автовыбор русского голоса</option>{orderedVoices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}{isLikelyMaleVoice(voice) ? " · мужской приоритет" : ""}</option>)}</select><label className="mt-4 block text-xs text-slate-400">Скорость: {rate.toFixed(2)}</label><input aria-label="Скорость речи" className="mt-2 w-full accent-violet-400" type="range" min="0.75" max="1.2" step="0.01" value={rate} onChange={(event) => setRate(Number(event.target.value))} /><p className="mt-3 text-xs leading-5 text-slate-500">Используется голос, установленный в вашем браузере или операционной системе. Внешние голосовые сервисы не подключаются.</p>{voices.length > 0 && !hasMaleRussianVoice && <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs leading-5 text-amber-100/80">Мужской русский голос не найден в системе. Используется лучший доступный русский голос. Можно установить мужской голос в настройках операционной системы.</p>}</div>}
      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center text-center">
        <button type="button" onClick={isActive ? stopAll : startListening} disabled={voiceState === "thinking"} aria-label={isActive ? "Остановить голосовой разговор" : "Начать голосовой разговор"} className={cn("voice-orbit group relative grid size-52 place-items-center rounded-full border transition-all duration-300 active:scale-95 sm:size-60", voiceState === "listening" && "border-cyan-200/80 bg-cyan-300/15 shadow-[0_0_90px_rgba(103,232,249,.35)]", voiceState === "thinking" && "border-violet-200/70 bg-violet-400/15 shadow-[0_0_90px_rgba(167,139,250,.3)]", voiceState === "speaking" && "border-emerald-200/70 bg-emerald-300/12 shadow-[0_0_90px_rgba(110,231,183,.25)]", (voiceState === "idle" || voiceState === "unsupported") && "border-violet-300/35 bg-violet-400/10 hover:border-violet-200/75 hover:bg-violet-400/16 hover:shadow-[0_0_85px_rgba(167,139,250,.28)]")} style={{ transform: `scale(${1 + (audioLevel / 100) * 0.06})` }}>{voiceState === "listening" ? <AudioLines className="size-12 text-cyan-100" /> : voiceState === "thinking" ? <Bot className="size-12 animate-pulse text-violet-100" /> : voiceState === "speaking" ? <Volume2 className="size-12 text-emerald-100" /> : <Mic className="size-12 text-violet-100 transition-transform duration-200 group-hover:scale-110" />}<span className="pointer-events-none absolute inset-4 rounded-full border border-white/[0.08]" /><span className={cn("pointer-events-none absolute -inset-5 rounded-full border border-current opacity-0", voiceState === "listening" && "animate-ping opacity-30 text-cyan-200", voiceState === "speaking" && "animate-pulse opacity-25 text-emerald-200")} /></button>
        <p className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">{stateCopy[voiceState].title}</p><p aria-live="polite" className="mt-3 max-w-lg text-sm leading-6 text-slate-400">{stateCopy[voiceState].description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-slate-400"><Radio className="size-3.5 text-cyan-300" /> Русская речь</span><span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-slate-400"><Volume2 className="size-3.5 text-emerald-300" /> Системный голос</span><span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-slate-400"><Sparkles className="size-3.5 text-violet-300" /> ORBIT Intelligence</span></div>
      </div>
      <div className="relative mx-auto grid w-full max-w-4xl gap-4 border-t border-white/[0.07] pt-6 md:grid-cols-2"><TranscriptCard icon={<MessageSquareText className="size-4 text-cyan-200" />} title="Вы сказали" content={lastQuestion || liveText || "После нажатия на орбиту ваша фраза появится здесь."} /><TranscriptCard icon={<Volume2 className="size-4 text-emerald-200" />} title="ORBIT ответил" content={lastAnswer || "Ответ будет показан текстом и одновременно озвучен."} /></div>
    </div>
  </OrbitPage>;
}

function TranscriptCard({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) { return <section className="rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-left"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{icon}{title}</div><p className="mt-3 line-clamp-4 min-h-12 text-sm leading-6 text-slate-300">{content}</p></section>; }

