/**
 * TEXTOS DE AYUDA DEL PANEL (AYUDA_*)
 * ===================================
 * Módulo PURO —solo cadenas, sin importaciones y sin "use client"—, para que
 * lo puedan importar a la vez los Server Components y los Client Components.
 *
 * Por qué viven aquí y no en `ui.tsx` (22 sep 2026): los Client Components de
 * nómina (`ConfigNominaForm`, `LiquidacionPanel`) importaban estas constantes
 * de `ui.tsx`, y eso arrastraba `ui.tsx` entero al grafo del navegador —justo
 * lo que la nota de `ui-base.tsx` prohíbe—. Resultado, medido con
 * `next build` + `next start`: de vez en cuando la server action respondía
 * completa pero el botón se quedaba en «Guardando…». `ui.tsx` las reexporta,
 * así que ningún import de un Server Component cambió; un Client Component
 * las importa SIEMPRE de aquí.
 */

/* ------------------------------------------------------------------ */
/* Ayuda para personas no técnicas                                     */
/* ------------------------------------------------------------------ */

/**
 * TEXTOS DE AYUDA REUTILIZADOS
 * ----------------------------
 * Viven aquí (y no repetidos en cada pantalla) para que digan siempre lo mismo.
 * Están escritos en español llano, sin jerga: quien usa el panel no es técnico.
 */
/** Cuánto tarda en verse un cambio en el sitio público. */
export const AYUDA_PUBLICACION =
  "Lo que guardes aquí se ve en el sitio en pocos minutos.";

/** Qué hace el campo "Orden" (aparece en servicios, proyectos, clientes, FAQ y valores). */
export const AYUDA_ORDEN =
  "El número controla la posición: el más bajo aparece primero.";

/** Diferencia entre ocultar y eliminar. */
export const AYUDA_VISIBILIDAD =
  "Ocultar es reversible y no borra nada: el contenido se conserva aquí y puedes volver a mostrarlo cuando quieras. Eliminar sí es permanente. Para retirar algo del sitio de forma temporal, oculta.";

/**
 * Listados de contenido paginados (servicios, proyectos, clientes, FAQ,
 * valores): el orden se cambia con el número de ORDEN de cada elemento, así
 * que un elemento puede cambiar de página al guardarlo.
 */
export const AYUDA_ORDEN_PAGINAS =
  "La lista va de 10 en 10, ordenada por el número de orden. Si le cambias el orden a un elemento y guardas, pasa a su nuevo lugar aunque quede en otra página.";

/** Qué es el texto alternativo de una imagen y por qué importa. */
export const AYUDA_ALT =
  "Describe en pocas palabras lo que se ve en la foto. Lo leen en voz alta los programas que usan las personas con discapacidad visual y le sirve a Google para entender la imagen.";

/**
 * Recomendación práctica para las imágenes.
 *
 * Las dos vías funcionan y ninguna es «la de verdad»: subir el archivo lo
 * guarda en el almacenamiento del propio sitio, y pegar una URL sirve para
 * imágenes que ya están publicadas en internet. Cloudinary se nombra por su
 * nombre porque «pega una URL» a secas no le dice nada a quien nunca ha
 * alojado una imagen, y porque es uno de los servicios que el sitio tiene
 * autorizados (ver `src/lib/imagenes.ts` y `next.config.ts`).
 */
export const AYUDA_IMAGEN =
  "Sube la imagen desde tu computador (se guarda en el almacenamiento del sitio) o pega una URL. Recomendación: sube tus imágenes a Cloudinary (cloudinary.com, gratuito) y pega aquí la URL que te da — así tus imágenes quedan organizadas en tu propia cuenta. Lo ideal son fotos horizontales (más anchas que altas) y de menos de 1 MB: si pesan mucho, el sitio carga lento.";

/** Qué hace el bloque de video de un servicio (migración 0007). */
export const AYUDA_VIDEO_SERVICIO =
  "Pega el enlace de YouTube. El video aparece en la página del servicio con su título y descripción; el interruptor «Mostrar el video» empieza apagado: enciéndelo cuando el enlace esté listo para publicarse.";

