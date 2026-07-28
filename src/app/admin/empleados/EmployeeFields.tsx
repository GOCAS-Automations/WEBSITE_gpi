import { Field, Select, Switch } from "@/components/admin/ui";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/roles";
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
          hint={ROLE_DESCRIPTIONS[profile?.role ?? "empleado"]}
        />

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
                : "Una cuenta inactiva no puede iniciar sesión, pero conserva su historial de jornadas."
            }
          />
        )}
      </div>
    </>
  );
}
