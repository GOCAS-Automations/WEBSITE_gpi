/**
 * VISTA "LIQUIDACIÓN" de /admin/nomina
 * ====================================
 * Server Component que arma, para el período elegido y persona por persona,
 * todo lo que la pantalla necesita, y se lo entrega ya masticado al panel
 * (`LiquidacionPanel`, Client Component).
 *
 * Por cada cuenta activa (o solo la del filtro `?persona=`):
 *   · su configuración VIGENTE en el mes (salario y tarifas): la guardada en
 *     ese mes o la heredada del cambio anterior más reciente («vigente desde»,
 *     `estadoConfigMes`), o ninguna si nunca se configuró o si la herencia está
 *     SUSPENDIDA (un corte). Nadie tiene que abrir el mes en Configuración para
 *     poder liquidarlo;
 *   · las horas del período, sumadas desde el desglose CONGELADO de sus
 *     jornadas aprobadas (`horasPorEmpleado` → `obtenerDesglose`);
 *   · su liquidación, si existe, con sus conceptos manuales;
 *   · el cálculo: **congelado** si la liquidación está cerrada o pagada, **en
 *     vivo** si está en borrador o todavía no se ha creado (así el manager ve
 *     lo que va a pagar antes de crearla).
 *
 * BORRADOR HUÉRFANO (22 sep 2026): un borrador cuyo mes ya no tiene
 * configuración (se creó antes de quitarla). Desde la regla de los borradores
 * no debería quedar ninguno —quitar o suspender la configuración los elimina—,
 * pero si existe uno de antes se marca (`huerfana`) y la pantalla lo enseña
 * como tal, sin cifras, con su aviso.
 *
 * El cálculo se hace AQUÍ, una sola vez, para no enviar al navegador ni las
 * jornadas ni las tarifas de todo el equipo.
 *
 * RENDIMIENTO (22 sep 2026): todo se pide EN PARALELO y en una sola tanda —la
 * sesión, las cuentas, la configuración, las liquidaciones del período, los
 * parámetros de jornada, los horarios y las jornadas del período de TODO el
 * equipo—. Antes se pedían las horas persona por persona (cuatro consultas por
 * cabeza) después de las demás, y la sesión antes que todo.
 *
 * FILTRO POR PERSONA (`?persona=<id>`): se aplica aquí, en el servidor, así
 * que los totales, los avisos, «Liquidar todos» y el CSV trabajan solo con lo
 * que se ve. Un id que no es de una cuenta activa se ignora (se ve a todos).
 */

import {
  getJornadaConfig,
  getMapaHorarios,
  horasPorEmpleado,
  leerJornadasNomina,
  listLiquidaciones,
  listNominaConfigsPorEmpleado,
  listProfiles,
  parametrosLegalesNomina,
} from "@/lib/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { hoyEnColombia } from "@/lib/jornada";
import {
  calcularLiquidacion,
  derivarTarifas,
  estadoConfigMes,
  etiquetaPeriodo,
  manualesVacios,
  minutosVacios,
  normalizarManuales,
  obtenerLiquidacion,
  periodoDeHoy,
  rangoPeriodo,
  tarifasVacias,
  type TipoPeriodo,
} from "@/lib/nomina";
import type { FilaNomina } from "@/lib/admin-types";
import { LiquidacionPanel } from "@/components/nomina/LiquidacionPanel";
import {
  cerrarLiquidacion,
  crearLiquidacion,
  eliminarLiquidacion,
  guardarConceptos,
  liquidarTodos,
  marcarPagada,
  reabrirLiquidacion,
} from "./actions";

function numero(valor: string | undefined, porDefecto: number): number {
  const n = Number(valor);
  return Number.isInteger(n) ? n : porDefecto;
}

