-- =============================================================================
-- GPI — Migración 0013: «suspender la herencia» de la configuración de nómina
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001 … 0012.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE
-- --------
-- La configuración de nómina funciona «vigente desde» (18 sep 2026): una fila
-- de `nomina_config_mensual` guardada en el mes N rige desde N en adelante,
-- hasta la próxima fila de esa persona. Faltaba poder CORTAR esa herencia en un
-- mes que la hereda (un empleado que se retira, una licencia no remunerada):
--
--   1. Columna `sin_configuracion boolean not null default false`. Una fila con
--      `true` es un CORTE: «SIN configuración desde este mes en adelante», hasta
--      el próximo cambio. Es una fila de cambio más, así que borrarla («Quitar el
--      cambio de este mes») deshace el corte y el mes vuelve a heredar.
--      NO se reutiliza «salario 0» como corte: las filas con salario 0 son
--      restos del modelo anterior y el código las ignora a propósito.
--      Un corte no necesita salario ni tarifas: se guarda con los valores por
--      defecto de la tabla (todo en 0, que las restricciones `>= 0` ya aceptan),
--      así que no hace falta relajar ninguna restricción.
--
--   2. Función `nomina_aplicar_cambio_config(...)`: quita un cambio (borra la
--      fila del mes) o suspende la herencia (escribe el corte) Y, EN LA MISMA
--      TRANSACCIÓN, elimina los borradores de liquidación que la aplicación le
--      indica —los de los meses que quedan sin configuración—. Si algo falla, no
--      se aplica nada. Nunca toca una liquidación cerrada o pagada: el filtro
--      `estado = 'borrador'` está en el propio DELETE.
--      Es SECURITY INVOKER: corre con los permisos de quien llama, así que las
--      políticas RLS de la 0012 (solo el administrador activo) siguen mandando;
--      además lo comprueba al principio para dar un error claro.
--
-- COMPATIBILIDAD: el código anterior a esta migración no lee la columna nueva
-- (un corte le parecería una fila en cero y la ignoraría) ni llama a la
-- función. Es seguro aplicarla antes de desplegar el código.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. COLUMNA `sin_configuracion`
-- =============================================================================

alter table public.nomina_config_mensual
  add column if not exists sin_configuracion boolean not null default false;

do $do$
begin
  comment on column public.nomina_config_mensual.sin_configuracion is
    'true = CORTE («suspender la herencia»): la persona queda SIN configuración desde este mes hasta el próximo cambio. Su salario y tarifas van en 0 y no significan nada. Borrar la fila deshace el corte.';
exception
  when others then
    raise notice 'No se pudo escribir el comentario de sin_configuracion (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 2. FUNCIÓN `nomina_aplicar_cambio_config`
--    p_accion = 'quitar' → borra la fila (configuración o corte) del mes.
--    p_accion = 'cortar' → escribe un corte en el mes (reemplaza un resto en 0).
--    p_borradores        → ids de liquidaciones EN BORRADOR de esa persona que
--                          quedan sin configuración (los calcula la aplicación
--                          con la regla única de `src/lib/nomina.ts`).
--    Devuelve {"config": filas tocadas, "borradores": borradores eliminados}.
-- =============================================================================

create or replace function public.nomina_aplicar_cambio_config(
  p_employee   uuid,
  p_anio       int,
  p_mes        int,
  p_accion     text,
  p_borradores uuid[] default '{}'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_config     int := 0;
  v_borradores int := 0;
begin
  if not public.is_admin_activo() then
    raise exception 'Solo un administrador activo puede cambiar la configuración de nómina.'
      using errcode = '42501';
  end if;

  if p_accion = 'quitar' then
    delete from public.nomina_config_mensual
     where employee_id = p_employee and anio = p_anio and mes = p_mes;
    get diagnostics v_config = row_count;

  elsif p_accion = 'cortar' then
    -- Solo sobre un mes SIN configuración propia: la aplicación ya lo comprueba
    -- y aquí se vuelve a exigir (una fila con salario > 0 no se pisa).
    if exists (
      select 1 from public.nomina_config_mensual
       where employee_id = p_employee and anio = p_anio and mes = p_mes
         and sin_configuracion = false and salario_basico > 0
    ) then
      raise exception 'Ese mes tiene su propia configuración: quita primero ese cambio.'
        using errcode = '23514';
    end if;

    insert into public.nomina_config_mensual as c (
      employee_id, anio, mes, sin_configuracion,
      salario_basico, aux_transporte,
      valor_hora_base, valor_rotacion_nocturna, valor_extra_diurna,
      valor_extra_nocturna, valor_festivo, valor_extra_festivo_diurna,
      valor_extra_festivo_nocturna
    )
    values (p_employee, p_anio, p_mes, true, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    on conflict (employee_id, anio, mes) do update
      set sin_configuracion            = true,
          salario_basico               = 0,
          aux_transporte               = 0,
          valor_hora_base              = 0,
          valor_rotacion_nocturna      = 0,
          valor_extra_diurna           = 0,
          valor_extra_nocturna         = 0,
          valor_festivo                = 0,
          valor_extra_festivo_diurna   = 0,
          valor_extra_festivo_nocturna = 0,
          copiado_de                   = null;
    get diagnostics v_config = row_count;

  else
    raise exception 'Acción desconocida: %', p_accion using errcode = '22023';
  end if;

  if v_config = 0 then
    raise exception 'Ese cambio ya no existe.' using errcode = 'P0002';
  end if;

  -- Los borradores que quedan sin configuración, en la MISMA transacción.
  -- Cerradas y pagadas: jamás (el filtro de estado va aquí mismo).
  if coalesce(array_length(p_borradores, 1), 0) > 0 then
    delete from public.nomina_liquidaciones
     where id = any (p_borradores)
       and employee_id = p_employee
       and estado = 'borrador';
    get diagnostics v_borradores = row_count;
  end if;

  return jsonb_build_object('config', v_config, 'borradores', v_borradores);
end;
$fn$;

do $do$
begin
  comment on function public.nomina_aplicar_cambio_config(uuid, int, int, text, uuid[]) is
    'Quita un cambio de configuración de nómina o suspende la herencia (corte) y elimina en la misma transacción los borradores indicados que quedan sin configuración. SECURITY INVOKER: aplica la RLS de la 0012 (solo administrador activo).';
exception
  when others then
    raise notice 'No se pudo escribir el comentario de la función (%).', sqlerrm;
end;
$do$;

revoke all on function public.nomina_aplicar_cambio_config(uuid, int, int, text, uuid[]) from public;
revoke all on function public.nomina_aplicar_cambio_config(uuid, int, int, text, uuid[]) from anon;
grant execute on function public.nomina_aplicar_cambio_config(uuid, int, int, text, uuid[]) to authenticated, service_role;


-- =============================================================================
-- 3. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_columna boolean;
  v_funcion boolean;
begin
  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'nomina_config_mensual'
       and column_name = 'sin_configuracion'
  ) into v_columna;
  select exists (
    select 1 from pg_proc where proname = 'nomina_aplicar_cambio_config'
  ) into v_funcion;
  raise notice 'Migración 0013 aplicada. Columna sin_configuracion: % · función nomina_aplicar_cambio_config: %. Se puede suspender la herencia de la configuración desde cualquier mes.',
    v_columna, v_funcion;
end;
$do$;

notify pgrst, 'reload schema';

-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
