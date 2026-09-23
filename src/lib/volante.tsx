/**
 * VOLANTE DE PAGO (comprobante de nómina) EN PDF
 * ==============================================
 * Genera el PDF con `@react-pdf/renderer` **en el servidor**, sin navegador
 * headless y sin `window.print()`: el resultado es un archivo de verdad que el
 * navegador descarga.
 *
 * Lo comparten las dos rutas que lo sirven:
 *   · `/admin/nomina/volante/[id]/pdf` — para managers, cualquier liquidación.
 *   · `/mi-cuenta/volante/[id]/pdf`    — para el propio empleado, solo cuando
 *     su liquidación está cerrada o pagada (lo garantiza además la RLS de la
 *     migración 0011).
 *
 * QUÉ LLEVA Y POR QUÉ
 * -------------------
 * Los mismos bloques que GPI ya espera de su comprobante actual —razón social,
 * NIT, «COMPROBANTE DE NÓMINA», empleado, cédula, período, fecha de pago,
 * devengados, descuentos, totales, neto y las dos firmas—, con tres mejoras
 * sobre el que usan hoy:
 *
 *   1. el **período son fechas reales** (en el volante actual, hecho a mano,
 *      un recibo de septiembre seguía diciendo «QUINCENA DE ENERO»);
 *   2. las horas extra van **desglosadas**, con su cantidad y su valor por
 *      hora, en vez de una sola línea con el total;
 *   3. los subtotales **cuadran al sumarlos** (ver la nota de redondeo de
 *      `src/lib/nomina.ts`).
 *
 * El logo se lee de `public/images/logo-volante.png` (una copia liviana del
 * logo, 560 px) y está declarado en `outputFileTracingIncludes` de
 * `next.config.ts` para que viaje con la función en Vercel. Si por lo que sea
 * no se pudiera leer, el encabezado se pinta sin él en vez de fallar.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Document,
  // Se importa con otro nombre porque `Image` dispara la regla de accesibilidad
  // de JSX (que espera un `alt`): esto no es una etiqueta `<img>` del navegador,
  // es la primitiva de dibujo de react-pdf.
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  NOMINA_ESTADO_LABELS,
  etiquetaPeriodo,
  formatearHorasNomina,
  type LiquidacionCalculada,
  type NominaEstado,
  type TipoPeriodo,
} from "@/lib/nomina";
import {
  formatearDinero,
  formatearNumero,
  formatearPesos,
  formatearPorcentaje,
} from "@/lib/dinero";
import type { EmpresaSettings } from "@/data/site";

/* ------------------------------------------------------------------ */
/* Datos que necesita el volante                                       */
/* ------------------------------------------------------------------ */

export interface DatosVolante {
  empresa: EmpresaSettings;
  empleado: {
    nombre: string;
    cedula: string | null;
    cargo: string | null;
    usuario: string | null;
  };
  periodo: {
    tipo: TipoPeriodo;
    anio: number;
    mes: number;
    quincena: 1 | 2 | null;
    fechaInicio: string;
    fechaFin: string;
  };
  estado: NominaEstado;
  fechaPago: string | null;
  dias: number;
  notas: string;
  calculo: LiquidacionCalculada;
  /** Cuántas jornadas aprobadas entraron en el cálculo. */
  jornadas: number;
  /** Fecha de hoy en Colombia, para el pie. */
  hoy: string;
}

/* ------------------------------------------------------------------ */
/* Estilos                                                             */
/* ------------------------------------------------------------------ */

const VERDE = "#2c8420";
const VERDE_SUAVE = "#eef7ea";
const GRIS = "#6d6e71";
const LINEA = "#dfe3df";
const TINTA = "#15181b";

