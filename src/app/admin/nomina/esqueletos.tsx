/**
 * ESQUELETOS DE LAS PESTAÑAS DE NÓMINA
 * ====================================
 * Lo que se ve mientras llega el contenido de una pestaña (el `fallback` del
 * `<Suspense>` con `key` de `page.tsx`). Imitan la forma de cada pestaña —
 * selectores, totales, tabla; formulario; indicadores y gráficas— para que el
 * cambio no «salte» cuando llegan los datos.
 *
 * Por qué hace falta aquí: cambiar de pestaña solo cambia `?vista=`, y sin una
 * frontera propia la pantalla anterior se queda congelada hasta tener todos los
 * datos nuevos. (El `app/admin/loading.tsx` del segmento tampoco serviría: no se
 * volvía a montar al cambiar solo los parámetros de búsqueda, y además se
 * eliminó el 22 sep 2026 porque colgaba las server actions.) Un `<Suspense>` con
 * una `key` distinta por pestaña y parámetros sí se monta de nuevo y enseña su
 * esqueleto en cuanto el servidor empieza a responder.
 */

import type { VistaNomina } from "@/components/nomina/PestanasNomina";

const bloque = "rounded-xl bg-mist";
const tarjeta = "rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6";

function Ayuda() {
  return <div className="h-12 rounded-2xl border border-line bg-mist/60" />;
}

function Liquidacion() {
  return (
    <>
      <Ayuda />
      <div className={tarjeta}>
        <div className="flex flex-wrap items-end gap-4">
          <div className={`${bloque} h-11 min-w-[12rem] flex-1`} />
          <div className={`${bloque} h-11 w-36`} />
          <div className={`${bloque} h-11 w-32`} />
          <div className={`${bloque} h-11 w-28`} />
          <div className={`${bloque} h-11 w-44`} />
        </div>
        <div className="mt-4 h-3.5 w-full max-w-xl rounded bg-mist" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${tarjeta} h-24`} />
        ))}
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-44 rounded-full bg-white" />
        <div className="h-10 w-36 rounded-full bg-white" />
      </div>
      <div className={`${tarjeta} space-y-3`}>
        <div className="h-4 w-full rounded bg-mist" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-full rounded-lg bg-mist/70" />
        ))}
      </div>
    </>
  );
}

function Configuracion() {
  return (
    <>
      <Ayuda />
      <div className={tarjeta}>
        <div className="flex flex-wrap items-end gap-4">
          <div className={`${bloque} h-11 min-w-[14rem] flex-1`} />
          <div className={`${bloque} h-11 w-36`} />
          <div className={`${bloque} h-11 w-28`} />
        </div>
      </div>
      <div className={tarjeta}>
        <div className="flex gap-3">
          <div className="h-6 w-40 rounded-full bg-mist" />
          <div className="h-4 flex-1 rounded bg-mist/70" />
        </div>
        <div className="mt-5 h-8 w-64 rounded-full bg-mist/70" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className={tarjeta}>
          <div className="h-5 w-52 rounded bg-mist" />
          <div className="mt-3 h-3.5 w-full max-w-lg rounded bg-mist" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className={`${bloque} h-11`} />
            <div className={`${bloque} h-11`} />
            <div className={`${bloque} h-11`} />
            <div className={`${bloque} h-11`} />
          </div>
        </div>
      ))}
    </>
  );
}

function Tablero() {
  return (
    <>
      <div className={tarjeta}>
        <div className="flex flex-wrap gap-4">
          <div className={`${bloque} h-11 min-w-[12rem] flex-1`} />
          <div className={`${bloque} h-11 w-32`} />
          <div className={`${bloque} h-11 w-36`} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${tarjeta} h-24`} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${tarjeta} h-72`} />
        <div className={`${tarjeta} h-72`} />
      </div>
    </>
  );
}

export function EsqueletoNomina({ vista }: { vista: VistaNomina }) {
  return (
    <>
      {/* El esqueleto es decorativo; el cambio sí se anuncia (fuera del
          contenedor `aria-hidden`). */}
      <p className="sr-only" role="status">
        Cargando la nómina…
      </p>
      <div className="animate-pulse space-y-6" aria-hidden="true">
        {vista === "configuracion" ? (
          <Configuracion />
        ) : vista === "tablero" ? (
          <Tablero />
        ) : (
          <Liquidacion />
        )}
      </div>
    </>
  );
}
