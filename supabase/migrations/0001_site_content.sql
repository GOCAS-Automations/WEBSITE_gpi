-- =============================================================================
-- GPI — Migración 0001: contenido del sitio, credenciales y almacenamiento
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- CÓMO APLICAR:
--   1. Abra el Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise la pestaña de resultados: al final se imprime un NOTICE con el
--      estado de la creación del usuario administrador.
--
-- -----------------------------------------------------------------------------
-- CREDENCIALES INICIALES DEL ADMINISTRADOR
--   Correo:      admin@gpiprofesionales.com
--   Contraseña:  Kt7#mQx4-Rv9zBp2
--   (Cámbiela después del primer ingreso: Dashboard → Authentication → Users →
--    ... → Reset password / Update user.)
-- -----------------------------------------------------------------------------
--
-- PLAN B (si el bloque 8 falla en su versión de Supabase):
--   Cree el usuario a mano en Dashboard → Authentication → Users → "Add user"
--   con el correo y la contraseña de arriba y marcando "Auto Confirm User".
--   El trigger `on_auth_user_created` creará el profile con role 'employee';
--   luego ejecute únicamente:
--       update public.profiles set role = 'admin'
--        where email = 'admin@gpiprofesionales.com';
--
-- Esta migración es idempotente: se puede volver a ejecutar sin duplicar datos.
-- =============================================================================

set search_path = public, extensions;

-- pgcrypto aporta crypt()/gen_salt() para el hash de la contraseña del admin.
-- En Supabase suele venir instalado en el esquema `extensions`; si ya existe en
-- otro esquema, este bloque no hace nada.
do $do$
begin
  create extension if not exists pgcrypto with schema extensions;
exception
  when others then
    raise notice 'pgcrypto ya estaba disponible o no se pudo instalar (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 1. UTILIDADES COMUNES
-- =============================================================================

-- Mantiene actualizado el campo updated_at en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;


-- =============================================================================
-- 2. CREDENCIALES: tabla `profiles` (extensión de auth.users)
--    Cada usuario de Supabase Auth tiene aquí su rol.
--    - 'admin'    → puede editar el contenido del sitio desde /admin
--    - 'employee' → reservado para la Fase 2 (registro de horas extra)
-- =============================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'employee'
             check (role in ('admin', 'employee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfiles y roles de los usuarios del portal GPI (tabla de credenciales).';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea automáticamente el profile cuando se registra un usuario en auth.users.
-- Toma full_name y role de raw_user_meta_data si vienen; si no, role='employee'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'employee');
  if v_role not in ('admin', 'employee') then
    v_role := 'employee';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    v_role
  )
  on conflict (id) do update
    set email     = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$fn$;

-- El trigger vive en `auth.users`; si su rol no tuviera permiso para crearlo,
-- la migración continúa y solo habrá que crear los profiles a mano.
do $do$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception
  when others then
    raise notice 'No se pudo crear el trigger on_auth_user_created (%). Tras crear un usuario en Authentication, inserte su fila en public.profiles manualmente.', sqlerrm;
end;
$do$;

-- Helper usado por todas las políticas de escritura.
-- SECURITY DEFINER: se ejecuta como el dueño de la tabla (postgres), por lo que
-- no dispara recursión con las políticas RLS de `profiles`.
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
  );
$fn$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;


-- =============================================================================
-- 3. TABLAS DE CONTENIDO (prefijo site_)
--    Los campos de imagen aceptan tanto rutas locales ('/images/...') como
--    URLs absolutas del bucket de Supabase Storage.
-- =============================================================================

