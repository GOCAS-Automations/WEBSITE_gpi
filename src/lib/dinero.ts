/**
 * DINERO: FORMATO Y LECTURA EN FORMATO COLOMBIANO
 * ===============================================
 * Módulo **PURO** —sin `"use client"`, sin importaciones— que usan a la vez el
 * navegador (el campo de dinero del panel, las tablas, el tablero) y el
 * servidor (las server actions de nómina y el volante en PDF). Es la ÚNICA
 * fuente de verdad de cómo se escribe y cómo se lee un importe:
 *
 *     punto para los miles  ·  coma para los decimales
 *     1.300.000             ·  9.115,08            ·  4,5 %
 *
 * Se puede ejecutar con `node --experimental-strip-types`, que es lo que hace
 * `scripts/pruebas-nomina.mjs` para probar los casos de abajo.
 *
 * POR QUÉ NO SE USA `Intl.NumberFormat`
 * -------------------------------------
 * Porque el resultado depende de los datos de idioma de cada entorno (Node en
 * Vercel, Chrome, Safari, el motor del PDF): según la versión, «es» agrupa o no
 * los números de cuatro cifras (9115 frente a 9.115), y usa un espacio duro
 * distinto entre «$» y la cifra. Una diferencia así entre servidor y navegador
 * rompe la hidratación de React. Aquí la regla está escrita a mano y es la
 * misma en todas partes.
 *
 * LA REGLA DE LECTURA (`parsearNumero`) — y el caso ambiguo del punto
 * -------------------------------------------------------------------
 * Ya hubo un bug grave aquí: «9115.08» (lo que manda un `<input type="number">`)
 * se leía borrando todos los puntos y se guardaba 911.508, cien veces la
 * tarifa. La regla que se aplica ahora, en este orden:
 *
 *  1. Se quitan los espacios (también los duros), el signo «$» y «COP».
 *  2. Si hay **coma y punto**, el que aparece ÚLTIMO es el decimal y el otro
 *     separa miles: «1.300.000,50» (colombiano) y «1,300,000.50» (formato
 *     inglés, p. ej. pegado de otra hoja de cálculo) dan lo mismo.
 *  3. Si solo hay **comas**: una sola es el decimal («9115,08», «4,5»); varias
 *     son miles («1,300,000»).
 *  4. Si solo hay **puntos**: varios son miles («1.300.000»). Con **un solo
 *     punto** —el caso ambiguo— manda el formato colombiano: es separador de
 *     MILES si le siguen exactamente tres dígitos y hay algo distinto de cero
 *     delante («9.115» = nueve mil ciento quince; «1.300» = mil trescientos).
 *     En cualquier otro caso es el DECIMAL: «9115.08», «4.5», «0.125».
 *     ¿Por qué? Porque un separador de miles SIEMPRE va seguido de tres cifras:
 *     si no las lleva, ese punto no puede ser de miles. Y con tres cifras
 *     detrás, en Colombia nadie escribe «9.115» queriendo decir nueve pesos con
 *     ciento quince milésimas (el peso no tiene milésimas): quiere decir
 *     9.115 pesos.
 *  5. Los grupos de miles se VALIDAN: el primero lleva de 1 a 3 cifras y los
 *     demás exactamente 3. «1.30.000» no es un número (es un error de
 *     digitación) y devuelve `null`, en vez de adivinar una cifra.
 *  6. Un signo menos al principio («-1.500») da un negativo: decidir si se
 *     acepta es cosa de quien llama (en nómina ningún importe puede serlo).
 *
 * Devuelve `null` cuando el texto está vacío o no es un número: quien llama
 * decide si eso es «cero» (un campo opcional) o un error que hay que mostrar.
 */

/* ================================================================== */
/* 1. Lectura                                                          */
/* ================================================================== */

const MILES_PRIMER_GRUPO = /^\d{1,3}$/;
const MILES_GRUPO = /^\d{3}$/;

/** «1.300.000» con `sep = "."` → «1300000»; `null` si los grupos no cuadran. */
function quitarMiles(entero: string, sep: string): string | null {
  const grupos = entero.split(sep);
  if (grupos.length === 1) return /^\d+$/.test(entero) ? entero : null;
  if (!MILES_PRIMER_GRUPO.test(grupos[0])) return null;
  for (let i = 1; i < grupos.length; i++) {
    if (!MILES_GRUPO.test(grupos[i])) return null;
  }
  return grupos.join("");
}

/**
 * Lee un número escrito por una persona (o pegado de otra parte). Ver la regla
 * completa en la cabecera del archivo.
 *
 *   "1.300.000" → 1300000   ·  "9.115,08" → 9115.08  ·  "9115,08" → 9115.08
 *   "9115.08"   → 9115.08   ·  "9.115"    → 9115     ·  "$ 1.300.000" → 1300000
 *   ""          → null      ·  "abc"      → null     ·  "1.30.000"    → null
 */
