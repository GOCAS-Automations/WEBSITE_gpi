/**
 * /admin/calendario — el calendario interno de programación, en tres pestañas:
 *
 *   · "Calendario" (por defecto): la cuadrícula del mes con su agenda.
 *   · "Notas": todo el seguimiento escrito, en una tabla con filtros.
 *   · "Métricas": KPIs y gráficas de cumplimiento.
 *
 * La pestaña viaja en la URL (`?vista=notas`), igual que en jornadas: el enlace
 * se puede compartir y funciona sin JavaScript. El acceso es solo para managers
 * (admin | coordinador) y la barrera autoritativa es `requireManager()`: el
 * Community Manager no administra el calendario, solo ve en su Mi Cuenta los
 * eventos que le asignen.
 */

import Link from "next/link";
import { requireManager } from "@/lib/supabase/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { BarChart, Calendar, ClipboardList } from "@/lib/icons";
import { CalendarioView } from "./calendario";
import { NotasView } from "./notas";
import { MetricasView } from "./metricas";

type Vista = "calendario" | "notas" | "metricas";

const PESTANAS: {
  value: Vista;
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.ReactNode;
}[] = [
  {
    value: "calendario",
    label: "Calendario",
    href: "/admin/calendario",
    icon: Calendar,
  },
  {
    value: "notas",
    label: "Notas",
    href: "/admin/calendario?vista=notas",
    icon: ClipboardList,
  },
  {
    value: "metricas",
    label: "Métricas",
    href: "/admin/calendario?vista=metricas",
    icon: BarChart,
  },
];

const DESCRIPCIONES: Record<Vista, string> = {
  calendario:
    "La agenda interna de GPI: programa actividades con su día, su hora y sus responsables, y ciérralas como cumplidas, incompletas o aplazadas.",
  notas:
    "Todo el seguimiento escrito sobre los eventos, de lo más reciente a lo más antiguo, con filtros por evento, autor y fechas.",
  metricas:
    "Cómo se está cumpliendo lo programado: cuántos eventos salen completos, cuántos se aplazan y cómo se reparte la carga del equipo.",
};

export default async function AdminCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{
    vista?: string;
    anio?: string;
    mes?: string;
    evento?: string;
    autor?: string;
    desde?: string;
    hasta?: string;
    pagina?: string;
  }>;
}) {
  // Barrera autoritativa: solo admin y coordinador.
  await requireManager();

  const params = await searchParams;
  const vista: Vista =
    params.vista === "notas"
      ? "notas"
      : params.vista === "metricas"
        ? "metricas"
        : "calendario";

  return (
    <>
      <AdminPageHeader
        title="Calendario"
        description={DESCRIPCIONES[vista]}
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Calendario" }]}
      />

      {/* ---------------- Pestañas ---------------- */}
      <nav aria-label="Vistas del calendario" className="mb-6">
        <ul className="inline-flex gap-1 rounded-full border border-line bg-white p-1 shadow-soft">
          {PESTANAS.map((p) => {
            const activa = p.value === vista;
            const Icon = p.icon;
            return (
              <li key={p.value}>
                <Link
                  prefetch={false}
                  href={p.href}
                  aria-current={activa ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activa
                      ? "bg-brand-dark text-white shadow-soft"
                      : "text-ink-soft hover:bg-mist"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {p.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {vista === "notas" ? (
        <NotasView
          eventoId={params.evento ?? ""}
          autorId={params.autor ?? ""}
          desde={params.desde ?? ""}
          hasta={params.hasta ?? ""}
          pagina={params.pagina ?? ""}
        />
      ) : vista === "metricas" ? (
        <MetricasView />
      ) : (
        <CalendarioView anio={params.anio} mes={params.mes} />
      )}
    </>
  );
}
