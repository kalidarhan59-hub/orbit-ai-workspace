import { OrbitPage, QueryError } from "@/components/OrbitPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bot, BrainCircuit, Pencil, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const blank = { name: "", description: "", systemPrompt: "Вы — внимательный AI-агент. Сначала уточняйте важные ограничения, затем давайте структурированный и проверяемый результат.", modelId: "", memoryEnabled: true };

export default function Agents() {
  const utils = trpc.useUtils();
  const { data: agents, isLoading, error: agentsError, refetch: refetchAgents } = trpc.agents.list.useQuery();
  const { data: models } = trpc.assistant.models.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const selected = agents?.find((agent) => agent.id === selectedId);
  const save = trpc.agents.save.useMutation({ onSuccess: (agent) => { utils.agents.list.invalidate(); if (agent) setSelectedId(agent.id); toast.success("Конфигурация агента сохранена."); }, onError: (error) => toast.error(error.message) });
  const archive = trpc.agents.archive.useMutation({ onSuccess: () => { utils.agents.list.invalidate(); setSelectedId(null); setForm(blank); toast.success("Агент перемещён в архив."); } });
  const { data: memory, refetch: refetchMemory } = trpc.memory.list.useQuery({ agentId: selectedId ?? undefined }, { enabled: Boolean(selectedId) });
  const [note, setNote] = useState("");
  const addMemory = trpc.memory.add.useMutation({ onSuccess: () => { setNote(""); refetchMemory(); } });
  const removeMemory = trpc.memory.delete.useMutation({ onSuccess: () => refetchMemory() });

  useEffect(() => { if (selected) setForm({ name: selected.name, description: selected.description ?? "", systemPrompt: selected.systemPrompt, modelId: selected.modelId ?? "", memoryEnabled: selected.memoryEnabled }); }, [selected]);
  const create = () => { setSelectedId(null); setForm(blank); };
  const submit = () => save.mutate({ ...(selectedId ? { id: selectedId } : {}), ...form, modelId: form.modelId || undefined });

  return <OrbitPage eyebrow="Библиотека ролей" title="Агенты" action={<Button onClick={create} className="orbit-button bg-violet-500 hover:bg-violet-400"><Plus className="mr-2 size-4" /> Создать агента</Button>}>
    <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
      <section className="space-y-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm text-slate-400">Агент объединяет роль, инструкции, предпочтительную модель и отдельную память. Настройки применяются только к его беседам.</div>
        {agentsError ? <QueryError message={agentsError.message} onRetry={() => refetchAgents()} /> : isLoading ? <div className="h-36 animate-pulse rounded-2xl bg-white/[0.04]" /> : agents?.length ? agents.map((agent) => <button key={agent.id} onClick={() => setSelectedId(agent.id)} className={`w-full rounded-2xl border p-4 text-left transition-colors ${selectedId === agent.id ? "border-violet-300/45 bg-violet-400/[0.08]" : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]"}`}><div className="flex items-start justify-between gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200"><Bot className="size-4" /></span><Badge variant="secondary" className="border border-white/[0.08] bg-white/[0.04] text-[10px] text-slate-300">{agent.memoryEnabled ? "Память включена" : "Без памяти"}</Badge></div><h3 className="mt-4 font-medium text-white">{agent.name}</h3><p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-400">{agent.description || "Без описания роли"}</p><p className="mt-3 font-mono text-[10px] text-cyan-300/80">{agent.modelId || "Автовыбор модели"}</p></button>) : <EmptyAgents onCreate={create} />}
      </section>
      <section className="rounded-2xl border border-white/[0.08] bg-[#10182a] p-5 sm:p-7">
        <div className="mb-6 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.16em] text-cyan-300/80">{selectedId ? "Редактирование" : "Новый агент"}</p><h2 className="mt-1 text-xl font-semibold">{selectedId ? "Конфигурация агента" : "Создайте специализированную роль"}</h2></div>{selectedId && <Button variant="ghost" onClick={() => archive.mutate({ id: selectedId })} className="text-slate-400 hover:bg-rose-400/10 hover:text-rose-200"><Trash2 className="mr-2 size-4" /> Архивировать</Button>}</div>
        <div className="grid gap-5"><Field label="Название"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Например, Исследователь" className="orbit-input" /></Field><Field label="Краткая роль"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Находит, сравнивает и объясняет источники" className="orbit-input" /></Field><Field label="Системные инструкции"><Textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} className="orbit-input min-h-44" /></Field><Field label="Предпочтительная модель"><select value={form.modelId} onChange={(e) => setForm({ ...form, modelId: e.target.value })} className="orbit-select"><option value="">Автовыбор в настройках</option>{models?.map((model) => <option value={model.id} key={model.id}>{model.id}</option>)}</select></Field><div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><div><p className="flex items-center gap-2 text-sm font-medium"><BrainCircuit className="size-4 text-cyan-300" /> Память агента</p><p className="mt-1 text-xs leading-5 text-slate-400">Сохранённые заметки доступны в следующих беседах этого агента.</p></div><Switch checked={form.memoryEnabled} onCheckedChange={(memoryEnabled) => setForm({ ...form, memoryEnabled })} /></div><Button disabled={save.isPending || form.name.trim().length < 2 || form.systemPrompt.trim().length < 10} onClick={submit} className="orbit-button w-full bg-violet-500 py-5 hover:bg-violet-400"><Save className="mr-2 size-4" /> {save.isPending ? "Сохраняем…" : "Сохранить агента"}</Button></div>
        {selectedId && <div className="mt-8 border-t border-white/[0.07] pt-6"><h3 className="flex items-center gap-2 font-medium"><Sparkles className="size-4 text-cyan-300" /> Заметки памяти</h3><div className="mt-3 flex gap-2"><Input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && note.trim()) addMemory.mutate({ agentId: selectedId, content: note }); }} placeholder="Например, пользователь предпочитает таблицы" className="orbit-input" /><Button size="icon" disabled={!note.trim()} onClick={() => addMemory.mutate({ agentId: selectedId, content: note })}><Plus className="size-4" /></Button></div><div className="mt-3 space-y-2">{memory?.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-sm text-slate-300"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-cyan-300" /> <p className="flex-1">{item.content}</p><button onClick={() => removeMemory.mutate({ id: item.id })} aria-label="Удалить заметку" className="text-slate-500 hover:text-rose-200"><Trash2 className="size-3.5" /></button></div>) || <p className="text-sm text-slate-500">Пока нет заметок. Добавьте только информацию, которая действительно полезна в будущих сессиях.</p>}</div></div>}
      </section>
    </div>
  </OrbitPage>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-medium text-slate-200"><span>{label}</span>{children}</label>; }
function EmptyAgents({ onCreate }: { onCreate: () => void }) { return <div className="rounded-2xl border border-dashed border-white/[0.12] p-8 text-center"><Bot className="mx-auto size-7 text-slate-500" /><h3 className="mt-4 font-medium">Пока нет агентов</h3><p className="mt-2 text-sm leading-6 text-slate-400">Создайте отдельную роль для анализа, письма, кода или исследования.</p><Button onClick={onCreate} variant="outline" className="mt-5 border-white/15 bg-white/[0.03]">Создать первого агента</Button></div>; }
