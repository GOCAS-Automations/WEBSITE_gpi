-- =============================================================================
-- GPI — Migración 0007: contenido editable de las páginas generales
--                       (inicio y Nosotros · contador de visitas ·
--                        video por servicio)
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001, 0002, 0003, 0004, 0005 y 0006.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE (lo que GPI pidió el 12 de agosto de 2026):
--
--   1. CONTENIDO DE LA PÁGINA NOSOTROS  →  `site_settings.nosotros`
--      La página deja de tener los textos escritos en el código: primera
--      pantalla, Quiénes Somos, Misión, Visión, galería de aliados, línea de
--      tiempo empresarial (hitos y etiquetas), título de los valores y cierre.
--      Todo se edita en el panel, en «Página Nosotros».
--
--   2. CONTENIDO DE LA PÁGINA DE INICIO  →  `site_settings.home`
--      El bloque «Quiénes somos» del inicio (título, texto, puntos, foto,
--      cifras y botón) pasa a ser editable en «Página de inicio».
--      Las cifras se MUEVEN desde `excellence.stats`, que es donde vivían: si
--      GPI las había cambiado desde el panel, se conservan tal cual.
--
--   3. INTERRUPTORES POR SECCIÓN  →  `site_settings.visibility`
--      Ocho claves nuevas para apagar bloques concretos de cada página sin
--      borrar nada. Las cuatro claves anteriores siguen intactas.
--
--   4. CONTADOR DE VISITAS  →  tabla `site_visitas` + `registrar_visita()`
--      Una fila por día con el total de ese día. La cifra se muestra junto a
--      las demás en «Quiénes somos».
--
--   5. VIDEO POR SERVICIO  →  columna `site_services.video`
--      Cada servicio puede tener su propio video de YouTube, con título,
--      descripción e interruptor para ocultarlo sin borrarlo.
--
-- LOS TEXTOS DE ESTA MIGRACIÓN ESTÁN DUPLICADOS EN `src/data/site.ts`, que es
-- el respaldo estático del sitio. Es el patrón del repositorio: la página se ve
-- igual con base de datos y sin ella. Si cambia un texto aquí, cámbielo allí.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada. Y nunca pisa lo
-- que GPI haya editado desde el panel — cada bloque solo se escribe si la clave
-- correspondiente todavía no existe.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. CONTENIDO DE LA PÁGINA NOSOTROS
--
--    Se inserta la clave completa `nosotros`. El `on conflict do nothing` es
--    lo que protege al cliente: si la clave ya existe (porque alguien ya editó
--    la página), esta migración no toca absolutamente nada.
-- =============================================================================

