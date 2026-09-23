/**
 * PRUEBAS DEL CÁLCULO DE HORAS (jornada.ts + ley-laboral.ts)
 * ==========================================================
 * Batería de la auditoría legal del 19 sep 2026: corre el código REAL de
 * `src/lib/jornada.ts` (con `horarios.ts` y `ley-laboral.ts`) y lo compara con
 * un MODELO LEGAL independiente escrito aquí, más las reglas que cambian con la
 * fecha (recargo dominical, jornada máxima, divisor, festivos de cualquier año).
 *
 * CÓMO SE EJECUTA
 *   node --experimental-strip-types scripts/pruebas-jornada.mjs
 *
 * `jornada.ts` importa con el alias `@/lib/…`, que Node no conoce: lo resuelve
 * `scripts/alias.mjs`, que se carga antes que nada.
 *
 * Tres grupos de casos:
 *   1. Los que la ley y el sistema deben clasificar IGUAL, minuto a minuto, y
 *      pagar igual (con tarifas legales y un salario redondo de ejemplo).
 *   2. Los que dependen de DECISIONES PENDIENTES con GPI (sábado como domingo,
 *      festivo en día programado; ver `docs/PLAN.md`): se fija el
 *      comportamiento ACTUAL para que cualquier cambio se note, sin darlo por
 *      bueno ni por malo.
 *   3. Las reglas por fecha y los festivos de 2026, 2027 y 2028.
 *
 * Sale con código 1 si alguna comprobación falla.
 */

import "./alias.mjs";

const J = await import("../src/lib/jornada.ts");
const N = await import("../src/lib/nomina.ts");
const L = await import("../src/lib/ley-laboral.ts");

/* ------------------------------------------------------------------ */
/* Mini arnés                                                          */
/* ------------------------------------------------------------------ */

let fallos = 0;
let pruebas = 0;
const grupoDe = (t) => console.log(`\n── ${t}`);
function comprobar(descripcion, obtenido, esperado) {
  pruebas += 1;
  if (Object.is(obtenido, esperado)) {
    console.log(`   ✓ ${descripcion} → ${obtenido}`);
  } else {
    fallos += 1;
    console.log(`   ✗ ${descripcion}\n       esperado: ${esperado}\n       obtenido: ${obtenido}`);
  }
}
function comprobarQue(descripcion, condicion, detalle = "") {
  pruebas += 1;
  if (condicion) console.log(`   ✓ ${descripcion}`);
  else {
    fallos += 1;
    console.log(`   ✗ ${descripcion}${detalle ? `\n       ${detalle}` : ""}`);
  }
}

/* ------------------------------------------------------------------ */
/* Modelo legal independiente                                          */
/* ------------------------------------------------------------------ */

/** Salario de EJEMPLO, redondo: con 42 h (÷210) la hora vale 10.000 exactos. */
const SALARIO = 2_100_000;
const VALOR_HORA = SALARIO / 210;

/** Festivos verificados a mano (Ley 51 de 1983 + Ley 2578 de 2026). */
const FESTIVOS_LEY = new Set([
  "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
  "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-13",
  "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
  "2026-11-16", "2026-12-08", "2026-12-25",
  "2027-01-01", "2027-01-11", "2027-03-22", "2027-03-25", "2027-03-26",
  "2027-05-01", "2027-05-10", "2027-05-31", "2027-06-07", "2027-07-05", "2027-07-12",
  "2027-07-20", "2027-08-07", "2027-08-16", "2027-10-18", "2027-11-01",
  "2027-11-15", "2027-12-08", "2027-12-25",
]);

/** Recargo dominical/festivo por fecha, escrito aparte del código (Ley 2466). */
const recargoLey = (f) => (f < "2025-07-01" ? 0.75 : f < "2026-07-01" ? 0.8 : f < "2027-07-01" ? 0.9 : 1);

const factorLey = (cat, d) =>
  ({
    ordinariaDiurna: 0,
    ordinariaNocturna: 0.35,
    extraDiurna: 1.25,
    extraNocturna: 1.75,
    dominicalDiurna: 1 + d,
    dominicalNocturna: 1 + d + 0.35,
    extraDominicalDiurna: 1.25 + d,
    extraDominicalNocturna: 1.75 + d,
  })[cat];

