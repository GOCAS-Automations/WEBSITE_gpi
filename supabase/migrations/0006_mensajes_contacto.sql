-- =============================================================================
-- GPI — Migración 0006: mensajes del formulario de contacto
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001, 0002, 0003, 0004 y 0005.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE
-- --------
-- Crea `site_mensajes`: una copia de cada mensaje que la gente escribe en el
-- formulario de /contacto.
--
-- POR QUÉ EXISTE ESTA TABLA
-- El formulario ahora envía el correo de verdad (SMTP de Gmail, ver
-- `docs/ADMIN.md` → "Correo del formulario de contacto"). Pero un envío por
-- correo puede fallar por cosas ajenas al sitio: la contraseña de aplicación
-- de Google se vence o se revoca, Gmail corta la conexión, el correo cae en la
-- carpeta de spam de GPI… y entonces el prospecto se pierde sin que nadie se
-- entere. Guardar el mensaje ANTES de intentar el envío convierte eso en un
-- problema menor: el correo puede fallar, pero el mensaje no se pierde.
--
-- Además deja el terreno listo para una futura bandeja de mensajes en el
-- panel: por eso la tabla ya tiene la política de lectura para managers.
--
-- SEGURIDAD — LO IMPORTANTE DE ESTA MIGRACIÓN
-- La tabla tiene RLS habilitada y **una sola política: SELECT para managers**.
-- No hay política de INSERT para `anon` ni para `authenticated`, y es
-- deliberado: con una, cualquiera podría insertar filas directamente contra la
-- API REST de Supabase (la clave anon es pública por diseño) y llenar la tabla
-- de basura sin pasar por el formulario ni por los filtros anti-robot.
--
-- Las inserciones las hace el SERVIDOR con la clave `service_role`
-- (`src/lib/supabase/admin.ts`), que salta RLS por definición. Es el mismo
-- patrón que ya usa la gestión de cuentas del equipo.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. LA TABLA
-- =============================================================================

create table if not exists public.site_mensajes (
  id             uuid        primary key default gen_random_uuid(),
  nombre         text        not null,
  empresa        text,
  correo         text        not null,
  mensaje        text        not null,
  -- A qué buzón se intentó enviar (el de `site_settings.contact.correoFormulario`
  -- en el momento del envío). Se guarda porque ese correo es editable desde el
  -- panel: sin esta columna, un mensaje viejo no diría a dónde fue.
  correo_destino text,
  -- ¿El servidor SMTP aceptó el correo? `false` significa que el mensaje SOLO
  -- existe aquí y que alguien tiene que responderlo desde el panel.
  enviado        boolean     not null default false,
  created_at     timestamptz not null default now()
);

-- La bandeja se lee siempre de lo más nuevo a lo más viejo.
create index if not exists site_mensajes_created_at_idx
  on public.site_mensajes (created_at desc);

-- Para el filtro "los que no salieron por correo", que es la vista que de
-- verdad importa cuando algo falla.
create index if not exists site_mensajes_enviado_idx
  on public.site_mensajes (enviado)
  where enviado = false;

do $do$
begin
  comment on table public.site_mensajes is
    'Mensajes del formulario público de /contacto. Se insertan SOLO desde el servidor con la clave service_role; RLS únicamente permite SELECT a managers.';
  comment on column public.site_mensajes.enviado is
    'true = el SMTP aceptó el correo. false = el mensaje solo vive en esta tabla y hay que responderlo a mano.';
  comment on column public.site_mensajes.correo_destino is
    'Buzón corporativo al que se intentó enviar (site_settings.contact.correoFormulario en ese momento).';
exception
  when others then
    raise notice 'No se pudieron escribir los comentarios de site_mensajes (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 2. RLS — SOLO LECTURA, Y SOLO PARA MANAGERS
--
--    Sin política de INSERT/UPDATE/DELETE a propósito (ver la cabecera):
--    escribir aquí es privilegio exclusivo de la clave service_role, que no
--    pasa por RLS. `anon` no puede ni leer ni escribir.
-- =============================================================================

alter table public.site_mensajes enable row level security;

drop policy if exists site_mensajes_select_manager on public.site_mensajes;

create policy site_mensajes_select_manager on public.site_mensajes
  for select to authenticated using (public.is_manager());

-- `anon` no necesita ningún permiso sobre esta tabla: el formulario público
-- escribe a través del servidor, nunca desde el navegador.
revoke all on table public.site_mensajes from anon;
grant select on table public.site_mensajes to authenticated;
grant all    on table public.site_mensajes to service_role;


-- =============================================================================
-- 3. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_total    int;
  v_sin_env  int;
begin
  select count(*) into v_total   from public.site_mensajes;
  select count(*) into v_sin_env from public.site_mensajes where enviado = false;

  raise notice 'Migración 0006 aplicada. Mensajes de contacto guardados: % (sin enviar por correo: %).',
    v_total, v_sin_env;
  raise notice 'Recuerde configurar CONTACT_SMTP_USER y CONTACT_SMTP_PASS para que el formulario ENVÍE el correo además de guardarlo.';
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
