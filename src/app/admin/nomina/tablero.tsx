/**
 * VISTA "TABLERO" de /admin/nomina
 * ================================
 * Server Component que trae TODAS las liquidaciones (hasta 400) y las deja
 * listas para el tablero (`NominaDashboard`, Client Component): cada una con su
 * cálculo resuelto —el congelado si está cerrada, el que quedó guardado en
 * borrador si no— y el nombre de la persona.
 *
 * Aquí NO se recalcula ningún borrador contra las jornadas: eso se hace en la
 * pestaña de liquidación, una persona a la vez. El tablero es una vista de
 * histórico, y hacer una consulta de jornadas por cada liquidación de doce
 * meses sería carísimo para lo que aporta. Los borradores se pintan con lo que
 * su desglose valía la última vez que alguien abrió la liquidación... o, si
 * nunca se ha cerrado, con los conceptos manuales y el sueldo, que es lo que
 * de verdad hace falta para una serie histórica; la pantalla lo marca.
 *
 * Un borrador HUÉRFANO (su mes ya no tiene configuración) no entra en las
 * cifras: no hay con qué calcularlo, y pintarlo en cero falsearía las series.
 *
 * RENDIMIENTO (22 sep 2026): la sesión, las liquidaciones, las cuentas y TODA
 * la configuración se piden en paralelo, en una sola tanda. Antes se pedía la
 * configuración con una consulta por cada mes que tuviera un borrador, y los
 * nombres con otra consulta en serie detrás de las liquidaciones.
 */

import {
  listLiquidaciones,
  listNominaConfigsPorEmpleado,
  listProfiles,
} from "@/lib/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { hoyEnColombia } from "@/lib/jornada";
import {
  configVigente,
  minutosVacios,
  normalizarManuales,
  obtenerLiquidacion,
  tarifasVacias,
} from "@/lib/nomina";
import { NominaDashboard, type FilaHistorial } from "@/components/nomina/NominaDashboard";

export async function TableroView({
  empleadoId,
  anio,
  estado,
  tipo,
}: {
  empleadoId: string;
  anio?: string;
  estado: string;
  tipo: string;
}) {
  // Barrera autoritativa en la misma tanda que los datos (ver `liquidacion.tsx`).
  const [, liquidaciones, perfiles, configs] = await Promise.all([
    requireAdmin(),
    listLiquidaciones({ limit: 400, nombres: false }),
    listProfiles(),
    // Las configuraciones solo hacen falta para los borradores (el resto trae
    // su snapshot); la tabla es pequeña y se lee entera, de una vez.
    listNominaConfigsPorEmpleado(),
  ]);

  const nombres = new Map(perfiles.map((p) => [p.id, p.full_name]));

  const filas: FilaHistorial[] = [];
  for (const l of liquidaciones) {
    const config =
      l.estado === "borrador"
        ? configVigente(configs.porEmpleado.get(l.employee_id) ?? [], l.anio, l.mes)
        : null;
    // Huérfano: borrador sin configuración vigente. Fuera de las cifras.
    if (l.estado === "borrador" && !config) continue;

    const manuales = normalizarManuales(l.conceptos);

    const resuelta = obtenerLiquidacion(l.snapshot, () => ({
      config: {
        salarioBasico: config?.salario_basico ?? 0,
        auxTransporte: config?.aux_transporte ?? 0,
        tarifas: config?.tarifas ?? tarifasVacias(),
        pctSalud: config?.pct_salud ?? 4,
        pctPension: config?.pct_pension ?? 4,
      },
      // Sin snapshot no hay horas guardadas: el borrador se pinta con el sueldo
      // y los conceptos manuales, y el tablero lo marca como provisional.
      minutos: minutosVacios(),
      dias: l.dias_liquidados,
      manuales,
    }));

    const c = resuelta.calculo;

    filas.push({
      id: l.id,
      employeeId: l.employee_id,
      nombre: nombres.get(l.employee_id) ?? "",
      tipo: l.tipo,
      anio: l.anio,
      mes: l.mes,
      quincena: l.quincena,
      estado: l.estado,
      fechaPago: l.fecha_pago,
      congelada: resuelta.congelada,

      basico: c.basico,
      auxTransporte: c.auxTransporte,
      horas: c.totalHoras,
      otrosDevengados: c.totalDevengadosManuales,
      devengado: c.totalDevengado,
      descuentos: c.totalDescuentos,
      neto: c.neto,
    });
  }

  return (
    <NominaDashboard
      filas={filas}
      empleados={perfiles
        .filter((p) => p.active)
        .map((p) => ({ id: p.id, nombre: p.full_name }))}
      empleadoInicial={empleadoId}
      anioInicial={anio ?? ""}
      estadoInicial={estado}
      tipoInicial={tipo}
      hoy={hoyEnColombia()}
    />
  );
}