/* --- Calendario interno (migración 0010) -------------------------- */

/** Para qué sirve el calendario y quién lo ve. */
export const AYUDA_CALENDARIO =
  "El calendario es la agenda interna de GPI: aquí se programa lo que hay que hacer, con su día, su hora y sus responsables. Solo lo ven el administrador y el coordinador; cada persona ve únicamente los eventos que le asignaron, en su Mi Cuenta.";

/** Qué significa cada estado de un evento. */
export const AYUDA_CALENDARIO_ESTADOS =
  "Todo evento nace «programado». Cuando pase el día, ciérralo: «cumplido» si salió completo, «incompleto» si no salió o quedó a medias, o «aplázalo» a otra fecha si se corrió. Un evento aplazado se mueve al día nuevo, sigue pendiente por hacer y el calendario recuerda para cuándo estaba al principio. Aplazar es mover la actividad HACIA ADELANTE: la fecha nueva tiene que ser posterior a la que el evento tiene ahora. Si te equivocaste al aplazar, el botón «Devolver a su fecha original» deshace el movimiento: el evento vuelve a su día de siempre y queda otra vez programado. Cada evento muestra solo los botones que tienen sentido en su estado: uno ya cumplido no se aplaza (si en realidad no se hizo, reábrelo primero), «Reabrir» solo aparece en los ya cerrados y «Devolver a su fecha original» solo en los que siguen abiertos y alguna vez se movieron —en uno ya cerrado esa fecha es parte de su historia y no se toca—. Reabrir un evento que alguna vez se movió lo devuelve a «aplazado», no a «programado»: sigue abierto, pero en un día distinto al original.";

/** Diferencia entre marcar incompleto y eliminar (mismo espíritu que rechazar ≠ eliminar). */
export const AYUDA_CALENDARIO_ELIMINAR =
  "Marcar como incompleto NO es eliminar: lo primero deja constancia de que la actividad no salió, con sus notas; lo segundo borra el evento y su historia para siempre. Elimina solo los eventos de prueba o los creados por error.";

/** Para qué son las notas y quién las escribe. */
export const AYUDA_CALENDARIO_NOTAS =
  "Las notas son el seguimiento de cada evento: qué se hizo, qué faltó o por qué se movió de fecha. Las puede escribir un manager o cualquier responsable del evento desde su Mi Cuenta, y quedan firmadas con su nombre y su fecha. No se ven en la cuadrícula del calendario: se leen aquí y dentro de cada evento.";

/** Cómo funcionan los responsables, incluidos los externos. */
export const AYUDA_CALENDARIO_RESPONSABLES =
  "Un evento puede tener varios responsables: cuentas del portal —a quienes les aparece en Mi Cuenta y pueden dejar notas— y personas externas (un contratista, el contacto del cliente) cuyo nombre se escribe a mano con la opción «Otro». Los externos quedan registrados, pero no reciben acceso al sistema.";

/* --- Nómina (migración 0011) -------------------------------------- */

/** Qué es el módulo de nómina y de dónde saca las cifras. */
export const AYUDA_NOMINA =
  "Aquí se calcula, empleado por empleado, lo que hay que pagarle en cada período. Las horas salen SOLAS de las jornadas que ya aprobaste; el salario y el valor de cada tipo de hora salen de la pestaña «Configuración» (lo último que se guardó para esa persona en este mes o en uno anterior: no hace falta abrir cada mes), y los bonos, préstamos y demás se digitan al abrir cada empleado. Con el filtro «Persona» ves, liquidas y exportas solo a quien elijas.";

/**
 * El modelo «vigente desde» de la configuración (18 sep 2026) y dónde van los
 * montos que solo se pagan o descuentan una vez.
 */
