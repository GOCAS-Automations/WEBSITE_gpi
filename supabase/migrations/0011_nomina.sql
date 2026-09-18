-- =============================================================================
-- GPI — Migración 0011: sistema de nómina (liquidación quincenal y mensual)
-- Proyecto Supabase: "GPI Project"
-- =============================================================================
--
-- REQUISITO: aplicar ANTES las migraciones 0001 … 0010.
--
-- CÓMO APLICAR:
--   1. Dashboard de Supabase → SQL Editor → New query.
--   2. Pegue TODO este archivo y ejecute (Run).
--   3. Revise los NOTICE del panel de resultados.
--
-- QUÉ HACE
-- --------
-- Crea las dos tablas del módulo de NÓMINA que pidió la gerencia de GPI: ver,
-- automáticamente y desglosada, la nómina que hay que pagarle a cada empleado a
-- partir de las jornadas YA APROBADAS, configurando por empleado su salario y el
-- valor de cada tipo de hora.
--
--   · `nomina_config_mensual` — salario, auxilio de transporte, las siete
--     tarifas por hora y los porcentajes de salud y pensión de UN empleado en UN
--     mes. Se copia sola del mes anterior, igual que `horarios_mensuales`.
--   · `nomina_liquidaciones`  — la liquidación de UN empleado en UN período
--     (quincena 1, quincena 2 o mes completo): los conceptos que digita el
--     administrador, el estado y el SNAPSHOT congelado del cálculo.
--
-- POR QUÉ LAS TARIFAS SON PESOS Y NO PORCENTAJES
-- ----------------------------------------------
-- Porque así es como GPI las maneja hoy en su Excel: la gerencia digita cuánto
-- vale cada tipo de hora, en pesos, por empleado. El sistema SUGIERE un valor
-- derivado del salario (`salario / 240 × factor`) pero el administrador puede
-- sobrescribir cualquiera de los siete. El salario básico cubre las horas
-- ordinarias diurnas: esas NO se pagan aparte.
--
-- POR QUÉ EL SNAPSHOT (`snapshot`, `calculado_at`)
-- ------------------------------------------------
-- Exactamente la misma razón que `jornadas.desglose` en la migración 0004: una
-- nómina ya CERRADA no puede cambiar porque después se corrija un horario, se
-- ajuste una tarifa o se reabra una jornada. Al cerrar la liquidación se guarda
-- todo el cálculo —cantidades de horas, valores unitarios, devengados,
-- descuentos, neto y la configuración aplicada— y desde ahí se imprime el
-- volante. Reabrir a borrador borra el snapshot y vuelve a calcular en vivo.
--
-- QUIÉN VE QUÉ
-- ------------
--   · MANAGERS (`is_manager()` = admin | coordinador): todo, en las dos tablas.
--   · El EMPLEADO ve SOLO sus propias liquidaciones y SOLO cuando están
--     `cerrada` o `pagada` — así descarga su volante desde Mi Cuenta sin ver
--     borradores a medio hacer ni, por supuesto, la nómina de nadie más. No ve
--     `nomina_config_mensual`: los valores que le corresponden viajan dentro
--     del snapshot de su propia liquidación.
--   · `anon` no tiene acceso de ningún tipo: la nómina jamás sale al sitio.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada.
-- =============================================================================

set search_path = public, extensions;


-- =============================================================================
-- 1. TABLA `nomina_config_mensual` — salario y tarifas por empleado y mes
-- =============================================================================

