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

/** Nombre visible del rol en la interfaz. */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  marketing: "Marketing",
  empleado: "Empleado",
};

/** Explicación en lenguaje sencillo de lo que puede hacer cada rol. */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin:
    "Control total: contenido del sitio, cuentas del equipo y aprobación de jornadas.",
  coordinador:
    "Contenido del sitio, cuentas de empleados (no administradores) y aprobación de jornadas.",
  marketing: "Solo el contenido público del sitio (textos, imágenes y ajustes).",
  empleado: "Solo su portal en Mi Cuenta, para registrar sus jornadas.",
};

/** Clases de color del badge de rol (mismo lenguaje visual del panel). */
export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  admin: "bg-ink text-white",
  coordinador: "bg-brand text-white",
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

/** Registra jornadas en su portal de Mi Cuenta. */
export function isEmployeeRole(role: UserRole): boolean {
  return role === "empleado";
}
