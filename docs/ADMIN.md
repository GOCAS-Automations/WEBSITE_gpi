# Panel de GPI (Mi Cuenta + /admin)

Guía para poner en marcha el backend (Supabase) y usar el panel de contenido,
la gestión de cuentas y el registro de jornadas (horas extra).

> **Lo importante en una línea:** el sitio público funciona igual con o sin
> Supabase. Sin las variables de entorno muestra el contenido estático de
> `src/data/`; con ellas, el contenido sale de la base de datos y se habilitan
> `/mi-cuenta` (login + portal del empleado) y `/admin` (panel).

---

## 1. Aplicar las migraciones en Supabase

Hay **seis** migraciones y se aplican **en orden**:

| Archivo | Qué añade |
| --- | --- |
| `supabase/migrations/0001_site_content.sql` | Contenido del sitio, `profiles`, RLS, bucket de imágenes y usuario administrador inicial |
| `supabase/migrations/0002_empleados_jornadas.sql` | Roles ampliados, visibilidad del contenido, tabla `jornadas` y ajustes de cálculo |
| `supabase/migrations/0003_horarios_mensuales.sql` | Horario laboral mes a mes (`horarios_mensuales`), cuentas por **usuario** (`username`, `cedula`, `email_contacto`) y ajuste del horario por defecto |
| `supabase/migrations/0004_congelar_desglose.sql` | Congela el desglose de horas al **aprobar** una jornada (`desglose`, `contexto_calculo`, `calculado_at`) para que los reportes de nómina no cambien después |
| `supabase/migrations/0005_proyectos_correo_orden.sql` | Correo del formulario de contacto (`contact.correoFormulario`), página propia por proyecto (`slug`, `gallery`, `details`) y orden de trabajo **opcional** en las jornadas |
| `supabase/migrations/0006_mensajes_contacto.sql` | Tabla `site_mensajes`: respaldo en base de datos de cada mensaje del formulario de `/contacto` |

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

### ¿Qué añade la 0005?

| Objeto | Para qué sirve |
| --- | --- |
| `site_settings.contact.correoFormulario` | El correo corporativo al que llega el formulario de `/contacto`. Valor inicial: `gpi.gerencia1@gmail.com`. Se edita en `/admin/ajustes` |
| Columna `site_projects.slug` (única) | La dirección de la página propia de cada proyecto: `/proyectos/<slug>` |
| Columna `site_projects.gallery` | Fotos adicionales de la página del proyecto (`[{ "url": "…", "alt": "…" }]`) |
| Columna `site_projects.details` | Descripción **larga** de la página del proyecto (si está vacía se usa la corta) |
| Textos y galería semilla | Descripción y descripción larga de los cuatro proyectos originales, y una segunda foto para «Montaje de planta piloto para fabricación de vaselina» |
| `jornadas.work_order` deja de ser obligatoria | Hay labores sin orden de trabajo asociada; el formulario ya no la exige |

> El `update` del correo hace **merge** del JSON de contacto: no toca teléfonos,
> correos, dirección ni redes, y si alguien ya cambió el correo desde el panel
> se respeta ese valor.
>
> Mientras la 0005 no esté aplicada, el sitio **no se rompe**: el formulario usa
> el correo por defecto, los cuatro proyectos conservan su dirección corta y su
> texto desde `src/data/projects.ts`, el panel reintenta guardar sin las
> columnas nuevas, y una jornada sin orden se guarda con el campo en blanco (que
> el panel lee igual como «Sin orden de trabajo»).

### ¿Qué añade la 0006?

| Objeto | Para qué sirve |
| --- | --- |
| Tabla `site_mensajes` | Una copia de cada mensaje del formulario de `/contacto`: `nombre`, `empresa`, `correo`, `mensaje`, `correo_destino`, `enviado` y `created_at` |
| Política `site_mensajes_select_manager` | **Única** política de la tabla: solo un manager autenticado puede leerla (pensando en una futura bandeja de mensajes en el panel) |

