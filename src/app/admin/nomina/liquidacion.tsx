/**
 * VISTA "LIQUIDACIÓN" de /admin/nomina
 * ====================================
 * Server Component que arma, para el período elegido y persona por persona,
 * todo lo que la pantalla necesita, y se lo entrega ya masticado al panel
 * (`LiquidacionPanel`, Client Component).
 *
 * Por cada cuenta activa:
 *   · su configuración del mes (salario y tarifas);
 *   · las horas del período, sumadas desde el desglose CONGELADO de sus
 *     jornadas aprobadas (`horasDelPeriodo` → `obtenerDesglose`);
 *   · su liquidación, si existe, con sus conceptos manuales;
 *   · el cálculo: **congelado** si la liquidación está cerrada o pagada, **en
 *     vivo** si está en borrador o todavía no se ha creado (así el manager ve
 *     lo que va a pagar antes de crearla).
 *
 * El cálculo se hace AQUÍ, una sola vez, para no enviar al navegador ni las
 * jornadas ni las tarifas de todo el equipo.
 */

import {
  getJornadaConfig,
  getMapaHorarios,
  horasDelPeriodo,
  listLiquidaciones,
  listProfiles,
  mapaNominaConfigs,
} from "@/lib/admin";
import { hoyEnColombia } from "@/lib/jornada";
import {
  calcularLiquidacion,
  etiquetaPeriodo,
  manualesVacios,
  minutosVacios,
  normalizarManuales,
  obtenerLiquidacion,
  rangoPeriodo,
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

/** Período por defecto: la quincena en la que estamos hoy, hora de Colombia. */
function periodoDeHoy(): { anio: number; mes: number; quincena: 1 | 2 } {
  const hoy = hoyEnColombia();
  return {
    anio: Number(hoy.slice(0, 4)),
    mes: Number(hoy.slice(5, 7)),
    quincena: Number(hoy.slice(8, 10)) <= 15 ? 1 : 2,
  };
}

function numero(valor: string | undefined, porDefecto: number): number {
  const n = Number(valor);
  return Number.isInteger(n) ? n : porDefecto;
}

export async function LiquidacionView({
  tipo,
  anio,
  mes,
  quincena,
  abrir,
}: {
  tipo?: string;
  anio?: string;
  mes?: string;
  quincena?: string;
  /** Id de la liquidación que debe abrirse nada más cargar (enlaces directos). */
  abrir: string;
}) {
  const porDefecto = periodoDeHoy();
  const tipoPeriodo: TipoPeriodo = tipo === "mes" ? "mes" : "quincena";
  const anioSel = numero(anio, porDefecto.anio);
  const mesBruto = numero(mes, porDefecto.mes);
  const mesSel = mesBruto >= 1 && mesBruto <= 12 ? mesBruto : porDefecto.mes;
  const quincenaSel: 1 | 2 | null =
    tipoPeriodo === "mes" ? null : numero(quincena, porDefecto.quincena) === 2 ? 2 : 1;

  const rango = rangoPeriodo(tipoPeriodo, anioSel, mesSel, quincenaSel);

  const [perfiles, configs, liquidaciones, jornadaConfig, horarios] =
    await Promise.all([
      listProfiles(),
      mapaNominaConfigs(anioSel, mesSel),
      listLiquidaciones({
        anio: anioSel,
        mes: mesSel,
        tipo: tipoPeriodo,
        ...(quincenaSel ? { quincena: quincenaSel } : {}),
      }),
      getJornadaConfig(),
      getMapaHorarios(),
    ]);

  const activos = perfiles.filter((p) => p.active);
  const porEmpleado = new Map(liquidaciones.map((l) => [l.employee_id, l]));

  const filas: FilaNomina[] = await Promise.all(
    activos.map(async (perfil): Promise<FilaNomina> => {
      const config = configs.get(perfil.id) ?? null;
      const liquidacion = porEmpleado.get(perfil.id) ?? null;
      const tieneConfig = !!config && config.salario_basico > 0;

      const manuales = liquidacion
        ? normalizarManuales(liquidacion.conceptos)
        : manualesVacios();
      const dias = liquidacion ? liquidacion.dias_liquidados : rango.diasSugeridos;

      // Las horas solo hacen falta para calcular EN VIVO. Si la liquidación ya
      // está cerrada, su snapshot manda y no se vuelve a consultar nada.
      const congelable = liquidacion?.estado === "cerrada" || liquidacion?.estado === "pagada";
      const horas = congelable
        ? { minutos: minutosVacios(), jornadas: 0, pendientes: 0 }
        : await horasDelPeriodo(
            perfil.id,
            rango.fechaInicio,
            rango.fechaFin,
            jornadaConfig,
            horarios,
          );

      const entradaEnVivo = () => ({
        config: {
          salarioBasico: config?.salario_basico ?? 0,
          auxTransporte: config?.aux_transporte ?? 0,
          tarifas:
            config?.tarifas ?? {
              horaBase: 0,
              rotacionNocturna: 0,
              extraDiurna: 0,
              extraNocturna: 0,
              festivo: 0,
              extraFestivoDiurna: 0,
              extraFestivoNocturna: 0,
            },
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
      };
    }),
  );

  // Primero quien tiene algo que revisar (borradores), luego por nombre.
  filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <LiquidacionPanel
      filas={filas}
      tipo={tipoPeriodo}
      anio={anioSel}
      mes={mesSel}
      quincena={quincenaSel}
      etiqueta={etiquetaPeriodo(tipoPeriodo, anioSel, mesSel, quincenaSel)}
      fechaInicio={rango.fechaInicio}
      fechaFin={rango.fechaFin}
      diasSugeridos={rango.diasSugeridos}
      hoy={hoyEnColombia()}
      abrir={abrir}
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
