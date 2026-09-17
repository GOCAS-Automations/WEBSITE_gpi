-- =============================================================================
-- GPI — Migración 0010: calendario interno de programación
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001 … 0009.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE
-- --------
-- Crea las tres tablas del CALENDARIO INTERNO que pidió la gerencia de GPI
-- (reunión del 16 de septiembre de 2026): una agenda de trabajo donde el
-- coordinador programa actividades con fecha y hora, les asigna responsables y
-- después las cierra como cumplidas, incompletas o aplazadas, dejando notas de
-- seguimiento.
--
--   · `eventos`              — la actividad programada (qué, cuándo, en qué estado).
--   · `evento_responsables`  — quién responde por ella: cuentas del portal y/o
--                              personas externas escritas a mano.
--   · `evento_notas`         — el hilo de seguimiento de cada actividad.
--
-- QUIÉN VE QUÉ (lo importante de esta migración)
-- ----------------------------------------------
--   · Los MANAGERS (`is_manager()` = admin | coordinador, los mismos que
--     administran las jornadas) hacen TODO sobre las tres tablas.
--   · Cualquier otra cuenta ACTIVA solo ve los eventos en los que figura como
--     responsable —con sus responsables y sus notas— y puede AÑADIR notas en
--     esos eventos. No puede crear, editar ni borrar eventos.
--   · El Community Manager (rol 'marketing') NO es manager: en el calendario se
--     comporta como un empleado, ve lo que le asignen y nada más.
--   · `anon` no tiene acceso de ningún tipo: el calendario es información
--     interna, nunca sale al sitio público.
--
-- POR QUÉ `fecha_original`
-- ------------------------
-- Cuando un evento se APLAZA, su fecha cambia a la nueva, pero se guarda la
-- fecha en la que estaba programado la primera vez. Sin ese dato, mover un
-- evento borraría la historia ("¿esto no era para el martes?"), que es
-- justamente lo que la gerencia quiere poder ver.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. TABLA `eventos` — la actividad programada
-- =============================================================================

create table if not exists public.eventos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  descripcion   text,
  -- Día en que el evento está programado AHORA (si se aplazó, es la fecha nueva).
  fecha         date not null,
  hora_inicio   time not null,
  hora_fin      time not null,
  estado        text not null default 'programado'
                check (estado in ('programado', 'cumplido', 'incompleto', 'aplazado')),
  -- Fecha en la que estaba programado ANTES del primer aplazamiento.
  -- NULL = nunca se ha aplazado.
  fecha_original date,
  creado_por    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint eventos_fin_despues_inicio check (hora_fin > hora_inicio)
);

do $do$
begin
  comment on table public.eventos is
    'Calendario interno de GPI: actividades programadas con fecha, hora, responsables y estado de cumplimiento.';
  comment on column public.eventos.estado is
    'programado = pendiente por hacer · cumplido = se hizo · incompleto = se hizo a medias o no se hizo · aplazado = se movió a otra fecha y sigue abierto.';
  comment on column public.eventos.fecha is
    'Día en que el evento está programado AHORA. Si se aplazó, esta es la fecha nueva.';
  comment on column public.eventos.fecha_original is
    'Fecha en la que estaba programado antes del PRIMER aplazamiento. NULL = nunca se aplazó.';
exception
  when others then
    raise notice 'No se pudieron escribir los comentarios de eventos (%).', sqlerrm;
end;
$do$;

create index if not exists eventos_fecha_idx  on public.eventos (fecha);
create index if not exists eventos_estado_idx on public.eventos (estado);

drop trigger if exists eventos_set_updated_at on public.eventos;
create trigger eventos_set_updated_at
  before update on public.eventos
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 2. TABLA `evento_responsables` — quién responde por el evento
--
--    Cada fila es UN responsable y solo puede ser de dos clases:
--      · `profile_id`    → una cuenta del portal (el evento le aparece en
--                          /mi-cuenta y puede dejar notas);
--      · `nombre_externo`→ alguien de fuera (un contratista, el contacto del
--                          cliente…) escrito a mano. No tiene cuenta ni ve nada.
--
--    El check obliga a que venga exactamente uno de los dos.
-- =============================================================================