create table if not exists public.nomina_config_mensual (
  id                           uuid primary key default gen_random_uuid(),
  employee_id                  uuid not null references public.profiles (id) on delete cascade,
  anio                         int  not null check (anio between 2000 and 2200),
  mes                          int  not null check (mes between 1 and 12),

  -- Salario mensual. Cubre las horas ORDINARIAS DIURNAS: no se pagan aparte.
  salario_basico               numeric(14,2) not null default 0 check (salario_basico >= 0),
  -- Auxilio de transporte MENSUAL completo (se prorratea /30 × días).
  aux_transporte               numeric(14,2) not null default 0 check (aux_transporte >= 0),

  -- Las siete tarifas, en PESOS POR HORA.
  -- `valor_hora_base` es la «hora de rotación diurna» del pedido de la
  -- gerencia: sirve de referencia y de base para derivar las demás, pero NO se
  -- paga aparte (ya está en el salario).
  valor_hora_base              numeric(14,2) not null default 0 check (valor_hora_base >= 0),
  -- Recargo ADITIVO por hora ordinaria nocturna (rotación nocturna).
  valor_rotacion_nocturna      numeric(14,2) not null default 0 check (valor_rotacion_nocturna >= 0),
  valor_extra_diurna           numeric(14,2) not null default 0 check (valor_extra_diurna >= 0),
  valor_extra_nocturna         numeric(14,2) not null default 0 check (valor_extra_nocturna >= 0),
  -- Hora ORDINARIA en domingo o festivo. La festiva NOCTURNA se paga como
  -- `valor_festivo + valor_rotacion_nocturna` (composición documentada).
  valor_festivo                numeric(14,2) not null default 0 check (valor_festivo >= 0),
  valor_extra_festivo_diurna   numeric(14,2) not null default 0 check (valor_extra_festivo_diurna >= 0),
  valor_extra_festivo_nocturna numeric(14,2) not null default 0 check (valor_extra_festivo_nocturna >= 0),

  -- Aportes del EMPLEADO, en porcentaje (4 % y 4 % por defecto, como el Excel).
  pct_salud                    numeric(5,2) not null default 4 check (pct_salud between 0 and 100),
  pct_pension                  numeric(5,2) not null default 4 check (pct_pension between 0 and 100),

  -- Fila del mes anterior de la que se copió (NULL = se creó con los valores
  -- sugeridos). Solo sirve para avisarlo en pantalla la primera vez.
  copiado_de                   uuid references public.nomina_config_mensual (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (employee_id, anio, mes)
);

do $do$
begin
  comment on table public.nomina_config_mensual is
    'Salario, auxilio de transporte, tarifas por hora y aportes de un empleado en un mes. Se copia del mes anterior al abrir un mes nuevo, igual que horarios_mensuales.';
  comment on column public.nomina_config_mensual.salario_basico is
    'Salario mensual. Cubre las horas ordinarias diurnas: esas NO se pagan aparte.';
  comment on column public.nomina_config_mensual.valor_hora_base is
    'Valor de la hora de rotación diurna (VR. HORA del Excel de GPI = salario/240). Referencia y base de derivación; no se paga como concepto.';
  comment on column public.nomina_config_mensual.valor_rotacion_nocturna is
    'Recargo ADITIVO en pesos por cada hora ordinaria trabajada de noche (se suma al salario ya devengado, no lo reemplaza).';
  comment on column public.nomina_config_mensual.valor_festivo is
    'Hora ordinaria en domingo o festivo. La festiva NOCTURNA se paga como valor_festivo + valor_rotacion_nocturna.';
  comment on column public.nomina_config_mensual.copiado_de is
    'Fila del mes anterior de la que se copió esta configuración. NULL = se creó con los valores sugeridos a partir del salario.';
exception
  when others then
    raise notice 'No se pudieron escribir los comentarios de nomina_config_mensual (%).', sqlerrm;
end;
$do$;

create index if not exists nomina_config_mensual_empleado_idx
  on public.nomina_config_mensual (employee_id);
create index if not exists nomina_config_mensual_mes_idx
  on public.nomina_config_mensual (anio, mes);

drop trigger if exists nomina_config_mensual_set_updated_at on public.nomina_config_mensual;
create trigger nomina_config_mensual_set_updated_at
  before update on public.nomina_config_mensual
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 2. TABLA `nomina_liquidaciones` — la nómina de un empleado en un período
--
--    Un período es una QUINCENA (días 1–15 o 16–fin de mes) o un MES completo.
--    Nunca es texto libre: se guardan el tipo, el año, el mes, la quincena y
--    las dos fechas reales. (En el Excel de GPI el período era texto escrito a
--    mano y el volante real de septiembre todavía decía «QUINCENA DE ENERO».)
-- =============================================================================

create table if not exists public.nomina_liquidaciones (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.profiles (id) on delete cascade,

  tipo           text not null default 'quincena' check (tipo in ('quincena', 'mes')),
  anio           int  not null check (anio between 2000 and 2200),
  mes            int  not null check (mes between 1 and 12),
  -- 1 = días 1–15 · 2 = días 16–fin de mes · NULL = el mes completo.
  quincena       int  check (quincena in (1, 2)),
  fecha_inicio   date not null,
  fecha_fin      date not null,

  -- Días liquidados del período (convención colombiana de mes de 30 días):
  -- 15 en una quincena y 30 en un mes completo, editables.
  dias_liquidados numeric(5,2) not null default 15
                  check (dias_liquidados >= 0 and dias_liquidados <= 31),

  -- Conceptos MANUALES del período (lo que digita el administrador):
  -- { bonificacion, auxilios, comisiones, prima, vacaciones, bonoCumplimiento,
  --   otrosDevengados, prestamos, otrosDescuentos, notas: { <clave>: texto } }
  conceptos      jsonb not null default '{}'::jsonb,

  estado         text not null default 'borrador'
                 check (estado in ('borrador', 'cerrada', 'pagada')),

  -- SNAPSHOT congelado al CERRAR (mismo patrón que jornadas.desglose de la
  -- 0004). NULL mientras está en borrador: entonces se calcula en vivo.
  snapshot       jsonb,
  calculado_at   timestamptz,

  fecha_pago     date,
  notas          text,
  creado_por     uuid references public.profiles (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint nomina_liquidaciones_fin_despues_inicio
    check (fecha_fin >= fecha_inicio),
  -- Una quincena SIEMPRE dice cuál es; un mes completo nunca lleva quincena.
  constraint nomina_liquidaciones_quincena_coherente check (
    (tipo = 'quincena' and quincena is not null)
    or (tipo = 'mes' and quincena is null)
  )
);

do $do$
begin
  comment on table public.nomina_liquidaciones is
    'Nómina de un empleado en un período (quincena o mes): conceptos manuales, estado y snapshot congelado del cálculo.';
  comment on column public.nomina_liquidaciones.conceptos is
    'Conceptos manuales del período que digita el administrador: bonificaciones, auxilios, comisiones, prima, vacaciones, bono de cumplimiento, otros devengados, préstamos y otros descuentos, con sus notas.';
  comment on column public.nomina_liquidaciones.estado is
    'borrador = se puede editar y recalcula en vivo · cerrada = congelada con su snapshot · pagada = cerrada y ya girada (con fecha_pago).';
  comment on column public.nomina_liquidaciones.snapshot is
    'Cálculo COMPLETO congelado al cerrar: horas por concepto, valores unitarios, devengados, descuentos, neto y la configuración aplicada. Reabrir a borrador lo borra.';
exception
  when others then
    raise notice 'No se pudieron escribir los comentarios de nomina_liquidaciones (%).', sqlerrm;
end;
$do$;

-- Una sola liquidación por empleado y período. `coalesce(quincena, 0)` permite
-- que el mes completo (quincena NULL) participe del índice único.
create unique index if not exists nomina_liquidaciones_periodo_key
  on public.nomina_liquidaciones (employee_id, anio, mes, tipo, coalesce(quincena, 0));

create index if not exists nomina_liquidaciones_empleado_idx
  on public.nomina_liquidaciones (employee_id);
create index if not exists nomina_liquidaciones_periodo_idx
  on public.nomina_liquidaciones (anio, mes);
create index if not exists nomina_liquidaciones_estado_idx
  on public.nomina_liquidaciones (estado);
create index if not exists nomina_liquidaciones_fechas_idx
  on public.nomina_liquidaciones (fecha_inicio, fecha_fin);

drop trigger if exists nomina_liquidaciones_set_updated_at on public.nomina_liquidaciones;
create trigger nomina_liquidaciones_set_updated_at
  before update on public.nomina_liquidaciones
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 3. RLS
-- =============================================================================

alter table public.nomina_config_mensual enable row level security;
alter table public.nomina_liquidaciones  enable row level security;

-- 3.1 `nomina_config_mensual` — SOLO managers ---------------------------------
drop policy if exists nomina_config_select_manager on public.nomina_config_mensual;
drop policy if exists nomina_config_insert_manager on public.nomina_config_mensual;
drop policy if exists nomina_config_update_manager on public.nomina_config_mensual;
drop policy if exists nomina_config_delete_manager on public.nomina_config_mensual;

create policy nomina_config_select_manager on public.nomina_config_mensual
  for select to authenticated using (public.is_manager());

create policy nomina_config_insert_manager on public.nomina_config_mensual
  for insert to authenticated with check (public.is_manager());

create policy nomina_config_update_manager on public.nomina_config_mensual
  for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy nomina_config_delete_manager on public.nomina_config_mensual
  for delete to authenticated using (public.is_manager());


-- 3.2 `nomina_liquidaciones` --------------------------------------------------
--   SELECT   : managers (todo) + el propio empleado, SOLO cerrada o pagada.
--   ESCRITURA: solo managers. El empleado nunca escribe su nómina.
drop policy if exists nomina_liquidaciones_select_manager on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_select_propia  on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_insert_manager on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_update_manager on public.nomina_liquidaciones;
drop policy if exists nomina_liquidaciones_delete_manager on public.nomina_liquidaciones;

create policy nomina_liquidaciones_select_manager on public.nomina_liquidaciones
  for select to authenticated using (public.is_manager());

-- El empleado ve SU nómina y solo cuando ya está cerrada o pagada: un borrador
-- todavía puede cambiar y enseñarlo sería prometer una cifra que no es.
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

create policy nomina_liquidaciones_insert_manager on public.nomina_liquidaciones
  for insert to authenticated with check (public.is_manager());

create policy nomina_liquidaciones_update_manager on public.nomina_liquidaciones
  for update to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy nomina_liquidaciones_delete_manager on public.nomina_liquidaciones
  for delete to authenticated using (public.is_manager());


-- =============================================================================
-- 4. PERMISOS DE ESQUEMA
--    `anon` no recibe NADA: la nómina es el dato más sensible del sistema.
-- =============================================================================

revoke all on table public.nomina_config_mensual from anon;
revoke all on table public.nomina_liquidaciones  from anon;

grant select, insert, update, delete on public.nomina_config_mensual to authenticated;
grant select, insert, update, delete on public.nomina_liquidaciones  to authenticated;

grant all on public.nomina_config_mensual to service_role;
grant all on public.nomina_liquidaciones  to service_role;


-- =============================================================================
-- 5. DATOS DE LA EMPRESA PARA EL VOLANTE DE PAGO (`site_settings.empresa`)
--
--    Razón social y NIT que se imprimen en el comprobante de nómina. Van en
--    `site_settings` y se editan en /admin/ajustes porque el NIT del volante
--    actual de GPI (901.638.649-7) NO coincide con el que aparece en los
--    documentos comerciales del proyecto (901.877.993-0): está PENDIENTE de
--    confirmar con el cliente, así que tiene que poder corregirse sin tocar
--    código. Se usa el del volante como valor inicial.
-- =============================================================================

insert into public.site_settings (key, value)
values (
  'empresa',
  jsonb_build_object(
    'razonSocial', 'GRUPO DE PROFESIONALES EN INGENIERÍA S.A.S. — GPI S.A.S.',
    'nit',         '901.638.649-7',
    'ciudad',      'Cali, Valle del Cauca',
    'notaVolante', 'Este comprobante se entrega impreso para firma de recibido.'
  )
)
on conflict (key) do nothing;


-- =============================================================================
-- 6. AVISO FINAL
-- =============================================================================

do $do$
declare
  v_config int;
  v_liq    int;
begin
  select count(*) into v_config from public.nomina_config_mensual;
  select count(*) into v_liq    from public.nomina_liquidaciones;
  raise notice 'Migración 0011 aplicada. Configuraciones de nómina: % · Liquidaciones: %. Se administra en /admin/nomina (admin y coordinador); cada empleado ve sus volantes cerrados en Mi Cuenta.',
    v_config, v_liq;
end;
$do$;


-- =============================================================================
-- FIN DE LA MIGRACIÓN
-- =============================================================================