insert into public.site_settings (key, value)
values (
  'nosotros',
  jsonb_build_object(
    'hero', jsonb_build_object(
      'titulo', 'Optimizamos procesos, generamos rentabilidad',
      'descripcion', 'Somos una empresa de gestión estratégica y ejecución, enfocada en el desempeño y el cumplimiento de nuestros clientes.',
      'imagen', jsonb_build_object(
        'url', '/images/slides/2.jpg',
        'alt', 'Profesional de GPI realizando mediciones ambientales en campo'
      )
    ),

    'quienesSomos', jsonb_build_object(
      'titulo', 'Quiénes Somos',
      'parrafos', jsonb_build_array(
        'Con más de 15 años de experiencia en el sector industrial y ambiental, somos una empresa de gestión estratégica y ejecución dedicada a impulsar la rentabilidad y el cumplimiento normativo de nuestros clientes, teniendo en cuenta las características y el modelo de negocio de cada uno de nuestros clientes.',
        'A lo largo de nuestra trayectoria hemos acompañado a empresas del Valle del Cauca en sus procesos de mejora continua, combinando conocimiento técnico, visión estratégica y compromiso con resultados medibles. Creemos que cada organización es única, y por eso diseñamos soluciones a la medida de sus necesidades económicas, operativas y ambientales.'
      ),
      'imagen', jsonb_build_object(
        'url', '/images/cm/foto-equipo-gpi-sede.jpg',
        'alt', 'Equipo de GPI reunido en la sede de la empresa, frente a la pared con el logo corporativo'
      )
    ),

    -- Misión y Visión: los textos de la página TEXTOS del informe del community
    -- manager, que son los que manda GPI (el mockup traía una redacción algo
    -- distinta y estos la reemplazan).
    'mision', jsonb_build_object(
      'texto', 'Generar rentabilidad, cumplimiento de requisitos internos y externos a las compañías, basados en la mejora continua, integrando las variables de los modelos de negocio de cada organización.'
    ),
    'vision', jsonb_build_object(
      'texto', 'Convertirnos en el aliado estratégico de las empresas en el Valle del Cauca a nivel industrial en temas ambientales y de proyectos de mejoramiento industrial.'
    ),

    'galeria', jsonb_build_object(
      'titulo', 'Más que proveedores, somos aliados estratégicos',
      'descripcion', 'Hoy trabajamos con la meta de consolidarnos como el mejor aliado estratégico para el sector industrial y ambiental, primero en el Valle del Cauca y, progresivamente, a nivel nacional construyendo relaciones basadas en la transparencia, la confianza y el crecimiento conjunto.',
      'fotos', jsonb_build_array(
        jsonb_build_object(
          'url', '/images/cm/foto-aforo-quebrada-gpi.jpg',
          'alt', 'Profesional de GPI midiendo el caudal de una quebrada con equipo de aforo durante un monitoreo ambiental'
        ),
        jsonb_build_object(
          'url', '/images/cm/foto-monitoreo-agua-registro-datos.jpg',
          'alt', 'Dos profesionales de GPI registrando datos durante un monitoreo de calidad del agua en campo'
        ),
        jsonb_build_object(
          'url', '/images/cm/foto-tablero-control-planta-gpi.jpg',
          'alt', 'Técnico de GPI operando el tablero de control de un equipo automatizado en planta'
        )
      )
    ),

    -- Línea de tiempo: cuatro hitos arriba y cuatro etiquetas debajo de la
    -- flecha. `icono` es una clave de `iconMap` (src/lib/icons.tsx); si alguien
    -- escribe una que no existe, el sitio usa el icono por defecto en vez de
    -- romperse.
    'lineaTiempo', jsonb_build_object(
      'eyebrow', 'Nuestra trayectoria',
      'titulo', 'Línea de tiempo empresarial',
      'descripcion', 'Un camino de evolución, compromiso y resultados que nos ha permitido crecer junto a nuestros clientes y aliados estratégicos.',
      'hitos', jsonb_build_array(
        jsonb_build_object(
          'fecha', 'Abril de 2015',
          'titulo', 'Nuestros inicios',
          'descripcion', 'Comenzamos como persona natural, brindando asesorías especializadas en ingeniería.',
          'icono', 'user'
        ),
        jsonb_build_object(
          'fecha', 'Julio de 2021',
          'titulo', 'Asesorías y ejecución de proyectos',
          'descripcion', 'Ampliamos nuestro alcance para incluir la ejecución de proyectos, integrando conocimiento técnico y gestión orientada a resultados.',
          'icono', 'cogCheck'
        ),
        jsonb_build_object(
          'fecha', 'Septiembre de 2022',
          'titulo', 'Nacemos como persona jurídica',
          'descripcion', 'Constituimos nuestra empresa como SAS, robustecimos nuestro portafolio de servicios y fortalecimos nuestra estructura organizacional.',
          'icono', 'building'
        ),
        jsonb_build_object(
          'fecha', 'Hoy',
          'titulo', 'Consolidación y futuro',
          'descripcion', 'Contamos con punto físico y atendemos a las empresas más importantes del Valle del Cauca, impulsando su competitividad y sostenibilidad.',
          'icono', 'chartUp'
        )
      ),
      'etiquetas', jsonb_build_array(
        jsonb_build_object(
          'titulo', 'Enfoque inicial',
          'descripcion', 'Asesorías técnicas con compromiso y calidad.',
          'icono', 'flag'
        ),
        jsonb_build_object(
          'titulo', 'Crecimiento',
          'descripcion', 'De la asesoría a la acción, generando impacto real.',
          'icono', 'barChart'
        ),
        jsonb_build_object(
          'titulo', 'Fortalecimiento',
          'descripcion', 'Más servicios, más capacidades, más valor para nuestros clientes.',
          'icono', 'shield'
        ),
        jsonb_build_object(
          'titulo', 'Impacto',
          'descripcion', 'Alianzas sólidas, resultados medibles y relaciones a largo plazo.',
          'icono', 'users'
        )
      )
    ),

    'valoresIntro', jsonb_build_object(
      'eyebrow', 'Nuestros valores',
      'titulo', 'Lo que nos define',
      'descripcion', 'Los principios que están presentes en cada propuesta y ejecución de valor para nuestros clientes.'
    ),

    'cta', jsonb_build_object(
      'titulo', '¿Listo para optimizar sus procesos?',
      'descripcion', 'Cuéntenos su necesidad y le presentamos una propuesta a la medida de su proceso y su presupuesto.'
    )
  )
)
on conflict (key) do nothing;


-- =============================================================================
-- 2. CONTENIDO DE LA PÁGINA DE INICIO
--
--    Las CIFRAS se traen de `excellence.stats`, que es donde estaban antes de
--    esta migración: si GPI las editó desde el panel, siguen siendo las suyas.
--    Solo si esa clave no existe o está vacía se usan las cuatro aprobadas el
--    12 de agosto de 2026.
-- =============================================================================

