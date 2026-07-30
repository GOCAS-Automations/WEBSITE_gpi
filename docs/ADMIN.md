# Panel de GPI (Mi Cuenta + /admin)

Guía para poner en marcha el backend (Supabase) y usar el panel de contenido,
la gestión de cuentas y el registro de jornadas (horas extra).

> **Lo importante en una línea:** el sitio público funciona igual con o sin
> Supabase. Sin las variables de entorno muestra el contenido estático de
> `src/data/`; con ellas, el contenido sale de la base de datos y se habilitan
> `/mi-cuenta` (login + portal del empleado) y `/admin` (panel).

---

## 1. Aplicar las migraciones en Supabase

Hay **cuatro** migraciones y se aplican **en orden**:

| Archivo | Qué añade |
| --- | --- |
| `supabase/migrations/0001_site_content.sql` | Contenido del sitio, `profiles`, RLS, bucket de imágenes y usuario administrador inicial |
| `supabase/migrations/0002_empleados_jornadas.sql` | Roles ampliados, visibilidad del contenido, tabla `jornadas` y ajustes de cálculo |
| `supabase/migrations/0003_horarios_mensuales.sql` | Horario laboral mes a mes (`horarios_mensuales`), cuentas por **usuario** (`username`, `cedula`, `email_contacto`) y ajuste del horario por defecto |
| `supabase/migrations/0004_congelar_desglose.sql` | Congela el desglose de horas al **aprobar** una jornada (`desglose`, `contexto_calculo`, `calculado_at`) para que los reportes de nómina no cambien después |

Para cada una:

1. Entra al Dashboard de Supabase → proyecto **GPI Project**.
2. Menú lateral → **SQL Editor** → **New query**.
3. Abre el archivo del repo, copia **todo** su contenido y pégalo en el editor.
4. Pulsa **Run** y revisa los `NOTICE` del panel de resultados.

Ambas son **idempotentes**: puedes volver a ejecutarlas sin duplicar datos.

### ¿Qué crea la 0001?

| Objeto | Para qué sirve |
| --- | --- |
| `site_services` | Los 11 servicios (slug, categoría, ítems, imágenes, SEO, orden) |
| `site_projects` | Proyectos realizados |
| `site_clients` | Logos de clientes |
| `site_faqs` | Preguntas frecuentes |
| `site_values` | Valores corporativos |
| `site_settings` | Contacto, hero, banda EXCELENCIA y video de YouTube |
| `profiles` | Un perfil por usuario, con su rol |
| Bucket `site-images` | Imágenes subidas desde el panel (lectura pública) |

El seed carga **todo el contenido actual del sitio**: después de ejecutarla
verás exactamente lo mismo que ahora, pero ya editable.

### ¿Qué añade la 0002?

| Objeto | Para qué sirve |
| --- | --- |
| Roles ampliados en `profiles` | `admin`, `coordinador`, `marketing`, `empleado` (las filas viejas con `employee` se migran a `empleado`) |
| Columnas `active`, `cargo`, `phone` | Estado de la cuenta y datos del empleado |
| `is_content_editor()` / `is_manager()` | Funciones que usan las políticas RLS |
| Columna `published` en las 5 tablas de contenido | Ocultar ítems del sitio sin borrarlos |
| Tabla `jornadas` | Registro de jornadas y horas extra, con flujo de aprobación |
| Ajuste `visibility` | Interruptores de secciones completas del sitio |
| Ajuste `jornada_config` | Parámetros de cálculo de horas y recargos |

### ¿Qué añade la 0003?

| Objeto | Para qué sirve |
| --- | --- |
| Tabla `horarios_mensuales` | El horario laboral de GPI **mes a mes**. De aquí sale la jornada ordinaria de cada día |
| Seed de julio y agosto de 2026 | El horario base confirmado por GPI (42 h semanales netas) |
| Columnas `username`, `cedula`, `email_contacto` en `profiles` | Las cuentas se identifican por **usuario**, no por correo |
| Índice único de `username` | Dos personas no pueden tener el mismo usuario |
| Trigger `handle_new_user` actualizado | Guarda usuario, cédula y correo de contacto al crear la cuenta |
| `jornada_config.horarioSemanal` | Horario **por defecto** para crear meses nuevos |

