/**
 * PRUEBAS DEL CÁLCULO DE NÓMINA
 * =============================
 * Comprueba `src/lib/nomina.ts` —el módulo puro que liquida un período— contra
 * el **volante de referencia de GPI** (una quincena de septiembre de 2026, con
 * las tarifas de su Excel; anonimizado: el repositorio es público), más el
 * resto de reglas del módulo (mapeo del desglose de
 * jornadas, composición de la hora festiva nocturna, snapshot congelado y
 * períodos). Desde el 18 sep 2026 prueba además:
 *   · `src/lib/dinero.ts`, el módulo ÚNICO de formato y lectura de dinero en
 *     formato colombiano (punto de miles, coma decimal) que usan el campo del
 *     panel, las server actions y el volante — con el caso del bug de las
 *     tarifas ×100 y el caso ambiguo de un solo punto;
 *   · la resolución «vigente desde» de la configuración mensual
 *     (`configVigente` / `estadoConfigMes` de `nomina.ts`).
 * Y desde el 19 sep 2026:
 *   · el período que se preselecciona sin período en la URL (`periodoDeHoy`);
 *   · `src/lib/paginacion.ts`, la regla de 10 filas por página de las tablas
 *     del panel (también módulo puro, sin importaciones);
 *   · las tarifas con la LEY del mes (divisor 210 con 42 h, recargo dominical
 *     por fecha), contra `src/lib/ley-laboral.ts` (auditoría legal del 19 sep
 *     2026). Desde el 23 sep 2026 esas tarifas ya no se digitan: se derivan
 *     siempre, así que aquí se comprueba que cambian solas al cambiar la ley
 *     (sep-2026 → jul-2027) y que la presentación «Jornada laboral: N días»
 *     cuadra con los totales.
 * Y desde el 22 sep 2026:
 *   · el CORTE de configuración («dejar sin configuración desde este mes»,
 *     migración 0013) dentro de `configVigente` / `estadoConfigMes`;
 *   · la REGLA DE LOS BORRADORES al quitar o suspender la configuración
 *     (`efectoEnBorradores`): qué borradores se eliminan, cuáles se conservan
 *     y que las cerradas y pagadas no se tocan nunca.
 * Y desde el 23 sep 2026:
 *   · el DESCUENTO POR FALTAS NO REMUNERADAS (`faltasDelPeriodo` de
 *     `src/lib/permisos.ts` y su conversión a pesos en `nomina.ts`): el día y
 *     el domingo de esa semana, un solo domingo por semana, el sábado, los
 *     permisos por horas prorrateados, lo que NO descuenta, el domingo que cae
 *     en la otra quincena y que una liquidación cerrada no se mueve.
 *
 * El cálculo de HORAS (`jornada.ts`) tiene su propia batería:
 * `scripts/pruebas-jornada.mjs`.
 *
 * CÓMO SE EJECUTA
 *   node --experimental-strip-types scripts/pruebas-nomina.mjs
 *
 * (Node 22 sabe leer TypeScript quitándole los tipos; por eso `nomina.ts` y
 * `dinero.ts` no importan NADA en tiempo de ejecución, solo tipos. Si alguna
 * vez dejan de ser módulos puros, esta prueba deja de arrancar: es
 * intencional.)
 *
 * Sale con código 1 si alguna comprobación falla, para poder encadenarlo.
 */

const nomina = await import("../src/lib/nomina.ts");
const dinero = await import("../src/lib/dinero.ts");
const paginacion = await import("../src/lib/paginacion.ts");
const ley = await import("../src/lib/ley-laboral.ts");

const {
  CONCEPTOS_HORA,
  factoresTarifa,

  calcularLiquidacion,
  construirSnapshot,
  configVigente,
  derivarTarifas,
  estadoConfigMes,
  etiquetaPeriodo,
  manualesVacios,
  minutosVacios,
  normalizarManuales,
  normalizarSnapshot,
  obtenerLiquidacion,
  periodoDeHoy,
  rangoPeriodo,
  sumarMinutos,
  tarifaDeConcepto,
} = nomina;

const {
  formatearDinero,
  formatearMiles,
  formatearNumero,
  formatearPesos,
  formatearPorcentaje,
  parsearNumero,
  reformatearEntrada,
  textoDeEntrada,
  valorLimpio,
} = dinero;

/* ------------------------------------------------------------------ */
/* Mini arnés de pruebas                                               */
/* ------------------------------------------------------------------ */

let fallos = 0;
let pruebas = 0;
let grupo = "";

const grupoDe = (titulo) => {
  grupo = titulo;
  console.log(`\n── ${titulo}`);
};

function comprobar(descripcion, obtenido, esperado) {
  pruebas += 1;
  const ok = Object.is(obtenido, esperado);
  if (!ok) {
    fallos += 1;
    console.log(`   ✗ ${descripcion}`);
    console.log(`       esperado: ${esperado}`);
    console.log(`       obtenido: ${obtenido}`);
  } else {
    console.log(`   ✓ ${descripcion} → ${obtenido}`);
  }
}

function comprobarQue(descripcion, condicion) {
  pruebas += 1;
  if (!condicion) {
    fallos += 1;
    console.log(`   ✗ ${descripcion}`);
  } else {
    console.log(`   ✓ ${descripcion}`);
  }
}

/* ================================================================== */
/* 1. El volante de referencia de GPI (anonimizado)                    */
/* ================================================================== */

/**
 * Un comprobante de pago real que GPI entregó para una quincena de septiembre
 * de 2026 (15 días), liquidado con su Excel. El repositorio es PÚBLICO: aquí no
 * se nombra a la persona; solo quedan las cifras necesarias para comprobar el
 * cálculo al peso.
 *
 *   SALARIOS ................ $875.048
 *   AUXILIO DE TRANSPORTE ... $124.548
 *   HORAS EXTRAS ............ $189.594
 *   BONO .................... $151.000
 *   SALUD ................... $ 42.586
 *   PENSION ................. $ 42.586
 *   TOTALES ......... $1.340.189 / $85.171
 *   NETO A PAGAR ............ $1.255.017
 *
 * Salario mensual de la hoja 1.750.095 y auxilio mensual 249.095. Las horas
 * extra del período, reconstruidas desde el valor hora QUE USABA EL EXCEL
 * (salario ÷ 240 = 7.292,0625), son **4 h extra diurnas + 12 h extra
 * nocturnas**: 4 × 1,25 + 12 × 1,75 = 26 horas equivalentes = $189.593,625, que
 * la hoja imprime redondeado a $189.594.
 *
 * Desde la auditoría legal (19 sep 2026) las tarifas SUGERIDAS ya no son las
 * del Excel (÷240) sino las de la ley (÷210, recargo dominical por fecha), así
 * que este caso usa las TARIFAS EXPLÍCITAS del Excel, las que el volante pagó:
 * lo que se comprueba aquí es la mecánica de la liquidación, no la tarifa.
 */
grupoDe("Volante de referencia de GPI — quincena, 15 días, tarifas del Excel");

const SALARIO = 1_750_095;
const AUX_MENSUAL = 249_095;

/** Las siete tarifas tal como las traía el Excel de GPI (salario ÷ 240). */
const tarifas = {
  horaBase: 7292.06,
  rotacionNocturna: 2552.22,
  extraDiurna: 9115.08,
  extraNocturna: 12761.11,
  festivo: 15677.93,
  extraFestivoDiurna: 15677.93,
  extraFestivoNocturna: 19323.97,
};

const manualesVolante = manualesVacios();
manualesVolante.valores.bonificacion = 151_000;

const minutosVolante = minutosVacios();
minutosVolante.ordinariaDiurna = 15 * 8 * 60; // informativas: ya van en el básico
minutosVolante.extraDiurna = 4 * 60;
minutosVolante.extraNocturna = 12 * 60;

