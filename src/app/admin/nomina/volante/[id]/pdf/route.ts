/**
 * GET /admin/nomina/volante/[id]/pdf — el volante de pago, para el ADMIN.
 *
 * Descarga un PDF de verdad (generado con `@react-pdf/renderer` en el
 * servidor), no una ventana de impresión. Funciona con la liquidación cerrada
 * —se imprime desde su snapshot congelado— y también en borrador, donde el
 * documento sale marcado como tal.
 *
 * SEGURIDAD: exige sesión de ADMINISTRADOR (`getAdminOrNull`) y, además, la
 * consulta pasa por RLS. Un 404 no revela si la liquidación existe. El volante
 * que descarga cada quien de SU propia liquidación vive en la otra ruta,
 * `/mi-cuenta/volante/[id]/pdf`, que valida que sea el dueño.
 *
 * OJO: los route handlers NO pasan por el layout de `/admin`, así que la
 * comprobación de rol tiene que estar aquí, explícita.
 */

import { getAdminOrNull } from "@/lib/supabase/auth";
import { resolverVolante } from "@/lib/volante-datos";
import { renderVolante } from "@/lib/volante";

/** Depende de la sesión y de datos vivos: nunca se cachea. */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminOrNull();
  if (!session) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;
  const volante = await resolverVolante(id);
  if (!volante) {
    return new Response("No se encontró esa liquidación", { status: 404 });
  }

  const pdf = await renderVolante(volante.datos);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${volante.archivo}"`,
      // El volante es un dato de nómina: no se guarda en ninguna caché.
      "Cache-Control": "private, no-store",
    },
  });
}
