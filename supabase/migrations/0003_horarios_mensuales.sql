-- =============================================================================
-- GPI — Migración 0003: horarios laborales mensuales, cuentas por USUARIO y
--                       más datos del empleado
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001_site_content.sql y
--            0002_empleados_jornadas.sql.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE (resumen):
--   1. Crea la tabla `horarios_mensuales`: el horario laboral que GPI define
--      MES A MES (a veces cambia). De ahí sale qué cuenta como jornada
--      ordinaria y, por diferencia, qué es hora extra.
--   2. Siembra el mes en curso (julio de 2026) y agosto de 2026 con el horario
--      predeterminado confirmado por GPI:
--        · Lunes a jueves  08:00 – 17:30 (9,5 h) − 1 h de almuerzo = 8,5 h
--        · Viernes         08:00 – 17:00 (9 h)   − 1 h de almuerzo = 8 h
--        · Sábado y domingo: NO laborales
--        · Total semanal neto: 42 horas
--   3. Añade a `profiles` las columnas `username` (único), `cedula` y
--      `email_contacto`, y actualiza el trigger de auth para poblarlas.
--      El portal pasa a identificarse por USUARIO, no por correo: Supabase Auth
--      exige un correo, así que se usa el sintético interno
--      `<usuario>@cuentas.gpiprofesionales.com` (ese dominio no recibe correo).
--   4. Documenta en `site_settings.jornada_config` que el horario ordinario ya
--      NO sale de ahí (sale de `horarios_mensuales`) y guarda el horario
--      semanal por defecto que se usa al crear meses nuevos.
--   5. Confirma que cualquier rol puede registrar SUS PROPIAS jornadas
--      (el Community Manager también es empleado de GPI).
--
-- Es idempotente: se puede volver a ejecutar sin duplicar datos ni pisar lo que
-- el equipo haya editado desde el panel.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. TABLA `horarios_mensuales`
--
--    Un registro por mes. La columna `dias` es un objeto JSON con las claves
--    'lun', 'mar', 'mie', 'jue', 'vie', 'sab' y 'dom'. Cada una es:
--
--        { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 }
--
--    o `null` cuando ese día NO es laboral.
--
--    La JORNADA ORDINARIA NETA de un día es (fin − inicio) − almuerzo:
--    el almuerzo no cuenta como trabajo. Lo que el empleado trabaje por encima
--    de esa jornada se calcula como hora extra (src/lib/jornada.ts).
-- =============================================================================

create table if not exists public.horarios_mensuales (
  id         uuid primary key default gen_random_uuid(),
  anio       int  not null check (anio between 2000 and 2200),
  mes        int  not null check (mes between 1 and 12),
  dias       jsonb not null default '{}'::jsonb,
  notas      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint horarios_mensuales_anio_mes_key unique (anio, mes)
);

comment on table public.horarios_mensuales is
  'Horario laboral de GPI mes a mes. Define qué cuenta como jornada ordinaria; el exceso es hora extra.';
comment on column public.horarios_mensuales.dias is
  'JSON con claves lun..dom. Cada día: {"inicio":"08:00","fin":"17:30","almuerzoHoras":1} o null si NO es laboral.';
comment on column public.horarios_mensuales.notas is
  'Nota interna del mes (p. ej. "semana de inventario: se sale a las 4 p. m.").';

create index if not exists horarios_mensuales_periodo_idx
  on public.horarios_mensuales (anio desc, mes desc);

drop trigger if exists horarios_mensuales_set_updated_at on public.horarios_mensuales;
create trigger horarios_mensuales_set_updated_at
  before update on public.horarios_mensuales
  for each row execute function public.set_updated_at();


-- 1.1 RLS ---------------------------------------------------------------------
--   · SELECT para cualquier usuario autenticado: los empleados necesitan leer
--     el horario del mes para ver bien el cálculo de sus horas en /mi-cuenta.
--   · Escritura solo para managers (admin | coordinador) vía is_manager().
--   · anon: sin acceso (el horario interno no es información pública).
alter table public.horarios_mensuales enable row level security;

