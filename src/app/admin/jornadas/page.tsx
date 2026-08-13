/**
 * /admin/jornadas — dos pestañas sobre los mismos datos:
 *
 *   · "Aprobaciones" (por defecto): la bandeja de revisión de siempre.
 *   · "Métricas": el tablero con KPIs, gráficas, control de horas extra,
 *     tabla detallada y exportación a CSV.
 *
 * La pestaña viaja en la URL (`?vista=metricas`), así se puede compartir el
 * enlace y funciona sin JavaScript. El acceso sigue siendo solo para managers
 * (admin | coordinador): la barrera autoritativa es `requireManager()`.
 */

import Link from "next/link";
import { requireManager } from "@/lib/supabase/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { BarChart, ClipboardList } from "@/lib/icons";
import { AprobacionesView } from "./aprobaciones";
import { MetricasView } from "./metricas";

type Vista = "aprobaciones" | "metricas";

const PESTANAS: {
  value: Vista;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
}[] = [
  { value: "aprobaciones", label: "Aprobaciones", icon: ClipboardList },
  { value: "metricas", label: "Métricas", icon: BarChart },
];

export default async function AdminJornadasPage({
  searchParams,
}: {
  searchParams: Promise<{
    vista?: string;
    estado?: string;
    empleado?: string;
    desde?: string;
    hasta?: string;
  }>;
}) {
  // Barrera autoritativa: solo admin y coordinador.
  await requireManager();

  const filtros = await searchParams;
  const vista: Vista = filtros.vista === "metricas" ? "metricas" : "aprobaciones";

  return (
    <>
      <AdminPageHeader
        title="Jornadas y horas extra"
        description={
          vista === "metricas"
            ? "Cómo se están repartiendo las horas del equipo: totales, horas extra, turnos y alertas de tope legal."
            : "Revisa las jornadas que registra el equipo, con su desglose de horas ordinarias y extra, y apruébalas o recházalas."
        }
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Jornadas" }]}
      />

      {/* ---------------- Pestañas ---------------- */}
      <nav aria-label="Vistas de jornadas" className="mb-6">
        <ul className="inline-flex gap-1 rounded-full border border-line bg-white p-1 shadow-soft">
          {PESTANAS.map((p) => {
            const activa = p.value === vista;
            const Icon = p.icon;
            return (
              <li key={p.value}>
                <Link
                  prefetch={false}
                  href={
                    p.value === "aprobaciones"
                      ? "/admin/jornadas"
                      : "/admin/jornadas?vista=metricas"
                  }
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

      {vista === "metricas" ? (
        <MetricasView />
      ) : (
        <AprobacionesView
          estado={filtros.estado}
          empleadoId={filtros.empleado ?? ""}
          desde={filtros.desde ?? ""}
          hasta={filtros.hasta ?? ""}
        />
      )}
    </>
  );
}
