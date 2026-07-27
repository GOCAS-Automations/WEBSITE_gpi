"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Lock, Mail, ArrowRight, LogOut } from "@/lib/icons";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-graphite/60 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "admin"; email: string }
  | { kind: "employee" };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "loading" });

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setStatus({
        kind: "error",
        message: "El portal aún no está conectado. Intenta más tarde.",
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setStatus({
        kind: "error",
        message:
          error?.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos."
            : (error?.message ?? "No fue posible iniciar sesión."),
      });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      // Refresca el árbol de servidor para que las cookies de sesión queden
      // disponibles antes de entrar al panel.
      router.refresh();
      setStatus({ kind: "admin", email: data.user.email ?? email.trim() });
      return;
    }

    // Empleados: la sección interna llega en la Fase 2.
    await supabase.auth.signOut();
    setStatus({ kind: "employee" });
  }

  /* ---------------- Sesión de administrador iniciada ---------------- */
  if (status.kind === "admin") {
    return (
      <div className="text-center">
        <p className="text-base font-bold text-ink">¡Bienvenido de nuevo!</p>
        <p className="mt-1.5 text-sm text-graphite">
          Sesión iniciada como{" "}
          <span className="font-semibold text-ink">{status.email}</span>
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          Ir al panel de administración
          <ArrowRight className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={async () => {
            await getBrowserSupabase()?.auth.signOut();
            router.refresh();
            setStatus({ kind: "idle" });
          }}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    );
  }

  /* ---------------- Empleado (Fase 2) ---------------- */
  if (status.kind === "employee") {
    return (
      <div className="rounded-2xl border border-brand/30 bg-brand-tint p-6 text-center">
        <p className="text-base font-bold text-ink">
          El portal de empleados estará disponible próximamente
        </p>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          Tu cuenta es válida, pero la sección de registro de horas extra todavía
          está en construcción. Te avisaremos cuando esté habilitada.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand-dark"
          >
            Volver a intentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Ir al sitio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- Formulario ---------------- */
  const loading = status.kind === "loading";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
          Correo electrónico
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite/70" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} pl-10`}
            placeholder="tucorreo@gpiprofesionales.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
          Contraseña
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite/70" />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pl-10`}
            placeholder="••••••••"
          />
        </div>
      </div>

      {status.kind === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-card disabled:pointer-events-none disabled:opacity-60"
      >
        {loading ? "Verificando…" : "Ingresar"}
        {!loading && <ArrowRight className="h-5 w-5" />}
      </button>

      <p className="text-center text-xs leading-relaxed text-graphite">
        ¿Olvidaste tu contraseña? Escríbenos y te ayudamos a restablecerla.
      </p>
    </form>
  );
}
