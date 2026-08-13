# Panel de GPI (Mi Cuenta + /admin)

Guía para poner en marcha el backend (Supabase) y usar el panel de contenido,
la gestión de cuentas y el registro de jornadas (horas extra).

> **Lo importante en una línea:** el sitio público funciona igual con o sin
> Supabase. Sin las variables de entorno muestra el contenido estático de
> `src/data/`; con ellas, el contenido sale de la base de datos y se habilitan
> `/mi-cuenta` (login + portal del empleado) y `/admin` (panel).

---

## 1. Aplicar las migraciones en Supabase

> ✅ **Estado actual: las ocho migraciones YA ESTÁN APLICADAS en el proyecto
> "GPI Project" de Supabase** (se aplicaron y verificaron entre el 27 de julio
> y el 12 de agosto de 2026). Esta sección NO es una lista de tareas
> pendientes: es la referencia de qué hace cada migración y el procedimiento
> por si algún día hubiera que montar el proyecto en un Supabase nuevo.

Hay **ocho** migraciones y se aplican **en orden**:

| Archivo | Qué añade |
| --- | --- |
| `supabase/migrations/0001_site_content.sql` | Contenido del sitio, `profiles`, RLS, bucket de imágenes y usuario administrador inicial |
| `supabase/migrations/0002_empleados_jornadas.sql` | Roles ampliados, visibilidad del contenido, tabla `jornadas` y ajustes de cálculo |
| `supabase/migrations/0003_horarios_mensuales.sql` | Horario laboral mes a mes (`horarios_mensuales`), cuentas por **usuario** (`username`, `cedula`, `email_contacto`) y ajuste del horario por defecto |
| `supabase/migrations/0004_congelar_desglose.sql` | Congela el desglose de horas al **aprobar** una jornada (`desglose`, `contexto_calculo`, `calculado_at`) para que los reportes de nómina no cambien después |
| `supabase/migrations/0005_proyectos_correo_orden.sql` | Correo del formulario de contacto (`contact.correoFormulario`), página propia por proyecto (`slug`, `gallery`, `details`) y orden de trabajo **opcional** en las jornadas |
| `supabase/migrations/0006_mensajes_contacto.sql` | Tabla `site_mensajes`: respaldo en base de datos de cada mensaje del formulario de `/contacto` |
| `supabase/migrations/0007_contenido_paginas.sql` | Contenido editable de las páginas de **inicio** y **Nosotros**, interruptores por sección, **contador de visitas** (`site_visitas`) y **video por servicio** (`site_services.video`) |
| `supabase/migrations/0008_titulos_paginas.sql` | Títulos que quedaban escritos en el código: sección de servicios, valores y clientes del inicio y su cierre (`site_settings.home`), cabeceras de **Servicios**, **Proyectos** y **Contacto** y el párrafo del **pie de página** (`site_settings.paginas`) |

Para cada una:

1. Entra al Dashboard de Supabase → proyecto **GPI Project**.
2. Menú lateral → **SQL Editor** → **New query**.
3. Abre el archivo del repo, copia **todo** su contenido y pégalo en el editor.
4. Pulsa **Run** y revisa los `NOTICE` del panel de resultados.

Todas son **idempotentes**: puedes volver a ejecutarlas sin duplicar datos.

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
> puede fallar por cosas ajenas al sitio (se cambia la contraseña del buzón, el
> servidor de correo corta, el mensaje cae en spam). Se guarda **antes**
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

### ¿Qué añade la 0007?

| Objeto | Para qué sirve |
| --- | --- |
| `site_settings.nosotros` | **Todo** el contenido de la página Nosotros: primera pantalla, Quiénes Somos (título, párrafos, foto), Misión, Visión, galería de aliados, línea de tiempo (hitos y etiquetas), título de los valores y texto de cierre |
| `site_settings.home` | El bloque «Quiénes somos» del inicio: texto superior, título, descripción, puntos con visto verde, foto de apoyo, **cifras** y botón |
| Claves nuevas en `site_settings.visibility` | `homeQuienesSomos`, `nosotrosQuienesSomos`, `nosotrosMisionVision`, `nosotrosGaleria`, `nosotrosLineaTiempo`, `nosotrosValores`, `nosotrosVideo` y `nosotrosFaq`. Todas encendidas |
| Tabla `site_visitas` | Contador de visitas: **una fila por día** (`dia`, `total`, `updated_at`). El sitio muestra la suma |
| Función `registrar_visita()` | Suma una visita de hoy de forma atómica. `security definer`, con permiso de ejecución **solo** para `service_role` |
| Columna `site_services.video` | Video de YouTube por servicio: `{ url, titulo, descripcion, visible }`. `NULL` = sin video |
| Corrección **«+5 años» → «+15 años»** | En el badge del hero, en el texto de la banda oscura y en la primera cifra, solo si conservaban el texto original |

> **Las cifras no se pierden.** La migración copia `excellence.stats` (donde
> vivían) dentro de la clave nueva `home`: si GPI ya las había editado desde el
> panel, se conservan tal cual. `excellence.stats` se queda como legado; lo que
> se ve y se edita es `home.quienesSomos.stats`.
>
> **Nada se pisa.** Las claves `nosotros` y `home` se insertan con
> `on conflict do nothing`, y los interruptores nuevos se mezclan dejando ganar
> a los que ya existieran. Ejecutarla dos veces no cambia nada.
>
> Mientras la 0007 no esté aplicada el sitio **se ve exactamente igual**: los
> textos, las fotos y la línea de tiempo salen del respaldo estático de
> `src/data/site.ts` (son los mismos), `/admin/inicio` y `/admin/nosotros`
> muestran esos valores listos para guardar, los servicios se guardan sin la
> columna `video`, y la tarjeta del contador de visitas sencillamente no
> aparece.

