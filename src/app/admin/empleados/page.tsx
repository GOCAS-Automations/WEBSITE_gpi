import Link from "next/link";
import { listProfiles } from "@/lib/admin";
import { requireManager } from "@/lib/supabase/auth";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import {
  ROLE_BADGE_CLASSES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  USER_ROLES,
} from "@/lib/roles";
import {
  AdminPageHeader,
  Badge,
  Card,
  EmptyState,
  PrimaryLink,
  inputClass,
} from "@/components/admin/ui";
import { identificadorCuenta } from "@/lib/usuarios";
import { formatearFechaCorta } from "@/lib/jornada";
import { Info, Pencil, Plus, User } from "@/lib/icons";

export default async function AdminEmpleadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Barrera autoritativa: solo admin y coordinador entran aquí.
  const { profile } = await requireManager();
  const { q } = await searchParams;

  const busqueda = (q ?? "").trim();
  const todos = await listProfiles();

  const cuentas = busqueda
    ? todos.filter((p) =>
        [
          p.full_name,
          identificadorCuenta(p),
          p.cedula ?? "",
          p.email_contacto ?? "",
          p.cargo ?? "",
          ROLE_LABELS[p.role],
        ]
          .join(" ")
          .toLowerCase()
          .includes(busqueda.toLowerCase()),
      )
    : todos;

  return (
    <>
      <AdminPageHeader
        title="Equipo y cuentas"
        description="Crea las cuentas con las que el equipo de GPI ingresa al portal, asigna su rol y activa o desactiva accesos."
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Equipo" }]}
        action={
          <PrimaryLink href="/admin/empleados/nuevo">
            <Plus className="h-4 w-4" />
            Nueva cuenta
          </PrimaryLink>
        }
      />

      {!isServiceRoleConfigured() && <ServiceRoleAviso />}

      {/* Búsqueda: formulario GET, sin JavaScript. */}
      <form method="get" className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por nombre, usuario, cédula o cargo…"
          aria-label="Buscar cuentas"
          className={`${inputClass} max-w-sm`}
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
        >
          Buscar
        </button>
        {busqueda !== "" && (
          <Link
            href="/admin/empleados"
            className="text-sm font-semibold text-graphite transition-colors hover:text-brand-dark"
          >
            Limpiar
          </Link>
        )}
      </form>

      {cuentas.length === 0 ? (
        <EmptyState
          title={
            busqueda
              ? "Ninguna cuenta coincide con la búsqueda"
              : "Todavía no hay cuentas creadas"
          }
          description={
            busqueda
              ? "Prueba con otro nombre o correo, o limpia la búsqueda para ver todo el equipo."
              : "Crea la primera cuenta para que el equipo de GPI pueda ingresar al portal y registrar sus jornadas."
          }
          action={
            <PrimaryLink href="/admin/empleados/nuevo">
              <Plus className="h-4 w-4" />
              Crear cuenta
            </PrimaryLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {cuentas.map((cuenta) => (
            <li
              key={cuenta.id}
              className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4 shadow-soft sm:p-5 ${
                cuenta.active ? "border-line" : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
                <User className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-ink">
                    {cuenta.full_name}
                  </h2>
                  <Badge className={ROLE_BADGE_CLASSES[cuenta.role]}>
                    {ROLE_LABELS[cuenta.role]}
                  </Badge>
                  {!cuenta.active && (
                    <Badge className="bg-amber-100 text-amber-800">
                      Inactiva
                    </Badge>
                  )}
                  {cuenta.id === profile.id && (
                    <Badge className="bg-mist text-graphite">Tú</Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-graphite">
                  Usuario:{" "}
                  <span className="font-semibold text-ink-soft">
                    {identificadorCuenta(cuenta)}
                  </span>
                  {cuenta.cargo && ` · ${cuenta.cargo}`}
                </p>
                {cuenta.created_at && (
                  <p className="mt-0.5 text-xs text-graphite/80">
                    Creada el {formatearFechaCorta(cuenta.created_at.slice(0, 10))}
                  </p>
                )}
              </div>

              <Link
                href={`/admin/empleados/${cuenta.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink-soft"
              >
                <Pencil className="h-3.5 w-3.5" />
                Gestionar
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card className="mt-6">
        <h2 className="text-base font-bold text-ink">¿Qué puede hacer cada rol?</h2>
        <dl className="mt-3 space-y-2.5">
          {USER_ROLES.map((role) => (
            <div key={role} className="flex flex-wrap items-start gap-2.5">
              <dt className="shrink-0">
                <Badge className={ROLE_BADGE_CLASSES[role]}>
                  {ROLE_LABELS[role]}
                </Badge>
              </dt>
              <dd className="min-w-0 flex-1 text-sm leading-relaxed text-graphite">
                {ROLE_DESCRIPTIONS[role]}
              </dd>
            </div>
          ))}
        </dl>
        {profile.role === "coordinador" && (
          <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm leading-relaxed text-graphite">
            Como coordinador puedes gestionar cuentas de coordinador, marketing y
            empleado. Las cuentas de administrador solo las gestiona un
            administrador.
          </p>
        )}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */

/** Aviso amable cuando falta la clave de servicio en el servidor. */
function ServiceRoleAviso() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
        <Info className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold text-ink">
          Falta configurar la clave de servicio
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-graphite">
          Puedes ver y editar las cuentas existentes, pero para{" "}
          <strong>crear</strong>, <strong>restablecer contraseñas</strong> o{" "}
          <strong>eliminar</strong> cuentas hace falta la variable de entorno{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
          .
        </p>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          Se obtiene en el Dashboard de Supabase → <strong>Settings</strong> →{" "}
          <strong>API Keys</strong> → clave <code className="font-mono text-xs">service_role</code>, y
          se añade al archivo <code className="font-mono text-xs">.env.local</code> (y
          en Vercel, <em>sin</em> el prefijo <code className="font-mono text-xs">NEXT_PUBLIC_</code>).
          El paso a paso está en <code className="font-mono text-xs">docs/ADMIN.md</code>.
        </p>
      </div>
    </div>
  );
}