do $do$
declare
  v_stats jsonb;
begin
  select value->'stats'
    into v_stats
    from public.site_settings
   where key = 'excellence';

  if v_stats is null
     or jsonb_typeof(v_stats) <> 'array'
     or jsonb_array_length(v_stats) = 0 then
    v_stats := jsonb_build_array(
      jsonb_build_object('value', '+15',  'label', 'años en el sector industrial-ambiental'),
      jsonb_build_object('value', '100%', 'label', 'objetivo en el desempeño del cliente'),
      jsonb_build_object('value', '11',   'label', 'servicios industriales y ambientales'),
      jsonb_build_object('value', '2',    'label', 'grandes áreas: industrial y ambiental')
    );
    raise notice 'Cifras de «Quiénes somos» sembradas con los valores aprobados el 12/08/2026.';
  else
    raise notice 'Cifras de «Quiénes somos» heredadas de la clave excellence (% cifras): se respeta lo editado en el panel.',
      jsonb_array_length(v_stats);
  end if;

  insert into public.site_settings (key, value)
  values (
    'home',
    jsonb_build_object(
      'quienesSomos', jsonb_build_object(
        'eyebrow', 'Quiénes somos',
        'titulo', 'Gestión estratégica y ejecución para su operación',
        'descripcion', 'Somos una empresa de gestión estratégica y ejecución, enfocada en generar rentabilidad y el cumplimiento de requisitos internos y externos a las compañías, basados en la mejora continua e integrando las variables de los modelos de negocio de cada organización.',
        'bullets', jsonb_build_array(
          'Objetivo: lograr el 100% en el desempeño de nuestros clientes.',
          'Integración de disciplinas industriales y ambientales.',
          'Metodología basada en la mejora continua.'
        ),
        'imagen', jsonb_build_object(
          'url', '/images/cm/foto-equipo-gpi-sede.jpg',
          'alt', 'Equipo de GPI reunido en la sede de la empresa, frente a la pared con el logo corporativo'
        ),
        'stats', v_stats,
        'ctaLabel', 'Conócenos',
        'ctaHref', '/nosotros'
      )
    )
  )
  on conflict (key) do nothing;
end;
$do$;


-- 2.1 «+5 años» → «+15 años» ---------------------------------------------------
--     GPI corrigió su antigüedad: el sitio decía «+5» desde la 0001. Solo se
--     reemplaza el texto EXACTO anterior; si alguien ya lo cambió a mano, se
--     respeta.

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

-- La primera cifra («+5 años en el sector…») dentro del arreglo `stats`, tanto
-- en la clave nueva `home` como en el legado `excellence`.
update public.site_settings
   set value = jsonb_set(
         value,
         '{quienesSomos,stats,0,value}',
         '"+15"'::jsonb
       )
 where key = 'home'
   and value #>> '{quienesSomos,stats,0,value}' = '+5';

update public.site_settings
   set value = jsonb_set(value, '{stats,0,value}', '"+15"'::jsonb)
 where key = 'excellence'
   and value #>> '{stats,0,value}' = '+5';


-- =============================================================================
-- 3. INTERRUPTORES DE VISIBILIDAD POR SECCIÓN
--
--    `||` sobre jsonb hace merge de primer nivel, y las claves nuevas van a la
--    IZQUIERDA del operador: así, si alguna ya existiera con otro valor, gana
--    la que ya está guardada. Las cuatro claves antiguas ni se tocan.
-- =============================================================================

do $do$
declare
  v_nuevas jsonb := jsonb_build_object(
    'homeQuienesSomos',     true,
    'nosotrosQuienesSomos', true,
    'nosotrosMisionVision', true,
    'nosotrosGaleria',      true,
    'nosotrosLineaTiempo',  true,
    'nosotrosValores',      true,
    'nosotrosVideo',        true,
    'nosotrosFaq',          true
  );
begin
  if exists (select 1 from public.site_settings where key = 'visibility') then
    update public.site_settings
       set value = v_nuevas || value
     where key = 'visibility';
    raise notice 'Interruptores nuevos añadidos a la visibilidad (los que ya existían se respetaron).';
  else
    insert into public.site_settings (key, value)
    values (
      'visibility',
      v_nuevas || jsonb_build_object(
        'valuesSection',  true,
        'clientsSection', true,
        'videoSection',   true,
        'faqSection',     true
      )
    )
    on conflict (key) do nothing;
    raise notice 'Se creó la clave de visibilidad con todas las secciones encendidas.';
  end if;
end;
$do$;


