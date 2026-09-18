/**
 * GET /mi-cuenta/volante/[id]/pdf — el volante de pago, para EL PROPIO EMPLEADO.
 *
 * El gemelo de la ruta del panel, con dos barreras en vez de una:
 *   1. la política `nomina_liquidaciones_select_propia` (migración 0011) solo
 *      deja ver las liquidaciones de uno mismo y solo si están `cerrada` o
 *      `pagada` — un borrador no existe para el empleado;
 *   2. aquí se vuelve a comprobar, explícitamente, que el dueño de la
 *      liquidación sea quien está pidiendo el archivo. Redundante a propósito:
 *      un manager tiene RLS abierto y esta ruta no es la suya.
 *
 * Un 404 no revela si la liquidación existe.
 */

import { getActiveSession } from "@/lib/supabase/auth";
import { resolverVolante } from "@/lib/volante-datos";
import { renderVolante } from "@/lib/volante";

/** Depende de la sesión: nunca se cachea. */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getActiveSession();
  if (!session) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;
  const volante = await resolverVolante(id);

  // Segunda barrera: esta ruta sirve SOLO el volante propio.
  if (!volante || volante.employeeId !== session.profile.id) {
    return new Response("No se encontró ese volante", { status: 404 });
  }

  const pdf = await renderVolante(volante.datos);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${volante.archivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