> **Por qué existe:** el formulario envía el correo de verdad, pero un envío
> puede fallar por cosas ajenas al sitio (la contraseña de aplicación de Google
> se vence, Gmail corta, el correo cae en spam). El mensaje se guarda **antes**
> de intentar el envío, así que el correo puede fallar pero el prospecto no se
> pierde. La columna `enviado` distingue los que sí salieron por correo de los
> que hay que responder a mano.
>
> **Seguridad:** la tabla **no tiene política de INSERT** ni para `anon` ni para
> `authenticated`, a propósito. Con una, cualquiera podría insertar filas contra
> la API REST de Supabase (la clave anónima es pública por diseño) sin pasar por
> el formulario ni por los filtros anti-robot. Las inserciones las hace el
> servidor con la clave `service_role`, que no pasa por RLS.
>
> Mientras la 0006 no esté aplicada el sitio funciona igual: el formulario envía
> el correo y solo se pierde el respaldo. En los registros del servidor queda un
> aviso (`La tabla site_mensajes no existe todavía…`) una vez por proceso.

### Si el bloque del usuario admin de la 0001 falla

Algunas versiones de Supabase no permiten insertar directamente en `auth.users`.
En ese caso:

1. Dashboard → **Authentication** → **Users** → **Add user**.
2. Correo `admin@cuentas.gpiprofesionales.com` (el sintético del usuario
   `admin`), la contraseña de abajo, y marca **Auto Confirm User**.
3. Vuelve al SQL Editor y ejecuta solo:

```sql
update public.profiles set role = 'admin', username = 'admin'
 where email = 'admin@cuentas.gpiprofesionales.com';
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
CONTACT_SMTP_USER=gpi.gerencia1@gmail.com
CONTACT_SMTP_PASS=abcdefghijklmnop
```

