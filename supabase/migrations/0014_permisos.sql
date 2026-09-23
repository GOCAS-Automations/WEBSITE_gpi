-- =============================================================================
-- GPI — Migración 0014: permisos de falta y faltas registradas
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001 … 0013.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE
-- --------
-- Lleva al sistema el formato en papel «SOLICITUD DE PERMISO» (código XP C2
-- C91) que GPI diligencia hoy a mano, con los mismos campos: nombre, cédula,
-- fecha de diligenciamiento, cargo, motivo, fecha del permiso, si aporta
-- soporte, si se pide REMUNERADO, reemplazo, observaciones y las dos firmas
-- (que aquí son la cuenta que solicita y la que aprueba).
--
--   · `permisos` — una solicitud (o una falta que registra directamente un
--     manager). Un permiso es de DÍA COMPLETO —uno o varios días seguidos— o
--     de HORAS —un tramo de un solo día—.
--   · Bucket PRIVADO `permisos-soportes` — la incapacidad, la citación médica
--     o el documento que respalde el permiso. Es un dato de salud y personal:
--     no puede vivir en `site-images`, que es público y cualquiera con la URL
--     leería. Se sube desde el SERVIDOR con la clave de servicio y se descarga
--     por un route handler que comprueba la sesión y devuelve una URL FIRMADA
--     de corta duración.
--
-- POR QUÉ DOS COLUMNAS PARA «REMUNERADO»
-- --------------------------------------
-- El formato en papel tiene una casilla «PERMISO REMUNERADO SI / NO» que en la
-- práctica cumple dos papeles: lo que PIDE el colaborador y lo que DECIDE el
-- aprobador. Separarlas (`remunerado_solicitado` y `remunerado`) deja
-- constancia de las dos cosas y evita la discusión de «yo pedí que fuera
-- remunerado». Mientras el permiso está pendiente, `remunerado` es NULL: nadie
-- ha decidido todavía. Manda siempre el aprobador.
--
-- QUÉ DESCUENTA EN LA NÓMINA
-- --------------------------
-- Solo un permiso APROBADO y NO remunerado descuenta. Un día completo descuenta
-- ese día Y el domingo de esa semana (art. 173 del CST: se pierde el descanso
-- dominical remunerado), una sola vez por semana. Un permiso por horas
-- descuenta la proporción de la jornada programada de ese día y NO arrastra el
-- domingo. El cálculo vive en `src/lib/permisos.ts` y `src/lib/nomina.ts`
-- (módulos puros): la base de datos solo guarda los hechos.
--
-- QUIÉN VE QUÉ
-- ------------
--   · Cualquier cuenta ACTIVA crea y ve LAS SUYAS, y las corrige o anula
--     mientras sigan `pendiente`. Nunca puede aprobarse nada a sí misma: la
--     política de escritura propia exige que el permiso siga en `pendiente`.
--   · MANAGERS (`is_manager()` = admin | coordinador, igual que las jornadas):
--     ven todas, aprueban, rechazan y registran faltas de cualquier persona.
--   · `anon` no tiene nada.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. TABLA `permisos`
-- =============================================================================