-- 3.1 Servicios --------------------------------------------------------------
create table if not exists public.site_services (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  category         text not null check (category in ('industrial', 'ambiental')),
  title            text not null,
  nav_title        text,
  icon_key         text not null default 'cog',
  summary          text,          -- frase corta para las tarjetas (excerpt)
  description      text,          -- párrafo de introducción de la página
  items            jsonb not null default '[]'::jsonb,  -- ["ítem 1", "ítem 2"]
  images           jsonb not null default '{}'::jsonb,  -- {cover, coverAlt, gallery:[{src,alt}]}
  meta_title       text,
  meta_description text,
  sort             integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.site_services.images is
  'JSON: { "cover": "...", "coverAlt": "...", "gallery": [{ "src": "...", "alt": "..." }] }';

-- 3.2 Proyectos --------------------------------------------------------------
create table if not exists public.site_projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  client      text,
  category    text not null default 'industrial'
              check (category in ('industrial', 'ambiental')),
  description text,
  image_url   text,
  image_alt   text,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3.3 Clientes / logos -------------------------------------------------------
create table if not exists public.site_clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  logo_url   text,
  website    text,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.4 Preguntas frecuentes ---------------------------------------------------
create table if not exists public.site_faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.5 Valores corporativos ---------------------------------------------------
create table if not exists public.site_values (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  icon_key    text not null default 'shield',
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3.6 Ajustes generales (clave → JSON) ---------------------------------------
-- Claves usadas por el sitio:
--   'contact'    → dirección, teléfonos, correos, redes (incl. YouTube),
--                  mapEmbedUrl, horario, geo, siteUrl
--   'hero'       → textos e imagen del hero de la home
--   'excellence' → banda de estadísticas + mensaje EXCELENCIA
--   'youtube'    → video corporativo mostrado en /nosotros
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Triggers de updated_at para todas las tablas de contenido.
do $do$
declare
  t text;
begin
  foreach t in array array[
    'site_services', 'site_projects', 'site_clients',
    'site_faqs', 'site_values', 'site_settings'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$do$;


-- =============================================================================
-- 4. ROW LEVEL SECURITY
--    Lectura pública (anon + authenticated) en todas las tablas site_*.
--    Escritura únicamente para usuarios autenticados con role = 'admin'.
-- =============================================================================

alter table public.profiles      enable row level security;
alter table public.site_services enable row level security;
alter table public.site_projects enable row level security;
alter table public.site_clients  enable row level security;
alter table public.site_faqs     enable row level security;
alter table public.site_values   enable row level security;
alter table public.site_settings enable row level security;

-- 4.1 Políticas de las tablas de contenido (generadas en bucle) --------------
do $do$
declare
  t text;
begin
  foreach t in array array[
    'site_services', 'site_projects', 'site_clients',
    'site_faqs', 'site_values', 'site_settings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_public', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_admin', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_admin', t);

    -- Lectura pública: el sitio consulta con la clave anon.
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_select_public', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_admin())',
      t || '_insert_admin', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.is_admin()) with check (public.is_admin())',
      t || '_update_admin', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
      t || '_delete_admin', t
    );
  end loop;
end;
$do$;

-- 4.2 Políticas de `profiles` -----------------------------------------------
-- Cada usuario lee SOLO su propia fila; los admins leen y gestionan todas.
-- Nadie puede editar su propio rol: la escritura está reservada a los admins,
-- lo que evita que un empleado se auto-promueva a administrador.
drop policy if exists profiles_select_own    on public.profiles;
drop policy if exists profiles_select_admin  on public.profiles;
drop policy if exists profiles_update_own    on public.profiles;
drop policy if exists profiles_insert_admin  on public.profiles;
drop policy if exists profiles_update_admin  on public.profiles;
drop policy if exists profiles_delete_admin  on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());

create policy profiles_insert_admin on public.profiles
  for insert to authenticated with check (public.is_admin());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy profiles_delete_admin on public.profiles
  for delete to authenticated using (public.is_admin());


-- =============================================================================
-- 5. STORAGE — bucket público `site-images`
--    Lectura anónima; subida/actualización/borrado solo para admins.
-- =============================================================================

do $do$
begin
  insert into storage.buckets (id, name, public)
  values ('site-images', 'site-images', true)
  on conflict (id) do update set public = true;

  drop policy if exists "site_images_public_read"  on storage.objects;
  drop policy if exists "site_images_admin_insert" on storage.objects;
  drop policy if exists "site_images_admin_update" on storage.objects;
  drop policy if exists "site_images_admin_delete" on storage.objects;

  create policy "site_images_public_read" on storage.objects
    for select to anon, authenticated
    using (bucket_id = 'site-images');

  create policy "site_images_admin_insert" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'site-images' and public.is_admin());

  create policy "site_images_admin_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'site-images' and public.is_admin())
    with check (bucket_id = 'site-images' and public.is_admin());

  create policy "site_images_admin_delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'site-images' and public.is_admin());
exception
  when others then
    raise notice 'No se pudo configurar el bucket o sus políticas (%). Créelo manualmente en Dashboard → Storage → New bucket → "site-images" (público) y añada las políticas allí.', sqlerrm;
