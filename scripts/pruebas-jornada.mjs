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

/**
 * MODELO LEGAL. Nocturno 19:00–06:00 (Ley 2466/2025). Dominical = domingo o
 * festivo. Jornada ordinaria = la del horario ese día de la semana; sábado y
 * domingo 0 (la semana de 42 h ya estaba completa: todo es extra). Almuerzo:
 * la MISMA regla del sistema (política de GPI, no ley), para aislar las
 * diferencias de clasificación. Recargo dominical según la fecha de cada minuto.
 * (Los casos donde ley y sistema difieren por decisiones pendientes no se
 * comparan contra este modelo: ver el grupo 2.)
 */
function ley(inicio, fin, workDate) {
  const total = Math.round((fin - inicio) / 60_000);
  const sched = HORARIO[dowDe(workDate)];
  const festivoBase = FESTIVOS_LEY.has(workDate);
  const jornada = sched && !festivoBase ? sched[0] : 0;
  const almuerzo = sched && !festivoBase && total > 360 ? Math.min(sched[1], total) : 0;
  const limite = Math.min(total, jornada + almuerzo);
  const aD = almuerzo > 0 ? Math.max(0, Math.round((limite - almuerzo) / 2)) : -1;
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

const turno = (f0, h0, f1, h1) =>
  J.calcularJornada(J.instanteColombia(f0, h0), J.instanteColombia(f1, h1), f0);
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

grupoDe("Decisiones pendientes con GPI (P4 sábado, P5 festivo programado): comportamiento ACTUAL");

const PENDIENTES = [
  // [nombre, turno, esperado del sistema HOY, qué diría la ley]
  ["C06 sábado 19-sep 08:00–14:00 (P4)", ["2026-09-19", "08:00", "2026-09-19", "14:00"], "EDD 6h", "ED 6h"],
  ["C07 sábado 19-sep 08:00–17:00 (P4)", ["2026-09-19", "08:00", "2026-09-19", "17:00"], "EDD 9h", "ED 9h"],
  ["C10 sábado 20:00 → domingo 04:00 (P4)", ["2026-09-19", "20:00", "2026-09-20", "04:00"], "EDN 8h", "EN 4h · EDN 4h"],
  ["C12 festivo lunes 12-oct-2026 08:00–17:30 (P5)", ["2026-10-12", "08:00", "2026-10-12", "17:30"], "EDD 9.5h", "DD 8.5h · EDD 1h"],
  ["C13 festivo martes 8-dic-2026 08:00–12:00 (P5)", ["2026-12-08", "08:00", "2026-12-08", "12:00"], "EDD 4h", "DD 4h"],
  ["C19 festivo 2027: lunes 11-ene (Reyes) 08:00–17:30 (P5)", ["2027-01-11", "08:00", "2027-01-11", "17:30"], "EDD 9.5h", "DD 8.5h · EDD 1h"],
  ["C20 festivo 2027: viernes 1-ene 08:00–12:00 (P5)", ["2027-01-01", "08:00", "2027-01-01", "12:00"], "EDD 4h", "DD 4h"],
  ["C25 festivo nuevo: lunes 13-jul-2026, Chiquinquirá (P5)", ["2026-07-13", "08:00", "2026-07-13", "17:30"], "EDD 9.5h", "DD 8.5h · EDD 1h"],
];
for (const [nombre, t, hoy, legal] of PENDIENTES) {
  const d = turno(...t);
  comprobar(`${nombre} — la ley diría ${legal}`, resumen(d), hoy);
}
// Lo que SÍ se arregló: los festivos de 2027 y el del 13-jul-2026 ahora existen
// (antes esos turnos se pagaban como un día normal: 0 pesos adicionales).
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