const volante = calcularLiquidacion({
  config: {
    salarioBasico: SALARIO,
    auxTransporte: AUX_MENSUAL,
    tarifas,
    pctSalud: 4,
    pctPension: 4,
  },
  minutos: minutosVolante,
  dias: 15,
  manuales: manualesVolante,
});

comprobar("SALARIOS (básico = salario / 30 × 15)", volante.basico, 875_048);
comprobar("AUXILIO DE TRANSPORTE (mensual / 30 × 15)", volante.auxTransporte, 124_548);
comprobar("HORAS EXTRAS (4 h diurnas + 12 h nocturnas)", volante.totalHoras, 189_593);
comprobar("BONO (concepto manual)", volante.totalDevengadosManuales, 151_000);
comprobar("TOTALES devengados", volante.totalDevengado, 1_340_189);
comprobar("base de salud y pensión (básico + horas)", volante.baseSeguridadSocial, 1_064_641);
comprobar("SALUD (4 %)", volante.salud, 42_586);
comprobar("PENSION (4 %)", volante.pension, 42_586);
comprobar("TOTALES descuentos", volante.totalDescuentos, 85_172);
comprobar("NETO A PAGAR", volante.neto, 1_255_017);

comprobarQue(
  "las horas ordinarias diurnas se muestran pero NO se pagan aparte",
  volante.lineasHoras.find((l) => l.clave === "ordinariaDiurna").valor === 0 &&
    volante.minutosOrdinarios === 7200,
);

/* --- «Jornada laboral: N días» (23 sep 2026) ---
   En la liquidación y en el volante, lo que cubre el salario ya no se imprime
   como un renglón de «horas ordinarias», sino como «Jornada laboral: N días»
   (el básico del período), más una línea INFORMATIVA con las horas trabajadas.
   Aquí se fija que esa presentación cuadra: quitar del cuadro las líneas que no
   se pagan no puede mover ningún total. */
comprobar("«Jornada laboral» son los días liquidados", volante.dias, 15);
comprobar("… y su importe es el básico del período", volante.basico, 875_048);
comprobarQue(
  "quitar las líneas que no se pagan no cambia el total de horas",
  volante.lineasHoras.filter((l) => l.sePaga).reduce((s, l) => s + l.valor, 0) ===
    volante.totalHoras,
);
comprobar(
  "la línea informativa suma TODO lo trabajado (ordinarias + pagadas)",
  volante.minutosOrdinarios + volante.minutosPagados,
  15 * 8 * 60 + 16 * 60,
);
comprobarQue(
  "ninguna línea que no se paga tiene importe",
  volante.lineasHoras.every((l) => l.sePaga || l.valor === 0),
);

console.log(`
   Nota sobre el redondeo: el Excel de GPI arrastra centavos y solo redondea al
   imprimir, así que sus subtotales no cuadran al sumarlos a mano (875.048 +
   124.548 + 189.594 + 151.000 = 1.340.190, pero el volante imprime 1.340.189).
   Aquí se paga en pesos enteros línea por línea, así que el volante SÍ cuadra:
   horas extra ${formatearPesos(volante.totalHoras)} en vez de $189.594 y
   descuentos ${formatearPesos(volante.totalDescuentos)} en vez de $85.171
   (±1 peso), y el NETO coincide exactamente: ${formatearPesos(volante.neto)}.`);

/* ================================================================== */
/* 2. Mapeo del desglose de jornadas → conceptos de nómina             */
/* ================================================================== */

grupoDe("Mapeo del desglose congelado de las jornadas");

const desgloseA = {
  valido: true,
  ordinariaDiurna: 480,
  ordinariaNocturna: 60,
  extraDiurna: 90,
  extraNocturna: 30,
  dominicalDiurna: 0,
  dominicalNocturna: 0,
  extraDominicalDiurna: 0,
  extraDominicalNocturna: 0,
};
const desgloseB = {
  valido: true,
  ordinariaDiurna: 0,
  ordinariaNocturna: 0,
  extraDiurna: 0,
  extraNocturna: 0,
  dominicalDiurna: 120,
  dominicalNocturna: 60,
  extraDominicalDiurna: 420,
  extraDominicalNocturna: 90,
};
const desgloseInvalido = { valido: false, ordinariaDiurna: 9999 };

const sumados = sumarMinutos([desgloseA, desgloseB, desgloseInvalido]);
comprobar("ordinariaNocturna → recargo de rotación nocturna", sumados.rotacionNocturna, 60);
comprobar("extraDiurna → horas extra diurnas", sumados.extraDiurna, 90);
comprobar("extraNocturna → horas extra nocturnas", sumados.extraNocturna, 30);
comprobar("dominicalDiurna → horas en festivo", sumados.festivo, 120);
comprobar("dominicalNocturna → horas en festivo nocturnas", sumados.festivoNocturno, 60);
comprobar("extraDominicalDiurna → extra diurna en festivo", sumados.extraFestivoDiurna, 420);
comprobar("extraDominicalNocturna → extra nocturna en festivo", sumados.extraFestivoNocturna, 90);
comprobar("un desglose inválido no aporta minutos", sumados.ordinariaDiurna, 480);
comprobarQue(
  "los ocho campos del desglose están mapeados",
  CONCEPTOS_HORA.length === 8 &&
    new Set(CONCEPTOS_HORA.map((c) => c.campo)).size === 8,
);

/* ================================================================== */
/* 3. La hora festiva nocturna se paga por composición                 */
/* ================================================================== */

grupoDe("Hora ordinaria NOCTURNA en festivo = festivo + rotación nocturna");

const tarifasComp = {
  horaBase: 10_000,
  rotacionNocturna: 3_500,
  extraDiurna: 12_500,
  extraNocturna: 17_500,
  festivo: 21_500,
  extraFestivoDiurna: 20_500,
  extraFestivoNocturna: 26_500,
};

comprobar(
  "la tarifa compuesta suma las dos",
  tarifaDeConcepto("festivoNocturno", tarifasComp),
  25_000,
);

const minutosFestivos = minutosVacios();
minutosFestivos.festivo = 120; // 2 h
minutosFestivos.festivoNocturno = 180; // 3 h

const festiva = calcularLiquidacion({
  config: {
    salarioBasico: 0,
    auxTransporte: 0,
    tarifas: tarifasComp,
    pctSalud: 0,
    pctPension: 0,
  },
  minutos: minutosFestivos,
  dias: 0,
  manuales: manualesVacios(),
});

comprobar("2 h en festivo × 21.500", festiva.lineasHoras.find((l) => l.clave === "festivo").valor, 43_000);
comprobar("3 h festivas nocturnas × 25.000", festiva.lineasHoras.find((l) => l.clave === "festivoNocturno").valor, 75_000);
comprobar("total de horas", festiva.totalHoras, 118_000);
comprobarQue(
  "la línea compuesta se explica en el desglose",
  festiva.lineasHoras.find((l) => l.clave === "festivoNocturno").composicion ===
    "Hora en festivo + recargo de rotación nocturna",
);

/* ================================================================== */
/* 4. Tarifas automáticas por ley del mes (23 sep 2026)                */
/* ================================================================== */

grupoDe("Tarifas automáticas: salario ÷ divisor × factor legal del mes");

