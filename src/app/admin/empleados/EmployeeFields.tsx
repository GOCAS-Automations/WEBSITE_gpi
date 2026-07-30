import {
  AyudaDesplegable,
  Badge,
  Field,
  Select,
  Switch,
} from "@/components/admin/ui";
import {
  ROLE_BADGE_CLASSES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from "@/lib/roles";
import { AYUDA_USUARIO } from "@/lib/usuarios";
import type { ProfileRecord } from "@/lib/admin-types";

/**
 * Opciones de rol disponibles para quien está editando.
 * Un coordinador no puede crear ni asignar el rol de administrador (la regla se
 * vuelve a validar en el servidor: esto es solo la comodidad de la interfaz).
 */
export function opcionesDeRol(actorRole: UserRole) {
  return USER_ROLES.filter(
    (role) => actorRole === "admin" || role !== "admin",
  ).map((role) => ({ value: role, label: ROLE_LABELS[role] }));
}

/**
 * Campos compartidos entre crear y editar una cuenta.
 *
 * El equipo de GPI entra al portal con un **usuario** (no con un correo): el
 * correo real de la persona, si lo tiene, es solo un dato de contacto. El
 * usuario no se puede cambiar después de crear la cuenta.
 */
export function EmployeeFields({
  actorRole,
  profile,
  esUnoMismo = false,
}: {
  actorRole: UserRole;
  profile?: ProfileRecord;
  esUnoMismo?: boolean;
}) {
  return (
    <>
      {profile && <input type="hidden" name="id" value={profile.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre completo"
          name="full_name"
          required
          defaultValue={profile?.full_name}
          placeholder="María Fernanda Gómez"
          hint="Es el nombre que verá el equipo en las jornadas registradas."
        />

        {profile ? (
          <Field
            label="Usuario"
            name="username_readonly"
            defaultValue={profile.username ?? profile.email}
            hint="El usuario no se puede cambiar. Si necesita otro, crea una cuenta nueva."
          />
        ) : (
          <Field
            label="Usuario"
            name="username"
            required
            placeholder="mgomez"
            hint={`Con este usuario iniciará sesión en Mi Cuenta. ${AYUDA_USUARIO}`}
          />
        )}

        <Select
          label="Rol"
          name="role"
          defaultValue={profile?.role ?? "empleado"}
          options={opcionesDeRol(actorRole)}
          hint="Define qué puede hacer la persona en el portal. Si dudas, elige Empleado: es el rol con menos permisos y siempre se puede cambiar después."
        />

        {/* Los cuatro roles explicados, para elegir con criterio. Va desplegable
            (HTML nativo) para no llenar el formulario de texto. */}
        <AyudaDesplegable
          label="¿Qué puede hacer cada rol?"
          className="sm:col-span-2"
        >
          <dl className="space-y-2.5">
            {USER_ROLES.map((role) => (
              <div key={role} className="flex flex-wrap items-start gap-2.5">
                <dt className="shrink-0">
                  <Badge className={ROLE_BADGE_CLASSES[role]}>
                    {ROLE_LABELS[role]}
                  </Badge>
                </dt>
                <dd className="min-w-0 flex-1">{ROLE_DESCRIPTIONS[role]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed">
            Todas las cuentas activas, sea cual sea su rol, registran sus propias
            jornadas en <strong>Mi Cuenta</strong>. Lo que cambia de un rol a
            otro es qué puede administrar en el panel.
          </p>
        </AyudaDesplegable>

        <Field
          label="Cédula (opcional)"
          name="cedula"
          defaultValue={profile?.cedula}
          placeholder="1.144.123.456"
          hint="Documento de identidad, para la nómina."
        />

        <Field
          label="Cargo (opcional)"
          name="cargo"
          defaultValue={profile?.cargo}
          placeholder="Técnico electricista"
        />

        <Field
          label="Teléfono (opcional)"
          name="phone"
          defaultValue={profile?.phone}
          placeholder="318 434 1249"
        />

        <Field
          label="Correo de contacto (opcional)"
          name="email_contacto"
          type="email"
          defaultValue={profile?.email_contacto}
          placeholder="maria@gmail.com"
          hint="Su correo real, solo para contactarla. No se usa para iniciar sesión."
          className="sm:col-span-2"
        />

        {profile && (
          <Switch
            label="Estado de la cuenta"
            name="active"
            defaultChecked={profile.active}
            onLabel="Activa"
            offLabel="Inactiva"
            hint={
              esUnoMismo
                ? "No puedes desactivar tu propia cuenta."
                : "Inactiva = la persona no puede entrar al portal, pero se conserva todo su historial de jornadas. Es lo recomendado cuando alguien deja de trabajar en GPI: eliminar la cuenta sí borra sus jornadas."
            }
          />
        )}
      </div>
    </>
  );
}