export const AYUDA_NOMINA_CONFIG =
  "Lo que guardas aquí rige desde el mes elegido EN ADELANTE: no hace falta configurar mes por mes. Si en marzo le suben el salario a alguien, abre marzo, cambia el salario y guarda: enero y febrero se quedan como estaban y de marzo en adelante se paga lo nuevo. Si un mes se configuró por error, «Quitar el cambio» lo devuelve a lo que traía del mes anterior. Si alguien se retira o sale a una licencia sin sueldo, abre el primer mes en que ya no se le paga y usa «Dejar sin configuración desde este mes». Ojo: un monto que solo aplica UNA vez —un bono, un descuento puntual, una cuota de préstamo— NO va aquí, porque se repetiría todos los meses; va en los conceptos de la liquidación de ese período (pestaña «Liquidación», al abrir a la persona). Las liquidaciones ya cerradas nunca cambian.";

/**
 * «Dejar sin configuración desde este mes» (un CORTE, 22 sep 2026): corta la
 * herencia en un mes que hereda. Se muestra junto al botón.
 */
export const AYUDA_NOMINA_CORTE =
  "Para cuando alguien se retira o sale a una licencia sin sueldo: desde este mes deja de heredar la configuración y no se le liquida, hasta que guardes un cambio nuevo. Los meses anteriores no se tocan y se puede deshacer.";

/**
 * Qué les pasa a las liquidaciones al quitar un cambio o dejar un mes sin
 * configuración (la regla de los borradores, 22 sep 2026).
 */
export const AYUDA_NOMINA_BORRADORES =
  "Las liquidaciones cerradas y pagadas NO se tocan nunca: conservan su cálculo congelado y su volante. Las que están en borrador se recalculan solas con la configuración que quede; si su mes se queda sin ninguna configuración, se eliminan, porque ya no hay con qué calcularlas.";

/** Qué es un período y por qué no es texto libre. */
export const AYUDA_NOMINA_PERIODO =
  "Se liquida por quincena (del 1 al 15 y del 16 al último día del mes) o por mes completo. El período no se escribe a mano: se elige el mes y la quincena, y las fechas salen del calendario. Los DÍAS liquidados, en cambio, siguen la convención de nómina de mes de 30 días: una quincena completa son 15 días, tenga el mes 28 o 31.";

/** La regla que más confunde: el salario ya paga las horas ordinarias. */
export const AYUDA_NOMINA_TARIFAS =
  "El salario básico ya paga las horas de la jornada laboral diurna: esas NO se suman aparte (en la liquidación y en el volante aparecen como «Jornada laboral: N días»). Las siete tarifas son pesos por hora que se pagan ADEMÁS del salario. La «hora de rotación diurna» es solo la referencia con la que se calculan las otras. La «rotación nocturna» es un RECARGO: se paga por cada hora de la jornada trabajada de noche, porque la hora en sí ya está en el salario.";

/**
 * Las tarifas dejaron de ser editables (23 sep 2026): las calcula el sistema
 * con el salario y la ley del mes.
 */
export const AYUDA_NOMINA_TARIFAS_AUTOMATICAS =
  "El valor de cada tipo de hora NO se digita: lo calcula el sistema con la ley, para que la nómina resista una auditoría. La cuenta es salario ÷ el divisor de la jornada (con 42 horas semanales, 210) × el factor legal de cada tipo de hora, con el recargo de domingo y festivo vigente en el mes que se liquida (90 % desde el 1 de julio de 2026 y 100 % desde el 1 de julio de 2027). Tú solo escribes el salario, el auxilio de transporte y los porcentajes de salud y pensión. Cuando la ley cambie, las tarifas cambian solas: las liquidaciones en borrador se recalculan y las ya cerradas nunca se tocan.";

/** Por qué una liquidación cerrada ya no cambia (mismo espíritu que el desglose congelado). */
export const AYUDA_NOMINA_CERRAR =
  "Mientras está en BORRADOR, la liquidación se recalcula sola: si apruebas otra jornada o corriges una tarifa, la cifra cambia. Al CERRARLA queda congelada tal como está y ya no se mueve, aunque después se toque un horario o un valor. «Marcar pagada» solo añade la fecha en que se giró. Reabrir vuelve a borrador y borra el cálculo congelado: úsalo únicamente si hay que corregir algo.";

