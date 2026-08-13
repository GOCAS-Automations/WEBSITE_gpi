-- =============================================================================
-- GPI — Migración 0009: teléfono en los mensajes del formulario de contacto
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001 … 0008 (en especial la 0006,
-- que es la que crea `site_mensajes`).
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE
-- --------
-- Añade la columna `telefono` a `site_mensajes`. El formulario de /contacto
-- pasó a pedir el teléfono como dato OBLIGATORIO: GPI prefiere devolver la
-- llamada a abrir un hilo de correos, y hasta ahora ese número solo llegaba si
-- el visitante se acordaba de escribirlo dentro del mensaje.
--
-- POR QUÉ LA COLUMNA ES OPCIONAL (nullable)
-- Los mensajes recibidos ANTES de este cambio no tienen teléfono y no hay de
-- dónde sacarlo. Marcar la columna como obligatoria haría fallar la migración
-- —o exigiría inventar un valor—, así que se deja `null` para las filas viejas
-- y son las nuevas las que siempre lo traen: quien valida que el teléfono
-- venga es el formulario, en el servidor, antes de guardar nada.
--
-- EL SITIO FUNCIONA SIN ESTA MIGRACIÓN
-- Regla de siempre del proyecto: si la columna no existe, la server action
-- reintenta el `insert` sin ella (`faltaColumnaTelefono` en
-- `src/app/contacto/actions.ts`). El mensaje queda respaldado igual y el
-- teléfono viaja de todos modos dentro del correo. Aplicar la migración solo
-- añade el dato a la tabla.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. LA COLUMNA
--
--    `if not exists` la hace repetible. Si `site_mensajes` todavía no existe
--    (0006 sin aplicar), esto fallaría, así que el bloque avisa en vez de
--    abortar: primero se aplica la 0006 y después esta.
-- =============================================================================

do $do$
begin
  alter table public.site_mensajes
    add column if not exists telefono text;

  raise notice 'Columna site_mensajes.telefono lista.';
exception
  when undefined_table then
    raise notice 'La tabla site_mensajes no existe: aplique primero la migración 0006 y vuelva a ejecutar esta.';
  when others then
    raise notice 'No se pudo añadir site_mensajes.telefono (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 2. COMENTARIO DE LA COLUMNA
--
--    Igual que en las migraciones anteriores: si el rol que ejecuta no puede
--    escribir comentarios, se avisa y se sigue. Un comentario que falte no
--    cambia nada para el sitio.
-- =============================================================================

do $do$
begin
  comment on column public.site_mensajes.telefono is
    'Teléfono que dejó el visitante en el formulario de /contacto. Obligatorio desde el 13/08/2026; NULL en los mensajes recibidos antes de esa fecha.';
exception
  when others then
    raise notice 'No se pudo escribir el comentario de site_mensajes.telefono (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 3. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_total     int;
  v_con_tel   int;
begin
  select count(*) into v_total   from public.site_mensajes;
  select count(*) into v_con_tel from public.site_mensajes
   where telefono is not null and btrim(telefono) <> '';

  raise notice 'Migración 0009 aplicada. Mensajes guardados: % (con teléfono: %; los anteriores al cambio quedan sin él, es lo esperado).',
    v_total, v_con_tel;
exception
  when others then
    raise notice 'Migración 0009: no se pudo contar los mensajes (%). Revise que la 0006 esté aplicada.', sqlerrm;
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