// Parámetros de la ley: los da ley-laboral.ts (nomina.ts no importa nada).
const sep26 = ley.parametrosLegalesDelMes(2026, 9, 42);
comprobar("sep-2026 con horario de 42 h → divisor 210", sep26.divisor, 210);
comprobar("sep-2026 → recargo dominical 90 %", sep26.recargoDominical, 0.9);
const f26 = factoresTarifa(sep26.recargoDominical);
comprobar("recargo nocturno 0,35", f26.rotacionNocturna, 0.35);
comprobar("hora en festivo 1,90 (1 + d)", f26.festivo, 1.9);
comprobar("extra diurna en festivo 2,15 (1,25 + d): el valor del Excel ERA el legal", f26.extraFestivoDiurna, 2.15);
comprobar("extra nocturna en festivo 2,65 (1,75 + d)", f26.extraFestivoNocturna, 2.65);
comprobarQue("ya no hay «inversión festiva»: la extra festiva vale más que la ordinaria festiva", f26.extraFestivoDiurna > f26.festivo);
comprobarQue(
  "factoresTarifa (nomina.ts) = factoresLegales (ley-laboral.ts) para 0,75 · 0,8 · 0,9 · 1",
  [0.75, 0.8, 0.9, 1].every((d) => JSON.stringify(factoresTarifa(d)) === JSON.stringify(ley.factoresLegales(d))),
);
const jul27 = ley.parametrosLegalesDelMes(2027, 7, 42);
const f27 = factoresTarifa(jul27.recargoDominical);
comprobar("jul-2027 → recargo 100 %: festivo 2,00", f27.festivo, 2);
comprobar("jul-2027 → extra festiva diurna 2,25", f27.extraFestivoDiurna, 2.25);
comprobar("jul-2027 → extra festiva nocturna 2,75", f27.extraFestivoNocturna, 2.75);
comprobar("jun-2026 (42 h todavía no rige: 44) con horario de 42 → divisor 210", ley.parametrosLegalesDelMes(2026, 6, 42).divisor, 210);
comprobar("jun-2026 sin horario → 44 h legales → divisor 220", ley.parametrosLegalesDelMes(2026, 6).divisor, 220);
comprobar("un horario de 48 h no sube el divisor por encima del legal (42 → 210)", ley.parametrosLegalesDelMes(2026, 9, 48).divisor, 210);

// Salario redondo de ejemplo.
const t2 = derivarTarifas(2_100_000, sep26);
comprobar("salario 2.100.000 ÷ 210 → hora base 10.000", t2.horaBase, 10_000);
comprobar("→ recargo nocturno 3.500", t2.rotacionNocturna, 3_500);
comprobar("→ extra diurna 12.500", t2.extraDiurna, 12_500);
comprobar("→ extra nocturna 17.500", t2.extraNocturna, 17_500);
comprobar("→ hora en festivo 19.000", t2.festivo, 19_000);
comprobar("→ extra festiva diurna 21.500", t2.extraFestivoDiurna, 21_500);
comprobar("→ extra festiva nocturna 26.500", t2.extraFestivoNocturna, 26_500);

// Las tarifas ya NO se digitan (23 sep 2026): se derivan siempre del salario y
// de la ley del mes que se liquida. Lo que hay que fijar es que un cambio de
// mes cambie los valores SOLO donde la ley cambia.
const t27 = derivarTarifas(2_100_000, jul27);
comprobar("jul-2027: la hora base no cambia (el divisor sigue en 210)", t27.horaBase, 10_000);
comprobar("jul-2027: la extra diurna no cambia (no depende del dominical)", t27.extraDiurna, 12_500);
comprobar("jul-2027: la hora en festivo pasa de 19.000 a 20.000", t27.festivo, 20_000);
comprobar("jul-2027: la extra festiva diurna pasa de 21.500 a 22.500", t27.extraFestivoDiurna, 22_500);
comprobar("jul-2027: la extra festiva nocturna pasa de 26.500 a 27.500", t27.extraFestivoNocturna, 27_500);
comprobar(
  "jun-2027 (todavía 90 %) sigue con la hora en festivo en 19.000",
  derivarTarifas(2_100_000, ley.parametrosLegalesDelMes(2027, 6, 42)).festivo,
  19_000,
);
comprobarQue(
  "el mismo salario con la ley de sep-2026 y la de jul-2027 solo difiere en lo dominical",
  ["horaBase", "rotacionNocturna", "extraDiurna", "extraNocturna"].every((k) => t2[k] === t27[k]) &&
    ["festivo", "extraFestivoDiurna", "extraFestivoNocturna"].every((k) => t27[k] - t2[k] === 1_000),
);
comprobar("sin salario, todas las tarifas quedan en cero", derivarTarifas(0, sep26).festivo, 0);
// Las tarifas del Excel viejo (÷240) quedaban un 12,5 % por debajo de la ley:
// ya no se pueden guardar, pero la comparación documenta cuánto se corrigió.
comprobarQue(
  "las tarifas del Excel (÷240) pagaban menos que las de la ley",
  ["horaBase", "extraDiurna", "extraNocturna"].every((k) => tarifas[k] < derivarTarifas(SALARIO, sep26)[k]),
);

/* ================================================================== */
/* 5. Conceptos manuales                                               */
/* ================================================================== */

grupoDe("Conceptos manuales y descuentos");

const manuales = normalizarManuales({
  bonificacion: 302_000,
  prestamos: 150_000,
  otrosDescuentos: 25_500.6,
  basura: 999,
  notas: { prestamos: "  Cuota 2 de 6  ", otrosDescuentos: "" },
});

comprobar("bonificación leída del jsonb", manuales.valores.bonificacion, 302_000);
comprobar("los decimales se redondean a pesos", manuales.valores.otrosDescuentos, 25_501);
comprobar("una clave desconocida se ignora", manuales.valores.prima, 0);
comprobar("la nota se recorta", manuales.notas.prestamos, "Cuota 2 de 6");
comprobarQue("una nota vacía no se guarda", manuales.notas.otrosDescuentos === undefined);

const conManuales = calcularLiquidacion({
  config: {
    salarioBasico: 1_300_000,
    auxTransporte: 200_000,
    tarifas: derivarTarifas(1_300_000, sep26),
    pctSalud: 4,
    pctPension: 4,
  },
  minutos: minutosVacios(),
  dias: 30,
  manuales,
});

comprobar("mes completo = salario completo", conManuales.basico, 1_300_000);
comprobar("auxilio completo", conManuales.auxTransporte, 200_000);
comprobarQue(
  "el auxilio y los bonos NO entran en la base de seguridad social",
  conManuales.baseSeguridadSocial === 1_300_000,
);
comprobar("salud 4 %", conManuales.salud, 52_000);
comprobar(
  "descuentos = salud + pensión + préstamos + otros",
  conManuales.totalDescuentos,
  52_000 + 52_000 + 150_000 + 25_501,
);
comprobar(
  "neto",
  conManuales.neto,
  1_300_000 + 200_000 + 302_000 - (52_000 + 52_000 + 150_000 + 25_501),
);

/* ================================================================== */
/* 6. Períodos                                                         */
/* ================================================================== */

grupoDe("Períodos");

const q1 = rangoPeriodo("quincena", 2026, 9, 1);
comprobar("quincena 1 empieza el día 1", q1.fechaInicio, "2026-09-01");
comprobar("quincena 1 termina el día 15", q1.fechaFin, "2026-09-15");
comprobar("quincena 1 liquida 15 días", q1.diasSugeridos, 15);

const q2 = rangoPeriodo("quincena", 2026, 2, 2);
comprobar("quincena 2 de febrero empieza el 16", q2.fechaInicio, "2026-02-16");
comprobar("quincena 2 de febrero termina el 28", q2.fechaFin, "2026-02-28");
comprobar("pero liquida 15 días (mes de nómina de 30)", q2.diasSugeridos, 15);

const mes = rangoPeriodo("mes", 2026, 12, null);
comprobar("mes completo", `${mes.fechaInicio} → ${mes.fechaFin}`, "2026-12-01 → 2026-12-31");
comprobar("mes completo liquida 30 días", mes.diasSugeridos, 30);

comprobar(
  "etiqueta del período (nunca texto libre)",
  etiquetaPeriodo("quincena", 2026, 9, 1),
  "Quincena del 1 al 15 de septiembre de 2026",
);
comprobar(
  "etiqueta del mes",
  etiquetaPeriodo("mes", 2026, 9, null),
  "Mes de septiembre de 2026",
);

