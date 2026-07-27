import { Field, Select, Switch } from "@/components/admin/ui";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/roles";
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

/** Campos compartidos entre crear y editar una cuenta. */
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
            label="Correo electrónico"
            name="email_readonly"
            defaultValue={profile.email}
            hint="El correo no se puede cambiar desde aquí. Si necesita otro, crea una cuenta nueva."
          />
        ) : (
          <Field
            label="Correo electrónico"
            name="email"
            type="email"
            required
            placeholder="nombre@gpiprofesionales.com"
            hint="Con este correo iniciará sesión en Mi Cuenta."
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
