-- =============================================================================
-- GPI — Migración 0002: roles ampliados, cuentas de empleados, jornadas
--                       (horas extra) y visibilidad del contenido
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES la migración 0001_site_content.sql.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE (resumen):
--   1. Amplía los roles de `profiles`: admin | coordinador | marketing | empleado
--      (las filas antiguas con 'employee' se migran a 'empleado') y añade las
--      columnas `active`, `cargo` y `phone`.
--   2. Añade los helpers `is_content_editor()` (admin/coordinador/marketing) e
--      `is_manager()` (admin/coordinador) y reasigna las políticas de escritura
--      de las tablas site_* a `is_content_editor()`.
--   3. Añade `published` a las tablas de contenido: el público anónimo solo ve
--      lo publicado; el equipo autenticado con rol de contenido lo ve todo.
--   4. Crea la tabla `jornadas` (registro de horas extra) con su RLS.
--   5. Siembra los ajustes `visibility` (secciones visibles del sitio) y
--      `jornada_config` (parámetros de cálculo de recargos).
--
-- Es idempotente: se puede volver a ejecutar sin duplicar datos.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. ROLES AMPLIADOS EN `profiles`
--    admin       → control total (contenido, cuentas, jornadas)
--    coordinador → contenido + cuentas (no admins) + aprobación de jornadas
--    marketing   → solo contenido del sitio público
--    empleado    → solo su portal en /mi-cuenta (registro de jornadas)
-- =============================================================================

-- 1.1 Columnas nuevas ---------------------------------------------------------
alter table public.profiles
  add column if not exists active boolean not null default true;

alter table public.profiles
  add column if not exists cargo text;

alter table public.profiles
  add column if not exists phone text;

comment on column public.profiles.active is
  'false = cuenta desactivada: no puede iniciar sesión ni usar el portal.';
comment on column public.profiles.cargo is
  'Cargo dentro de GPI (p. ej. "Técnico electricista"). Informativo.';
comment on column public.profiles.phone is
  'Teléfono de contacto del empleado. Informativo.';

-- 1.2 Nuevo check de roles ----------------------------------------------------
-- Primero se quita el check anterior, luego se migran los valores viejos y por
-- último se vuelve a crear el check con el juego de roles definitivo.
do $do$
begin
  alter table public.profiles drop constraint if exists profiles_role_check;
exception
  when others then
    raise notice 'No se pudo eliminar profiles_role_check (%).', sqlerrm;
end;
$do$;

-- Migración de datos: 'employee' (0001) → 'empleado'.
update public.profiles set role = 'empleado' where role = 'employee';

-- Cualquier valor inesperado se normaliza al rol de menor privilegio.
update public.profiles
   set role = 'empleado'
 where role not in ('admin', 'coordinador', 'marketing', 'empleado');

alter table public.profiles
  alter column role set default 'empleado';

do $do$
begin
  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('admin', 'coordinador', 'marketing', 'empleado'));
exception
  when duplicate_object then
    null;  -- ya existía: nada que hacer
  when others then
    raise notice 'No se pudo crear profiles_role_check (%).', sqlerrm;
end;
$do$;

-- 1.3 Trigger de auth.users actualizado --------------------------------------
-- Respeta el role que venga en raw_user_meta_data (lo envía la Auth Admin API
-- desde /admin/empleados) y refresca cargo/phone si también vienen.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'empleado');

  -- Compatibilidad con el nombre viejo del rol.
  if v_role = 'employee' then
    v_role := 'empleado';
  end if;

  if v_role not in ('admin', 'coordinador', 'marketing', 'empleado') then
    v_role := 'empleado';
  end if;

  insert into public.profiles (id, email, full_name, role, cargo, phone, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    v_role,
    nullif(new.raw_user_meta_data ->> 'cargo', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    true
  )
  on conflict (id) do update
    set email     = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role      = excluded.role,
        cargo     = coalesce(excluded.cargo, public.profiles.cargo),
        phone     = coalesce(excluded.phone, public.profiles.phone);

  return new;
end;
$fn$;

do $do$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception
  when others then
    raise notice 'No se pudo recrear el trigger on_auth_user_created (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 2. HELPERS DE ROL (security definer, sin recursión con RLS)
-- =============================================================================

-- is_admin() ya existe desde 0001; se redefine para exigir además cuenta activa.
create or replace function public.is_admin()
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

-- Puede editar el CONTENIDO del sitio (servicios, proyectos, clientes, FAQ,
-- valores, ajustes e imágenes).
create or replace function public.is_content_editor()
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
       and p.role in ('admin', 'coordinador', 'marketing')
       and coalesce(p.active, true)
  );