create table if not exists public.evento_responsables (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid not null references public.eventos (id) on delete cascade,
  profile_id     uuid references public.profiles (id) on delete cascade,
  nombre_externo text,
  created_at     timestamptz not null default now(),
  constraint evento_responsables_uno_u_otro check (
    (profile_id is not null and nombre_externo is null)
    or (profile_id is null and nombre_externo is not null and btrim(nombre_externo) <> '')
  )
);

do $do$
begin
  comment on table public.evento_responsables is
    'Responsables de un evento del calendario: cuentas del portal (profile_id) o personas externas escritas a mano (nombre_externo).';
exception
  when others then
    raise notice 'No se pudo escribir el comentario de evento_responsables (%).', sqlerrm;
end;
$do$;

create index if not exists evento_responsables_evento_idx
  on public.evento_responsables (evento_id);
create index if not exists evento_responsables_profile_idx
  on public.evento_responsables (profile_id)
  where profile_id is not null;

-- La misma persona no se asigna dos veces al mismo evento.
create unique index if not exists evento_responsables_evento_profile_key
  on public.evento_responsables (evento_id, profile_id)
  where profile_id is not null;


-- =============================================================================
-- 3. TABLA `evento_notas` — el hilo de seguimiento
-- =============================================================================

create table if not exists public.evento_notas (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references public.eventos (id) on delete cascade,
  autor_id   uuid references public.profiles (id) on delete set null,
  texto      text not null,
  created_at timestamptz not null default now()
);

do $do$
begin
  comment on table public.evento_notas is
    'Notas de seguimiento de un evento del calendario. Las escribe un manager o cualquier responsable del evento.';
exception
  when others then
    raise notice 'No se pudo escribir el comentario de evento_notas (%).', sqlerrm;
end;
$do$;

create index if not exists evento_notas_evento_idx     on public.evento_notas (evento_id);
create index if not exists evento_notas_created_at_idx on public.evento_notas (created_at desc);


-- =============================================================================
-- 4. HELPER `es_responsable_evento(uuid)`
--
--    Responde "¿el usuario de esta sesión es responsable de ese evento?".
--    Es `security definer` por la MISMA razón que `is_manager()`: si la política
--    de `eventos` consultara `evento_responsables` directamente, y la de
--    `evento_responsables` consultara `eventos`, RLS entraría en recursión.
-- =============================================================================

create or replace function public.es_responsable_evento(p_evento uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
      from public.evento_responsables r
      join public.profiles p on p.id = auth.uid()
     where r.evento_id = p_evento
       and r.profile_id = auth.uid()
       and coalesce(p.active, true)
  );
$fn$;

revoke all on function public.es_responsable_evento(uuid) from public;
grant execute on function public.es_responsable_evento(uuid)
  to anon, authenticated, service_role;


-- =============================================================================
-- 5. RLS
-- =============================================================================

alter table public.eventos              enable row level security;
alter table public.evento_responsables  enable row level security;
alter table public.evento_notas         enable row level security;

-- 5.1 `eventos` ---------------------------------------------------------------
--   SELECT : managers (todo) + responsables (solo lo suyo)
--   ESCRITURA: solo managers
drop policy if exists eventos_select_manager      on public.eventos;
drop policy if exists eventos_select_responsable  on public.eventos;
drop policy if exists eventos_insert_manager      on public.eventos;
drop policy if exists eventos_update_manager      on public.eventos;
drop policy if exists eventos_delete_manager      on public.eventos;

create policy eventos_select_manager on public.eventos
  for select to authenticated using (public.is_manager());

create policy eventos_select_responsable on public.eventos
  for select to authenticated using (public.es_responsable_evento(id));

create policy eventos_insert_manager on public.eventos
  for insert to authenticated with check (public.is_manager());

create policy eventos_update_manager on public.eventos
  for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy eventos_delete_manager on public.eventos
  for delete to authenticated using (public.is_manager());


-- 5.2 `evento_responsables` ---------------------------------------------------
--   Quien puede ver el evento ve también con quién lo comparte.
drop policy if exists evento_responsables_select_manager     on public.evento_responsables;
drop policy if exists evento_responsables_select_responsable on public.evento_responsables;
drop policy if exists evento_responsables_insert_manager     on public.evento_responsables;
drop policy if exists evento_responsables_update_manager     on public.evento_responsables;
drop policy if exists evento_responsables_delete_manager     on public.evento_responsables;

