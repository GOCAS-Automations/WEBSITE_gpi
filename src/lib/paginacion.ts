/**
 * PAGINACIÓN DE LAS TABLAS DEL PANEL Y DEL PORTAL
 * ===============================================
 * Regla del cliente (19 sep 2026): **toda tabla o listado de registros del
 * panel muestra como máximo 10 filas por página**, con paginación. La cifra
 * vive AQUÍ y solo aquí: `FILAS_POR_PAGINA`. El control visual es uno solo,
 * `Paginacion` de `src/components/admin/ui-base.tsx`.
 *
 * Módulo PURO (sin `"use client"`, sin importaciones): lo usan por igual las
 * páginas de servidor, que leen `?pagina=` de la URL, y los componentes de
 * cliente, que paginan con estado local.
 *
 * Dos maneras de paginar, según dónde se filtre la tabla:
 * - **Filtrada en el servidor** (los filtros viajan en la URL): la página
 *   también va en la URL (`?pagina=`), así sobrevive a una recarga. Los
 *   filtros NO arrastran `pagina` al reescribir la URL, de modo que cambiar
 *   uno devuelve a la página 1 sin código extra.
 * - **Filtrada en el cliente** (estado de React): la página es estado local y
 *   vuelve a la 1 cuando cambia la «clave» de los filtros (`usePaginaLocal`).
 *
 * Lo que la paginación NO cambia: las exportaciones CSV y las acciones masivas
 * («Liquidar todos»…) siguen trabajando sobre el conjunto filtrado COMPLETO,
 * nunca sobre la página visible.
 */

/** Máximo de filas por página en todas las tablas del panel y del portal. */
export const FILAS_POR_PAGINA = 10;

/** Nombre del parámetro de la URL que lleva la página (1, 2, 3…). */
export const PARAM_PAGINA = "pagina";

/**
 * Lee `?pagina=` tal como llega de `searchParams`. Cualquier cosa que no sea
 * un entero ≥ 1 cuenta como la página 1 (el recorte por arriba lo hace
 * `paginar`, que es quien conoce el total).
 */
export function leerPagina(valor: string | string[] | undefined): number {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  const n = Number(crudo);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export interface PaginaDe<T> {
  /** Las filas de la página actual. */
  visibles: T[];
  /** Página actual, 1-based y ya recortada al rango válido. */
  pagina: number;
  totalPaginas: number;
  /** Filas del conjunto completo (el que exporta el CSV). */
  total: number;
  /** Posición (1-based) de la primera fila visible; 0 si no hay filas. */
  desde: number;
  /** Posición (1-based) de la última fila visible; 0 si no hay filas. */
  hasta: number;
}

/**
 * Trocea una lista. Una página pedida fuera de rango (un enlace viejo, una
 * fila borrada que dejó vacía la última página) se recorta a la última que
 * existe en vez de mostrar una tabla vacía.
 */
export function paginar<T>(
  lista: readonly T[],
  paginaPedida: number,
  porPagina: number = FILAS_POR_PAGINA,
): PaginaDe<T> {
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(Math.max(1, Math.trunc(paginaPedida) || 1), totalPaginas);
  const inicio = (pagina - 1) * porPagina;
  const visibles = lista.slice(inicio, inicio + porPagina);
  return {
    visibles,
    pagina,
    totalPaginas,
    total,
    desde: total === 0 ? 0 : inicio + 1,
    hasta: total === 0 ? 0 : inicio + visibles.length,
  };
}

/**
 * La misma dirección con otra página. `base` es la URL actual SIN pensar en la
 * página (ruta + los demás parámetros); la página 1 no se escribe, para que la
 * dirección «limpia» y la de la primera página sean la misma.
 */
export function hrefConPagina(base: string, pagina: number): string {
  const [ruta, consulta = ""] = base.split("?");
  const params = new URLSearchParams(consulta);
  if (pagina > 1) params.set(PARAM_PAGINA, String(pagina));
  else params.delete(PARAM_PAGINA);
  const q = params.toString();
  return q ? `${ruta}?${q}` : ruta;
}