/* ================================================================== */
/* 7. Snapshot congelado                                               */
/* ================================================================== */

grupoDe("Snapshot congelado (mismo patrón que jornadas.desglose)");

const snapshot = construirSnapshot(volante, {
  jornadas: 6,
  fechaInicio: "2026-09-01",
  fechaFin: "2026-09-15",
});
// Ida y vuelta por JSON, que es lo que hace Postgres con una columna jsonb.
const recuperado = normalizarSnapshot(JSON.parse(JSON.stringify(snapshot)));

comprobarQue("el snapshot se recupera", recuperado !== null);
comprobar("el neto sobrevive al viaje", recuperado.calculo.neto, 1_255_017);
comprobar("las líneas de horas también", recuperado.calculo.lineasHoras.length, 8);
comprobar("y el número de jornadas", recuperado.jornadas, 6);
comprobarQue("una liquidación sin snapshot no devuelve nada", normalizarSnapshot(null) === null);
comprobarQue("un jsonb basura tampoco", normalizarSnapshot({ hola: 1 }) === null);

const congelada = obtenerLiquidacion(snapshot, () => {
  throw new Error("no se debe recalcular una liquidación cerrada");
});
comprobarQue("con snapshot NO se recalcula", congelada.congelada === true);
comprobar("y devuelve el neto congelado", congelada.calculo.neto, 1_255_017);

const enVivo = obtenerLiquidacion(null, () => ({
  config: {
    salarioBasico: 1_300_000,
    auxTransporte: 0,
    tarifas: derivarTarifas(1_300_000, sep26),
    pctSalud: 4,
    pctPension: 4,
  },
  minutos: minutosVacios(),
  dias: 15,
  manuales: manualesVacios(),
}));
comprobarQue("sin snapshot se calcula en vivo", enVivo.congelada === false);
comprobar("básico de media quincena", enVivo.calculo.basico, 650_000);

/* ================================================================== */
/* 8. Robustez: basura de entrada no rompe nada                        */
/* ================================================================== */

grupoDe("Robustez");

const basura = calcularLiquidacion({
  config: {
    salarioBasico: Number.NaN,
    auxTransporte: -100,
    tarifas: {},
    pctSalud: 999,
    pctPension: -5,
  },
  minutos: { extraDiurna: Number.NaN },
  dias: 900,
  manuales: { valores: { bonificacion: "x" }, notas: null },
});

comprobarQue("ningún total es NaN", Number.isFinite(basura.neto) && Number.isFinite(basura.totalDevengado));
comprobar("un salario inválido se trata como 0", basura.basico, 0);
comprobar("los días se topan en 31", basura.dias, 31);
comprobar("un porcentaje se topa en 100", basura.pctSalud, 100);
comprobar("un porcentaje negativo se topa en 0", basura.pctPension, 0);

/* ================================================================== */
/* 9. Dinero: lectura en formato colombiano (src/lib/dinero.ts)        */
/* ================================================================== */

grupoDe("Dinero — leer lo que escribe o pega una persona (parsearNumero)");

const casosLectura = [
  // [texto, esperado, por qué]
  ["1.300.000", 1_300_000, "miles con punto"],
  ["9.115,08", 9115.08, "miles con punto y coma decimal"],
  ["9115,08", 9115.08, "coma decimal sin miles"],
  ["1300000", 1_300_000, "solo cifras"],
  ["9115.08", 9115.08, "EL BUG: punto decimal de un <input type=number> (antes se guardaba 911.508)"],
  ["9.115", 9115, "CASO AMBIGUO: un punto seguido de 3 cifras = miles (formato colombiano)"],
  ["1.300", 1300, "otro punto de miles con 3 cifras"],
  ["4,5", 4.5, "porcentaje con coma"],
  ["4.5", 4.5, "un punto con 1 cifra detrás no puede ser de miles → decimal"],
  ["12.50", 12.5, "un punto con 2 cifras detrás → decimal"],
  ["0.125", 0.125, "con cero delante, el punto es decimal"],
  [" $ 1.300.000 ", 1_300_000, "espacios y signo de pesos"],
  ["$1.300.000,00", 1_300_000, "con centavos en cero"],
  ["\u00A0$\u00A09.115,08\u00A0", 9115.08, "espacios duros (copiado de una tabla)"],
  ["COP 50.000", 50_000, "con la sigla COP"],
  ["1,300,000.50", 1_300_000.5, "formato inglés pegado de otra hoja: el último separador es el decimal"],
  ["1,300,000", 1_300_000, "varias comas = miles"],
  ["-1.500", -1500, "negativo (quien llama decide si lo acepta)"],
  ["−2.000", -2000, "negativo con el signo menos tipográfico"],
];
for (const [texto, esperado, porque] of casosLectura) {
  comprobar(`«${texto}» → ${esperado} (${porque})`, parsearNumero(texto), esperado);
}

const casosInvalidos = [
  ["", "vacío"],
  ["   ", "solo espacios"],
  ["$", "solo el signo"],
  ["abc", "letras"],
  ["12a", "cifra con letra"],
  ["1.30.000", "grupo de miles de 2 cifras (error de digitación)"],
  ["1,2,3", "comas que no son ni miles ni decimal"],
  ["1.300,000,5", "dos comas decimales"],
];
for (const [texto, porque] of casosInvalidos) {
  comprobar(`«${texto}» → null (${porque})`, parsearNumero(texto), null);
}
comprobar("un número ya numérico pasa tal cual", parsearNumero(9115.08), 9115.08);
comprobar("undefined → null", parsearNumero(undefined), null);

grupoDe("Dinero — escribir con separador de miles");

comprobar("formatearMiles(1300000)", formatearMiles(1_300_000), "1.300.000");
comprobar("formatearMiles redondea a pesos", formatearMiles(1_255_017.4), "1.255.017");
comprobar("cuatro cifras también llevan punto", formatearMiles(9115), "9.115");
comprobar("tres cifras no", formatearMiles(875), "875");
comprobar("formatearPesos(1255017)", formatearPesos(1_255_017), "$\u00A01.255.017");
comprobar("formatearPesos negativo", formatearPesos(-42_586), "-$\u00A042.586");
comprobar("formatearDinero con centavos", formatearDinero(9115.08), "$\u00A09.115,08");
comprobar("formatearDinero rellena a dos decimales", formatearDinero(9115.5), "$\u00A09.115,50");
comprobar("formatearDinero sin centavos no los pinta", formatearDinero(10_000), "$\u00A010.000");
comprobar("formatearNumero(9115.08)", formatearNumero(9115.08), "9.115,08");
comprobar("formatearNumero(1.25) (un factor)", formatearNumero(1.25), "1,25");
comprobar("formatearPorcentaje(4)", formatearPorcentaje(4), "4");
comprobar("formatearPorcentaje(4.5) sin miles y con coma", formatearPorcentaje(4.5), "4,5");
comprobar("formatearNumero(0)", formatearNumero(0), "0");

// Ida y vuelta: todo lo que se escribe se vuelve a leer igual.
for (const n of [0, 5, 875, 9115, 9115.08, 9115.5, 1_300_000, 1_750_095, 123_456_789.99]) {
  comprobar(
    `ida y vuelta de ${n} (formatearNumero → parsearNumero)`,
    parsearNumero(formatearNumero(n)),
    n,
  );
}

grupoDe("Dinero — el campo mientras se escribe (reformatearEntrada)");

const entrada = (texto, cursor, opciones) =>
  JSON.stringify(reformatearEntrada(texto, cursor, opciones));
const esperado = (texto, cursor) => JSON.stringify({ texto, cursor });