### ¿Qué añade la 0008?

| Objeto | Para qué sirve |
| --- | --- |
| Cuatro bloques nuevos en `site_settings.home` | `serviciosIntro` (encabezado de «Dos áreas, una misma excelencia»), `valoresIntro` (encabezado de los valores del inicio), `clientes` (encabezado del «Portafolio de clientes») y `cta` (título y descripción de la franja verde de cierre del inicio) |
| Clave nueva `site_settings.paginas` | La primera pantalla (texto superior, título, descripción, imagen de fondo y su texto alternativo) de **Servicios**, **Proyectos** y **Contacto**, más el párrafo de presentación del **pie de página** |
| Corrección **«Más de 5 años» → «Más de 15 años»** en el pie | El párrafo del pie vivía escrito en `Footer.tsx` y se había quedado con la antigüedad vieja mientras el resto del sitio ya decía 15. La migración siembra el texto ya corregido y, además, actualiza el texto exacto anterior si alguien ya lo hubiera guardado |
| Repite, por seguridad, los tres reemplazos «+5 → +15» de la 0007 | Cubre el caso de una base sembrada con la 0001 después de la 0007: las condiciones exigen el texto exacto viejo, así que sobre una base ya corregida no tocan ninguna fila |

Se edita en **dos pantallas**: los cuatro bloques de `home` en `/admin/inicio`
(que pasa de cuatro a ocho tarjetas) y `paginas` en la pantalla nueva
**`/admin/paginas`** («Cabeceras de páginas y pie del sitio», dentro de
«Contenido del sitio»).
El **inicio** y **Nosotros** no están en `/admin/paginas`: son páginas enteras
con su propia pantalla desde la 0007.

