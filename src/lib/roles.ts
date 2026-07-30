/**
 * ROLES DEL PORTAL GPI
 * ====================
 * Módulo PURO (sin Supabase ni `next/headers`): lo importan tanto los Server
 * Components y las server actions como los Client Components del panel.
 *
 * Debe mantenerse alineado con el `check` de `public.profiles.role`
 * (ver `supabase/migrations/0002_empleados_jornadas.sql`).
 */

export const USER_ROLES = [
  "admin",
  "coordinador",
  "marketing",
  "empleado",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Nombre visible del rol en la interfaz.
 *
 * OJO: el valor interno del rol `marketing` NO cambia en la base de datos (el
 * `check` de `profiles.role` sigue aceptando 'marketing'); lo que cambió es la
 * ETIQUETA que ve el equipo: "Community Manager".
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  marketing: "Community Manager",
  empleado: "Empleado",
};

/** Explicación en lenguaje sencillo de lo que puede hacer cada rol. */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin:
    "Control total: contenido del sitio, horarios, cuentas del equipo y aprobación de jornadas.",
  coordinador:
    "Contenido del sitio, horarios del mes, cuentas de empleados (no administradores) y aprobación de jornadas.",
  marketing:
    "Edita todo el contenido del sitio (textos, imágenes y ajustes) y registra sus propias jornadas. No gestiona empleados ni las jornadas de otros.",
  empleado: "Solo su portal en Mi Cuenta, para registrar sus jornadas.",
};

/** Clases de color del badge de rol (mismo lenguaje visual del panel). */
export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  admin: "bg-ink text-white",
  coordinador: "bg-brand-dark text-white",
  marketing: "bg-brand-tint text-brand-dark",
  empleado: "bg-mist text-graphite",
};

/**
 * Normaliza cualquier valor a un rol válido.
 * Acepta `employee` (nombre usado por la migración 0001) por compatibilidad.
 */
export function normalizeRole(value: unknown): UserRole {
  if (value === "employee") return "empleado";
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value)
    ? (value as UserRole)
    : "empleado";
}

/** Puede editar el contenido público del sitio. */
export function isContentEditorRole(role: UserRole): boolean {
  return role === "admin" || role === "coordinador" || role === "marketing";
}

/** Puede gestionar cuentas y aprobar/rechazar jornadas. */
export function isManagerRole(role: UserRole): boolean {
  return role === "admin" || role === "coordinador";
}

/**
 * Personal de campo: rol EXACTAMENTE 'empleado'.
 *
 * OJO: registrar jornadas propias en Mi Cuenta ya NO depende de esto. Desde
 * julio de 2026 lo hace **cualquier cuenta activa**: el Community Manager
 * también es empleado de GPI, y un admin o un coordinador puede registrar sus
 * horas si lo necesita. Aprobar las de los demás sigue siendo de managers.
 */
export function isEmployeeRole(role: UserRole): boolean {
  return role === "empleado";
}
