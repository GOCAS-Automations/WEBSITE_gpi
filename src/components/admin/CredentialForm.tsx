"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import {
  idleCredentialState,
  idleState,
  type ActionState,
  type CredentialState,
} from "@/lib/admin-types";
import { textoCredenciales } from "@/lib/usuarios";
import { Check, Lock, Trash } from "@/lib/icons";
import { inputClass } from "./ui";

/* ------------------------------------------------------------------ */
/* Panel de contraseña generada                                        */
/* ------------------------------------------------------------------ */

/**
 * Muestra UNA sola vez las credenciales recién generadas (usuario + contraseña).
 * La contraseña no se puede volver a consultar (Supabase solo guarda su hash):
 * si se pierde, hay que restablecerla otra vez desde la ficha del empleado.
 */
export function CredentialPanel({
  credential,
}: {
  credential: NonNullable<CredentialState["credential"]>;
}) {
  const [copiado, setCopiado] = useState<"idle" | "ok" | "error">("idle");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(
        textoCredenciales(credential.usuario, credential.password),
      );
      setCopiado("ok");
      setTimeout(() => setCopiado("idle"), 2500);
    } catch {
      setCopiado("error");
    }
  }

  return (
    <div className="rounded-2xl border border-brand/40 bg-brand-tint p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-dark">
          <Lock className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-ink">
            {credential.kind === "created"
              ? "Cuenta creada correctamente"
              : "Contraseña restablecida"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-graphite">
            Estos datos se muestran <strong>una sola vez</strong>. Cópialos y
            compártelos con la persona: entra a <strong>Mi Cuenta</strong> con su{" "}
            <strong>usuario</strong> (no con un correo) y podrá cambiar la
            contraseña cuando quiera. Si se pierde, vuelve a restablecerla desde
            esta misma pantalla.
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-24 text-xs font-semibold uppercase tracking-wide text-graphite">
            Usuario
          </dt>
          <dd className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-ink">
            {credential.usuario}
          </dd>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-24 text-xs font-semibold uppercase tracking-wide text-graphite">
            Contraseña
          </dt>
          <dd className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-ink">
            {credential.password}
          </dd>
        </div>
      </dl>

      <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-graphite">
        Para dictar o pegar en un mensaje:{" "}
        <span className="font-semibold text-ink">
          {textoCredenciales(credential.usuario, credential.password)}
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
        >
          <Check className="h-4 w-4" />
          {copiado === "ok" ? "¡Copiado!" : "Copiar usuario y contraseña"}
        </button>
        {copiado === "error" && (
          <span className="text-xs text-red-600">
            Tu navegador no permitió copiar. Selecciona el texto y cópialo a mano.
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulario que puede devolver una contraseña                        */
/* ------------------------------------------------------------------ */

/**
 * Igual que `AdminForm`, pero si la acción devuelve credenciales las muestra en
 * un panel destacado con botón de copiar.
 */
export function CredentialForm({
  action,
  children,
  submitLabel = "Guardar",
  pendingLabel = "Guardando…",
  backHref,
  backLabel,
  variant = "primary",
}: {
  action: (
    state: CredentialState,
    formData: FormData,
  ) => Promise<CredentialState>;
  children?: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  backHref?: string;
  backLabel?: string;
  variant?: "primary" | "neutral";
}) {
  const [state, formAction, pending] = useActionState(
    action,
    idleCredentialState,
  );

  const botonClase =
    variant === "primary"
      ? "bg-brand-dark text-white hover:bg-brand-deep"
      : "border border-line bg-white text-ink-soft hover:border-brand hover:text-brand-dark";

  return (
    <div className="space-y-5">
      {state.credential && <CredentialPanel credential={state.credential} />}

      <form action={formAction} className="space-y-5">
        {children}

        {state.status !== "idle" && state.message && !state.credential && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-brand/30 bg-brand-tint text-brand-deep"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow-soft transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60 ${botonClase}`}
          >
            {pending ? pendingLabel : submitLabel}
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Eliminación de cuenta con confirmación fuerte                       */
/* ------------------------------------------------------------------ */

/**
 * Doble barrera para no borrar una cuenta por accidente:
 *  1. Hay que escribir el usuario exacto de la persona.
 *  2. El navegador pide confirmación al enviar.
 * El servidor vuelve a verificar lo escrito antes de eliminar nada.
 */
export function DeleteAccountForm({
  action,
  id,
  usuario,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
  /** Usuario del portal (o el correo, en las cuentas antiguas). */
  usuario: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const [confirmacion, setConfirmacion] = useState("");

  const coincide = confirmacion.trim().toLowerCase() === usuario.toLowerCase();

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Vas a eliminar definitivamente la cuenta ${usuario}.\n\nSe borrarán también sus jornadas registradas y no podrá volver a ingresar. Esta acción NO se puede deshacer.\n\n¿Continuar?`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={id} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          Escribe <span className="font-mono">{usuario}</span> para confirmar
        </span>
        <input
          name="confirm_usuario"
          type="text"
          autoComplete="off"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          placeholder={usuario}
          className={inputClass}
        />
      </label>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !coincide}
        className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
      >
        <Trash className="h-4 w-4" />
        {pending ? "Eliminando…" : "Eliminar cuenta definitivamente"}
      </button>
    </form>
  );
}
