/**
 * VISTA "MÉTRICAS" de /admin/calendario
 * =====================================
 * Server Component que trae una ventana amplia de eventos —un año hacia atrás y
 * cuatro meses hacia delante— y se la entrega al tablero (`CalendarioDashboard`,
 * Client Component), que filtra y agrega en el navegador.
 *
 * Por qué la ventana es más ancha que el filtro: el rango por defecto es el mes
 * en curso (que es lo que quiere ver quien entra), pero la gráfica de evolución
 * mensual necesita los meses anteriores para tener sentido. Traer el año entero
 * de una vez sale más barato que una consulta por cada movimiento del filtro.
 *
 * Las notas no se traen enteras: al tablero solo le hace falta CUÁNTAS tiene
 * cada evento, y `listEventos` ya devuelve ese conteo sin `conNotas`.
 */

import { listEventos } from "@/lib/admin";
import { hoyEnColombia } from "@/lib/jornada";
import {
  partesFecha,
  primerDiaMes,
  sumarDiasFecha,
  ultimoDiaMes,
} from "@/lib/calendario";
import { AyudaSeccion } from "@/components/admin/ui";
import { CalendarioDashboard } from "@/components/calendario/CalendarioDashboard";

const DIAS_ATRAS = 365;
const DIAS_ADELANTE = 120;

export async function MetricasView() {
  const hoy = hoyEnColombia();
  const partes = partesFecha(hoy)!;

  const eventos = await listEventos({
    desde: sumarDiasFecha(hoy, -DIAS_ATRAS),
    hasta: sumarDiasFecha(hoy, DIAS_ADELANTE),
    limit: 2000,
  });

  return (
    <>
      <AyudaSeccion title="Cómo leer este tablero" className="mb-6">
        Los números de arriba y las gráficas se calculan sobre el{" "}
        <strong>rango de fechas</strong> que elijas; empieza en el mes en curso.
        La única excepción es «Evolución mensual», que muestra siempre el año
        completo para que se vea la tendencia (la propia tarjeta lo avisa). Un
        evento cuenta en el período de la <strong>fecha que tiene ahora</strong>:
        si se aplazó de septiembre a octubre, cuenta en octubre —y bajo los
        números se avisa cuántas actividades salieron así del período—. Cada
        bloque tiene un botón <strong>Ayuda</strong> que explica qué significa
        cada dato.
      </AyudaSeccion>

      <CalendarioDashboard
        eventos={eventos}
        desdeInicial={primerDiaMes(partes.anio, partes.mes)}
        hastaInicial={ultimoDiaMes(partes.anio, partes.mes)}
      />
    </>
  );
}
