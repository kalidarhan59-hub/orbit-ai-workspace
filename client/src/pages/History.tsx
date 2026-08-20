import { OrbitPage, QueryError } from "@/components/OrbitPage";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Clock3, MessageSquareText, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function History() {
  const { data: threads, isLoading, error, refetch } = trpc.history.list.useQuery();
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const filtered = useMemo(() => threads?.filter((thread) => thread.title.toLowerCase().includes(query.toLowerCase())) ?? [], [threads, query]);
  return <OrbitPage eyebrow="Продолжайте с контекстом" title="История" action={undefined}>
    <section className="rounded-2xl border border-white/[0.08] bg-[#10182a]">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-medium">Беседы и рабочие сессии</h2><p className="mt-1 text-sm text-slate-400">Откройте сессию, чтобы продолжить её с теми же сообщениями и вложениями.</p></div><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по истории" className="orbit-input w-full pl-9 sm:w-64" /></label></div>
      <div className="divide-y divide-white/[0.06]">{error ? <div className="p-5"><QueryError message={error.message} onRetry={() => refetch()} /></div> : isLoading ? <div className="space-y-3 p-5">{[1,2,3].map((key) => <div key={key} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />)}</div> : filtered.length ? filtered.map((thread) => <button key={thread.id} onClick={() => setLocation(`/app/chat/${thread.id}`)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.035]"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/12 text-violet-200"><MessageSquareText className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate font-medium text-white">{thread.title}</span><span className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="size-3" /> Обновлено {new Date(thread.updatedAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}</span></span><Badge className="hidden border border-cyan-300/12 bg-cyan-300/[0.06] text-[10px] text-cyan-100 sm:block">{thread.modelId || "Автовыбор"}</Badge></button>) : <div className="px-5 py-16 text-center"><Sparkles className="mx-auto size-7 text-slate-500" /><h3 className="mt-4 font-medium">{query ? "Ничего не найдено" : "История пока пуста"}</h3><p className="mt-2 text-sm text-slate-400">{query ? "Попробуйте другое слово из названия беседы." : "Первая беседа появится здесь после отправки запроса."}</p></div>}</div>
    </section>
  </OrbitPage>;
}
