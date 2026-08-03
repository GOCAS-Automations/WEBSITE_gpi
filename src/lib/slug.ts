/**
 * Generación de slugs (la parte final de una URL).
 *
 * Módulo PURO: lo usan por igual las server actions del panel (al guardar un
 * servicio o un proyecto) y la capa de contenido pública, que necesita un slug
 * de respaldo cuando la fila de Supabase todavía no lo tiene —el caso mientras
 * la migración 0005 no esté aplicada—.
 *
 * La misma regla que aplica el SQL de la 0005: minúsculas, sin tildes, con
 * guiones en lugar de cualquier otro carácter.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita las tildes que deja NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
