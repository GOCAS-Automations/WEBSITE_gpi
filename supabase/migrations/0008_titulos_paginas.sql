-- =============================================================================
-- GPI — Migración 0008: los títulos que quedaban escritos en el código
--                       pasan a ser editables desde el panel
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001 … 0007.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE (lo que GPI pidió en el pulido final):
--
--   1. TÍTULOS DE LA PÁGINA DE INICIO  →  `site_settings.home`
--      Cuatro bloques nuevos dentro de la clave que ya existe:
--        · `serviciosIntro` — «Nuestros servicios / Dos áreas, una misma
--          excelencia» y su descripción.
--        · `valoresIntro`   — el encabezado de los valores en el inicio.
--        · `clientes`       — «Clientes / Portafolio de clientes» y su texto.
--        · `cta`            — la franja verde de cierre.
--      Se editan en el panel, en «Página de inicio».
--
--   2. CABECERAS DE LAS DEMÁS PÁGINAS  →  `site_settings.paginas`
--      La primera pantalla (título, descripción y foto de fondo) de
--      **Servicios**, **Proyectos** y **Contacto**, más el párrafo de
--      presentación del **pie de página**. Se editan en el panel, en
--      «Títulos de páginas», dentro de «Contenido del sitio».
--
--      El texto del pie se siembra ya corregido: decía «Más de 5 años» y GPI
--      corrigió su antigüedad a **más de 15 años** el 12 de agosto de 2026.
--
-- LOS TEXTOS DE ESTA MIGRACIÓN ESTÁN DUPLICADOS EN `src/data/site.ts`, que es
-- el respaldo estático del sitio. Es el patrón del repositorio: la página se ve
-- igual con base de datos y sin ella. Si cambia un texto aquí, cámbielo allí.
--
-- Es idempotente y NUNCA pisa lo editado desde el panel: los bloques nuevos se
-- añaden a la izquierda del operador `||`, así que cualquier clave que ya
-- exista gana sobre la que trae esta migración.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. TÍTULOS DE LA PÁGINA DE INICIO  (clave `home`)
--
--    `v_nuevas || value` hace merge de PRIMER NIVEL con el valor guardado a la
--    derecha: si `serviciosIntro` ya existiera (porque GPI lo editó), se
--    respeta tal cual y solo se añaden los bloques que faltan. `quienesSomos`,
--    que ya vivía aquí desde la 0007, no se toca.
-- =============================================================================

do $do$
declare
  v_nuevas jsonb := jsonb_build_object(
    'serviciosIntro', jsonb_build_object(
      'eyebrow',     'Nuestros servicios',
      'titulo',      'Dos áreas, una misma excelencia',
      'descripcion', 'Cubrimos las necesidades de los procesos industriales y acompañamos el cumplimiento y la gestión ambiental de su empresa.'
    ),
    'valoresIntro', jsonb_build_object(
      'eyebrow',     'Nuestros valores',
      'titulo',      'Los principios que guían cada proyecto',
      'descripcion', ''
    ),
    'clientes', jsonb_build_object(
      'eyebrow',     'Clientes',
      'titulo',      'Portafolio de clientes',
      'descripcion', 'Nos respalda el trabajo realizado junto a compañías de distintos sectores.'
    ),
    'cta', jsonb_build_object(
      'titulo',      '¿Listo para optimizar sus procesos?',
      'descripcion', 'Cuéntenos su necesidad y le presentamos una propuesta a la medida de su proceso y su presupuesto.'
    )
  );
begin
  if exists (select 1 from public.site_settings where key = 'home') then
    update public.site_settings
       set value = v_nuevas || value
     where key = 'home';
    raise notice 'Títulos del inicio añadidos a la clave home (lo que ya existía se respetó).';
  else
    -- La 0007 debería haber creado la clave. Si no está (instalación parcial),
    -- se deja al menos lo de esta migración y el resto sale del respaldo
    -- estático de src/data/site.ts.
    insert into public.site_settings (key, value)
    values ('home', v_nuevas)
    on conflict (key) do nothing;
    raise notice 'La clave home no existía: se creó con los títulos de esta migración. Revise que la 0007 esté aplicada.';
  end if;
end;
$do$;


-- =============================================================================
-- 2. CABECERAS DE SERVICIOS, PROYECTOS Y CONTACTO + PIE  (clave `paginas`)
--
--    `on conflict do nothing`: si la clave ya existe (porque alguien ya editó
--    estas páginas), esta migración no toca absolutamente nada.
-- =============================================================================

