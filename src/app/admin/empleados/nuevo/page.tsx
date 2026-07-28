import { requireManager } from "@/lib/supabase/auth";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { AdminPageHeader, Card, CardTitle } from "@/components/admin/ui";
import { CredentialForm } from "@/components/admin/CredentialForm";
import { EmployeeFields } from "../EmployeeFields";
import { createEmployee } from "../actions";
import { Info } from "@/lib/icons";

export default async function NuevaCuentaPage() {
  const { profile } = await requireManager();
  const configurado = isServiceRoleConfigured();

  return (
    <>
      <AdminPageHeader
        title="Nueva cuenta"
        description="La persona ingresa al portal con un usuario. La contraseña se genera automáticamente y se muestra una sola vez al terminar."
        backHref="/admin/empleados"
        backLabel="Volver al equipo"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Equipo", href: "/admin/empleados" },
          { label: "Nueva cuenta" },
        ]}
      />

      {!configurado ? (
        <Card>
          <CardTitle
            title="Falta configurar la clave de servicio"
            description="Para crear cuentas hace falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY en el servidor."
          />
          <p className="text-sm leading-relaxed text-graphite">
            Se obtiene en el Dashboard de Supabase → <strong>Settings</strong> →{" "}
            <strong>API Keys</strong> → clave{" "}
            <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">
              service_role
            </code>
            . Añádela a{" "}
            <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">
              .env.local
            </code>{" "}
            y, en Vercel, como variable de entorno{" "}
            <strong>sin el prefijo NEXT_PUBLIC_</strong>. El paso a paso está en{" "}
            <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">
              docs/ADMIN.md
            </code>
            .
          </p>
        </Card>
      ) : (
        <Card>
          <CardTitle
            title="Datos de la persona"
            description="Solo el nombre, el usuario y el rol son obligatorios. La persona ingresa con su USUARIO, no con un correo."
          />

          <CredentialForm
            action={createEmployee}
            submitLabel="Crear cuenta y generar contraseña"
            pendingLabel="Creando cuenta…"
            backHref="/admin/empleados"
            backLabel="Cancelar"
          >
            <EmployeeFields actorRole={profile.role} />

            <p className="flex items-start gap-2 rounded-xl bg-mist px-4 py-3 text-sm leading-relaxed text-graphite">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Al guardar se generará una contraseña fácil de dictar (por
                ejemplo <strong>Sol-Andes42</strong>) que verás{" "}
                <strong>una sola vez</strong>. Cópiala junto con el usuario y
                compártelas con la persona; podrá cambiar la contraseña cuando
                quiera desde Mi Cuenta.
              </span>
            </p>
          </CredentialForm>
        </Card>
      )}
    </>
  );
}