const s = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 46,
    paddingHorizontal: 40,
    fontSize: 9,
    color: TINTA,
    fontFamily: "Helvetica",
  },

  /* Encabezado */
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: VERDE,
    paddingBottom: 12,
  },
  logo: { width: 120 },
  empresaBloque: { alignItems: "flex-end", maxWidth: 300 },
  razonSocial: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    color: TINTA,
  },
  empresaLinea: { fontSize: 8.5, color: GRIS, marginTop: 2, textAlign: "right" },

  titulo: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    color: VERDE,
  },
  subtitulo: { marginTop: 3, fontSize: 9.5, color: GRIS },

  aviso: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#f0c36d",
    backgroundColor: "#fdf6e6",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 8.5,
    color: "#8a5b00",
  },

  /* Ficha del empleado */
  ficha: {
    marginTop: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: LINEA,
    borderRadius: 4,
  },
  fichaColumna: { flex: 1, padding: 10 },
  fichaSeparador: { borderLeftWidth: 1, borderLeftColor: LINEA },
  fichaFila: { flexDirection: "row", marginBottom: 4 },
  fichaEtiqueta: { width: 74, color: GRIS, fontSize: 8.5 },
  fichaValor: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 9 },

  /* Tablas */
  seccion: { marginTop: 16 },
  seccionTitulo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    color: VERDE,
    marginBottom: 5,
  },
  tabla: { borderWidth: 1, borderColor: LINEA, borderRadius: 4 },
  filaCabecera: {
    flexDirection: "row",
    backgroundColor: "#f4f6f4",
    borderBottomWidth: 1,
    borderBottomColor: LINEA,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eef0ee",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  filaTotal: {
    flexDirection: "row",
    backgroundColor: "#f4f6f4",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  thConcepto: { flex: 1, fontSize: 8, color: GRIS, fontFamily: "Helvetica-Bold" },
  thNum: {
    width: 78,
    fontSize: 8,
    color: GRIS,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  tdConcepto: { flex: 1 },
  tdConceptoNota: { fontSize: 7.5, color: GRIS, marginTop: 1.5 },
  tdNum: { width: 78, textAlign: "right" },
  negrita: { fontFamily: "Helvetica-Bold" },
  apagado: { color: GRIS },

  /* Neto */
  neto: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: VERDE_SUAVE,
    borderWidth: 1,
    borderColor: "#bfe0b3",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  netoEtiqueta: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: VERDE,
  },
  netoValor: { fontSize: 17, fontFamily: "Helvetica-Bold", color: VERDE },

  notas: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: LINEA,
    borderRadius: 4,
    padding: 9,
    fontSize: 8.5,
    color: GRIS,
  },

  /* Firmas */
  firmas: { marginTop: 34, flexDirection: "row", justifyContent: "space-between" },
  firma: { width: "42%", alignItems: "center" },
  firmaLinea: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: GRIS,
    marginBottom: 5,
  },
  firmaTexto: { fontSize: 8.5, color: GRIS, letterSpacing: 0.6 },

  pie: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: LINEA,
    paddingTop: 6,
    fontSize: 7.5,
    color: GRIS,
    textAlign: "center",
  },
});

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

/** "2026-09-15" → "15/09/2026"; vacío → "—". */
function fecha(valor: string | null | undefined): string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "—";
  return `${valor.slice(8, 10)}/${valor.slice(5, 7)}/${valor.slice(0, 4)}`;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={s.fichaFila}>
      <Text style={s.fichaEtiqueta}>{etiqueta}</Text>
      <Text style={s.fichaValor}>{valor || "—"}</Text>
    </View>
  );
}

function Renglon({
  concepto,
  nota,
  cantidad,
  unitario,
  valor,
  apagado = false,
}: {
  concepto: string;
  nota?: string;
  cantidad?: string;
  unitario?: string;
  valor: string;
  apagado?: boolean;
}) {
  return (
    <View style={s.fila}>
      <View style={s.tdConcepto}>
        <Text style={apagado ? s.apagado : undefined}>{concepto}</Text>
        {nota ? <Text style={s.tdConceptoNota}>{nota}</Text> : null}
      </View>
      <Text style={[s.tdNum, ...(apagado ? [s.apagado] : [])]}>
        {cantidad ?? ""}
      </Text>
      <Text style={[s.tdNum, ...(apagado ? [s.apagado] : [])]}>
        {unitario ?? ""}
      </Text>
      <Text style={[s.tdNum, ...(apagado ? [s.apagado] : [])]}>{valor}</Text>
    </View>
  );
}

function Cabecera({ primera }: { primera: string }) {
  return (
    <View style={s.filaCabecera}>
      <Text style={s.thConcepto}>{primera}</Text>
      <Text style={s.thNum}>CANTIDAD</Text>
      <Text style={s.thNum}>VALOR UNIT.</Text>
      <Text style={s.thNum}>VALOR</Text>
    </View>
  );
}