$fn$;

-- Puede gestionar CUENTAS y aprobar/rechazar JORNADAS.
create or replace function public.is_manager()
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
       and p.role in ('admin', 'coordinador')
       and coalesce(p.active, true)
  );
$fn$;

revoke all on function public.is_content_editor() from public;
revoke all on function public.is_manager()        from public;
grant execute on function public.is_content_editor() to anon, authenticated, service_role;
grant execute on function public.is_manager()        to anon, authenticated, service_role;


-- =============================================================================
-- 3. VISIBILIDAD DEL CONTENIDO — columna `published`
--    El sitio público (anon) solo ve las filas con published = true.
--    El equipo autenticado con rol de contenido ve todo (para poder editarlo).
-- =============================================================================

do $do$
declare
  t text;
begin
  foreach t in array array[
    'site_services', 'site_projects', 'site_clients', 'site_faqs', 'site_values'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists published boolean not null default true',
      t
    );
    execute format(
      'comment on column public.%I.published is %L',
      t,
      'false = oculto en el sitio público (sigue visible y editable en /admin).'
    );
  end loop;
end;
$do$;

-- 3.1 Políticas SELECT diferenciadas -----------------------------------------
-- anon             → solo published = true
-- authenticated    → todo si es editor de contenido; si no, solo lo publicado
do $do$
declare
  t text;
begin
  foreach t in array array[
    'site_services', 'site_projects', 'site_clients', 'site_faqs', 'site_values'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_public', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_auth', t);

    execute format(
      'create policy %I on public.%I for select to anon using (published)',
      t || '_select_anon', t
    );
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (published or public.is_content_editor())',
      t || '_select_auth', t
    );
  end loop;
end;
$do$;

-- `site_settings` no tiene published: su lectura sigue siendo pública porque
-- guarda contacto, hero, etc. (todo dato que el sitio muestra de todos modos).
drop policy if exists site_settings_select_public on public.site_settings;
create policy site_settings_select_public on public.site_settings
  for select to anon, authenticated using (true);

-- 3.2 Escritura: de is_admin() a is_content_editor() -------------------------
do $do$
declare
  t text;
begin
  foreach t in array array[
    'site_services', 'site_projects', 'site_clients',
    'site_faqs', 'site_values', 'site_settings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_insert_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_editor', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_editor', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_editor', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (public.is_content_editor())',
      t || '_insert_editor', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.is_content_editor()) with check (public.is_content_editor())',
      t || '_update_editor', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (public.is_content_editor())',
      t || '_delete_editor', t
    );
  end loop;
end;
$do$;

-- 3.3 Storage: subir imágenes también es "editar contenido" ------------------
do $do$
begin
  drop policy if exists "site_images_admin_insert"  on storage.objects;
  drop policy if exists "site_images_admin_update"  on storage.objects;
  drop policy if exists "site_images_admin_delete"  on storage.objects;
  drop policy if exists "site_images_editor_insert" on storage.objects;
  drop policy if exists "site_images_editor_update" on storage.objects;
  drop policy if exists "site_images_editor_delete" on storage.objects;

  create policy "site_images_editor_insert" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'site-images' and public.is_content_editor());

  create policy "site_images_editor_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'site-images' and public.is_content_editor())
    with check (bucket_id = 'site-images' and public.is_content_editor());

  create policy "site_images_editor_delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'site-images' and public.is_content_editor());
exception
  when others then
    raise notice 'No se pudieron actualizar las políticas del bucket site-images (%). Revíselas en Dashboard → Storage → Policies.', sqlerrm;
