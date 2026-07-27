import Link from "next/link";
import { getContentCounts, getTeamCounts } from "@/lib/admin";
import { requireContentEditor } from "@/lib/supabase/auth";
import { isManagerRole, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { Card } from "@/components/admin/ui";
import {
  Cog,
  Photo,
  Handshake,
  Info,
  Shield,
  Sliders,
  User,
  Clock,
  ArrowRight,
} from "@/lib/icons";

export default async function AdminDashboardPage() {
  const { profile } = await requireContentEditor();
  const manager = isManagerRole(profile.role);

  const [counts, team] = await Promise.all([
    getContentCounts(),
    manager ? getTeamCounts() : Promise.resolve({ people: 0, pending: 0 }),
  ]);

  const contenido = [
    {
      href: "/admin/servicios",
      label: "Servicios",
      icon: Cog,
      count: counts.services,
      unit: "servicios",
      description:
        "Título, resumen, descripción, ítems, imágenes, categoría, orden y visibilidad de cada servicio.",
    },
    {
      href: "/admin/proyectos",
      label: "Proyectos",
      icon: Photo,
      count: counts.projects,
      unit: "proyectos",
      description: "Proyectos realizados que se muestran en la página /proyectos.",
    },
    {
      href: "/admin/clientes",
      label: "Clientes",
      icon: Handshake,
      count: counts.clients,
      unit: "logos",
      description: "Logos de clientes de la portada y su enlace opcional.",
    },
    {
      href: "/admin/faq",
      label: "Preguntas frecuentes",
      icon: Info,
      count: counts.faqs,
      unit: "preguntas",
      description: "Preguntas y respuestas de la sección Nosotros.",
    },
    {
      href: "/admin/valores",
      label: "Valores corporativos",
      icon: Shield,
      count: counts.values,
      unit: "valores",
      description: "Los principios que se muestran en el inicio y en Nosotros.",
    },
    {
      href: "/admin/ajustes",
      label: "Contacto y ajustes",
      icon: Sliders,
      count: null,
      unit: "",
      description:
        "Datos de contacto, redes, mapa, hero, estadísticas, video y visibilidad de secciones completas.",
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
        "Crea cuentas para el equipo, asigna roles y cargos, restablece contraseñas y activa o desactiva accesos.",
    },
    {
      href: "/admin/jornadas",
      label: "Jornadas y horas extra",
      icon: Clock,
      count: team.pending,
      unit: "pendientes",
      description:
        "Revisa las jornadas registradas por el equipo con su desglose de horas y apruébalas o recházalas.",
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

      <Card className="mt-6">
        <h2 className="text-base font-bold text-ink">
          Visibilidad: ocultar sin borrar
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          Cada servicio, proyecto, cliente, pregunta y valor tiene un interruptor{" "}
          <strong>Visible / Oculto</strong>: al apagarlo desaparece del sitio
          público pero se conserva aquí. En{" "}
          <Link
            href="/admin/ajustes"
            className="font-semibold text-brand-dark hover:text-brand"
          >
            Contacto y ajustes
          </Link>{" "}
          también puedes apagar secciones completas del inicio y de Nosotros.
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="text-base font-bold text-ink">¿Cómo funcionan las imágenes?</h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          En cada campo de imagen puedes <strong>subir un archivo</strong> (se
          guarda en el bucket <code className="rounded bg-mist px-1">site-images</code>{" "}
          de Supabase) o <strong>pegar una URL</strong>. Las rutas que empiezan por{" "}
          <code className="rounded bg-mist px-1">/images/</code> corresponden a las
          imágenes que ya vienen con el sitio.
        </p>
      </Card>
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
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white">
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