create policy evento_responsables_select_manager on public.evento_responsables
  for select to authenticated using (public.is_manager());

create policy evento_responsables_select_responsable on public.evento_responsables
  for select to authenticated using (public.es_responsable_evento(evento_id));

create policy evento_responsables_insert_manager on public.evento_responsables
  for insert to authenticated with check (public.is_manager());

create policy evento_responsables_update_manager on public.evento_responsables
  for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy evento_responsables_delete_manager on public.evento_responsables
  for delete to authenticated using (public.is_manager());


-- 5.3 `evento_notas` ----------------------------------------------------------
--   SELECT : managers + responsables del evento.
--   INSERT : managers + responsables del evento, SIEMPRE firmando con su propio
--            id (`autor_id = auth.uid()`): nadie escribe notas a nombre de otro.
--   UPDATE / DELETE: solo managers (corregir o limpiar el hilo).
drop policy if exists evento_notas_select_manager     on public.evento_notas;
drop policy if exists evento_notas_select_responsable on public.evento_notas;
drop policy if exists evento_notas_insert_autor       on public.evento_notas;
drop policy if exists evento_notas_update_manager     on public.evento_notas;
drop policy if exists evento_notas_delete_manager     on public.evento_notas;

create policy evento_notas_select_manager on public.evento_notas
  for select to authenticated using (public.is_manager());

create policy evento_notas_select_responsable on public.evento_notas
  for select to authenticated using (public.es_responsable_evento(evento_id));

create policy evento_notas_insert_autor on public.evento_notas
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and (public.is_manager() or public.es_responsable_evento(evento_id))
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and coalesce(p.active, true)
    )
  );

create policy evento_notas_update_manager on public.evento_notas
  for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy evento_notas_delete_manager on public.evento_notas
  for delete to authenticated using (public.is_manager());


-- =============================================================================
-- 6. PERMISOS DE ESQUEMA
--    `anon` no recibe NADA: el calendario es interno.
-- =============================================================================

revoke all on table public.eventos             from anon;
revoke all on table public.evento_responsables from anon;
revoke all on table public.evento_notas        from anon;

grant select, insert, update, delete on public.eventos             to authenticated;
grant select, insert, update, delete on public.evento_responsables to authenticated;
grant select, insert, update, delete on public.evento_notas        to authenticated;

grant all on public.eventos             to service_role;
grant all on public.evento_responsables to service_role;
grant all on public.evento_notas        to service_role;


-- =============================================================================
-- 7. APODO DE LAS CUENTAS — `profiles.apodo`
--
--    Nombre corto con el que se identifica a una persona donde no cabe el
--    nombre completo: las fichas de responsables del calendario, la agenda del
--    mes, la tabla de notas y las gráficas por responsable.
--    Ejemplo: «Yeison Camacho Rojas» → «YC».
--
--    QUIÉN LO CAMBIA: **solo el rol `admin`**. No el coordinador y no el
--    Community Manager. Eso se valida en la server action de /admin/empleados
--    (`src/app/admin/empleados/actions.ts`), que es donde se decide qué campos
--    se escriben: aquí no hace falta una política aparte porque la escritura de
--    `profiles` ya está limitada a `is_manager()` desde la 0002 y el servidor
--    descarta el campo si quien guarda no es administrador.
--
--    Es opcional: sin apodo, en todas partes se sigue mostrando el nombre
--    completo (`etiquetaCorta()` en `src/lib/usuarios.ts`).
-- =============================================================================

alter table public.profiles
  add column if not exists apodo text;

do $do$
begin
  comment on column public.profiles.apodo is
    'Nombre corto para calendarios y tablas (p. ej. "YC"). Opcional. Solo lo edita un administrador.';
exception
  when others then
    raise notice 'No se pudo escribir el comentario de profiles.apodo (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 8. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_eventos int;
  v_notas   int;
begin
  select count(*) into v_eventos from public.eventos;
  select count(*) into v_notas   from public.evento_notas;
  raise notice 'Migración 0010 aplicada. Eventos en el calendario: % (notas: %). Se administra en /admin/calendario (admin y coordinador); cada persona ve los suyos en Mi Cuenta.',
    v_eventos, v_notas;
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
