# Plan del proyecto — Sitio web GPI

Estado al **31 de julio de 2026**. Este documento existe para que cualquier
sesión futura (humana o de Claude) arranque con contexto completo sin tener
que reconstruir el historial desde los commits.

## Fases

| # | Fase | Estado | Notas |
| - | --- | --- | --- |
| 1 | Sitio base: 16 páginas + SEO | ✅ Hecho | App Router, Tailwind v4, metadata por página, JSON-LD `Organization`/`LocalBusiness`/`FAQPage`, `sitemap.ts`, `robots.ts`, breadcrumbs y navegación anterior/siguiente entre servicios. |
| 2 | Mi Cuenta GPI + panel admin CRUD | ✅ Completa | `/mi-cuenta` (login) y `/admin` (servicios, proyectos, clientes, FAQ, valores, contacto/ajustes) sobre Supabase. Migración 0001 aplicada y `.env.local` configurado. |
| 3 | Conexión a DB real y prueba end-to-end | ✅ Completa | Migraciones 0001–0004 aplicadas en el GPI Project; 8 cuentas del equipo creadas; testing completo del cliente ejecutado el 30 jul (plan en `docs/PLAN_PRUEBAS.md`). |
| 4 | Fase 2 del proyecto — Núcleo de horas extra | ✅ Completa | Roles ampliados, CRUD de empleados con cuentas, portal del empleado con registro de jornadas, aprobaciones y visibilidad del contenido. Migraciones 0001 y 0002 **ya aplicadas** en el GPI Project (27 jul 2026); `SUPABASE_SERVICE_ROLE_KEY` configurada en `.env.local`. |
| 4b | Fase 2 — Tablero de métricas de horas extra | ✅ Completa | `/admin/jornadas?vista=metricas`: 4 KPIs, gráficas Recharts (por día, por empleado, extras, Gantt de turnos), filtros client-side, control semanal contra topes legales, glosario amable y export CSV para nómina. |
| 4c | Fase 2 — Iteración post-feedback de GPI | ✅ Código listo | Horarios laborales **mes a mes** (`/admin/horarios`), cuentas por **usuario** en vez de correo, y el rol *marketing* pasa a llamarse **Community Manager** (y también registra jornadas). Migración 0003 aplicada. |
| 4d | Fase 2 — Desglose congelado + ayudas del panel | ✅ Código listo | Al **aprobar** una jornada su desglose de horas se guarda tal cual, con el horario y los recargos que se usaron: los reportes de nómina ya cerrados no cambian si después se corrige un horario. Además, textos de ayuda en todo el panel para usuarios no técnicos. Migración 0004 aplicada. |
| 4e | Fase 2 — Ajustes del testing del cliente (30 jul) | ✅ Hecho | El panel pasa a ser la pantalla principal de admin y coordinador, los managers pueden **eliminar** jornadas y los filtros de aprobaciones se aplican al cambiar. **Sin migración nueva.** |
| 4f | Complementos post-aprobación (31 jul) | ✅ Código listo | Formulario de contacto al **correo corporativo** (editable en Ajustes), **página propia por proyecto** con galería, y **orden de trabajo opcional** en las jornadas. **Falta aplicar la migración 0005.** |
| 4g | Envío real del formulario de contacto (3 ago) | ✅ Código listo | El formulario pasa de `mailto:` a **envío directo por SMTP de Gmail** desde una server action, con respaldo del mensaje en `site_mensajes` y modo alternativo (Gmail web / programa de correo / WhatsApp). **Falta aplicar la migración 0006** y configurar `CONTACT_SMTP_USER` / `CONTACT_SMTP_PASS`. |
| 5 | Deploy en Vercel desde el repo de GitHub + variables de entorno | ✅ Completa | **https://website-gpi.vercel.app** — despliega solo con cada push a `main`; las 3 env vars configuradas (incl. `SUPABASE_SERVICE_ROLE_KEY` sin prefijo). Verificado en vivo: 7 cabeceras de seguridad, 9 rutas 200, `/admin` protegido. |
| 6 | Apuntar dominio `gpiprofesionales.com` de GoDaddy → Vercel | ⏳ Pendiente | Al final, cuando el sitio esté aprobado por GPI y desplegado en Vercel. |
| 7 | Extra cotizable aparte: chatbot IA | 💡 Planeado | Claude Haiku 4.5 vía `/api/chat`, con conocimiento del contenido del sitio (servicios, proyectos, contacto) y captura de leads hacia Supabase. No incluido en la cotización actual. |

