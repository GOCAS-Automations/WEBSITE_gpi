/**
 * VISTA "CONFIGURACIÓN" de /admin/nomina
 * ======================================
 * El salario, el auxilio de transporte, las siete tarifas por hora y los
 * aportes de UNA persona en UN mes.
 *
 * Al entrar a un mes que todavía no existe, `asegurarNominaConfig` lo CREA
 * copiando el del mes anterior (mismo patrón de `/admin/horarios`). La pantalla
 * avisa de dónde salió para que nadie se lleve una sorpresa.
 */

import Link from "next/link";
import { asegurarNominaConfig, listProfiles } from "@/lib/admin";
import { hoyEnColombia } from "@/lib/jornada";
import { AyudaSeccion, EmptyState } from "@/components/admin/ui";
import { nombreMesNomina } from "@/lib/nomina";
import { ConfigNominaForm } from "@/components/nomina/ConfigNominaForm";
import { saveNominaConfig } from "./actions";

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
  const anioSel = numero(anio, Number(hoy.slice(0, 4)));
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

  const { config, origen, copiadoDe } = await asegurarNominaConfig(
    seleccionado.id,
    anioSel,
    mesSel,
  );

  return (
    <div className="space-y-6">
      {origen === "mes-anterior" && copiadoDe && (
        <AyudaSeccion title="Copiado del mes anterior">
          Se creó la configuración de <strong>{seleccionado.full_name}</strong>{" "}
          para <strong>{nombreMesNomina(mesSel)} de {anioSel}</strong> a partir de{" "}
          <strong>
            {nombreMesNomina(copiadoDe.mes)} de {copiadoDe.anio}
          </strong>
          . Revísala y ajústala si hubo aumento, y guarda.
        </AyudaSeccion>
      )}

      {origen === "sugerida" && (
        <AyudaSeccion title="Primera configuración de esta persona">
          <strong>{seleccionado.full_name}</strong> no tenía nómina configurada.
          Escribe su <strong>salario básico mensual</strong>: las siete tarifas se
          calculan solas a partir de él y después puedes ajustar la que quieras.
          No olvides pulsar <strong>Guardar</strong>.
        </AyudaSeccion>
      )}

      {origen === "sin-guardar" && (
        <AyudaSeccion tono="aviso" title="Todavía no se pudo guardar en la base de datos">
          Abajo ves la configuración propuesta, pero no está guardada. Si al
          pulsar Guardar falla, es porque falta aplicar la migración{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            supabase/migrations/0011_nomina.sql
          </code>{" "}
          en el SQL Editor de Supabase.
        </AyudaSeccion>
      )}

      <ConfigNominaForm
        action={saveNominaConfig}
        empleados={perfiles.map((p) => ({
          id: p.id,
          nombre: p.full_name,
          cargo: p.cargo,
        }))}
        seleccionado={seleccionado.id}
        anio={anioSel}
        mes={mesSel}
        config={{
          salario: config.salario_basico,
          auxTransporte: config.aux_transporte,
          tarifas: config.tarifas,
          pctSalud: config.pct_salud,
          pctPension: config.pct_pension,
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
        para crear y cerrar las liquidaciones del período.
      </p>
    </div>
  );
}