> **Nada se pisa.** Los cuatro bloques de `home` se insertan con
> `v_nuevas || value` (merge de primer nivel: lo que ya exista en `home` gana
> sobre lo que trae la migración) y `paginas` se inserta completo con
> `on conflict do nothing` (si la clave ya existiera, la migración no toca
> nada). Ejecutarla dos veces no cambia nada.
>
> Mientras la 0008 no esté aplicada el sitio **se ve exactamente igual**: los
> ocho textos nuevos salen del respaldo estático de `src/data/site.ts` (son los
> mismos) y `/admin/inicio` y `/admin/paginas` muestran esos mismos valores
> listos para guardar. A diferencia del video de servicios (una columna nueva
> de verdad), `home` y `paginas` son **claves dentro de `site_settings`**, tabla
> que ya existe desde la 0001: guardar desde el panel crea la fila con
> `upsert` aunque la 0008 nunca se aplique, así que estos ocho bloques en
> realidad **no dependen de la migración** para poder editarse — la 0008 solo
> adelanta la semilla inicial y corrige el «+5 años» del pie sin que nadie
> tenga que tocar cada campo a mano.

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
CONTACT_SMTP_HOST=smtpout.secureserver.net
CONTACT_SMTP_PORT=465
CONTACT_SMTP_USER=xperea@gpiprofesionales.com
CONTACT_SMTP_PASS=la-contraseña-del-buzón
```

**Dónde encontrarlas:** las tres de Supabase, en el Dashboard →
**Settings** → **API Keys**. Las del correo, en el buzón que vaya a enviar (ver
[§13](#13-correo-del-formulario-de-contacto--envío-directo)).

| Variable | Valor | ¿Secreta? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Campo **Project URL** | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave **anon** / **publishable** | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **service_role** | **Sí** |
| `CONTACT_SMTP_HOST` | Servidor de salida. **Opcional**: si se deja vacío se usa `smtp.gmail.com` | No |
| `CONTACT_SMTP_PORT` | Puerto. **Opcional**: si se deja vacío se usa `465` | No |
| `CONTACT_SMTP_USER` | Buzón desde el que sale el correo del formulario | No |
| `CONTACT_SMTP_PASS` | Su contraseña (con Gmail, la **contraseña de aplicación** de 16 letras) | **Sí** |

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

² Desde julio de 2026, **cualquier cuenta activa** tiene su portal de jornadas
(registrar jornada + mis jornadas): el empleado lo ve directo en `/mi-cuenta`, y
quien además tiene acceso al panel llega ahí con "Registrar mi jornada" o en
`/mi-cuenta?portal=1` (ver más abajo). Arriba del portal ve un botón **"Ir al
panel"**. El Community Manager también es empleado de GPI, así que registra sus
horas como cualquier otra persona.

### A dónde aterriza cada rol al iniciar sesión

| Rol | Pantalla que ve al ingresar | Cómo llega a la otra |
| --- | --- | --- |
| **Administrador**, **Coordinador** y **Community Manager** | **`/admin`** — el panel es su pantalla principal de trabajo | Botón **"Registrar mi jornada"** en la barra superior del panel (y un enlace igual en el dashboard), que lleva a `/mi-cuenta?portal=1` |
| **Empleado** | `/mi-cuenta` — su portal de jornadas | No tiene panel |

El aterrizaje lo decide el **formulario de ingreso** (`src/app/mi-cuenta/LoginForm.tsx`)
según el rol; **no** es un redirect del servidor. Hasta el 12 de agosto solo admin y
coordinador aterrizaban en `/admin`; desde el **pulido final** el Community Manager
se unió a ellos: los tres roles que pueden editar contenido (`is_content_editor()`)
entran directo al panel, y solo el **empleado** se queda en su portal de jornadas.

> **«Mi Cuenta» también rebota al panel (pulido final).** Antes, `/mi-cuenta`
> visitado directamente **seguía mostrando el portal de jornadas a todos los
> roles**, incluidos admin y coordinador. Ahora, si una cuenta con rol de
> contenido ya tiene sesión iniciada y entra a `/mi-cuenta` —por ejemplo pulsando
> el enlace "Mi Cuenta" del menú público—, ve una pantalla breve *"Abriendo tu
> panel…"* y salta sola a `/admin`. Lo hace `src/app/mi-cuenta/IrAlPanel.tsx` con
> un redirect de **cliente** (`router.replace("/admin")`), por la misma razón de
> siempre: `src/proxy.ts` ya manda `/admin` → `/mi-cuenta` cuando no ve sesión, y
> un `redirect()` de servidor en `/mi-cuenta` cerraría el círculo con cualquier
> cookie a medio refrescar. **El portal de jornadas no desapareció**: sigue
> disponible para esas cuentas en **`/mi-cuenta?portal=1`** —el parámetro que pide
> explícitamente el portal en vez del panel—, que es a donde apuntan hoy el botón
> "Registrar mi jornada" del panel y el enlace del dashboard. El empleado no nota
> ningún cambio: sigue viendo su portal directamente en `/mi-cuenta`. Nadie queda
> encerrado en una sola pantalla.

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

### Por sección — cada interruptor vive en la pantalla de su página

Desde la migración 0007 los interruptores están **donde se edita la sección**,
no todos juntos en Ajustes:

| Pantalla | Interruptor | Qué apaga |
| --- | --- | --- |
| `/admin/inicio` | Quiénes somos y cifras | El bloque de presentación del inicio, con sus puntos y sus tarjetas de cifras |
| `/admin/inicio` | Clientes | Banda de logos de clientes en el inicio |
| `/admin/nosotros` | Quiénes Somos | La foto del equipo con los dos párrafos |
| `/admin/nosotros` | Misión y Visión | Las dos tarjetas |
| `/admin/nosotros` | Galería de aliados | «Más que proveedores, somos aliados estratégicos» y sus fotos |
| `/admin/nosotros` | Línea de tiempo | La trayectoria de la empresa |
| `/admin/nosotros` | Valores corporativos | Los valores **solo** en la página Nosotros |
| `/admin/nosotros` | Video corporativo | Video de YouTube en Nosotros |
| `/admin/nosotros` | Preguntas frecuentes | Acordeón de FAQ en Nosotros (y su marcado FAQPage) |
| `/admin/ajustes` | Valores corporativos | Los valores **a la vez** en el inicio y en Nosotros |

Se guardan todos en el ajuste `visibility` de `site_settings`. Todo está
encendido por defecto: el sitio se ve completo salvo que alguien apague algo a
propósito.

**Dos detalles que conviene entender:**

- Los **valores** salen en dos páginas, así que tienen dos niveles: el
  interruptor de Ajustes los apaga en todo el sitio y el de Nosotros solo en esa
  página. Se ven cuando **los dos** están encendidos.
- El **video** y las **preguntas frecuentes** solo existen en Nosotros. Su
  interruptor escribe a la vez la clave nueva (`nosotrosVideo`, `nosotrosFaq`) y
  la antigua (`videoSection`, `faqSection`), para que haga lo que dice aunque en
  la base de datos hubiera quedado apagada la clave vieja.

Cada pantalla guarda **solo sus** interruptores y conserva los demás: guardar en
`/admin/nosotros` nunca toca lo configurado en `/admin/inicio`.

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

Lo mismo vale para la 0007: los textos, las fotos y la línea de tiempo de las
páginas de inicio y Nosotros están **duplicados a propósito** en
`src/data/site.ts` y en la migración. Sin la 0007 aplicada el sitio se ve
idéntico, `/admin/inicio` y `/admin/nosotros` muestran esos mismos valores
listos para guardar, guardar un servicio reintenta sin la columna `video`, y la
tarjeta del contador de visitas no se pinta.

Y para la 0008: los ocho títulos nuevos —sección de servicios, valores y
clientes del inicio, cierre del inicio, y las cabeceras de Servicios, Proyectos,
Contacto y el pie— también están **duplicados a propósito** en
`src/data/site.ts`. La diferencia con la 0007 es que aquí no hay ninguna
columna nueva que pueda faltar: `home` y `paginas` son claves dentro de
`site_settings`, tabla que ya existe desde la 0001, así que `/admin/inicio` y
`/admin/paginas` **guardan sin ningún reintento especial** aunque la 0008
nunca se aplique — la migración solo adelanta la semilla y corrige el «+5
años» del pie de una vez, en vez de que alguien tenga que escribir esos ocho
textos a mano desde el panel.

**Renderizado:** las páginas usan ISR con `revalidate = 300` (5 minutos) y,
además, cada vez que guardas en `/admin` se llama a
`revalidatePath("/", "layout")` —y, al tocar un proyecto, también a
`revalidatePath("/proyectos/[slug]", "page")`—, así que los cambios se ven de
inmediato.

---

## 10. Qué se puede editar desde `/admin`

Desde el **pulido final** del 12 de agosto, las ocho primeras filas de esta
tabla —de «Página de inicio» a «Valores»— viven agrupadas detrás de una sola
entrada del menú, **Contenido del sitio** (`/admin/contenido`): un índice con
una tarjeta por pantalla, en el mismo orden en que un visitante recorre el
sitio. **Ninguna URL cambió**: `/admin/servicios` sigue siendo
`/admin/servicios`, y cualquier enlace guardado sigue funcionando igual —lo
único que cambió es cómo se llega ahí desde el menú (ver *Navegación del
panel*, al final de esta sección).

| Sección | Quién | Qué permite |
| --- | --- | --- |
| **Página de inicio** | contenido | Primera pantalla (hero), bloque «Quiénes somos» con sus puntos, foto y cifras, título de la sección de servicios, título de los valores, banda oscura, título del portafolio de clientes, cierre de la página y qué secciones del inicio se ven |
| **Página Nosotros** | contenido | Primera pantalla, Quiénes Somos, Misión, Visión, galería de aliados, línea de tiempo, título de los valores, video de YouTube, texto de cierre y qué secciones se ven |
| **Cabeceras de páginas y pie del sitio** | contenido | Los textos e imágenes de cabecera de Servicios, Proyectos y Contacto, la descripción del pie de página y las fotos de las tarjetas «Servicios Industriales» / «Servicios Ambientales» |
| **Servicios** | contenido | CRUD completo: título, título de menú, slug, categoría, icono, orden, visibilidad, resumen, descripción, ítems, portada, galería, **video de YouTube** y SEO |
| **Proyectos** | contenido | CRUD: título, cliente, **dirección web (slug)**, categoría, descripción corta, **descripción larga**, imagen, **galería**, orden y visibilidad. Cada proyecto tiene su propia página en `/proyectos/<slug>` |
| **Clientes** | contenido | CRUD: nombre, logo, sitio web, orden y visibilidad |
| **FAQ** | contenido | CRUD de preguntas y respuestas (alimentan el marcado FAQPage) + visibilidad |
| **Valores** | contenido | CRUD de valores corporativos + visibilidad |
| **Ajustes** (título de la pantalla: «Contacto y ajustes») | contenido | Dirección, coordenadas, teléfonos/WhatsApp, correos, **correo del formulario de contacto**, redes, horario, mapa y el interruptor global de los valores |
| **Equipo** | managers | Cuentas del portal: crear, editar, roles, activar/desactivar, contraseñas y eliminación |
| **Horarios** | managers | Horario laboral de cada mes (base de la jornada ordinaria y de las horas extra) |
| **Jornadas** | managers | Revisión de jornadas con desglose de horas: aprobar, rechazar, volver a pendiente y **eliminar** + tablero de métricas |

*"contenido" = admin, coordinador y Community Manager · "managers" = admin y
coordinador*

### Las páginas generales se editan desde su propia pantalla

Antes, el hero del inicio, las cifras y el video vivían mezclados en «Contacto y
ajustes», y el resto de los textos de Nosotros y las cabeceras de las demás
páginas estaban escritos en el código. Desde las migraciones 0007 y 0008 hay
**una pantalla por página**:

**`/admin/inicio` — Página de inicio**

| Bloque | Qué edita |
| --- | --- |
| Qué se ve en la página de inicio | Interruptores de «Quiénes somos y cifras» y de la banda de clientes |
| Primera pantalla | Etiqueta superior, título en dos partes, descripción, imagen de fondo con su texto alternativo y los dos botones |
| Quiénes somos y cifras | Texto superior, título, descripción, puntos con visto verde, foto de apoyo, **las cifras** y el botón |
| Título de la sección de servicios *(0008)* | Texto superior, título y descripción del encabezado que presenta las dos tarjetas grandes (Servicios Industriales / Ambientales) |
| Título de los valores en el inicio *(0008)* | Texto superior, título y descripción (opcional) del encabezado que presenta los valores en el inicio |
| Banda oscura del inicio | Texto superior, mensaje, palabra destacada y botón |
| Título del portafolio de clientes *(0008)* | Texto superior, título y descripción del encabezado de la banda de logos |
| Cierre de la página *(0008)* | Título y descripción de la franja verde final («¿Listo para optimizar sus procesos?») |

> Los cuatro bloques marcados *(0008)* son nuevos del pulido final: antes esos
> encabezados estaban escritos directamente en el TSX de cada sección de la
> página. `/admin/inicio` pasó de cuatro a **ocho tarjetas**, cada una con su
> propio botón de guardar, en el mismo orden en que se ven en la página.

**`/admin/paginas` — Cabeceras de páginas y pie del sitio** *(nueva, migración 0008)*

Vive dentro de «Contenido del sitio», pero no es una página completa como el
inicio o Nosotros: son solo las **cabeceras** —la banda oscura con foto de
fondo, el título grande y el párrafo que abren cada página— de las páginas que
no tienen pantalla propia, más el pie y las dos fotos de las tarjetas de área.

| Tarjeta | Qué edita |
| --- | --- |
| Página Servicios | Texto superior, título, descripción e imagen de fondo (con su texto alternativo) de la cabecera de `/servicios` |
| Página Proyectos | Lo mismo, para la cabecera de `/proyectos` |
| Página Contacto | Lo mismo, para la cabecera de `/contacto` |
| Pie de página | El párrafo de presentación que acompaña al logo abajo del todo, en **todas** las páginas del sitio |
| Fotos de las dos áreas *(nueva, 13 ago 2026)* | La foto (con su texto alternativo) de las tarjetas grandes **«Servicios Industriales»** y **«Servicios Ambientales»**, en el inicio y en `/servicios`. El nombre y la descripción del área siguen fijos: aquí solo se cambia la foto. Botón propio, **«Guardar fotos de las áreas»**. Vive en `site_settings.paginas.categorias`; no depende de ninguna migración SQL — sin ese dato el sitio usa el respaldo estático |

> El **inicio** y **Nosotros** no están en esta pantalla porque tienen la suya
> propia (arriba y abajo), con muchos más bloques que una sola cabecera.

**`/admin/nosotros` — Página Nosotros**

| Bloque | Qué edita |
| --- | --- |
| Qué se ve en la página Nosotros | Los siete interruptores de esta página |
| Primera pantalla | Título, descripción e imagen de fondo |
| Quiénes Somos | Título, **párrafos** (uno por fila) y la foto del equipo |
| Misión y Visión | Los dos textos |
| Galería de aliados | Título, descripción y las fotos con su texto alternativo |
| Línea de tiempo empresarial | Texto superior, título, descripción, los **hitos** (fecha, título, descripción e icono) y las **etiquetas** de debajo de la flecha |
| Título de los valores | El encabezado que presenta los valores (los valores en sí siguen en su sección) |
| Video corporativo | El video de YouTube de la página, con sus textos |
| Cierre de la página | Título y descripción de la franja verde final |

> Los **valores corporativos**, las **preguntas frecuentes**, los **servicios**,
> los **proyectos** y los **clientes** son listas y siguen editándose en sus
> propias secciones: en estas dos pantallas solo están los títulos que las
> presentan.

### La línea de tiempo: hitos y etiquetas

La línea de tiempo tiene **dos filas** y cada una se edita por separado:

- **Hitos** (las tarjetas de arriba): fecha, título, descripción e icono. El
  diseño está pensado para cuatro; se pueden añadir o quitar con los botones.
- **Etiquetas** (debajo de la flecha): título, descripción e icono. Resumen de
  una palabra de cada etapa (*Enfoque inicial*, *Crecimiento*, *Fortalecimiento*,
  *Impacto*).

El **icono** se elige de una lista con vista previa al lado, la misma que usan
los valores y los servicios. Si alguna vez quedara guardado un nombre de icono
que ya no existe, el sitio pinta el icono por defecto en vez de romperse.

### El contador de visitas

La página de inicio muestra, junto a las cifras de «Quiénes somos», una tarjeta
con las **visitas al sitio web**. Esa cifra **no se edita**: la cuenta el sitio
solo. Cómo funciona, de principio a fin:

1. Al abrir cualquier página pública, un componente diminuto
   (`VisitBeacon`) comprueba si esta sesión del navegador ya avisó. Si no, hace
   un `POST` a **`/api/visita`** y deja una marca en `sessionStorage`.
2. Ese endpoint corre en el **servidor**, descarta la petición si la misma IP ya
   sumó en los últimos 30 minutos, y llama a `registrar_visita()` con la clave
   `service_role`.
3. La función suma 1 a la fila del día de hoy en `site_visitas` (una fila por
   día).
4. La página de inicio y Nosotros, que son estáticas con ISR, traen en su HTML
   la **suma** de todas las filas hasta el último `revalidate` (cada 5 minutos)
   y la muestran con separador de miles.
5. **Desde el pulido final, el número se corrige solo al momento de abrir la
   página.** Al montarse en el navegador, la tarjeta (`VisitCounter`) pide el
   total en vivo a **`GET /api/visita`** (lectura de solo consulta, sin caché)
   y reemplaza la cifra **únicamente si cambió**, para no provocar un parpadeo.

> **Por qué se añadió el paso 5.** Antes la cifra dependía solo del HTML
> estático: GPI abría el sitio, generaba una visita nueva y todavía veía el
> número de antes durante los siguientes minutos, hasta el próximo
> `revalidate`. Volver dinámicas las páginas de inicio y Nosotros por una cifra
> de vanidad habría sido tirar el ISR de todo el sitio a la basura; en cambio,
> el HTML sigue siendo estático (rápido, cacheable) y solo esta tarjeta pide su
> propio dato fresco al navegador, una vez, al cargar.

Detalles pensados a propósito:

- **`/admin` y `/mi-cuenta` no cuentan**: son el trabajo interno de GPI y
  contarlos inflaría la cifra con la propia empresa.
- **Una visita por sesión del navegador**, no por página: recorrer el sitio
  entero cuenta como una sola visita. Quien vuelve otro día suma otra.
- **El navegador no puede inflarla**: solo el **servidor** puede sumar
  (`POST`, con la clave `service_role`); si se hubiera expuesto esa función a
  la clave anónima —que es pública por diseño— cualquiera la subiría en bucle
  desde la consola del navegador. La lectura en vivo (`GET`) sí usa el cliente
  anónimo, pero solo para **consultar**: se apoya en la política
  `site_visitas_select_public` de la migración 0007, que permite `select` y
  nada más.
- **Si la 0007 no está aplicada, la tarjeta no aparece.** Mostrar «0 visitas» se
  leería como un sitio que nadie visita, que es peor que no mostrar nada. Y sin
  la tarjeta no hay nada que refrescar en vivo tampoco.

### Un video de YouTube por servicio

En `/admin/servicios` → cualquier servicio → bloque **«Video del servicio
(YouTube)»**:

- **Enlace del video**: se pega la dirección de YouTube. Sirven la de la barra
  del navegador (`youtube.com/watch?v=…`), la corta del botón Compartir
  (`youtu.be/…`), la de insertar (`/embed/…`) y las de Shorts y directos. Si el
  enlace no es de YouTube, el panel lo dice al guardar en vez de dejar un video
  roto.
- **Título** y **descripción**: los textos que acompañan al video en la página
  del servicio.
- **Mostrar el video**: apagarlo lo esconde del sitio pero **conserva** el
  enlace y los textos en el panel.
- **Para quitarlo**: se borra el enlace y se guarda.

> **Empieza apagado por defecto (pulido final).** En un servicio sin video
> guardado, el interruptor **«Mostrar el video»** ahora aparece en **No
> visible**. Antes aparecía como «Mostrar» sobre campos completamente vacíos, y
> GPI creyó que ya había un video publicado cuando no lo había — la página
> pública nunca mostró nada sin URL, pero el panel sí sugería lo contrario. Hay
> que encenderlo a propósito una vez que el enlace esté listo para publicarse.

El video se muestra al final de la página del servicio, con el mismo reproductor
diferido que la página Nosotros: la portada es una imagen y YouTube solo se
carga cuando el visitante pulsa reproducir.

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

**Cómo se envía, técnicamente:** el servidor manda el correo por SMTP en cuanto
el visitante pulsa el botón, y además guarda una copia del mensaje en la base de
datos. Puede salir del **buzón del dominio** (`smtpout.secureserver.net`, el
correo Workspace de GoDaddy) o de una cuenta de Gmail. Todo el detalle —qué
poner en cada caso, dónde van las variables y qué pasa si faltan— está en
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

En cada campo de imagen del panel hay **dos vías**, ambas válidas:

- **Subir un archivo** → se guarda en el bucket público `site-images` de
  Supabase, en la carpeta que corresponde a esa pantalla, y el campo se
  rellena solo con su URL pública.
- **Pegar una URL** de una imagen ya publicada en internet (`https://...`).
  Recomendación oficial: **Cloudinary** (ver más abajo).

