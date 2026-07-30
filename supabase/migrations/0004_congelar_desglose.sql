-- =============================================================================
-- GPI — Migración 0004: congelar el desglose de horas al APROBAR una jornada
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001, 0002 y 0003.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ PROBLEMA RESUELVE
-- ---------------------
-- Hasta ahora el desglose de horas (ordinarias, extra diurna/nocturna,
-- dominical…) se RECALCULABA en cada consulta a partir del horario del mes
-- (`horarios_mensuales`) y de los porcentajes de `site_settings.jornada_config`.
-- Consecuencia inaceptable para nómina: si en septiembre alguien corrige el
-- horario de julio o cambia un recargo, CAMBIAN los reportes de jornadas ya
-- aprobadas y pagadas.
--
-- Desde esta migración, al APROBAR una jornada el servidor calcula una sola vez
-- y GUARDA el resultado junto con el contexto que usó. A partir de ahí, esa
-- jornada muestra siempre los mismos números.
--
-- QUÉ AÑADE
--   · jornadas.desglose         → el resultado completo del cálculo (minutos por
--                                 categoría + banderas de dominical/festivo).
--   · jornadas.contexto_calculo → con qué se calculó: horario del día aplicado,
--                                 porcentajes de recargo y topes vigentes.
--                                 Es el respaldo de AUDITORÍA: permite explicar
--                                 por qué salió ese número.
--   · jornadas.calculado_at     → cuándo se congeló.
--
-- SIN CAMBIOS DE RLS: las políticas de `jornadas` de la migración 0002 son a
-- nivel de FILA, así que ya cubren estas tres columnas nuevas
-- (`jornadas_update_manager` para aprobar/rechazar/reabrir y
-- `jornadas_update_own` para que el empleado edite las suyas mientras están
-- pendientes). No hace falta tocarlas.
--
-- NOTA DE SEGURIDAD: un empleado solo puede escribir en sus jornadas
-- PENDIENTES. El snapshot lo escribe el servidor al aprobar y SIEMPRE se
-- sobrescribe con su propio cálculo, así que nadie puede "inyectar" cifras a
-- mano y hacerlas pasar por aprobadas.
--
-- JORNADAS HISTÓRICAS: las que se aprobaron antes de esta migración quedan con
-- `desglose = null` y se siguen calculando EN VIVO, exactamente como hasta hoy.
-- No se rellenan hacia atrás a propósito: inventar un `calculado_at` que nunca
-- ocurrió falsearía la auditoría. Se congelan solas si un manager las devuelve
-- a pendiente y las vuelve a aprobar.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada ni pisar
-- snapshots ya guardados.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. COLUMNAS NUEVAS EN `jornadas`
-- =============================================================================

alter table public.jornadas
  add column if not exists desglose jsonb;

alter table public.jornadas
  add column if not exists contexto_calculo jsonb;

alter table public.jornadas
  add column if not exists calculado_at timestamptz;

-- Los comentarios son documentación viva del esquema: si algo falla (permisos,
-- versiones raras de Postgres) se avisa pero la migración NO se detiene.
do $do$
begin
  comment on column public.jornadas.desglose is
    'Desglose de horas CONGELADO al aprobar la jornada (minutos por categoría: ordinariaDiurna, extraNocturna, dominicalDiurna…, más las banderas esDominicalFestivo/cruzaMedianoche y los festivos que toca el turno). NULL = todavía no se aprobó, o se aprobó antes de la migración 0004: en ese caso el cálculo se hace en vivo.';

  comment on column public.jornadas.contexto_calculo is
    'Respaldo de auditoría del cálculo congelado: horario del día que se aplicó (inicio, fin, almuerzo, si era laboral), mes del horario, franja nocturna, porcentajes de recargo y topes de horas extra vigentes en el momento de aprobar. Permite explicar POR QUÉ salió ese número aunque después cambie la configuración.';

  comment on column public.jornadas.calculado_at is
    'Instante en que se congeló el desglose (al aprobar). NULL = el desglose se calcula en vivo.';
exception
  when others then
    raise notice 'No se pudieron escribir los comentarios de las columnas nuevas de jornadas (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 2. ÍNDICE DE APOYO PARA AUDITORÍA
--
--    Sirve para responder rápido "¿qué jornadas aprobadas todavía no tienen
--    snapshot?" (las históricas), que es la consulta que se hará al revisar un
--    período de nómina. Es un índice parcial: ocupa casi nada.
-- =============================================================================

do $do$
begin
  create index if not exists jornadas_aprobadas_sin_snapshot_idx
    on public.jornadas (work_date desc)
    where status = 'aprobada' and desglose is null;
exception
  when others then
    raise notice 'No se pudo crear jornadas_aprobadas_sin_snapshot_idx (%). No es crítico.', sqlerrm;
end;
$do$;


-- =============================================================================
-- 3. COHERENCIA: una jornada NO aprobada no debe conservar snapshot
--
--    El código ya limpia el snapshot al devolver una jornada a pendiente y al
--    rechazarla. Esta limpieza es solo por si quedó algo de una versión previa.
-- =============================================================================

update public.jornadas
   set desglose = null,
       contexto_calculo = null,
       calculado_at = null
 where status <> 'aprobada'
   and (desglose is not null or contexto_calculo is not null or calculado_at is not null);


-- =============================================================================
-- 4. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_aprobadas   int;
  v_congeladas  int;
begin
  select count(*) into v_aprobadas
    from public.jornadas where status = 'aprobada';

  select count(*) into v_congeladas
    from public.jornadas where status = 'aprobada' and desglose is not null;

  raise notice 'Migración 0004 aplicada. Jornadas aprobadas: %; con desglose congelado: %. Las demás (aprobadas antes de esta migración) se siguen calculando en vivo; se congelan si un manager las devuelve a pendiente y las vuelve a aprobar.', v_aprobadas, v_congeladas;
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
