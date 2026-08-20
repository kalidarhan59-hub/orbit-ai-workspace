import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Plus, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";

type OrbitPageProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

export function OrbitPage({ title, eyebrow, children, action, compact = false }: OrbitPageProps) {
  const [, setLocation] = useLocation();
  return (
    <DashboardLayout>
      <div className={cn("mx-auto flex min-h-[calc(100vh-2rem)] w-full flex-col", compact ? "max-w-[1500px]" : "max-w-7xl")}>
        <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">
              <Sparkles className="size-3.5" /> {eyebrow}
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="hidden border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200 sm:flex">
              <span className="mr-1.5 size-1.5 rounded-full bg-emerald-300" /> Защищённая сессия
            </Badge>
            {action ?? (
              <Button onClick={() => setLocation("/app")} className="orbit-button bg-violet-500 text-white hover:bg-violet-400">
                <Plus className="mr-2 size-4" /> Новая беседа
              </Button>
            )}
          </div>
        </header>
        {children}
        <footer className="mt-auto flex items-center gap-2 py-5 text-xs text-slate-500">
          <ShieldCheck className="size-3.5" /> ORBIT не раскрывает секреты и отмечает действия, требующие подтверждения.
        </footer>
      </div>
    </DashboardLayout>
  );
}

export function OrbitInlineLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200">{children}</Link>;
}

export function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.06] p-6 text-center"><AlertTriangle className="mx-auto size-5 text-rose-200" /><h3 className="mt-3 font-medium text-rose-50">Не удалось загрузить данные</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-100/65">{message}</p><Button onClick={onRetry} variant="outline" className="mt-4 border-rose-300/20 bg-rose-400/[0.05] text-rose-100 hover:bg-rose-400/[0.12]"><RefreshCw className="mr-2 size-4" /> Повторить</Button></div>;
}