const CATS = [
  "ordinariaDiurna", "ordinariaNocturna", "extraDiurna", "extraNocturna",
  "dominicalDiurna", "dominicalNocturna", "extraDominicalDiurna", "extraDominicalNocturna",
];
const CORTO = {
  ordinariaDiurna: "OD", ordinariaNocturna: "ON", extraDiurna: "ED", extraNocturna: "EN",
  dominicalDiurna: "DD", dominicalNocturna: "DN", extraDominicalDiurna: "EDD", extraDominicalNocturna: "EDN",
};

/** Horario de GPI (42 h): L–J 8:00–17:30, V 8:00–17:00, 1 h de almuerzo. [jornada neta, almuerzo] */
const HORARIO = { 1: [510, 60], 2: [510, 60], 3: [510, 60], 4: [510, 60], 5: [480, 60], 6: null, 0: null };

const partes = (t) => {
  const d = new Date(t - 5 * 3_600_000);
  return { fecha: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes(), dow: d.getUTCDay() };
};
const dowDe = (f) => new Date(`${f}T12:00:00Z`).getUTCDay();
const esNocturno = (m) => m >= 19 * 60 || m < 6 * 60;

/** Turno nocturno = ningún minuto entre las 6:00 a. m. y las 7:00 p. m. */
const turnoNocturnoLey = (inicio, total) => {
  const primero = partes(inicio.getTime()).min;
  for (let i = 0; i < total; i++) {
    const m = (primero + i) % 1440;
    if (m >= 6 * 60 && m < 19 * 60) return false;
  }
  return total > 0;
};

/**
 * MODELO LEGAL (actualizado el 23 sep 2026 con las decisiones P4, P5 y P7 ya
 * resueltas por GPI). Nocturno 19:00–06:00 (Ley 2466/2025). **Dominical =
 * domingo o festivo, y nada más**: un sábado no lleva recargo dominical (P4).
 * Jornada ordinaria = la del horario ese día de la semana, TAMBIÉN si ese día
 * es festivo (P5); sábado y domingo, 0 (la semana de 42 h ya estaba completa:
 * todo es extra).
 *
 * Almuerzo: las tres reglas de GPI (P7), que son política de la empresa y no
 * ley, escritas aquí aparte para que un cambio en el código se note:
 *   · turno nocturno → nunca;
 *   · día programado y no festivo → solo si el turno cubre la jornada
 *     programada completa (presencia: jornada neta + almuerzo);
 *   · día no programado (sábado, domingo o festivo) → 1 h desde 8 h de turno.
 * Además se respeta el CONSUMO PREVIO del día (P6): la jornada ordinaria del
 * día es una sola y el almuerzo también.
 *
 * Recargo dominical según la fecha de cada minuto.
 */
function ley(inicio, fin, workDate, previo = { ordinariosUsados: 0, almuerzoDescontado: false }) {
  const total = Math.round((fin - inicio) / 60_000);
  const sched = HORARIO[dowDe(workDate)];
  const festivoBase = FESTIVOS_LEY.has(workDate);
  const programado = sched !== null;
  const laboral = programado && !festivoBase;
  const jornada = programado ? sched[0] : 0;
  const presencia = programado ? sched[0] + sched[1] : 0;

  let almuerzo = 0;
  if (!turnoNocturnoLey(inicio, total) && !previo.almuerzoDescontado) {
    if (laboral) {
      if (presencia > 0 && total >= presencia) almuerzo = Math.min(sched[1], total);
    } else if (total >= 480) almuerzo = Math.min(60, total);
  }

  const disponible = Math.max(0, jornada - previo.ordinariosUsados);
  const limite = disponible > 0 ? Math.min(total, disponible + almuerzo) : 0;
  const tramo = disponible > 0 ? limite : total;
  const aD = almuerzo > 0 ? Math.max(0, Math.round((tramo - almuerzo) / 2)) : -1;
  const aH = aD + almuerzo;
  const r = Object.fromEntries(CATS.map((c) => [c, 0]));
  let factorMinutos = 0;
  for (let i = 0; i < total; i++) {
    if (almuerzo > 0 && i >= aD && i < aH) continue;
    const p = partes(inicio.getTime() + i * 60_000);
    const dom = p.dow === 0 || FESTIVOS_LEY.has(p.fecha);
    const noct = esNocturno(p.min);
    const extra = i >= limite;
    const cat = dom
      ? extra ? (noct ? "extraDominicalNocturna" : "extraDominicalDiurna") : noct ? "dominicalNocturna" : "dominicalDiurna"
      : extra ? (noct ? "extraNocturna" : "extraDiurna") : noct ? "ordinariaNocturna" : "ordinariaDiurna";
    r[cat]++;
    factorMinutos += factorLey(cat, recargoLey(p.fecha));
  }
  return { r, pesos: Math.round((factorMinutos * VALOR_HORA) / 60) };
}

