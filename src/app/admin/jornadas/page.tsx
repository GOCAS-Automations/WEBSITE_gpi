/**
 * /admin/jornadas — tres pestañas sobre el trabajo del equipo:
 *
 *   · "Aprobaciones" (por defecto): la bandeja de revisión de jornadas.
 *   · "Permisos": la bandeja de solicitudes de permiso y el registro de faltas
 *     (migración 0014). Vive AQUÍ y no en una entrada propia del menú porque es
 *     el mismo trabajo, el mismo público y el mismo lenguaje —un manager revisa
 *     lo que registró el equipo y lo aprueba o lo rechaza con una nota que el
 *     colaborador lee—, y porque así el menú del panel se queda en las ocho
 *     entradas que GPI pidió. Además se revisan juntas: las horas que faltan
 *     una semana se explican, muchas veces, con el permiso de esa semana.
 *   · "Métricas": el tablero con KPIs, gráficas, control de horas extra,
 *     tabla detallada y exportación a CSV.
 *
 * La pestaña viaja en la URL (`?vista=permisos`), así se puede compartir el
 * enlace y funciona sin JavaScript. El acceso sigue siendo solo para managers
 * (admin | coordinador): la barrera autoritativa es `requireManager()`.
 */

import Link from "next/link";
import { requireManager } from "@/lib/supabase/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { BarChart, CalendarCheck, ClipboardList } from "@/lib/icons";
import { AprobacionesView } from "./aprobaciones";
import { MetricasView } from "./metricas";
import { PermisosView } from "./permisos";
import { leerPagina } from "@/lib/paginacion";

type Vista = "aprobaciones" | "permisos" | "metricas";

const PESTANAS: {
  value: Vista;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
}[] = [
  { value: "aprobaciones", label: "Aprobaciones", icon: ClipboardList },
  { value: "permisos", label: "Permisos", icon: CalendarCheck },
  { value: "metricas", label: "Métricas", icon: BarChart },
];

const DESCRIPCIONES: Record<Vista, string> = {
  aprobaciones:
    "Revisa las jornadas que registra el equipo, con su desglose de horas ordinarias y extra, y apruébalas o recházalas.",
  permisos:
    "Las solicitudes de permiso del equipo: apruébalas decidiendo si se pagan, recházalas con una nota o registra directamente una falta.",
  metricas:
    "Cómo se están repartiendo las horas del equipo: totales, horas extra, turnos y alertas de tope legal.",
};

export default async function AdminJornadasPage({
  searchParams,
}: {
  searchParams: Promise<{
    vista?: string;
    estado?: string;
    empleado?: string;
    desde?: string;
    hasta?: string;
    pagina?: string;
  }>;
}) {
  // Barrera autoritativa: solo admin y coordinador.
  await requireManager();

  const filtros = await searchParams;
  const vista: Vista =
    filtros.vista === "metricas"
      ? "metricas"
      : filtros.vista === "permisos"
        ? "permisos"
        : "aprobaciones";

  return (
    <>
      <AdminPageHeader
        title="Jornadas, permisos y horas extra"
        description={DESCRIPCIONES[vista]}
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Jornadas y Permisos" }]}
      />

      {/* ---------------- Pestañas ---------------- */}
      <nav aria-label="Vistas de jornadas" className="mb-6">
        {/* En 390 px las tres pestañas con el relleno de escritorio no caben:
            ocupan todo el ancho y aprietan el relleno, como en /admin/nomina. */}
        <ul className="flex w-full justify-between gap-1 rounded-full border border-line bg-white p-1 shadow-soft sm:inline-flex sm:w-auto sm:justify-start">
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
                      : `/admin/jornadas?vista=${p.value}`
                  }
                  aria-current={activa ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-colors sm:px-4 sm:text-sm ${
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
      ) : vista === "permisos" ? (
        <PermisosView
          estado={filtros.estado}
          empleadoId={filtros.empleado ?? ""}
          desde={filtros.desde ?? ""}
          hasta={filtros.hasta ?? ""}
          pagina={leerPagina(filtros.pagina)}
        />
      ) : (
        <AprobacionesView
          estado={filtros.estado}
          empleadoId={filtros.empleado ?? ""}
          desde={filtros.desde ?? ""}
          hasta={filtros.hasta ?? ""}
          pagina={leerPagina(filtros.pagina)}
        />
      )}
    </>
  );
}