drop policy if exists horarios_mensuales_select_auth   on public.horarios_mensuales;
drop policy if exists horarios_mensuales_insert_manager on public.horarios_mensuales;
drop policy if exists horarios_mensuales_update_manager on public.horarios_mensuales;
drop policy if exists horarios_mensuales_delete_manager on public.horarios_mensuales;

create policy horarios_mensuales_select_auth on public.horarios_mensuales
  for select to authenticated using (true);

create policy horarios_mensuales_insert_manager on public.horarios_mensuales
  for insert to authenticated with check (public.is_manager());

create policy horarios_mensuales_update_manager on public.horarios_mensuales
  for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy horarios_mensuales_delete_manager on public.horarios_mensuales
  for delete to authenticated using (public.is_manager());

grant select, insert, update, delete on public.horarios_mensuales to authenticated;


-- 1.2 Seed: mes en curso (julio de 2026) y el siguiente (agosto de 2026) ------
--     `on conflict do nothing` = si el mes ya existe NO se pisa lo que el
--     equipo haya ajustado desde /admin/horarios.
insert into public.horarios_mensuales (anio, mes, dias, notas) values
(
  2026, 7,
  '{
    "lun": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
    "mar": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
    "mie": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
    "jue": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
    "vie": { "inicio": "08:00", "fin": "17:00", "almuerzoHoras": 1 },
    "sab": null,
    "dom": null
  }'::jsonb,
  'Horario base de GPI: 42 horas semanales netas (el almuerzo no cuenta como trabajo).'
),
(
  2026, 8,
  '{
    "lun": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
    "mar": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
    "mie": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
    "jue": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
    "vie": { "inicio": "08:00", "fin": "17:00", "almuerzoHoras": 1 },
    "sab": null,
    "dom": null
  }'::jsonb,
  'Copiado de julio de 2026. Ajústelo si el horario del mes cambia.'
)
on conflict (anio, mes) do nothing;


-- =============================================================================
-- 2. CUENTAS POR USUARIO — columnas nuevas en `profiles`
--
--    El equipo de GPI no tiene correo corporativo: entra al portal con un
--    USUARIO que le asigna la empresa (p. ej. 'jperez'). Supabase Auth exige un
--    correo, así que internamente se guarda el sintético
--    'jperez@cuentas.gpiprofesionales.com' (ese dominio NO recibe correo).
--    El correo real de la persona, si lo tiene, va en `email_contacto` y es
--    puramente informativo.
--
--    Los perfiles creados ANTES de esta migración (el admin inicial) quedan con
--    username NULL: el código los identifica por `username ?? email` y siguen
--    entrando con su correo de siempre.
-- =============================================================================

alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists cedula text;

alter table public.profiles
  add column if not exists email_contacto text;

comment on column public.profiles.username is
  'Usuario con el que la persona ingresa al portal (minúsculas, sin espacios). NULL en las cuentas antiguas, que entran con su correo.';
comment on column public.profiles.cedula is
  'Número de documento de identidad. Informativo (nómina).';
comment on column public.profiles.email_contacto is
  'Correo REAL de contacto de la persona. Informativo: no se usa para iniciar sesión.';

-- Único, pero tolerando varios NULL (las cuentas antiguas).
create unique index if not exists profiles_username_key
  on public.profiles (username)
  where username is not null;

-- 2.1 Rellenar `username` de las cuentas ya creadas con correo sintético ------
update public.profiles
   set username = split_part(email, '@', 1)
 where username is null
   and email like '%@cuentas.gpiprofesionales.com';


