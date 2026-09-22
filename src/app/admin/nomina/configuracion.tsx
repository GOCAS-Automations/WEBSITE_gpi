/**
 * VISTA "CONFIGURACIÓN" de /admin/nomina
 * ======================================
 * El salario, el auxilio de transporte, las siete tarifas por hora y los
 * aportes de UNA persona, **vigentes desde** el mes elegido.
 *
 * MODELO «VIGENTE DESDE» (18 sep 2026)
 * ------------------------------------
 * Lo que se guarda en un mes rige para ese mes y para todos los siguientes,
 * hasta el próximo cambio guardado de esa persona. Por eso esta vista:
 *   · **no crea nada al entrar** (antes creaba el mes copiando el anterior, o
 *     en cero si no lo había): solo lee las filas de la persona y resuelve con
 *     `estadoConfigMes()` de `src/lib/nomina.ts`, la regla única;
 *   · enseña los valores que RIGEN en el mes —los propios o los heredados— y
 *     dice de dónde salen: «Configurado en este mes», «Heredado de…» o «Sin
 *     configuración desde… (herencia suspendida)»;
 *   · deja quitar el cambio de un mes (`quitarConfigMes`), que vuelve a
 *     heredar del anterior, y —desde el 22 sep 2026— SUSPENDER LA HERENCIA en
 *     un mes que hereda (`cortarHerenciaConfig`): un corte, «sin configuración
 *     desde este mes», para un retiro o una licencia no remunerada.
 *
 * LA CONFIRMACIÓN DICE QUÉ BORRADORES SE ELIMINARÍAN
 * --------------------------------------------------
 * Quitar un cambio o suspender la herencia puede dejar meses sin
 * configuración, y los borradores de esos meses se eliminan en la misma
 * operación (`efectoEnBorradores()` de `nomina.ts`). La cuenta se hace AQUÍ,
 * con la misma función y las mismas filas que usará la acción, para que la
 * confirmación diga ANTES cuántos y de qué períodos; la acción rechaza el
 * cambio si al llegar la cuenta ya es otra.
 *
 * RENDIMIENTO (22 sep 2026): una sola tanda en paralelo —sesión, cuentas,
 * configuración de todo el equipo (tabla pequeña), horarios y borradores—.
 */

import Link from "next/link";
import {
  getMapaHorarios,
  listLiquidaciones,
  listNominaConfigsPorEmpleado,
  listProfiles,
  parametrosLegalesNomina,
} from "@/lib/admin";
import { requireAdmin } from "@/lib/supabase/auth";
import { hoyEnColombia } from "@/lib/jornada";
import { AyudaSeccion, EmptyState } from "@/components/admin/ui";
import {
  efectoEnBorradores,
  esCorte,
  estadoConfigMes,
  etiquetaPeriodoCorta,
  filasTrasCortar,
  filasTrasQuitar,
  mesAnterior,
  tarifasVacias,
  PCT_PENSION_DEFECTO,
  PCT_SALUD_DEFECTO,
  type EfectoEnBorradores,
} from "@/lib/nomina";
import type { NominaLiquidacionRecord } from "@/lib/admin-types";
import {
  ConfigNominaForm,
  type EfectoBorradoresVista,
} from "@/components/nomina/ConfigNominaForm";
import { cortarHerenciaConfig, quitarConfigMes, saveNominaConfig } from "./actions";

function numero(valor: string | undefined, porDefecto: number): number {
  const n = Number(valor);
  return Number.isInteger(n) ? n : porDefecto;
}

/** Lo que la confirmación necesita saber de la regla de los borradores. */
function aVista(
  efecto: EfectoEnBorradores<NominaLiquidacionRecord>,
): EfectoBorradoresVista {
  return {
    eliminar: efecto.eliminar.map((l) => ({
      id: l.id,
      etiqueta: etiquetaPeriodoCorta(l.tipo, l.anio, l.mes, l.quincena),
    })),
    conservar: efecto.conservar.length,
  };
}