Siempre se muestra una vista previa antes de guardar. Las **galerías** —fotos
adicionales de un servicio, de un proyecto y de «Más que proveedores, somos
aliados estratégicos» en Nosotros— funcionan igual: cada fila tiene las
mismas dos vías, con su propio botón **Subir imagen** además del campo de
URL, y guarda en la misma carpeta del bucket que la portada de esa pantalla.

#### Regla del cliente (13 ago 2026): contenido = bucket o URL externa, nunca `/images/`

Ninguna imagen de **contenido** —servicios, proyectos, clientes y las claves
`hero`, `home`, `nosotros`, `paginas` de `site_settings`— puede referenciar
una ruta del repositorio (`/images/...`): esas rutas viven en el código y se
pierden si el repo cambia sin que nadie lo note desde el panel. Se aplicó de
una vez el 13 de agosto: se migraron los **53 archivos** de contenido que
todavía apuntaban a `public/images/` al bucket `site-images` y se
reescribieron sus **53 referencias** en la base de datos (11 servicios, 4
proyectos, 5 clientes y las cuatro claves de `site_settings` de arriba).
Verificado: 0 referencias `/images/` en la base de datos.

> Dos de esos 53 archivos eran fotos que **sí estaban escritas en el
> código** y no en la base: las imágenes de las dos tarjetas grandes de área
> («Servicios Industriales» y «Servicios Ambientales», en el inicio y en
> `/servicios`). Se subieron como `servicios/categoria-industrial.jpg` y
> `servicios/categoria-ambiental.jpg` y ganaron una tarjeta nueva en
> `/admin/paginas` (ver más abajo) — antes eran las dos únicas fotos visibles
> del sitio sin ninguna pantalla que las cambiara.

