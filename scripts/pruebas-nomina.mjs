/**
 * PRUEBAS DEL CÁLCULO DE NÓMINA
 * =============================
 * Comprueba `src/lib/nomina.ts` —el módulo puro que liquida un período— contra
 * el **volante de pago real** que GPI le entregó a Santiago Córdoba el 15 de
 * septiembre de 2026, más el resto de reglas del módulo (mapeo del desglose de
 * jornadas, composición de la hora festiva nocturna, snapshot congelado y
 * períodos). Desde el 18 sep 2026 prueba además:
 *   · `src/lib/dinero.ts`, el módulo ÚNICO de formato y lectura de dinero en
 *     formato colombiano (punto de miles, coma decimal) que usan el campo del
 *     panel, las server actions y el volante — con el caso del bug de las
 *     tarifas ×100 y el caso ambiguo de un solo punto;
 *   · la resolución «vigente desde» de la configuración mensual
 *     (`configVigente` / `estadoConfigMes` de `nomina.ts`).
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

const {
  CONCEPTOS_HORA,
  DIVISOR_HORAS_MES,
  FACTORES_TARIFA,
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
/* 1. El volante real de Santiago Córdoba                              */
/* ================================================================== */

/**
 * Datos del comprobante impreso (Insumos/SANTIAGO_CORDOBA_Q1_SEPTIEMBRE.pdf):
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
 * El salario mensual de la hoja «NOMINA 1» es 1.750.095 y el auxilio mensual
 * 249.095. Las horas extra del período, reconstruidas desde el valor hora
 * (1.750.095 / 240 = 7.292,0625), son **4 h extra diurnas + 12 h extra
 * nocturnas**: 4 × 1,25 + 12 × 1,75 = 26 horas equivalentes = $189.593,625, que
 * la hoja imprime redondeado a $189.594.
 */
grupoDe("Volante real de Santiago Córdoba — quincena, 15 días");

const SALARIO = 1_750_095;
const AUX_MENSUAL = 249_095;

const tarifas = derivarTarifas(SALARIO);
comprobar("valor hora = salario / 240", tarifas.horaBase, 7292.06);
comprobar("hora extra diurna = valor hora × 1,25", tarifas.extraDiurna, 9115.08);
comprobar("hora extra nocturna = valor hora × 1,75", tarifas.extraNocturna, 12761.11);

const manualesSantiago = manualesVacios();
manualesSantiago.valores.bonificacion = 151_000;

const minutosSantiago = minutosVacios();
minutosSantiago.ordinariaDiurna = 15 * 8 * 60; // informativas: ya van en el básico
minutosSantiago.extraDiurna = 4 * 60;
minutosSantiago.extraNocturna = 12 * 60;

const santiago = calcularLiquidacion({
  config: {
    salarioBasico: SALARIO,
    auxTransporte: AUX_MENSUAL,
    tarifas,
    pctSalud: 4,
    pctPension: 4,
  },
  minutos: minutosSantiago,
  dias: 15,
  manuales: manualesSantiago,
});

comprobar("SALARIOS (básico = salario / 30 × 15)", santiago.basico, 875_048);
comprobar("AUXILIO DE TRANSPORTE (mensual / 30 × 15)", santiago.auxTransporte, 124_548);
comprobar("HORAS EXTRAS (4 h diurnas + 12 h nocturnas)", santiago.totalHoras, 189_593);
comprobar("BONO (concepto manual)", santiago.totalDevengadosManuales, 151_000);
comprobar("TOTALES devengados", santiago.totalDevengado, 1_340_189);
comprobar("base de salud y pensión (básico + horas)", santiago.baseSeguridadSocial, 1_064_641);
comprobar("SALUD (4 %)", santiago.salud, 42_586);
comprobar("PENSION (4 %)", santiago.pension, 42_586);
comprobar("TOTALES descuentos", santiago.totalDescuentos, 85_172);
comprobar("NETO A PAGAR", santiago.neto, 1_255_017);

comprobarQue(
  "las horas ordinarias diurnas se muestran pero NO se pagan aparte",
  santiago.lineasHoras.find((l) => l.clave === "ordinariaDiurna").valor === 0 &&
    santiago.minutosOrdinarios === 7200,
);

console.log(`
   Nota sobre el redondeo: el Excel de GPI arrastra centavos y solo redondea al
   imprimir, así que sus subtotales no cuadran al sumarlos a mano (875.048 +
   124.548 + 189.594 + 151.000 = 1.340.190, pero el volante imprime 1.340.189).
   Aquí se paga en pesos enteros línea por línea, así que el volante SÍ cuadra:
   horas extra ${formatearPesos(santiago.totalHoras)} en vez de $189.594 y
   descuentos ${formatearPesos(santiago.totalDescuentos)} en vez de $85.171
   (±1 peso), y el NETO coincide exactamente: ${formatearPesos(santiago.neto)}.`);

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
/* 4. Factores derivados y la incoherencia festiva del Excel           */
/* ================================================================== */

grupoDe("Tarifas sugeridas");

comprobar("divisor de horas del mes", DIVISOR_HORAS_MES, 240);
comprobar("recargo nocturno (Excel y ley coinciden)", FACTORES_TARIFA.rotacionNocturna, 0.35);
comprobar("hora en festivo (valor del Excel de GPI)", FACTORES_TARIFA.festivo, 2.15);
comprobar("extra diurna en festivo (valor legal)", FACTORES_TARIFA.extraFestivoDiurna, 2.05);
comprobarQue(
  "queda registrada la inversión festiva que GPI debe confirmar (extra < ordinaria)",
  FACTORES_TARIFA.extraFestivoDiurna < FACTORES_TARIFA.festivo,
);

const t2 = derivarTarifas(2_400_000);
comprobar("salario 2.400.000 → hora base 10.000", t2.horaBase, 10_000);
comprobar("salario 2.400.000 → recargo nocturno 3.500", t2.rotacionNocturna, 3_500);

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
    tarifas: derivarTarifas(1_300_000),
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

const snapshot = construirSnapshot(santiago, {
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
    tarifas: derivarTarifas(1_300_000),
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

/* ------------------------------------------------------------------ */

console.log(
  `\n${fallos === 0 ? "✓ TODO EN VERDE" : "✗ HAY FALLOS"} — ${pruebas - fallos}/${pruebas} comprobaciones correctas${
    grupo ? "" : ""
  }\n`,
);
process.exit(fallos === 0 ? 0 : 1);