comprobar("escribir 1300000 → 1.300.000, cursor al final", entrada("1300000", 7), esperado("1.300.000", 9));
comprobar("añadir un 0 a «1.300» → «13.000» sin saltar el cursor", entrada("1.3000", 6), esperado("13.000", 6));
comprobar("escribir en medio mantiene el cursor tras la misma cifra", entrada("1.3500.000", 4), esperado("13.500.000", 4));
comprobar("borrar la primera cifra de «1.300.000»", entrada(".300.000", 0), esperado("300.000", 0));
comprobar("coma decimal en una tarifa", entrada("9.115,08", 8, { decimales: 2 }), esperado("9.115,08", 8));
comprobar("no deja más de 2 decimales", entrada("9.115,089", 9, { decimales: 2 }), esperado("9.115,08", 8));
comprobar("en pesos enteros la coma se ignora", entrada("9115,5", 6), esperado("91.155", 6));
comprobar("«,5» → «0,5»", entrada(",5", 2, { decimales: 2 }), esperado("0,5", 3));
comprobar("ceros a la izquierda fuera", entrada("0007", 4), esperado("7", 1));
comprobar("letras fuera, el cursor no se mueve de más", entrada("12a3", 3), esperado("123", 2));
comprobar("porcentaje: el punto es la coma", entrada("4.5", 3, { decimales: 2, miles: false }), esperado("4,5", 3));
comprobar("porcentaje: sin puntos de miles", entrada("1000", 4, { decimales: 2, miles: false }), esperado("1000", 4));
comprobar("vacío", entrada("", 0), esperado("", 0));

comprobar("textoDeEntrada de una tarifa", textoDeEntrada(9115.08, { decimales: 2 }), "9.115,08");
comprobar("textoDeEntrada de un salario", textoDeEntrada(1_300_000), "1.300.000");
comprobar("textoDeEntrada de 0 queda vacío", textoDeEntrada(0), "");
comprobar("…salvo en un porcentaje", textoDeEntrada(0, { decimales: 2, miles: false, vacioSiCero: false }), "0");
comprobar("valor LIMPIO que viaja al servidor: «1.300.000» → «1300000»", valorLimpio("1.300.000"), "1300000");
comprobar("valor LIMPIO de «9.115,08» → «9115.08»", valorLimpio("9.115,08"), "9115.08");
comprobar(
  "y el servidor lo vuelve a leer igual (ni ×100 ni ÷100)",
  parsearNumero(valorLimpio("9.115,08")),
  9115.08,
);
comprobar("valor LIMPIO de un campo vacío", valorLimpio(""), "");

/* ================================================================== */
/* 10. Configuración «vigente desde»                                   */
/* ================================================================== */

grupoDe("Configuración «vigente desde»: un cambio rige hacia adelante");

const fila = (anio, mes, salario) => ({ anio, mes, salario_basico: salario, id: `${anio}-${mes}` });
const agosto = fila(2026, 8, 1_300_000);
let filas = [agosto];

const vig = (a, m) => configVigente(filas, a, m)?.id ?? null;
comprobar("agosto se usa en agosto", vig(2026, 8), "2026-8");
comprobar("…lo hereda septiembre", vig(2026, 9), "2026-8");
comprobar("…octubre", vig(2026, 10), "2026-8");
comprobar("…diciembre", vig(2026, 12), "2026-8");
comprobar("…y enero del año siguiente", vig(2027, 1), "2026-8");
comprobar("julio (antes del primer cambio) no tiene configuración", vig(2026, 7), null);

const octubre = fila(2026, 10, 1_500_000);
filas = [agosto, octubre];
comprobar("con un cambio en octubre, septiembre sigue con agosto", vig(2026, 9), "2026-8");
comprobar("octubre usa su propio cambio", vig(2026, 10), "2026-10");
comprobar("noviembre hereda octubre", vig(2026, 11), "2026-10");
comprobar("marzo del año siguiente también", vig(2027, 3), "2026-10");

const estOct = estadoConfigMes(filas, 2026, 10);
comprobar("octubre: origen «propia»", estOct.origen, "propia");
comprobar("octubre: al quitar el cambio volvería a agosto", estOct.alQuitar?.id ?? null, "2026-8");
const estNov = estadoConfigMes(filas, 2026, 11);
comprobar("noviembre: origen «heredada»", estNov.origen, "heredada");
comprobar("noviembre: hereda de octubre", estNov.vigente?.id ?? null, "2026-10");
const estSep = estadoConfigMes(filas, 2026, 9);
comprobar("septiembre: el próximo cambio es octubre", estSep.siguiente?.id ?? null, "2026-10");
comprobar("julio: origen «ninguna»", estadoConfigMes(filas, 2026, 7).origen, "ninguna");

// Quitar el cambio de octubre = borrar su fila.
filas = [agosto];
comprobar("sin el cambio de octubre, octubre vuelve a heredar agosto", vig(2026, 10), "2026-8");
comprobar("y noviembre también", vig(2026, 11), "2026-8");
comprobar("agosto: quitarlo dejaría a la persona sin configuración", estadoConfigMes(filas, 2026, 8).alQuitar, null);

// Las filas vacías del modelo anterior (se creaban en cero al abrir un mes)
// no cuentan: no tapan lo heredado.
filas = [agosto, fila(2026, 9, 0)];
comprobar("una fila en cero (resto del modelo anterior) no tapa lo heredado", vig(2026, 9), "2026-8");
comprobar("…y septiembre figura como heredado", estadoConfigMes(filas, 2026, 9).origen, "heredada");
comprobar("…ni cuenta como cambio guardado", estadoConfigMes(filas, 2026, 9).cambios.length, 1);
comprobar("el orden de las filas no importa", configVigente([octubre, agosto], 2026, 12)?.id ?? null, "2026-10");
comprobar("diciembre → enero cruza el año", configVigente([fila(2026, 12, 2_000_000)], 2027, 1)?.id ?? null, "2026-12");

/* ================================================================== */
/* 10 b. Corte: «dejar sin configuración desde este mes» (22 sep 2026)  */
/* ================================================================== */

grupoDe("Corte de configuración: sin configuración desde N hasta el próximo cambio");

const { cambiosDeConfig, efectoEnBorradores, esCorte, filasTrasCortar, filasTrasQuitar } = nomina;
const corte = (anio, mes) => ({
  anio,
  mes,
  salario_basico: 0,
  sin_configuracion: true,
  id: `corte-${anio}-${mes}`,
});

filas = [agosto, corte(2026, 10)];
comprobar("con corte en octubre, septiembre sigue heredando agosto", vig(2026, 9), "2026-8");
comprobar("octubre (el mes del corte) queda sin configuración", vig(2026, 10), null);
comprobar("…noviembre también", vig(2026, 11), null);
comprobar("…y enero del año siguiente", vig(2027, 1), null);

const corteOct = estadoConfigMes(filas, 2026, 10);
comprobar("octubre: origen «suspendida»", corteOct.origen, "suspendida");
comprobar("octubre: el corte que rige es el suyo", corteOct.corte?.id ?? null, "corte-2026-10");
comprobar("octubre: su cambio del mes es el corte", corteOct.cambioDelMes?.id ?? null, "corte-2026-10");
comprobar("octubre: no tiene configuración propia", corteOct.propia, null);
comprobar("octubre: quitar el corte devolvería agosto", corteOct.alQuitar?.id ?? null, "2026-8");
const corteDic = estadoConfigMes(filas, 2026, 12);
comprobar("diciembre: «suspendida» por el corte de octubre", corteDic.origen, "suspendida");
comprobar("diciembre: el corte que rige es el de octubre", corteDic.corte?.id ?? null, "corte-2026-10");
comprobar("diciembre: no tiene cambio propio", corteDic.cambioDelMes, null);
comprobar("septiembre: el próximo cambio es el corte", estadoConfigMes(filas, 2026, 9).siguiente?.id ?? null, "corte-2026-10");
comprobar("el corte cuenta como cambio guardado (2 cambios)", estadoConfigMes(filas, 2026, 9).cambios.length, 2);
comprobarQue("esCorte distingue el corte", esCorte(corte(2026, 10)) && !esCorte(agosto));