Lo único que **sí** sigue siendo una ruta del código, a propósito, es lo que
**no es contenido**: el logo de la barra de navegación y del pie, el favicon
y la imagen por defecto para redes sociales (OpenGraph). Eso no se edita
desde el panel.

#### El bucket `site-images`, por carpetas

| Carpeta | Qué guarda |
| --- | --- |
| `inicio/` | La foto del hero de la página de inicio y la foto de apoyo de «Quiénes somos» |
| `nosotros/` | La foto del equipo y las fotos de la galería de aliados |
| `servicios/` | Portada y galería de cada servicio (`<slug>-portada.jpg`, `<slug>-1.jpg`, `-2.jpg`, `-3.jpg`) y las dos fotos de área: `categoria-industrial.jpg`, `categoria-ambiental.jpg` |
| `proyectos/` | Foto principal y galería de cada proyecto: `<slug>.jpg`, `<slug>-galeria-N.jpg` |
| `clientes/` | Logos: `logo-<nombre-del-cliente>.jpg` |
| `cabeceras/` | La foto de fondo de la cabecera de Servicios, Proyectos, Contacto y Nosotros |

Nombres kebab-case a propósito, para que se lean solos desde el Dashboard de
Supabase sin tener que abrir cada archivo. Las fotos que el propio cliente
sube desde el panel se siguen guardando con su nombre de siempre
(`<marca-de-tiempo>-<archivo>`); no se tocaron en la migración. Bucket final:
**67 archivos, 15,5 MB** (66 referenciados desde algún campo; el único suelto
es una foto que GPI subió desde el panel y nunca llegó a guardar en ningún
campo).