end;
$do$;


-- =============================================================================
-- 6. SEED — contenido actual del sitio (src/data/*)
--    Se puede volver a ejecutar: usa ON CONFLICT / WHERE NOT EXISTS.
-- =============================================================================

-- 6.1 Servicios industriales -------------------------------------------------
insert into public.site_services
  (slug, category, title, nav_title, icon_key, summary, description, items, images, meta_title, meta_description, sort)
values
(
  'automatizacion-y-control', 'industrial',
  'Automatización y Control', 'Automatización y Control', 'chip',
  'Estrategias de automatización que mejoran la eficiencia de los procesos y los rentabilizan.',
  'Generación de estrategias automáticas que permiten mejorar la eficiencia de los procesos, además de rentabilizarlos.',
  '[
    "Ingeniería básica y de detalle, levantamiento de información, diseño de arquitectura de control, selección de equipos acorde a la necesidad y presupuesto del cliente, y presentación ejecutiva.",
    "Migración de controladores lógicos programables (PLC), variadores de velocidad, servo drives, servomotores, sistemas basados en PC, interfaces hombre-máquina (HMI) y redes de comunicación.",
    "Diseño, programación y puesta en marcha de sistemas de automatización bajo estándares industriales, acorde a las necesidades y presupuesto de cada cliente.",
    "Integración con sistemas de información y bases de datos.",
    "Actualización de sistemas de control con lógica cableada a PLC.",
    "Mantenimiento preventivo y correctivo.",
    "Detección de fallas y averías.",
    "Ingeniería de detalle: layout (en 3D si el cliente lo desea), planos eléctricos y unifilares, cálculos eléctricos, especificación técnica de sistemas de control y dossier con toda la información desarrollada."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/in1.jpg",
    "coverAlt": "Tablero de control y automatización industrial en operación",
    "gallery": [
      { "src": "/images/servicios/in2.jpg", "alt": "Componentes de un sistema de control industrial" },
      { "src": "/images/servicios/in3.jpg", "alt": "Instalación de equipos de automatización en planta" },
      { "src": "/images/servicios/in5.jpg", "alt": "Cableado y montaje de sistema de control" }
    ]
  }'::jsonb,
  'Automatización y Control Industrial',
  'Automatización industrial en Cali: diseño, programación y puesta en marcha de PLC, HMI y redes de control para mejorar la eficiencia y rentabilidad de sus procesos.',
  10
),
(
  'sistemas-electricos', 'industrial',
  'Sistemas Eléctricos', 'Sistemas Eléctricos', 'bolt',
  'Montaje, cableado y mantenimiento eléctrico industrial confiable y eficiente.',
  'Diseño, montaje y mantenimiento de instalaciones eléctricas industriales, con foco en la confiabilidad y la eficiencia energética de su operación.',
  '[
    "Montaje de nuevas acometidas.",
    "Análisis de energía.",
    "Corrección de energía reactiva.",
    "Cableado de maquinaria.",
    "Mantenimiento eléctrico correctivo y preventivo."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/elec1.jpg",
    "coverAlt": "Trabajos de instalación eléctrica industrial",
    "gallery": [
      { "src": "/images/servicios/elec2.jpg", "alt": "Acometida eléctrica industrial" },
      { "src": "/images/servicios/elec3.jpg", "alt": "Cableado de maquinaria industrial" },
      { "src": "/images/servicios/elec4.jpg", "alt": "Mantenimiento de tablero eléctrico" }
    ]
  }'::jsonb,
  'Sistemas Eléctricos Industriales',
  'Instalaciones eléctricas industriales en Cali: montaje de acometidas, cableado de maquinaria, corrección de energía reactiva y mantenimiento eléctrico preventivo y correctivo.',
  20
),
(
  'seguridad-de-maquinaria', 'industrial',
  'Seguridad de Maquinaria', 'Seguridad de Maquinaria', 'shield',
  'Análisis de riesgo, LOTO y guardas para proteger a su personal y sus activos.',
  'Evaluamos y adecuamos su maquinaria para proteger al personal y los activos, bajo estándares de bloqueo y etiquetado (LOTO) y control de riesgos.',
  '[
    "Análisis de riesgo.",
    "Auditoría interna LOTO.",
    "Diseño y creación de procedimientos LOTO.",
    "Diseño, construcción e instalación de guardas de seguridad de maquinaria acorde a las necesidades del proceso y del cliente.",
    "Diseño, construcción e instalación de circuitos de seguridad basados en las especificaciones funcionales generadas en la evaluación de riesgos."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/seguridad1.jpg",
    "coverAlt": "Guarda de seguridad instalada en maquinaria industrial",
    "gallery": [
      { "src": "/images/servicios/seguridad2.jpg", "alt": "Sistema de seguridad de maquinaria" },
      { "src": "/images/servicios/seguridad3.jpg", "alt": "Procedimiento de bloqueo y etiquetado LOTO" },
      { "src": "/images/servicios/seguridad4.jpg", "alt": "Circuito de seguridad en línea de producción" }
    ]
  }'::jsonb,
  'Seguridad de Maquinaria (LOTO)',
  'Seguridad de maquinaria en Cali: análisis de riesgo, auditorías y procedimientos LOTO, guardas y circuitos de seguridad para proteger a su personal y sus activos.',
  30
),
(
  'analisis-energetico', 'industrial',
  'Análisis Energético', 'Análisis Energético', 'gauge',
  'Ahorros demostrables mediante el análisis de consumos y variables de proceso.',
  'Analizamos las variables y el consumo de servicios de su planta para obtener ahorros demostrables y optimizar el costo del producto final.',
  '[
    "Análisis de las diferentes variables del proceso para la obtención de ahorros demostrables.",
    "Análisis del consumo de servicios (agua, energía, vapor, gas) frente a la producción obtenida en el mes, con foco de optimización en el costo del producto final.",
    "Creación de sistemas que permiten el monitoreo de los utilities en la planta."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/ener1.jpg",
    "coverAlt": "Medición y análisis energético en planta industrial",
    "gallery": [
      { "src": "/images/servicios/ener2.jpg", "alt": "Monitoreo de consumo de energía" },
      { "src": "/images/servicios/ener3.jpg", "alt": "Análisis de utilities de planta" },
      { "src": "/images/servicios/ener4.jpg", "alt": "Instrumentación para análisis energético" }
    ]
  }'::jsonb,
  'Análisis Energético Industrial',
  'Análisis energético en Cali: estudio de consumos de agua, energía, vapor y gas frente a la producción para lograr ahorros demostrables y reducir el costo del producto final.',
  40
),
(
  'medicion-de-variables', 'industrial',
  'Sistemas de Medición para Variables de Proceso', 'Medición de Variables', 'activity',
  'Instrumentación y medición precisa de variables de proceso con cumplimiento normativo.',
  'Selección, venta, instalación y mantenimiento de instrumentación para medir con precisión las variables de su proceso, con cumplimiento normativo.',
  '[
    "Venta de equipos de medición.",
    "Servicios de ingeniería para la selección de equipos.",
    "Mantenimiento de instrumentos.",
    "Instalación y puesta en marcha de instrumentos con cumplimiento normativo."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/ener5.jpg",
    "coverAlt": "Instrumentos de medición de variables de proceso",
    "gallery": [
      { "src": "/images/servicios/ener6.jpg", "alt": "Equipo de medición instalado en planta" },
      { "src": "/images/servicios/in6.jpg", "alt": "Instrumentación de proceso industrial" },
      { "src": "/images/servicios/in7.jpg", "alt": "Puesta en marcha de instrumentos de medición" }
    ]
  }'::jsonb,
  'Sistemas de Medición de Variables de Proceso',
  'Instrumentación industrial en Cali: venta, selección, instalación y mantenimiento de equipos de medición de variables de proceso con cumplimiento normativo.',
  50
),
(
  'gestion-del-mantenimiento', 'industrial',
  'Gestión del Mantenimiento y Proyectos', 'Gestión del Mantenimiento', 'wrench',
  'Planes y sistemas de mantenimiento que elevan la eficiencia de la producción.',
  'Estructuramos el sistema de información y los planes que llevan a la eficiencia de los procesos, e intervenimos las líneas de producción para ejecutar los planes preventivos.',
  '[
    "Estructuración del sistema de información que permite la ejecución de los planes de mantenimiento.",
    "Ejecución de planes que llevan a la eficiencia de los procesos.",
    "Mantenimiento a sistemas de producción (mecánico, eléctrico y electrónico).",
    "Intervención de líneas de producción para la ejecución de los planes preventivos."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/in8.jpg",
    "coverAlt": "Mantenimiento de sistemas de producción industrial",
    "gallery": [
      { "src": "/images/servicios/elec5.jpg", "alt": "Mantenimiento eléctrico de línea de producción" },
      { "src": "/images/servicios/seguridad5.jpg", "alt": "Intervención de maquinaria en planta" }
    ]
  }'::jsonb,
  'Gestión del Mantenimiento y Proyectos',
  'Gestión del mantenimiento industrial en Cali: estructuración de planes preventivos y correctivos e intervención de líneas de producción mecánicas, eléctricas y electrónicas.',
  60
),

-- 6.2 Servicios ambientales --------------------------------------------------
(
  'gestion-ambiental-empresarial', 'ambiental',
  'Gestión Ambiental Empresarial', 'Gestión Ambiental Empresarial', 'leaf',
  'Estrategias para reducir, mitigar y compensar los impactos ambientales de su operación.',
  'Conjunto de estrategias o actividades ejecutadas en compañías, encaminadas a la reducción, mitigación, compensación y eliminación de los impactos negativos que puedan generar al ambiente producto de su dinámica empresarial, en favor del cumplimiento normativo, la cultura y la responsabilidad ambiental.',
  '[
    "Reducción y mitigación de los impactos ambientales de la operación.",
    "Compensación y eliminación de impactos negativos sobre el ambiente.",
    "Alineación con el cumplimiento normativo ambiental.",
    "Fortalecimiento de la cultura y la responsabilidad ambiental corporativa."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/am1.jpg",
    "coverAlt": "Gestión ambiental empresarial en campo",
    "gallery": [
      { "src": "/images/servicios/am2.jpg", "alt": "Actividades de gestión ambiental en una empresa" }
    ]
  }'::jsonb,
  'Gestión Ambiental Empresarial',
  'Gestión ambiental empresarial en Cali: estrategias para reducir, mitigar y compensar los impactos ambientales de su operación y fortalecer la responsabilidad ambiental corporativa.',
  70
),
(
  'cumplimiento-legal-ambiental', 'ambiental',
  'Cumplimiento Legal Ambiental', 'Cumplimiento Legal Ambiental', 'scale',
  'Trámites, permisos y respuesta técnica ante la autoridad ambiental.',
  'Apoyamos el proceso de respuesta a través de la implementación de actividades como soporte, que llevan al cumplimiento de los requerimientos regulatorios ambientales.',
  '[
    "Acompañamiento en procesos sancionatorios ambientales.",
    "Trámite de permiso de concesión de agua subterránea y superficial.",
    "Respuesta técnica a requerimientos de la autoridad ambiental.",
    "Inscripción en plataformas de regulación legal (RUA, RESPEL, PCB''s, EIA, etc.).",
    "Programas de envase y empaque, y posconsumo de medicamentos vencidos.",
    "Caracterización de efluentes domésticos e industriales.",
    "Permisos de ocupación de cauce.",
    "Estudio de impacto ambiental.",
    "Trámite de permiso de vertimientos."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/am3.jpg",
    "coverAlt": "Trabajo técnico para cumplimiento legal ambiental",
    "gallery": [
      { "src": "/images/servicios/am4.jpg", "alt": "Caracterización de efluentes y muestreo ambiental" }
    ]
  }'::jsonb,
  'Cumplimiento Legal Ambiental',
  'Cumplimiento legal ambiental en Cali: permisos de vertimientos y concesión de agua, respuesta a la autoridad ambiental, RUA, RESPEL, estudios de impacto y procesos sancionatorios.',
  80
),
(
  'gestion-urbanistica', 'ambiental',
  'Gestión Urbanística', 'Gestión Urbanística', 'building',
  'Requisitos ambientales para licencias de construcción y proyectos de infraestructura.',
  'Acompañamiento en las estrategias de gestión y control de los requisitos ambientales asociados a proyectos de infraestructura de pequeña y gran escala.',
  '[
    "Planes de Medidas de Manejo Ambiental en obras y proyectos para la obtención de licencias de construcción.",
    "Acompañamiento en el trámite de obtención de concepto ambiental para obras, proyectos y construcciones."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/am5.jpg",
    "coverAlt": "Gestión de requisitos ambientales en proyectos de infraestructura",
    "gallery": [
      { "src": "/images/servicios/s2.jpg", "alt": "Control ambiental en obra" }
    ]
  }'::jsonb,
  'Gestión Urbanística Ambiental',
  'Gestión urbanística ambiental en Cali: Planes de Medidas de Manejo Ambiental y concepto ambiental para licencias de construcción en proyectos de infraestructura.',
  90
),
(
  'recurso-hidrico', 'ambiental',
  'Recurso Hídrico', 'Recurso Hídrico', 'droplet',
  'Formulación de proyectos y diseño u optimización de sistemas de tratamiento de agua.',
  'Experiencia en la formulación de proyectos sobre el recurso hídrico, y en el diseño y/u optimización de sistemas de tratamiento de agua, en los componentes estructural, operativo y documental.',
  '[
    "Formulación de proyectos sobre el recurso hídrico.",
    "Diseño y optimización de sistemas de tratamiento de agua.",
    "Desarrollo de los componentes estructural, operativo y documental."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/am2.jpg",
    "coverAlt": "Sistema de tratamiento y monitoreo del recurso hídrico",
    "gallery": [
      { "src": "/images/slides/2.jpg", "alt": "Medición de variables en un punto de captación de agua" }
    ]
  }'::jsonb,
  'Recurso Hídrico',
  'Recurso hídrico en Cali: formulación de proyectos y diseño u optimización de sistemas de tratamiento de agua en sus componentes estructural, operativo y documental.',
  100
),
(
  'iso-14001', 'ambiental',
  'ISO 14001:2015', 'ISO 14001:2015', 'certificate',
  'Acompañamiento y auditorías internas para certificar su sistema en ISO 14001:2015.',
  'Acompañamos a las empresas en el camino a la certificación en la Norma ISO 14001:2015; ofrecemos auditorías internas integrales en los diferentes sistemas de gestión como preparación ante los entes certificadores.',
  '[
    "Creación del grupo de trabajo para el levantamiento de información.",
    "Elaboración de los procedimientos y documentos necesarios para la certificación.",
    "Mejoras estructurales del sistema de gestión ambiental.",
    "Auditorías internas integrales como preparación ante los entes certificadores.",
    "Acompañamiento en la obtención de la certificación."
  ]'::jsonb,
  '{
    "cover": "/images/servicios/am4.jpg",
    "coverAlt": "Auditoría de sistema de gestión ambiental ISO 14001",
    "gallery": [
      { "src": "/images/servicios/am1.jpg", "alt": "Preparación documental para certificación ISO 14001" }
    ]
  }'::jsonb,
  'Certificación ISO 14001:2015',
  'ISO 14001:2015 en Cali: acompañamiento a la certificación y auditorías internas integrales de su sistema de gestión ambiental como preparación ante los entes certificadores.',
  110
)
on conflict (slug) do nothing;


-- 6.3 Proyectos realizados ---------------------------------------------------
insert into public.site_projects (title, client, category, description, image_url, image_alt, sort)
select * from (values
  ('Sistema de extracción de aire caliente — planta de emergencia', 'Clínica Farallones', 'industrial', null::text,
   '/images/proyectos/10a.jpg', 'Sistema de extracción de aire caliente instalado sobre una planta de emergencia', 10),
  ('Instalación de chiller de 30 TON', 'Laboratorios OSA', 'industrial', null,
   '/images/proyectos/11a.jpg', 'Instalación de un chiller industrial de 30 toneladas', 20),
  ('Ampliación de bodega logística', 'Laboratorios OSA', 'industrial', null,
   '/images/proyectos/12a.jpg', 'Ampliación de una bodega logística industrial', 30),
  ('Montaje de planta piloto para fabricación de vaselina', null, 'industrial', null,
   '/images/proyectos/13a.jpg', 'Planta piloto con tanques y tuberías para la fabricación de vaselina', 40)
) as v(title, client, category, description, image_url, image_alt, sort)
where not exists (select 1 from public.site_projects);


-- 6.4 Clientes ---------------------------------------------------------------
insert into public.site_clients (name, logo_url, website, sort)
select * from (values
  ('Colgas',                  '/images/portfolio/1.jpg', null::text, 10),
  ('Recuin',                  '/images/portfolio/2.jpg', null,       20),
  ('Laboratorios OSA',        '/images/portfolio/3.jpg', null,       30),
  ('Jardín Infantil Michín',  '/images/portfolio/4.jpg', null,       40),
  ('Tatiendo.com',            '/images/portfolio/5.jpg', null,       50),
  ('Primma',                  '/images/portfolio/6.jpg', null,       60)
) as v(name, logo_url, website, sort)
where not exists (select 1 from public.site_clients);


-- 6.5 Preguntas frecuentes ---------------------------------------------------
insert into public.site_faqs (question, answer, sort)
select * from (values
  ('¿Qué hace GPI?',
   'Somos una empresa de gestión estratégica y ejecución enfocada en la optimización de procesos industriales y ambientales. Adaptamos los procesos integrando diferentes disciplinas para lograr eficiencia y rentabilidad, sin exceder los límites de diseño ni de seguridad, y apoyamos a las compañías en el cumplimiento de sus requisitos internos y de la normatividad ambiental.',
   10),
  ('¿Cómo trabajan? ¿Cuál es su metodología?',
   'Trabajamos por etapas: iniciamos con un diagnóstico y levantamiento de información de su proceso; a partir de ahí construimos una propuesta técnica y económica acorde a su necesidad y presupuesto; ejecutamos la solución bajo estándares industriales; y cerramos con acompañamiento, entrega de la documentación (dossier) y seguimiento a los resultados. Todo basado en la mejora continua.',
   20),
  ('¿Dónde operan?',
   'Estamos ubicados en Cali (Cl. 33 #5-76, Comuna 4, Valle del Cauca) y atendemos proyectos en Cali y el suroccidente colombiano. Podemos coordinar proyectos en otras regiones según su alcance.',
   30),
  ('¿Qué sectores y tipos de empresa atienden?',
   'Acompañamos a empresas industriales y a organizaciones que requieren gestión ambiental: plantas de producción, laboratorios, sector salud, comercio y proyectos de infraestructura, entre otros. Nos adaptamos al modelo de negocio de cada organización para integrar sus variables de operación.',
   40),
  ('¿Cómo solicito una cotización?',
   'Puede escribirnos por WhatsApp a los números 318 434 1249 o 311 649 9038, enviar un correo a xperea@gpiprofesionales.com o ycamacho@gpiprofesionales.com, o diligenciar el formulario de la página de Contacto. Cuéntenos brevemente su necesidad y le responderemos con una propuesta.',
   50)
) as v(question, answer, sort)
where not exists (select 1 from public.site_faqs);


-- 6.6 Valores corporativos ---------------------------------------------------
insert into public.site_values (title, description, icon_key, sort)
select * from (values
  ('Compromiso',     'La rentabilidad de nuestros clientes es nuestra obligación.',                       'handshake',  10),
  ('Competitividad', 'Ejecución de altos estándares.',                                                     'trophy',     20),
  ('Seguridad',      'Con personal seguro obtenemos procesos y activos seguros.',                          'shield',     30),
  ('Pasión',         'Impresa en cada propuesta y ejecución de valor para nuestros clientes.',             'flame',      40),
  ('Constancia',     'Perseverar en la consecución de los objetivos nuestros y de los clientes.',          'trendingUp', 50),
  ('Adaptabilidad',  'Capacidad de responder adecuadamente a las exigencias de nuestros clientes.',        'shuffle',    60)
) as v(title, description, icon_key, sort)
where not exists (select 1 from public.site_values);


-- 6.7 Ajustes ----------------------------------------------------------------
insert into public.site_settings (key, value) values
(
  'contact',
  '{
    "companyName": "GPI",
    "legalName": "Grupo de Profesionales en Ingeniería GPI S.A.S",
    "tagline": "Optimización de Procesos Industriales y Ambientales",
    "address": {
      "street": "Cl. 33 #5-76",
      "area": "Comuna 4",
      "city": "Cali",
      "region": "Valle del Cauca",
      "country": "Colombia",
      "full": "Cl. 33 #5-76, Comuna 4, Cali, Valle del Cauca, Colombia"
    },
    "geo": { "latitude": 3.4699, "longitude": -76.5225 },
    "phones": [
      { "label": "318 434 1249", "intl": "573184341249" },
      { "label": "311 649 9038", "intl": "573116499038" }
    ],
    "primaryWhatsApp": "573184341249",
    "emails": [
      { "address": "xperea@gpiprofesionales.com", "person": "X. Perea" },
      { "address": "ycamacho@gpiprofesionales.com", "person": "Y. Camacho" }
    ],
    "social": {
      "facebook": "https://www.facebook.com/gpiprofesionales",
      "instagram": "https://www.instagram.com/gpiprofesionales/",
      "youtube": "https://www.youtube.com/@GPI-PROFESIONALESS.A.S"
    },
    "schedule": "Lunes a viernes, 8:00 a. m. – 5:00 p. m.",
    "mapEmbedUrl": "https://www.google.com/maps?q=GRUPO+DE+PROFESIONALES+EN+INGENIER%C3%8DA+GPI+S.A.S+Cali&output=embed&hl=es",
    "siteUrl": "https://www.gpiprofesionales.com"
  }'::jsonb
),
(
  'hero',
  '{
    "badge": "+5 años en el sector industrial-ambiental",
    "titleLead": "Optimización de",
    "titleHighlight": "procesos",
    "description": "Adaptamos los procesos a través de la integración de diferentes disciplinas, logrando eficiencia y rentabilidad sin exceder los límites de diseño y de seguridad.",
    "image": "/images/slides/1.jpg",
    "imageAlt": "Ingeniero de GPI realizando mediciones de campo con equipo especializado",
    "primaryCtaLabel": "Ver servicios",
    "primaryCtaHref": "/servicios",
    "secondaryCtaLabel": "Contáctanos",
    "secondaryCtaHref": "/contacto"
  }'::jsonb
),
(
  'excellence',
  '{
    "eyebrow": "Más de 5 años en el sector industrial-ambiental",
    "messageLead": "Trabajamos para lograr el 100% en el desempeño de nuestros clientes, siempre buscando la",
    "messageHighlight": "EXCELENCIA",
    "ctaLabel": "Ver proyectos realizados",
    "ctaHref": "/proyectos",
    "stats": [
      { "value": "+5",   "label": "años en el sector industrial-ambiental" },
      { "value": "100%", "label": "objetivo en el desempeño del cliente" },
      { "value": "11",   "label": "servicios industriales y ambientales" },
      { "value": "2",    "label": "grandes áreas: industrial y ambiental" }
    ]
  }'::jsonb
),
(
  'youtube',
  '{
    "id": "wqrzBwApBik",
    "watchUrl": "https://www.youtube.com/watch?v=wqrzBwApBik",
    "title": "Inspección con Drones 4K | Servicios Profesionales GPI para Ingeniería",
    "sectionEyebrow": "Conoce nuestro trabajo",
    "sectionTitle": "Inspección con drones para ingeniería",
    "sectionDescription": "Una muestra de nuestros servicios profesionales de inspección con drones 4K."
  }'::jsonb
)
on conflict (key) do nothing;


-- =============================================================================
-- 7. PERMISOS DE ESQUEMA
--    (Supabase ya los concede por defecto; se repiten por seguridad.)
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
-- 8. USUARIO ADMINISTRADOR INICIAL
--    Correo:     admin@gpiprofesionales.com
--    Contraseña: Kt7#mQx4-Rv9zBp2
--
--    Si este bloque falla (versiones distintas del esquema `auth`), verá un
--    NOTICE con el error: use el PLAN B descrito al inicio del archivo.
-- =============================================================================

do $do$
declare
  v_email    text := 'admin@gpiprofesionales.com';
  v_password text := 'Kt7#mQx4-Rv9zBp2';
  v_uid      uuid;
begin
  select id into v_uid from auth.users where email = v_email;

  if v_uid is not null then
    -- El usuario ya existe: solo aseguramos el rol de administrador.
    update public.profiles set role = 'admin' where id = v_uid;
    raise notice 'El usuario % ya existía. Se aseguró role=admin.', v_email;
    return;
  end if;

  v_uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_uid,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Administrador GPI', 'role', 'admin'),
    '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_uid::text,
    v_uid,
    jsonb_build_object(
      'sub', v_uid::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(), now(), now()
  );

  -- Red de seguridad por si el trigger no llegó a ejecutarse.
  insert into public.profiles (id, email, full_name, role)
  values (v_uid, v_email, 'Administrador GPI', 'admin')
  on conflict (id) do update set role = 'admin';

  raise notice 'Usuario administrador creado: % / %', v_email, v_password;
exception
  when others then
    raise notice 'No se pudo crear el usuario administrador (%). Use el PLAN B: cree el usuario desde Dashboard → Authentication → Add user y ejecute: update public.profiles set role = ''admin'' where email = ''admin@gpiprofesionales.com'';', sqlerrm;
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