create table if not exists public.permisos (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.profiles (id) on delete cascade,

  -- 'dia'   = uno o varios días completos (fecha_inicio … fecha_fin).
  -- 'horas' = un tramo de UN solo día (fecha_inicio = fecha_fin).
  tipo          text not null default 'dia' check (tipo in ('dia', 'horas')),
  fecha_inicio  date not null,
  fecha_fin     date not null,
  hora_inicio   time,
  hora_fin      time,

  motivo        text not null,
  reemplazo     text,
  observaciones text,

  -- Ruta dentro del bucket PRIVADO `permisos-soportes`
  -- (`permisos/<employee_id>/<permiso_id>/<archivo>`). NULL = no aportó soporte.
  soporte_path   text,
  -- Nombre original del archivo, solo para enseñarlo en pantalla.
  soporte_nombre text,

  -- Lo que PIDE el colaborador y lo que DECIDE el aprobador (NULL = sin decidir).
  remunerado_solicitado boolean not null default false,
  remunerado            boolean,

  estado       text not null default 'pendiente'
                 check (estado in ('pendiente', 'aprobado', 'rechazado')),
  nota_revision text,
  revisado_por  uuid references public.profiles (id) on delete set null,
  revisado_at   timestamptz,

  -- 'solicitud'      = la pidió el colaborador desde su Mi Cuenta.
  -- 'registro_admin' = la registró un manager (nace aprobada y no remunerada).
  origen     text not null default 'solicitud'
               check (origen in ('solicitud', 'registro_admin')),
  creado_por uuid references public.profiles (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint permisos_motivo_no_vacio check (length(btrim(motivo)) > 0),
  constraint permisos_rango_fechas    check (fecha_fin >= fecha_inicio),

  -- Un permiso por HORAS es de un solo día y lleva sus dos horas, con fin >
  -- inicio. Uno de DÍA completo no lleva horas.
  constraint permisos_horas_coherentes check (
    (tipo = 'horas'
       and fecha_fin = fecha_inicio
       and hora_inicio is not null
       and hora_fin is not null
       and hora_fin > hora_inicio)
    or
    (tipo = 'dia'
       and hora_inicio is null
       and hora_fin is null)
  ),

  -- Mientras está pendiente nadie ha decidido si se paga; al aprobarlo, sí.
  constraint permisos_remunerado_coherente check (
    (estado = 'pendiente' and remunerado is null)
    or (estado = 'aprobado' and remunerado is not null)
    or estado = 'rechazado'
  )
);

do $do$
begin
  comment on table public.permisos is
    'Solicitudes de permiso y faltas registradas. Versión digital del formato en papel «SOLICITUD DE PERMISO» (XP C2 C91). Un permiso aprobado y NO remunerado descuenta en la nómina.';
  comment on column public.permisos.tipo is
    'dia = uno o varios días completos · horas = un tramo de un solo día.';
  comment on column public.permisos.remunerado_solicitado is
    'Lo que PIDE el colaborador en su solicitud. No decide nada: manda el aprobador.';
  comment on column public.permisos.remunerado is
    'La DECISIÓN del aprobador. NULL mientras el permiso siga pendiente. false = descuenta en la nómina.';
  comment on column public.permisos.soporte_path is
    'Ruta en el bucket PRIVADO permisos-soportes (permisos/<employee_id>/<permiso_id>/<archivo>). Se descarga con una URL firmada de corta duración.';
  comment on column public.permisos.origen is
    'solicitud = la pidió el colaborador · registro_admin = la registró un manager (nace aprobada y no remunerada).';
exception
  when others then
    raise notice 'No se pudieron escribir los comentarios de permisos (%).', sqlerrm;
end;
$do$;

create index if not exists permisos_empleado_idx on public.permisos (employee_id);
create index if not exists permisos_fechas_idx   on public.permisos (fecha_inicio, fecha_fin);
create index if not exists permisos_estado_idx   on public.permisos (estado);

drop trigger if exists permisos_set_updated_at on public.permisos;
create trigger permisos_set_updated_at
  before update on public.permisos
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 2. RLS DE `permisos`
--    Lo propio: cualquier cuenta ACTIVA. Todo: los managers.
-- =============================================================================

alter table public.permisos enable row level security;

drop policy if exists permisos_select_propio  on public.permisos;
drop policy if exists permisos_select_manager on public.permisos;
drop policy if exists permisos_insert_propio  on public.permisos;
drop policy if exists permisos_insert_manager on public.permisos;
drop policy if exists permisos_update_propio  on public.permisos;
drop policy if exists permisos_update_manager on public.permisos;
drop policy if exists permisos_delete_propio  on public.permisos;
drop policy if exists permisos_delete_manager on public.permisos;

-- 2.1 Lo propio ---------------------------------------------------------------
create policy permisos_select_propio on public.permisos
  for select to authenticated
  using (
    employee_id = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and coalesce(p.active, true)
    )
  );

-- Crear la SUYA: siempre pendiente, siempre como solicitud y sin decidir el
-- pago. Aunque manipule el formulario no puede nacer aprobada.
create policy permisos_insert_propio on public.permisos
  for insert to authenticated
  with check (
    employee_id = auth.uid()
    and estado = 'pendiente'
    and origen = 'solicitud'
    and remunerado is null
    and revisado_por is null
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and coalesce(p.active, true)
    )
  );

