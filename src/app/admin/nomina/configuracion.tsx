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
 *     dice de dónde salen («Configurado en este mes» / «Heredado de…»);
 *   · deja quitar el cambio de un mes (`quitarConfigMes`), que vuelve a
 *     heredar del anterior.
 */

import Link from "next/link";
import { listNominaConfigsEmpleado, listProfiles } from "@/lib/admin";
import { hoyEnColombia } from "@/lib/jornada";
import { AyudaSeccion, EmptyState } from "@/components/admin/ui";
import { estadoConfigMes, tarifasVacias, PCT_PENSION_DEFECTO, PCT_SALUD_DEFECTO } from "@/lib/nomina";
import { ConfigNominaForm } from "@/components/nomina/ConfigNominaForm";
import { quitarConfigMes, saveNominaConfig } from "./actions";

function numero(valor: string | undefined, porDefecto: number): number {
  const n = Number(valor);
  return Number.isInteger(n) ? n : porDefecto;
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

  const perfiles = (await listProfiles()).filter((p) => p.active);

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

  const { filas, error } = await listNominaConfigsEmpleado(seleccionado.id);
  const estado = estadoConfigMes(filas, anioSel, mesSel);
  const vigente = estado.vigente;

  return (
    <div className="space-y-6">
      {error === "sin-tabla" && (
        <AyudaSeccion tono="aviso" title="Faltan las tablas de nómina">
          Todavía no existen en la base de datos. Aplica la migración{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            supabase/migrations/0011_nomina.sql
          </code>{" "}
          en el SQL Editor de Supabase y vuelve a entrar.
        </AyudaSeccion>
      )}
      {error === "lectura" && (
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
        estado={{
          origen: estado.origen,
          desde: vigente ? { anio: vigente.anio, mes: vigente.mes } : null,
          alQuitar: estado.alQuitar
            ? { anio: estado.alQuitar.anio, mes: estado.alQuitar.mes }
            : null,
          siguiente: estado.siguiente
            ? { anio: estado.siguiente.anio, mes: estado.siguiente.mes }
            : null,
          cambios: estado.cambios.map((c) => ({
            anio: c.anio,
            mes: c.mes,
            salario: c.salario_basico,
          })),
          claveFuente: vigente ? `${vigente.id}-${vigente.updated_at ?? ""}` : "ninguna",
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
