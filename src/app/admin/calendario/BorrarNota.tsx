"use client";

/**
 * Eliminar una nota de seguimiento (solo managers).
 *
 * Es un botón discreto dentro de la tabla: borrar una nota no es una operación
 * de todos los días, existe para limpiar lo que se escribió por error. Pide
 * confirmación del navegador, como el resto de borrados del panel.
 */

import { useActionState } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import { Trash } from "@/lib/icons";

export function BorrarNota({
  id,
  evento,
  action,
}: {
  id: string;
  /** Título del evento, para que el aviso diga de cuál se está borrando. */
  evento: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pendiente] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Vas a eliminar esta nota de «${evento}».\n\nEl evento se queda como está; lo que desaparece es el comentario. Esta acción NO se puede deshacer.\n\n¿Continuar?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pendiente}
        title="Eliminar esta nota"
        className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      >
        <Trash className="h-3.5 w-3.5" />
        {pendiente ? "Eliminando…" : "Eliminar"}
      </button>
      {state.status === "error" && state.message && (
        <span role="alert" className="mt-1 block text-xs text-red-600">
          {state.message}
        </span>
      )}
    </form>
  );
}