/** Lo que el SISTEMA paga por un turno: su desglose + la nómina con tarifas legales del mes. */
function pagoSistema(desglose, workDate) {
  const params = L.parametrosLegalesDelMes(Number(workDate.slice(0, 4)), Number(workDate.slice(5, 7)), 42);
  const liq = N.calcularLiquidacion({
    config: {
      salarioBasico: SALARIO,
      auxTransporte: 0,
      tarifas: N.derivarTarifas(SALARIO, params),
      pctSalud: 0,
      pctPension: 0,
    },
    minutos: N.sumarMinutos([desglose]),
    dias: 0,
    manuales: N.manualesVacios(),
  });
  return liq.totalHoras;
}

const turno = (f0, h0, f1, h1, previo = null) =>
  J.calcularJornada(
    J.instanteColombia(f0, h0),
    J.instanteColombia(f1, h1),
    f0,
    undefined,
    undefined,
    previo,
  );
const resumen = (d) =>
  CATS.filter((c) => d[c] > 0).map((c) => `${CORTO[c]} ${+(d[c] / 60).toFixed(2)}h`).join(" · ") || "—";

/* ================================================================== */
/* 1. Ley y sistema coinciden: clasificación y pago                    */
/* ================================================================== */

grupoDe("Casos que deben coincidir con la ley minuto a minuto (y en pesos)");

const COINCIDEN = [
  ["C01 lunes 14-sep-2026 08:00–17:30", "2026-09-14", "08:00", "2026-09-14", "17:30"],
  ["C02 lunes 07:30–19:00 (2 h extra diurnas)", "2026-09-14", "07:30", "2026-09-14", "19:00"],
  ["C03 lunes 08:00–19:30 (la extra cruza las 19:00)", "2026-09-14", "08:00", "2026-09-14", "19:30"],
  ["C04 viernes 18-sep 08:00–18:00 (horario hasta las 17:00)", "2026-09-18", "08:00", "2026-09-18", "18:00"],
  ["C05 martes 08:00–22:00 (más que el tope de 2 h: se paga todo)", "2026-09-15", "08:00", "2026-09-15", "22:00"],
  ["C08 domingo 13-sep 08:00–14:00", "2026-09-13", "08:00", "2026-09-13", "14:00"],
  ["C09 domingo 13-sep 18:00–23:00", "2026-09-13", "18:00", "2026-09-13", "23:00"],
  ["C11 domingo 20:00 → lunes 04:00", "2026-09-20", "20:00", "2026-09-21", "04:00"],
  ["C14 jueves 6-ago 14:00 → viernes 7-ago (festivo) 02:00", "2026-08-06", "14:00", "2026-08-07", "02:00"],
  ["C15 nocturno miércoles 22:00 → jueves 06:00", "2026-09-16", "22:00", "2026-09-17", "06:00"],
  ["C16 almuerzo: lunes 08:00–14:00 (6 h, no se descuenta)", "2026-09-14", "08:00", "2026-09-14", "14:00"],
  ["C17 almuerzo: lunes 08:00–14:01 (salto de la regla, decisión pendiente)", "2026-09-14", "08:00", "2026-09-14", "14:01"],
  ["C18 almuerzo: lunes 08:00–15:00 (7 h)", "2026-09-14", "08:00", "2026-09-14", "15:00"],
  ["C21 domingo 21-jun-2026 08:00–14:00 (recargo 80 %)", "2026-06-21", "08:00", "2026-06-21", "14:00"],
  ["C22 domingo 5-jul-2026 08:00–14:00 (recargo 90 %)", "2026-07-05", "08:00", "2026-07-05", "14:00"],
  ["C23 domingo 4-jul-2027 08:00–14:00 (recargo 100 %)", "2027-07-04", "08:00", "2027-07-04", "14:00"],

  /* --- P4, P5 y P7 resueltos (23 sep 2026): ya coinciden con la ley --- */
  ["C06 sábado 19-sep 08:00–14:00 (P4: extra NORMAL)", "2026-09-19", "08:00", "2026-09-19", "14:00"],
  ["C07 sábado 19-sep 08:00–17:00 (P4 + almuerzo de 8 h)", "2026-09-19", "08:00", "2026-09-19", "17:00"],
  ["C10 sábado 20:00 → domingo 04:00 (P4: cambia a festivo a medianoche)", "2026-09-19", "20:00", "2026-09-20", "04:00"],
  ["C12 festivo lunes 12-oct-2026 08:00–17:30 (P5)", "2026-10-12", "08:00", "2026-10-12", "17:30"],
  ["C13 festivo martes 8-dic-2026 08:00–12:00 (P5)", "2026-12-08", "08:00", "2026-12-08", "12:00"],
  ["C19 festivo 2027: lunes 11-ene (Reyes) 08:00–17:30 (P5)", "2027-01-11", "08:00", "2027-01-11", "17:30"],
  ["C20 festivo 2027: viernes 1-ene 08:00–12:00 (P5)", "2027-01-01", "08:00", "2027-01-01", "12:00"],
  ["C25 festivo nuevo: lunes 13-jul-2026, Chiquinquirá (P5)", "2026-07-13", "08:00", "2026-07-13", "17:30"],
  ["C26 borde P7: lunes 08:00–17:29 (un minuto menos que la jornada)", "2026-09-14", "08:00", "2026-09-14", "17:29"],
  ["C27 borde P7: viernes 08:00–17:00 (justo la jornada del viernes)", "2026-09-18", "08:00", "2026-09-18", "17:00"],
  ["C28 borde P7: sábado 08:00–16:00 (8 h justas)", "2026-09-19", "08:00", "2026-09-19", "16:00"],
  ["C29 borde P7: sábado 08:00–15:59 (un minuto menos de 8 h)", "2026-09-19", "08:00", "2026-09-19", "15:59"],
  ["C30 P7: turno nocturno sábado 20:00 → domingo 06:00", "2026-09-19", "20:00", "2026-09-20", "06:00"],
  ["C31 P7: lunes 16:00 → martes 02:00 (NO es turno nocturno)", "2026-09-14", "16:00", "2026-09-15", "02:00"],
];