export function parsearNumero(bruto: unknown): number | null {
  if (typeof bruto === "number") return Number.isFinite(bruto) ? bruto : null;
  if (typeof bruto !== "string") return null;

  let texto = bruto
    .replace(/[\s  ]/g, "")
    .replace(/\$/g, "")
    .replace(/cop/gi, "");
  if (texto === "") return null;

  let signo = 1;
  if (/^[-−]/.test(texto)) {
    signo = -1;
    texto = texto.slice(1);
  } else if (texto.startsWith("+")) {
    texto = texto.slice(1);
  }
  if (texto === "" || !/^[\d.,]+$/.test(texto)) return null;

  const ultimaComa = texto.lastIndexOf(",");
  const ultimoPunto = texto.lastIndexOf(".");

  let entero: string;
  let decimales = "";

  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    // Regla 2: el separador que aparece último es el decimal.
    const decimal = ultimaComa > ultimoPunto ? "," : ".";
    const miles = decimal === "," ? "." : ",";
    const pos = texto.lastIndexOf(decimal);
    entero = texto.slice(0, pos);
    decimales = texto.slice(pos + 1);
    if (entero.includes(decimal) || decimales.includes(miles)) return null;
    const limpio = quitarMiles(entero, miles);
    if (limpio === null) return null;
    entero = limpio;
  } else if (ultimaComa >= 0) {
    // Regla 3: solo comas.
    const comas = texto.split(",").length - 1;
    if (comas === 1) {
      [entero, decimales] = texto.split(",");
    } else {
      const limpio = quitarMiles(texto, ",");
      if (limpio === null) return null;
      entero = limpio;
    }
  } else if (ultimoPunto >= 0) {
    // Regla 4: solo puntos.
    const puntos = texto.split(".").length - 1;
    if (puntos > 1) {
      const limpio = quitarMiles(texto, ".");
      if (limpio === null) return null;
      entero = limpio;
    } else {
      const [antes, despues] = texto.split(".");
      const esMiles =
        despues.length === 3 && MILES_PRIMER_GRUPO.test(antes) && !/^0*$/.test(antes);
      if (esMiles) {
        entero = antes + despues;
      } else {
        entero = antes;
        decimales = despues;
      }
    }
  } else {
    entero = texto;
  }

  if (entero === "") entero = "0";
  if (!/^\d+$/.test(entero) || !/^\d*$/.test(decimales)) return null;

  const n = Number(decimales ? `${entero}.${decimales}` : entero);
  return Number.isFinite(n) ? signo * n : null;
}

/* ================================================================== */
/* 2. Escritura                                                        */
/* ================================================================== */

