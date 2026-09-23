/**
 * GET /api/permisos/[id]/soporte — descarga del soporte de un permiso.
 *
 * El soporte vive en un bucket **privado** (`permisos-soportes`, migración
 * 0014): no tiene URL pública ni adivinable. Esta ruta es la única puerta, y
 * comprueba tres cosas antes de abrirla:
 *
 *   1. hay **sesión activa** (si no, 401);
 *   2. el permiso existe **para esa sesión**: `getPermiso` usa el cliente
 *      ligado a la sesión, así que la RLS de la 0014 ya filtra —un empleado
 *      solo ve los suyos, un manager los de todos—;
 *   3. **quien pide es el dueño o un manager**. Redundante a propósito: si
 *      mañana alguien aflojara una política, esta comprobación sigue en pie.
 *
 * Con las tres cumplidas se emite una **URL firmada de 60 segundos** y se
 * redirige a ella. El archivo nunca pasa por la función (no se descarga y se
 * reenvía) y el enlace caduca solo.
 *
 * Todos los fallos responden **404**, sin decir si el permiso existe: pedir el
 * id de otra persona y pedir un id inventado tienen que verse igual.
 */

import { getActiveSession } from "@/lib/supabase/auth";
import { getPermiso } from "@/lib/admin";
import { isManagerRole } from "@/lib/roles";
import { urlFirmadaSoporte } from "@/lib/soportes";
import { nombreArchivoSoporte } from "@/lib/permisos";

/** Depende de la sesión: nunca se cachea. */
export const dynamic = "force-dynamic";

const NO_ENCONTRADO = () =>
  new Response("No se encontró ese soporte", {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getActiveSession();
  if (!session) {
    return new Response("No autorizado", {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const { id } = await params;
  const permiso = await getPermiso(id);
  if (!permiso || !permiso.soporte_path) return NO_ENCONTRADO();

  // Segunda barrera, por encima de RLS: el dueño o un manager, nadie más.
  const esDueno = permiso.employee_id === session.profile.id;
  if (!esDueno && !isManagerRole(session.profile.role)) return NO_ENCONTRADO();

  const nombre = nombreArchivoSoporte(
    permiso.soporte_nombre ?? `soporte-${permiso.fecha_inicio}`,
  );
  const url = await urlFirmadaSoporte(permiso.soporte_path, nombre);
  if (!url) return NO_ENCONTRADO();

  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "private, no-store" },
  });
}