/** Las jornadas pendientes no se pagan. */
export const AYUDA_NOMINA_PENDIENTES =
  "Solo entran a la nómina las jornadas APROBADAS. Si en el período quedan jornadas pendientes de revisión, sus horas no se pagan: apruébalas primero en «Jornadas» y la liquidación se actualizará sola mientras siga en borrador.";

/** Qué es el volante y qué lleva. */
export const AYUDA_NOMINA_VOLANTE =
  "El volante es el comprobante de nómina que se le entrega al empleado: lleva sus datos, el período con fechas reales, el detalle de horas con su valor, los devengados, los descuentos y el neto a pagar, con espacio para las dos firmas. Se descarga en PDF y el empleado también puede bajarlo desde su Mi Cuenta cuando la liquidación está cerrada o pagada.";

/* --- Las reglas de cálculo de la nómina, en un solo sitio ---------- */

/**
 * TODAS LAS REGLAS CON QUE SE CALCULA LA NÓMINA (23 sep 2026)
 * ----------------------------------------------------------
 * GPI pidió un botón en `/admin/nomina` que abra una ventana con todas las
 * reglas explicadas para una persona NO técnica. Este es el único sitio donde
 * viven esos textos: si mañana cambia una regla del cálculo, se cambia AQUÍ y
 * la ventana queda al día sola.
 *
 * Es una estructura de datos (grupos con puntos), no JSX, para que la pueda
 * importar cualquiera —Server o Client Component— sin arrastrar nada al
 * navegador. `norma` es la cita legal en lenguaje llano, opcional.
 */
export interface ReglaNomina {
  titulo: string;
  /** Uno o varios párrafos en español llano. */
  puntos: string[];
  /** La norma que lo sostiene, escrita para quien no es abogado. */
  norma?: string;
}

export const REGLAS_NOMINA_INTRO =
  "Así calcula el sistema lo que hay que pagarle a cada persona. Todo sale de dos cosas: el salario que está en «Configuración» y las jornadas que ya se aprobaron en «Jornadas». Ningún valor por hora se digita a mano.";