## Fase 2 — qué quedó construido (núcleo)

| Pieza | Dónde vive |
| --- | --- |
| Migración de roles, jornadas y visibilidad | `supabase/migrations/0002_empleados_jornadas.sql` |
| Roles `admin` / `coordinador` / `marketing` / `empleado` | `src/lib/roles.ts` + guardas en `src/lib/supabase/auth.ts` |
| Cliente service-role (Auth Admin API) | `src/lib/supabase/admin.ts` — **solo servidor** |
| CRUD de cuentas del equipo | `/admin/empleados` (+ `nuevo`, `[id]`) |
| Aprobación (y eliminación) de jornadas | `/admin/jornadas` |
| Portal del empleado (registro + historial + contraseña) | `/mi-cuenta` |
| Cálculo de horas ordinarias, extra, nocturnas y dominicales | `src/lib/jornada.ts` (función pura `calcularJornada`) |
| Visibilidad por ítem (`published`) y por sección (`visibility`) | Formularios de `/admin/*` y `/admin/ajustes` |
| Horario laboral mes a mes | `supabase/migrations/0003…`, `src/lib/horarios.ts`, `/admin/horarios` |
| Cuentas por usuario (correo sintético interno) | `src/lib/usuarios.ts`, `/mi-cuenta` (login) y `/admin/empleados` |
| Desglose congelado al aprobar | `supabase/migrations/0004…`, `obtenerDesglose()` en `src/lib/jornada.ts` |
| Página propia por proyecto | `supabase/migrations/0005…`, `src/app/proyectos/[slug]/page.tsx` |
| Correo del formulario de contacto | `site_settings.contact.correoFormulario`, `src/components/sections/ContactForm.tsx` |
| Envío real del formulario por SMTP | `src/lib/correo.ts`, `src/app/contacto/actions.ts`, `src/lib/contacto-types.ts` |
| Respaldo de los mensajes de contacto | `supabase/migrations/0006…` (`site_mensajes`) |
| Ayudas del panel para usuarios no técnicos | `AyudaSeccion` / `AyudaDesplegable` + constantes `AYUDA_*` en `src/components/admin/ui.tsx` |

Flujo completo: **el empleado registra su jornada** en `/mi-cuenta` (con vista
previa del desglose) → queda **pendiente** → un **coordinador o admin** la ve en
`/admin/jornadas` con el desglose calculado y la **aprueba** o la **rechaza con
una nota obligatoria** → el empleado ve el resultado y la nota en su portal.
Mientras esté pendiente puede editarla o eliminarla; después queda congelada
(un manager puede devolverla a pendiente). Un manager puede además **eliminarla
definitivamente** en cualquier estado, para limpiar registros de prueba o
equivocados.

Al aprobar, además, el **desglose de horas se persiste** junto con el horario y
los recargos que se usaron: esa jornada muestra siempre las mismas cifras aunque
después se corrija el horario del mes. Devolverla a pendiente borra ese
snapshot y es la forma de recalcularla.

## Iteración post-feedback (28 de julio de 2026)

Tres cambios grandes pedidos por GPI tras ver el sistema funcionando:

### 1. Horarios laborales mensuales

GPI define su jornada **mes a mes** y a veces cambia. Antes, la jornada
ordinaria era un número fijo (`horasOrdinariasDia`); ahora sale de la tabla
`horarios_mensuales`, editable en **`/admin/horarios`** (admin y coordinador):

- Un registro por mes con el horario de cada día (`lun`…`dom`), o `null` si el
  día no es laboral. Horario base confirmado: **L–J 8:00 a. m.–5:30 p. m.,
  V 8:00 a. m.–5:00 p. m., 1 h de almuerzo, sábado y domingo no laborales →
  42 h semanales netas** (el almuerzo no cuenta como trabajo).
- Editor tipo tabla con **celdas calculadas en vivo** ("Horas de jornada" por
  día y "Total de horas semanales"), como el Excel que usaba GPI.
- El mes se **autocrea al entrar**, clonando el mes anterior o el horario
  predeterminado, con un aviso explicando de dónde salió.
