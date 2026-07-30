import Link from "next/link";
import { getContentCounts, getTeamCounts } from "@/lib/admin";
import { requireContentEditor } from "@/lib/supabase/auth";
import { isManagerRole, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { AyudaSeccion } from "@/components/admin/ui";
import {
  Cog,
  Photo,
  Handshake,
  Info,
  Shield,
  Sliders,
  User,
  Clock,
  ClockPlus,
  Calendar,
  ArrowRight,
} from "@/lib/icons";

export default async function AdminDashboardPage() {
  const { profile } = await requireContentEditor();
  const manager = isManagerRole(profile.role);

  const [counts, team] = await Promise.all([
    getContentCounts(),
    manager ? getTeamCounts() : Promise.resolve({ people: 0, pending: 0 }),
  ]);

  // Cada tarjeta lleva UNA frase que dice, en lenguaje llano, qué se administra
  // ahí y en qué parte del sitio se ve.
  const contenido = [
    {
      href: "/admin/servicios",
      label: "Servicios",
      icon: Cog,
      count: counts.services,
      unit: "servicios",
      description:
        "Los servicios que ofrece GPI: sus textos, imágenes, lista de alcances y el orden en que aparecen en el menú y en la página Servicios.",
    },
    {
      href: "/admin/proyectos",
      label: "Proyectos",
      icon: Photo,
      count: counts.projects,
      unit: "proyectos",
      description:
        "Los trabajos ya realizados que se muestran, con su foto, en la página Proyectos.",
    },
    {
      href: "/admin/clientes",
      label: "Clientes",
      icon: Handshake,
      count: counts.clients,
      unit: "logos",
      description:
        "Los logos de clientes que desfilan en la página de inicio, con el enlace opcional a su sitio web.",
    },
    {
      href: "/admin/faq",
      label: "Preguntas frecuentes",
      icon: Info,
      count: counts.faqs,
      unit: "preguntas",
      description:
        "Las preguntas y respuestas que el visitante despliega al final de la página Nosotros.",
    },
    {
      href: "/admin/valores",
      label: "Valores corporativos",
      icon: Shield,
      count: counts.values,
      unit: "valores",
      description:
        "Los principios de la empresa, con su icono, que se muestran en el inicio y en la página Nosotros.",
    },
    {
      href: "/admin/ajustes",
      label: "Contacto y ajustes",
      icon: Sliders,
      count: null,
      unit: "",
      description:
        "Dirección, teléfonos, correos, redes y mapa; los textos de la primera pantalla del inicio; el video; y los interruptores para apagar secciones completas.",
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
            es empleado de GPI: este es el atajo a su propio portal de horas. */}
        <p className="mt-3 text-sm text-graphite">
          ¿Vas a registrar tus propias horas?{" "}
          <Link
            href="/mi-cuenta"
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
              <SectionCard key={section.href} {...section} destacada />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-graphite">
          Contenido del sitio
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {contenido.map((section) => (
            <SectionCard key={section.href} {...section} />
          ))}
        </div>
      </section>

      {/* ---------------- Tres cosas que conviene saber ---------------- */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-graphite">
          Antes de empezar
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <AyudaSeccion title="Los cambios se ven en minutos">
            Cada bloque se guarda con su propio botón. En cuanto guardas, el
            sitio público se actualiza; si no lo ves, recarga la página al cabo
            de un par de minutos.
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

/* ------------------------------------------------------------------ */

function SectionCard({
  href,
  label,
  icon: Icon,
  count,
  unit,
  description,
  destacada = false,
}: {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
  count: number | null;
  unit: string;
  description: string;
  destacada?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card ${
        destacada ? "border-brand/30" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-deep transition-colors group-hover:bg-brand-deep group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>
        {count !== null && (
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-graphite">
            {count} {unit}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-ink group-hover:text-brand-dark">
        {label}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-graphite">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
        Administrar
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