-- Corregir la suya SOLO mientras siga pendiente, y que siga pendiente después.
create policy permisos_update_propio on public.permisos
  for update to authenticated
  using (employee_id = auth.uid() and estado = 'pendiente')
  with check (
    employee_id = auth.uid()
    and estado = 'pendiente'
    and remunerado is null
    and revisado_por is null
  );

-- Anular la suya mientras siga pendiente.
create policy permisos_delete_propio on public.permisos
  for delete to authenticated
  using (employee_id = auth.uid() and estado = 'pendiente');

-- 2.2 Managers (admin | coordinador), igual que las jornadas ------------------
create policy permisos_select_manager on public.permisos
  for select to authenticated using (public.is_manager());

create policy permisos_insert_manager on public.permisos
  for insert to authenticated with check (public.is_manager());

create policy permisos_update_manager on public.permisos
  for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy permisos_delete_manager on public.permisos
  for delete to authenticated using (public.is_manager());

revoke all on table public.permisos from anon;
grant select, insert, update, delete on public.permisos to authenticated;
grant all on public.permisos to service_role;


-- =============================================================================
-- 3. BUCKET PRIVADO `permisos-soportes`
--
--    NO es `site-images`: aquel es PÚBLICO y cualquiera con la URL leería una
--    incapacidad médica. Este es privado, con tope de 5 MB y solo PDF, JPG y
--    PNG. La aplicación sube con la clave de SERVICIO desde una server action
--    (nunca desde el navegador) y descarga con una URL FIRMADA de 60 s que
--    emite un route handler tras comprobar la sesión. Estas políticas son la
--    segunda barrera, por si algún día se leyera con la sesión del usuario.
-- =============================================================================

do $do$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'permisos-soportes',
    'permisos-soportes',
    false,
    5242880,
    array['application/pdf', 'image/jpeg', 'image/png']
  )
  on conflict (id) do update
    set public             = false,
        file_size_limit    = 5242880,
        allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

  drop policy if exists "permisos_soportes_select_propio"  on storage.objects;
  drop policy if exists "permisos_soportes_select_manager" on storage.objects;
  drop policy if exists "permisos_soportes_write_manager"  on storage.objects;
  drop policy if exists "permisos_soportes_update_manager" on storage.objects;
  drop policy if exists "permisos_soportes_delete_manager" on storage.objects;

  -- Cada quien SOLO su carpeta: permisos/<su uuid>/<permiso>/<archivo>.
  create policy "permisos_soportes_select_propio" on storage.objects
    for select to authenticated
    using (
      bucket_id = 'permisos-soportes'
      and (storage.foldername(name))[1] = 'permisos'
      and (storage.foldername(name))[2] = auth.uid()::text
    );

  create policy "permisos_soportes_select_manager" on storage.objects
    for select to authenticated
    using (bucket_id = 'permisos-soportes' and public.is_manager());

  create policy "permisos_soportes_write_manager" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'permisos-soportes' and public.is_manager());

  create policy "permisos_soportes_update_manager" on storage.objects
    for update to authenticated
    using (bucket_id = 'permisos-soportes' and public.is_manager())
    with check (bucket_id = 'permisos-soportes' and public.is_manager());

  create policy "permisos_soportes_delete_manager" on storage.objects
    for delete to authenticated
    using (bucket_id = 'permisos-soportes' and public.is_manager());
exception
  when others then
    raise notice 'No se pudo crear el bucket permisos-soportes o sus políticas (%). Créelo a mano en Dashboard → Storage → New bucket → "permisos-soportes" (PRIVADO).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 4. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_tabla   boolean;
  v_bucket  boolean;
  v_pol     int;
begin
  select to_regclass('public.permisos') is not null into v_tabla;
  select exists (select 1 from storage.buckets where id = 'permisos-soportes' and public = false)
    into v_bucket;
  select count(*) into v_pol from pg_policies
   where schemaname = 'public' and tablename = 'permisos';

  raise notice 'Migración 0014 aplicada. Tabla permisos: % · políticas: % · bucket privado permisos-soportes: %. Los permisos se solicitan en /mi-cuenta?seccion=permisos y se aprueban en /admin/jornadas?vista=permisos.',
    v_tabla, v_pol, v_bucket;
end;
$do$;

notify pgrst, 'reload schema';

-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