**Dónde encontrarlas:** las tres de Supabase, en el Dashboard →
**Settings** → **API Keys**. Las dos del correo, en la cuenta de Google (ver
[§13](#13-correo-del-formulario-de-contacto--envío-directo)).

| Variable | Valor | ¿Secreta? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Campo **Project URL** | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave **anon** / **publishable** | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **service_role** | **Sí** |
| `CONTACT_SMTP_USER` | Cuenta de Gmail desde la que sale el correo del formulario | No |
| `CONTACT_SMTP_PASS` | **Contraseña de aplicación** de esa cuenta (16 letras) | **Sí** |

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
| **Usuario** | `admin` (desde el 30 de julio; antes se ingresaba escribiendo el correo completo `admin@gpiprofesionales.com`) |
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

### A dónde aterriza cada rol al iniciar sesión

| Rol | Pantalla que ve al ingresar | Cómo llega a la otra |
| --- | --- | --- |
| **Administrador** y **Coordinador** | **`/admin`** — el panel es su pantalla principal de trabajo | Botón **"Registrar mi jornada"** en la barra superior del panel (y un enlace igual en el dashboard) |
| **Community Manager** | `/mi-cuenta` — su portal de jornadas | Banda **"Ir al panel"** arriba del portal |
| **Empleado** | `/mi-cuenta` — su portal de jornadas | No tiene panel |

El aterrizaje lo decide el **formulario de ingreso** (`src/app/mi-cuenta/LoginForm.tsx`)
según el rol; **no** es un redirect del servidor. Es decir: `/mi-cuenta` visitado
directamente **sigue mostrando el portal de jornadas a todos los roles**, incluidos
admin y coordinador, que es donde cambian su contraseña y registran sus propias
horas. Nadie queda encerrado en una sola pantalla.

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

Cualquier cuenta activa tiene su portal de jornadas en `/mi-cuenta`. Empleados y
Community Manager aterrizan ahí al ingresar; admin y coordinador entran al panel
y llegan al portal con **"Registrar mi jornada"** (ver *A dónde aterriza cada rol
al iniciar sesión*, en el apartado 4). Las cuentas con acceso al panel ven el
portal debajo del botón **"Ir al panel"**:

- **Registrar una jornada**: fecha del día laboral (por defecto hoy), número de
  orden de trabajo **(opcional)**, hora de inicio, hora de finalización,
  descripción de la labor y observaciones. Hay una casilla **"terminé al día
  siguiente"** para los turnos que cruzan la medianoche (si la hora de fin es
  anterior a la de inicio, el sistema lo detecta solo y avisa).
- **Orden de trabajo opcional** (migración 0005): si la labor no tiene una orden
  asociada, el campo se deja vacío y se guarda como `NULL`. En las aprobaciones,
  en «Mis jornadas», en la tabla del tablero y en el CSV de nómina aparece como
  **«Sin orden de trabajo»**, y la gráfica *Horas por orden de trabajo* agrupa
  esas jornadas bajo esa misma etiqueta —no las excluye—, para que la gráfica
  siga sumando el total de horas de la bandeja.
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
- **Los filtros se aplican al cambiarlos: ya no hay botón "Filtrar"**. Cada
  control reescribe los parámetros de la URL (`router.replace`) y el Server
  Component vuelve a consultar con ellos, así que el enlace sigue siendo
  compartible, el botón atrás funciona y la pestaña `?vista=aprobaciones` no se
  pierde. **"Limpiar"** sigue ahí: deja pendientes, todos los empleados y sin
  rango de fechas. La barra vive en
  `src/app/admin/jornadas/FiltrosAprobaciones.tsx` (el único trozo de cliente:
  la consulta se sigue haciendo en el servidor).
- Cada jornada muestra empleado, fecha, orden de trabajo, horario, duración,
  descripción, observaciones y el **desglose de horas** calculado.
- **Aprobar** (un clic, con confirmación) o **Rechazar** (exige escribir el
  motivo, que el empleado verá en su portal).
- **Volver a pendiente**: reabre una jornada ya revisada para corregir un error
  y, además, es la forma de **recalcular** una jornada aprobada.
- **Eliminar** (solo managers, en cualquier estado): borra la jornada de la base
  de datos. Ver abajo.

La pestaña **Métricas** (`?vista=metricas`) añade los KPIs, las gráficas, el
control semanal de horas extra y la exportación a CSV para nómina.

### Rechazar vs. eliminar una jornada

Son cosas distintas y la interfaz lo avisa antes de confirmar:

| | **Rechazar** | **Eliminar** |
| --- | --- | --- |
| Qué pasa con el registro | Se conserva, en estado *rechazada* | Desaparece de la base de datos |
| Qué ve el empleado | La jornada con **tu nota**, para corregirla | Nada: deja de verla en su historial |
| ¿Se puede deshacer? | Sí (*Volver a pendiente*) | **No** |
| Cuándo usarlo | Las horas o los datos están mal y el empleado debe corregirlos | Limpiar registros de **prueba, duplicados o creados por error** |

- Está disponible en **cualquier estado** (pendiente, aprobada o rechazada): es
  la herramienta del administrador para dejar la bandeja limpia.
- **Doble confirmación**, igual que al eliminar una cuenta: el botón *Eliminar*
  despliega un aviso rojo que explica la diferencia con *Rechazar*, y el botón
  *Sí, eliminar definitivamente* pide además la confirmación del navegador.
- Permisos: server action `deleteJornadaAsManager` en
  `src/app/admin/jornadas/actions.ts`, con `getManagerOrNull()` en el servidor,
  y la política RLS `jornadas_delete_manager` de la migración 0002 en la base de
  datos. Un empleado solo puede eliminar **sus** jornadas **pendientes**
  (`jornadas_delete_own`), como siempre.

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

**Columnas que aún no existen:** el mismo criterio se aplica campo a campo. Si
una migración está pendiente, la columna llega como `undefined` y se usa el dato
estático equivalente; si la columna **existe pero está vacía**, se respeta,
porque eso es una decisión de quien edita el panel. Es lo que hace que los
cuatro proyectos originales conserven su dirección corta
(`/proyectos/planta-piloto-vaselina`), su texto y su galería aunque la 0005
todavía no se haya aplicado.

**Renderizado:** las páginas usan ISR con `revalidate = 300` (5 minutos) y,
además, cada vez que guardas en `/admin` se llama a
`revalidatePath("/", "layout")` —y, al tocar un proyecto, también a
`revalidatePath("/proyectos/[slug]", "page")`—, así que los cambios se ven de
inmediato.

---

## 10. Qué se puede editar desde `/admin`

| Sección | Quién | Qué permite |
| --- | --- | --- |
| **Servicios** | contenido | CRUD completo: título, título de menú, slug, categoría, icono, orden, visibilidad, resumen, descripción, ítems, portada, galería y SEO |
| **Proyectos** | contenido | CRUD: título, cliente, **dirección web (slug)**, categoría, descripción corta, **descripción larga**, imagen, **galería**, orden y visibilidad. Cada proyecto tiene su propia página en `/proyectos/<slug>` |
| **Clientes** | contenido | CRUD: nombre, logo, sitio web, orden y visibilidad |
| **FAQ** | contenido | CRUD de preguntas y respuestas (alimentan el marcado FAQPage) + visibilidad |
| **Valores** | contenido | CRUD de valores corporativos + visibilidad |
| **Contacto y ajustes** | contenido | Visibilidad de secciones, dirección, coordenadas, teléfonos/WhatsApp, correos, **correo del formulario de contacto**, redes, horario, mapa, hero, banda EXCELENCIA y video de YouTube |
| **Equipo** | managers | Cuentas del portal: crear, editar, roles, activar/desactivar, contraseñas y eliminación |
| **Horarios** | managers | Horario laboral de cada mes (base de la jornada ordinaria y de las horas extra) |
| **Jornadas** | managers | Revisión de jornadas con desglose de horas: aprobar, rechazar, volver a pendiente y **eliminar** + tablero de métricas |

*"contenido" = admin, coordinador y Community Manager · "managers" = admin y
coordinador*

### El correo al que llega el formulario de contacto

`/admin/ajustes` → **Datos de contacto** → campo **"Correo del formulario de
contacto"** (valor inicial `gpi.gerencia1@gmail.com`).

- Es el buzón al que se dirige el formulario de la página `/contacto`. Se puede
  cambiar cuando GPI quiera y se aplica en minutos.
- **No sustituye a los correos de las tarjetas de contacto**: esos siguen siendo
  los de las personas (`xperea@…`, `ycamacho@…`) y se editan en la lista de
  correos, justo encima.
- El panel valida que tenga forma de correo; si se deja vacío se conserva el
  valor por defecto, para que el formulario nunca quede sin destinatario.

**Cómo se envía, técnicamente:** el servidor manda el correo por SMTP de Gmail
en cuanto el visitante pulsa el botón, y además guarda una copia del mensaje en
la base de datos. Todo el detalle —cómo generar la contraseña de aplicación,
dónde poner las variables y qué pasa si faltan— está en
[§13 · Correo del formulario de contacto](#13-correo-del-formulario-de-contacto--envío-directo).

### Los proyectos tienen su propia página

Desde la migración 0005 cada proyecto tiene página propia en
`/proyectos/<slug>`, como los servicios: cabecera con su foto, cliente y área,
descripción larga, galería, botón de contacto y navegación al proyecto anterior
y siguiente. En la página `/proyectos` la **tarjeta entera** es el enlace.

En `/admin/proyectos` eso se traduce en tres campos nuevos:

- **Dirección web (slug)**: se genera desde el título si se deja vacío.
  Cambiarlo cambia la dirección pública del proyecto.
- **Descripción larga**: el texto principal de la página. Si se deja vacía se
  usa la descripción corta. Los párrafos se separan con una línea en blanco.
- **Galería**: fotos adicionales que se muestran al final de la página.

### Imágenes

En cada campo de imagen puedes:

- **Subir un archivo** → se guarda en el bucket `site-images` de Supabase y el
  campo se rellena con su URL pública.
- **Pegar una URL** externa (`https://...`).
- **Escribir una ruta local** (`/images/servicios/in1.jpg`) para reutilizar las
  imágenes que ya vienen en `public/images`.

Siempre se muestra una vista previa.

### Navegación del panel

- Barra superior siempre visible con el rol de la sesión, **Registrar mi
  jornada** (lleva a `/mi-cuenta`), **Ver sitio** y **Cerrar sesión**.
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
4. Añade `CONTACT_SMTP_USER` y `CONTACT_SMTP_PASS`, también **sin** prefijo
   `NEXT_PUBLIC_` (ver [§13](#13-correo-del-formulario-de-contacto--envío-directo)).
5. Vuelve a desplegar (**Redeploy**): las variables `NEXT_PUBLIC_*` se incrustan
   en el build, y la página `/contacto` decide **en el build** si muestra el
   envío directo o el modo alternativo. Guardar las variables sin volver a
   desplegar no cambia nada.

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
- El **aterrizaje por rol tras el ingreso** (admin y coordinador → `/admin`) lo
  hace el cliente en `src/app/mi-cuenta/LoginForm.tsx` con `router.replace`. A
  propósito **no** es un redirect de servidor: `/mi-cuenta` debe seguir siendo
  accesible para todos los roles, y un redirect en esa ruta crearía un bucle con
  la redirección optimista de `/admin` del proxy.
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

---

## 13. Correo del formulario de contacto — envío directo

### Qué hace ahora

Cuando alguien llena el formulario de `/contacto` y pulsa **Enviar mensaje**:

1. El servidor comprueba los datos y pasa los filtros anti-robot.
2. **Guarda el mensaje** en la tabla `site_mensajes` (migración 0006).
3. **Envía el correo** al buzón de `/admin/ajustes` → *Correo del formulario de
   contacto*, con:
   - **Asunto**: *"Contacto desde el sitio web — [nombre] ([empresa])"*.
   - **Cuerpo**: nombre, empresa, correo, fecha en hora de Colombia y el
     mensaje, en texto plano y en HTML.
   - **Responder-a (`Reply-To`) = el correo del visitante**. Esto es lo más
     útil de todo: al pulsar *Responder* en Gmail, la respuesta le llega
     directamente al prospecto, no a la cuenta de GPI.
4. El visitante ve **"✅ Tu mensaje fue enviado"** sin salir de la página.

Antes se abría el programa de correo del visitante (`mailto:`). GPI reportó que
"no abre nada", que es exactamente lo que ocurre en un computador sin programa
de correo configurado — la situación de la mayoría de la gente hoy.

### Cómo generar la contraseña de aplicación de Google (una sola vez)

⚠️ **No es la contraseña normal de la cuenta.** Google no deja entrar por SMTP
con la contraseña de siempre: hay que crear una clave aparte, de 16 letras, que
solo sirve para enviar correo y se puede revocar sin tocar nada más.

1. Inicia sesión en Google con **gpi.gerencia1@gmail.com** (o la cuenta que se
   vaya a usar para enviar).
2. Activa la **verificación en dos pasos** —sin ella Google ni siquiera muestra
   la opción—:
   <https://myaccount.google.com/signinoptions/two-step-verification>
3. Entra a <https://myaccount.google.com/apppasswords>
4. En **Nombre de la aplicación** escribe `Sitio web GPI` → **Crear**.
5. Google muestra 16 letras en cuatro grupos (`abcd efgh ijkl mnop`). **Cópialas
   ya**: no se pueden volver a ver. Si se pierden, se borra esa contraseña y se
   crea otra. Los espacios dan igual, el código los quita.

### Dónde se ponen las variables

**En el computador (desarrollo)** — en `.env.local`:

```bash
CONTACT_SMTP_USER=gpi.gerencia1@gmail.com
CONTACT_SMTP_PASS=abcdefghijklmnop
```

**En Vercel (producción)** — *Settings → Environment Variables*, con esos
mismos nombres y **sin** el prefijo `NEXT_PUBLIC_` (son secretas: con ese
prefijo Next.js las incrustaría en el JavaScript que descarga el navegador).
Después, **Redeploy**: `/contacto` es una página estática y decide en el build
qué formulario mostrar.

| Variable | Qué es |
| --- | --- |
| `CONTACT_SMTP_USER` | La cuenta de Gmail **desde la que sale** el correo |
| `CONTACT_SMTP_PASS` | Su **contraseña de aplicación** de 16 letras |

El correo que **recibe** los mensajes no se configura aquí: se cambia desde el
panel, en `/admin/ajustes` → *Datos de contacto* → **Correo del formulario de
contacto**. Puede ser distinto del que envía, y cambiarlo **no** requiere tocar
variables ni volver a desplegar.

### Qué pasa si algo falla

| Situación | Qué ve el visitante |
| --- | --- |
| Todo bien | *"✅ Tu mensaje fue enviado. Te responderemos pronto al correo que nos dejaste."* |
| El correo falla pero el mensaje **sí** se guardó en `site_mensajes` | *"✅ Recibimos tu mensaje y ya está en nuestra bandeja."* — es la verdad: GPI lo tiene aunque el correo no saliera, así que no se le molesta con alternativas |
| El correo falla **y** no se pudo guardar | Mensaje amable + tres alternativas: **Gmail en el navegador**, **su programa de correo** y **WhatsApp** |
| Las variables `CONTACT_SMTP_*` no están puestas | El formulario cambia a **modo alternativo**: el botón principal abre el compositor de Gmail en el navegador con el mensaje ya escrito, y debajo quedan el programa de correo y WhatsApp. Aun así se guarda una copia en `site_mensajes` |

En todos los casos el mensaje **nunca desaparece en silencio**: o sale por
correo, o queda guardado, o el visitante recibe una vía alternativa clara.

### Filtros anti-robot (sin captcha ni servicios externos)

- **Campo trampa**: un campo oculto que una persona no ve ni puede enfocar. Si
  llega relleno, el mensaje se descarta y se responde *"éxito"* — un robot que
  recibe un error reintenta; uno que recibe éxito se va.
- **Tiempo mínimo**: entre que el formulario aparece y se envía tienen que pasar
  al menos **3 segundos**. Se miden con dos marcas del reloj del propio
  visitante, así que un computador con la hora mal puesta no descarta mensajes
  buenos.
- **Longitudes máximas** por campo (nombre 120, empresa 140, correo 200, mensaje
  4 000 caracteres).
- **Tope de 5 envíos cada 10 minutos por IP**, en memoria del servidor. Es una
  defensa modesta a propósito (no hay Redis ni servicios de terceros), pero
  evita que un robot llene la bandeja de GPI en un minuto.

### Dónde vive el código

| Pieza | Archivo |
| --- | --- |
| Envío por SMTP y redacción del correo | `src/lib/correo.ts` (**solo servidor**) |
| Server action: validación, anti-robot, guardado y envío | `src/app/contacto/actions.ts` |
| Tipos y textos compartidos (asunto, cuerpo, límites) | `src/lib/contacto-types.ts` |
| Formulario y sus tres modos | `src/components/sections/ContactForm.tsx` |
| Tabla de respaldo | `supabase/migrations/0006_mensajes_contacto.sql` |

> `nodemailer` es la única dependencia nueva del proyecto. Está declarada en
> `serverExternalPackages` (`next.config.ts`) porque es una librería de Node
> pura y empaquetarla con el resto del código de servidor la rompe.
- Si subes imágenes a Supabase, `next.config.ts` ya permite optimizar imágenes
  desde `**.supabase.co/storage/v1/object/public/**`.