for (const [nombre, f0, h0, f1, h1] of COINCIDEN) {
  const sis = turno(f0, h0, f1, h1);
  const l = ley(new Date(J.instanteColombia(f0, h0)), new Date(J.instanteColombia(f1, h1)), f0);
  const iguales = CATS.every((c) => sis[c] === l.r[c]);
  comprobarQue(`${nombre}: ${resumen(sis)}`, iguales, `ley: ${resumen(l.r)}`);
  const pago = pagoSistema(sis, f0);
  // La nómina redondea línea por línea; el modelo, al final: ±3 pesos.
  comprobarQue(
    `   … y paga lo mismo que la ley: ${pago.toLocaleString("es-CO")} (ley ${l.pesos.toLocaleString("es-CO")})`,
    Math.abs(pago - l.pesos) <= 3,
  );
}

/* ================================================================== */
/* 2. Decisiones pendientes con GPI: comportamiento actual fijado      */
/* ================================================================== */

grupoDe("Decisiones resueltas por GPI el 23 sep 2026 (P4 sábado, P5 festivo programado, P7 almuerzo)");

const RESUELTAS = [
  // [nombre, turno, lo que debe dar AHORA, lo que daba ANTES del cambio]
  ["P4 sábado 19-sep 08:00–14:00", ["2026-09-19", "08:00", "2026-09-19", "14:00"], "ED 6h", "EDD 6h"],
  ["P4 sábado 19-sep 08:00–17:00 (9 h: descuenta 1 h de almuerzo)", ["2026-09-19", "08:00", "2026-09-19", "17:00"], "ED 8h", "EDD 9h"],
  ["P4 sábado 20:00 → domingo 04:00 (el domingo sí es festivo)", ["2026-09-19", "20:00", "2026-09-20", "04:00"], "EN 4h · EDN 4h", "EDN 8h"],
  ["P5 festivo lunes 12-oct-2026 08:00–17:30", ["2026-10-12", "08:00", "2026-10-12", "17:30"], "DD 8.5h", "EDD 9.5h"],
  ["P5 festivo martes 8-dic-2026 08:00–12:00", ["2026-12-08", "08:00", "2026-12-08", "12:00"], "DD 4h", "EDD 4h"],
  ["P5 festivo lunes 11-ene-2027 (Reyes) 08:00–17:30", ["2027-01-11", "08:00", "2027-01-11", "17:30"], "DD 8.5h", "EDD 9.5h"],
  ["P5 festivo viernes 1-ene-2027 08:00–12:00", ["2027-01-01", "08:00", "2027-01-01", "12:00"], "DD 4h", "EDD 4h"],
  ["P5 festivo lunes 13-jul-2026 (Chiquinquirá) 08:00–17:30", ["2026-07-13", "08:00", "2026-07-13", "17:30"], "DD 8.5h", "EDD 9.5h"],
  ["P5 festivo lunes 12-oct 08:00–19:30 (el exceso sí es extra festiva)", ["2026-10-12", "08:00", "2026-10-12", "19:30"], "DD 8.5h · EDD 1.5h · EDN 0.5h", "EDD 9.5h · EDN 1h"],
  ["P7 lunes 08:00–17:30 (justo la jornada: sí descuenta)", ["2026-09-14", "08:00", "2026-09-14", "17:30"], "OD 8.5h", "OD 8.5h"],
  ["P7 lunes 08:00–17:29 (un minuto menos: NO descuenta)", ["2026-09-14", "08:00", "2026-09-14", "17:29"], "OD 8.5h · ED 0.98h", "OD 8.5h · ED 0.48h"],
  ["P7 lunes 08:00–14:01 (se acabó el salto de las 6 h)", ["2026-09-14", "08:00", "2026-09-14", "14:01"], "OD 6.02h", "OD 5.02h"],
  ["P7 lunes 08:00–15:00 (7 h: no cubre la jornada)", ["2026-09-14", "08:00", "2026-09-14", "15:00"], "OD 7h", "OD 6h"],
  ["P7 viernes 08:00–17:00 (justo la jornada del viernes)", ["2026-09-18", "08:00", "2026-09-18", "17:00"], "OD 8h", "OD 8h"],
  ["P7 sábado 08:00–16:00 (8 h justas: descuenta)", ["2026-09-19", "08:00", "2026-09-19", "16:00"], "ED 7h", "EDD 8h"],
  ["P7 sábado 08:00–15:59 (un minuto menos: no descuenta)", ["2026-09-19", "08:00", "2026-09-19", "15:59"], "ED 7.98h", "EDD 7.98h"],
  ["P7 turno nocturno 20:00 → 06:00 (nunca descuenta)", ["2026-09-19", "20:00", "2026-09-20", "06:00"], "EN 4h · EDN 6h", "EDN 10h"],
  ["P7 miércoles 22:00 → jueves 06:00 (turno nocturno)", ["2026-09-16", "22:00", "2026-09-17", "06:00"], "ON 8h", "ON 7h"],
  ["P7 lunes 16:00 → martes 02:00 (NO es nocturno: sí descuenta)", ["2026-09-14", "16:00", "2026-09-15", "02:00"], "OD 3h · ON 5.5h · EN 0.5h", "OD 3h · ON 5.5h · EN 0.5h"],
];
for (const [nombre, t, ahora, antes] of RESUELTAS) {
  const d = turno(...t);
  comprobar(`${nombre} — antes daba ${antes}`, resumen(d), ahora);
}