- `calcularJornada` recibe ahora el mapa de horarios: para la fecha trabajada
  busca el mes, toma el día de la semana y usa *(fin − inicio) − almuerzo* como
  jornada ordinaria. Sábado, domingo, festivo o día apagado → jornada ordinaria
  cero y todo el turno con recargo dominical/festivo.
- **Regla del almuerzo (a confirmar con GPI)**: como el empleado solo registra
  entrada y salida, el almuerzo del día se descuenta cuando el turno dura más de
  6 horas en un día laboral. Documentada en `docs/ADMIN.md` y en el código.

### 2. Cuentas por usuario

El equipo no tiene correo corporativo, así que ingresa con un **usuario**
(`mgomez`). Supabase Auth exige correo → se usa el sintético interno
`mgomez@cuentas.gpiprofesionales.com` (dominio que no recibe correo). Si lo
escrito en el login lleva `@` se usa tal cual, así siguen entrando las cuentas
antiguas. `profiles` gana `username` (único), `cedula` y `email_contacto`; los
perfiles previos quedan con `username` nulo y se identifican por su correo.
Las contraseñas generadas pasan a formato **`Sol-Andes42`**: fáciles de dictar
por teléfono, que es como se entregan al personal de campo.

### 3. Rol Community Manager

El rol `marketing` (valor interno intacto en la base de datos) se muestra como
**Community Manager**: edita todo el contenido del sitio, no gestiona empleados
ni jornadas de otros. Además, **cualquier cuenta activa** ve su portal de
jornadas en `/mi-cuenta` —el Community Manager también es empleado de GPI, y un
admin o coordinador puede registrar sus horas si lo necesita—; quien tiene
acceso al panel ve arriba el botón "Ir al panel". Aprobaciones y métricas siguen
siendo solo de managers.

## Iteración del 30 de julio de 2026 — ajustes del testing del cliente

Tres ajustes de experiencia que salieron de probar el sistema con GPI. **No
necesitan migración**: la política RLS `jornadas_delete_manager` ya existía desde
la 0002.

### 1. Para los managers, la pantalla principal es el panel

Antes, todos los roles aterrizaban en el portal de jornadas de `/mi-cuenta` con
una banda "Ir al panel", incluidos los administradores, que entran al sistema
sobre todo a administrar.

- **Admin y coordinador**: al ingresar van **directo a `/admin`**. La decisión la
  toma el formulario de ingreso (`LoginForm`) según el rol; **no** hay redirect de
  servidor, así que `/mi-cuenta` visitado a mano **sigue mostrando el portal de
  jornadas a todos los roles** (ahí cambian su contraseña y registran sus horas) y
  no se crea ningún bucle con la redirección optimista del proxy.
- **Community Manager y empleado**: sin cambios, aterrizan en su portal.
- En el panel hay un botón **"Registrar mi jornada"** → `/mi-cuenta` en la barra
  superior del `AdminShell` (visible sin scroll, junto a "Ver sitio") y repetido
  como enlace en la cabecera del dashboard.

### 2. Los managers pueden eliminar una jornada

Nueva acción **Eliminar** en la bandeja de aprobaciones, para admin y
coordinador, disponible en **cualquier estado**: es la herramienta para limpiar
registros de prueba, duplicados o creados por error.

- Server action `deleteJornadaAsManager` con `getManagerOrNull()` en el servidor
  y `revalidatePath` de `/admin/jornadas`, `/admin` y `/mi-cuenta`.
- **Doble confirmación**, como al eliminar una cuenta: el botón despliega un
  aviso rojo y el botón de confirmar pide además la confirmación del navegador.
- **Rechazar ≠ eliminar**, y la interfaz lo dice en los dos sitios (el aviso y la
  ayuda "Cómo funciona esta bandeja"): rechazar conserva el registro y el empleado
  lee la nota para corregir; eliminar lo borra y el empleado deja de verlo.

### 3. Los filtros de aprobaciones se aplican al cambiar

