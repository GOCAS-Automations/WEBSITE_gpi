"use client";

import { useActionState } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import { Lock } from "@/lib/icons";

const campoClase =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-graphite/60 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

/** Cambio de contraseña de la propia cuenta, desde Mi Cuenta. */
export function PasswordForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Nueva contraseña
          </span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            className={campoClase}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Repite la nueva contraseña
          </span>
          <input
            type="password"
            name="password_confirm"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Debe coincidir con la anterior"
            className={campoClase}
          />
        </label>
      </div>

      {state.status !== "idle" && state.message && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
            state.status === "success"
              ? "border-brand/30 bg-brand-tint text-brand-deep"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-soft disabled:pointer-events-none disabled:opacity-60"
      >
        <Lock className="h-4 w-4" />
        {pending ? "Actualizando…" : "Cambiar mi contraseña"}
      </button>
    </form>
  );
}
