import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionProfile, type SessionProfile } from "@/lib/supabase/auth";
import { signOutAction } from "@/lib/session-actions";
import { getJornadaConfig, getMapaHorarios, listJornadas } from "@/lib/admin";
import { isContentEditorRole, ROLE_LABELS } from "@/lib/roles";
import { hoyEnColombia } from "@/lib/jornada";
import { LoginForm } from "./LoginForm";
import { JornadaForm } from "./JornadaForm";
import { MisJornadas } from "./MisJornadas";
import { PasswordForm } from "./PasswordForm";
import { saveJornada, deleteJornada, changeOwnPassword } from "./actions";
import { Info, Lock, ArrowRight, LogOut, Clock } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Mi Cuenta GPI",
  description: "Acceso al portal privado de GPI.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/mi-cuenta" },
};

/** Depende de la sesión: nunca se cachea. */
export const dynamic = "force-dynamic";

export default async function MiCuentaPage() {
  const configured = isSupabaseConfigured();
  const session = configured ? await getSessionProfile() : null;

  // Portal de jornadas: lo ve CUALQUIER cuenta activa, sin importar el rol (el
  // Community Manager también es empleado de GPI, y un admin o un coordinador
  // puede registrar sus horas si lo necesita). Quien además tiene permisos de
  // contenido ve arriba el acceso al panel; el resto solo su portal.
  if (session && session.profile.active) {
    return <PortalEmpleado profile={session.profile} />;
  }

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

              {configured && session && !session.profile.active && (
                <CuentaDesactivada identificador={session.profile.identificador} />
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
/* Portal del empleado                                                 */
/* ------------------------------------------------------------------ */

async function PortalEmpleado({ profile }: { profile: SessionProfile }) {
  const [jornadas, config, horarios] = await Promise.all([
    listJornadas({ employeeId: profile.id, limit: 100 }),
    getJornadaConfig(),
    getMapaHorarios(),
  ]);

  const hoy = hoyEnColombia();
  const conPanel = isContentEditorRole(profile.role);
  const pendientes = jornadas.filter((j) => j.status === "pendiente").length;
  const aprobadas = jornadas.filter((j) => j.status === "aprobada").length;
  const rechazadas = jornadas.filter((j) => j.status === "rechazada").length;

  return (
    <div className="bg-mist">
      {/* Barra superior del portal */}
      <div className="border-b border-line bg-white">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">
              Mi Cuenta GPI
            </p>
            <p className="truncate text-sm text-graphite">
              Hola,{" "}
              <span className="font-semibold text-ink">{profile.fullName}</span>
              {profile.cargo && ` · ${profile.cargo}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
            >
              <span aria-hidden="true">←</span>
              Ir al sitio
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        {/* Acceso al panel: admin, coordinador y Community Manager */}
        {conPanel && (
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-brand-tint px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-base font-bold text-ink">
                Tienes acceso al panel de administración
              </p>
              <p className="mt-1 text-sm leading-relaxed text-graphite">
                Entraste como{" "}
                <strong>{ROLE_LABELS[profile.role]}</strong>. Desde el panel
                editas el contenido del sitio; aquí abajo registras tus propias
                jornadas.
              </p>
            </div>
            <Link
              href="/admin"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep"
            >
              Ir al panel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Resumen */}
        <div className="mb-7 grid gap-3 sm:grid-cols-3">
          <Resumen
            label="Pendientes de aprobación"
            valor={pendientes}
            className="bg-amber-50 text-amber-900"
          />
          <Resumen
            label="Aprobadas"
            valor={aprobadas}
            className="bg-brand-tint text-brand-deep"
          />
          <Resumen
            label="Rechazadas"
            valor={rechazadas}
            className="bg-red-50 text-red-700"
          />
        </div>

        {/* Registrar jornada */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
          <header className="mb-5">
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink sm:text-2xl">
              <Clock className="h-6 w-6 text-brand-dark" />
              Registrar una jornada
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite">
              Cuéntanos qué día trabajaste, en qué orden de trabajo y en qué
              horario. Mientras escribes verás cómo quedan tus horas ordinarias y
              extra. Al guardar, tu coordinador la revisará.
            </p>
          </header>

          <JornadaForm
            action={saveJornada}
            config={config}
            hoy={hoy}
            horarios={horarios}
          />
        </section>

        {/* Historial */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink">Mis jornadas</h2>
          <p className="mb-4 mt-1 max-w-3xl text-sm leading-relaxed text-graphite">
            Aquí queda el historial de lo que has registrado y el estado de cada
            jornada: <strong>pendiente</strong> (nadie la ha revisado todavía y
            puedes corregirla o eliminarla), <strong>aprobada</strong> (queda fija,
            con las horas que se le contaron) o <strong>rechazada</strong> (tu
            coordinador te dejó una nota con lo que hay que corregir).
          </p>
          <MisJornadas
            jornadas={jornadas}
            config={config}
            hoy={hoy}
            horarios={horarios}
            saveAction={saveJornada}
            deleteAction={deleteJornada}
          />
        </section>

        {/* Contraseña */}
        <section className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Lock className="h-5 w-5 text-brand-dark" />
            Mi contraseña
          </h2>
          <p className="mb-4 mt-1 max-w-2xl text-sm leading-relaxed text-graphite">
            Si te entregaron una contraseña generada, este es el lugar para
            cambiarla por una que recuerdes. Debe tener al menos 8 caracteres.
          </p>
          <PasswordForm action={changeOwnPassword} />
        </section>

        <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-graphite">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            ¿Algo no cuadra con tus horas o necesitas corregir una jornada ya
            revisada? Habla con tu coordinador: él puede devolverla al estado
            pendiente para que la edites.
          </span>
        </p>
      </Container>
    </div>
  );
}

function Resumen({
  label,
  valor,
  className,
}: {
  label: string;
  valor: number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl px-5 py-4 ${className}`}>
      <p className="text-3xl font-extrabold">{valor}</p>
      <p className="mt-0.5 text-sm font-medium opacity-90">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estados de la tarjeta de acceso                                     */
/* ------------------------------------------------------------------ */

function NotConfigured() {
  return (
    <div className="text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint text-brand-deep">
        <Lock className="h-7 w-7" />
      </span>
      <p className="mt-5 text-lg font-bold text-ink">
        El portal estará disponible próximamente
      </p>
      <p className="mt-2 text-sm leading-relaxed text-graphite">
        Estamos terminando de configurar el acceso privado de GPI. Muy pronto
        podrás ingresar con tus credenciales para registrar tus jornadas y
        administrar el contenido del sitio.
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
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep"
        >
          Contactar a GPI
        </Link>
      </div>
    </div>
  );
}

function CuentaDesactivada({ identificador }: { identificador: string }) {
  return (
    <div className="text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <Lock className="h-7 w-7" />
      </span>
      <p className="mt-5 text-lg font-bold text-ink">Tu cuenta está desactivada</p>
      <p className="mt-2 text-sm leading-relaxed text-graphite">
        El usuario <span className="font-semibold text-ink">{identificador}</span>{" "}
        existe, pero un administrador desactivó su acceso. Comunícate con tu
        coordinador para reactivarla.
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
    </div>
  );
}