// Un cambio POSTERIOR al corte vuelve a dar configuración.
const enero27 = fila(2027, 1, 1_600_000);
filas = [agosto, corte(2026, 10), enero27];
comprobar("cambio en enero tras el corte: diciembre sigue sin configuración", vig(2026, 12), null);
comprobar("…enero vuelve a tener configuración", vig(2027, 1), "2027-1");
comprobar("…y febrero la hereda", vig(2027, 2), "2027-1");
comprobar("…octubre: el corte rige hasta el próximo cambio (enero)", estadoConfigMes(filas, 2026, 10).siguiente?.id ?? null, "2027-1");

// Quitar el corte = borrar su fila: vuelve la herencia.
filas = filasTrasQuitar([agosto, corte(2026, 10)], 2026, 10);
comprobar("sin el corte, octubre vuelve a heredar agosto", vig(2026, 10), "2026-8");
comprobar("…y noviembre también", vig(2026, 11), "2026-8");
comprobar("…y octubre figura como heredado", estadoConfigMes(filas, 2026, 10).origen, "heredada");

// La marca manda: un corte nunca es configuración, tenga el salario que tenga;
// y un resto en cero SIN la marca sigue sin ser corte (se ignora).
comprobar(
  "un corte con salario escrito sigue siendo corte",
  configVigente([agosto, { ...fila(2026, 10, 9_999_999), sin_configuracion: true }], 2026, 11)?.id ?? null,
  null,
);
comprobar(
  "un resto en cero sin la marca NO corta la herencia",
  configVigente([agosto, fila(2026, 10, 0)], 2026, 11)?.id ?? null,
  "2026-8",
);
comprobar(
  "cambiosDeConfig: el corte entra, el resto en cero no",
  cambiosDeConfig([agosto, fila(2026, 9, 0), corte(2026, 10)]).map((f) => f.id).join(","),
  "2026-8,corte-2026-10",
);
comprobar(
  "cortar sobre un resto en cero lo reemplaza por el corte",
  configVigente(filasTrasCortar([agosto, fila(2026, 10, 0)], 2026, 10), 2026, 10),
  null,
);
comprobar("julio (antes de todo) sigue en «ninguna»", estadoConfigMes([agosto, corte(2026, 10)], 2026, 7).origen, "ninguna");

/* ------------------------------------------------------------------ */

grupoDe("Regla de los borradores al quitar o suspender la configuración");

const liq = (id, anio, mes, estado) => ({ id, anio, mes, estado });
const liquidacionesPersona = [
  liq("b-jul", 2026, 7, "borrador"),
  liq("b-sep", 2026, 9, "borrador"),
  liq("b-oct", 2026, 10, "borrador"),
  liq("c-oct", 2026, 10, "cerrada"),
  liq("b-nov", 2026, 11, "borrador"),
  liq("p-nov", 2026, 11, "pagada"),
  liq("b-feb27", 2027, 2, "borrador"),
];
const ids = (lista) => lista.map((l) => l.id).join(",");
const base = [agosto, enero27];

// 1. Suspender desde octubre: oct–dic quedan sin configuración.
let efecto = efectoEnBorradores(liquidacionesPersona, filasTrasCortar(base, 2026, 10), { anio: 2026, mes: 10 });
comprobar("cortar en octubre elimina los borradores de oct y nov", ids(efecto.eliminar), "b-oct,b-nov");
comprobar("…y no conserva ninguno (esos meses no tienen configuración)", efecto.conservar.length, 0);
comprobar("…el efecto llega hasta diciembre (enero tiene su cambio)", `${efecto.hasta?.anio}-${efecto.hasta?.mes}`, "2026-12");
comprobarQue(
  "…septiembre (antes), febrero 2027 (después del próximo cambio), cerradas y pagadas: fuera",
  !/b-sep|b-feb27|c-oct|p-nov|b-jul/.test(ids([...efecto.eliminar, ...efecto.conservar])),
);

// 2. Quitar agosto sin nada antes: ago–dic quedan sin configuración.
efecto = efectoEnBorradores(liquidacionesPersona, filasTrasQuitar(base, 2026, 8), { anio: 2026, mes: 8 });
comprobar("quitar el único cambio elimina los borradores de ago–dic", ids(efecto.eliminar), "b-sep,b-oct,b-nov");
comprobarQue("…nunca una cerrada ni una pagada", !/c-oct|p-nov/.test(ids(efecto.eliminar)));
comprobarQue("…ni un borrador de antes del cambio (julio)", !ids(efecto.eliminar).includes("b-jul"));

// 3. Quitar agosto CON respaldo (junio): los borradores se conservan.
const junio = fila(2026, 6, 1_200_000);
efecto = efectoEnBorradores(liquidacionesPersona, filasTrasQuitar([junio, agosto, enero27], 2026, 8), { anio: 2026, mes: 8 });
comprobar("con junio detrás, quitar agosto no elimina ningún borrador", efecto.eliminar.length, 0);
comprobar("…y conserva los de ago–dic (heredan junio)", ids(efecto.conservar), "b-sep,b-oct,b-nov");

// 4. Quitar el corte: el mes vuelve a heredar, así que nada se elimina.
efecto = efectoEnBorradores(liquidacionesPersona, filasTrasQuitar([agosto, corte(2026, 10)], 2026, 10), { anio: 2026, mes: 10 });
comprobar("quitar el corte no elimina borradores", efecto.eliminar.length, 0);
comprobar("…y los de octubre en adelante siguen (heredan agosto)", ids(efecto.conservar), "b-oct,b-nov,b-feb27");
comprobar("…sin límite: no hay un cambio posterior", efecto.hasta, null);

// 5. Un huérfano de ANTES, fuera del rango afectado, no se toca.
efecto = efectoEnBorradores(
  [liq("b-oct", 2026, 10, "borrador"), liq("b-dic-huerfano", 2026, 12, "borrador")],
  filasTrasCortar([agosto, corte(2026, 12)], 2026, 10),
  { anio: 2026, mes: 10 },
);
comprobar("cortar en octubre con otro corte en diciembre: solo oct–nov", ids(efecto.eliminar), "b-oct");
comprobar("…el efecto termina en noviembre", `${efecto.hasta?.anio}-${efecto.hasta?.mes}`, "2026-11");

/* ================================================================== */
/* 11. Período por defecto de la liquidación (19 sep 2026)             */
/* ================================================================== */

grupoDe("Período por defecto: mes de hoy y quincena según el día (Colombia)");
const periodo = (hoy) => {
  const r = periodoDeHoy(hoy);
  return `${r.anio}-${r.mes}-Q${r.quincena}`;
};
comprobar("el 1 → primera quincena", periodo("2026-09-01"), "2026-9-Q1");
comprobar("el 15 → primera quincena", periodo("2026-09-15"), "2026-9-Q1");
comprobar("el 16 → segunda quincena", periodo("2026-09-16"), "2026-9-Q2");
comprobar("hoy, 19 sep 2026 → segunda de septiembre", periodo("2026-09-19"), "2026-9-Q2");
comprobar("el 31 → segunda quincena", periodo("2026-12-31"), "2026-12-Q2");
comprobar("el 28 de febrero → segunda quincena", periodo("2027-02-28"), "2027-2-Q2");

/* ================================================================== */
/* 12. Paginación de las tablas: 10 filas por página (19 sep 2026)     */
/* ================================================================== */

