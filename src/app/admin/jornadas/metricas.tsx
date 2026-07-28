/**
 * VISTA "MÉTRICAS" de /admin/jornadas
 * ===================================
 * Server Component que trae los datos y se los entrega ya masticados al tablero
 * (`JornadasDashboard`, Client Component):
 *
 *   · jornadas de los últimos 90 días, en TODOS los estados y con el nombre del
 *     empleado resuelto (RLS deja que un manager vea las de todo el equipo);
 *   · cuentas activas del equipo, para el desplegable de empleados;
 *   · los parámetros de `jornada_config` (con los valores por defecto si la
 *     base de datos no responde o la clave no existe).
 *
 * El desglose de horas de cada jornada se calcula AQUÍ, una sola vez, para no
 * enviar al navegador el cálculo minuto a minuto de cada turno.
 *
 * Si Supabase no está configurado o la consulta falla, `listJornadas` devuelve
 * un arreglo vacío y el tablero muestra un estado vacío amable: la página nunca
 * se rompe ni el build depende de la base de datos.
 */

import {
  getJornadaConfig,
  getMapaHorarios,
  listJornadas,
  listProfiles,
} from "@/lib/admin";
import { hoyEnColombia } from "@/lib/jornada";
import { construirMetrica, sumarDias } from "@/lib/jornada-metrics";
import { JornadasDashboard } from "@/components/jornadas/JornadasDashboard";

/** Ventana de datos que se envía al navegador (el filtro por defecto son 30 días). */
const DIAS_DE_HISTORIA = 90;

export async function MetricasView() {
  const hoy = hoyEnColombia();
  const rangoDesde = sumarDias(hoy, -(DIAS_DE_HISTORIA - 1));

  const [jornadas, perfiles, config, horarios] = await Promise.all([
    listJornadas({
      status: "todas",
      from: rangoDesde,
      // Sin `to`: si alguien registra un turno con fecha futura por error,
      // igual aparece en el tablero en vez de desaparecer sin explicación.
      limit: 2000,
    }),
    listProfiles(),
    getJornadaConfig(),
    getMapaHorarios(),
  ]);

  const datos = jornadas.map((j) => construirMetrica(j, config, horarios));

  // Cualquier cuenta activa puede registrar jornadas (el Community Manager
  // también es empleado de GPI), así que el filtro las incluye a todas.
  const empleados = perfiles
    .filter((p) => p.active)
    .map((p) => ({ id: p.id, nombre: p.full_name }));

  return (
    <JornadasDashboard
      jornadas={datos}
      empleados={empleados}
      config={config}
      hoy={hoy}
      rangoDesde={rangoDesde}
    />
  );
}
