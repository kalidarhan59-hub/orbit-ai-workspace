import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, LockKeyhole, Orbit, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Mode = "login" | "register";

export default function Auth() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { isAuthenticated, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = trpc.auth.login.useMutation();
  const register = trpc.auth.register.useMutation();
  const pending = login.isPending || register.isPending;

  useEffect(() => { if (isAuthenticated) setLocation("/app"); }, [isAuthenticated, setLocation]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "register") await register.mutateAsync({ username, password, confirmPassword });
      else await login.mutateAsync({ username, password });
      await utils.auth.me.invalidate();
      setLocation("/app");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось выполнить вход.");
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setConfirmPassword("");
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#070b16]"><span className="size-6 animate-spin rounded-full border-2 border-violet-300/25 border-t-violet-300" /></main>;

  return <main className="relative grid min-h-screen overflow-hidden bg-[#070b16] text-white lg:grid-cols-[1fr_minmax(420px,0.85fr)]">
    <div className="pointer-events-none absolute -left-32 top-[-10rem] size-[34rem] rounded-full bg-violet-500/[0.12] blur-[120px]" />
    <div className="pointer-events-none absolute bottom-[-10rem] right-[24%] size-[30rem] rounded-full bg-cyan-300/[0.08] blur-[110px]" />
    <section className="relative hidden flex-col justify-between border-r border-white/[0.07] p-10 lg:flex xl:p-16">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-300 to-cyan-300 text-[#0a1020]"><Orbit className="size-5" /></span><span className="font-semibold tracking-tight">ORBIT</span></div>
      <div className="max-w-xl"><p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-200/80">Личное рабочее пространство</p><h1 className="mt-5 text-5xl font-semibold leading-[1.04] tracking-[-0.045em]">Ваши агенты, <span className="text-violet-300">контекст</span> и результаты — в одном месте.</h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-400">Создавайте специализированных помощников, продолжайте беседы и работайте с файлами без публичного профиля или отображения e-mail.</p><div className="mt-10 grid grid-cols-3 gap-3"><Feature icon={<Sparkles />} label="Агенты" /><Feature icon={<ShieldCheck />} label="Приватный контекст" /><Feature icon={<LockKeyhole />} label="Защищённая сессия" /></div></div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">ORBIT · Private AI workspace</p>
    </section>
    <section className="relative flex items-center justify-center px-5 py-10 sm:px-8"><div className="w-full max-w-md"><div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-300 to-cyan-300 text-[#0a1020]"><Orbit className="size-5" /></span><span className="font-semibold tracking-tight">ORBIT</span></div><div className="rounded-3xl border border-white/[0.10] bg-[#10182a]/90 p-6 shadow-2xl shadow-black/25 backdrop-blur sm:p-8"><p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/80">Защищённый доступ</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">{mode === "login" ? "Войти в ORBIT" : "Создать аккаунт"}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{mode === "login" ? "Введите логин и пароль, чтобы открыть рабочее пространство." : "Укажите логин и создайте пароль для нового аккаунта."}</p><div className="mt-7 grid grid-cols-2 rounded-xl bg-black/20 p-1"><button type="button" onClick={() => switchMode("login")} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", mode === "login" ? "bg-white/[0.09] text-white" : "text-slate-500 hover:text-slate-300")}>Вход</button><button type="button" onClick={() => switchMode("register")} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", mode === "register" ? "bg-white/[0.09] text-white" : "text-slate-500 hover:text-slate-300")}>Регистрация</button></div><form onSubmit={submit} className="mt-6 space-y-5"><div className="space-y-2"><Label htmlFor="username" className="text-slate-200">Логин</Label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><Input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="например, orbit_user" className="h-11 border-white/[0.10] bg-black/15 pl-10 text-white placeholder:text-slate-600 focus-visible:border-violet-300/50" required /></div><p className="text-[11px] text-slate-500">Латинские буквы, цифры, точка, дефис и подчёркивание.</p></div><div className="space-y-2"><Label htmlFor="password" className="text-slate-200">Пароль</Label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><Input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Не менее 8 символов" className="h-11 border-white/[0.10] bg-black/15 pl-10 pr-10 text-white placeholder:text-slate-600 focus-visible:border-violet-300/50" required /><button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>{mode === "register" && <div className="space-y-2"><Label htmlFor="confirm-password" className="text-slate-200">Повторите пароль</Label><Input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Повторите пароль" className="h-11 border-white/[0.10] bg-black/15 text-white placeholder:text-slate-600 focus-visible:border-violet-300/50" required /></div>}<Button type="submit" disabled={pending || !username.trim() || !password} className="orbit-button h-11 w-full bg-violet-500 text-sm hover:bg-violet-400">{pending ? "Проверяем…" : mode === "login" ? "Войти" : "Создать аккаунт"}</Button></form><p className="mt-6 text-center text-xs leading-5 text-slate-500">Логин используется только для доступа к вашему рабочему пространству. E-mail не отображается в интерфейсе.</p></div></div></section>
  </main>;
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) { return <span className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-3 text-xs text-slate-400"><span className="mb-2 block text-cyan-200 [&>svg]:size-4">{icon}</span>{label}</span>; }
