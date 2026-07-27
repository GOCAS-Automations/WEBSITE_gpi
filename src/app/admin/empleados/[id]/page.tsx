import { notFound } from "next/navigation";
import { getProfileRecord, listJornadas } from "@/lib/admin";
import { requireManager } from "@/lib/supabase/auth";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { ROLE_BADGE_CLASSES, ROLE_LABELS } from "@/lib/roles";
import {
  AdminPageHeader,
  Badge,
  Card,
  CardTitle,
  PrimaryLink,
} from "@/components/admin/ui";
import {
  CredentialForm,
  DeleteAccountForm,
} from "@/components/admin/CredentialForm";
import { EmployeeFields } from "../EmployeeFields";
import {
  deleteEmployee,
  resetEmployeePassword,
  updateEmployee,
} from "../actions";
import { formatearFechaCorta } from "@/lib/jornada";
import { ArrowRight, Info } from "@/lib/icons";

export default async function EditarCuentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile: actor } = await requireManager();
  const { id } = await params;

  const cuenta = await getProfileRecord(id);
  if (!cuenta) notFound();

  const esUnoMismo = cuenta.id === actor.id;
  const puedeGestionar = actor.role === "admin" || cuenta.role !== "admin";
  const servicioListo = isServiceRoleConfigured();

  // Contexto útil: cuántas jornadas tiene registradas esta persona.
  const jornadas = await listJornadas({ employeeId: cuenta.id, limit: 200 });
  const pendientes = jornadas.filter((j) => j.status === "pendiente").length;

  return (
    <>
      <AdminPageHeader
        title={cuenta.full_name}
        description={cuenta.email}
        backHref="/admin/empleados"
        backLabel="Volver al equipo"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Equipo", href: "/admin/empleados" },
          { label: "Gestionar cuenta" },
        ]}
        action={
          <PrimaryLink href={`/admin/jornadas?empleado=${cuenta.id}`}>
            Ver sus jornadas
            <ArrowRight className="h-4 w-4" />
          </PrimaryLink>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge className={ROLE_BADGE_CLASSES[cuenta.role]}>
          {ROLE_LABELS[cuenta.role]}
        </Badge>
        <Badge
          className={
            cuenta.active
              ? "bg-brand-tint text-brand-dark"
              : "bg-amber-100 text-amber-800"
          }
        >
          {cuenta.active ? "Cuenta activa" : "Cuenta inactiva"}
        </Badge>
        <span className="text-xs text-graphite">
          {jornadas.length} jornada(s) registrada(s)
          {pendientes > 0 && ` · ${pendientes} pendiente(s) de revisión`}
        </span>
        {cuenta.created_at && (
          <span className="text-xs text-graphite">
            · Creada el {formatearFechaCorta(cuenta.created_at.slice(0, 10))}
          </span>
        )}
      </div>

      {!puedeGestionar && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm leading-relaxed text-graphite">
            Esta es una cuenta de <strong>administrador</strong>. Solo otro
            administrador puede modificarla, restablecer su contraseña o
            eliminarla.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* ---------------- Datos de la cuenta ---------------- */}
        <Card>
          <CardTitle
            title="Datos de la cuenta"
            description="Nombre, rol, cargo, teléfono y si puede o no iniciar sesión."
          />
          {puedeGestionar ? (
            <CredentialForm
              action={updateEmployee}
              submitLabel="Guardar cambios"
              pendingLabel="Guardando…"
              backHref="/admin/empleados"
              backLabel="Volver al equipo"
            >
              <EmployeeFields
                actorRole={actor.role}
                profile={cuenta}
                esUnoMismo={esUnoMismo}
              />
            </CredentialForm>
          ) : (
            <p className="text-sm text-graphite">
              No tienes permisos para editar esta cuenta.
            </p>
          )}
        </Card>

        {/* ---------------- Contraseña ---------------- */}
        <Card>
          <CardTitle
            title="Contraseña"
            description="Genera una contraseña nueva si la persona la olvidó o si necesitas revocar la anterior."
          />
          {!servicioListo ? (
            <p className="text-sm leading-relaxed text-graphite">
              Para restablecer contraseñas hace falta la variable{" "}
              <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">
                SUPABASE_SERVICE_ROLE_KEY
              </code>{" "}
              en el servidor (ver{" "}
              <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">
                docs/ADMIN.md
              </code>
              ). Mientras tanto, puedes cambiarla desde el Dashboard de Supabase →
              Authentication → Users.
            </p>
          ) : puedeGestionar ? (
            <CredentialForm
              action={resetEmployeePassword}
              submitLabel="Restablecer contraseña"
              pendingLabel="Generando…"
              variant="neutral"
            >
              <input type="hidden" name="id" value={cuenta.id} />
              <p className="flex items-start gap-2 rounded-xl bg-mist px-4 py-3 text-sm leading-relaxed text-graphite">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  La contraseña anterior dejará de funcionar de inmediato. La
                  nueva se muestra <strong>una sola vez</strong>: cópiala y
                  compártela con la persona.
                </span>
              </p>
            </CredentialForm>
          ) : (
            <p className="text-sm text-graphite">
              Solo un administrador puede restablecer esta contraseña.
            </p>
          )}
        </Card>

        {/* ---------------- Zona de peligro ---------------- */}
        {puedeGestionar && !esUnoMismo && (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
            <h2 className="text-sm font-bold text-ink">Zona de peligro</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-graphite">
              Eliminar la cuenta borra también{" "}
              <strong>todas sus jornadas registradas</strong> y no se puede
              deshacer. Si solo quieres impedirle el acceso, es mejor{" "}
              <strong>desactivarla</strong> arriba: así conservas su historial.
            </p>
            <div className="mt-4 max-w-md">
              {servicioListo ? (
                <DeleteAccountForm
                  action={deleteEmployee}
                  id={cuenta.id}
                  email={cuenta.email}
                />
              ) : (
                <p className="text-sm text-graphite">
                  Eliminar cuentas requiere la variable{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
                    SUPABASE_SERVICE_ROLE_KEY
                  </code>
                  .
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
