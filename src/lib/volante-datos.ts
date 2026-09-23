/**
 * DATOS DEL VOLANTE DE PAGO — lo que comparten las dos rutas que lo sirven
 * =======================================================================
 * Reúne la liquidación, la configuración VIGENTE del mes (la propia o la
 * heredada, modelo «vigente desde»), las horas del período y los
 * datos de la empresa, y los deja listos para `renderVolante()`.
 *
 * SEGURIDAD
 * ---------
 * La barrera de verdad es **RLS** (migración 0011): `getLiquidacion` usa el
 * cliente ligado a la sesión, así que un manager ve cualquier liquidación y una
 * cuenta normal solo ve las SUYAS y solo cuando están `cerrada` o `pagada`. Si
 * la consulta no devuelve nada, la ruta responde 404 sin decir si existe.
 * Además, la ruta del portal vuelve a comprobar que el dueño sea quien pide.
 *
 * DE DÓNDE SALEN LAS CIFRAS
 * -------------------------
 * `obtenerLiquidacion()`, la regla de lectura única: si la liquidación está
 * cerrada manda su **snapshot congelado** y no se consulta nada más; si sigue
 * en borrador se calcula en vivo y el PDF sale marcado como BORRADOR.
 */

import {
  getAdminSettings,
  getLiquidacion,
  getNominaConfigVigente,
  horasDelPeriodo,
  parametrosLegalesNomina,
} from "@/lib/admin";
import { hoyEnColombia } from "@/lib/jornada";
import {
  derivarTarifas,
  minutosVacios,
  nombreArchivoVolante,
  normalizarManuales,
  obtenerLiquidacion,
  tarifasVacias,
} from "@/lib/nomina";
import type { DatosVolante } from "@/lib/volante";

export interface VolanteResuelto {
  datos: DatosVolante;
  archivo: string;
  /** Id del dueño, para que la ruta del portal pueda comprobarlo. */
  employeeId: string;
}

/**
 * Devuelve todo lo necesario para imprimir el volante de una liquidación, o
 * `null` si esa liquidación no existe o la sesión no puede verla.
 */
export async function resolverVolante(id: string): Promise<VolanteResuelto | null> {
  if (!id) return null;

  const liquidacion = await getLiquidacion(id);
  if (!liquidacion) return null;

  const congelada = liquidacion.estado !== "borrador";

  const [settings, config, horas, legal] = await Promise.all([
    getAdminSettings(),
    congelada
      ? Promise.resolve(null)
      : getNominaConfigVigente(liquidacion.employee_id, liquidacion.anio, liquidacion.mes),
    congelada
      ? Promise.resolve({ minutos: minutosVacios(), jornadas: 0, pendientes: 0 })
      : horasDelPeriodo(
          liquidacion.employee_id,
          liquidacion.fecha_inicio,
          liquidacion.fecha_fin,
        ),
    // La ley del mes liquidado: es la que fija las tarifas de un borrador
    // (23 sep 2026). Una liquidación cerrada no la necesita: manda su snapshot.
    congelada
      ? Promise.resolve(null)
      : parametrosLegalesNomina(liquidacion.anio, liquidacion.mes),
  ]);

  // Borrador HUÉRFANO (su mes ya no tiene configuración, 22 sep 2026): no hay
  // con qué calcularlo, y un volante en cero no le sirve a nadie. No se imprime.
  if (!congelada && !config) return null;

  const resuelta = obtenerLiquidacion(liquidacion.snapshot, () => ({
    config: {
      salarioBasico: config?.salario_basico ?? 0,
      auxTransporte: config?.aux_transporte ?? 0,
      tarifas:
        config && legal ? derivarTarifas(config.salario_basico, legal) : tarifasVacias(),
      pctSalud: config?.pct_salud ?? 4,
      pctPension: config?.pct_pension ?? 4,
    },
    minutos: horas.minutos,
    dias: liquidacion.dias_liquidados,
    manuales: normalizarManuales(liquidacion.conceptos),
  }));

  return {
    employeeId: liquidacion.employee_id,
    archivo: nombreArchivoVolante(
      liquidacion.employee_username ?? "empleado",
      liquidacion.tipo,
      liquidacion.anio,
      liquidacion.mes,
      liquidacion.quincena,
    ),
    datos: {
      empresa: settings.empresa,
      empleado: {
        nombre: liquidacion.employee_name ?? "",
        cedula: liquidacion.employee_cedula ?? null,
        cargo: liquidacion.employee_cargo ?? null,
        usuario: liquidacion.employee_username ?? null,
      },
      periodo: {
        tipo: liquidacion.tipo,
        anio: liquidacion.anio,
        mes: liquidacion.mes,
        quincena: liquidacion.quincena,
        fechaInicio: liquidacion.fecha_inicio,
        fechaFin: liquidacion.fecha_fin,
      },
      estado: liquidacion.estado,
      fechaPago: liquidacion.fecha_pago,
      dias: liquidacion.dias_liquidados,
      notas: liquidacion.notas ?? "",
      calculo: resuelta.calculo,
      jornadas: resuelta.snapshot?.jornadas ?? horas.jornadas,
      hoy: hoyEnColombia(),
    },
  };
}
