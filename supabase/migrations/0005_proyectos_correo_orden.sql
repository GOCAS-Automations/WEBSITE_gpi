-- =============================================================================
-- GPI — Migración 0005: complementos post-aprobación
--                       (correo del formulario · proyectos con página propia ·
--                        orden de trabajo opcional)
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001, 0002, 0003 y 0004.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE (tres cosas pedidas por GPI después de aprobar el sitio):
--
--   1. CORREO DEL FORMULARIO DE CONTACTO
--      Añade la clave `correoFormulario` al JSON de `site_settings.contact`
--      con el valor inicial 'gpi.gerencia1@gmail.com'. Es el buzón al que llega
--      lo que la gente escribe en el formulario de /contacto, y se cambia desde
--      el panel (Contacto y ajustes → Datos de contacto).
--      NO toca ninguna otra clave del objeto: si GPI ya editó teléfonos,
--      correos o dirección desde el panel, todo eso se conserva. Y si la clave
--      ya existe (porque la cambiaron antes de aplicar esta migración), se
--      RESPETA su valor.
--
--   2. PROYECTOS CON PÁGINA PROPIA
--      `site_projects` gana `slug` (URL única), `gallery` (fotos adicionales) y
--      `details` (descripción larga opcional). Cada proyecto pasa a tener su
--      página en /proyectos/<slug>, igual que los servicios.
--      Los slugs de las filas ya existentes se generan desde el título, sin
--      tildes y en minúsculas; los cuatro proyectos sembrados por la 0001 se
--      fijan a mano para que queden cortos y legibles.
--
--   3. ORDEN DE TRABAJO OPCIONAL
--      `jornadas.work_order` deja de ser obligatoria: hay labores que no tienen
--      una orden de trabajo asociada y el empleado ya no queda bloqueado.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada ni pisar lo que
-- el equipo haya editado desde el panel.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. CORREO AL QUE LLEGA EL FORMULARIO DE CONTACTO
--
--    `||` sobre jsonb hace merge de primer nivel: `value || '{"a":1}'` deja
--    intactas todas las demás claves del objeto (teléfonos, correos, dirección,
--    redes…). El `where` es lo que protege lo ya editado: solo se escribe si la
--    clave NO existe o está en blanco, así que un correo que GPI haya cambiado
--    desde el panel nunca se pisa.
-- =============================================================================

do $do$
declare
  v_correo text := 'gpi.gerencia1@gmail.com';
  v_filas  int;
begin
  update public.site_settings
     set value = value || jsonb_build_object('correoFormulario', v_correo)
   where key = 'contact'
     and (
       value->>'correoFormulario' is null
       or btrim(value->>'correoFormulario') = ''
     );

  get diagnostics v_filas = row_count;

  -- Si la fila 'contact' no existe (proyecto recién creado sin la 6.7 de la
  -- 0001), se crea con lo mínimo para que el panel tenga dónde guardar.
  if not exists (select 1 from public.site_settings where key = 'contact') then
    insert into public.site_settings (key, value)
    values ('contact', jsonb_build_object('correoFormulario', v_correo))
    on conflict (key) do nothing;
    raise notice 'No había ajustes de contacto: se creó la clave con correoFormulario = %.', v_correo;
  elsif v_filas > 0 then
    raise notice 'Correo del formulario de contacto establecido en % (el resto de los datos de contacto quedó intacto).', v_correo;
  else
    raise notice 'El correo del formulario ya estaba configurado: se respetó el valor actual.';
  end if;
end;
$do$;


-- =============================================================================
-- 2. PROYECTOS: SLUG, GALERÍA Y DESCRIPCIÓN LARGA
-- =============================================================================

-- 2.1 Columnas nuevas ---------------------------------------------------------
alter table public.site_projects
  add column if not exists slug text;

alter table public.site_projects
  add column if not exists gallery jsonb not null default '[]'::jsonb;

alter table public.site_projects
  add column if not exists details text;

do $do$
begin
  comment on column public.site_projects.slug is
    'Parte final de la URL de la página del proyecto: /proyectos/<slug>. Única, en minúsculas, sin tildes ni espacios.';
  comment on column public.site_projects.gallery is
    'Fotos adicionales del proyecto: [{ "url": "...", "alt": "..." }]. Se muestran al final de su página. Vacío = sin galería.';
  comment on column public.site_projects.details is
    'Descripción LARGA del proyecto (varios párrafos). NULL o vacío = la página usa la descripción corta.';