comprobarQue(
  "un sábado ya NO se marca como dominical/festivo",
  turno("2026-09-19", "08:00", "2026-09-19", "14:00").esDominicalFestivo === false,
);
comprobarQue(
  "un festivo en día programado SÍ tiene jornada ordinaria",
  turno("2026-10-12", "08:00", "2026-10-12", "17:30").jornadaOrdinariaMinutos === 510,
);
comprobarQue(
  "un sábado NO tiene jornada programada",
  turno("2026-09-19", "08:00", "2026-09-19", "14:00").diaProgramado === false,
);
comprobarQue(
  "esTurnoNocturno: 20:00–06:00 sí; 16:00–02:00 no; 08:00–17:30 no",
  J.esTurnoNocturno(new Date(J.instanteColombia("2026-09-19", "20:00")), 600) === true &&
    J.esTurnoNocturno(new Date(J.instanteColombia("2026-09-14", "16:00")), 600) === false &&
    J.esTurnoNocturno(new Date(J.instanteColombia("2026-09-14", "08:00")), 570) === false,
);

/* ---- P6 completo: dos jornadas el mismo día ---- */

grupoDe("Dos jornadas el mismo día (P6): la jornada ordinaria y el almuerzo son UNO solo");

const diaA = turno("2026-09-14", "06:00", "2026-09-14", "12:00");
comprobar("1.ª jornada del lunes, 06:00–12:00", resumen(diaA), "OD 6h");
const previoA = J.acumularConsumo([diaA]);
comprobar("consumo previo tras la 1.ª: minutos ordinarios", previoA.ordinariosUsados, 360);
comprobar("consumo previo tras la 1.ª: ¿almuerzo?", previoA.almuerzoDescontado, false);

