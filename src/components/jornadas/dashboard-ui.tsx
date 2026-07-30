"use client";

/**
 * PIEZAS DEL TABLERO DE JORNADAS
 * ==============================
 * Pequeño sistema de diseño para la vista "Métricas" de /admin/jornadas:
 * tarjetas de KPI, tarjetas de gráfica, paginación, filtros y tooltips de ayuda.
 *
 * Todo habla el lenguaje visual del panel GPI (tokens `brand`, `ink`, `mist`,
 * `line`, `graphite` de `globals.css`) y está pensado para usuarios NO técnicos:
 * los textos de ayuda explican qué significa cada número, nunca la fórmula.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
} from "@/lib/icons";

/* ------------------------------------------------------------------ */
/* Paleta                                                              */
/* ------------------------------------------------------------------ */

/** Verde de marca GPI y sus variantes (deben coincidir con `globals.css`). */
export const BRAND = "#3dae2b";
export const BRAND_LIGHT = "#8cc63f";
export const BRAND_DARK = "#2c8420";
export const NEUTRO = "#d8dcd8";

/** Colores semánticos del tablero. */
export const COLOR_ORDINARIAS = "#8cc63f";
export const COLOR_EXTRAS = "#f59e0b";
export const COLOR_RIESGO = "#dc2626";

/**
 * Familia de colores para el desglose fino de "Composición de horas": las
 * horas ordinarias van en verde de marca; las categorías con recargo o extra
 * usan tonos ámbar → naranja → morado, de menor a mayor "excepcionalidad".
 */
export const COLOR_EXTRA_DIURNA = COLOR_EXTRAS;
export const COLOR_EXTRA_NOCTURNA = "#ea580c";
export const COLOR_RECARGO_NOCTURNO = "#8b5cf6";
export const COLOR_DOMINICAL = "#6d28d9";

/** Colores del estado de una jornada (coinciden con `JORNADA_STATUS_CLASSES`). */
export const COLOR_PENDIENTE = "#f59e0b";
export const COLOR_APROBADA = BRAND;
export const COLOR_RECHAZADA = "#dc2626";

/** Paleta para el Gantt: una serie por empleado. */
export const COLORES_EMPLEADO = [
  "#3dae2b", "#2563eb", "#f59e0b", "#8b5cf6", "#0ea5e9",
  "#ec4899", "#14b8a6", "#ea580c", "#6366f1", "#84cc16",
  "#db2777", "#0891b2", "#a855f7", "#65a30d", "#f43f5e",
  "#0d9488", "#7c3aed", "#c2410c", "#059669", "#4f46e5",
];

/** Estilo del tooltip por defecto de Recharts. */
export const tooltipStyle = {
  borderRadius: "10px",
  border: "none",
  boxShadow: "0 4px 20px rgba(21,24,27,0.12)",
  fontSize: "12px",
} as const;

/* ------------------------------------------------------------------ */
/* Paginación                                                          */
/* ------------------------------------------------------------------ */

/**
 * Anterior / Página [n] de N / Siguiente. El input se puede editar libremente
 * y solo confirma al salir del campo o con Enter (con recorte al rango válido).
 * Se oculta solo cuando hay una única página.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const [valor, setValor] = useState(String(page + 1));
  const [paginaPrevia, setPaginaPrevia] = useState(page);

  // Si la página cambia desde fuera (botones, cambio de filtros), el input se
  // vuelve a sincronizar. Se ajusta durante el render —el patrón que recomienda
  // React— en vez de con un efecto, que provocaría un render en cascada.
  if (paginaPrevia !== page) {
    setPaginaPrevia(page);
    setValor(String(page + 1));
  }

  if (totalPages <= 1) return null;

  const confirmar = () => {
    const n = Number.parseInt(valor, 10);
    if (Number.isNaN(n)) {
      setValor(String(page + 1));
      return;
    }
    const acotada = Math.max(1, Math.min(totalPages, n));
    onPageChange(acotada - 1);
    setValor(String(acotada));
  };

  const botonClass =
    "inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark disabled:pointer-events-none disabled:opacity-35";

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className={botonClass}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Anterior
      </button>
      <span className="inline-flex items-center gap-1.5 px-1 text-xs text-graphite">
        Página
        <input
          type="number"
          min={1}
          max={totalPages}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmar();
            }
          }}
          aria-label="Ir a la página"
          className="w-14 rounded-lg border border-line px-2 py-1 text-center text-xs text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        de {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className={botonClass}
      >
        Siguiente
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Trocea una serie en páginas y devuelve el control ya cableado.
 *
 * `alFinal` arranca en la última página: es lo que se quiere en las series por
 * fecha, donde lo interesante son los días más recientes. Se consigue con una
 * página inicial "infinita" que siempre se recorta al total real, así el rango
 * sigue siendo el último aunque cambien los filtros.
 */
