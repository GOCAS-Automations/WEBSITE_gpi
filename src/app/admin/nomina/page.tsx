/**
 * /admin/nomina — el sistema de nómina, en tres pestañas:
 *
 *   · "Liquidación" (por defecto): el período en curso, persona por persona,
 *     con su desglose, sus conceptos manuales y su volante en PDF.
 *   · "Configuración": salario, tarifas por hora y aportes de cada empleado,
 *     mes a mes (se copian solos del mes anterior).
 *   · "Tablero": KPIs, gráficas e historial por empleado.
 *
 * La pestaña viaja en la URL (`?vista=configuracion`), igual que en jornadas y
 * en el calendario: el enlace se puede compartir y funciona sin JavaScript. El
 * El acceso es SOLO PARA EL ADMINISTRADOR —ni el coordinador ni el Community
 * Manager administran la nómina (pedido de GPI, 18 sep 2026)— y la barrera
 * autoritativa es `requireAdmin()`. El coordinador ve SU propia nómina en
 * `/mi-cuenta?seccion=nomina`, como cualquier empleado.
 */

import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/auth";
import { AdminPageHeader } from "@/components/admin/ui";
import { BarChart, ClipboardList, Sliders } from "@/lib/icons";
import { LiquidacionView } from "./liquidacion";
import { ConfiguracionView } from "./configuracion";
import { TableroView } from "./tablero";

/** Depende de la sesión y crea filas al entrar: nunca se cachea. */
export const dynamic = "force-dynamic";

type Vista = "liquidacion" | "configuracion" | "tablero";

const PESTANAS: {
  value: Vista;
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.ReactNode;
}[] = [
  {
    value: "liquidacion",
    label: "Liquidación",
    href: "/admin/nomina",
    icon: ClipboardList,
  },
  {
    value: "configuracion",
    label: "Configuración",
    href: "/admin/nomina?vista=configuracion",
    icon: Sliders,
  },
  {
    value: "tablero",
    label: "Tablero",
    href: "/admin/nomina?vista=tablero",
    icon: BarChart,
  },
];

const DESCRIPCIONES: Record<Vista, string> = {
  liquidacion:
    "Lo que hay que pagarle a cada persona en el período: el sueldo, las horas y recargos que salen de las jornadas aprobadas, los bonos y descuentos que tú digitas, y el neto.",
  configuracion:
    "El salario de cada empleado, el valor de cada tipo de hora, el auxilio de transporte y los aportes de salud y pensión, mes a mes.",
  tablero:
    "Cómo ha evolucionado la nómina: totales por mes, reparto por concepto y por persona, e historial de cada empleado con su volante.",
};

export default async function AdminNominaPage({
  searchParams,
}: {
  searchParams: Promise<{
    vista?: string;
    tipo?: string;
    anio?: string;
    mes?: string;
    quincena?: string;
    empleado?: string;
    estado?: string;
    abrir?: string;
  }>;
}) {
  // Barrera autoritativa: solo admin y coordinador.
  await requireAdmin();

  const params = await searchParams;
  const vista: Vista =
    params.vista === "configuracion"
      ? "configuracion"
      : params.vista === "tablero"
        ? "tablero"
        : "liquidacion";

  return (
    <>
      <AdminPageHeader
        title="Nómina"
        description={DESCRIPCIONES[vista]}
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Nómina" }]}
      />

      {/* ---------------- Pestañas ---------------- */}
      <nav aria-label="Vistas de nómina" className="mb-6">
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

      {vista === "configuracion" ? (
        <ConfiguracionView
          empleadoId={params.empleado ?? ""}
          anio={params.anio}
          mes={params.mes}
        />
      ) : vista === "tablero" ? (
        <TableroView
          empleadoId={params.empleado ?? ""}
          anio={params.anio}
          estado={params.estado ?? ""}
          tipo={params.tipo ?? ""}
        />
      ) : (
        <LiquidacionView
          tipo={params.tipo}
          anio={params.anio}
          mes={params.mes}
          quincena={params.quincena}
          abrir={params.abrir ?? ""}
        />
      )}
    </>
  );
}