const diaB = turno("2026-09-14", "14:00", "2026-09-14", "20:00", previoA);
comprobar(
  "2.ª jornada 14:00–20:00 con el consumo previo (antes daba OD 6h y se perdían las extras)",
  resumen(diaB),
  "OD 2.5h · ED 2.5h · EN 1h",
);
comprobar(
  "… y sin el consumo previo todo sería ordinario (se perderían las extras)",
  resumen(turno("2026-09-14", "14:00", "2026-09-14", "20:00")),
  "OD 5h · ON 1h",
);
comprobar(
  "la 2.ª jornada declara lo ya usado del día",
  diaB.ordinariasPreviasMinutos,
  360,
);
comprobarQue(
  "las dos jornadas juntas no pasan de la jornada ordinaria del día (8,5 h)",
  diaA.ordinarias + diaB.ordinarias === 510,
  `${diaA.ordinarias} + ${diaB.ordinarias}`,
);
// La ley (modelo independiente) dice lo mismo para la segunda jornada.
{
  const l = ley(
    new Date(J.instanteColombia("2026-09-14", "14:00")),
    new Date(J.instanteColombia("2026-09-14", "20:00")),
    "2026-09-14",
    previoA,
  );
  comprobarQue(
    "   … y coincide con el modelo legal independiente",
    CATS.every((c) => diaB[c] === l.r[c]),
    `ley: ${resumen(l.r)}`,
  );
}

const almuerzoA = turno("2026-09-14", "05:00", "2026-09-14", "15:00");
comprobar("1.ª jornada larga 05:00–15:00 descuenta 1 h de almuerzo", almuerzoA.almuerzoMinutos, 60);
const previoAlmuerzo = J.acumularConsumo([almuerzoA]);
comprobar("el consumo previo recuerda el almuerzo", previoAlmuerzo.almuerzoDescontado, true);
const almuerzoB = turno("2026-09-14", "16:00", "2026-09-14", "22:00", previoAlmuerzo);
comprobar("la 2.ª jornada NO vuelve a descontar almuerzo", almuerzoB.almuerzoMinutos, 0);
comprobar("… y todo lo suyo es extra (la jornada del día ya se agotó)", resumen(almuerzoB), "ED 3h · EN 3h");

/* ---- Lo que ya se había arreglado antes ---- */
// Los festivos de 2027 y el del 13-jul-2026 existen (antes esos turnos se
// pagaban como un día normal: 0 pesos adicionales).
comprobar("C19: el 11-ene-2027 ya se reconoce como festivo", turno("2027-01-11", "08:00", "2027-01-11", "17:30").festivos.join(), "Día de los Reyes Magos");
comprobar(
  "C25: el 13-jul-2026 ya se reconoce como festivo",
  turno("2026-07-13", "08:00", "2026-07-13", "17:30").festivos.join(),
  "Nuestra Señora del Rosario de Chiquinquirá",
);

/* ================================================================== */
/* 3. Recargo dominical por fecha en horasEquivalentes y el contexto   */
/* ================================================================== */

grupoDe("Recargo dominical según la fecha (no mueve dinero, pero es coherente)");

// 6 h de extra dominical diurna: 6 × (1 + 0,25 + d).
comprobar("C21 jun-2026 (d = 0,80): 6 × 2,05", turno("2026-06-21", "08:00", "2026-06-21", "14:00").horasEquivalentes, 12.3);
comprobar("C22 jul-2026 (d = 0,90): 6 × 2,15", turno("2026-07-05", "08:00", "2026-07-05", "14:00").horasEquivalentes, 12.9);
comprobar("C23 jul-2027 (d = 1,00): 6 × 2,25", turno("2027-07-04", "08:00", "2027-07-04", "14:00").horasEquivalentes, 13.5);
comprobar("contexto congelado de un domingo de sep-2026 guarda d = 0,90", J.construirContextoCalculo("2026-09-13").recargos.dominicalFestivo, 0.9);
comprobar("… y la extra dominical diurna 1,15 (0,25 + d)", J.construirContextoCalculo("2026-09-13").recargos.extraDominicalDiurna, 1.15);
comprobar("contexto de jun-2026 guarda d = 0,80", J.construirContextoCalculo("2026-06-21").recargos.dominicalFestivo, 0.8);

