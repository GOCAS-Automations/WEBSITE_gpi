/**
 * /admin/horarios — HORARIO LABORAL DE CADA MES
 * =============================================
 * GPI define su jornada mes a mes (a veces cambia). Esta pantalla es la fuente
 * de verdad de qué cuenta como jornada ordinaria: lo que un empleado trabaje
 * por encima del horario del mes se calcula como hora extra.
 *
 * Comportamiento:
 *  · El mes viaja en la URL (`?anio=2026&mes=8`), así que se puede compartir el
 *    enlace y la navegación ← → funciona sin JavaScript.
 *  · Si el mes todavía no existe se AUTOCREA al entrar, clonando el mes
 *    anterior si está cargado o, si no, con el horario predeterminado de GPI.
 *    La pantalla lo avisa para que nadie se lleve una sorpresa.
 *
 * Acceso: admin y coordinador (`requireManager`, barrera autoritativa).
 */

import Link from "next/link";
import { asegurarHorarioMensual, getJornadaConfig } from "@/lib/admin";
import { requireManager } from "@/lib/supabase/auth";
import { AdminPageHeader, Card, EmptyState } from "@/components/admin/ui";
import {
  etiquetaMes,
  hoyMesEnColombia,
  mesAnterior,
  mesSiguiente,
  minutosSemanales,
  normalizarMes,
  resumenHorario,
  formatearHorasDecimales,
} from "@/lib/horarios";
import { ChevronLeft, ChevronRight, Info } from "@/lib/icons";
import { HorarioEditor } from "./HorarioEditor";
import { saveHorarioMensual } from "./actions";

/** Depende de la sesión y crea el mes al entrar: nunca se cachea. */
export const dynamic = "force-dynamic";

export default async function AdminHorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  // Barrera autoritativa: solo admin y coordinador.
  await requireManager();

  const filtros = await searchParams;
  const actual = normalizarMes(filtros.anio, filtros.mes, hoyMesEnColombia());

  const [{ horario, origen, clonadoDe }, config] = await Promise.all([
    asegurarHorarioMensual(actual.anio, actual.mes),
    getJornadaConfig(),
  ]);

  const etiqueta = etiquetaMes(actual.anio, actual.mes);
  const anterior = mesAnterior(actual);
  const siguiente = mesSiguiente(actual);
  const enlace = (m: { anio: number; mes: number }) =>
    `/admin/horarios?anio=${m.anio}&mes=${m.mes}`;

  return (
    <>
      <AdminPageHeader
        title="Horario laboral del mes"
        description="Define en qué horario trabaja el equipo cada mes. De aquí sale la jornada ordinaria: lo que se trabaje por encima cuenta como hora extra."
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Horarios" }]}
      />

      {/* ---------------- Navegación de meses ---------------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-soft">
        <Link
          href={enlace(anterior)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          <ChevronLeft className="h-4 w-4" />
          {etiquetaMes(anterior.anio, anterior.mes)}
        </Link>

        <p className="text-center text-lg font-extrabold capitalize text-ink">
          {etiqueta}
        </p>

        <Link
          href={enlace(siguiente)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          {etiquetaMes(siguiente.anio, siguiente.mes)}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* ---------------- Avisos ---------------- */}
      {origen === "mes-anterior" && clonadoDe && (
        <Aviso tono="brand">
          Se creó el horario de <strong>{etiqueta}</strong> a partir de{" "}
          <strong>{etiquetaMes(clonadoDe.anio, clonadoDe.mes)}</strong>; ajústalo
          si cambió.
        </Aviso>
      )}

      {origen === "predeterminado" && (
        <Aviso tono="brand">
          Se creó el horario de <strong>{etiqueta}</strong> a partir del{" "}
          <strong>horario predeterminado de GPI</strong>; ajústalo si cambió.
        </Aviso>
      )}

      {origen === "sin-guardar" && (
        <Aviso tono="amber">
          Este mes todavía <strong>no está guardado</strong> en la base de datos.
          Abajo ves el horario propuesto (
          {resumenHorario(horario.dias)}): revísalo y pulsa{" "}
          <strong>Guardar horario</strong>. Si el guardado falla, es porque falta
          aplicar la migración{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            supabase/migrations/0003_horarios_mensuales.sql
          </code>{" "}
          en el SQL Editor de Supabase.
        </Aviso>
      )}

      {/* ---------------- Editor ---------------- */}
      <HorarioEditor
        action={saveHorarioMensual}
        anio={actual.anio}
        mes={actual.mes}
        etiqueta={etiqueta}
        diasIniciales={horario.dias}
        notasIniciales={horario.notas ?? ""}
        horarioPorDefecto={config.horarioSemanal}
      />

      {/* ---------------- Ayuda ---------------- */}
      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <Info className="h-4 w-4 text-brand-dark" />
          Cómo se usa este horario
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-graphite">
          <li>
            <strong>Jornada ordinaria.</strong> Para cada jornada que registra el
            equipo se busca el horario del mes en que se trabajó y se toma el día
            de la semana. La jornada ordinaria de ese día es{" "}
            <em>salida − entrada − almuerzo</em>.
          </li>
          <li>
            <strong>Horas extra.</strong> Todo lo que exceda esa jornada se
            calcula como extra, con el recargo que corresponda (diurna,
            nocturna, dominical o festiva).
          </li>
          <li>
            <strong>Días no laborales y festivos.</strong> Si el día está marcado
            como no laboral (sábado y domingo, por defecto) o es festivo
            nacional, todo el turno se trata con el recargo dominical/festivo.
          </li>
          <li>
            <strong>Almuerzo.</strong> No cuenta como tiempo trabajado. Como el
            empleado solo registra su entrada y su salida, el sistema descuenta
            el almuerzo del día cuando el turno dura más de 6 horas en un día
            laboral. Es una regla pragmática: <em>GPI debe confirmarla</em>.
          </li>
          <li>
            El horario semanal <strong>predeterminado</strong> (el que se usa al
            crear meses nuevos) es lunes a jueves 8:00 a. m. – 5:30 p. m.,
            viernes 8:00 a. m. – 5:00 p. m., 1 hora de almuerzo:{" "}
            <strong>
              {formatearHorasDecimales(minutosSemanales(config.horarioSemanal))}
            </strong>{" "}
            semanales netas.
          </li>
        </ul>
      </Card>

      {minutosSemanales(horario.dias) === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Este mes no tiene ningún día laboral"
            description="Los siete días están marcados como no laborales, así que todas las horas que registre el equipo en este mes se calcularán con recargo dominical/festivo. Si no es lo que quieres, enciende los días de trabajo arriba y guarda."
          />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function Aviso({
  tono,
  children,
}: {
  tono: "brand" | "amber";
  children: React.ReactNode;
}) {
  return (
    <p
      role="status"
      className={`mb-6 flex items-start gap-2.5 rounded-2xl border px-5 py-4 text-sm leading-relaxed ${
        tono === "brand"
          ? "border-brand/30 bg-brand-tint text-brand-deep"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
