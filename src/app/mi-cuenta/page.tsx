import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionProfile, type SessionProfile } from "@/lib/supabase/auth";
import { signOutAction } from "@/lib/session-actions";
import {
  getJornadaConfig,
  getMapaHorarios,
  listEventos,
  listJornadas,
} from "@/lib/admin";
import { isContentEditorRole, ROLE_LABELS } from "@/lib/roles";
import { hoyEnColombia } from "@/lib/jornada";
import { LoginForm } from "./LoginForm";
import { IrAlPanel } from "./IrAlPanel";
import { JornadaForm } from "./JornadaForm";
import { MisJornadas } from "./MisJornadas";
import { MisEventos } from "./MisEventos";
import { PasswordForm } from "./PasswordForm";
import { saveJornada, deleteJornada, changeOwnPassword } from "./actions";
// La acción de las notas vive con el resto del calendario: es la MISMA para el
// panel y para el portal, y su permiso lo decide RLS (manager o responsable).
import { agregarNotaEvento } from "@/app/admin/calendario/actions";
import {
  Info,
  Lock,
  ArrowRight,
  LogOut,
  Clock,
  ClockPlus,
  Calendar,
} from "@/lib/icons";

export const metadata: Metadata = {
  title: "Mi Cuenta GPI",
  description: "Acceso al portal privado de GPI.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/mi-cuenta" },
};

/** Depende de la sesión: nunca se cachea. */
export const dynamic = "force-dynamic";

/** Parámetro que fuerza el portal de jornadas aunque tengas panel. */
const BYPASS_PORTAL = "portal";

/**
 * EL PORTAL ESTÁ EN PESTAÑAS (18 sep 2026)
 * ========================================
 * La pestaña viaja en la dirección con `?seccion=`, igual que el panel usa
 * `?vista=` en Jornadas y Calendario: el enlace se puede compartir y funciona
 * sin JavaScript. Se llama `seccion` y NO `vista` ni `portal` a propósito:
 * `?portal=1` ya significa otra cosa —«quiero el portal aunque tenga panel»— y
 * sigue funcionando igual, combinado con este (`?portal=1&seccion=eventos`).
 *
 * Cambiar de pestaña es una navegación completa, así que un formulario a medio
 * llenar se pierde. Se acepta a conciencia: mantener las tres secciones montadas
 * a la vez para conservar el borrador obligaría a un componente de cliente con
 * estado y a traer todo siempre, y la pestaña por defecto es justamente la del
 * formulario —el empleado entra, registra su jornada y se va—.
 *
 * Son TRES pestañas. La cuarta, «Mi nómina», está construida pero fuera del
 * despliegue: vive en la rama de respaldo `nomina-wip` hasta que GPI termine de
 * probar la nómina (ver `docs/PLAN.md`).
 */
type SeccionPortal = "jornada" | "eventos" | "clave";

const SECCIONES: SeccionPortal[] = ["jornada", "eventos", "clave"];

function normalizarSeccion(valor: string | string[] | undefined): SeccionPortal {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return (SECCIONES as string[]).includes(v ?? "")
    ? (v as SeccionPortal)
    : "jornada";
}

/**
 * Dirección de una pestaña. Si se llegó con `?portal=1` hay que ARRASTRARLO:
 * sin él, un admin o un coordinador que cambie de pestaña rebota al panel.
 */
function hrefSeccion(seccion: SeccionPortal, pidePortal: boolean): string {
  const partes = [
    ...(pidePortal ? [`${BYPASS_PORTAL}=1`] : []),
    ...(seccion === "jornada" ? [] : [`seccion=${seccion}`]),
  ];
  return partes.length === 0 ? "/mi-cuenta" : `/mi-cuenta?${partes.join("&")}`;
}