end;
$do$;


-- =============================================================================
-- 4. POLÍTICAS DE `profiles` PARA MANAGERS
--    Un empleado solo ve su propia fila; los managers (admin/coordinador)
--    gestionan todas las cuentas desde /admin/empleados.
--    Nota: la regla "un coordinador no gestiona administradores" se valida en
--    el servidor (src/app/admin/empleados/actions.ts), porque la creación y el
--    borrado de cuentas pasan por la Auth Admin API (service role).
-- =============================================================================

drop policy if exists profiles_select_own      on public.profiles;
drop policy if exists profiles_select_admin    on public.profiles;
drop policy if exists profiles_insert_admin    on public.profiles;
drop policy if exists profiles_update_admin    on public.profiles;
drop policy if exists profiles_delete_admin    on public.profiles;
drop policy if exists profiles_select_manager  on public.profiles;
drop policy if exists profiles_insert_manager  on public.profiles;
drop policy if exists profiles_update_manager  on public.profiles;
drop policy if exists profiles_delete_manager  on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_select_manager on public.profiles
  for select to authenticated using (public.is_manager());

create policy profiles_insert_manager on public.profiles
  for insert to authenticated with check (public.is_manager());

create policy profiles_update_manager on public.profiles
  for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy profiles_delete_manager on public.profiles
  for delete to authenticated using (public.is_manager());


-- =============================================================================
-- 5. TABLA `jornadas` — registro de la jornada laboral / horas extra
--    Sustituye al Google Form: orden de trabajo, día, hora de inicio y fin,
--    descripción y observaciones, con flujo de aprobación.
--
--    start_at / end_at son timestamptz: permiten que el turno cruce la
--    medianoche (end_at puede caer en el día siguiente a work_date).
-- =============================================================================

create table if not exists public.jornadas (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.profiles (id) on delete cascade,
  work_order   text not null,                      -- número de orden de trabajo
  work_date    date not null,                      -- día laboral al que pertenece
  start_at     timestamptz not null,               -- inicio real del turno
  end_at       timestamptz not null,               -- fin real (puede ser +1 día)
  description  text not null,                      -- descripción de la labor
  observations text,                               -- observaciones (opcional)
  status       text not null default 'pendiente'
               check (status in ('pendiente', 'aprobada', 'rechazada')),
  review_note  text,                               -- nota del revisor
  reviewed_by  uuid references public.profiles (id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint jornadas_end_after_start check (end_at > start_at)
);

comment on table public.jornadas is
  'Jornadas laborales registradas por los empleados de GPI (base del cálculo de horas extra).';

create index if not exists jornadas_employee_id_idx on public.jornadas (employee_id);
create index if not exists jornadas_work_date_idx   on public.jornadas (work_date desc);
create index if not exists jornadas_status_idx      on public.jornadas (status);

drop trigger if exists jornadas_set_updated_at on public.jornadas;
create trigger jornadas_set_updated_at
  before update on public.jornadas
  for each row execute function public.set_updated_at();


-- 5.1 RLS de jornadas ---------------------------------------------------------
--   · El empleado inserta y lee las suyas.
--   · El empleado edita/elimina SOLO las suyas en estado 'pendiente'
--     (una vez aprobada o rechazada queda congelada).
--   · Los managers leen todas y pueden actualizar (aprobar/rechazar).
--   · anon: sin acceso de ningún tipo.
alter table public.jornadas enable row level security;

drop policy if exists jornadas_select_own       on public.jornadas;
drop policy if exists jornadas_select_manager   on public.jornadas;
drop policy if exists jornadas_insert_own       on public.jornadas;
drop policy if exists jornadas_update_own       on public.jornadas;
drop policy if exists jornadas_update_manager   on public.jornadas;
drop policy if exists jornadas_delete_own       on public.jornadas;
drop policy if exists jornadas_delete_manager   on public.jornadas;

create policy jornadas_select_own on public.jornadas
  for select to authenticated using (employee_id = auth.uid());

create policy jornadas_select_manager on public.jornadas
  for select to authenticated using (public.is_manager());

create policy jornadas_insert_own on public.jornadas
  for insert to authenticated
  with check (
    employee_id = auth.uid()
    and status = 'pendiente'
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and coalesce(p.active, true)
    )
  );

