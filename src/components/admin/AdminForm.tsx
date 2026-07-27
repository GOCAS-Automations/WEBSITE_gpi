"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ReactNode } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import { Check, Trash } from "@/lib/icons";

/* ------------------------------------------------------------------ */
/* Formulario genérico del panel                                       */
/* ------------------------------------------------------------------ */

export function AdminForm({
  action,
  children,
  submitLabel = "Guardar cambios",
  backHref,
  backLabel,
  className = "",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  /** Botón "← Volver a …" mostrado junto a Guardar. */
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className={`space-y-5 ${className}`}>
      {children}

      {state.status !== "idle" && state.message && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-brand/30 bg-brand-tint text-brand-dark"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? (
            "Guardando…"
          ) : (
            <>
              <Check className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </button>

        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            <span aria-hidden="true">←</span>
            {backLabel ?? "Cancelar"}
          </Link>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Botón de eliminar con confirmación                                  */
/* ------------------------------------------------------------------ */

export function DeleteForm({
  action,
  id,
  label = "Eliminar",
  confirmMessage = "¿Seguro que quieres eliminar este elemento? Esta acción no se puede deshacer.",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
  label?: string;
  confirmMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className="inline-flex flex-col items-start"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      >
        <Trash className="h-4 w-4" />
        {pending ? "Eliminando…" : label}
      </button>
      {state.status === "error" && state.message && (
        <span className="mt-1 text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
