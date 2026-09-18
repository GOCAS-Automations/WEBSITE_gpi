-- =============================================================================
-- GPI — Migración 0012: la nómina pasa a ser SOLO DEL ADMINISTRADOR
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001 … 0011.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE
-- --------
-- La 0011 dejó las dos tablas de nómina en manos de los MANAGERS
-- (`is_manager()` = admin | coordinador). GPI pidió el 18 de septiembre de 2026
-- cerrarlo un paso más: **la nómina la administra únicamente el
-- ADMINISTRADOR**. El coordinador sigue aprobando jornadas y llevando el
-- calendario, pero de la nómina solo ve **la suya**, como cualquier empleado.
--
-- Por tanto:
--   · `nomina_config_mensual`  → lectura y escritura solo del administrador.
--   · `nomina_liquidaciones`   → lectura de TODAS y escritura solo del
--     administrador. La política de «lo propio» NO se toca: es justamente la
--     que hace que el coordinador (y cualquier empleado) vea sus liquidaciones
--     cerradas o pagadas y descargue su volante.
--
-- POR QUÉ UN HELPER NUEVO Y NO `is_admin()` A SECAS
-- -------------------------------------------------
-- `public.is_admin()` (migración 0001) comprueba el rol pero **no** que la
-- cuenta siga activa; `public.is_manager()` (0002) sí lo comprueba. Cambiar
-- `is_manager()` por `is_admin()` a secas habría endurecido el rol y, a la vez,
-- **aflojado** la exigencia de cuenta activa: un administrador desactivado
-- conservaría acceso a la nómina desde la API con un token válido. Se crea
-- entonces `public.is_admin_activo()`, que es `is_admin()` + cuenta activa, con
-- la misma forma que `is_manager()`. `is_admin()` no se toca: lo usan las
-- políticas de contenido de la 0001.
--
-- SEGURO DE APLICAR AUNQUE EL CÓDIGO DE NÓMINA NO ESTÉ DESPLEGADO: solo
-- endurece permisos sobre tablas que hoy están vacías.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada.
-- =============================================================================

begin;

-- =============================================================================
-- 1. HELPER `public.is_admin_activo()`
--    SECURITY DEFINER, igual que `is_admin()` e `is_manager()`: se ejecuta como
--    el dueño de la tabla, así no entra en recursión con la RLS de `profiles`.
-- =============================================================================

create or replace function public.is_admin_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.role = 'admin'
       and coalesce(p.active, true)
  );
$fn$;

comment on function public.is_admin_activo() is
  'true si quien consulta es un administrador con la cuenta activa. Lo usan las políticas de nómina desde la migración 0012.';

revoke all on function public.is_admin_activo() from public;
grant execute on function public.is_admin_activo() to anon, authenticated, service_role;


-- =============================================================================
-- 2. `nomina_config_mensual` — solo el administrador
--    Se borran las políticas de manager de la 0011 (por su nombre) y se crean
--    las nuevas. Los `drop ... if exists` hacen que repetir la migración no
--    falle ni duplique nada.
-- =============================================================================

drop policy if exists nomina_config_select_manager on public.nomina_config_mensual;
drop policy if exists nomina_config_insert_manager on public.nomina_config_mensual;
drop policy if exists nomina_config_update_manager on public.nomina_config_mensual;
drop policy if exists nomina_config_delete_manager on public.nomina_config_mensual;

drop policy if exists nomina_config_select_admin on public.nomina_config_mensual;
drop policy if exists nomina_config_insert_admin on public.nomina_config_mensual;
drop policy if exists nomina_config_update_admin on public.nomina_config_mensual;
drop policy if exists nomina_config_delete_admin on public.nomina_config_mensual;

create policy nomina_config_select_admin on public.nomina_config_mensual
  for select to authenticated using (public.is_admin_activo());

create policy nomina_config_insert_admin on public.nomina_config_mensual
  for insert to authenticated with check (public.is_admin_activo());

create policy nomina_config_update_admin on public.nomina_config_mensual
  for update to authenticated
  using (public.is_admin_activo()) with check (public.is_admin_activo());

create policy nomina_config_delete_admin on public.nomina_config_mensual
  for delete to authenticated using (public.is_admin_activo());


-- =============================================================================
-- 3. `nomina_liquidaciones`
--    SELECT de TODAS y toda la escritura: solo el administrador.
--    `nomina_liquidaciones_select_propia` (la de la 0011) se deja INTACTA: es
--    la que permite que cada quien —incluido el coordinador— vea sus propias
--    liquidaciones cerradas o pagadas y descargue su volante.
-- =============================================================================

drop policy if exists nomina_liquidaciones_select_manager on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_insert_manager on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_update_manager on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_delete_manager on public.nomina_liquidaciones;

drop policy if exists nomina_liquidaciones_select_admin on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_insert_admin on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_update_admin on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_delete_admin on public.nomina_liquidaciones;

create policy nomina_liquidaciones_select_admin on public.nomina_liquidaciones
  for select to authenticated using (public.is_admin_activo());

create policy nomina_liquidaciones_insert_admin on public.nomina_liquidaciones
  for insert to authenticated with check (public.is_admin_activo());

create policy nomina_liquidaciones_update_admin on public.nomina_liquidaciones
  for update to authenticated
  using (public.is_admin_activo()) with check (public.is_admin_activo());

create policy nomina_liquidaciones_delete_admin on public.nomina_liquidaciones
  for delete to authenticated using (public.is_admin_activo());


-- =============================================================================
-- 4. LA POLÍTICA DE «LO PROPIO» TIENE QUE SEGUIR AHÍ
--    Si no existiera, nadie vería su propio volante. Se recrea tal cual la
--    definió la 0011, por si esta migración se aplica sobre una base donde
--    alguien la borró a mano.
-- =============================================================================

drop policy if exists nomina_liquidaciones_select_propia on public.nomina_liquidaciones;

create policy nomina_liquidaciones_select_propia on public.nomina_liquidaciones
  for select to authenticated
  using (
    employee_id = auth.uid()
    and estado in ('cerrada', 'pagada')
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and coalesce(p.active, true)
    )
  );


-- =============================================================================
-- 5. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_config int;
  v_liq    int;
begin
  select count(*) into v_config
    from pg_policies
   where schemaname = 'public' and tablename = 'nomina_config_mensual';
  select count(*) into v_liq
    from pg_policies
   where schemaname = 'public' and tablename = 'nomina_liquidaciones';
  raise notice 'Migración 0012 aplicada. Políticas: nomina_config_mensual=% (esperadas 4) · nomina_liquidaciones=% (esperadas 5: 4 de admin + la de lo propio). La nómina la administra SOLO el administrador; el coordinador ve la suya en Mi Cuenta.',
    v_config, v_liq;
end;
$do$;

commit;

-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