/* ================================================================== */
/* 4. Reglas por fecha de ley-laboral.ts                               */
/* ================================================================== */

grupoDe("Recargo dominical, jornada máxima y divisor por fecha");

for (const [f, d] of [["2025-06-30", 0.75], ["2025-07-01", 0.8], ["2026-06-30", 0.8], ["2026-07-01", 0.9], ["2027-06-30", 0.9], ["2027-07-01", 1]]) {
  comprobar(`recargo dominical el ${f}`, L.recargoDominicalVigente(f), d);
}
for (const [f, h] of [["2023-07-14", 48], ["2023-07-15", 47], ["2024-07-15", 46], ["2025-07-15", 44], ["2026-07-14", 44], ["2026-07-15", 42]]) {
  comprobar(`jornada máxima el ${f}`, L.horasSemanalesLegales(f), h);
}
for (const [h, div] of [[48, 240], [47, 235], [46, 230], [44, 220], [42, 210]]) {
  comprobar(`divisor con ${h} h semanales`, L.divisorHorasMes(h), div);
}

/* ================================================================== */
/* 5. Festivos para cualquier año                                      */
/* ================================================================== */

grupoDe("Festivos de Colombia calculados (Ley 51 de 1983 + Ley 2578 de 2026)");

/** La tabla que el sistema tenía escrita a mano para 2026 (18 días). */
const TABLA_2026_ANTERIOR = [
  "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01",
  "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-20", "2026-08-07",
  "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25",
];
const LISTA_2027 = [
  "2027-01-01", "2027-01-11", "2027-03-22", "2027-03-25", "2027-03-26", "2027-05-01",
  "2027-05-10", "2027-05-31", "2027-06-07", "2027-07-05", "2027-07-12", "2027-07-20",
  "2027-08-07", "2027-08-16", "2027-10-18", "2027-11-01", "2027-11-15", "2027-12-08", "2027-12-25",
];
const LISTA_2028 = [
  "2028-01-01", "2028-01-10", "2028-03-20", "2028-04-13", "2028-04-14", "2028-05-01",
  "2028-05-29", "2028-06-19", "2028-06-26", "2028-07-03", "2028-07-10", "2028-07-20",
  "2028-08-07", "2028-08-21", "2028-10-16", "2028-11-06", "2028-11-13", "2028-12-08", "2028-12-25",
];
const claves = (anio) => Object.keys(L.festivosDelAnio(anio)).join(",");
comprobar(
  "2026 = la tabla anterior + 13-jul (Chiquinquirá)",
  claves(2026),
  [...TABLA_2026_ANTERIOR, "2026-07-13"].sort().join(","),
);
comprobar("2027 = lista verificada (19)", claves(2027), LISTA_2027.join(","));
comprobar("2028 = lista verificada (19)", claves(2028), LISTA_2028.join(","));
comprobarQue(
  "2025 no tiene el de Chiquinquirá (la Ley 2578 rige desde 2026)",
  !Object.values(L.festivosDelAnio(2025)).some((n) => n.includes("Chiquinquirá")),
);
comprobar(
  "dos festivos el mismo lunes se nombran juntos (30-jun-2025)",
  J.nombreFestivo("2025-06-30"),
  "Sagrado Corazón de Jesús / San Pedro y San Pablo",
);
comprobar("Pascua 2027", L.domingoDePascua(2027), "2027-03-28");
comprobar("nombreFestivo en 2030 también funciona", J.nombreFestivo("2030-01-01"), "Año Nuevo");
comprobar("un día normal no es festivo", J.nombreFestivo("2027-01-12"), null);
comprobar("festivo en sábado no se traslada (1-may-2027)", J.nombreFestivo("2027-05-01"), "Día del Trabajo");

/* ------------------------------------------------------------------ */

console.log(`\n${fallos === 0 ? "✓ TODO EN VERDE" : "✗ HAY FALLOS"} — ${pruebas - fallos}/${pruebas} comprobaciones correctas\n`);
process.exit(fallos === 0 ? 0 : 1);