export async function LiquidacionView({
  tipo,
  anio,
  mes,
  quincena,
  persona,
  abrir,
  pagina,
}: {
  tipo?: string;
  anio?: string;
  mes?: string;
  quincena?: string;
  /** Id del empleado del filtro; "" = todas las personas. */
  persona: string;
  /** Id de la liquidación que debe abrirse nada más cargar (enlaces directos). */
  abrir: string;
  /** Página de la tabla (`?pagina=`, 1-based). */
  pagina: number;
}) {
  // PERÍODO POR DEFECTO: si la URL no lo trae, el mes de hoy y la quincena
  // según el día, con la fecha de COLOMBIA calculada aquí, en el servidor. Lo
  // que venga en la URL manda sobre esto.
  const hoy = hoyEnColombia();
  const porDefecto = periodoDeHoy(hoy);
  const tipoPeriodo: TipoPeriodo = tipo === "mes" ? "mes" : "quincena";
  const anioSel = numero(anio, porDefecto.anio);
  const mesBruto = numero(mes, porDefecto.mes);
  const mesSel = mesBruto >= 1 && mesBruto <= 12 ? mesBruto : porDefecto.mes;
  const quincenaSel: 1 | 2 | null =
    tipoPeriodo === "mes" ? null : numero(quincena, porDefecto.quincena) === 2 ? 2 : 1;

  const rango = rangoPeriodo(tipoPeriodo, anioSel, mesSel, quincenaSel);

  // UNA sola tanda en paralelo. `requireAdmin()` es la barrera autoritativa
  // (redirige si no es administrador) y va en la misma tanda: la sesión se
  // resuelve mientras llegan los datos, y nada se pinta hasta que responde.
  const [, perfiles, configs, liquidaciones, jornadaConfig, horarios, jornadas] =
    await Promise.all([
      requireAdmin(),
      listProfiles(),
      listNominaConfigsPorEmpleado({ anio: anioSel, mes: mesSel }),
      listLiquidaciones({
        anio: anioSel,
        mes: mesSel,
        tipo: tipoPeriodo,
        ...(quincenaSel ? { quincena: quincenaSel } : {}),
        nombres: false,
      }),
      getJornadaConfig(),
      getMapaHorarios(),
      leerJornadasNomina(rango.fechaInicio, rango.fechaFin),
    ]);

  // La ley del mes (divisor con el horario del mes y recargo dominical). Desde
  // el 23 sep 2026 es lo que FIJA las tarifas de una liquidación en borrador:
  // no se leen de la configuración, se derivan del salario con esta ley. Con
  // los horarios ya leídos no consulta nada.
  const legal = await parametrosLegalesNomina(anioSel, mesSel, horarios);
  const horasEquipo = horasPorEmpleado(jornadas, jornadaConfig, horarios);

  const activos = perfiles.filter((p) => p.active);
  const personaSel = activos.some((p) => p.id === persona) ? persona : "";
  const visibles = personaSel ? activos.filter((p) => p.id === personaSel) : activos;
  const porEmpleado = new Map(liquidaciones.map((l) => [l.employee_id, l]));

  const filas: FilaNomina[] = visibles.map((perfil): FilaNomina => {
    // La que RIGE en el mes: la propia o la heredada («vigente desde»), o
    // ninguna (nunca configurada, o herencia suspendida por un corte).
    const estadoConfig = estadoConfigMes(configs.porEmpleado.get(perfil.id) ?? [], anioSel, mesSel);
    const config = estadoConfig.vigente;
    const liquidacion = porEmpleado.get(perfil.id) ?? null;
    const tieneConfig = !!config;

    const manuales = liquidacion
      ? normalizarManuales(liquidacion.conceptos)
      : manualesVacios();
    const dias = liquidacion ? liquidacion.dias_liquidados : rango.diasSugeridos;

    // Las horas solo hacen falta para calcular EN VIVO. Si la liquidación ya
    // está cerrada, su snapshot manda.
    const congelable = liquidacion?.estado === "cerrada" || liquidacion?.estado === "pagada";
    const horas = congelable
      ? { minutos: minutosVacios(), jornadas: 0, pendientes: 0 }
      : (horasEquipo.get(perfil.id) ?? { minutos: minutosVacios(), jornadas: 0, pendientes: 0 });

    const entradaEnVivo = () => ({
      config: {
        salarioBasico: config?.salario_basico ?? 0,
        auxTransporte: config?.aux_transporte ?? 0,
        tarifas: config
          ? derivarTarifas(config.salario_basico, legal)
          : tarifasVacias(),
        pctSalud: config?.pct_salud ?? 4,
        pctPension: config?.pct_pension ?? 4,
      },
      minutos: horas.minutos,
      dias,
      manuales,
    });

    const resuelta = liquidacion
      ? obtenerLiquidacion(liquidacion.snapshot, entradaEnVivo)
      : { calculo: calcularLiquidacion(entradaEnVivo()), congelada: false, snapshot: null };

    return {
      employeeId: perfil.id,
      nombre: perfil.full_name,
      usuario: perfil.username,
      cedula: perfil.cedula,
      cargo: perfil.cargo,

      liquidacionId: liquidacion?.id ?? null,
      estado: liquidacion?.estado ?? null,
      dias,
      fechaPago: liquidacion?.fecha_pago ?? null,
      notas: liquidacion?.notas ?? "",
      calculadoEn: liquidacion?.calculado_at ?? null,

      calculo: resuelta.calculo,
      congelada: resuelta.congelada,
      manuales,

      jornadas: resuelta.snapshot?.jornadas ?? horas.jornadas,
      pendientes: horas.pendientes,

      tieneConfig,
      salario: config?.salario_basico ?? 0,
      configDesde: config ? { anio: config.anio, mes: config.mes } : null,
      configHeredada: estadoConfig.origen === "heredada",
      sinConfigDesde: estadoConfig.corte
        ? { anio: estadoConfig.corte.anio, mes: estadoConfig.corte.mes }
        : null,
      huerfana: !!liquidacion && !resuelta.congelada && !tieneConfig,
    };
  });

  filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <LiquidacionPanel
      // La `key` reinicia el panel al cambiar de período o de persona: sin
      // ella, el detalle abierto, los campos con `defaultValue` y el aviso de
      // «Liquidar todos» se quedaban con lo del período anterior.
      key={`${tipoPeriodo}-${anioSel}-${mesSel}-${quincenaSel ?? "m"}-${personaSel}`}
      filas={filas}
      personas={activos
        .map((p) => ({ id: p.id, nombre: p.full_name, usuario: p.username }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))}
      persona={personaSel}
      tipo={tipoPeriodo}
      anio={anioSel}
      mes={mesSel}
      quincena={quincenaSel}
      etiqueta={etiquetaPeriodo(tipoPeriodo, anioSel, mesSel, quincenaSel)}
      fechaInicio={rango.fechaInicio}
      fechaFin={rango.fechaFin}
      diasSugeridos={rango.diasSugeridos}
      hoy={hoy}
      abrir={abrir}
      pagina={pagina}
      crearAction={crearLiquidacion}
      liquidarTodosAction={liquidarTodos}
      guardarAction={guardarConceptos}
      cerrarAction={cerrarLiquidacion}
      pagarAction={marcarPagada}
      reabrirAction={reabrirLiquidacion}
      eliminarAction={eliminarLiquidacion}
    />
  );
}
