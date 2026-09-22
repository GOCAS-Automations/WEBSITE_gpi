/**
 * /admin/nomina — el sistema de nómina, en tres pestañas:
 *
 *   · "Liquidación" (por defecto): el período en curso, persona por persona,
 *     con su desglose, sus conceptos manuales y su volante en PDF.
 *   · "Configuración": salario, tarifas por hora y aportes de cada empleado,
 *     **vigentes desde** el mes en que se guardan (rigen hacia adelante hasta
 *     el próximo cambio; ver un mes no crea nada), y los cortes («dejar sin
 *     configuración desde este mes»).
 *   · "Tablero": KPIs, gráficas e historial por empleado.
 *
 * La pestaña viaja en la URL (`?vista=configuracion`), igual que en jornadas y
 * en el calendario: el enlace se puede compartir y funciona sin JavaScript.
 * El filtro por persona de la liquidación también (`?persona=<id>`), así que
 * sobrevive a recargar y a cambiar de período.
 *
 * El acceso es SOLO PARA EL ADMINISTRADOR —ni el coordinador ni el Community
 * Manager administran la nómina (pedido de GPI, 18 sep 2026)— y la barrera
 * autoritativa es `requireAdmin()`. El coordinador ve SU propia nómina en
 * `/mi-cuenta?seccion=nomina`, como cualquier empleado.
 *
 * NAVEGACIÓN RÁPIDA ENTRE PESTAÑAS (22 sep 2026)
 * ----------------------------------------------
 * Antes, cambiar de pestaña tardaba 0,7–0,95 s sin ninguna señal: la página
 * esperaba la sesión (dos viajes a Supabase) y luego sus datos (dos a cuatro
 * viajes más, y en la Liquidación cuatro consultas POR PERSONA), y la pestaña
 * vieja seguía marcada hasta el final. Ahora:
 *   · esta página NO espera nada antes de pintar la cabecera y las pestañas:
 *     cada vista hace `requireAdmin()` EN LA MISMA TANDA que sus lecturas
 *     (`Promise.all`) y no pinta un solo dato hasta que la sesión responde;
 *     `requireAdmin()` redirige igual que antes si no es administrador
 *     (el cascarón que alcanza a verse no lleva datos);
 *   · el contenido va en un `<Suspense>` con `key` por pestaña y parámetros:
 *     al cambiar de pestaña, de período o de persona se monta de nuevo y
 *     enseña su esqueleto (`esqueletos.tsx`) mientras llegan los datos;
 *   · la pestaña pulsada se marca en el mismo clic (`PestanasNomina`).
 * `prefetch={false}`, `app/admin/loading.tsx` y `PuntoDeCarga` siguen en su
 * sitio: son el arreglo de «el panel se traba» y esto se apoya en ellos.
 */

import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/ui";
import { PestanasNomina, type VistaNomina } from "@/components/nomina/PestanasNomina";
import { LiquidacionView } from "./liquidacion";
import { ConfiguracionView } from "./configuracion";
import { TableroView } from "./tablero";
import { EsqueletoNomina } from "./esqueletos";
import { leerPagina } from "@/lib/paginacion";

/** Depende de la sesión: nunca se cachea. */
export const dynamic = "force-dynamic";

const DESCRIPCIONES: Record<VistaNomina, string> = {
  liquidacion:
    "Lo que hay que pagarle a cada persona en el período: el sueldo, las horas y recargos que salen de las jornadas aprobadas, los bonos y descuentos que tú digitas, y el neto.",
  configuracion:
    "El salario de cada empleado, el valor de cada tipo de hora, el auxilio de transporte y los aportes de salud y pensión. Lo que guardas en un mes rige desde ese mes en adelante.",
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
    persona?: string;
    estado?: string;
    abrir?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const vista: VistaNomina =
    params.vista === "configuracion"
      ? "configuracion"
      : params.vista === "tablero"
        ? "tablero"
        : "liquidacion";

  // Una `key` distinta por pestaña y parámetros = un `<Suspense>` nuevo = el
  // esqueleto aparece en cuanto se navega (ver `esqueletos.tsx`). Las server
  // actions refrescan con los MISMOS parámetros, así que no lo disparan: el
  // formulario y su aviso se quedan donde estaban.
  const clave = [
    vista,
    params.tipo,
    params.anio,
    params.mes,
    params.quincena,
    params.empleado,
    params.persona,
    params.estado,
    params.abrir,
    params.pagina,
  ]
    .map((v) => v ?? "")
    .join("|");

  return (
    <>
      <AdminPageHeader
        title="Nómina"
        description={DESCRIPCIONES[vista]}
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Nómina" }]}
      />

      <PestanasNomina vista={vista} />

      <Suspense key={clave} fallback={<EsqueletoNomina vista={vista} />}>
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
            persona={params.persona ?? ""}
            abrir={params.abrir ?? ""}
            pagina={leerPagina(params.pagina)}
          />
        )}
      </Suspense>
    </>
  );
}
