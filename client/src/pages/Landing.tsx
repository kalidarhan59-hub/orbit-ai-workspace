import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startLogin } from "@/const";
import { ArrowRight, Bot, CheckCircle2, FileText, Image, Mic, Orbit, ShieldCheck, Workflow } from "lucide-react";
import { Link, useLocation } from "wouter";

const cycle = [
  ["01", "Понять", "Соберите задачу, материалы и необходимые ограничения в одном запросе."],
  ["02", "Спланировать", "Превратите намерение в понятную последовательность проверяемых действий."],
  ["03", "Выполнить", "Выберите агента и модель, сохраните контекст и управляйте ходом работы."],
  ["04", "Проверить", "Зафиксируйте результаты, ограничения и следующие шаги в читаемом журнале."],
  ["05", "Сохранить", "Вернитесь к сессии, файлам и памяти агента в любое время."],
];

export default function Landing() {
  const [, setLocation] = useLocation();
  return (
    <main className="min-h-screen overflow-hidden bg-[#070b16] text-white selection:bg-violet-500/50">
      <div className="orbit-grid pointer-events-none fixed inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-5 sm:px-8">
        <nav className="flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-cyan-300 text-slate-950"><Orbit className="size-4" /></span>
            ORBIT
          </Link>
          <Button variant="ghost" onClick={() => startLogin()} className="text-slate-300 hover:bg-white/[0.06] hover:text-white">Войти</Button>
        </nav>

        <section className="grid min-h-[610px] items-center gap-14 pb-16 pt-16 lg:grid-cols-[1.04fr_0.96fr] lg:pt-20">
          <div className="relative z-10">
            <Badge className="mb-7 border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">Рабочее пространство для контролируемого AI</Badge>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">От идеи до результата — <span className="text-violet-300">в одном AI Workspace</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">Опишите задачу. ORBIT сохранит контекст, поможет выбрать специализированного агента и покажет результат в виде структурированного диалога, файлов и проверяемых заметок.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button onClick={() => startLogin()} size="lg" className="orbit-button bg-violet-500 px-6 text-white hover:bg-violet-400">Открыть рабочее пространство <ArrowRight className="ml-2 size-4" /></Button>
              <Button onClick={() => setLocation("/app")} size="lg" variant="outline" className="border-white/15 bg-white/[0.03] px-6 text-slate-100 hover:bg-white/[0.08] hover:text-white">Посмотреть демонстрацию</Button>
            </div>
            <div className="mt-11 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-300" /> Агентная память</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-300" /> Файлы в контексте</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-300" /> Голос и изображения</span>
            </div>
          </div>

          <div className="orbit-shadow relative mx-auto w-full max-w-[570px] rounded-[28px] border border-white/[0.10] bg-[#111827]/90 p-3 backdrop-blur-xl">
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#0b1020] px-4 py-3">
              <div className="flex items-center gap-2.5"><span className="size-2 rounded-full bg-emerald-300" /><span className="text-sm font-medium">Центр управления</span></div>
              <span className="rounded-full bg-violet-400/15 px-2.5 py-1 text-[10px] font-medium text-violet-200">DEMO RUN</span>
            </div>
            <div className="mt-3 grid grid-cols-[118px_1fr] gap-3">
              <aside className="rounded-2xl border border-white/[0.06] bg-[#0b1020] p-3 text-[10px] text-slate-400">
                <div className="mb-5 flex items-center gap-2 text-xs font-medium text-white"><Bot className="size-3.5 text-violet-300" /> ORBIT</div>
                {['Чат', 'Агенты', 'История', 'Файлы', 'Настройки'].map((label, index) => <div key={label} className={`mb-2 rounded-lg px-2 py-2 ${index === 0 ? 'bg-violet-400/15 text-violet-100' : ''}`}>{label}</div>)}
              </aside>
              <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-[#0b1020] p-4">
                <div><p className="text-[11px] text-slate-500">Миссия</p><p className="mt-1 text-sm font-medium text-white">Исследование рынка AI-инструментов</p></div>
                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3"><p className="text-[11px] text-cyan-100">План сформирован</p><div className="mt-2 space-y-1.5 text-[10px] text-slate-300"><p>✓ Определить критерии</p><p>• Сравнить варианты</p><p>• Проверить ограничения</p></div></div>
                <div className="grid grid-cols-3 gap-2"><MiniAgent label="План" color="bg-violet-300" /><MiniAgent label="Анализ" color="bg-cyan-300" /><MiniAgent label="Проверка" color="bg-emerald-300" /></div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[10px] text-slate-400">Ответ готовится с сохранением контекста…</div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.08] py-16">
          <div className="mb-9 max-w-xl"><p className="text-sm font-medium text-cyan-300">Один запрос — полный рабочий цикл</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Не только ответ, а организованная работа.</h2></div>
          <div className="grid gap-3 md:grid-cols-5">{cycle.map(([number, title, description]) => <article key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-violet-300/30"><span className="font-mono text-xs text-violet-300">{number}</span><h3 className="mt-6 text-base font-medium">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></article>)}</div>
        </section>

        <section className="grid gap-4 pb-12 md:grid-cols-3">
          <Feature icon={Bot} title="Специализированные агенты" text="Определяйте роль, системные инструкции, модель и память отдельно для каждого помощника." />
          <Feature icon={Mic} title="Богатый контекст" text="Отправляйте текст, документы, изображения или голос; транскрипция может сразу запускать запрос." />
          <Feature icon={ShieldCheck} title="Контроль данных" text="Сессии, заметки и файлы изолированы пользователем; ключи и интеграции не показываются в чате." />
        </section>
      </div>
    </main>
  );
}

function MiniAgent({ label, color }: { label: string; color: string }) { return <div className="rounded-lg border border-white/[0.06] p-2"><span className={`mb-2 block size-1.5 rounded-full ${color}`} /><p className="text-[9px] text-slate-300">{label}</p></div>; }
function Feature({ icon: Icon, title, text }: { icon: typeof Bot; title: string; text: string }) { return <article className="rounded-2xl border border-white/[0.08] bg-[#0d1324] p-6"><Icon className="size-5 text-cyan-300" /><h3 className="mt-8 text-lg font-medium">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></article>; }
