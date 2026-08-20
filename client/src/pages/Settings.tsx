import { OrbitPage, QueryError } from "@/components/OrbitPage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, LockKeyhole, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Behavior = "balanced" | "concise" | "detailed";

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: settings, error: settingsError, refetch: refetchSettings } = trpc.settings.get.useQuery();
  const { data: models } = trpc.assistant.models.useQuery();
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [behavior, setBehavior] = useState<Behavior>("balanced");

  useEffect(() => {
    if (!settings) return;
    setModel(settings.defaultModel ?? "");
    setPrompt(settings.defaultSystemPrompt ?? "");
    setBehavior(settings.behavior);
  }, [settings]);

  const save = trpc.settings.save.useMutation({
    onSuccess: () => { utils.settings.get.invalidate(); toast.success("Настройки ORBIT сохранены."); },
    onError: (error) => toast.error(error.message),
  });

  return <OrbitPage eyebrow="Предпочтения и безопасность" title="Настройки" action={<Button onClick={() => save.mutate({ defaultModel: model || undefined, defaultSystemPrompt: prompt || undefined, behavior })} disabled={save.isPending} className="orbit-button bg-violet-500 hover:bg-violet-400">{save.isPending ? "Сохраняем…" : <><Check className="mr-2 size-4" /> Сохранить</>}</Button>}>
    {settingsError ? <QueryError message={settingsError.message} onRetry={() => refetchSettings()} /> : <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-white/[0.08] bg-[#10182a] p-5 sm:p-7">
        <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200"><SlidersHorizontal className="size-4" /></span><div><h2 className="font-medium">Поведение ассистента</h2><p className="text-sm text-slate-400">Значения применяются к новым беседам, если агент не задаёт более конкретное правило.</p></div></div>
        <div className="mt-7 grid gap-5">
          <label className="grid gap-2 text-sm font-medium text-slate-200"><span>Интеллект по умолчанию</span><select value={model} onChange={(e) => setModel(e.target.value)} className="orbit-select"><option value="orbit-intelligence">ORBIT Intelligence</option><option value="">Автовыбор встроенной модели</option>{models?.filter((item) => item.id !== "orbit-intelligence").map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <fieldset className="grid gap-2"><legend className="text-sm font-medium text-slate-200">Стиль ответов</legend><div className="grid gap-2 sm:grid-cols-3">{([['balanced','Сбалансированный','Структурно и без лишнего'],['concise','Краткий','Только ключевые пункты'],['detailed','Подробный','Контекст и варианты'] ] as const).map(([value,title,description]) => <button type="button" onClick={() => setBehavior(value)} key={value} className={`rounded-xl border p-3 text-left transition-colors ${behavior === value ? "border-violet-300/45 bg-violet-400/[0.08]" : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]"}`}><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span></button>)}</div></fieldset>
          <label className="grid gap-2 text-sm font-medium text-slate-200"><span>Системные инструкции по умолчанию</span><Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="orbit-input min-h-48" placeholder="Например: всегда отмечай допущения, используй русский язык, предлагай проверяемые следующие шаги." /><span className="text-xs font-normal leading-5 text-slate-500">Эти инструкции дополняют общие правила безопасности ORBIT и не передаются третьим лицам как секрет.</span></label>
        </div>
      </section>
      <aside className="space-y-5"><section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-5"><LockKeyhole className="size-5 text-cyan-200" /><h2 className="mt-5 font-medium text-cyan-50">Интеллект и ключи управляются на сервере</h2><p className="mt-2 text-sm leading-6 text-cyan-100/70">ORBIT Intelligence использует доступную интегрированную модель. В интерфейсе отображаются только реальные доступные варианты — без имитации сторонних провайдеров.</p></section><section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><h2 className="font-medium">Текущая версия</h2><dl className="mt-4 space-y-3 text-sm"><Row name="Вход" value="Логин и пароль" /><Row name="Интеллект" value="ORBIT Intelligence + доступные модели" /><Row name="Файлы" value="Защищённое объектное хранилище" /><Row name="Создание" value="Изображения и код в беседе" /><Row name="Лимиты ORBIT" value="Без счётчика сообщений и запусков" /></dl></section></aside>
    </div>}
  </OrbitPage>;
}

function Row({ name, value }: { name: string; value: string }) { return <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">{name}</dt><dd className="text-right text-slate-300">{value}</dd></div>; }