Fuera el botón "Filtrar": estado, empleado y fechas navegan en cuanto cambian.
La barra pasó a ser un Client Component pequeño
(`src/app/admin/jornadas/FiltrosAprobaciones.tsx`) que reescribe los parámetros
con `router.replace(..., { scroll: false })`; **el Server Component sigue siendo
quien consulta**, así que el enlace sigue compartible, el botón atrás funciona y
`?vista=aprobaciones` no se pierde. "Limpiar" se queda y deja pendientes, todos
los empleados y sin rango de fechas.

> Detalle que costó un intento: `ESTADOS` no puede exportarse desde el módulo
> `"use client"` y leerse en el servidor —llega como referencia de cliente, no
> como arreglo—. Vive en `src/lib/admin-types.ts` como
> `JORNADA_FILTRO_ESTADOS` / `JORNADA_FILTRO_ESTADO_DEFECTO`.

## Iteración del 31 de julio de 2026 — complementos post-aprobación

Tres complementos que GPI pidió después de aprobar el sitio. Todos necesitan la
**migración 0005** (`supabase/migrations/0005_proyectos_correo_orden.sql`), pero
—como siempre— el código funciona sin ella: mientras esté pendiente el sitio se
ve y se comporta igual, apoyándose en el respaldo estático.

### 1. El formulario de contacto llega al correo corporativo

Antes, el formulario de `/contacto` armaba un mensaje de WhatsApp. Ahora el
destino es el correo corporativo de GPI, inicialmente `gpi.gerencia1@gmail.com`.

