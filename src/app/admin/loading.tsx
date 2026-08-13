/**
 * FRONTERA DE CARGA DEL PANEL — el arreglo de «la navegación se traba»
 * ====================================================================
 * GPI reportó que «navegar entre pestañas a veces se traba, no permite navegar
 * y toca recargar». No era un cuelgue: era la ausencia de este archivo.
 *
 * QUÉ PASABA
 * ----------
 * Todas las rutas de `/admin` son `force-dynamic` y consultan Supabase. Sin una
 * frontera de carga, el router de Next **no confirma la navegación hasta que el
 * servidor termina de renderizar**: la URL no cambia, la pantalla no se mueve y
 * no aparece ningún indicador. Medido en local son 400–700 ms; contra Supabase
 * desde Colombia, varios segundos.
 *
 * Durante esa espera el panel parece congelado, así que la persona vuelve a
 * hacer clic — y **cada clic nuevo cancela la navegación en curso**. Con clics
 * cada ~120 ms no llega a confirmarse ninguna: reproducido en pruebas, doce
 * clics seguidos y la URL sin moverse ni una vez. De ahí el «toca recargar».
 *
 * QUÉ HACE ESTE ARCHIVO
 * ---------------------
 * Crea el `<Suspense>` que le faltaba al segmento. Con él, en cuanto el
 * servidor empieza a responder la pantalla se sustituye por este esqueleto en
 * vez de quedarse con la anterior, y al volver con el botón «atrás» la sección
 * aparece de inmediato. Solo reemplaza el `<main>`: el `AdminShell` (barra
 * superior, menú lateral y tabs) vive en el layout y se queda quieto, que es lo
 * que hace que el cambio se lea como «esta sección está cargando» y no como
 * «la página se recargó».
 *
 * EL ARREGLO SON TRES PIEZAS, NO UNA
 * ----------------------------------
 * Este archivo por sí solo NO adelanta el momento en que el router confirma la
 * navegación —sin ruta precargada sigue habiendo un viaje al servidor antes de
 * pintar nada—, así que se acompaña de:
 *   · `src/components/admin/PuntoDeCarga.tsx` — el indicador que gira en el
 *     enlace pulsado a los ~80 ms. Es lo que de verdad quita la sensación de
 *     panel congelado.
 *   · `prefetch={false}` en `AdminShell` — sin él `useLinkStatus` no tendría
 *     estado pendiente que mostrar, y el menú dispararía media docena de
 *     peticiones dinámicas a la vez.
 *
 * Medido después: 20 transiciones seguidas sin una sola traba y, tras diez
 * clics en ráfaga, la última navegación se completa sola y el panel sigue
 * respondiendo.
 */
export default function AdminLoading() {
  return (
    <>
      {/* El esqueleto es decorativo, pero el cambio de sección sí debe
          anunciarse. Va FUERA del contenedor `aria-hidden`: un
          `aria-hidden="false"` anidado dentro de uno en `true` no lo revierte
          —el atributo se hereda— y el mensaje quedaría mudo. */}
      <p className="sr-only" role="status">
        Cargando la sección del panel…
      </p>
      <div className="animate-pulse" aria-hidden="true">
      {/* Cabecera: botón de volver + título + descripción */}
      <div className="mb-7">
        <div className="h-9 w-44 rounded-full bg-white" />
        <div className="mt-5 h-8 w-64 rounded-lg bg-white" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded bg-white/70" />
        <div className="mt-2 h-4 w-2/3 max-w-md rounded bg-white/70" />
      </div>

      {/* Dos tarjetas de contenido */}
      <div className="space-y-6">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6"
          >
            <div className="h-5 w-52 rounded bg-mist" />
            <div className="mt-3 h-3.5 w-full max-w-lg rounded bg-mist" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="h-11 rounded-xl bg-mist" />
              <div className="h-11 rounded-xl bg-mist" />
              <div className="h-11 rounded-xl bg-mist" />
              <div className="h-11 rounded-xl bg-mist" />
            </div>
            <div className="mt-6 h-10 w-44 rounded-full bg-mist" />
          </div>
        ))}
      </div>

      </div>
    </>
  );
}