-- 2.2 Trigger de auth.users actualizado --------------------------------------
--     Toma username / cedula / email_contacto de raw_user_meta_data (los envía
--     /admin/empleados a través de la Auth Admin API) y, si no vienen, deduce
--     el username del correo sintético.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_role     text;
  v_username text;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'empleado');

  -- Compatibilidad con el nombre viejo del rol.
  if v_role = 'employee' then
    v_role := 'empleado';
  end if;

  if v_role not in ('admin', 'coordinador', 'marketing', 'empleado') then
    v_role := 'empleado';
  end if;

  -- Usuario: el de los metadatos o, si el correo es sintético, su parte local.
  v_username := nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '');
  if v_username is null and new.email like '%@cuentas.gpiprofesionales.com' then
    v_username := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (
    id, email, full_name, role, cargo, phone, active,
    username, cedula, email_contacto
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    v_role,
    nullif(new.raw_user_meta_data ->> 'cargo', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    true,
    v_username,
    nullif(new.raw_user_meta_data ->> 'cedula', ''),
    nullif(new.raw_user_meta_data ->> 'email_contacto', '')
  )
  on conflict (id) do update
    set email          = excluded.email,
        full_name      = coalesce(excluded.full_name, public.profiles.full_name),
        role           = excluded.role,
        cargo          = coalesce(excluded.cargo, public.profiles.cargo),
        phone          = coalesce(excluded.phone, public.profiles.phone),
        username       = coalesce(excluded.username, public.profiles.username),
        cedula         = coalesce(excluded.cedula, public.profiles.cedula),
        email_contacto = coalesce(excluded.email_contacto, public.profiles.email_contacto);

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
-- 3. JORNADAS: cualquier rol registra LAS SUYAS
--
--    Las políticas de la 0002 ya lo permiten (el insert solo exige
--    employee_id = auth.uid(), estado 'pendiente' y cuenta activa: NO limita
--    por rol). Se vuelven a crear aquí, idénticas, para dejarlo explícito y
--    documentado: el Community Manager (rol 'marketing') también es empleado de
--    GPI y registra sus jornadas, igual que un admin o un coordinador.
--    Aprobar o rechazar las de los demás sigue siendo solo de is_manager().
-- =============================================================================

drop policy if exists jornadas_insert_own on public.jornadas;

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


-- =============================================================================
-- 4. `site_settings.jornada_config` — el horario ya no vive aquí
--
--    A partir de esta migración:
--      · La JORNADA ORDINARIA de cada día sale de `horarios_mensuales`.
--      · `jornadaOrdinariaInicio` / `jornadaOrdinariaFin` / `horasOrdinariasDia`
--        quedan como LEGADO informativo.
--      · `horarioSemanal` es el horario POR DEFECTO que se usa para crear meses
--        nuevos en /admin/horarios y como red de seguridad si un mes no está
--        cargado.
--      · Los RECARGOS y los topes de horas extra siguen igual: se conservan.
-- =============================================================================

-- 4.1 Horario semanal por defecto (solo si la clave todavía no existe) --------
--     El `||` con el valor actual a la derecha hace que lo ya guardado GANE:
--     no se pisa nada de lo que el equipo haya ajustado.
update public.site_settings
   set value = '{
         "horarioSemanal": {
           "lun": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
           "mar": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
           "mie": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
           "jue": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
           "vie": { "inicio": "08:00", "fin": "17:00", "almuerzoHoras": 1 },
           "sab": null,
           "dom": null
         }
       }'::jsonb || value
 where key = 'jornada_config';

-- 4.2 Campos de horario legado, alineados con el horario real de GPI ---------
update public.site_settings
   set value = value || '{
         "jornadaOrdinariaInicio": "08:00",
         "jornadaOrdinariaFin": "17:30",
         "horasOrdinariasDia": 8.5
       }'::jsonb
 where key = 'jornada_config';

-- 4.3 Si por alguna razón la fila no existiera, se crea completa -------------
insert into public.site_settings (key, value) values
(
  'jornada_config',
  '{
    "jornadaOrdinariaInicio": "08:00",
    "jornadaOrdinariaFin": "17:30",
    "horasOrdinariasDia": 8.5,
    "horarioSemanal": {
      "lun": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
      "mar": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
      "mie": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
      "jue": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
      "vie": { "inicio": "08:00", "fin": "17:00", "almuerzoHoras": 1 },
      "sab": null,
      "dom": null
    },
    "inicioNocturno": "19:00",
    "finNocturno": "06:00",
    "limiteExtrasDia": 2,
    "limiteExtrasSemana": 12,
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
-- 5. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_meses int;
  v_users int;
begin
  select count(*) into v_meses from public.horarios_mensuales;
  select count(*) into v_users from public.profiles where username is not null;
  raise notice 'Migración 0003 aplicada. Meses con horario cargado: %. Cuentas con usuario: %. El horario se edita en /admin/horarios (admin y coordinador).', v_meses, v_users;
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
