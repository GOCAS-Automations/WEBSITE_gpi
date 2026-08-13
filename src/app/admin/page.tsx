import Link from "next/link";
import { getContentCounts, getTeamCounts } from "@/lib/admin";
import { requireContentEditor } from "@/lib/supabase/auth";
import { isManagerRole, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { AyudaSeccion, SeccionCard } from "@/components/admin/ui";
import {
  Layers,
  Sliders,
  User,
  Clock,
  ClockPlus,
  Calendar,
} from "@/lib/icons";

export default async function AdminDashboardPage() {
  const { profile } = await requireContentEditor();
  const manager = isManagerRole(profile.role);

  const [counts, team] = await Promise.all([
    getContentCounts(),
    manager ? getTeamCounts() : Promise.resolve({ people: 0, pending: 0 }),
  ]);

  /**
   * El dashboard refleja el menú, y el menú se agrupó: las ocho pantallas de
   * contenido dejaron de ser ocho tarjetas sueltas y viven detrás de una sola,
   * «Contenido del sitio». Enseñar aquí un índice distinto del menú lateral era
   * pedirle a GPI que aprendiera dos organizaciones de lo mismo.
   */
  const sitio = [
    {
      href: "/admin/contenido",
      label: "Contenido del sitio",
      icon: Layers,
      count: counts.services + counts.projects + counts.clients,
      unit: "elementos",
      description:
        "Todo lo que se ve en gpiprofesionales.com: la página de inicio, Nosotros, los títulos de las demás páginas, los servicios, los proyectos, los logos de clientes, las preguntas frecuentes y los valores.",
      destacada: true,
    },
    {
      href: "/admin/ajustes",
      label: "Contacto y ajustes",
      icon: Sliders,
      count: null,
      unit: "",
      description:
        "Dirección, teléfonos, correos, redes sociales, mapa y el correo al que llega el formulario de contacto.",
    },
  ];

  const gestion = [
    {
      href: "/admin/empleados",
      label: "Equipo y cuentas",
      icon: User,
      count: team.people,
      unit: "cuentas",
      description:
        "Las cuentas con las que el equipo entra al portal: crearlas, asignar el rol y el cargo, restablecer contraseñas y activar o desactivar el acceso.",
    },
    {
      href: "/admin/horarios",
      label: "Horario laboral del mes",
      icon: Calendar,
      count: null,
      unit: "",
      description:
        "El horario que trabaja el equipo cada mes. De aquí sale la jornada ordinaria: lo que se trabaje por encima cuenta como hora extra.",
    },
    {
      href: "/admin/jornadas",
      label: "Jornadas y horas extra",
      icon: Clock,
      count: team.pending,
      unit: "pendientes",
      description:
        "Las jornadas que registra el equipo, con su desglose de horas, para aprobarlas o rechazarlas; y el tablero con los totales del período.",
    },
  ];

  return (
    <>
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
          Hola, {profile.fullName || "equipo GPI"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite">
          Entraste como <strong>{ROLE_LABELS[profile.role]}</strong>.{" "}
          {ROLE_DESCRIPTIONS[profile.role]}
        </p>
        {/* El panel es la pantalla principal de quien administra, pero también
            es empleado de GPI: este es el atajo a su propio portal de horas.
            `?portal=1` es lo que pide el portal en vez del panel. */}
        <p className="mt-3 text-sm text-graphite">
          ¿Vas a registrar tus propias horas?{" "}
          <Link
            href="/mi-cuenta?portal=1"
            prefetch={false}
            className="inline-flex items-center gap-1 font-semibold text-brand-dark transition-colors hover:text-brand-deep"
          >
            <ClockPlus className="h-4 w-4" />
            Registrar mi jornada
          </Link>
        </p>
      </header>

      {manager && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-graphite">
            Gestión interna
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {gestion.map((section) => (
              <SeccionCard key={section.href} {...section} destacada />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-graphite">
          El sitio web
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {sitio.map((section) => (
            <SeccionCard key={section.href} {...section} />
          ))}
        </div>
      </section>

      {/* ---------------- Tres cosas que conviene saber ---------------- */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-graphite">
          Antes de empezar
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <AyudaSeccion title="Guarda bloque a bloque">
            Cada tarjeta de las pantallas de contenido tiene{" "}
            <strong>su propio botón de guardar</strong>: los cambios no se
            aplican hasta que lo pulsas. Al guardar, el sitio público se
            actualiza en pocos minutos.
          </AyudaSeccion>

          <AyudaSeccion title="Ocultar no es eliminar">
            El interruptor <strong>Visible / Oculto</strong> retira algo del
            sitio sin borrarlo: sigue aquí y puedes volver a mostrarlo.{" "}
            <strong>Eliminar</strong> sí es permanente. Para retirar algo un
            rato, oculta.
          </AyudaSeccion>

          <AyudaSeccion title="Fotos y texto alternativo">
            En los campos de imagen puedes subir un archivo o pegar un enlace;
            lo mejor son fotos horizontales y livianas. El{" "}
            <strong>texto alternativo</strong> describe la foto para quien no
            puede verla y ayuda en Google.
          </AyudaSeccion>
        </div>
      </section>
    </>
  );
}