- En esta iteración el envío se hacía abriendo el programa de correo del
  visitante (`mailto:`). **Eso cambió el 3 de agosto**: GPI probó el sitio y el
  botón "no abría nada" en computadores sin programa de correo configurado. Ver
  la [iteración del 3 de agosto](#iteración-del-3-de-agosto-de-2026--el-formulario-envía-el-correo-de-verdad).
- **WhatsApp se conserva** como alternativa secundaria: un enlace discreto
  *"¿Prefieres WhatsApp? Escríbenos aquí"* arma el mismo mensaje hacia el número
  principal. Es el canal que más usa el cliente de GPI y quitarlo habría sido un
  retroceso.
- **El correo es editable** desde `/admin/ajustes` → *Datos de contacto* →
  **"Correo del formulario de contacto"**, con validación de formato. Vive en
  `site_settings.contact.correoFormulario` y **no reemplaza** los correos
  personales de las tarjetas de contacto, que siguen igual.

### 2. Cada proyecto tiene su página

Se descartó el lightbox: una página por proyecto posiciona en Google, es
compartible por WhatsApp y queda consistente con `/servicios/[slug]`.

- **`/proyectos/[slug]`** con breadcrumbs, cabecera con la foto del proyecto,
  ficha de cliente y área, descripción larga en párrafos, galería, CTA
  *"¿Tiene un proyecto similar?"*, listado del resto del portafolio y navegación
  anterior / todos / siguiente. `generateStaticParams` + `dynamicParams`,
  metadata propia con canonical y OpenGraph, JSON-LD `CreativeWork` (más el
  `BreadcrumbList` que ya emite el componente de breadcrumbs) y entrada en el
  `sitemap.ts`.
- **Las tarjetas de `/proyectos` son clicables enteras**, con el mismo diseño de
  siempre más el foco visible y un "Ver el proyecto" al pasar el cursor.
- **Tres campos nuevos en `/admin/proyectos`**: dirección web (slug,
  autogenerado desde el título), descripción larga y galería.
- **Slugs finales**: `extraccion-aire-clinica-farallones`,
  `chiller-laboratorios-osa`, `bodega-laboratorios-osa` y
  `planta-piloto-vaselina`. Son los mismos en la migración y en
  `src/data/projects.ts`, y `content.ts` los recupera **por título** si la
  columna `slug` todavía no existe: así la dirección pública no cambia al
  aplicar la 0005.

### 3. La orden de trabajo es opcional

Hay labores sin orden asociada (apoyos internos, traslados, urgencias) y obligar
a inventar un número ensuciaba el reporte.

- `jornadas.work_order` deja de ser `not null`; el formulario dice
  **"Número de orden de trabajo (opcional)"** y explica cuándo dejarlo vacío.
- Vacío se guarda como **NULL**, nunca como cadena vacía; `rowToJornada`
  normaliza a `null` también las cadenas vacías que quedaran de antes.
- **Decisión sobre la gráfica** *"Horas por orden de trabajo"*: las jornadas sin
  orden **se agrupan** bajo la etiqueta **"Sin orden de trabajo"**, no se
  excluyen. Excluirlas haría que la gráfica no sumara el total de horas de la
  bandeja, y una cifra que no cuadra con el resto del tablero es peor que una
  barra con nombre explícito. La etiqueta es la constante `SIN_ORDEN_TRABAJO` de
  `src/lib/admin-types.ts`, compartida por aprobaciones, «Mis jornadas», la
  tabla del tablero, el CSV y la gráfica.

## Iteración del 3 de agosto de 2026 — el formulario envía el correo de verdad

GPI probó el formulario de `/contacto` en producción y reportó que **"no abre
nada"**. No era un error: `mailto:` abre el programa de correo del equipo, y su
equipo —como la mayoría de la gente hoy— no tiene ninguno configurado. El
cliente pidió lo obvio: *que al presionar el botón el correo se envíe de
inmediato*.

Necesita la **migración 0006**
(`supabase/migrations/0006_mensajes_contacto.sql`) para el respaldo en base de
datos, pero —como siempre— el código funciona sin ella.

### 1. Envío por SMTP de Gmail desde una server action

- Nueva server action `enviarMensajeContacto`
  (`src/app/contacto/actions.ts`): valida en el servidor, guarda, envía y
  devuelve un estado tipado (éxito / error por campo / error de envío).
- El envío usa **`nodemailer`** contra `smtp.gmail.com:465` con una
  **contraseña de aplicación** de Google (`CONTACT_SMTP_USER` /
  `CONTACT_SMTP_PASS`). Es la única dependencia nueva del proyecto y evita
  contratar un proveedor de correo transaccional: GPI ya tiene la cuenta.
- **`Reply-To` = el correo del visitante.** Es el detalle que convierte el
  formulario en una herramienta comercial: GPI pulsa *Responder* en Gmail y le
  escribe al prospecto, no a su propia bandeja.
- **El destinatario sale SIEMPRE del servidor**
  (`site_settings.contact.correoFormulario`), nunca del formulario. Si viniera
  del cliente, la acción sería un relay abierto: cualquiera podría mandar correo
  a quien quisiera firmado por la cuenta de GPI.
- Las credenciales no cruzan al navegador: el Server Component de `/contacto`
  baja un único booleano `smtpConfigurado`.

### 2. El mensaje se guarda antes de intentar enviarlo

`site_mensajes` (migración 0006) guarda cada mensaje con `correo_destino` y
`enviado`. **El orden importa**: se guarda *antes* del envío porque el correo es
la parte frágil (la contraseña de aplicación se vence, Gmail corta, el mensaje
cae en spam). Si el guardado funciona, el prospecto ya no se pierde aunque el
correo falle.

- La tabla tiene RLS con **una sola política**: SELECT para managers, pensando
  en una futura bandeja de mensajes en el panel. **No hay política de INSERT**:
  las inserciones las hace el servidor con la clave `service_role`. Con una
  política de INSERT para `anon`, cualquiera podría llenar la tabla contra la
  API REST de Supabase saltándose el formulario y sus filtros.
- **Matiz de UX decidido aquí**: si el correo falla pero el mensaje quedó
  guardado, el visitante ve *"✅ Recibimos tu mensaje y ya está en nuestra
  bandeja"*, no un error. Es literalmente lo que pasó, y ofrecerle
  "alternativas" cuando su mensaje ya llegó solo sembraría dudas. Las
  alternativas aparecen **únicamente** cuando el mensaje no quedó en ninguna
  parte.

### 3. Tres modos en una sola pantalla

| Situación | Botón principal | Qué más se ve |
| --- | --- | --- |
| SMTP configurado | **Enviar mensaje** → "Enviando…" → "✅ Tu mensaje fue enviado" | Nada más: no hay por qué distraer |
| SMTP configurado y falla | El mismo, con mensaje amable | Gmail web + programa de correo + WhatsApp |
| Sin SMTP | **Enviar por correo** → abre el **compositor de Gmail en el navegador** | Las mismas alternativas, siempre visibles |

El respaldo dejó de ser `mailto:` y pasó a ser el **compositor de Gmail**
(`mail.google.com/mail/?view=cm&…`), que es una URL normal: se abre en una
pestaña y funciona sin ningún programa instalado — justo el fallo que reportó
GPI. `mailto:` se conserva como segunda opción para quien sí usa Outlook. En
modo sin SMTP el formulario **también** manda una copia a la server action, que
la guarda: si el visitante abre Gmail y no llega a pulsar Enviar, GPI conserva
igualmente el contacto.

### 4. Anti-spam sin captcha ni servicios de terceros

- **Campo trampa (honeypot)** oculto: si llega relleno, se descarta y se
  responde *éxito*. Un robot que recibe error reintenta; uno que recibe éxito se
  va.
- **Tiempo mínimo de 3 segundos** entre que el formulario aparece y se envía. Se
  miden con **dos marcas del reloj del propio visitante** (montaje y envío), no
  contra la hora del servidor: comparar relojes distintos descartaría en
  silencio los mensajes de quien tenga el computador mal puesto en hora.
- **Longitudes máximas** por campo y **tope de 5 envíos cada 10 minutos por IP**
  (en memoria del proceso; defensa modesta a propósito, pero corta el
  martilleo).

> Detalle que costó un intento: el compilador de React marca `Date.now()` como
> función impura si se llama desde el cuerpo de un componente, y `setState`
> dentro de un efecto como render en cascada. La marca de montaje se escribe
> directamente en el campo oculto desde el efecto (vía `ref`) y la lectura del
> reloj vive en una función del módulo, fuera del componente.

## Decisiones técnicas

- **Fallback estático primero**: toda la capa de contenido (`src/lib/content.ts`)
  intenta Supabase y, ante falta de variables de entorno, error de red/permisos
  o tabla vacía, cae en `src/data/*`. El sitio público nunca depende de que la
  base de datos esté arriba.
- **Prefijo `site_`** en todas las tablas de contenido (`site_services`,
  `site_projects`, `site_clients`, `site_faqs`, `site_values`,
  `site_settings`) para dejar el namespace libre en Supabase de cara a la
  Fase 2 (horas extra), que usará sus propias tablas sin prefijo o con uno
  distinto (p. ej. `hr_`).
- **Roles en `profiles`**: cada usuario de `auth.users` obtiene una fila en
  `profiles` vía trigger. Desde la migración 0002 los roles son `admin`,
  `coordinador`, `marketing` y `empleado` (las filas viejas con `employee` se
  migran solas). RLS: lectura pública de lo publicado en `site_*`, escritura si
  `is_content_editor()`, gestión de cuentas y jornadas si `is_manager()`.
- **La seguridad se valida siempre en el servidor**: el proxy y el menú lateral
  solo hacen la parte cómoda (redirección optimista y ocultar secciones); la
  barrera real está en el layout de `/admin`, en cada página de sección y en
  cada server action.
- **Ocultar en vez de borrar**: cada ítem de contenido tiene `published` y las
  secciones grandes tienen interruptores en `site_settings.visibility`. Nada se
  pierde al esconderlo.
- **Cálculo de horas parametrizado**: los recargos viven en
  `site_settings.jornada_config`, no en el código, para poder ajustarlos cuando
  GPI confirme sus reglas. `src/lib/jornada.ts` cae en valores por defecto de la
  ley colombiana 2026 si la clave no existe. Desde la migración 0003 el
  **horario ordinario** ya no vive ahí: sale de `horarios_mensuales`, y los
  campos de horario de `jornada_config` quedan como plantilla para crear meses
  nuevos.
- **Tolerancia a migraciones sin aplicar**: igual que el contenido cae en
  `src/data/*`, el sistema de jornadas funciona sin la 0003 ni la 0004. Sin la
  tabla `horarios_mensuales` el cálculo usa el horario predeterminado de GPI; sin
  las columnas nuevas de `profiles` las cuentas se identifican por su correo y
  las escrituras reintentan sin esos campos; sin las columnas de la 0004 el
  desglose se calcula en vivo y aprobar/rechazar/reabrir/editar reintentan sin el
  snapshot. Sin la 0005, el formulario usa el correo por defecto, los proyectos
  toman slug, texto y galería del respaldo estático (por título), `saveProject`
  reintenta sin las columnas nuevas y una jornada sin orden se guarda con el
  campo en blanco. Sin la 0006, el formulario **envía el correo igual** y solo
  se pierde el respaldo en base de datos (queda un aviso en los registros del
  servidor). El build no depende de la base de datos.
- **El correo tampoco es un requisito para que el sitio funcione**: si faltan
  `CONTACT_SMTP_USER` / `CONTACT_SMTP_PASS`, el formulario cambia solo a su modo
  alternativo (compositor de Gmail en el navegador, programa de correo y
  WhatsApp) en vez de prometer un envío que no va a ocurrir. Mismo principio que
  el fallback estático del contenido.
- **`undefined` ≠ vacío**: una columna que llega `undefined` es una migración
  pendiente y activa el respaldo estático; una columna que existe y está vacía es
  una decisión de quien edita el panel y se respeta. Esa distinción es lo que
  evita que un texto borrado a propósito "reaparezca solo".
- **Nada de recalcular lo ya pagado**: el desglose de una jornada aprobada se
  guarda en `jornadas.desglose` con su `contexto_calculo` (horario del día,
  recargos y topes vigentes) y `calculado_at`. La lectura está centralizada en
  `obtenerDesglose()`, así que aprobaciones, métricas, CSV e historial del
  empleado muestran siempre la misma cifra. Las jornadas aprobadas antes de la
  0004 **no se rellenan hacia atrás**: fabricar un `calculado_at` inexistente
  falsearía la auditoría.
- **Ayudas contextuales, no manuales**: el panel explica cada cosa donde se usa
  (`AyudaSeccion`, `AyudaDesplegable`, `hint` de los campos e `InfoTooltip` del
  tablero). Los textos que se repiten son constantes `AYUDA_*` para que no se
  contradigan entre pantallas.
- **ISR + revalidación explícita**: las páginas públicas usan
  `revalidate = 300` (5 minutos) y, además, cada server action de `/admin`
  llama a `revalidatePath("/", "layout")` para que los cambios se vean de
  inmediato sin esperar al intervalo de ISR.

## Pendientes del cliente

- **Contraseña de aplicación de Google** ⚠️: para que el formulario de contacto
  envíe el correo de verdad hace falta generarla en la cuenta
  `gpi.gerencia1@gmail.com` (verificación en dos pasos →
  <https://myaccount.google.com/apppasswords>) y cargarla en Vercel como
  `CONTACT_SMTP_USER` / `CONTACT_SMTP_PASS`. Mientras no esté, el formulario
  funciona en su modo alternativo. Paso a paso en `docs/ADMIN.md` §13.
- **Imágenes**: confirmar/actualizar fotografías de servicios y proyectos si
  GPI quiere reemplazar las heredadas del sitio viejo.
- **Lista de empleados** (Fase 2): nombres, **usuarios**, cédulas, cargos,
  teléfonos y correos de contacto para crear las cuentas desde
  `/admin/empleados`. El sistema ya está listo: solo falta cargarlos.
- **Regla del almuerzo** ⚠️: confirmar que descontar el almuerzo del día cuando
  el turno dura más de 6 horas en un día laboral es lo correcto. La alternativa
  sería pedirle al empleado que registre la hora exacta de su almuerzo, lo que
  complica el formulario.
- **Reglas de cálculo de horas extra** (Fase 2): el horario base ya está
  confirmado y cargado (42 h semanales). Falta confirmar franja nocturna,
  porcentajes de recargo y tratamiento de festivos. Los valores actuales
  (`site_settings.jornada_config`) son los de la ley colombiana 2026 y sirven de
  punto de partida; se ajustan sin tocar código.
- **Quién aprueba las jornadas**: definir qué personas llevan el rol
  `coordinador` (aprueban jornadas, gestionan cuentas y editan los horarios del
  mes) frente a **Community Manager** (solo contenido del sitio + sus propias
  jornadas).

## Referencias

- [`README.md`](../README.md) — visión general, stack y comandos.
- [`docs/ADMIN.md`](ADMIN.md) — migración de Supabase, variables de entorno y
  uso del panel `/admin`.
- [`docs/CONTENIDO.md`](CONTENIDO.md) — contenido original del sitio viejo
  (fuente de textos e inventario de imágenes).
- [`AGENTS.md`](../AGENTS.md) — contexto de marca, datos de contacto oficiales
  y flujo de trabajo con Claude.