grupoDe("Paginación: 10 filas por página (src/lib/paginacion.ts)");
const { FILAS_POR_PAGINA, hrefConPagina, leerPagina, paginar } = paginacion;
const treintaYTres = Array.from({ length: 33 }, (_, i) => i + 1);
comprobar("la regla es 10 filas", FILAS_POR_PAGINA, 10);
comprobar("33 filas → 4 páginas", paginar(treintaYTres, 1).totalPaginas, 4);
comprobar("página 1 → 10 filas", paginar(treintaYTres, 1).visibles.length, 10);
comprobar("página 2 empieza en la fila 11", paginar(treintaYTres, 2).desde, 11);
comprobar("página 2 termina en la fila 20", paginar(treintaYTres, 2).hasta, 20);
comprobar("la última página trae el resto (3)", paginar(treintaYTres, 4).visibles.length, 3);
comprobar("una página inexistente se recorta a la última", paginar(treintaYTres, 99).pagina, 4);
comprobar("página 0 o negativa → la 1", paginar(treintaYTres, -3).pagina, 1);
comprobar("lista vacía → 1 página y «desde» 0", `${paginar([], 1).totalPaginas}/${paginar([], 1).desde}`, "1/0");
comprobar("exactamente 10 → 1 página (el control no se pinta)", paginar(treintaYTres.slice(0, 10), 1).totalPaginas, 1);
comprobar("?pagina=abc → 1", leerPagina("abc"), 1);
comprobar("?pagina=2.5 → 1", leerPagina("2.5"), 1);
comprobar("?pagina=3 → 3", leerPagina("3"), 3);
comprobar("?pagina repetido → el primero", leerPagina(["2", "5"]), 2);
comprobar(
  "href: conserva los filtros y añade la página",
  hrefConPagina("/admin/jornadas?vista=aprobaciones&estado=todas", 3),
  "/admin/jornadas?vista=aprobaciones&estado=todas&pagina=3",
);
comprobar("href: la página 1 no se escribe", hrefConPagina("/admin/servicios?pagina=4", 1), "/admin/servicios");
comprobar(
  "href: reemplaza una página vieja",
  hrefConPagina("/mi-cuenta?seccion=nomina&pagina=2", 3),
  "/mi-cuenta?seccion=nomina&pagina=3",
);

/* ================================================================== */
/* 13. Faltas no remuneradas: el descuento (23 sep 2026)               */
/* ================================================================== */

/**
 * LA REGLA (decidida con GPI el 23 sep 2026)
 * ------------------------------------------
 * Un permiso APROBADO y NO remunerado descuenta:
 *   · día completo → ese día Y el domingo de esa semana (art. 173 del CST),
 *     una sola vez por semana, sea cual sea el número de faltas;
 *   · por horas → solo su proporción de la jornada programada de ese día, sin
 *     arrastrar el domingo;
 *   · el descuento afecta al salario Y al auxilio de transporte: la base diaria
 *     es (salario + auxilio) ÷ 30;
 *   · el domingo se descuenta en la MISMA liquidación donde cae el día de la
 *     falta, aunque caiga en el período siguiente.
 *
 * El CALENDARIO que se usa aquí (octubre de 2026, comprobado):
 *   lun 5 · mar 6 · mié 7 · … · sáb 10 · dom 11   ← semana A
 *   lun 12 · … · jue 15 · vie 16 · … · dom 18     ← semana B
 * Quincena 1 = del 1 al 15 · quincena 2 = del 16 al 31.
 *
 * Cifras de ejemplo, REDONDAS y de nadie (el repositorio es público):
 * salario 2.100.000 y auxilio 200.000 → base diaria 76.666,67.
 */

grupoDe("Faltas no remuneradas: los días que se pierden (src/lib/permisos.ts)");

const permisosLib = await import("../src/lib/permisos.ts");
const { faltasDelPeriodo, faltasVacias, textoFaltas } = permisosLib;

const Q1 = { desde: "2026-10-01", hasta: "2026-10-15" };
const Q2 = { desde: "2026-10-16", hasta: "2026-10-31" };

/** Un permiso de día(s) completo(s) aprobado y no remunerado. */
const faltaDia = (id, inicio, fin = inicio, extra = {}) => ({
  id,
  tipo: "dia",
  fecha_inicio: inicio,
  fecha_fin: fin,
  estado: "aprobado",
  remunerado: false,
  motivo: "Prueba",
  ...extra,
});

/** Un permiso por horas aprobado y no remunerado. */
const faltaHoras = (id, fecha, desde, hasta, horasJornada, extra = {}) => ({
  id,
  tipo: "horas",
  fecha_inicio: fecha,
  fecha_fin: fecha,
  hora_inicio: desde,
  hora_fin: hasta,
  horasJornada,
  estado: "aprobado",
  remunerado: false,
  motivo: "Prueba",
  ...extra,
});

/* --- 13.1 Una falta de un día: el día y su domingo --- */
const unDia = faltasDelPeriodo([faltaDia("p1", "2026-10-06")], Q1.desde, Q1.hasta);
comprobar("un día de falta → 2 días descontados", unDia.dias, 2);
comprobar("…de los cuales 1 es día completo", unDia.diasCompletos, 1);
comprobar("…y 1 es el domingo de esa semana", unDia.diasDomingos, 1);
comprobar("el domingo es el 11 (semana de lun 5 a dom 11)", unDia.domingos[0], "2026-10-11");
comprobar(
  "el texto del volante lo dice",
  textoFaltas(unDia),
  "2 días (incluye 1 domingo)",
);

/* --- 13.2 Dos faltas en la misma semana: UN solo domingo --- */
const dosMismaSemana = faltasDelPeriodo(
  [faltaDia("p1", "2026-10-06"), faltaDia("p2", "2026-10-07")],
  Q1.desde,
  Q1.hasta,
);
comprobar("dos faltas de la misma semana → 3 días", dosMismaSemana.dias, 3);
comprobar("…dos días completos", dosMismaSemana.diasCompletos, 2);
comprobar("…y UN solo domingo", dosMismaSemana.diasDomingos, 1);

/* --- 13.3 Un permiso de varios días seguidos es lo mismo --- */
const dosSeguidos = faltasDelPeriodo(
  [faltaDia("p1", "2026-10-06", "2026-10-07")],
  Q1.desde,
  Q1.hasta,
);
comprobar("un permiso de mar a mié → también 3 días", dosSeguidos.dias, 3);

/* --- 13.4 Un sábado también arrastra el domingo --- */
const sabado = faltasDelPeriodo([faltaDia("p1", "2026-10-10")], Q1.desde, Q1.hasta);
comprobar("falta en sábado → 2 días", sabado.dias, 2);
comprobar("…y el domingo perdido es el día siguiente", sabado.domingos[0], "2026-10-11");

/* --- 13.5 Faltar el propio domingo no se cuenta dos veces --- */
const soloDomingo = faltasDelPeriodo([faltaDia("p1", "2026-10-11")], Q1.desde, Q1.hasta);
comprobar("faltar el domingo → 1 día, no 2", soloDomingo.dias, 1);
comprobar("…y no se suma un domingo aparte", soloDomingo.diasDomingos, 0);

/* --- 13.6 Por horas: proporcional a la jornada, sin domingo --- */
const porHoras = faltasDelPeriodo(
  [faltaHoras("p1", "2026-10-06", "08:00", "10:00", 8.5)],
  Q1.desde,
  Q1.hasta,
);
comprobar("2 h de una jornada de 8,5 h → 0,2353 días", porHoras.dias, 0.2353);
comprobar("…no arrastra el domingo", porHoras.diasDomingos, 0);
const horasSinHorario = faltasDelPeriodo(
  [faltaHoras("p1", "2026-10-11", "08:00", "10:00", 0)],
  Q1.desde,
  Q1.hasta,
);
comprobar("en un día sin jornada programada no descuenta nada", horasSinHorario.dias, 0);

