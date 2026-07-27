import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionProfile } from "@/lib/supabase/auth";
import { signOutAction } from "@/lib/session-actions";
import { LoginForm } from "./LoginForm";
import { Info, Lock, ArrowRight, LogOut } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Mi Cuenta GPI",
  description: "Acceso al portal privado de GPI.",
  robots: { index: false, follow: false },
};

export default async function MiCuentaPage() {
  const configured = isSupabaseConfigured();
  const session = configured ? await getSessionProfile() : null;

  return (
    <section className="relative isolate overflow-hidden bg-mist py-14 sm:py-20">
      <div
        className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-brand-light/10 blur-3xl"
        aria-hidden="true"
      />

      <Container size="narrow" className="relative">
        {/* Navegación: volver al sitio público */}
        <div className="mx-auto mb-6 max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft shadow-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            <span aria-hidden="true">←</span>
            Volver al sitio
          </Link>
        </div>

        <div className="mx-auto max-w-md">
          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
            {/* Cabecera de marca */}
            <div className="relative isolate overflow-hidden bg-ink px-8 py-9 text-center">
              <div className="bg-dot-grid absolute inset-0 opacity-30" aria-hidden="true" />
              <div className="relative">
                <Image
                  src="/images/logo2.png"
                  alt="GPI"
                  width={137}
                  height={69}
                  className="mx-auto h-12 w-auto"
                />
                <h1 className="mt-5 text-2xl font-extrabold text-white">
                  Mi Cuenta <span className="text-brand-light">GPI</span>
                </h1>
                <p className="mt-2 text-sm text-white/70">
                  Portal privado para el equipo de GPI.
                </p>
              </div>
            </div>

            <div className="p-7 sm:p-8">
              {!configured && <NotConfigured />}

              {configured && session && session.profile.role === "admin" && (
                <ActiveAdminSession email={session.profile.email} />
              )}

              {configured && session && session.profile.role !== "admin" && (
                <EmployeeSession email={session.profile.email} />
              )}

              {configured && !session && <LoginForm />}
            </div>
          </div>

          <p className="mt-6 flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-graphite">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              El acceso es exclusivo para personal autorizado de GPI. Si tienes
              problemas para ingresar, comunícate con el administrador.
            </span>
          </p>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function NotConfigured() {
  return (
    <div className="text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint text-brand-dark">
        <Lock className="h-7 w-7" />
      </span>
      <p className="mt-5 text-lg font-bold text-ink">
        El portal estará disponible próximamente
      </p>
      <p className="mt-2 text-sm leading-relaxed text-graphite">
        Estamos terminando de configurar el acceso privado de GPI. Muy pronto
        podrás ingresar con tus credenciales para administrar el contenido del
        sitio.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          <span aria-hidden="true">←</span>
          Volver al sitio
        </Link>
        <Link
          href="/contacto"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          Contactar a GPI
        </Link>
      </div>
    </div>
  );
}

function ActiveAdminSession({ email }: { email: string }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold text-ink">Tu sesión sigue activa</p>
      <p className="mt-1.5 text-sm text-graphite">
        Ingresaste como <span className="font-semibold text-ink">{email}</span>
      </p>
      <Link
        href="/admin"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark"
      >
        Ir al panel de administración
        <ArrowRight className="h-5 w-5" />
      </Link>
      <form action={signOutAction} className="mt-3">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

function EmployeeSession({ email }: { email: string }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold text-ink">
        El portal de empleados estará disponible próximamente
      </p>
      <p className="mt-2 text-sm leading-relaxed text-graphite">
        Tu cuenta ({email}) es válida, pero la sección de registro de horas extra
        todavía está en construcción.
      </p>
      <form action={signOutAction} className="mt-6">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
      <Link
        href="/"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
      >
        <span aria-hidden="true">←</span>
        Volver al sitio
      </Link>
    </div>
  );
}