exception
  when others then
    raise notice 'No se pudieron escribir los comentarios de las columnas nuevas de site_projects (%).', sqlerrm;
end;
$do$;


-- 2.2 Slugs de los cuatro proyectos sembrados por la 0001 ---------------------
--     Se fijan a mano porque el título es largo y el slug automático quedaría
--     ilegible ("sistema-de-extraccion-de-aire-caliente-planta-de-emergencia").
--     Solo se escriben si la fila todavía no tiene slug.

update public.site_projects
   set slug = 'extraccion-aire-clinica-farallones'
 where slug is null
   and title = 'Sistema de extracción de aire caliente — planta de emergencia';

update public.site_projects
   set slug = 'chiller-laboratorios-osa'
 where slug is null
   and title = 'Instalación de chiller de 30 TON';

update public.site_projects
   set slug = 'bodega-laboratorios-osa'
 where slug is null
   and title = 'Ampliación de bodega logística';

update public.site_projects
   set slug = 'planta-piloto-vaselina'
 where slug is null
   and title = 'Montaje de planta piloto para fabricación de vaselina';


-- 2.3 Slug automático para cualquier otro proyecto ----------------------------
--     `unaccent` no está garantizado en todos los proyectos de Supabase, así
--     que las tildes se quitan con `translate` (suficiente para español).
--     Si dos títulos generan el mismo slug se añade un sufijo numérico.

do $do$
declare
  r          record;
  v_base     text;
  v_slug     text;
  v_intento  int;
begin
  for r in
    select id, title
      from public.site_projects
     where slug is null or btrim(slug) = ''
     order by sort, created_at
  loop
    v_base := lower(coalesce(r.title, 'proyecto'));
    v_base := translate(v_base,
                        'áàäâãéèëêíìïîóòöôõúùüûñç',
                        'aaaaaeeeeiiiiooooouuuunc');
    v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
    v_base := btrim(v_base, '-');
    v_base := left(v_base, 80);
    if v_base = '' then
      v_base := 'proyecto';
    end if;

    v_slug := v_base;
    v_intento := 1;
    while exists (
      select 1 from public.site_projects where slug = v_slug and id <> r.id
    ) loop
      v_intento := v_intento + 1;
      v_slug := left(v_base, 74) || '-' || v_intento;
    end loop;

    update public.site_projects set slug = v_slug where id = r.id;
    raise notice 'Proyecto "%": slug generado → %.', r.title, v_slug;
  end loop;
end;
$do$;


-- 2.4 Slug único y obligatorio ------------------------------------------------
--     Se hace en un bloque con manejo de excepciones: si por alguna razón
--     quedaran slugs repetidos o vacíos, la migración avisa en vez de abortar
--     (el sitio sabe funcionar sin la restricción; el panel valida igualmente).

do $do$
begin
  create unique index if not exists site_projects_slug_key
    on public.site_projects (slug)
    where slug is not null;
exception
  when others then
    raise notice 'No se pudo crear el índice único site_projects_slug_key (%). Revise si hay slugs repetidos.', sqlerrm;
end;
$do$;

do $do$
begin
  if not exists (select 1 from public.site_projects where slug is null or btrim(slug) = '') then
    alter table public.site_projects alter column slug set not null;
  else
    raise notice 'Hay proyectos sin slug: la columna se deja opcional. Complete el slug desde el panel y vuelva a ejecutar.';
  end if;
exception
  when others then
    raise notice 'No se pudo marcar site_projects.slug como obligatoria (%). No es crítico.', sqlerrm;
end;
$do$;


-- 2.5 Textos de los cuatro proyectos sembrados --------------------------------
--     La 0001 los dejó sin descripción. Ahora que cada proyecto tiene página
--     propia, se siembran los mismos textos que trae `src/data/projects.ts`
--     (el respaldo estático del sitio), para que la página se vea igual con y
--     sin base de datos. Solo se escriben si el campo está vacío: nunca pisan
--     lo que GPI haya redactado desde el panel.