insert into public.site_settings (key, value)
values (
  'paginas',
  jsonb_build_object(
    'servicios', jsonb_build_object(
      'eyebrow',     'Servicios',
      'titulo',      'Soluciones industriales y ambientales a la medida',
      'descripcion', 'Integramos diferentes disciplinas para optimizar sus procesos y acompañar el cumplimiento normativo de su empresa. Estos son nuestros servicios.',
      'imagen', jsonb_build_object(
        'url', '/images/servicios/s1.jpg',
        'alt', 'Planta industrial con estructuras metálicas y tuberías'
      )
    ),

    'proyectos', jsonb_build_object(
      'eyebrow',     'Proyectos',
      'titulo',      'Proyectos que respaldan nuestra experiencia',
      'descripcion', 'Una muestra del trabajo ejecutado junto a nuestros clientes en el sector industrial y ambiental.',
      'imagen', jsonb_build_object(
        'url', '/images/proyectos/13a.jpg',
        'alt', 'Planta piloto industrial con tanques y tuberías'
      )
    ),

    'contacto', jsonb_build_object(
      'eyebrow',     'Contacto',
      'titulo',      'Hablemos de tu proyecto',
      'descripcion', 'Estamos en Cali y atendemos el suroccidente colombiano. Escríbenos y te responderemos con una propuesta a la medida.',
      'imagen', jsonb_build_object(
        'url', '/images/slides/1.jpg',
        'alt', 'Equipo de GPI en trabajo de campo'
      )
    ),

    -- «Más de 15 años», no «5»: el pie se había quedado con la antigüedad
    -- vieja mientras el resto del sitio ya decía 15.
    'footer', jsonb_build_object(
      'descripcion', 'Empresa de gestión estratégica y ejecución enfocada en generar rentabilidad y cumplimiento, integrando las variables del modelo de negocio de cada organización. Más de 15 años en el sector industrial-ambiental.'
    )
  )
)
on conflict (key) do nothing;


-- 2.1 «5 años» → «15 años» si alguien ya había guardado el pie viejo ----------
--     Solo se reemplaza el texto EXACTO anterior; si se editó a mano, manda lo
--     que escribió GPI.

update public.site_settings
   set value = jsonb_set(
         value,
         '{footer,descripcion}',
         to_jsonb('Empresa de gestión estratégica y ejecución enfocada en generar rentabilidad y cumplimiento, integrando las variables del modelo de negocio de cada organización. Más de 15 años en el sector industrial-ambiental.'::text)
       )
 where key = 'paginas'
   and value #>> '{footer,descripcion}' = 'Empresa de gestión estratégica y ejecución enfocada en generar rentabilidad y cumplimiento, integrando las variables del modelo de negocio de cada organización. Más de 5 años en el sector industrial-ambiental.';


-- =============================================================================
-- 3. RED DE SEGURIDAD DE «+5 años» → «+15 años»
--
--    La 0007 ya hizo estos tres reemplazos. Se repiten aquí por si una base de
--    datos se sembró con la 0001 después de aplicar la 0007: las condiciones
--    exigen el texto EXACTO viejo, así que sobre una base ya corregida no
--    actualizan ninguna fila.
-- =============================================================================

update public.site_settings
   set value = value || jsonb_build_object(
         'badge', '+15 años en el sector industrial-ambiental')
 where key = 'hero'
   and value->>'badge' = '+5 años en el sector industrial-ambiental';

update public.site_settings
   set value = value || jsonb_build_object(
         'eyebrow', 'Más de 15 años en el sector industrial-ambiental')
 where key = 'excellence'
   and value->>'eyebrow' = 'Más de 5 años en el sector industrial-ambiental';

update public.site_settings
   set value = jsonb_set(value, '{quienesSomos,stats,0,value}', '"+15"'::jsonb)
 where key = 'home'
   and value #>> '{quienesSomos,stats,0,value}' = '+5';

update public.site_settings
   set value = jsonb_set(value, '{stats,0,value}', '"+15"'::jsonb)
 where key = 'excellence'
   and value #>> '{stats,0,value}' = '+5';


-- =============================================================================
-- 4. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_paginas   boolean;
  v_servicios boolean;
  v_clientes  boolean;
begin
  -- `jsonb_exists(...)` en vez del operador `?`: hace exactamente lo mismo y
  -- evita que un cliente SQL confunda el signo con un parámetro de consulta.
  select exists (select 1 from public.site_settings where key = 'paginas') into v_paginas;
  select exists (
    select 1 from public.site_settings
     where key = 'home' and jsonb_exists(value, 'serviciosIntro')
  ) into v_servicios;
  select exists (
    select 1 from public.site_settings
     where key = 'home' and jsonb_exists(value, 'clientes')
  ) into v_clientes;

  raise notice 'Migración 0008 aplicada. Cabeceras de páginas: %. Títulos de servicios del inicio: %. Títulos de clientes: %.',
    case when v_paginas   then 'listo' else 'FALTA' end,
    case when v_servicios then 'listo' else 'FALTA' end,
    case when v_clientes  then 'listo' else 'FALTA' end;
  raise notice 'Edite estos textos en el panel: /admin/inicio y /admin/paginas (Contenido del sitio → Títulos de páginas).';
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
