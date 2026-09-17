/**
 * VISTA "CALENDARIO" de /admin/calendario
 * =======================================
 * Server Component: resuelve qué mes se está mirando, trae sus eventos con los
 * responsables y las notas ya resueltos, y se lo entrega masticado al panel
 * (`CalendarioPanel`, Client Component), junto con las server actions.
 *
 * El mes vive en la URL (`?anio=&mes=`) y por defecto es el mes en curso en
 * hora de COLOMBIA, no la del servidor de Vercel: sin eso, el primer día del
 * mes el panel abriría en el mes equivocado durante cinco horas.
 */

import { listEventos, listProfiles } from "@/lib/admin";
import { hoyEnColombia } from "@/lib/jornada";
import {
  partesFecha,
  primerDiaMes,
  ultimoDiaMes,
} from "@/lib/calendario";
import {
  AyudaDesplegable,
  AyudaSeccion,
  AYUDA_CALENDARIO,
  AYUDA_CALENDARIO_ELIMINAR,
  AYUDA_CALENDARIO_ESTADOS,
  AYUDA_CALENDARIO_NOTAS,
  AYUDA_CALENDARIO_RESPONSABLES,
} from "@/components/admin/ui";
import { CalendarioPanel } from "@/components/calendario/CalendarioPanel";
import {
  agregarNotaEvento,
  aplazarEvento,
  cambiarEstadoEvento,
  eliminarEvento,
  saveEvento,
} from "./actions";

/** Convierte el parámetro de la URL en un número, o devuelve el de respaldo. */
function entero(valor: string | undefined, porDefecto: number): number {
  const n = Number(valor);
  return Number.isInteger(n) ? n : porDefecto;
}

export async function CalendarioView({
  anio: anioParam,
  mes: mesParam,
}: {
  anio?: string;
  mes?: string;
}) {
  const hoy = hoyEnColombia();
  const hoyPartes = partesFecha(hoy)!;

  const anio = Math.min(
    Math.max(entero(anioParam, hoyPartes.anio), 2000),
    2200,
  );
  const mes = Math.min(Math.max(entero(mesParam, hoyPartes.mes), 1), 12);

  const [eventos, perfiles] = await Promise.all([
    listEventos({
      desde: primerDiaMes(anio, mes),
      hasta: ultimoDiaMes(anio, mes),
      conNotas: true,
    }),
    listProfiles(),
  ]);

  // Cualquier cuenta ACTIVA puede ser responsable de un evento, sin importar el
  // rol: un coordinador también sale a campo.
  const opciones = perfiles
    .filter((p) => p.active)
    .map((p) => ({
      id: p.id,
      nombre: p.full_name,
      apodo: p.apodo,
      cargo: p.cargo,
    }));

  return (
    <>
      <AyudaSeccion title="Qué es esta pantalla" className="mb-4">
        {AYUDA_CALENDARIO}
      </AyudaSeccion>

      <div className="mb-6 grid gap-3 lg:grid-cols-2">
        <AyudaDesplegable label="¿Qué significa cada estado y cómo se cierra un evento?">
          <p>{AYUDA_CALENDARIO_ESTADOS}</p>
          <p className="mt-2">{AYUDA_CALENDARIO_ELIMINAR}</p>
        </AyudaDesplegable>
        <AyudaDesplegable label="¿Cómo funcionan los responsables y las notas?">
          <p>{AYUDA_CALENDARIO_RESPONSABLES}</p>
          <p className="mt-2">{AYUDA_CALENDARIO_NOTAS}</p>
        </AyudaDesplegable>
      </div>

      <CalendarioPanel
        eventos={eventos}
        perfiles={opciones}
        anio={anio}
        mes={mes}
        hoy={hoy}
        puedeAdministrar
        guardar={saveEvento}
        cambiarEstado={cambiarEstadoEvento}
        aplazar={aplazarEvento}
        eliminar={eliminarEvento}
        agregarNota={agregarNotaEvento}
      />
    </>
  );
}