update public.site_projects p
   set description = coalesce(nullif(btrim(p.description), ''), v.description),
       details     = coalesce(nullif(btrim(p.details), ''),     v.details)
  from (values
    ('extraccion-aire-clinica-farallones',
     'Diseño y montaje del sistema de extracción de aire caliente de la planta de emergencia.',
     'Diseñamos e instalamos el sistema de extracción de aire caliente de la planta de emergencia de la Clínica Farallones. El trabajo incluyó el dimensionamiento de los ductos, la selección del extractor y el montaje de la estructura de soporte, cuidando que la evacuación del calor no comprometiera la operación del equipo ni la seguridad del cuarto técnico.'),
    ('chiller-laboratorios-osa',
     'Instalación completa de un chiller industrial de 30 toneladas de refrigeración.',
     'Instalación completa de un chiller de 30 toneladas de refrigeración para el proceso productivo de Laboratorios OSA: montaje del equipo, tendido de tubería hidráulica, aislamiento térmico, conexiones eléctricas y puesta en marcha con las pruebas de operación correspondientes.'),
    ('bodega-laboratorios-osa',
     'Ampliación de la bodega logística para aumentar la capacidad de almacenamiento.',
     'Ampliación de la bodega logística de Laboratorios OSA para aumentar su capacidad de almacenamiento. El proyecto abarcó la estructura metálica, la cubierta y las adecuaciones necesarias para mantener la operación de la planta durante la obra.'),
    ('planta-piloto-vaselina',
     'Montaje de una planta piloto con tanques, tuberías y sistema de calentamiento.',
     'Montaje de una planta piloto para la fabricación de vaselina: tanques de proceso, tubería, sistema de calentamiento y accesorios, dispuestos de forma que el cliente pudiera validar su producto a escala antes de llevar el proceso a producción industrial.')
  ) as v(slug, description, details)
 where p.slug = v.slug
   and (
     coalesce(btrim(p.description), '') = ''
     or coalesce(btrim(p.details), '') = ''
   );


-- 2.6 Galería semilla del montaje de la planta piloto -------------------------
--     La foto vive en el repositorio (public/images/cm/). Solo se añade si la
--     galería de ese proyecto todavía está vacía: nunca pisa lo que GPI suba.

update public.site_projects
   set gallery = jsonb_build_array(
         jsonb_build_object(
           'url', '/images/cm/foto-montaje-planta-vaselina-alt.jpg',
           'alt', 'Otra vista del montaje de la planta piloto de vaselina, con los tanques y la tubería instalados'
         )
       )
 where slug = 'planta-piloto-vaselina'
   and (gallery is null or jsonb_array_length(gallery) = 0);


-- =============================================================================
-- 3. ORDEN DE TRABAJO OPCIONAL EN LAS JORNADAS
--
--    Hay labores que no tienen una orden de trabajo asociada (apoyos internos,
--    traslados, atención de una urgencia). Obligar a inventar un número
--    ensuciaba el reporte, así que el campo pasa a ser opcional: el formulario
--    lo deja vacío y todo el panel muestra "Sin orden de trabajo".
--
--    Las cadenas vacías que hayan quedado de antes se normalizan a NULL para
--    que exista UNA sola forma de decir "no tiene orden".
-- =============================================================================

do $do$
begin
  alter table public.jornadas alter column work_order drop not null;
exception
  when others then
    raise notice 'No se pudo hacer opcional jornadas.work_order (%).', sqlerrm;
end;
$do$;

update public.jornadas
   set work_order = null
 where work_order is not null
   and btrim(work_order) = '';

do $do$
begin
  comment on column public.jornadas.work_order is
    'Número de la orden de trabajo. OPCIONAL desde la migración 0005: NULL = la labor no tenía orden asociada (el panel lo muestra como "Sin orden de trabajo").';
exception
  when others then
    raise notice 'No se pudo escribir el comentario de jornadas.work_order (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 4. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_correo      text;
  v_proyectos   int;
  v_con_slug    int;
  v_sin_orden   int;
begin
  select value->>'correoFormulario' into v_correo
    from public.site_settings where key = 'contact';

  select count(*) into v_proyectos from public.site_projects;
  select count(*) into v_con_slug  from public.site_projects where slug is not null;
  select count(*) into v_sin_orden from public.jornadas where work_order is null;

  raise notice 'Migración 0005 aplicada. Correo del formulario: %. Proyectos: % (con slug: %). Jornadas sin orden de trabajo: %.',
    coalesce(v_correo, '(sin definir)'), v_proyectos, v_con_slug, v_sin_orden;
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
