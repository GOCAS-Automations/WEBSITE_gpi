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
 */

import { listLiquidaciones, listProfiles, mapaNominaConfigs } from "@/lib/admin";
import { hoyEnColombia } from "@/lib/jornada";
import {
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
  const [liquidaciones, perfiles] = await Promise.all([
    listLiquidaciones({ limit: 400 }),
    listProfiles(),
  ]);

  // Las configuraciones hacen falta solo para los borradores (el resto ya trae
  // su snapshot): se piden agrupadas por mes para no hacer una consulta por fila.
  const mesesConBorrador = [
    ...new Set(
      liquidaciones
        .filter((l) => l.estado === "borrador")
        .map((l) => `${l.anio}-${l.mes}`),
    ),
  ];

  const configsPorMes = new Map(
    await Promise.all(
      mesesConBorrador.map(async (clave) => {
        const [a, m] = clave.split("-").map(Number);
        return [clave, await mapaNominaConfigs(a, m)] as const;
      }),
    ),
  );

  const filas: FilaHistorial[] = liquidaciones.map((l) => {
    const config = configsPorMes.get(`${l.anio}-${l.mes}`)?.get(l.employee_id) ?? null;
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

    return {
      id: l.id,
      employeeId: l.employee_id,
      nombre: l.employee_name ?? "",
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
    };
  });

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