function Total({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <View style={s.filaTotal}>
      <Text style={[s.tdConcepto, s.negrita]}>{etiqueta}</Text>
      <Text style={s.tdNum} />
      <Text style={s.tdNum} />
      <Text style={[s.tdNum, s.negrita]}>{formatearPesos(valor)}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* El documento                                                        */
/* ------------------------------------------------------------------ */

function VolanteDocument({
  datos,
  logo,
}: {
  datos: DatosVolante;
  logo: { data: Buffer; format: "png" } | null;
}) {
  const { empresa, empleado, periodo, calculo: c } = datos;
  const borrador = datos.estado === "borrador";

  const etiqueta = etiquetaPeriodo(
    periodo.tipo,
    periodo.anio,
    periodo.mes,
    periodo.quincena,
  );

  // Solo las líneas que SE PAGAN: la de la jornada laboral ya está arriba, como
  // «Jornada laboral: N días» (el sueldo del período).
  const lineasHoras = c.lineasHoras.filter((l) => l.minutos > 0 && l.sePaga);
  const minutosTrabajados = c.minutosOrdinarios + c.minutosPagados;
  const devengadosManuales = c.devengadosManuales.filter((l) => l.valor > 0);
  const descuentosManuales = c.descuentosManuales.filter((l) => l.valor > 0);

  return (
    <Document
      title={`Comprobante de nómina — ${empleado.nombre}`}
      author={empresa.razonSocial}
      subject={etiqueta}
      creator="Panel de GPI"
    >
      <Page size="A4" style={s.page}>
        {/* ---------------- Encabezado ---------------- */}
        <View style={s.encabezado}>
          {logo ? (
            <PdfImage src={logo} style={s.logo} />
          ) : (
            <Text style={s.razonSocial}>GPI</Text>
          )}
          <View style={s.empresaBloque}>
            <Text style={s.razonSocial}>{empresa.razonSocial}</Text>
            <Text style={s.empresaLinea}>NIT {empresa.nit}</Text>
            {empresa.ciudad ? (
              <Text style={s.empresaLinea}>{empresa.ciudad}</Text>
            ) : null}
          </View>
        </View>

        <Text style={s.titulo}>COMPROBANTE DE NÓMINA</Text>
        <Text style={s.subtitulo}>{etiqueta}</Text>

        {borrador && (
          <Text style={s.aviso}>
            BORRADOR — esta liquidación todavía no se ha cerrado, así que las
            cifras pueden cambiar. No es un comprobante definitivo.
          </Text>
        )}

        {/* ---------------- Ficha ---------------- */}
        <View style={s.ficha}>
          <View style={s.fichaColumna}>
            <Dato etiqueta="Empleado" valor={empleado.nombre} />
            <Dato etiqueta="Cédula" valor={empleado.cedula ?? ""} />
            <Dato etiqueta="Cargo" valor={empleado.cargo ?? ""} />
            <Dato etiqueta="Usuario" valor={empleado.usuario ?? ""} />
          </View>
          <View style={[s.fichaColumna, s.fichaSeparador]}>
            <Dato
              etiqueta="Período"
              valor={`${fecha(periodo.fechaInicio)} – ${fecha(periodo.fechaFin)}`}
            />
            <Dato etiqueta="Días" valor={formatearNumero(c.dias)} />
            <Dato etiqueta="Fecha de pago" valor={fecha(datos.fechaPago)} />
            <Dato etiqueta="Estado" valor={NOMINA_ESTADO_LABELS[datos.estado]} />
          </View>
        </View>

        {/* ---------------- Devengados ---------------- */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>DEVENGADOS</Text>
          <View style={s.tabla}>
            <Cabecera primera="CONCEPTO" />

            {/* «Jornada laboral: N días» (23 sep 2026): lo que cubre el salario
                ya no se imprime como «horas ordinarias», sino como los días de
                jornada del período. Las horas trabajadas van más abajo, en una
                línea informativa sin dinero. */}
            <Renglon
              concepto={`Jornada laboral: ${formatearNumero(c.dias)} ${c.dias === 1 ? "día" : "días"}`}
              nota={`Salario mensual ${formatearPesos(c.salarioBasico)} ÷ 30 × ${formatearNumero(c.dias)} días`}
              cantidad={`${formatearNumero(c.dias)} días`}
              valor={formatearPesos(c.basico)}
            />

            {c.auxTransporte > 0 && (
              <Renglon
                concepto="Auxilio de transporte"
                nota={`Auxilio mensual ${formatearPesos(c.auxTransporteMensual)} ÷ 30 × ${formatearNumero(c.dias)} días`}
                cantidad={`${formatearNumero(c.dias)} días`}
                valor={formatearPesos(c.auxTransporte)}
              />
            )}

            {lineasHoras.map((l) => (
              <Renglon
                key={l.clave}
                concepto={l.label}
                nota={l.composicion}
                cantidad={formatearHorasNomina(l.minutos)}
                unitario={formatearDinero(l.tarifa)}
                valor={formatearPesos(l.valor)}
              />
            ))}

            {/* Informativo, sin dinero: lo trabajado de verdad en el período. */}
            {minutosTrabajados > 0 && (
              <Renglon
                concepto="Horas trabajadas en el período"
                nota={`De ellas, ${formatearHorasNomina(c.minutosOrdinarios)} son de la jornada laboral y ya están pagadas por el sueldo`}
                cantidad={formatearHorasNomina(minutosTrabajados)}
                valor="—"
                apagado
              />
            )}

            {devengadosManuales.map((l) => (
              <Renglon
                key={l.clave}
                concepto={l.label}
                nota={l.nota || undefined}
                valor={formatearPesos(l.valor)}
              />
            ))}

            <Total etiqueta="Total devengado" valor={c.totalDevengado} />
          </View>
        </View>

        {/* ---------------- Descuentos ---------------- */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>DESCUENTOS</Text>
          <View style={s.tabla}>
            <Cabecera primera="CONCEPTO" />

            <Renglon
              concepto="Salud"
              nota={`${formatearPorcentaje(c.pctSalud)} % sobre ${formatearPesos(c.baseSeguridadSocial)} (sueldo + horas y recargos)`}
              cantidad={`${formatearPorcentaje(c.pctSalud)} %`}
              valor={formatearPesos(c.salud)}
            />
            <Renglon
              concepto="Pensión"
              nota={`${formatearPorcentaje(c.pctPension)} % sobre ${formatearPesos(c.baseSeguridadSocial)}`}
              cantidad={`${formatearPorcentaje(c.pctPension)} %`}
              valor={formatearPesos(c.pension)}
            />

            {descuentosManuales.map((l) => (
              <Renglon
                key={l.clave}
                concepto={l.label}
                nota={l.nota || undefined}
                valor={formatearPesos(l.valor)}
              />
            ))}

            <Total etiqueta="Total descuentos" valor={c.totalDescuentos} />
          </View>
        </View>

        {/* ---------------- Neto ---------------- */}
        <View style={s.neto}>
          <Text style={s.netoEtiqueta}>NETO A PAGAR</Text>
          <Text style={s.netoValor}>{formatearPesos(c.neto)}</Text>
        </View>

        {datos.notas ? <Text style={s.notas}>{datos.notas}</Text> : null}

        {/* ---------------- Firmas ---------------- */}
        <View style={s.firmas}>
          <View style={s.firma}>
            <View style={s.firmaLinea} />
            <Text style={s.firmaTexto}>RECIBÍ CONFORME</Text>
          </View>
          <View style={s.firma}>
            <View style={s.firmaLinea} />
            <Text style={s.firmaTexto}>FIRMA AUTORIZADA</Text>
          </View>
        </View>

        {/* ---------------- Pie ---------------- */}
        <Text
          style={s.pie}
          render={({ pageNumber, totalPages }) =>
            `${empresa.notaVolante ? `${empresa.notaVolante}  ·  ` : ""}${
              datos.jornadas > 0
                ? `Horas tomadas de ${datos.jornadas} jornada${datos.jornadas === 1 ? "" : "s"} aprobada${datos.jornadas === 1 ? "" : "s"}.  ·  `
                : ""
            }Generado el ${fecha(datos.hoy)}  ·  Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

/** Logo del volante. Se cachea en memoria: es el mismo para todos los PDF. */
let logoCache: { data: Buffer; format: "png" } | null | undefined;

async function logoVolante() {
  if (logoCache !== undefined) return logoCache;
  try {
    const ruta = path.join(process.cwd(), "public", "images", "logo-volante.png");
    logoCache = { data: await readFile(ruta), format: "png" };
  } catch {
    // Sin logo el volante sigue siendo válido: mejor eso que un 500.
    logoCache = null;
  }
  return logoCache;
}

/** Genera el PDF del volante y devuelve sus bytes. */
export async function renderVolante(datos: DatosVolante): Promise<Uint8Array> {
  const logo = await logoVolante();
  return renderToBuffer(<VolanteDocument datos={datos} logo={logo} />);
}