/* --- 13.7 Lo que NO descuenta --- */
comprobar(
  "un permiso REMUNERADO no descuenta",
  faltasDelPeriodo(
    [faltaDia("p1", "2026-10-06", "2026-10-06", { remunerado: true })],
    Q1.desde,
    Q1.hasta,
  ).dias,
  0,
);
comprobar(
  "un permiso PENDIENTE no descuenta",
  faltasDelPeriodo(
    [faltaDia("p1", "2026-10-06", "2026-10-06", { estado: "pendiente", remunerado: null })],
    Q1.desde,
    Q1.hasta,
  ).dias,
  0,
);
comprobar(
  "un permiso RECHAZADO no descuenta",
  faltasDelPeriodo(
    [faltaDia("p1", "2026-10-06", "2026-10-06", { estado: "rechazado", remunerado: null })],
    Q1.desde,
    Q1.hasta,
  ).dias,
  0,
);
comprobar("sin permisos, cero", faltasDelPeriodo([], Q1.desde, Q1.hasta).dias, 0);
comprobar("`faltasVacias()` es el cero canónico", faltasVacias().dias, 0);

/* --- 13.8 El domingo que cae en la OTRA quincena --- */
// Falta el jueves 15 (quincena 1); su semana termina el domingo 18 (quincena 2).
// El domingo se descuenta CON el día, en la quincena 1, y no se vuelve a cobrar.
const juevesQ1 = faltasDelPeriodo([faltaDia("p1", "2026-10-15")], Q1.desde, Q1.hasta);
comprobar("falta el 15 → la quincena 1 descuenta 2 días", juevesQ1.dias, 2);
comprobar(
  "…y el domingo perdido es el 18, de la quincena siguiente",
  juevesQ1.domingos[0],
  "2026-10-18",
);
const juevesQ2 = faltasDelPeriodo([faltaDia("p1", "2026-10-15")], Q2.desde, Q2.hasta);
comprobar("…la quincena 2 NO lo vuelve a cobrar", juevesQ2.dias, 0);
// Y si la semana tiene faltas en las dos quincenas, el domingo va con la primera.
const aCaballo = [faltaDia("p1", "2026-10-15"), faltaDia("p2", "2026-10-16")];
comprobar(
  "semana partida: la quincena 1 se queda con el domingo",
  faltasDelPeriodo(aCaballo, Q1.desde, Q1.hasta).diasDomingos,
  1,
);
comprobar(
  "semana partida: la quincena 2 solo descuenta su día",
  faltasDelPeriodo(aCaballo, Q2.desde, Q2.hasta).dias,
  1,
);

/* ================================================================== */
/* 14. Faltas no remuneradas: el dinero                                */
/* ================================================================== */

grupoDe("Faltas no remuneradas: el dinero (src/lib/nomina.ts)");

const SALARIO_FALTAS = 2_100_000;
const AUXILIO_FALTAS = 200_000;
const DIARIO_FALTAS = (SALARIO_FALTAS + AUXILIO_FALTAS) / 30; // 76.666,67

const liquidarConFaltas = (faltas) =>
  calcularLiquidacion({
    config: {
      salarioBasico: SALARIO_FALTAS,
      auxTransporte: AUXILIO_FALTAS,
      tarifas: derivarTarifas(SALARIO_FALTAS, { divisor: 210, recargoDominical: 0.9 }),
      pctSalud: 4,
      pctPension: 4,
    },
    minutos: minutosVacios(),
    dias: 15,
    manuales: manualesVacios(),
    faltas,
  });

const sinFaltas = liquidarConFaltas(null);
comprobar("sin faltas, se pagan los 15 días", sinFaltas.diasPagados, 15);
comprobar("sin faltas, el sueldo del período es 1.050.000", sinFaltas.basico, 1_050_000);
comprobar("sin faltas, el auxilio es 100.000", sinFaltas.auxTransporte, 100_000);
comprobar("sin faltas, el descuento es 0", sinFaltas.faltas.valor, 0);

const conUnDia = liquidarConFaltas(unDia);
comprobar("con una falta de un día se pagan 13 días", conUnDia.diasPagados, 13);
comprobar("…el sueldo baja a 910.000", conUnDia.basico, 910_000);
comprobar("…el auxilio baja a 86.667", conUnDia.auxTransporte, 86_667);
comprobar("…y el descuento es 153.333", conUnDia.faltas.valor, 153_333);
comprobar(
  "…que es exactamente 2 días de (salario + auxilio) ÷ 30",
  Math.round(2 * DIARIO_FALTAS),
  153_333,
);
comprobarQue(
  "el sueldo + el auxilio + el descuento cuadran con el período completo",
  conUnDia.basico + conUnDia.auxTransporte + conUnDia.faltas.valor ===
    sinFaltas.basico + sinFaltas.auxTransporte,
);
comprobar(
  "el detalle del volante dice qué días se perdieron",
  conUnDia.faltas.fechas.join(",") + "|" + conUnDia.faltas.domingos.join(","),
  "2026-10-06|2026-10-11",
);

const conDosMismaSemana = liquidarConFaltas(dosMismaSemana);
comprobar("dos faltas en la semana → se pagan 12 días", conDosMismaSemana.diasPagados, 12);
comprobar("…y se descuentan 230.000 (3 días)", conDosMismaSemana.faltas.valor, 230_000);

const conHoras = liquidarConFaltas(porHoras);
comprobar("un permiso por horas deja 14,7647 días pagados", conHoras.diasPagados, 14.7647);
comprobar("…el sueldo es 1.033.529", conHoras.basico, 1_033_529);
comprobar("…y el descuento, 18.040", conHoras.faltas.valor, 18_040);

// La base de salud y pensión baja con el sueldo: es lo correcto (el IBC sigue a
// lo devengado), y hay que dejarlo comprobado para que nadie lo «arregle».
comprobarQue(
  "salud y pensión se calculan sobre el sueldo ya descontado",
  conUnDia.salud === Math.round((conUnDia.basico * 4) / 100) &&
    conUnDia.salud < sinFaltas.salud,
);

comprobar(
  "nunca se descuentan más días que los del período",
  liquidarConFaltas({ ...faltasVacias(), dias: 40, diasCompletos: 40 }).diasPagados,
  0,
);

/* --- Una liquidación CERRADA no se mueve --- */
const snapshotSinFaltas = construirSnapshot(sinFaltas, {
  jornadas: 0,
  fechaInicio: Q1.desde,
  fechaFin: Q1.hasta,
});
const cerradaConFaltasNuevas = obtenerLiquidacion(snapshotSinFaltas, () => ({
  config: {
    salarioBasico: SALARIO_FALTAS,
    auxTransporte: AUXILIO_FALTAS,
    tarifas: derivarTarifas(SALARIO_FALTAS, { divisor: 210, recargoDominical: 0.9 }),
    pctSalud: 4,
    pctPension: 4,
  },
  minutos: minutosVacios(),
  dias: 15,
  manuales: manualesVacios(),
  faltas: dosMismaSemana,
}));
comprobarQue("una liquidación cerrada sigue congelada", cerradaConFaltasNuevas.congelada);
comprobar(
  "…y no se le aplica una falta aprobada después",
  cerradaConFaltasNuevas.calculo.diasPagados,
  15,
);
comprobar(
  "…su neto no cambia",
  cerradaConFaltasNuevas.calculo.neto,
  sinFaltas.neto,
);

/* --- Un snapshot ANTERIOR a los permisos se lee como «sin faltas» --- */
const snapshotViejo = JSON.parse(JSON.stringify(snapshotSinFaltas));
delete snapshotViejo.calculo.diasPagados;
delete snapshotViejo.calculo.faltas;
const leidoViejo = normalizarSnapshot(snapshotViejo);
comprobar(
  "un snapshot de antes del 23 sep 2026 paga todos sus días",
  leidoViejo.calculo.diasPagados,
  15,
);
comprobar("…y no inventa faltas", leidoViejo.calculo.faltas.dias, 0);

/* ------------------------------------------------------------------ */

console.log(
  `\n${fallos === 0 ? "✓ TODO EN VERDE" : "✗ HAY FALLOS"} — ${pruebas - fallos}/${pruebas} comprobaciones correctas${
    grupo ? "" : ""
  }\n`,
);
process.exit(fallos === 0 ? 0 : 1);