/** «1300000» → «1.300.000». Solo dígitos, sin signo. */
function agruparMiles(digitos: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Número con el formato colombiano: punto de miles y coma decimal.
 *
 *   formatearNumero(1300000)                 → "1.300.000"
 *   formatearNumero(9115.08)                 → "9.115,08"
 *   formatearNumero(4.5)                     → "4,5"
 *   formatearNumero(9115.5, { minDecimales: 2 }) → "9.115,50"
 *
 * `maxDecimales` redondea (2 por defecto); `minDecimales` rellena con ceros.
 * `miles: false` no agrupa (porcentajes, días).
 */
export function formatearNumero(
  valor: number,
  {
    minDecimales = 0,
    maxDecimales = 2,
    miles = true,
  }: { minDecimales?: number; maxDecimales?: number; miles?: boolean } = {},
): string {
  const n = Number.isFinite(valor) ? valor : 0;
  const factor = 10 ** maxDecimales;
  const redondeado = Math.round(Math.abs(n) * factor) / factor;
  const negativo = n < 0 && redondeado !== 0;

  const [entero, fraccionBruta = ""] = redondeado.toFixed(maxDecimales).split(".");
  let fraccion = fraccionBruta.replace(/0+$/, "");
  while (fraccion.length < minDecimales) fraccion += "0";

  const parteEntera = miles ? agruparMiles(entero) : entero;
  return `${negativo ? "-" : ""}${parteEntera}${fraccion ? `,${fraccion}` : ""}`;
}

/**
 * Pesos ENTEROS con separador de miles, sin símbolo (tablas apretadas):
 * 1255017 → "1.255.017".
 */
export function formatearMiles(valor: number): string {
  return formatearNumero(Math.round(Number.isFinite(valor) ? valor : 0), {
    maxDecimales: 0,
  });
}

/** Espacio duro entre «$» y la cifra: nunca se parten en dos líneas. */
const ESPACIO_DURO = " ";

/** Pesos ENTEROS con símbolo: 1255017 → "$ 1.255.017" · -500 → "-$ 500". */
export function formatearPesos(valor: number): string {
  const n = Math.round(Number.isFinite(valor) ? valor : 0);
  const cifra = formatearMiles(Math.abs(n));
  return `${n < 0 ? "-" : ""}$${ESPACIO_DURO}${cifra}`;
}

/**
 * Importe que PUEDE llevar centavos (las tarifas por hora): con centavos
 * siempre muestra dos decimales, sin ellos ninguno.
 *
 *   9115.08 → "$ 9.115,08" · 9115.5 → "$ 9.115,50" · 10000 → "$ 10.000"
 */
export function formatearDinero(valor: number): string {
  const n = Number.isFinite(valor) ? Math.round(valor * 100) / 100 : 0;
  const conCentavos = !Number.isInteger(n);
  const cifra = formatearNumero(Math.abs(n), {
    minDecimales: conCentavos ? 2 : 0,
    maxDecimales: 2,
  });
  return `${n < 0 ? "-" : ""}$${ESPACIO_DURO}${cifra}`;
}

/** Porcentaje sin miles y con coma decimal: 4 → "4" · 4.5 → "4,5". */
export function formatearPorcentaje(valor: number): string {
  return formatearNumero(valor, { maxDecimales: 2, miles: false });
}

/* ================================================================== */
/* 3. El campo de dinero mientras se escribe                           */
/* ================================================================== */

export interface OpcionesEntrada {
  /** Cuántos decimales se dejan escribir (0 = pesos enteros). */
  decimales?: number;
  /** false = sin puntos de miles (porcentajes). */
  miles?: boolean;
  /** Tope de cifras de la parte entera (12 = hasta 999.999.999.999). */
  maxEnteros?: number;
}

/**
 * Reformatea lo que hay en un campo de dinero MIENTRAS se escribe, y dice dónde
 * debe quedar el cursor para que no salte.
 *
 * La idea: lo único que importa del texto son las CIFRAS y la COMA decimal; los
 * puntos de miles los pone el campo. Se cuenta cuántas de esas piezas
 * significativas había a la izquierda del cursor y, después de reformatear, se
 * deja el cursor justo después de esa misma cantidad. Así, al escribir un «0»
 * en «1.300|» el cursor queda en «13.000|» y no al principio ni al final.
 *
 * Sin `miles`, un punto escrito a mano se toma como la coma decimal (en un
 * porcentaje nadie escribe miles). Con `miles`, los puntos se ignoran: los que
 * haya los vuelve a poner el campo. Lo de convertir en coma el punto que se
 * ACABA de teclear (el del teclado numérico) lo decide el componente, que sabe
 * qué tecla se pulsó; lo de pegar «9115.08» también: pasa por `parsearNumero`.
 *
 * Es pura para poder probarla sin navegador.
 */
export function reformatearEntrada(
  bruto: string,
  cursor: number,
  { decimales = 0, miles = true, maxEnteros = 12 }: OpcionesEntrada = {},
): { texto: string; cursor: number } {
  let entero = "";
  let fraccion = "";
  let hayComa = false;
  let antes = 0; // piezas significativas que quedan a la izquierda del cursor

  for (let i = 0; i < bruto.length; i++) {
    const ch = bruto[i];
    let conservada = false;
    if (ch >= "0" && ch <= "9") {
      if (!hayComa) {
        if (entero.length < maxEnteros) {
          entero += ch;
          conservada = true;
        }
      } else if (fraccion.length < decimales) {
        fraccion += ch;
        conservada = true;
      }
    } else if (
      decimales > 0 &&
      !hayComa &&
      (ch === "," || (!miles && ch === "."))
    ) {
      hayComa = true;
      conservada = true;
    }
    if (conservada && i < cursor) antes += 1;
  }

  // Ceros a la izquierda fuera («007» → «7»), pero «0,5» se queda.
  const sinCeros = entero.replace(/^0+(?=\d)/, "");
  const quitados = entero.length - sinCeros.length;
  antes -= Math.min(quitados, antes);
  entero = sinCeros;

  // «,5» → «0,5»: el cero se añade delante, así que empuja el cursor.
  if (hayComa && entero === "") {
    entero = "0";
    if (antes > 0) antes += 1;
  }

  const texto =
    (miles ? agruparMiles(entero) : entero) + (hayComa ? `,${fraccion}` : "");

  // Dónde queda el cursor: después de la pieza significativa número `antes`.
  let posicion = 0;
  let contadas = 0;
  while (posicion < texto.length && contadas < antes) {
    if (texto[posicion] !== ".") contadas += 1;
    posicion += 1;
  }

  return { texto, cursor: posicion };
}

/**
 * Texto con el que arranca un campo de dinero a partir de un número guardado.
 * `vacioSiCero` deja el campo en blanco en vez de mostrar «0».
 */
export function textoDeEntrada(
  valor: number | null | undefined,
  {
    decimales = 0,
    miles = true,
    vacioSiCero = true,
  }: { decimales?: number; miles?: boolean; vacioSiCero?: boolean } = {},
): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "";
  if (valor === 0 && vacioSiCero) return "";
  const conDecimales = decimales > 0 && !Number.isInteger(Math.round(valor * 10 ** decimales) / 10 ** decimales);
  return formatearNumero(valor, {
    maxDecimales: decimales,
    minDecimales: conDecimales && miles ? decimales : 0,
    miles,
  });
}

/**
 * El valor LIMPIO que viaja al servidor desde un campo de dinero: sin miles y
 * con punto decimal («1300000», «9115.08»), o "" si el campo está vacío. El
 * servidor lo vuelve a leer con `parsearNumero` —el mismo módulo—, así que un
 * valor limpio y uno escrito a mano se entienden igual.
 */
export function valorLimpio(texto: string): string {
  const n = parsearNumero(texto);
  return n === null ? "" : String(n);
}