export function usePaginacion<T>(datos: T[], tamano: number, alFinal = false) {
  const [page, setPage] = useState(alFinal ? Number.MAX_SAFE_INTEGER : 0);
  const totalPages = Math.max(1, Math.ceil(datos.length / tamano));
  const pagina = Math.max(0, Math.min(page, totalPages - 1));
  const visibles = datos.slice(pagina * tamano, pagina * tamano + tamano);
  return { visibles, page: pagina, totalPages, setPage };
}

/* ------------------------------------------------------------------ */
/* Tarjetas                                                            */
/* ------------------------------------------------------------------ */

/** Tarjeta de KPI: etiqueta, valor grande, sub-texto y un icono tintado. */
export function StatCard({
  icon,
  label,
  value,
  exact,
  sub,
  subTone = "muted",
  color = "bg-brand",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  /** Valor completo que se muestra al pasar el mouse sobre el número. */
  exact?: string;
  sub?: string;
  subTone?: "muted" | "warning" | "success";
  color?: string;
}) {
  const [hover, setHover] = useState(false);
  const subClass =
    subTone === "warning"
      ? "text-amber-700"
      : subTone === "success"
        ? "text-brand-dark"
        : "text-graphite";

  return (
    <div className="relative rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-graphite">
            {label}
          </p>
          <p
            className="mt-1 inline-block cursor-default text-2xl font-extrabold text-ink"
            onMouseEnter={() => exact && setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            {value}
            {exact && hover && (
              <span className="pointer-events-none absolute left-5 top-full z-30 -mt-2 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white shadow-soft">
                {exact}
              </span>
            )}
          </p>
          {sub && <p className={`mt-1 text-xs ${subClass}`}>{sub}</p>}
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

/** Tarjeta contenedora de una gráfica, con paginación opcional al pie. */
export function ChartCard({
  title,
  hint,
  info,
  children,
  page,
  totalPages,
  onPageChange,
  className = "",
}: {
  title: string;
  /** Una línea que explica qué se está viendo, en lenguaje llano. */
  hint?: string;
  /** Glosario opcional: dibuja un botón "Ayuda" junto al título. */
  info?: { label: string; desc: string }[];
  children: ReactNode;
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white p-5 shadow-soft ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {hint && (
            <p className="mt-1 text-xs leading-relaxed text-graphite">{hint}</p>
          )}
        </div>
        {info && info.length > 0 && (
          <div className="shrink-0">
            <InfoTooltip titulo={title} items={info} />
          </div>
        )}
      </div>
      <div className="mt-4">{children}</div>
      {totalPages != null && page != null && onPageChange && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}

/** Mensaje amable cuando una gráfica se queda sin datos. */
export function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="py-12 text-center text-sm leading-relaxed text-graphite">
      {children}
    </p>
  );
}

/** Leyenda manual (cuadrito de color + etiqueta). */
export function Leyenda({
  items,
  className = "",
}: {
  items: { color: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap justify-center gap-x-4 gap-y-1.5 ${className}`}>
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-xs text-graphite"
        >
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 shrink-0 rounded-sm"
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ayuda (glosario)                                                    */
/* ------------------------------------------------------------------ */

/**
 * Icono (i) con un panel de definiciones. Se abre al pasar el mouse y tarda
 * 220 ms en cerrarse, con un "puente" invisible entre el icono y el panel para
 * que el cursor pueda llegar hasta él sin que desaparezca. También funciona con
 * clic y con teclado.
 */
export function InfoTooltip({
  titulo = "Qué significa cada dato",
  items,
}: {
  titulo?: string;
  items: { label: string; desc: string }[];
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelar = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const programarCierre = useCallback(() => {
    cancelar();
    timer.current = setTimeout(() => setOpen(false), 220);
  }, [cancelar]);

  useEffect(() => () => cancelar(), [cancelar]);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => {
        cancelar();
        setOpen(true);
      }}
      onMouseLeave={programarCierre}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        // El nombre accesible empieza por el texto visible ("Ayuda") y añade
        // el contexto, para no romper el criterio "etiqueta en el nombre".
        aria-label={`Ayuda: ${titulo}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-graphite transition-colors hover:border-brand hover:text-brand-dark"
      >
        <Info className="h-4 w-4" />
        Ayuda
      </button>
      {open && (
        <>
          {/* Puente invisible icono → panel (mantiene el hover). */}
          <div className="absolute right-0 top-full z-40 h-3 w-[320px] sm:w-[420px]" />
          <div
            className="absolute right-0 top-full z-40 mt-3 w-[320px] rounded-2xl border border-line bg-white p-4 shadow-soft sm:w-[420px]"
            onMouseEnter={cancelar}
            onMouseLeave={programarCierre}
          >
            <h4 className="text-sm font-bold text-ink">{titulo}</h4>
            <ul className="mt-2 max-h-[60vh] space-y-2.5 overflow-y-auto pr-1">
              {items.map((it) => (
                <li key={it.label}>
                  <p className="text-xs font-bold text-ink">{it.label}</p>
                  <p className="text-xs leading-relaxed text-graphite">{it.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

/** Título de sección con su glosario al lado. */
export function SectionHeader({
  title,
  description,
  info,
  action,
}: {
  title: string;
  description?: string;
  info?: { label: string; desc: string }[];
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-graphite">
            {description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {info && info.length > 0 && <InfoTooltip items={info} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

const filtroLabelClass =
  "text-[10px] font-bold uppercase tracking-wider text-graphite";
const filtroControlClass =
  "rounded-xl border border-line bg-white px-2.5 py-2 text-xs text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

/** Dos campos de fecha: desde – hasta. */
export function DateRange({
  label,
  from,
  to,
  onChange,
}: {
  label: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={filtroLabelClass}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange(e.target.value, to)}
          aria-label={`${label}: desde`}
          className={filtroControlClass}
        />
        <span className="text-xs text-graphite">–</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange(from, e.target.value)}
          aria-label={`${label}: hasta`}
          className={filtroControlClass}
        />
      </div>
    </div>
  );
}

/** Desplegable simple del panel de filtros. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={filtroLabelClass}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`${filtroControlClass} min-w-[11rem]`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Selección múltiple con buscador. Selección vacía = TODOS (así el filtro por
 * defecto nunca esconde datos sin que el usuario lo pida).
 */
export function MultiSelect({
  label,
  values,
  options,
  onChange,
  placeholder = "Todos",
  noun = "seleccionados",
}: {
  label: string;
  values: string[];
  options: { value: string; label: string }[];
  onChange: (vs: string[]) => void;
  placeholder?: string;
  noun?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  /** Ids estables derivados de la etiqueta, para `aria-labelledby`/`aria-controls`. */
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const etiquetaId = `ms-${slug}-etiqueta`;
  const panelId = `ms-${slug}-panel`;
  const botonId = `ms-${slug}-boton`;

  useEffect(() => {
    if (!open) return;
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    // Escape cierra el panel y devuelve el foco al botón (WCAG 2.1.2).
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        disparadorRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [open]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, busqueda]);

  const seleccion = useMemo(() => new Set(values), [values]);
  const todos = values.length === 0;
  const visiblesMarcadas =
    filtradas.length > 0 && filtradas.every((o) => seleccion.has(o.value));

  const resumen = todos
    ? placeholder
    : values.length === 1
      ? (options.find((o) => o.value === values[0])?.label ?? `1 ${noun}`)
      : `${values.length} ${noun}`;

  return (
    <div className="relative flex flex-col gap-1" ref={ref}>
      <span id={etiquetaId} className={filtroLabelClass}>
        {label}
      </span>
      <button
        ref={disparadorRef}
        id={botonId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        /* El nombre accesible es «Empleados, 3 seleccionados»: la etiqueta
           visible más el resumen de la selección. */
        aria-labelledby={`${etiquetaId} ${botonId}`}
        className={`${filtroControlClass} flex min-w-[11rem] items-center justify-between gap-2 hover:border-brand/60`}
      >
        <span className={`truncate ${todos ? "text-graphite" : "text-ink"}`}>
          {resumen}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-graphite" />
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-labelledby={etiquetaId}
          className="absolute left-0 top-full z-50 mt-1 w-[17rem] rounded-2xl border border-line bg-white py-2 shadow-soft"
        >
          <div className="relative border-b border-line px-2 pb-2">
            <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-graphite" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              aria-label={`Buscar en ${label}`}
              className="w-full rounded-lg border border-line py-1.5 pl-7 pr-2 text-xs text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
          </div>

          <div className="flex justify-between border-b border-line px-3 py-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => onChange([])}
              className="font-semibold text-brand-dark hover:text-brand"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => {
                const visibles = filtradas.map((o) => o.value);
                if (visiblesMarcadas) {
                  onChange(values.filter((v) => !visibles.includes(v)));
                } else {
                  onChange([...new Set([...values, ...visibles])]);
                }
              }}
              className="font-semibold text-graphite hover:text-ink"
            >
              {visiblesMarcadas ? "Quitar visibles" : "Seleccionar visibles"}
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {filtradas.length === 0 && (
              <p className="px-3 py-2 text-center text-xs text-graphite">
                Sin resultados
              </p>
            )}
            {filtradas.map((o) => {
              const marcada = seleccion.has(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  /* El recuadro visual es `aria-hidden`, así que el estado
                     marcado/desmarcado se comunica con role+aria-checked. */
                  role="checkbox"
                  aria-checked={marcada}
                  onClick={() =>
                    marcada
                      ? onChange(values.filter((v) => v !== o.value))
                      : onChange([...values, o.value])
                  }
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-mist"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      marcada
                        ? "border-brand-dark bg-brand-dark text-white"
                        : "border-line bg-white"
                    }`}
                  >
                    {marcada && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate text-ink-soft">{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