export const REGLAS_NOMINA: ReglaNomina[] = [
  {
    titulo: "Qué cubre el salario",
    puntos: [
      "El salario mensual paga la JORNADA LABORAL: las horas del horario del mes trabajadas de día, en un día programado. Por eso en la liquidación y en el volante esas horas no aparecen como un renglón de dinero, sino como «Jornada laboral: N días» —el sueldo del período—, con una línea informativa que dice cuántas horas se trabajaron.",
      "El sueldo del período es salario ÷ 30 × los días liquidados. Es la convención de nómina: el mes son siempre 30 días, tenga 28 o 31, así que una quincena completa (15 días) es exactamente medio salario.",
      "El auxilio de transporte se escribe completo y el sistema lo reparte igual, entre los días liquidados.",
      "Todo lo demás —recargos y horas extra— se paga ADEMÁS del salario, hora por hora.",
    ],
  },
  {
    titulo: "Cómo se calcula el valor de una hora",
    puntos: [
      "Valor de la hora = salario mensual ÷ 210. El 210 sale de la jornada legal: 42 horas a la semana ÷ 6 × 30.",
      "Ese divisor cambia con la ley. Hasta el 14 de julio de 2026 la jornada era de 44 horas (divisor 220); desde el 15 de julio de 2026 es de 42 (divisor 210). El sistema usa el que corresponda al mes que se liquida.",
      "Si el horario que GPI carga para un mes tuviera MENOS horas que el máximo legal, se usa el del horario: nunca un divisor mayor que el legal, porque eso abarataría la hora.",
    ],
    norma: "Ley 2101 de 2021 (reducción de la jornada) y concepto del Ministerio del Trabajo sobre el valor de la hora.",
  },
  {
    titulo: "Los siete tipos de hora y su factor",
    puntos: [
      "Hora de rotación diurna (×1): la hora normal. Es solo la referencia con que se calculan las demás; no se paga aparte porque ya está en el salario.",
      "Rotación nocturna (×0,35): RECARGO que se suma por cada hora de la jornada trabajada de noche. La hora en sí ya la paga el salario.",
      "Hora extra diurna (×1,25): cada hora trabajada de día por encima de la jornada programada del día.",
      "Hora extra nocturna (×1,75): igual, pero de noche. El 0,35 del nocturno NO se suma encima: la ley no acumula esos dos recargos.",
      "Hora en domingo o festivo (×1,90 hoy): hora trabajada en domingo o festivo DENTRO de la jornada programada de ese día.",
      "Hora extra diurna en domingo o festivo (×2,15 hoy) y hora extra nocturna en domingo o festivo (×2,65 hoy): lo que se trabaja en domingo o festivo por encima de la jornada de ese día.",
      "Hay un octavo caso que no tiene tarifa propia: la hora de domingo o festivo trabajada de NOCHE. Se paga por composición —hora en festivo + rotación nocturna— y aparece con línea propia para que se pueda auditar.",
    ],
    norma: "Artículo 168 del Código Sustantivo del Trabajo (recargos nocturno y de horas extra) y artículo 179 (domingos y festivos).",
  },
  {
    titulo: "El recargo de domingo y festivo sube con los años",
    puntos: [
      "Era del 75 %, pasó al 80 % el 1 de julio de 2025, al 90 % el 1 de julio de 2026 y llegará al 100 % el 1 de julio de 2027.",
      "El sistema aplica SOLO el que rige en la fecha trabajada, y lo cambia él mismo: nadie tiene que tocar nada el 1 de julio de 2027.",
      "Por eso los factores de arriba se leen «hoy»: en julio de 2027 la hora en festivo pasa a ×2,00, la extra festiva diurna a ×2,25 y la nocturna a ×2,75.",
    ],
    norma: "Artículo 179 del Código Sustantivo del Trabajo, modificado por la Ley 2466 de 2025.",
  },
  {
    titulo: "Cuándo una hora es nocturna",
    puntos: [
      "La franja nocturna va de las 7:00 p. m. a las 6:00 a. m. Antes empezaba a las 9:00 p. m.",
      "Se mira minuto a minuto: un turno que empieza de día y termina de noche se parte solo entre lo diurno y lo nocturno, y un turno que cruza la medianoche cambia de día —y de tratamiento— a las 12:00 en punto.",
    ],
    norma: "Artículo 160 del Código Sustantivo del Trabajo, modificado por la Ley 2466 de 2025 (la franja de las 7:00 p. m. rige desde el 25 de diciembre de 2025).",
  },
  {
    titulo: "Los sábados",
    puntos: [
      "En el horario de GPI el sábado no es un día programado, así que ese día NO hay jornada ordinaria: todo lo que se trabaje es hora extra.",
      "Pero es hora extra NORMAL (×1,25 de día, ×1,75 de noche), no festiva: un sábado no lleva recargo de domingo.",
      "Si un sábado cae además un festivo, manda el festivo y sí lleva su recargo.",
    ],
    norma: "El recargo del artículo 179 es solo para domingos y festivos; un sábado trabajado se paga como cualquier hora extra.",
  },
  {
    titulo: "Los festivos y domingos que caen en un día programado",
    puntos: [
      "Un festivo entre semana —un lunes 12 de octubre, por ejemplo— SÍ tiene jornada programada: la del horario de ese día.",
      "Las horas que caben dentro de esa jornada se pagan como horas en domingo o festivo (×1,90 hoy), y solo lo que pase de ahí se paga como extra festiva (×2,15).",
      "Un domingo, en cambio, no tiene jornada programada en el horario de GPI: por eso todo el turno de un domingo va como extra festiva.",
    ],
    norma: "Artículo 179 del Código Sustantivo del Trabajo: el recargo del domingo o festivo se suma a la hora; el recargo de extra solo aplica a lo que pasa de la jornada.",
  },
  {
    titulo: "El almuerzo: tres reglas",
    puntos: [
      "El almuerzo no es tiempo de trabajo, así que cuando se descuenta no se paga. Como el empleado solo registra su entrada y su salida, el sistema decide si hubo almuerzo con estas tres reglas, en este orden.",
      "1. Turno nocturno: NUNCA se descuenta almuerzo. Turno nocturno significa, exactamente, que el turno no tiene ni un minuto entre las 6:00 a. m. y las 7:00 p. m. Por ejemplo, de 8:00 p. m. a 6:00 a. m. es nocturno; de 4:00 p. m. a 2:00 a. m. NO lo es, porque de 4:00 a 7:00 p. m. es de día.",
      "2. Día programado (lunes a viernes, sin festivo): se descuenta la hora de almuerzo del horario SOLO si el turno cubre la jornada programada completa, es decir si dura lo mismo o más que el horario de ese día (de lunes a jueves 9 horas y media, el viernes 9). Un turno de 6 horas no descuenta nada.",
      "3. Día no programado (sábado, domingo o festivo): se descuenta 1 hora SOLO si el turno dura 8 horas o más.",
      "Si ese mismo día ya se descontó el almuerzo en otra jornada, aquí no se vuelve a descontar: el almuerzo del día es uno solo.",
    ],
  },
  {
    titulo: "Dos jornadas el mismo día",
    puntos: [
      "Una persona puede registrar dos jornadas el mismo día (por ejemplo, mañana y noche), siempre que no se crucen: dos registros que se solapan se rechazan.",
      "La jornada ordinaria del día es UNA sola y se reparte por orden cronológico: la primera jornada la va gastando y la segunda arranca con lo que quede. Así las horas extra del día no se pierden.",
      "El almuerzo también se descuenta una sola vez al día.",
    ],
  },
  {
    titulo: "Solo se paga lo aprobado",
    puntos: [
      "A la nómina solo entran las jornadas APROBADAS. Una jornada pendiente de revisión no se paga: la pantalla lo avisa para que se apruebe primero en «Jornadas».",
      "Las horas de una jornada quedan CONGELADAS al aprobarla: cambiar después el horario del mes ya no las mueve. Para recalcularla hay que devolverla a pendiente y volver a aprobarla.",
    ],
  },
  {
    titulo: "Cerrar una liquidación la congela",
    puntos: [
      "Mientras está en BORRADOR, la liquidación se recalcula sola: si se aprueba otra jornada o se corrige el salario, la cifra cambia.",
      "Al CERRARLA se guarda el cálculo completo y ya no se mueve nunca, aunque después se toque un horario, un salario o la ley. El volante en PDF se imprime de ahí.",
      "«Marcar pagada» solo añade la fecha en que se giró. «Reabrir» vuelve a borrador y borra el cálculo congelado: es el mecanismo para corregir, y no es lo mismo que eliminar.",
    ],
  },
  {
    titulo: "Salud y pensión",
    puntos: [
      "Se descuentan del sueldo del período más las horas y recargos. NO entran ni el auxilio de transporte ni los bonos.",
      "El porcentaje de cada uno se configura por persona; lo normal es 4 % y 4 %.",
      "Todo se redondea a pesos enteros línea por línea, para que el volante cuadre al sumarlo a mano.",
    ],
  },
];

/** Qué es el apodo de una cuenta y quién puede cambiarlo (migración 0010). */
export const AYUDA_APODO =
  "Nombre corto con el que se identifica a la persona en el calendario y en las tablas (por ejemplo, «YC» para Yeison Camacho). Lo pueden cambiar el administrador y el coordinador; donde hay espacio se sigue mostrando el nombre completo.";

/**
 * Recordatorio de guardar — el aviso que más falta hacía.
 *
 * GPI perdía cambios porque el panel guarda BLOQUE A BLOQUE y el único aviso
 * que lo decía estaba al pie de la columna lateral, donde nadie mira mientras
 * escribe. Ahora es una constante y se pinta ARRIBA de cada pantalla de
 * contenido, antes de cualquier formulario.
 */
export const AYUDA_GUARDAR_BLOQUES =
  "Los cambios NO se aplican hasta que pulses «Guardar» en el bloque que editaste.";