> Mientras la 0003 no esté aplicada, el sitio **no se rompe**: el cálculo usa el
> horario predeterminado de GPI, `/admin/horarios` avisa de que el mes no se
> pudo guardar y las cuentas siguen identificándose por su correo.

### ¿Qué añade la 0004?

| Objeto | Para qué sirve |
| --- | --- |
| Columna `jornadas.desglose` | El desglose de horas **congelado** al aprobar (minutos por categoría + banderas de dominical/festivo) |
| Columna `jornadas.contexto_calculo` | Respaldo de auditoría: el horario del día aplicado, la franja nocturna, los porcentajes de recargo y los topes vigentes al aprobar |
| Columna `jornadas.calculado_at` | Cuándo se congeló el cálculo |
| Índice `jornadas_aprobadas_sin_snapshot_idx` | Para localizar rápido las jornadas aprobadas *antes* de la 0004, que se siguen calculando en vivo |

> Mientras la 0004 no esté aplicada el portal funciona **exactamente como
> antes**: el desglose se calcula en vivo en cada consulta, y aprobar, rechazar,
> reabrir y editar jornadas reintentan la escritura sin las columnas nuevas.
> Ver [§7 · Congelar el desglose al aprobar](#congelar-el-desglose-al-aprobar).

### Si el bloque del usuario admin de la 0001 falla

Algunas versiones de Supabase no permiten insertar directamente en `auth.users`.
En ese caso:

1. Dashboard → **Authentication** → **Users** → **Add user**.
2. Correo `admin@gpiprofesionales.com`, la contraseña de abajo, y marca
   **Auto Confirm User**.
3. Vuelve al SQL Editor y ejecuta solo:

```sql
update public.profiles set role = 'admin'
 where email = 'admin@gpiprofesionales.com';
```

---

## 2. Variables de entorno

Copia la plantilla y rellena los valores:

```bash
cp .env.example .env.local
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

**Dónde encontrarlas:** Dashboard de Supabase → **Settings** → **API Keys**

| Variable | Valor | ¿Secreta? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Campo **Project URL** | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave **anon** / **publishable** | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **service_role** | **Sí** |

### Sobre `SUPABASE_SERVICE_ROLE_KEY`

- Se necesita **solo** para gestionar cuentas desde `/admin/empleados`: crear
  usuarios, restablecer contraseñas y eliminar cuentas (usan la *Auth Admin API*
  de Supabase, que no funciona con la clave anónima).
- **Salta todas las políticas RLS.** Nunca le pongas el prefijo `NEXT_PUBLIC_`
  ni la importes desde código de cliente. En el proyecto solo la lee
  `src/lib/supabase/admin.ts`, que además lanza un error si alguien intenta
  usarlo en el navegador.
- Si no está configurada, el panel **no se rompe**: la sección Equipo muestra un
  aviso explicando qué falta, y se pueden seguir viendo y editando las cuentas
  existentes.
- En Vercel: **Settings → Environment Variables**, añádela **sin** el prefijo
  `NEXT_PUBLIC_`.

`.env.local` está ignorado por git (`.gitignore` ignora `.env*` y solo versiona
`.env.example`).

Después de crear o cambiar el archivo, reinicia `npm run dev`.

---

## 3. Cómo se ingresa: usuario y contraseña

El equipo de GPI **no tiene correo corporativo**, así que el portal se usa con
un **usuario** (por ejemplo `mgomez`), no con un correo electrónico.

Por debajo, Supabase Auth sí exige un correo: el sistema crea uno **sintético
interno** que nadie necesita conocer —
`mgomez@cuentas.gpiprofesionales.com`— y que **no recibe correo**. El correo
real de la persona, si lo tiene, se guarda aparte como *correo de contacto* y es
solo informativo.

En el formulario de ingreso:

- Si escribes algo **sin `@`** → se toma como usuario del portal.
- Si escribes algo **con `@`** → se usa tal cual (así siguen entrando las
  cuentas antiguas creadas con un correo real).

### Credenciales iniciales del administrador

| | |
| --- | --- |
| **Usuario** | `admin@gpiprofesionales.com` (cuenta antigua: se escribe el correo completo) |
| **Contraseña** | `Kt7#mQx4-Rv9zBp2` |

Se entra por **`/mi-cuenta`** ("Mi Cuenta" en la barra de navegación).

Cambia la contraseña después del primer ingreso: desde el propio portal o desde
el Dashboard (Authentication → Users → **Reset password**).

### Contraseñas generadas

Las contraseñas que genera el panel tienen formato **`Palabra-Palabra##`**
(`Sol-Andes42`, `Rio-Cumbre07`): son fáciles de **dictar por teléfono** o pegar
en un mensaje, que es como se entregan al personal de campo. Son temporales: la
persona debería cambiarlas al entrar.

---

## 4. Roles y permisos

Cada usuario tiene un rol en `profiles`. Esto es lo que puede hacer cada uno:

| | Administrador | Coordinador | Community Manager | Empleado |
| --- | :---: | :---: | :---: | :---: |
| Entrar a `/admin` | ✅ | ✅ | ✅ | ❌ |
| Contenido del sitio (servicios, proyectos, clientes, FAQ, valores, ajustes) | ✅ | ✅ | ✅ | ❌ |
| Subir imágenes al bucket | ✅ | ✅ | ✅ | ❌ |
| Equipo y cuentas (`/admin/empleados`) | ✅ | ✅ ¹ | ❌ | ❌ |
| Horario del mes (`/admin/horarios`) | ✅ | ✅ | ❌ | ❌ |
| Aprobar/rechazar jornadas y métricas (`/admin/jornadas`) | ✅ | ✅ | ❌ | ❌ |
| Registrar **sus propias** jornadas en `/mi-cuenta` | ✅ ² | ✅ ² | ✅ ² | ✅ |

> **Community Manager** es el nombre visible del rol que en la base de datos se
> llama `marketing` (el valor interno no cambió). Edita todo el contenido del
> sitio; **no** gestiona empleados ni las jornadas de otros.

¹ Un **coordinador** puede gestionar cuentas de coordinador, Community Manager y
empleado, pero **no** puede crear administradores ni editar, restablecer la
contraseña o eliminar la cuenta de un administrador. Eso solo lo hace un admin.

² Desde julio de 2026, **cualquier cuenta activa** ve su portal de jornadas en
`/mi-cuenta` (registrar jornada + mis jornadas). Quien además tiene acceso al
panel ve arriba un botón **"Ir al panel"**. El Community Manager también es
empleado de GPI, así que registra sus horas como cualquier otra persona.

Reglas adicionales que aplica el servidor:

- Nadie puede **desactivarse**, **cambiarse el rol** ni **eliminarse** a sí mismo.
- Una cuenta con `active = false` **no puede iniciar sesión** ni usar el portal;
  conserva su historial de jornadas.

La verificación es siempre **de servidor**: el layout de `/admin`, cada página
de sección y **cada server action** vuelven a comprobar el rol. El menú lateral
solo *oculta* lo que no corresponde, no es una barrera de seguridad.

---

## 5. Equipo y cuentas — `/admin/empleados`

Solo para **admin** y **coordinador**.

### Crear una cuenta

1. **Nueva cuenta** → nombre completo, **usuario**, rol, cédula, cargo,
   teléfono y correo de contacto. Solo el nombre, el usuario y el rol son
   obligatorios.
2. El **usuario** debe ir en minúsculas, sin espacios ni tildes (3 a 32
   caracteres; se permiten números, punto, guion y guion bajo). Es único: si ya
   existe, el panel lo avisa.
3. Al guardar, el sistema **genera una contraseña fácil de dictar** y muestra
   **una sola vez** las credenciales completas, con un botón de copiar:

   > **Usuario:** mgomez · **Contraseña:** Sol-Andes42

4. Compártelas con la persona. Podrá cambiar la contraseña desde **Mi Cuenta**.

> La contraseña no se puede volver a consultar (Supabase guarda solo su hash).
> Si se pierde, se restablece desde la ficha de la persona.

### Gestionar una cuenta

En la ficha de cada persona puedes:

- **Editar** nombre, rol, cédula, cargo, teléfono y correo de contacto. El
  **usuario no se puede cambiar** (es la identidad de la cuenta): si hace falta
  otro, se crea una cuenta nueva.
- **Activar / desactivar** el acceso. Desactivar es lo recomendado cuando
  alguien deja de trabajar en GPI: no puede entrar, pero se conserva su
  historial de jornadas.
- **Restablecer la contraseña**: genera una nueva y la muestra una sola vez.
- **Eliminar la cuenta** (zona de peligro): borra también **todas sus
  jornadas**. Exige escribir el usuario exacto y confirmar en el navegador.

---

## 6. Horario laboral del mes — `/admin/horarios`

Solo para **admin** y **coordinador**.

GPI define su jornada **mes a mes** (a veces cambia). Esta sección es la fuente
de verdad de **qué cuenta como jornada ordinaria**: todo lo que se trabaje por
encima del horario del mes se calcula como hora extra.

### Horario predeterminado (confirmado por GPI)

| Días | Horario | Almuerzo | Jornada neta |
| --- | --- | :---: | :---: |
| Lunes a jueves | 8:00 a. m. – 5:30 p. m. | 1 h | 8,5 h |
| Viernes | 8:00 a. m. – 5:00 p. m. | 1 h | 8 h |
| Sábado y domingo | No laborales | — | — |
| **Total semanal** | | | **42 h** |

El almuerzo **no cuenta como trabajo**: la jornada de cada día es
*salida − entrada − almuerzo*.

### Cómo se usa la pantalla

- **Selector de mes** con flechas ← → arriba (el mes viaja en la URL, así que
  el enlace se puede compartir).
- Si el mes **no existe todavía**, se crea al entrar: clonando el **mes
  anterior** si está cargado o, si no, con el **horario predeterminado**. La
  pantalla lo avisa: *"Se creó el horario de agosto de 2026 a partir de julio de
  2026; ajústalo si cambió"*.
- Tabla de lunes a domingo con, por cada día: interruptor **laboral / no
  laboral**, hora de entrada, hora de salida y horas de almuerzo (se puede poner
  media hora).
- Las celdas **"Horas de jornada"** y **"Total de horas semanales"** se
  recalculan solas mientras editas (son las celdas amarillas del Excel que usaba
  GPI).
- **Guardar** aplica el horario al cálculo de las horas de ese mes.
  **Restablecer al horario predeterminado** vuelve a cargar el horario base en
  la tabla; hay que pulsar Guardar para aplicarlo.
- **Nota del mes** (opcional): para recordar por qué cambió el horario.

Si un mes no está cargado en la base de datos, el cálculo usa el horario
predeterminado: el portal nunca se rompe.

---

## 7. Jornadas y horas extra

### El empleado — portal en `/mi-cuenta`

Al iniciar sesión, cualquier cuenta activa ve su portal de jornadas (las cuentas
con acceso al panel lo ven debajo del botón **"Ir al panel"**):

- **Registrar una jornada**: fecha del día laboral (por defecto hoy), número de
  orden de trabajo, hora de inicio, hora de finalización, descripción de la
  labor y observaciones. Hay una casilla **"terminé al día siguiente"** para los
  turnos que cruzan la medianoche (si la hora de fin es anterior a la de inicio,
  el sistema lo detecta solo y avisa).
- **Vista previa en vivo** del desglose de horas mientras llena el formulario.
- **Mis jornadas**: historial con el estado de cada una
  (*pendiente* / *aprobada* / *rechazada*) y la nota del revisor si la hay.
  Puede **editar o eliminar** solo las que sigan **pendientes**.
- **Mi contraseña**: cambiarla por una que recuerde.

Estos son los mismos campos del Google Form que usaba GPI, mejor organizados.

### El coordinador — aprobaciones en `/admin/jornadas`

Solo para **admin** y **coordinador**.

- Lista ordenada por fecha (más reciente primero) con filtros de **estado**,
  **empleado** y **rango de fechas**. Por defecto muestra las pendientes.
- Cada jornada muestra empleado, fecha, orden de trabajo, horario, duración,
  descripción, observaciones y el **desglose de horas** calculado.
- **Aprobar** (un clic, con confirmación) o **Rechazar** (exige escribir el
  motivo, que el empleado verá en su portal).
- **Volver a pendiente**: reabre una jornada ya revisada para corregir un error
  y, además, es la forma de **recalcular** una jornada aprobada.

La pestaña **Métricas** (`?vista=metricas`) añade los KPIs, las gráficas, el
control semanal de horas extra y la exportación a CSV para nómina.

### Congelar el desglose al aprobar

El problema que resuelve: hasta la migración 0004, el desglose de horas se
**recalculaba en cada consulta** a partir del horario del mes y de los recargos.
Si en septiembre alguien corregía el horario de julio, cambiaban los reportes de
jornadas de julio **ya aprobadas y pagadas**. Inaceptable para nómina.

Desde la 0004:

| Acción | Qué pasa con el cálculo |
| --- | --- |
| El empleado **registra** o **edita** una jornada pendiente | No hay nada congelado: sus horas se calculan en vivo y cambian si se ajusta el horario del mes |
| Un manager **aprueba** | Se calcula **una vez** con el horario y los recargos vigentes y se guarda en `desglose` + `contexto_calculo` + `calculado_at`. A partir de ahí esa jornada muestra siempre lo mismo |
| Un manager **rechaza** | No se congela nada (una jornada rechazada no es válida para nómina) y se limpia cualquier snapshot previo |
| Un manager **devuelve a pendiente** | Se **borra** el snapshot: la jornada vuelve a calcularse en vivo. Es el mecanismo legítimo para recalcular una jornada cuyo horario estaba mal |

Dónde se ve, en lenguaje de usuario:

- En **aprobaciones** y en **Mis jornadas**, una jornada congelada lleva la
  marca *«Cálculo congelado»* y, al pasar el cursor o al pie del desglose, la
  frase completa: *«Cálculo congelado el 28/07/2026 con el horario de julio de
  2026 (Lunes a jueves 08:00–17:30 · Viernes 08:00–17:00; 1 h de almuerzo).
  Cambiar después el horario del mes o los recargos ya no altera esta
  jornada.»*
- En **`/admin/horarios`**, un aviso explica que lo que se cambie ahí afecta a
  las jornadas **pendientes** y que las **aprobadas** conservan su cálculo.
- En el **tablero de métricas**, la nota de los filtros y el glosario lo dicen,
  y el **CSV** trae una columna `Cálculo` con `Congelado el dd/mm/aaaa` o
  `Provisional`.

Detalles técnicos:

- La lectura está centralizada en **`obtenerDesglose()`**
  (`src/lib/jornada.ts`): devuelve `{ desglose, congelado, contexto,
  calculadoEn }` usando el snapshot si existe y calculando en vivo si no. Pasan
  por ahí las aprobaciones, `construirMetrica()` (KPIs, gráficas, control
  semanal y CSV) y el historial del empleado. La única excepción es la vista
  previa del formulario, donde todavía no hay fila en la base de datos.
- **Las jornadas aprobadas antes de la 0004 no se rellenan hacia atrás**: se
  siguen calculando en vivo (inventar un `calculado_at` que nunca ocurrió
  falsearía la auditoría). Se congelan solas si un manager las devuelve a
  pendiente y las vuelve a aprobar.
- Un empleado solo puede escribir en sus jornadas *pendientes*, y al aprobar el
  servidor **siempre** sobrescribe el snapshot con su propio cálculo: nadie
  puede inyectar cifras a mano.

### Cómo se calculan las horas

La lógica vive en `src/lib/jornada.ts` (función pura `calcularJornada`) y se usa
en los tres sitios: vista previa del empleado, aprobaciones y tablero de
métricas. Trabaja siempre con la **hora de Colombia** (UTC-5 fijo), así que el
resultado es idéntico en el navegador, en el servidor y en la base de datos.

> Ojo: sobre una jornada **ya guardada** nadie llama a `calcularJornada`
> directamente, sino a `obtenerDesglose()`, que respeta el desglose congelado de
> las jornadas aprobadas (ver arriba).

El procedimiento, paso a paso:

1. **Se busca el horario del mes** en que se trabajó (`/admin/horarios`) y se
   toma el día de la semana. La **jornada ordinaria neta** de ese día es
   *salida − entrada − almuerzo*.
2. **Se descuenta el almuerzo** del turno registrado (ver la regla de abajo).
3. Lo trabajado **hasta** la jornada ordinaria son horas ordinarias; **el
   exceso** son horas extra.
4. Cada minuto se clasifica además según si cae en la **franja nocturna** y si
   es **domingo, festivo nacional o día marcado como no laboral** — en total,
   las mismas ocho categorías de siempre.

> **Días no laborales y festivos.** Si el día está apagado en el horario del mes
> (sábado y domingo, por defecto) o es festivo nacional, la jornada ordinaria de
> ese día es **cero**: todo el turno se paga como extra con el recargo
> dominical/festivo.

#### ⚠️ Regla del almuerzo — pendiente de confirmar con GPI

El horario del mes dice cuántas horas de almuerzo tiene cada día, pero el
empleado solo registra su **hora de entrada** y su **hora de salida**. Para
saber si dentro de ese rango hubo almuerzo se aplica esta regla pragmática:

- En un **día laboral**, si el turno dura **más de 6 horas** se descuenta el
  almuerzo de ese día (normalmente 1 hora).
- En turnos de **6 horas o menos**, no se descuenta nada.
- En **días no laborales o festivos**, tampoco: todo el tiempo es trabajo con
  recargo.

El almuerzo se ubica en el centro del tramo ordinario del turno (empezando a las
8:00 a. m. cae alrededor del mediodía), lo que solo afecta a si esos minutos se
consideran diurnos o nocturnos, no a cuántos son.

**GPI debe confirmar o ajustar esta regla.** La alternativa sería pedirle al
empleado que registre la hora exacta de su almuerzo, lo que complica el
formulario; se optó por la regla automática.

Ejemplo con el horario base: un lunes de **8:00 a. m. a 7:00 p. m.** son 11
horas de presencia − 1 hora de almuerzo = **10 horas trabajadas**, de las cuales
**8,5 son ordinarias** y **1,5 son extra diurnas** (el reloj de las extras
empieza a las 5:30 p. m.).

#### Parámetros ajustables

Los recargos y los topes están en el ajuste `jornada_config` de `site_settings`:

```json
{
  "horarioSemanal": { "lun": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 }, "...": "..." },
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
}
```

- `horarioSemanal` es el horario **por defecto**: se usa para crear meses nuevos
  y como red de seguridad si un mes no está cargado. El horario que manda en el
  cálculo es el de `horarios_mensuales` (sección **Horarios** del panel).
- `jornadaOrdinariaInicio`, `jornadaOrdinariaFin` y `horasOrdinariasDia` quedan
  como **legado informativo**: ya no intervienen en el cálculo.

> ⚠️ Los porcentajes de recargo son los de la normativa laboral colombiana
> vigente en 2026. **GPI debe confirmar sus propias reglas.** Para cambiarlos,
> edita esa fila en el SQL Editor de Supabase; el código cae en los mismos
> valores por defecto si la clave no existe, así que el portal nunca se rompe.

**Festivos**: la lista de festivos nacionales de **2026** está en
`FESTIVOS_COLOMBIA` dentro de `src/lib/jornada.ts` y hay que **ampliarla cada
año**. Mientras un año no esté en la tabla, el cálculo sigue funcionando: solo
los domingos cuentan como día de recargo dominical.

---

## 8. Visibilidad del contenido

Dos niveles, ambos disponibles para admin, coordinador y marketing:

### Por ítem — interruptor "Visible / Oculto"

Servicios, proyectos, clientes, preguntas frecuentes y valores tienen un
interruptor en su formulario y una etiqueta de estado en la lista. Al ocultar un
ítem desaparece del sitio público, pero **no se borra** y se sigue editando
desde el panel.

Se apoya en la columna `published`: la política RLS de anon solo devuelve
`published = true`, y `src/lib/content.ts` vuelve a filtrar por si acaso.

### Por sección — `/admin/ajustes` → "Visibilidad de secciones"

| Interruptor | Qué apaga |
| --- | --- |
| Valores corporativos | Bloque "Nuestros valores" en el inicio y en Nosotros |
| Clientes | Banda de logos de clientes en el inicio |
| Video corporativo | Video de YouTube en Nosotros |
| Preguntas frecuentes | Acordeón de FAQ en Nosotros (y su marcado FAQPage) |

Se guardan en el ajuste `visibility` de `site_settings`. Todo está encendido por
defecto: el sitio se ve completo salvo que alguien apague algo a propósito.

---

## 9. Cómo funciona el fallback estático

Toda página pública pide sus datos a `src/lib/content.ts`:

1. Si **no hay** variables de entorno → devuelve los datos de `src/data/*`.
2. Si **hay** variables → consulta Supabase; ante un error de red, un error de
   permisos o una tabla vacía, **vuelve automáticamente** a los datos estáticos.

Consecuencias prácticas:

- El sitio nunca se cae por un problema de base de datos.
- Se puede desplegar en Vercel antes de configurar Supabase.
- Si borras todos los servicios desde el panel, la web volverá a mostrar los 11
  originales (el fallback se activa con tabla vacía). En cambio, si los
  **ocultas** uno a uno, sí desaparecen: ocultar es una decisión explícita y el
  fallback no la pisa.

**Renderizado:** las páginas usan ISR con `revalidate = 300` (5 minutos) y,
además, cada vez que guardas en `/admin` se llama a
`revalidatePath("/", "layout")`, así que los cambios se ven de inmediato.

---

## 10. Qué se puede editar desde `/admin`

| Sección | Quién | Qué permite |
| --- | --- | --- |
| **Servicios** | contenido | CRUD completo: título, título de menú, slug, categoría, icono, orden, visibilidad, resumen, descripción, ítems, portada, galería y SEO |
| **Proyectos** | contenido | CRUD: título, cliente, categoría, descripción, imagen, orden y visibilidad |
| **Clientes** | contenido | CRUD: nombre, logo, sitio web, orden y visibilidad |
| **FAQ** | contenido | CRUD de preguntas y respuestas (alimentan el marcado FAQPage) + visibilidad |
| **Valores** | contenido | CRUD de valores corporativos + visibilidad |
| **Contacto y ajustes** | contenido | Visibilidad de secciones, dirección, coordenadas, teléfonos/WhatsApp, correos, redes, horario, mapa, hero, banda EXCELENCIA y video de YouTube |
| **Equipo** | managers | Cuentas del portal: crear, editar, roles, activar/desactivar, contraseñas y eliminación |
| **Horarios** | managers | Horario laboral de cada mes (base de la jornada ordinaria y de las horas extra) |
| **Jornadas** | managers | Revisión y aprobación de jornadas con desglose de horas + tablero de métricas |

*"contenido" = admin, coordinador y Community Manager · "managers" = admin y
coordinador*

### Imágenes

En cada campo de imagen puedes:

- **Subir un archivo** → se guarda en el bucket `site-images` de Supabase y el
  campo se rellena con su URL pública.
- **Pegar una URL** externa (`https://...`).
- **Escribir una ruta local** (`/images/servicios/in1.jpg`) para reutilizar las
  imágenes que ya vienen en `public/images`.

Siempre se muestra una vista previa.

### Navegación del panel

- Barra superior siempre visible con el rol de la sesión, **Ver sitio** y
  **Cerrar sesión**.
- Menú lateral en escritorio y tabs desplazables en móvil, con la sección activa
  resaltada. Las secciones internas (Equipo, Horarios, Jornadas) solo aparecen
  para managers.
- Cada sección tiene breadcrumb y botón **← Volver al dashboard**; los
  formularios de crear/editar añaden **← Volver a [sección]**.

---

## 11. Despliegue en Vercel

1. Vercel → proyecto → **Settings** → **Environment Variables**.
2. Añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los
   mismos valores del `.env.local`, marcando **Production**, **Preview** y
   **Development**.
3. Añade `SUPABASE_SERVICE_ROLE_KEY` **sin** prefijo `NEXT_PUBLIC_`.
4. Vuelve a desplegar (**Redeploy**): las variables `NEXT_PUBLIC_*` se incrustan
   en el build, así que no basta con guardarlas.

Si no configuras las variables en Vercel, el sitio se despliega igual y muestra
el contenido estático; `/mi-cuenta` mostrará el aviso de "próximamente" y
`/admin` redirigirá allí.

---

## 12. Notas técnicas

- `src/proxy.ts` (el `middleware` de Next.js 16) refresca la sesión de Supabase
  y hace una redirección optimista de `/admin` a `/mi-cuenta`. Solo corre sobre
  las rutas del portal, para no afectar al cacheado del sitio público.
- La verificación **autoritativa** de rol vive en `src/app/admin/layout.tsx`, en
  cada página de sección (`requireManager`) y en **cada server action**
  (`getContentEditorOrNull` / `getManagerOrNull` / `getActiveSession`).
- Módulos clave:
  - `src/lib/roles.ts` — roles, etiquetas y helpers (módulo puro).
  - `src/lib/usuarios.ts` — usuario ↔ correo sintético del portal (módulo puro).
  - `src/lib/horarios.ts` — horarios mensuales, jornada neta por día y totales
    semanales (módulo puro).
  - `src/lib/supabase/auth.ts` — sesión, perfil y guardas de servidor.
  - `src/lib/supabase/admin.ts` — cliente service-role y generador de contraseñas
    (**solo servidor**).
  - `src/lib/jornada.ts` — cálculo de horas, festivos, formateo y la **regla de
    lectura del desglose congelado** `obtenerDesglose()` (módulo puro).
  - `src/lib/admin.ts` — lecturas del panel, incluido `getMapaHorarios()` y el
    autocreado de meses (`asegurarHorarioMensual`).
- **Textos de ayuda del panel**: los reutilizados viven como constantes en
  `src/components/admin/ui.tsx` (`AYUDA_PUBLICACION`, `AYUDA_ORDEN`,
  `AYUDA_VISIBILIDAD`, `AYUDA_ALT`, `AYUDA_IMAGEN`) para que digan siempre lo
  mismo. Los componentes de ayuda son `AyudaSeccion` (nota corta con icono) y
  `AyudaDesplegable` (`<details>` nativo, para lo largo); en el tablero de
  métricas se usa además `InfoTooltip` de
  `src/components/jornadas/dashboard-ui.tsx`.
- `/mi-cuenta` y `/admin` llevan `robots: noindex` y están fuera del
  `sitemap.xml`, además de estar en `Disallow` dentro de `robots.txt`.
- Si subes imágenes a Supabase, `next.config.ts` ya permite optimizar imágenes
  desde `**.supabase.co/storage/v1/object/public/**`.