-- =============================================================================
-- 4. CONTADOR DE VISITAS
--
--    UNA FILA POR DÍA, no una fila por visita. Un registro por visita daría
--    una tabla que crece sin límite y obligaría a paginar para contar; con el
--    agregado diario la tabla suma 365 filas al año, el total es una sola
--    consulta y, de regalo, queda el histórico por si algún día GPI quiere ver
--    la evolución.
--
--    SEGURIDAD: `anon` solo puede LEER. El incremento lo hace el servidor
--    (route handler `/api/visita`) con la clave `service_role`, llamando a
--    `registrar_visita()`. Si la función se pudiera ejecutar desde el
--    navegador con la clave anónima —que es pública por diseño— cualquiera
--    inflaría el contador desde la consola en dos líneas.
-- =============================================================================

create table if not exists public.site_visitas (
  dia        date        primary key,
  total      integer     not null default 0,
  updated_at timestamptz not null default now()
);

do $do$
begin
  comment on table public.site_visitas is
    'Contador de visitas al sitio público: una fila por día. Se escribe SOLO desde el servidor con service_role, vía registrar_visita(). anon únicamente lee.';
  comment on column public.site_visitas.total is
    'Visitas contadas ese día. El sitio muestra la SUMA de todas las filas.';
exception
  when others then
    raise notice 'No se pudieron escribir los comentarios de site_visitas (%).', sqlerrm;
end;
$do$;


-- 4.1 La función que suma -----------------------------------------------------
--     `insert … on conflict do update` es ATÓMICO: dos visitas simultáneas no
--     se pisan, cosa que un select+update desde la aplicación sí haría.
--     `security definer` + `search_path` fijo, como manda Supabase.

create or replace function public.registrar_visita()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_total integer;
begin
  insert into public.site_visitas (dia, total, updated_at)
  values (current_date, 1, now())
  on conflict (dia) do update
    set total      = public.site_visitas.total + 1,
        updated_at = now()
  returning total into v_total;

  return v_total;
end;
$fn$;

comment on function public.registrar_visita() is
  'Suma una visita al día de hoy y devuelve el total del día. Solo puede ejecutarla service_role: el navegador nunca la llama directamente.';


-- 4.2 Permisos ----------------------------------------------------------------

alter table public.site_visitas enable row level security;

drop policy if exists site_visitas_select_public on public.site_visitas;

-- Lectura pública: el total se muestra en la página de inicio y en Nosotros.
create policy site_visitas_select_public on public.site_visitas
  for select to anon, authenticated using (true);

grant select on table public.site_visitas to anon, authenticated;
grant all    on table public.site_visitas to service_role;

-- La función NO se ofrece al navegador. `public` incluye a anon y a
-- authenticated, así que se revoca ahí y se concede solo a service_role.
revoke all on function public.registrar_visita() from public;
revoke all on function public.registrar_visita() from anon;
revoke all on function public.registrar_visita() from authenticated;
grant execute on function public.registrar_visita() to service_role;


-- 4.3 Semilla -----------------------------------------------------------------
--     La fila de hoy en cero, para que la tabla no esté vacía y el sitio pueda
--     distinguir «cero visitas» de «la migración todavía no está aplicada».

insert into public.site_visitas (dia, total)
values (current_date, 0)
on conflict (dia) do nothing;


-- =============================================================================
-- 5. VIDEO POR SERVICIO
--
--    NULL = este servicio no tiene video (que es el caso de casi todos).
--    Cuando lo tiene, el objeto es
--      { "url": "...", "titulo": "...", "descripcion": "...", "visible": true }
--    El identificador del video NO se guarda: se deriva de la URL al leer, así
--    no pueden quedar desincronizados.
-- =============================================================================

alter table public.site_services
  add column if not exists video jsonb;

do $do$
begin
  comment on column public.site_services.video is
    'Video de YouTube del servicio: { url, titulo, descripcion, visible }. NULL = sin video. visible=false lo oculta del sitio sin borrar el enlace.';
exception
  when others then
    raise notice 'No se pudo escribir el comentario de site_services.video (%).', sqlerrm;
end;
$do$;


-- =============================================================================
-- 6. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_nosotros   boolean;
  v_home       boolean;
  v_visitas    bigint;
  v_servicios  int;
begin
  select exists (select 1 from public.site_settings where key = 'nosotros') into v_nosotros;
  select exists (select 1 from public.site_settings where key = 'home')     into v_home;
  select coalesce(sum(total), 0) into v_visitas from public.site_visitas;
  select count(*) into v_servicios from public.site_services where video is not null;

  raise notice 'Migración 0007 aplicada. Contenido de Nosotros: %. Contenido del inicio: %. Visitas acumuladas: %. Servicios con video: %.',
    case when v_nosotros then 'listo' else 'FALTA' end,
    case when v_home     then 'listo' else 'FALTA' end,
    v_visitas, v_servicios;
  raise notice 'Edite estos textos en el panel: /admin/inicio y /admin/nosotros.';
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
