import { OrbitPage } from "@/components/OrbitPage";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { type OrbitAttachment, type OrbitTaskMode } from "@shared/orbit";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, ChevronDown, FileAudio, FileImage, FileText, ImagePlus, Loader2, Mic, Paperclip, Plus, Send, Sparkles, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type MessageView = { id: string; role: "user" | "assistant"; content: string; attachments?: OrbitAttachment[] | null; createdAt: Date | string; pending?: boolean };

function attachmentFromFile(file: { id: string; name: string; url: string; storageKey: string; mimeType: string; size: number }): OrbitAttachment {
  return { id: file.id, name: file.name, url: file.url, key: file.storageKey, mimeType: file.mimeType, size: file.size, kind: "upload" };
}

export default function Chat() {
  const [, params] = useRoute("/app/chat/:threadId");
  const threadId = params?.threadId;
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: session, isLoading: loadingSession } = trpc.history.get.useQuery({ threadId: threadId ?? "" }, { enabled: Boolean(threadId) });
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: models } = trpc.assistant.models.useQuery();
  const { data: storedFiles } = trpc.files.list.useQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [input, setInput] = useState("");
  const [agentId, setAgentId] = useState("");
  const [modelId, setModelId] = useState("");
  const [mode, setMode] = useState<OrbitTaskMode>("chat");
  const [attachments, setAttachments] = useState<OrbitAttachment[]>([]);
  const [pending, setPending] = useState<MessageView[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.thread) {
      setAgentId(session.thread.agentId ?? "");
      setModelId(session.thread.modelId ?? "");
    }
  }, [session?.thread.id, session?.thread]);

  const upload = trpc.files.upload.useMutation();
  const transcribe = trpc.files.transcribe.useMutation();
  const send = trpc.assistant.send.useMutation({
    onSuccess: (result) => {
      setPending([]);
      utils.history.list.invalidate();
      utils.history.get.invalidate({ threadId: result.thread.id });
      if (!threadId) setLocation(`/app/chat/${result.thread.id}`);
      if (result.mode === "chat") setStreamingId(result.assistantMessage?.id ?? null);
    },
    onError: (error) => {
      setPending([]);
      toast.error(error.message || "Не удалось получить ответ.");
    },
  });

  const messages = useMemo<MessageView[]>(() => {
    const persisted = (session?.messages ?? []).map((message) => ({ ...message, attachments: message.attachments as OrbitAttachment[] | null }));
    return [...persisted, ...pending];
  }, [session?.messages, pending]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages.length, send.isPending, streamingId]);

  const uploadFile = async (file?: File): Promise<OrbitAttachment | null> => {
    if (!file) return null;
    if (file.size > 16 * 1024 * 1024) { toast.error("Файл должен быть не больше 16 МБ."); return null; }
    const accepted = /^(image\/|audio\/|video\/|text\/|application\/(pdf|json|csv))/.test(file.type);
    if (!accepted) { toast.error("Поддерживаются изображения, аудио, видео, PDF, текст, JSON и CSV."); return null; }
    try {
      const base64 = await readFile(file);
      const stored = await upload.mutateAsync({ name: file.name, mimeType: file.type, base64, ...(threadId ? { threadId } : {}) });
      return attachmentFromFile(stored);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Не удалось загрузить файл."); return null; }
  };

  const sendMessage = async (content: string, fileAttachments = attachments, forcedMode = mode) => {
    const trimmed = content.trim();
    if (!trimmed || send.isPending) return;
    const optimistic: MessageView = { id: `pending-${Date.now()}`, role: "user", content: trimmed, attachments: fileAttachments, createdAt: new Date(), pending: true };
    setPending([optimistic]);
    setInput(""); setAttachments([]); setMode("chat");
    send.mutate({ ...(threadId ? { threadId } : {}), ...(agentId ? { agentId } : {}), ...(modelId ? { modelId } : {}), content: trimmed, attachments: fileAttachments, mode: forcedMode });
  };

  const chooseFile = async (file?: File) => { const uploaded = await uploadFile(file); if (uploaded) setAttachments((items) => [...items, uploaded].slice(0, 5)); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast.error("Этот браузер не поддерживает запись аудио."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined });
      streamRef.current = stream; recorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false); setIsTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const audio = new File([blob], `голосовое-сообщение-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
          const stored = await uploadFile(audio);
          if (!stored) return;
          const transcript = await transcribe.mutateAsync({ storageKey: stored.key, language: "ru" });
          if (!transcript.text?.trim()) { toast.error("Не удалось распознать речь. Попробуйте ещё раз."); return; }
          toast.success("Речь распознана и отправлена в ORBIT.");
          await sendMessage(transcript.text, [stored], "chat");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Не удалось распознать аудио."); }
        finally { setIsTranscribing(false); }
      };
      recorder.start(); setIsRecording(true);
    } catch { toast.error("Для голосового ввода необходимо разрешение на использование микрофона."); }
  };
  const stopRecording = () => recorderRef.current?.state === "recording" && recorderRef.current.stop();

  const selectedAgent = agents?.find((agent) => agent.id === agentId);
  return <OrbitPage compact eyebrow={threadId ? "Продолжение сессии" : "Новая миссия"} title={session?.thread.title || "Chat"} action={<Button onClick={() => setLocation("/app")} className="orbit-button bg-violet-500 hover:bg-violet-400"><Plus className="mr-2 size-4" /> Новая беседа</Button>}>
    <div className="grid min-h-[640px] gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10182a]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3"><Avatar className="size-9 border border-violet-300/25 bg-violet-400/10"><img src="/manus-storage/orbit-logo-avatar_1343d925.png" alt="ORBIT" className="size-full object-cover" /><AvatarFallback className="bg-transparent text-violet-200"><Sparkles className="size-4" /></AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium">{selectedAgent?.name || "ORBIT Intelligence"}</p><p className="mt-0.5 text-xs text-slate-500">{selectedAgent ? "Специализированная роль активна" : "Встроенный интеллект готов к новой задаче"}</p></div></div>
          <div className="flex items-center gap-2"><select aria-label="Выбор агента" value={agentId} onChange={(e) => setAgentId(e.target.value)} className="orbit-select h-8 w-auto max-w-40 py-0 text-xs"><option value="">ORBIT Intelligence</option>{agents?.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select><select aria-label="Выбор модели" value={modelId} onChange={(e) => setModelId(e.target.value)} className="orbit-select h-8 w-auto max-w-44 py-0 text-xs"><option value="orbit-intelligence">ORBIT Intelligence</option><option value="">Автовыбор</option>{models?.filter((model) => model.id !== "orbit-intelligence").map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</select></div>
        </div>
        <ScrollArea ref={scrollRef} className="min-h-0 flex-1"><div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">{loadingSession ? <LoadingMessages /> : messages.length ? messages.map((message) => <MessageBubble key={message.id} message={message} stream={streamingId === message.id} onStreamDone={() => setStreamingId(null)} />) : <Welcome onPrompt={(prompt, nextMode) => { setInput(prompt); setMode(nextMode); }} />}{send.isPending && <div className="flex items-center gap-3 text-sm text-slate-400"><span className="flex size-8 items-center justify-center rounded-full bg-violet-400/10"><Loader2 className="size-4 animate-spin text-violet-200" /></span>{mode === "image" ? "ORBIT создаёт изображение…" : "ORBIT Intelligence обрабатывает контекст и готовит ответ или код…"}</div>}</div></ScrollArea>
        <div className="border-t border-white/[0.07] bg-[#0d1425] p-3 sm:p-4"><div className="mx-auto max-w-4xl"><AnimatePresence>{attachments.length > 0 && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="mb-2 flex flex-wrap gap-2">{attachments.map((file) => <AttachmentChip key={file.id || file.url} file={file} onRemove={() => setAttachments((items) => items.filter((item) => item.url !== file.url))} />)}</motion.div>}</AnimatePresence><form onSubmit={(event) => { event.preventDefault(); sendMessage(input); }} className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-2 focus-within:border-cyan-300/35 focus-within:ring-2 focus-within:ring-cyan-300/10"><Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }} placeholder={mode === "image" ? "Опишите изображение, которое хотите получить…" : "Сообщение или запрос на код для ORBIT Intelligence…"} className="min-h-20 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0" /><div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-1 pt-2"><div className="flex flex-wrap items-center gap-1"><input ref={fileInputRef} className="hidden" type="file" accept="image/*,audio/*,video/*,.pdf,.txt,.md,.json,.csv" onChange={(e) => chooseFile(e.target.files?.[0])} /><Button type="button" variant="ghost" size="icon" disabled={upload.isPending || attachments.length >= 5} onClick={() => fileInputRef.current?.click()} aria-label="Прикрепить файл" className="size-8 text-slate-400 hover:bg-white/[0.08] hover:text-white"><Paperclip className="size-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={isRecording ? stopRecording : startRecording} disabled={isTranscribing || send.isPending} aria-label={isRecording ? "Остановить запись" : "Записать голосовое сообщение"} className={cn("size-8 text-slate-400 hover:bg-white/[0.08] hover:text-white", isRecording && "bg-rose-400/15 text-rose-200 hover:bg-rose-400/20")} >{isRecording ? <Square className="size-3.5 fill-current" /> : isTranscribing ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}</Button><Button type="button" variant="ghost" onClick={() => setMode("chat")} className={cn("h-8 gap-1.5 px-2 text-xs text-slate-400 hover:bg-white/[0.08] hover:text-white", mode === "chat" && "bg-violet-400/12 text-violet-100")}><Sparkles className="size-3.5" /> Intelligence</Button><Button type="button" variant="ghost" onClick={() => setMode("image")} className={cn("h-8 gap-1.5 px-2 text-xs text-slate-400 hover:bg-white/[0.08] hover:text-white", mode === "image" && "bg-cyan-300/10 text-cyan-100")}><ImagePlus className="size-3.5" /> Изображение</Button></div><Button type="submit" size="sm" disabled={!input.trim() || send.isPending || isTranscribing} className="orbit-button h-8 bg-violet-500 px-3 text-white hover:bg-violet-400"><Send className="mr-1.5 size-3.5" /> Отправить</Button></div></form><p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-slate-500">{isRecording ? "Идёт запись — нажмите квадрат, чтобы распознать и отправить голосовое сообщение." : isTranscribing ? "ORBIT распознаёт голос и автоматически отправит текст." : "Enter — отправить · Shift + Enter — новая строка · до 5 вложений"}</p></div></div>
      </section>
      <aside className="space-y-4"><section className="rounded-2xl border border-white/[0.08] bg-[#10182a] p-5"><p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-300/80">Контекст сессии</p><h2 className="mt-2 text-lg font-semibold">{selectedAgent?.name || "ORBIT Intelligence"}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{selectedAgent?.description || "ORBIT выбирает доступный встроенный интеллект, превращает запрос в проверяемый результат, код или план и сохраняет историю работы."}</p><dl className="mt-5 space-y-3 text-xs"><InfoRow label="Модель" value={modelId || selectedAgent?.modelId || "ORBIT Intelligence"} /><InfoRow label="Память" value={selectedAgent?.memoryEnabled ? "Агентная" : "Только сессия"} /><InfoRow label="Режим" value={mode === "image" ? "Генерация изображения" : "Интеллект и код"} /></dl></section><section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Доступные файлы</p>{storedFiles?.length ? <div className="mt-4 space-y-2">{storedFiles.slice(0, 4).map((file) => <button key={file.id} onClick={() => setAttachments((items) => items.some((item) => item.id === file.id) ? items : [...items, attachmentFromFile(file)].slice(0, 5))} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"><FileIcon type={file.mimeType} /><span className="min-w-0 flex-1 truncate">{file.name}</span><Plus className="size-3" /></button>)}</div> : <p className="mt-3 text-sm leading-6 text-slate-500">Загруженные материалы появятся здесь и смогут быть добавлены в контекст одним нажатием.</p>}</section><section className="rounded-2xl border border-emerald-300/12 bg-emerald-300/[0.045] p-5"><CheckCircle2 className="size-4 text-emerald-300" /><p className="mt-3 text-sm font-medium text-emerald-100">Контроль сохранён</p><p className="mt-1 text-xs leading-5 text-emerald-100/60">Вложения и память изолированы вашей учётной записью. Модель не получает скрытые ключи.</p></section></aside>
    </div>
  </OrbitPage>;
}

function MessageBubble({ message, stream, onStreamDone }: { message: MessageView; stream: boolean; onStreamDone: () => void }) {
  const [visible, setVisible] = useState(stream ? "" : message.content);
  useEffect(() => { if (!stream) { setVisible(message.content); return; } setVisible(""); let index = 0; const timer = window.setInterval(() => { index = Math.min(message.content.length, index + Math.max(2, Math.ceil(message.content.length / 90))); setVisible(message.content.slice(0, index)); if (index >= message.content.length) { window.clearInterval(timer); onStreamDone(); } }, 22); return () => window.clearInterval(timer); }, [stream, message.content, onStreamDone]);
  const isUser = message.role === "user";
  return <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}><>{!isUser && <Avatar className="mt-1 size-8 border border-violet-300/20 bg-violet-400/10"><AvatarFallback className="bg-transparent text-violet-200"><Sparkles className="size-3.5" /></AvatarFallback></Avatar>}</><div className={cn("max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[80%]", isUser ? "bg-violet-500 text-white" : "border border-white/[0.08] bg-white/[0.035] text-slate-200")}><div className={cn("text-sm leading-6", !isUser && "prose prose-invert prose-sm max-w-none prose-p:my-0 prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/20")} >{isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <Streamdown>{visible}</Streamdown>}</div>{message.attachments?.length ? <div className="mt-3 grid gap-2">{message.attachments.map((file) => <InlineAttachment key={file.url} file={file} />)}</div> : null}{message.pending && <span className="mt-2 block text-[10px] text-violet-200/70">Сохраняем сообщение…</span>}</div>{isUser && <Avatar className="mt-1 size-8 border border-white/10 bg-white/[0.08]"><AvatarFallback className="bg-transparent text-slate-200">Вы</AvatarFallback></Avatar>}</div>;
}
function InlineAttachment({ file }: { file: OrbitAttachment }) { if (file.mimeType.startsWith("image/")) return <a href={file.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/10"><img src={file.url} alt={file.name} className="max-h-80 w-full bg-slate-950 object-cover" /></a>; return <a href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs hover:bg-white/[0.05]"><FileIcon type={file.mimeType} /><span className="min-w-0 flex-1 truncate">{file.name}</span><ChevronDown className="size-3 -rotate-90" /></a>; }
function AttachmentChip({ file, onRemove }: { file: OrbitAttachment; onRemove: () => void }) { return <span className="flex max-w-52 items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.08] px-3 py-1.5 text-xs text-cyan-100"><FileIcon type={file.mimeType} /><span className="truncate">{file.name}</span><button type="button" onClick={onRemove} aria-label={`Удалить ${file.name}`} className="text-cyan-200/70 hover:text-white"><X className="size-3.5" /></button></span>; }
function FileIcon({ type }: { type: string }) { const Icon = type.startsWith("image/") ? FileImage : type.startsWith("audio/") ? FileAudio : FileText; return <Icon className="size-3.5 shrink-0" />; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="max-w-40 truncate text-right text-slate-300">{value}</dd></div>; }
function LoadingMessages() { return <div className="space-y-4">{[1,2,3].map((item) => <div key={item} className={cn("h-16 animate-pulse rounded-2xl bg-white/[0.04]", item % 2 ? "mr-16" : "ml-16")} />)}</div>; }
function Welcome({ onPrompt }: { onPrompt: (prompt: string, mode: OrbitTaskMode) => void }) { return <div className="my-auto py-14 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-400/12 text-violet-200"><Bot className="size-5" /></span><h2 className="mt-5 text-2xl font-semibold tracking-tight">Что нужно сделать?</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">ORBIT Intelligence помогает думать, писать и объяснять код, создавать изображения и работать с вашим контекстом.</p><div className="mx-auto mt-7 grid max-w-2xl gap-2 text-left sm:grid-cols-2"><Prompt title="ORBIT Intelligence" text="Сравни, спланируй, объясни или реши задачу с учётом контекста." onClick={() => onPrompt("Сравни современные AI-инструменты для небольшой команды: возможности, ограничения и приватность.", "chat")} /><Prompt title="Разобрать документ" text="Прикрепите PDF или таблицу, затем попросите сделать выводы." onClick={() => onPrompt("Помоги выделить риски, решения и следующие шаги из приложенного документа.", "chat")} /><Prompt title="Создать изображение" text="Опишите идею — результат появится прямо в переписке." onClick={() => onPrompt("Создай минималистичную иллюстрацию для рабочего пространства AI-агентов: орбита, графитовый фон, violet и cyan акценты.", "image")} /><Prompt title="Написать код" text="Попросите HTML, CSS, React или другой код — ответ придёт в беседу." onClick={() => onPrompt("Напиши адаптивный HTML и CSS для тёмного лендинга студии AI-автоматизации.", "chat")} /></div></div>; }
function Prompt({ title, text, onClick }: { title: string; text: string; onClick: () => void }) { return <button onClick={onClick} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition-colors hover:border-violet-300/35 hover:bg-violet-400/[0.06]"><strong className="text-sm font-medium text-white">{title}</strong><span className="mt-1.5 block text-xs leading-5 text-slate-400">{text}</span></button>; }
function readFile(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Не удалось прочитать файл.")); reader.readAsDataURL(file); }); }