create policy jornadas_update_own on public.jornadas
  for update to authenticated
  using (employee_id = auth.uid() and status = 'pendiente')
  with check (employee_id = auth.uid() and status = 'pendiente');

create policy jornadas_update_manager on public.jornadas
  for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy jornadas_delete_own on public.jornadas
  for delete to authenticated
  using (employee_id = auth.uid() and status = 'pendiente');

create policy jornadas_delete_manager on public.jornadas
  for delete to authenticated using (public.is_manager());

grant select, insert, update, delete on public.jornadas to authenticated;


-- =============================================================================
-- 6. AJUSTES NUEVOS EN `site_settings`
-- =============================================================================

-- 6.1 'visibility' — interruptores de secciones del sitio --------------------
--   valuesSection  → bloque "Nuestros valores" (inicio y Nosotros)
--   clientsSection → banda de logos de clientes (inicio)
--   videoSection   → video corporativo de YouTube (Nosotros)
--   faqSection     → preguntas frecuentes (Nosotros, incl. marcado FAQPage)
insert into public.site_settings (key, value) values
(
  'visibility',
  '{
    "valuesSection": true,
    "clientsSection": true,
    "videoSection": true,
    "faqSection": true
  }'::jsonb
)
on conflict (key) do nothing;

-- 6.2 'jornada_config' — parámetros de cálculo de horas y recargos ------------
--
--   OJO: estos valores son AJUSTABLES y están puestos como punto de partida
--   siguiendo la normativa laboral colombiana vigente en 2026 (jornada
--   ordinaria de 8 h, recargo nocturno desde las 7:00 p. m. tras la reducción
--   de la Ley 2101 de 2021, y los recargos del Código Sustantivo del Trabajo
--   con el dominical del 80% de la Ley 2466 de 2025).
--   GPI debe CONFIRMAR sus propias reglas (topes, tratamiento de festivos,
--   horario base de la empresa) y entonces se editan aquí o desde el panel.
--
--   jornadaOrdinariaInicio / Fin → horario base de oficina de GPI (referencia)
--   horasOrdinariasDia           → horas antes de que empiecen a contar extras
--   inicioNocturno / finNocturno → franja nocturna (cruza la medianoche)
--   recargos                     → factores ADICIONALES sobre la hora ordinaria
insert into public.site_settings (key, value) values
(
  'jornada_config',
  '{
    "jornadaOrdinariaInicio": "07:00",
    "jornadaOrdinariaFin": "17:00",
    "horasOrdinariasDia": 8,
    "inicioNocturno": "19:00",
    "finNocturno": "06:00",
    "recargos": {
      "extraDiurna": 0.25,
      "extraNocturna": 0.75,
      "nocturno": 0.35,
      "dominicalFestivo": 0.80,
      "extraDominicalDiurna": 1.05,
      "extraDominicalNocturna": 1.55
    }
  }'::jsonb
)
on conflict (key) do nothing;


-- =============================================================================
-- 7. PERMISOS DE ESQUEMA (Supabase ya los concede; se repiten por seguridad)
-- =============================================================================

grant usage on schema public to anon, authenticated;
grant select on public.site_services, public.site_projects, public.site_clients,
                public.site_faqs, public.site_values, public.site_settings
  to anon, authenticated;
grant insert, update, delete on public.site_services, public.site_projects,
                public.site_clients, public.site_faqs, public.site_values,
                public.site_settings
  to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;


-- =============================================================================
-- 8. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_admins int;
begin
  select count(*) into v_admins from public.profiles where role = 'admin';
  raise notice 'Migración 0002 aplicada. Administradores activos: %. Recuerde configurar SUPABASE_SERVICE_ROLE_KEY en .env.local y en Vercel para poder crear cuentas desde /admin/empleados.', v_admins;
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