#### Pegar una URL externa: se recomienda Cloudinary

Pegar la URL de un servidor cualquiera funciona —se pinta `unoptimized` para
que nunca rompa la página—, pero **no es la vía recomendada**: puede quedar
bloqueada por la política de seguridad del navegador (`img-src` de la CSP en
`next.config.ts`) si ese servidor no está en la lista blanca. La vía
recomendada, ya sumada a esa lista blanca, es **Cloudinary**:

1. Crea una cuenta gratis en [cloudinary.com](https://cloudinary.com).
2. Sube la foto desde su panel.
3. Copia la URL que empieza por `https://res.cloudinary.com/...` y pégala en
   el campo de imagen del panel de GPI.

Con Cloudinary la imagen queda **optimizada de verdad** por `next/image` (a
diferencia de otros servidores externos) y organizada en una cuenta propia de
GPI. `res.cloudinary.com` está en `images.remotePatterns` y en el `img-src`
de la CSP de `next.config.ts`.

Para que nadie se entere del problema tarde, el campo de imagen **avisa en el
momento**: si la dirección pegada no es del bucket ni de Cloudinary, aparece
un recuadro ámbar debajo diciendo que probablemente no se verá y qué hacer.
La decisión de optimizar o no vive en `esImagenOptimizable()`
(`src/lib/imagenes.ts`), que **tiene que ir sincronizada con
`images.remotePatterns`** de `next.config.ts`: quien toque una lista, que
toque la otra. Quien pinta las imágenes de contenido es `ContentImage`
(`src/components/ui/ContentImage.tsx`), no `next/image` a pelo — `next/image`
directo se reserva para el logo y el resto del *chrome*.

#### Qué pasa con `public/images/`

No se borra: sigue siendo el **respaldo estático** que usa el sitio cuando no
hay variables de entorno de Supabase o una consulta falla (`src/data/*`, ver
[§9](#9-cómo-funciona-el-fallback-estático)). Ese respaldo es invisible para
quien usa el panel — misma regla de siempre, «el sitio nunca depende de que
la base de datos esté arriba» — y no se edita desde aquí.

### Navegación del panel

- Barra superior siempre visible con el rol de la sesión, **Registrar mi
  jornada** (lleva a `/mi-cuenta?portal=1`, el portal de jornadas), **Ver
  sitio** y **Cerrar sesión**.
- **Menú de seis entradas** (pulido final), en escritorio como columna a la
  izquierda y en móvil como tabs desplazables, con la sección activa
  resaltada: **Dashboard · Contenido del sitio · Equipo · Horarios · Jornadas ·
  Ajustes**. Las tres internas (Equipo, Horarios, Jornadas) solo aparecen para
  managers.
- **Contenido del sitio** (`/admin/contenido`) es el hub que reemplazó a las
  ocho entradas sueltas de antes: un índice con una tarjeta por pantalla
  —Página de inicio, Página Nosotros, Cabeceras de páginas y pie del sitio,
  Servicios,
  Proyectos, Clientes, FAQ y Valores—, en el mismo orden en que un visitante
  recorre el sitio. El menú tenía **doce** entradas y se leía como un
  inventario; ahora tiene **seis**.
- **Ninguna URL cambió.** `/admin/servicios` sigue siendo `/admin/servicios`:
  reagrupar el menú no tocó ninguna ruta. Estar en cualquiera de las ocho
  pantallas de contenido marca «Contenido del sitio» como activo (la lista de
  rutas que hace ese reconocimiento es `RUTAS_CONTENIDO`, en
  `src/lib/admin-types.ts`, compartida entre el menú y el propio hub).
- La entrada que antes se llamaba «Contacto y ajustes» se llama ahora
  **Ajustes** en el menú; la pantalla en sí conserva su título «Contacto y
  ajustes».
- Cada sección tiene breadcrumb y botón **← Volver**; dentro de «Contenido del
  sitio» ese botón dice **← Volver a Contenido del sitio**, y los formularios
  de crear/editar añaden además **← Volver a [sección]**.
- El **Dashboard** de `/admin` se reorganizó igual, en dos grupos: «Gestión
  interna» (Equipo, Horarios, Jornadas — solo managers) y «El sitio web»
  (Contenido del sitio, Contacto y ajustes).

---

## 11. Despliegue en Vercel

1. Vercel → proyecto → **Settings** → **Environment Variables**.
2. Añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los
   mismos valores del `.env.local`, marcando **Production**, **Preview** y
   **Development**.
3. Añade `SUPABASE_SERVICE_ROLE_KEY` **sin** prefijo `NEXT_PUBLIC_`.
4. Añade `CONTACT_SMTP_USER` y `CONTACT_SMTP_PASS` —y, si el buzón no es de
   Gmail, también `CONTACT_SMTP_HOST` y `CONTACT_SMTP_PORT`—, todas **sin**
   prefijo `NEXT_PUBLIC_`
   (ver [§13](#13-correo-del-formulario-de-contacto--envío-directo)).
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

### Desde qué buzón sale el correo: dos opciones

El sitio no está atado a Gmail. El servidor de salida se elige con variables de
entorno, así que sirven los dos escenarios **sin tocar una línea de código**:

| | Buzón del dominio (recomendado) | Cuenta de Gmail |
| --- | --- | --- |
| Dirección que envía | `xperea@gpiprofesionales.com` | `gpi.gerencia1@gmail.com` |
| Servidor | `smtpout.secureserver.net` | `smtp.gmail.com` (por defecto) |
| Contraseña | La normal del buzón | Una **contraseña de aplicación** aparte |
| Ventaja | El correo sale del propio dominio: menos riesgo de spam | No hace falta el hosting de GoDaddy |

Lo que **enciende** el envío directo sigue siendo lo mismo de siempre:
`CONTACT_SMTP_USER` y `CONTACT_SMTP_PASS`. `CONTACT_SMTP_HOST` y
`CONTACT_SMTP_PORT` son opcionales y solo hacen falta para salirse de Gmail.

#### Con buzón del dominio (correo Workspace de GoDaddy)

Es la opción recomendada: el mensaje sale de `@gpiprofesionales.com`, que es la
dirección que el visitante espera ver. Ojo: estos buzones (`xperea@`,
`ycamacho@`) **no viven en el cPanel del hosting**, sino en el correo
Workspace de GoDaddy (los registros MX del dominio apuntan a
`secureserver.net`) — es una plataforma de correo aparte, con su propia
cuenta y su propio servidor de salida.

1. **Ten a mano la contraseña del buzón.** Es la misma con la que se entra al
   webmail de GoDaddy (`email.godaddy.com`), no la del cPanel. Si no se
   recuerda: entra a la cuenta de GoDaddy → **Correo electrónico** →
   *Administrar* sobre `xperea@gpiprofesionales.com` → restablecer contraseña.
   ⚠️ Cambiarla ahí obliga a volver a escribirla en el celular y en Outlook, si
   el buzón está configurado en algún programa.
2. **Confirma el servidor de salida.** Para GPI son (confirmado con envío real
   de prueba):
   - Servidor (SMTP): `smtpout.secureserver.net`
   - Puerto: **465** con SSL/TLS
   - Usuario: la dirección **completa** (`xperea@gpiprofesionales.com`), no solo
     `xperea`
3. **Carga las cuatro variables** (abajo, *Dónde se ponen las variables*).
4. **Vuelve a desplegar en Vercel** y prueba el formulario desde
   `/contacto`. El correo llega al buzón configurado en `/admin/ajustes`, con el
   remitente `Sitio web GPI <xperea@gpiprofesionales.com>` y *Responder-a* con el
   correo del visitante.

> **Si no llega nada:** casi siempre es la contraseña (se copió con un espacio
> al final o se cambió en la cuenta de GoDaddy y no en Vercel), el usuario
> escrito sin el `@gpiprofesionales.com`, o el servidor equivocado — apuntar a
> `mail.gpiprofesionales.com` (el cPanel) da `535 Incorrect authentication
> data` porque ese buzón no existe ahí, solo en Workspace. El puerto 587
> también sirve si el 465 diera problemas: se cambia `CONTACT_SMTP_PORT` a
> `587` y se vuelve a desplegar; el sitio negocia STARTTLS solo (sin probar
> en este host — solo se confirmó el 465).

#### Con Gmail: cómo generar la contraseña de aplicación (una sola vez)

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

En este caso `CONTACT_SMTP_HOST` y `CONTACT_SMTP_PORT` se dejan **vacíos**: los
valores por defecto ya son los de Gmail.

### Dónde se ponen las variables

**En el computador (desarrollo)** — en `.env.local`:

```bash
# Buzón del dominio (correo Workspace de GoDaddy)
CONTACT_SMTP_HOST=smtpout.secureserver.net
CONTACT_SMTP_PORT=465
CONTACT_SMTP_USER=xperea@gpiprofesionales.com
CONTACT_SMTP_PASS=la-contraseña-del-buzón

# …o Gmail (HOST y PORT vacíos)
# CONTACT_SMTP_USER=gpi.gerencia1@gmail.com
# CONTACT_SMTP_PASS=abcdefghijklmnop
```

**En Vercel (producción)** — *Settings → Environment Variables*, con esos
mismos nombres y **sin** el prefijo `NEXT_PUBLIC_` (son secretas: con ese
prefijo Next.js las incrustaría en el JavaScript que descarga el navegador).
Después, **Redeploy**: `/contacto` es una página estática y decide en el build
qué formulario mostrar.

| Variable | Qué es | ¿Obligatoria? |
| --- | --- | --- |
| `CONTACT_SMTP_HOST` | Servidor de salida (`smtpout.secureserver.net`) | No — por defecto `smtp.gmail.com` |
| `CONTACT_SMTP_PORT` | Puerto (`465` con SSL; `587` con STARTTLS) | No — por defecto `465` |
| `CONTACT_SMTP_USER` | El buzón **desde el que sale** el correo, dirección completa | **Sí** |
| `CONTACT_SMTP_PASS` | Su contraseña (con Gmail, la de aplicación de 16 letras) | **Sí** |

El correo que **recibe** los mensajes no se configura aquí: se cambia desde el
panel, en `/admin/ajustes` → *Datos de contacto* → **Correo del formulario de
contacto**. Puede ser distinto del que envía, y cambiarlo **no** requiere tocar
variables ni volver a desplegar.

### Qué pasa si algo falla

| Situación | Qué ve el visitante |
| --- | --- |
| Todo bien | *"✅ Tu mensaje fue enviado. Te responderemos pronto al correo que nos dejaste."* |
| El correo falla pero el mensaje **sí** se guardó en `site_mensajes` | *"✅ Recibimos tu mensaje y ya está en nuestra bandeja."* — es la verdad: GPI lo tiene aunque el correo no saliera, así que no se le molesta con alternativas |
| El correo falla **y** no se pudo guardar | Mensaje amable + dos alternativas: **Gmail en el navegador** y **WhatsApp** (ya no se ofrece `mailto:` / "programa de correo": GPI probó esa opción y no abre nada en equipos sin cliente de correo configurado) |
| Las variables `CONTACT_SMTP_*` no están puestas (situación actual, temporal) | El botón principal aparece **inhabilitado** (no se promete un envío que no va a ocurrir) con un aviso pequeño debajo: *"El envío directo desde el sitio estará disponible muy pronto. Mientras tanto, escríbenos por WhatsApp."* La única vía activa en pantalla es **WhatsApp**. Ya no se guarda copia en `site_mensajes` en este caso porque no hay ningún envío que dispare el guardado. En cuanto se carguen las credenciales, este estado desaparece solo |

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