export async function ConfiguracionView({
  empleadoId,
  anio,
  mes,
}: {
  empleadoId: string;
  anio?: string;
  mes?: string;
}) {
  const hoy = hoyEnColombia();
  const anioBruto = numero(anio, Number(hoy.slice(0, 4)));
  const anioSel = anioBruto >= 2000 && anioBruto <= 2200 ? anioBruto : Number(hoy.slice(0, 4));
  const mesBruto = numero(mes, Number(hoy.slice(5, 7)));
  const mesSel = mesBruto >= 1 && mesBruto <= 12 ? mesBruto : Number(hoy.slice(5, 7));

  // Una sola tanda en paralelo; `requireAdmin()` es la barrera autoritativa.
  const [, todos, configs, horarios, borradoresEquipo] = await Promise.all([
    requireAdmin(),
    listProfiles(),
    listNominaConfigsPorEmpleado(),
    getMapaHorarios(),
    listLiquidaciones({ estado: "borrador", nombres: false, limit: 1000 }),
  ]);
  const perfiles = todos.filter((p) => p.active);

  if (perfiles.length === 0) {
    return (
      <EmptyState
        title="No hay cuentas activas"
        description="La nómina se configura sobre las cuentas del equipo. Crea o reactiva cuentas en la sección Equipo y vuelve aquí."
      />
    );
  }

  const seleccionado =
    perfiles.find((p) => p.id === empleadoId) ?? perfiles[0];

  const filas = configs.porEmpleado.get(seleccionado.id) ?? [];
  // La ley del mes elegido: divisor (horario del mes) y recargo dominical.
  const legal = await parametrosLegalesNomina(anioSel, mesSel, horarios);
  const estado = estadoConfigMes(filas, anioSel, mesSel);
  const vigente = estado.vigente;
  const desde = vigente ?? estado.corte;
  // Si quitar el cambio deja el mes sin configuración, ¿es porque el mes
  // anterior tiene la herencia suspendida (y no porque nunca se configuró)?
  const anterior = mesAnterior(anioSel, mesSel);
  const corteAnterior = estado.alQuitar
    ? null
    : estadoConfigMes(filas, anterior.anio, anterior.mes).corte;

  // La regla de los borradores, calculada con lo mismo que usará la acción.
  const borradores = borradoresEquipo.filter((l) => l.employee_id === seleccionado.id);
  const mesActual = { anio: anioSel, mes: mesSel };
  const alQuitarBorradores = estado.cambioDelMes
    ? aVista(efectoEnBorradores(borradores, filasTrasQuitar(filas, anioSel, mesSel), mesActual))
    : null;
  const alCortarBorradores =
    estado.origen === "heredada"
      ? aVista(efectoEnBorradores(borradores, filasTrasCortar(filas, anioSel, mesSel), mesActual))
      : null;

  return (
    <div className="space-y-6">
      {configs.error === "sin-tabla" && (
        <AyudaSeccion tono="aviso" title="Faltan las tablas de nómina">
          Todavía no existen en la base de datos. Aplica la migración{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            supabase/migrations/0011_nomina.sql
          </code>{" "}
          en el SQL Editor de Supabase y vuelve a entrar.
        </AyudaSeccion>
      )}
      {configs.error === "lectura" && (
        <AyudaSeccion tono="aviso" title="No se pudo leer la configuración">
          Recarga la página. Si sigue pasando, puede que la sesión haya expirado:
          vuelve a ingresar.
        </AyudaSeccion>
      )}

      <ConfigNominaForm
        // Persona + año + mes: cambiar cualquiera monta un formulario NUEVO con
        // los valores de la base (el bug de «siguen los valores de antes»).
        key={`${seleccionado.id}-${anioSel}-${mesSel}`}
        action={saveNominaConfig}
        quitarAction={quitarConfigMes}
        cortarAction={cortarHerenciaConfig}
        empleados={perfiles.map((p) => ({
          id: p.id,
          nombre: p.full_name,
          cargo: p.cargo,
        }))}
        seleccionado={seleccionado.id}
        anio={anioSel}
        mes={mesSel}
        config={
          vigente
            ? {
                salario: vigente.salario_basico,
                auxTransporte: vigente.aux_transporte,
                tarifas: vigente.tarifas,
                pctSalud: vigente.pct_salud,
                pctPension: vigente.pct_pension,
              }
            : {
                salario: 0,
                auxTransporte: 0,
                tarifas: tarifasVacias(),
                pctSalud: PCT_SALUD_DEFECTO,
                pctPension: PCT_PENSION_DEFECTO,
              }
        }
        legal={{
          divisor: legal.divisor,
          recargoDominical: legal.recargoDominical,
          horasSemanales: legal.horasSemanales,
        }}
        estado={{
          origen: estado.origen,
          desde: desde ? { anio: desde.anio, mes: desde.mes } : null,
          cambioDelMes: estado.cambioDelMes
            ? esCorte(estado.cambioDelMes)
              ? "corte"
              : "configuracion"
            : null,
          alQuitar: estado.alQuitar
            ? { anio: estado.alQuitar.anio, mes: estado.alQuitar.mes }
            : null,
          alQuitarCorte: corteAnterior
            ? { anio: corteAnterior.anio, mes: corteAnterior.mes }
            : null,
          siguiente: estado.siguiente
            ? {
                anio: estado.siguiente.anio,
                mes: estado.siguiente.mes,
                corte: esCorte(estado.siguiente),
              }
            : null,
          cambios: estado.cambios.map((c) => ({
            anio: c.anio,
            mes: c.mes,
            salario: c.salario_basico,
            corte: esCorte(c),
          })),
          claveFuente: desde ? `${desde.id}-${desde.updated_at ?? ""}` : "ninguna",
          alQuitarBorradores,
          alCortarBorradores,
        }}
      />

      <p className="text-sm leading-relaxed text-graphite">
        Cuando la configuración esté lista, vuelve a{" "}
        <Link
          prefetch={false}
          href={`/admin/nomina?anio=${anioSel}&mes=${mesSel}`}
          className="font-semibold text-brand-dark hover:text-brand-deep"
        >
          Liquidación
        </Link>{" "}
        para crear y cerrar las liquidaciones del período. No hace falta abrir
        aquí los meses siguientes: heredan esta configuración solos.
      </p>
    </div>
  );
}