export default async function MiCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const configured = isSupabaseConfigured();
  const session = configured ? await getSessionProfile() : null;
  const params = await searchParams;
  /** `?portal=1` = «quiero el portal de jornadas, no el panel». */
  const pidePortal = params[BYPASS_PORTAL] !== undefined;

  if (session && session.profile.active) {
    // Quien administra el sitio (admin, coordinador o Community Manager) entra
    // por «Mi Cuenta» buscando el PANEL: se le lleva allí salvo que pida el
    // portal a propósito. El redirect lo hace el cliente — ver `IrAlPanel`.
    if (isContentEditorRole(session.profile.role) && !pidePortal) {
      return (
        <IrAlPanel
          nombre={session.profile.fullName || session.profile.identificador}
        />
      );
    }

    // Portal de jornadas: lo ve CUALQUIER cuenta activa, sin importar el rol
    // (el Community Manager también es empleado de GPI, y un admin o un
    // coordinador puede registrar sus horas si lo necesita).
    return (
      <PortalEmpleado
        profile={session.profile}
        seccion={normalizarSeccion(params.seccion)}
        pidePortal={pidePortal}
      />
    );
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

async function PortalEmpleado({
  profile,
  seccion,
  pidePortal,
}: {
  profile: SessionProfile;
  seccion: SeccionPortal;
  /** true = se llegó con `?portal=1`; hay que conservarlo en las pestañas. */
  pidePortal: boolean;
}) {
  const hoy = hoyEnColombia();

  const [jornadas, config, horarios, eventos] = await Promise.all([
    listJornadas({ employeeId: profile.id, limit: 100 }),
    getJornadaConfig(),
    getMapaHorarios(),
    // Solo los suyos y solo de hoy en adelante: el portal es para trabajar, no
    // para consultar el historial del calendario.
    listEventos({
      responsableId: profile.id,
      desde: hoy,
      conNotas: true,
      limit: 30,
    }),
  ]);

  const conPanel = isContentEditorRole(profile.role);
  const pendientes = jornadas.filter((j) => j.status === "pendiente").length;
  const aprobadas = jornadas.filter((j) => j.status === "aprobada").length;
  const rechazadas = jornadas.filter((j) => j.status === "rechazada").length;

  /* Las tres pestañas. El contador es lo que hay ESPERANDO en cada una: las
     jornadas por revisar y los eventos asignados. */
  const pestanas: {
    value: SeccionPortal;
    label: string;
    /** Versión corta para el teléfono, donde «Registrar jornada» no cabe. */
    corto: string;
    icon: (props: { className?: string }) => React.ReactNode;
    badge: number;
  }[] = [
    {
      value: "jornada",
      label: "Registrar jornada",
      corto: "Jornada",
      icon: ClockPlus,
      badge: pendientes,
    },
    {
      value: "eventos",
      label: "Mis eventos",
      corto: "Eventos",
      icon: Calendar,
      badge: eventos.length,
    },
    {
      value: "clave",
      label: "Mi contraseña",
      // «Clave» y no «Contraseña»: con tres columnas en un teléfono de 390 px,
      // la palabra larga se cortaba («Contra…»), que es peor que acortarla.
      corto: "Clave",
      icon: Lock,
      badge: 0,
    },
  ];

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

      {/* ---------------- Pestañas del portal ----------------
          La sección viaja en `?seccion=`; `?portal=1` se conserva para que las
          cuentas con panel no reboten al cambiar de pestaña. En móvil son tres
          columnas con la etiqueta corta, no una tira con desplazamiento
          horizontal: así se ven las tres de una vez. */}
      <div className="border-b border-line bg-white">
        <Container className="py-3">
          <nav aria-label="Secciones de Mi Cuenta">
            <ul className="grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-mist p-1.5 sm:inline-flex sm:gap-1 sm:rounded-full sm:p-1">
              {pestanas.map((p) => {
                const activa = p.value === seccion;
                const Icon = p.icon;
                return (
                  <li key={p.value}>
                    <Link
                      prefetch={false}
                      href={hrefSeccion(p.value, pidePortal)}
                      aria-current={activa ? "page" : undefined}
                      className={`flex items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-xs font-semibold transition-colors sm:justify-start sm:gap-1.5 sm:rounded-full sm:px-4 sm:text-sm ${
                        activa
                          ? "bg-brand-dark text-white shadow-soft"
                          : "text-ink-soft hover:bg-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate sm:hidden">{p.corto}</span>
                      <span className="hidden truncate sm:inline">{p.label}</span>
                      {p.badge > 0 && (
                        <span
                          className={`shrink-0 rounded-full px-1 py-px text-[10px] font-bold sm:ml-0.5 sm:px-1.5 sm:text-[11px] ${
                            activa
                              ? "bg-white/25 text-white"
                              : "bg-white text-graphite"
                          }`}
                        >
                          {p.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        {/* Acceso al panel: admin, coordinador y Community Manager. Va fuera de
            las pestañas porque no pertenece a ninguna. */}
        {conPanel && (
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-brand-tint px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-base font-bold text-ink">
                Tienes acceso al panel de administración
              </p>
              <p className="mt-1 text-sm leading-relaxed text-graphite">
                Entraste como <strong>{ROLE_LABELS[profile.role]}</strong>. Desde
                el panel editas el contenido del sitio; aquí registras tus
                propias jornadas.
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

        {/* ---------------- Registrar jornada ---------------- */}
        {seccion === "jornada" && (
          <>
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

            <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
              <header className="mb-5">
                <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink sm:text-2xl">
                  <Clock className="h-6 w-6 text-brand-dark" />
                  Registrar una jornada
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite">
                  Cuéntanos qué día trabajaste, en qué orden de trabajo y en qué
                  horario. Mientras escribes verás cómo quedan tus horas
                  ordinarias y extra. Al guardar, tu coordinador la revisará.
                </p>
              </header>

              <JornadaForm
                action={saveJornada}
                config={config}
                hoy={hoy}
                horarios={horarios}
              />
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-bold text-ink">Mis jornadas</h2>
              <p className="mb-4 mt-1 max-w-3xl text-sm leading-relaxed text-graphite">
                Aquí queda el historial de lo que has registrado y el estado de
                cada jornada: <strong>pendiente</strong> (nadie la ha revisado
                todavía y puedes corregirla o eliminarla),{" "}
                <strong>aprobada</strong> (queda fija, con las horas que se le
                contaron) o <strong>rechazada</strong> (tu coordinador te dejó
                una nota con lo que hay que corregir).
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

            <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-graphite">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                ¿Algo no cuadra con tus horas o necesitas corregir una jornada ya
                revisada? Habla con tu coordinador: él puede devolverla al estado
                pendiente para que la edites.
              </span>
            </p>
          </>
        )}

        {/* ---------------- Mis eventos ---------------- */}
        {seccion === "eventos" && (
          <MisEventos
            eventos={eventos}
            agregarNota={agregarNotaEvento}
            nombrePropio={profile.fullName}
          />
        )}

        {/* ---------------- Mi contraseña ---------------- */}
        {seccion === "clave" && (
          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
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
        )}
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
