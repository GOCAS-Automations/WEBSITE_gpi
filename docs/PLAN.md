# Plan del proyecto — Sitio web GPI

Estado al **13 de agosto de 2026 (cierre del proyecto)**. Este documento
existe para que cualquier sesión futura (humana o de Claude) arranque con
contexto completo sin tener que reconstruir el historial desde los commits.

**El sitio queda terminado en esta fecha**: Fases 1 y 2 completas, las
**nueve** migraciones aplicadas en el GPI Project, el correo del formulario de
contacto **activo en producción** y el QA final del sitio pasado. La Fase 6 —conectar el
dominio— se completó el **19 de agosto de 2026** con la aprobación de GPI:
el sitio vive en **https://www.gpiprofesionales.com**.

## Fases

| # | Fase | Estado | Notas |
| - | --- | --- | --- |
| 1 | Sitio base: 16 páginas + SEO | ✅ Hecho | App Router, Tailwind v4, metadata por página, JSON-LD `Organization`/`LocalBusiness`/`FAQPage`, `sitemap.ts`, `robots.ts`, breadcrumbs y navegación anterior/siguiente entre servicios. |
| 2 | Mi Cuenta GPI + panel admin CRUD | ✅ Completa | `/mi-cuenta` (login) y `/admin` (servicios, proyectos, clientes, FAQ, valores, contacto/ajustes) sobre Supabase. Migración 0001 aplicada y `.env.local` configurado. |
| 3 | Conexión a DB real y prueba end-to-end | ✅ Completa | Migraciones 0001–0004 aplicadas en el GPI Project; 8 cuentas del equipo creadas; testing completo del cliente ejecutado el 30 jul (plan en `docs/PLAN_PRUEBAS.md`). |
| 4 | Fase 2 del proyecto — Núcleo de horas extra | ✅ Completa | Roles ampliados, CRUD de empleados con cuentas, portal del empleado con registro de jornadas, aprobaciones y visibilidad del contenido. Migraciones 0001 y 0002 **ya aplicadas** en el GPI Project (27 jul 2026); `SUPABASE_SERVICE_ROLE_KEY` configurada en `.env.local`. |
| 4b | Fase 2 — Tablero de métricas de horas extra | ✅ Completa | `/admin/jornadas?vista=metricas`: 4 KPIs, gráficas Recharts (por día, por empleado, extras, Gantt de turnos), filtros client-side, control semanal contra topes legales, glosario amable y export CSV para nómina. |
| 4c | Fase 2 — Iteración post-feedback de GPI | ✅ Completa | Horarios laborales **mes a mes** (`/admin/horarios`), cuentas por **usuario** en vez de correo, y el rol *marketing* pasa a llamarse **Community Manager** (y también registra jornadas). Migración 0003 aplicada. |
| 4d | Fase 2 — Desglose congelado + ayudas del panel | ✅ Completa | Al **aprobar** una jornada su desglose de horas se guarda tal cual, con el horario y los recargos que se usaron: los reportes de nómina ya cerrados no cambian si después se corrige un horario. Además, textos de ayuda en todo el panel para usuarios no técnicos. Migración 0004 aplicada. |
| 4e | Fase 2 — Ajustes del testing del cliente (30 jul) | ✅ Hecho | El panel pasa a ser la pantalla principal de admin y coordinador, los managers pueden **eliminar** jornadas y los filtros de aprobaciones se aplican al cambiar. **Sin migración nueva.** |
| 4f | Complementos post-aprobación (31 jul) | ✅ Completa | Formulario de contacto al **correo corporativo** (editable en Ajustes), **página propia por proyecto** con galería, y **orden de trabajo opcional** en las jornadas. Migración 0005 aplicada. |
| 4g | Envío real del formulario de contacto (3 ago) | ✅ Completa | El formulario pasa de `mailto:` a **envío directo por SMTP** desde una server action, con respaldo del mensaje en `site_mensajes` y modo alternativo (Gmail web / programa de correo / WhatsApp). Migración 0006 aplicada; las variables `CONTACT_SMTP_*` quedaron configuradas el 13 ago (fila 4k). |
| 4h | Rediseño y contenido editable total (12 ago) — **capa de datos y panel** | ✅ Completa | Contenido de **inicio** y **Nosotros** editable desde dos pantallas nuevas del panel y sembrado con los textos oficiales del community manager, **contador de visitas**, **video por servicio** e interruptores por sección. Migración 0007 aplicada. |
| 4i | Rediseño y contenido editable total (12 ago) — **pase visual** | ✅ Completa | El rediseño de las páginas públicas según el prototipo del community manager (línea de tiempo, galería de aliados, misión/visión, menú, opacidad del hero, logos de clientes a color), cerrado a lo largo del pulido final, los ajustes finales del 12 ago y las iteraciones del 13 ago (bucket de imágenes, carrusel de Nosotros con peek). |
| 4j | Pulido final (12 ago) | ✅ Completa | Últimos títulos editables del inicio y de las cabeceras de página (`/admin/inicio`, `/admin/paginas`), menú del panel agrupado en seis entradas detrás de «Contenido del sitio», «Mi Cuenta» rebota al panel para los roles de contenido, arreglo del bug «el panel se traba» al navegar, y ajustes visuales menores. Migración 0008 aplicada. |
| 4k | Cierre del proyecto (13 ago) | ✅ Completa | Correo del formulario **activo en producción** con el SMTP Workspace de GoDaddy (`smtpout.secureserver.net:465`); **teléfono obligatorio** en el formulario de contacto, con la migración 0009 **aplicada**; carrusel de la galería de Nosotros sin puntos indicadores; y QA final del sitio. Con esto son **nueve** las migraciones, todas aplicadas. |
| 4l | Calendario interno de programación (17–18 sep) | ✅ Desplegado | `/admin/calendario` (Calendario · Notas · Métricas) para managers y «Mis eventos» en el portal; aplazar solo hacia adelante y «Devolver a su fecha original»; campo **apodo**, editable por admin y coordinador. Migración 0010 aplicada. |
| 4m | Nómina y volante de pago (17–19 sep) | ✅ Desplegada (19 sep) | `/admin/nomina` (Liquidación · Configuración · Tablero) **solo para el administrador**, volante en PDF y «Mi nómina» en el portal; dinero con punto de miles, configuración «vigente desde» y filtro por persona. Migraciones 0011 y 0012 aplicadas. |
| 4n | Nómina tras la prueba de César (22 sep) | ✅ Hecho (commits locales, **sin desplegar**) | Pestañas de nómina rápidas (clic → contenido de 0,82–0,89 s a ~0,46 s, con la pestaña marcada al instante y esqueleto), **«Dejar sin configuración desde este mes»** (corte, migración **0013 aplicada**) y la **regla de los borradores** al quitar o suspender la configuración. |
| 5 | Deploy en Vercel desde el repo de GitHub + variables de entorno | ✅ Completa | **https://website-gpi.vercel.app** — despliega solo con cada push a `main`; las 3 env vars configuradas (incl. `SUPABASE_SERVICE_ROLE_KEY` sin prefijo). Verificado en vivo: 7 cabeceras de seguridad, 9 rutas 200, `/admin` protegido. |
| 6 | Apuntar dominio `gpiprofesionales.com` de GoDaddy → Vercel | ✅ Completa | **19 ago 2026** — raíz con A `216.198.79.1` y `www` en CNAME; `www` es el dominio principal (el raíz redirige 308, alineado con sitemap/canónicas); certificado emitido y verificación completa en vivo. MX y SPF del correo intactos. |
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
| Contenido editable del inicio y de Nosotros | `supabase/migrations/0007…`, `/admin/inicio`, `/admin/nosotros` |
| Contador de visitas (registro) | `site_visitas` + `registrar_visita()`, `VisitBeacon` |
| Contador de visitas (lectura en vivo, pulido final) | `GET /api/visita`, `VisitCounter` (`src/components/sections/VisitCounter.tsx`) |
| Video de YouTube por servicio | `site_services.video`, `src/lib/youtube.ts` |
| Ayudas del panel para usuarios no técnicos | `AyudaSeccion` / `AyudaDesplegable` + constantes `AYUDA_*` en `src/components/admin/ui.tsx` |
| Títulos del inicio y de las cabeceras de página (pulido final) | `supabase/migrations/0008…`, `site_settings.home` (cuatro bloques nuevos), `site_settings.paginas`, `/admin/inicio`, `/admin/paginas` |
| Menú del panel agrupado en un hub (pulido final) | `/admin/contenido`, `RUTAS_CONTENIDO` en `src/lib/admin-types.ts`, `src/components/admin/AdminShell.tsx` |
| «Mi Cuenta» rebota al panel para roles de contenido (pulido final) | `src/app/mi-cuenta/IrAlPanel.tsx`, portal en `/mi-cuenta?portal=1` |
| Arreglo del bug «el panel se traba» (pulido final) | `src/components/admin/PuntoDeCarga.tsx`, `prefetch={false}` en `AdminShell` (el `app/admin/loading.tsx` que lo acompañaba se eliminó el 22 sep 2026: colgaba las server actions) |
| Galería de Nosotros en carrusel con peek desde la 3.ª foto (pulido final + ajustes del 13 ago: peek y sin puntos) | `src/components/sections/GaleriaAliados.tsx` |
| Teléfono obligatorio en el formulario de contacto (cierre, 13 ago) | `supabase/migrations/0009_telefono_mensajes.sql`, `src/lib/contacto-types.ts`, `src/components/sections/ContactForm.tsx` |

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

## Iteración del 12 de agosto de 2026 — rediseño y contenido editable total

El community manager de GPI entregó dos documentos que son la fuente de verdad
de esta iteración:

- **`prototipo pagina web 12 AGOSTO - Seccion Nosotros.pdf`** — el diseño
  completo de la página Nosotros: hero, Quiénes Somos, Misión/Visión, galería de
  «aliados estratégicos», línea de tiempo empresarial con cuatro hitos y cuatro
  etiquetas, valores y cierre.
- **`CAMBIOS PAGINA WEB 12 DE AGOSTO 2026.pdf`** — la lista de cambios (logo más
  pequeño, menú sobre fondo oscuro, opacidad del hero, «Portafolio de clientes»
  con logos a color, contador de visitas) y una página **TEXTOS** con la
  redacción canónica de *¿Quiénes somos?*, *Misión* y *Visión*.

> **Regla que se aplicó:** cuando el mockup y la página TEXTOS diferían, **mandan
> los textos de la página TEXTOS**. Pasó con la Misión y con la Visión: el
> mockup traía una redacción más pulida («…a través de la mejora continua y la
> integración estratégica…», «…el aliado estratégico de referencia…») y se
> descartó en favor de la que escribió GPI.

El trabajo se partió en dos: **primero la capa de datos y el panel** (esta parte,
ya completa) y **después el pase visual** de las páginas públicas, que está en
curso. El orden importa: rediseñar sobre textos que todavía viven en el código
habría obligado a rehacer el mismo trabajo dos veces.

Todo necesita la **migración 0007**
(`supabase/migrations/0007_contenido_paginas.sql`) pero —como siempre— el código
funciona sin ella: el respaldo estático de `src/data/site.ts` trae exactamente
los mismos textos y las mismas fotos.

### 1. Las páginas generales dejan de estar escritas en el código

La página Nosotros tenía sus textos —presentación, valores, todo— en el TSX. El
cliente pidió poder editar «todas las imágenes y contenido de todas las
secciones generales», así que se crearon **dos claves nuevas** en
`site_settings` y **dos pantallas nuevas** en el panel:

| Clave | Pantalla | Qué contiene |
| --- | --- | --- |
| `home` | **`/admin/inicio`** | El bloque «Quiénes somos» del inicio: texto superior, título, descripción, puntos, foto, **cifras** y botón. Además la pantalla recoge el hero y la banda oscura, que venían de Ajustes |
| `nosotros` | **`/admin/nosotros`** | Hero, Quiénes Somos (título, párrafos, foto), Misión, Visión, galería de aliados, línea de tiempo (hitos y etiquetas), título de los valores, video y cierre |

`/admin/ajustes` se queda con lo transversal: datos de contacto, redes, mapa,
correo del formulario y el único interruptor que afecta a dos páginas.

**Las cifras se mudaron de sitio.** Vivían en `excellence.stats` y se muestran en
«Quiénes somos», así que ahora viven en `home.quienesSomos.stats`. La migración
las **copia** desde donde estaban: unas cifras que GPI hubiera editado desde el
panel no se pierden. `excellence.stats` queda como legado, sin editor.

**«+5 años» pasó a «+15 años»** en el badge del hero, en la banda oscura y en la
primera cifra —GPI corrigió su antigüedad—, pero solo donde el texto seguía
siendo el original: si alguien lo había cambiado a mano, se respeta.

### 2. La visibilidad se reparte por página

`visibility` gana ocho claves (`homeQuienesSomos`, `nosotrosQuienesSomos`,
`nosotrosMisionVision`, `nosotrosGaleria`, `nosotrosLineaTiempo`,
`nosotrosValores`, `nosotrosVideo`, `nosotrosFaq`) y los interruptores pasan a
estar **en la pantalla de la sección que apagan**, no todos juntos en Ajustes.

Dos matices que costaron pensar:

- **Guardado parcial obligatorio.** `visibility` es una sola clave de
  `site_settings` editada desde tres pantallas, y `upsert` reemplaza el valor
  entero. Cada acción **lee lo guardado, mezcla solo sus interruptores y
  escribe**; sin eso, guardar en Nosotros apagaría las secciones del inicio.
  Lo mismo aplica a `home` y `nosotros`, que se editan bloque a bloque.
- **Nada de dos controles para lo mismo.** El video y las FAQ solo existen en
  Nosotros, así que su interruptor escribe **a la vez** la clave nueva y la
  antigua (`videoSection`, `faqSection`). Los valores sí salen en dos páginas y
  por eso conservan de verdad dos niveles: el global de Ajustes y el de la
  página.

### 3. Contador de visitas

`site_visitas` guarda **una fila por día** (`dia`, `total`), no una fila por
visita: así la tabla suma 365 filas al año, el total es una sola consulta y
queda el histórico gratis.

El flujo completo: `VisitBeacon` (en el layout público) hace un `POST` a
**`/api/visita`** una vez por sesión del navegador → el route handler descarta
la petición si esa IP ya sumó en los últimos 30 minutos → llama a
`registrar_visita()` con la clave `service_role` → la función hace
`insert … on conflict do update set total = total + 1`, que es atómico.

- **Se descartó exponer una RPC a `anon`**, que era la vía obvia: la clave
  anónima de Supabase es pública por diseño y cualquiera dejaría el contador en
  el número que quisiera desde la consola del navegador. La función tiene
  `revoke … from public/anon/authenticated` y `grant execute to service_role`.
- **`/admin` y `/mi-cuenta` no cuentan**: contarlos inflaría la cifra con el
  propio trabajo interno de GPI.
- **La lectura mantiene el sitio estático.** `getVisitas()` usa el cliente
  anónimo sin cookies, así que el inicio sigue con ISR. En esta iteración el
  contador se refrescaba cada 5 minutos junto con el resto del contenido; GPI lo
  notó como "el contador está mal" al no ver reflejada su propia visita, y el
  pulido final del 12 de agosto lo corrigió sin volver dinámica la página — ver
  el punto 7 de esa iteración, más abajo. Leerlo en vivo con `unstable_noStore`
  se descartó porque habría vuelto dinámica la portada entera a cambio de una
  cifra de vanidad más fresca.
- **Si la 0007 no está aplicada, la tarjeta no se pinta.** Mostrar «0 visitas» se
  leería como un sitio que nadie visita, que es peor que no mostrar nada.

### 4. Un video de YouTube por servicio

Columna `site_services.video` (`{ url, titulo, descripcion, visible }` o `NULL`).
El **identificador del video no se guarda**: se deriva de la URL al leer, así no
pueden quedar desincronizados. La extracción vive en `src/lib/youtube.ts`, que
acepta las cinco formas de URL que la gente copia (barra del navegador, botón
Compartir, insertar, Shorts y directos) y también el identificador pelado; la
comparte el video corporativo de Nosotros, que antes tenía su propio regex.

El interruptor **Mostrar el video** lo esconde sin borrar el enlace, y
`saveService` reintenta la escritura sin la columna si la 0007 está pendiente
—el mismo patrón que la 0005 con los proyectos—.

### 5. Fotos nuevas

Las cuatro fotos del prototipo no estaban en el repositorio ni en la carpeta de
insumos: solo existían **dentro del PDF**. Se extrajeron de sus streams y se
guardaron en `public/images/cm/`:

| Archivo | Qué se ve | Dónde se usa |
| --- | --- | --- |
| `foto-equipo-gpi-sede.jpg` | El equipo completo frente a la pared con el logo de GPI | Quiénes Somos (Nosotros) y foto de apoyo del inicio |
| `foto-aforo-quebrada-gpi.jpg` | Aforo de una quebrada con la camioneta al fondo | Galería de aliados |
| `foto-monitoreo-agua-registro-datos.jpg` | Dos profesionales registrando datos en un monitoreo de agua | Galería de aliados |
| `foto-tablero-control-planta-gpi.jpg` | Técnico operando un tablero de control en planta | Galería de aliados |

> ⚠️ Salen del PDF, así que están a la resolución a la que el community manager
> las exportó (**512×384** y **385×512**). Se ven bien en tarjeta, pero si GPI
> quiere usarlas a pantalla completa conviene pedirle los originales.

### 6. Una sola definición de «qué es válido»

Al añadir dos claves grandes, `getSettings()` (sitio público) y
`getAdminSettings()` (panel) habrían tenido que normalizar lo mismo por
duplicado, con el riesgo de que el panel mostrara en un campo algo distinto de
lo que la página iba a pintar. Se unificaron en **`normalizarSettings()`**, una
función pura de `src/data/site.ts` que las dos llaman. Lo que el panel enseña es,
literalmente, lo que se ve.

### Lo que falta

El **pase visual** de las páginas públicas. Ahora mismo el contenido nuevo se
renderiza con una maquetación correcta pero conservadora, reutilizando los
componentes que ya existían; el prototipo pide más (la línea de tiempo con su
flecha, la galería con la tarjeta superpuesta, el menú sobre fondo oscuro, la
opacidad del hero, los logos de clientes a color). Nada de eso necesita tocar la
base de datos ni el panel.

> **Cerrado.** Este pase visual se completó a lo largo del pulido final del 12
> de agosto, los ajustes finales del mismo día y las iteraciones del 13 de
> agosto (migración de imágenes al bucket, carrusel de Nosotros con peek). Ver
> la fila 4i de la tabla de fases, arriba, y la iteración «cierre del
> proyecto», más abajo.

## Iteración del 12 de agosto de 2026 — pulido final

Mismo día que el rediseño, pero un encargo distinto: con el contenido de inicio
y Nosotros ya editable, GPI revisó el panel en uso real y volvió con una lista
corta de fricciones —algunas de texto, una de diseño y una **de verdad grave**,
un bug de navegación que hacía parecer roto el panel entero. Esta sección cierra
esa lista, punto por punto.

Necesita la **migración 0008**
(`supabase/migrations/0008_titulos_paginas.sql`), pero —como siempre— el código
funciona sin ella: el respaldo estático de `src/data/site.ts` trae los mismos
textos. La diferencia con la 0007 es que aquí no hay ninguna columna nueva que
pueda faltar (ver el punto 1).

### 1. Los últimos títulos escritos en el código pasan a ser editables

Después de la 0007 quedaban dos bolsillos de texto que GPI no podía tocar desde
el panel: los encabezados que presentan cada bloque grande del inicio, y las
cabeceras de las páginas que no son inicio ni Nosotros.

- **Cuatro bloques nuevos en `site_settings.home`**: `serviciosIntro` (el
  encabezado de «Dos áreas, una misma excelencia»), `valoresIntro` (el
  encabezado de los valores del inicio), `clientes` («Clientes / Portafolio de
  clientes» y su descripción) y `cta` (título y descripción de la franja verde
  de cierre). Se editan en `/admin/inicio`, que pasó de **cuatro tarjetas a
  ocho**, colocadas en el mismo orden en que se ven en la página.
- **Clave nueva `site_settings.paginas`**: la primera pantalla (texto superior,
  título, descripción, imagen de fondo y su texto alternativo) de
  **Servicios**, **Proyectos** y **Contacto**, más el párrafo de presentación
  del **pie de página**. Se edita en la pantalla nueva **`/admin/paginas`**
  («Cabeceras de páginas y pie del sitio»), dentro de «Contenido del sitio».
  El inicio y
  Nosotros no están aquí a propósito: ya tienen su propia pantalla, con muchos
  más bloques que una sola cabecera.
- **El pie decía «Más de 5 años»** —quedó escrito directamente en
  `Footer.tsx` y se congeló ahí mientras el resto del sitio ya decía 15—.
  Ahora sale de `paginas.footer.descripcion` y la semilla dice **«Más de 15
  años»**; la 0008 además corrige el texto viejo exacto si alguien ya lo
  hubiera guardado, y repite por seguridad los tres reemplazos «+5 → +15» de
  la 0007, por si una base se sembró con la 0001 después de la 0007.
- **Sin dependencia real de la migración.** A diferencia del video de
  servicios (una columna nueva de verdad sobre `site_services`), `home` y
  `paginas` son **claves dentro de `site_settings`**, tabla que existe desde
  la 0001: guardar desde el panel crea la fila con `upsert` aunque la 0008
  nunca se aplique. La migración no es un requisito para poder editar, solo
  adelanta la semilla inicial y ahorra que alguien tenga que escribir esos
  ocho textos a mano.
- Normalizadores nuevos en `src/data/site.ts`: `normalizarPaginas()` y
  `seccionIntro()`; `normalizarHome()` se amplió con los cuatro bloques. Todo
  sigue entrando por el punto único de normalización, `normalizarSettings()`
  (ver la iteración anterior). Ocho server actions nuevas en
  `src/app/admin/actions.ts` (`saveHomeServiciosIntro`, `saveHomeValoresIntro`,
  `saveHomeClientes`, `saveHomeCta`, `savePaginaServicios`,
  `savePaginaProyectos`, `savePaginaContacto`, `savePaginaFooter`), todas con
  el mismo patrón de guardado parcial que `home`/`nosotros`/`visibility`: leen
  lo guardado, mezclan solo su bloque y escriben, para que guardar el cierre
  del inicio no borre el título de servicios.

### 2. Logos de clientes centrados

`ClientLogos` pasó de una rejilla `grid grid-cols-6` a `flex flex-wrap
justify-center`, con el ancho de cada tarjeta calculado a mano para dar
exactamente las mismas 2 / 3 / 6 columnas de antes. Un `grid` no puede centrar
su última fila —las columnas están fijadas de antemano—, así que con 15 logos
(el caso real de GPI) la última fila de tres quedaba pegada a la izquierda y se
leía como un hueco, no como un cierre limpio. Con `flex-wrap` la fila
incompleta queda centrada sola.

### 3. Logo del nav más grande

La píldora de escritorio creció de `4.75rem` a `5rem` (76 → 80 px, variable
`--nav-pill-h` en `globals.css`) y el logo pasó de `h-10/h-11/h-14` a
`h-11/h-12/h-16` (44/48/**64 px**). Quedan 10 px de aire en móvil y 8 px en
escritorio respecto al borde de la píldora — lo justo para que el logo crezca
sin tocar el contorno. `sizes` del `<Image>` se actualizó a juego.

### 4. Galería de Nosotros → carrusel

Componente nuevo `src/components/sections/GaleriaAliados.tsx`. La franja de
«Más que proveedores, somos aliados estratégicos» dejaba encoger las fotos
hasta volverlas sellos en cuanto GPI subía una cuarta o quinta imagen, porque
la rejilla estaba pensada para tres.

- **Con 1 o 2 fotos es una franja estática**: 1 foto queda centrada con ancho
  moderado (no estirada a todo el panel); 2 fotos, dos columnas iguales. Con
  tan pocas fotos, un carrusel añadiría flechas y puntos que no llevan a
  ninguna parte.
- **Desde la 3.ª foto** se convierte en carrusel: scroll-snap horizontal
  **nativo** (sin librerías, ni un byte de JavaScript de terceros), flechas ←
  → discretas que se deshabilitan en los extremos en vez de desaparecer (para
  que la fila de controles no salte de posición), puntos indicadores, y
  operable con teclado —el carril es enfocable (`tabIndex=0`) y se recorre con
  las flechas del navegador, comportamiento nativo de un contenedor
  desplazable—. Respeta `prefers-reduced-motion` (el desplazamiento pasa de
  `smooth` a instantáneo) y el gesto táctil es el nativo del navegador.
- Verificado con axe: 0 violaciones. Un detalle que costó un intento: ponerle
  `role="group"` al `<ul>` para nombrar el carrusel le rompía la semántica a
  sus `<li>` (quedaban «huérfanos» y axe los marcaba); la solución fue dejar el
  rol de lista intacto y nombrar con `aria-label` en su lugar.

  **Ajuste del 13 de agosto de 2026 (peek):** con 3 fotos en fila cada imagen
  quedaba «apachurrada» horizontalmente, así que se bajó a **2 fotos completas
  por vista** en vez de 3, y el umbral del carrusel bajó de la 4.ª foto a la
  **3.ª**. Además, el carrusel ahora deja «asomar» un pedazo de la siguiente
  foto por el borde derecho (**peek**) como señal visual de que hay más
  contenido para deslizar: ~2.2 fotos visibles en escritorio (2 completas +
  20 % de la 3.ª) y ~1.2 en móvil (1 completa + 20 % de la 2.ª). El ancho de
  cada foto sale de un `calc()` con esa proporción, medido en el DOM para el
  cálculo del paso del carrusel (no hace falta que sea exacto al pixel).
  Verificado con Playwright en 1440×900 (peek real de ~49 px sobre 576 px de
  carril, ≈20 % de la 3.ª foto) y 390×844 (peek de ~52 px sobre 326 px,
  también ≈20 %), sin scroll horizontal ni errores de consola.

### 5. «Mi Cuenta» lleva al panel

Quien tiene rol de contenido (administrador, coordinador y **Community
Manager**) y pulsa «Mi Cuenta» en el menú público aterrizaba en el formulario
de jornadas, cuando lo que iba a hacer nueve de cada diez veces era entrar al
panel — GPI lo reportó como algo obvio que debía arreglarse.

- Ahora esas tres cuentas, si ya tienen sesión iniciada, ven una pantalla breve
  *"Abriendo tu panel…"* y saltan solas a **`/admin`**. Lo hace
  `src/app/mi-cuenta/IrAlPanel.tsx`, un redirect de **CLIENTE**
  (`router.replace("/admin")`), no de servidor, por la misma razón de
  siempre: `src/proxy.ts` ya manda `/admin` → `/mi-cuenta` cuando no ve sesión,
  así que un `redirect()` de servidor en `/mi-cuenta` cerraría el círculo con
  cualquier cookie a medio refrescar, y además obligaría a `/mi-cuenta` a
  decidir por rol antes de poder servir el portal, que tiene que seguir
  estando disponible para **todos**.
- El **portal de jornadas sigue existiendo** para esas cuentas: vive en
  **`/mi-cuenta?portal=1`**, el parámetro que pide explícitamente el portal en
  vez del panel. Es a donde apuntan ahora el botón «Registrar mi jornada» de
  la barra del `AdminShell` y el enlace del dashboard.
- **También cambió el aterrizaje tras iniciar sesión.** Antes solo admin y
  coordinador iban a `/admin` al ingresar; el Community Manager se quedaba en
  su portal. Ahora los tres roles de contenido (`is_content_editor()`) entran
  directo al panel; el **empleado** sigue yendo a su portal, sin cambios. Lo
  decide `LoginForm`, con el mismo razonamiento de cliente-no-servidor.
- Nadie queda encerrado: el empleado nunca notó nada distinto, y las tres
  cuentas de contenido conservan su portal íntegro (registrar horas, ver su
  historial, cambiar contraseña) a un clic de distancia.

### 6. Menú del panel reorganizado

El menú lateral tenía **doce** entradas y ocho de ellas eran pantallas de
contenido: se leía como un inventario, no como un menú.

- Pasó a **seis**: **Dashboard · Contenido del sitio · Equipo · Horarios ·
  Jornadas · Ajustes**. «Contenido del sitio» es la ruta nueva
  `/admin/contenido`, un índice con tarjetas hacia Página de inicio, Página
  Nosotros, Cabeceras de páginas y pie del sitio, Servicios, Proyectos,
  Clientes, Preguntas
  frecuentes y Valores corporativos.
- **Ninguna URL cambió** (`/admin/servicios` sigue siendo `/admin/servicios`):
  solo se agrupó el menú. Estar en cualquiera de esas ocho pantallas marca
  «Contenido del sitio» como activo, y sus migas de pan y su botón «volver»
  apuntan al índice. La lista de rutas que hace ese reconocimiento es
  `RUTAS_CONTENIDO`, en `src/lib/admin-types.ts`, compartida entre el menú
  (`AdminShell`) y el propio hub.
- El **dashboard** de `/admin` se reorganizó igual: «Gestión interna» (Equipo,
  Horarios, Jornadas, solo managers) y «El sitio web» (Contenido del sitio,
  Contacto y ajustes).
- La entrada de menú «Contacto y ajustes» se acortó a **«Ajustes»** (la
  pantalla conserva su título completo «Contacto y ajustes»); en un menú de
  seis palabras, un nombre de tres términos desentonaba con el resto.

### 7. Contador de visitas al día

El número de visitas venía del HTML estático con hasta cinco minutos de
retraso (el intervalo de ISR): GPI abría el sitio, generaba una visita nueva y
todavía veía la cifra de antes — parecía roto sin estarlo.

- `VisitCounter` pasó a ser un componente de **cliente**: pinta el número
  servido de inmediato (no hay hueco ni «cargando…») y, al montarse, pide el
  total en vivo a la ruta nueva **`GET /api/visita`** (`no-store`, lectura con
  el cliente anónimo, apoyada en la política `site_visitas_select_public` de
  la 0007). Solo actualiza el número **si cambió**, para no provocar un
  parpadeo gratuito.
- El `POST` que suma una visita no cambió: sigue en la misma ruta y sigue
  usando la clave `service_role`, así que el navegador no puede inflar la
  cifra escribiendo directo contra la base de datos.
- Se descartó volver dinámicas las páginas de inicio y Nosotros para leer la
  cifra siempre fresca: habría tirado el ISR de todo el sitio por una cifra de
  vanidad. El HTML sigue siendo estático; solo esta tarjeta pide su propio
  dato una vez, ya en el navegador.

### 8. BUG «la navegación del panel se traba» — RESUELTO

El reporte de GPI: *«a veces se traba, no permite navegar y toca recargar»*. Se
reprodujo con Playwright y la causa no era ningún cuelgue del servidor.

**Qué pasaba.** Todas las rutas de `/admin` son `force-dynamic` y consultan
Supabase en cada petición, pero el segmento **no tenía frontera de carga**
(`loading.tsx`). Sin ella, el router de Next **no confirma la navegación hasta
que el servidor termina de renderizar** — la URL no cambia, la pantalla no se
mueve y no aparece ningún indicador mientras tanto. Medido en local, 400–700 ms
de espera muda; contra Supabase desde Colombia, varios segundos. Durante esa
espera el panel *parecía* congelado, así que la persona volvía a hacer clic —
y **cada clic nuevo cancelaba la navegación en curso**. Con clics cada ~120 ms
no llegaba a confirmarse ninguna: reproducido en pruebas, **doce clics
seguidos y la URL sin moverse ni una vez**. De ahí el «toca recargar»: recargar
manualmente era la única forma de que el navegador abandonara la carrera de
navegaciones canceladas.

**El arreglo, en tres piezas que dependen entre sí:**

> **Corrección del 22 de septiembre de 2026**: la primera pieza,
> `src/app/admin/loading.tsx`, **se eliminó**: era la causa del cuelgue de las
> server actions («Guardando…» para siempre). Quedan las otras dos, que son las
> que quitan la sensación de panel congelado. Ver la iteración de ese día.

1. **`src/app/admin/loading.tsx`** — el `<Suspense>` que le faltaba al
   segmento. Con él, la navegación se confirma **al instante**: la URL cambia,
   el menú marca la sección nueva y el contenido se sustituye por un esqueleto
   mientras el servidor responde. Solo reemplaza el `<main>`: el `AdminShell`
   (barra superior, menú lateral, tabs) vive en el layout y se queda quieto,
   que es lo que hace que el cambio se lea como «esta sección está cargando» y
   no como «la página se recargó».
2. **`src/components/admin/PuntoDeCarga.tsx`** — un punto giratorio en cada
   entrada del menú y en cada tarjeta, con `useLinkStatus()` de Next 16 (que
   solo funciona dentro de un `<Link>` y expone su estado pendiente; es la vía
   que la propia documentación recomienda para este caso — ruta dinámica +
   `prefetch={false}`). Con él, el clic **siempre** hace algo visible, así que
   nadie vuelve a pulsar a ciegas.
3. **`prefetch={false}`** en toda la navegación de `AdminShell`, y en
   `src/proxy.ts` los prefetch ya no refrescan la sesión de Supabase. Esta
   pieza no es cosmética: con el prefetch por defecto, asomar el ratón por el
   menú dispara varias peticiones simultáneas a `/admin/*`, cada una
   intentando canjear el **mismo** refresh token; Supabase los rota de uno en
   uno e invalida los canjes perdedores, lo que deja cookies de sesión
   pisadas, `getUser()` devolviendo `null` y navegaciones a medias hasta
   recargar — exactamente lo que reportó GPI. Sin prefetch, cada navegación es
   una sola petición en serie y el problema desaparece.

**Verificado después del arreglo:** 20 transiciones seguidas sin trabarse, y
tras 10 clics rápidos sobre el mismo enlace, la última navegación se completa
sola y el panel sigue respondiendo con normalidad.

> Las tres piezas dependen entre sí y **no deben quitarse por separado**:
> `loading.tsx` sin `prefetch={false}` deja el problema de las cookies
> pisadas intacto; `prefetch={false}` sin `loading.tsx` deja al clic sin
> respuesta visible otra vez.

### 9. Video de servicio: apagado por defecto

En `/admin/servicios`, cuando el servicio no tenía video guardado, el
interruptor «Mostrar el video» aparecía en **«Mostrar»** sobre campos
completamente vacíos, y GPI creyó que había un video publicado que en
realidad no existía — la página pública nunca mostró nada sin URL (se
verificó), pero el panel sí sugería lo contrario. Ahora el interruptor nace
en **«No visible»**: hay que encenderlo a propósito cuando el enlace esté
listo.

### 10. Recordatorio de guardar, ARRIBA

El aviso de que los cambios no se aplican hasta pulsar «Guardar» vivía al pie
de la barra lateral, donde nadie lo veía mientras editaba. Pasó a ser el
componente `AvisoGuardar` (`src/components/admin/ui.tsx`) y se pinta **arriba
del todo, antes de cualquier formulario**, en todas las pantallas de
contenido y en Ajustes: *«Los cambios NO se aplican hasta que pulses
"Guardar" en el bloque que editaste»*. Las pantallas de un solo formulario
(crear/editar un servicio, por ejemplo) usan una variante que dice «un solo
botón, al final», porque ahí sí hay un único guardado y no bloques sueltos.
Uno por pantalla, nunca uno por bloque — repetirlo tantas veces como tarjetas
hay habría vuelto la pantalla ruidosa.

### 11. Barrido de textos y mensajes de prueba

Revisión final antes de cerrar la iteración: el único texto viejo de cara al
público que quedaba era el «Más de 5 años» del pie (arreglado en el punto 1).
No se encontraron mensajes de prueba olvidados en ninguna pantalla. El aviso
del formulario de contacto que dice que el envío directo «estará disponible
muy pronto» (botón inhabilitado hasta cargar `CONTACT_SMTP_USER` /
`CONTACT_SMTP_PASS`, ver la [iteración del 3 de
agosto](#iteración-del-3-de-agosto-de-2026--el-formulario-envía-el-correo-de-verdad))
es real y **se queda**: no es un texto de prueba, es el estado actual del
sitio hasta que GPI cargue esas credenciales.

## Ajustes finales del 12 de agosto de 2026 (después del pulido)

Cinco retoques pedidos al revisar el sitio ya desplegado. **Ninguno necesita
migración**: la única clave nueva (`nosotros.quienesSomos.badge`) se normaliza
con respaldo estático, igual que todo lo demás.

### 1. Los gadgets del «Quiénes somos», más pequeños y en pareja

El recuadro del contador de visitas tenía el tamaño de una tarjeta de cifras y
pesaba más que el dato que enseña. Pasó a ser un **chip**: número de 20/24 px y
12/16 px de relleno, en el inicio y en Nosotros (`VisitCounter`).

En **Nosotros** recupera al lado el sello verde **«+15 / AÑOS DE EXPERIENCIA»**
del prototipo del community manager (página 3 del PDF del 12 de agosto; allí
decía «+5», GPI corrigió la cifra a 15). Los dos se apoyan juntos en el borde
inferior de la foto del equipo, medio dentro y medio fuera: en escritorio
alineados a la derecha, y en móvil repartiéndose el ancho de la foto —`flex-1`
solo hasta `sm`— para que no se partan en dos líneas.

El texto del sello es editable en `/admin/nosotros` → *Quiénes Somos*
(«Sello: cifra» y «Sello: texto»). Vive en `nosotros.quienesSomos.badge`, una
**subclave nueva sin migración**: cuando no existe manda `nosotrosDefaults`, y
si existe con la cifra vacía el sello no se pinta (la regla `undefined` ≠ vacío
de siempre).

### 2. Transiciones de Nosotros

La galería «Más que proveedores…» era una banda verde a sangre: el verde
saturado aparecía de golpe bajo el blanco de Misión y Visión y desaparecía
igual de seco antes de la línea de tiempo. Ahora la banda es un **bloque
redondeado** —el mismo recurso que ya usaba `CtaBand`— apoyado sobre un campo
verde muy pálido que **nace y muere en blanco**
(`from-white via-brand-tint to-white`), con espacio generoso arriba y abajo.

Con el mismo criterio, las dos bandas grises de la página (valores y preguntas
frecuentes) cambian `bg-mist` por la utilidad nueva **`.banda-suave`**
(`globals.css`): el gris entra y sale en 4 rem de degradado. La fundida es de
alto **fijo** y empieza y termina en blanco, así que cada sección queda bien sea
cual sea su vecina — que en este sitio se pueden apagar una a una desde el
panel. Como consecuencia, la ola del hero de Nosotros ya no necesita calcular su
color: todas las secciones empiezan en blanco.

### 3. «Títulos de páginas» → «Cabeceras de páginas y pie del sitio»

La pantalla no solo edita títulos: también descripciones, imágenes de cabecera y
el texto del pie. Se renombró la tarjeta del hub, el título de la pantalla, la
miga de pan y las menciones de `docs/`. **La URL sigue siendo `/admin/paginas`**:
renombrar una pantalla no es mover una ruta.

### 4. Logo del nav más grande (tercera vez que lo pide GPI)

De 64 a **80 px** de alto en escritorio (52/56 px en móvil y tableta) y la
píldora crece con él: `--nav-pill-h` pasa a **6 rem** (96 px) en escritorio y
4.5 rem (72 px) en móvil, dejando 8-10 px de aire. `--nav-h` y `.under-nav` se
recalculan solos por `calc()`, así que los héroes siguen cuadrados al pixel. El
atributo `sizes` sube a 141 px para que el navegador no descargue un candidato
mayor del necesario.

### 5. SMTP configurable: el formulario puede salir del buzón del dominio

`src/lib/correo.ts` tenía `smtp.gmail.com:465` escrito en el código. Ahora el
servidor se elige con **`CONTACT_SMTP_HOST`** (por defecto `smtp.gmail.com`) y
**`CONTACT_SMTP_PORT`** (por defecto `465`; `secure` = puerto 465, y cualquier
otro puerto negocia STARTTLS). Lo que enciende el envío directo **no cambia**:
`smtpContactoConfigurado()` sigue siendo USER + PASS.

Con esto GPI puede enviar desde `xperea@gpiprofesionales.com` a través de
`smtpout.secureserver.net:465` (el correo Workspace de GoDaddy, donde viven
los buzones del dominio — no el cPanel), que es mejor para la entregabilidad
que salir desde una cuenta de Gmail. Detalle fino: el borrado de espacios de
la contraseña **solo se aplica a Gmail** (viene de sus contraseñas de
aplicación en grupos de 4); en un buzón de dominio la contraseña puede llevar
espacios de verdad y solo se recortan los extremos. Pasos exactos en
`docs/ADMIN.md` §13 → *Con buzón del dominio (correo Workspace de GoDaddy)*.

## Iteración del 13 de agosto de 2026 — imágenes al bucket de Supabase

Regla nueva del cliente: ninguna imagen de **contenido** puede referenciar
rutas del repositorio (`/images/...`). Se migraron los **53 archivos** de
`public/images/` que el sitio usaba como contenido al bucket público
`site-images` y se reescribieron sus **53 referencias** en la base de datos
(11 servicios, 4 proyectos, 5 clientes y las claves `hero`, `home`, `nosotros`
y `paginas` de `site_settings`). Verificado: 0 referencias `/images/` en la
base de datos. No hizo falta ninguna migración SQL nueva: es una migración de
datos, no de esquema.

- **Bucket organizado en seis carpetas** con nombres kebab-case que se leen
  solos: `inicio/`, `nosotros/`, `servicios/`, `proyectos/`, `clientes/` y
  `cabeceras/` (la foto de fondo de cada cabecera de página). Las imágenes que
  el propio cliente ya había subido desde el panel se conservan con su nombre
  de siempre (`<marca-de-tiempo>-<archivo>`), sin tocar. Bucket final: **67
  archivos, 15,5 MB** (66 referenciados; el único suelto es una foto que GPI
  subió desde el panel y nunca llegó a guardar en ningún campo).
- **Dos fotos que estaban escritas en el código pasan a ser editables.** Las
  imágenes de las dos tarjetas grandes de área —«Servicios Industriales» y
  «Servicios Ambientales», en el inicio y en `/servicios`— eran las dos
  únicas fotos del sitio sin ninguna pantalla que las cambiara. Se subieron
  al bucket como `servicios/categoria-industrial.jpg` y
  `servicios/categoria-ambiental.jpg` (de ahí que el total suba de 51 a 53) y
  ganaron una tarjeta nueva, **«Fotos de las dos áreas»**, en
  `/admin/paginas`: solo la foto y el texto alternativo de cada una, el
  nombre y la descripción del área siguen fijos. Vive en
  `site_settings.paginas.categorias`; sin ese dato el sitio cae en el
  respaldo estático, como siempre, y tampoco hizo falta migración SQL.
- **La galería ya deja subir archivos, no solo pegar un enlace.** Las listas
  de fotos —galería de un servicio, galería de un proyecto y las fotos de
  «Más que proveedores, somos aliados estratégicos» en Nosotros— tenían solo
  el campo de URL; cada fila ganó su propio botón **Subir imagen**, que
  guarda en la misma carpeta del bucket que la portada de esa pantalla.
- **`public/images/` no se borra**: sigue siendo el respaldo del modo estático
  (`src/data/*`) que usa el sitio si Supabase no responde — invisible para el
  cliente, sin cambios.
- **Lo que sigue en el código, a propósito** (es *chrome*, no contenido
  editable): el logo de la barra de navegación y del pie, el favicon y la
  imagen por defecto para redes sociales (OpenGraph).
- **Nueva vía recomendada para imágenes externas: Cloudinary.** El campo de
  imagen del panel ya admitía subir un archivo o pegar una URL; ahora la
  recomendación oficial para la segunda vía es Cloudinary (plan gratuito) —
  cuenta → subir foto → pegar la URL `https://res.cloudinary.com/...`. Se
  sumó `res.cloudinary.com` a `images.remotePatterns` y al `img-src` de la CSP
  en `next.config.ts`; las URLs de otros servidores se siguen pintando "sin
  optimizar" para no romper la página, pero pueden quedar bloqueadas por la
  CSP. Detalle paso a paso en `docs/ADMIN.md`.
- **La galería de aliados de Nosotros deja de salirse del contenedor.** «Más
  que proveedores, somos aliados estratégicos» vivía en una caja propia más
  ancha que el resto de la página; ahora usa el mismo contenedor que
  Misión/Visión y el texto de arriba —el campo verde pálido sigue yendo de
  borde a borde, pero el bloque y las fotos empiezan y terminan en la misma
  línea vertical que las demás secciones—. Verificado en escritorio (1440 px)
  y móvil (390 px); no cambia nada de cómo se usa el panel.

## Iteración del 13 de agosto de 2026 — galería de aliados con peek

Pedido puntual del cliente sobre `src/components/sections/GaleriaAliados.tsx`
justo después de alinearla al contenedor (ver iteración anterior): con 3 fotos
en fila (el caso real de GPI hoy) cada foto quedaba «apachurrada»
horizontalmente, y con el carrusel activándose recién en la 4.ª foto no había
ninguna pista visual de que se pudiera deslizar hasta que hubiera una cuarta.

- **2 fotos completas por vista en vez de 3.** Menos fotos por fila, cada una
  más ancha — se nota sobre todo en escritorio, donde antes el `aspect-auto`
  las dejaba muy angostas comparadas con su altura.
- **El carrusel se activa desde la 3.ª foto** (antes la 4.ª). Con 1 sola foto
  queda centrada con un ancho máximo moderado (`max-w-md`, no estirada a todo
  el panel); con 2, la franja estática de dos columnas de siempre.
- **Peek**: con 3 fotos o más, el carrusel deja asomar un pedazo de la
  siguiente por el borde derecho —~20 % de su ancho— como señal de que hay
  más contenido para deslizar. En escritorio equivale a ~2.2 fotos visibles
  (2 completas + el asomo de la 3.ª); en móvil, ~1.2 (1 completa + el asomo de
  la 2.ª). El ancho de cada foto es un `calc()` en Tailwind
  (`(100% - k·gap) / (k + peek)`, con `k` fotos completas y `peek = 0.2`); se
  explica con la cuenta completa en un comentario del propio componente.
- Verificado con Playwright (build de producción, `next start`) en 1440×900 y
  390×844 contra el contenido real de Supabase (3 fotos): el bloque de la
  galería sigue exactamente alineado al `Container` (x=176→1264 en 1440,
  x=20→370 en 390), el peek mide ~20 % de la 3.ª foto en ambos anchos, la
  flecha «siguiente» desplaza el carril de verdad (198 px en escritorio,
  clamps al final del scroll; 274 px en móvil, ajustado al snap de la
  siguiente foto), sin scroll horizontal y sin errores de consola. Los casos
  de 1 y 2 fotos —que la base real no ejercita hoy— se probaron aparte con una
  ruta temporal y datos de prueba, y se borraron al terminar.
- Sin migración: es un cambio puramente visual sobre datos que ya existían.

## Iteración del 13 de agosto de 2026 — SMTP: el buzón del dominio vive en Workspace, no en el cPanel

Diagnóstico hecho con pruebas reales al intentar activar el envío desde
`xperea@gpiprofesionales.com`:

- **Síntoma**: `mail.gpiprofesionales.com:465` (Exim del cPanel) rechazaba el
  login del buzón con `535 Incorrect authentication data`, con la contraseña
  correcta (la misma del webmail).
- **Causa**: los registros MX de `gpiprofesionales.com` apuntan a
  `smtp.secureserver.net` / `mailstore1.secureserver.net` — los buzones
  (`xperea@`, `ycamacho@`) viven en el **correo Workspace de GoDaddy** (Web-Based
  Email, una plataforma separada del hosting), no en el cPanel. El cPanel nunca
  tuvo esas cuentas de correo, por eso rechazaba cualquier contraseña.
- **Solución**: el servidor correcto es **`smtpout.secureserver.net`, puerto
  `465`** (SMTPS). Probado con las credenciales reales de
  `xperea@gpiprofesionales.com`: `verify()` en OK y envío real aceptado (`250
  mail accepted for delivery`), dos correos de prueba entregados. La contraseña
  es la normal del buzón (la del webmail de GoDaddy, no la del cPanel); se
  restablece desde la cuenta de GoDaddy, no desde el cPanel. Solo se probó el
  puerto 465 en ese host (el 587 queda sin verificar).
- **Estado**: `.env.local` ya quedó actualizado con el host correcto. Pendiente
  solo cargar las cuatro variables (`CONTACT_SMTP_HOST`,
  `CONTACT_SMTP_PORT`, `CONTACT_SMTP_USER`, `CONTACT_SMTP_PASS`) en Vercel y
  volver a desplegar.

## Iteración del 13 de agosto de 2026 — cierre del proyecto

Último encargo antes de declarar el sitio terminado: activar el correo en
producción, sumar el teléfono al formulario de contacto y un repaso de QA de
punta a punta.

### 1. El correo del formulario queda activo en producción

Las cuatro variables de entorno del SMTP (`CONTACT_SMTP_HOST`,
`CONTACT_SMTP_PORT`, `CONTACT_SMTP_USER`, `CONTACT_SMTP_PASS`) ya están
cargadas tanto en Vercel como en `.env.local`, con el host confirmado en la
iteración anterior: **`smtpout.secureserver.net:465`** (el correo Workspace de
GoDaddy). El botón «Enviar mensaje» de `/contacto` ya no es una promesa:
envía de verdad.

### 2. Teléfono obligatorio en el formulario de contacto

GPI pidió poder devolver la llamada a quien escribe, no solo responder por
correo. El formulario de `/contacto` pasa a pedir **Nombre\*, Empresa
(opcional), Correo electrónico\*, Teléfono\* y Mensaje\***, con el teléfono
**al lado del correo**, en la misma fila de dos columnas (una debajo de otra
en móvil).

- Campo `type="tel"`, `autocomplete="tel"`, `inputMode="tel"`, marcador de
  posición `+57 318 434 1249`, máximo 30 caracteres.
- **Validación laxa a propósito**, en el navegador y en el servidor (la del
  servidor es la que manda): admite dígitos, espacios, `+`, guiones,
  paréntesis y puntos, y exige entre **7 y 20 dígitos** una vez quitados los
  separadores. Pasan un fijo de Cali («602 555 5555»), un celular con
  indicativo («+57 318 434 1249») o un número internacional.
- Mensajes de error en español: *«Escribe tu número de teléfono.»* si va vacío
  y *«Ese teléfono no parece válido. Escríbelo con indicativo, por ejemplo:
  +57 318 434 1249»* si está mal escrito.
- El teléfono **llega en el correo** que recibe GPI (fila «Teléfono» en la
  ficha y línea «Teléfono: …» en la versión de texto plano, la misma que usan
  los enlaces de respaldo de Gmail / programa de correo) y se guarda en
  `site_mensajes.telefono`.
- Archivos: `src/components/sections/ContactForm.tsx`,
  `src/app/contacto/actions.ts`, `src/lib/contacto-types.ts`
  (`esTelefonoValido`, `ERROR_TELEFONO`, `DIGITOS_TELEFONO` y el límite de 30
  caracteres) y `src/lib/correo.ts`.

Necesita la **migración 0009**
(`supabase/migrations/0009_telefono_mensajes.sql`), que añade `telefono text`
(nullable) a `site_mensajes` — nullable porque los mensajes recibidos antes de
este cambio no tienen teléfono. **Ya está aplicada** en el GPI Project
(verificado contra `information_schema.columns`). Como siempre en este
proyecto, el código funciona igual sin ella: si la columna no existiera
todavía, la server action reintenta el `insert` sin ella (el mismo patrón que
`saveService` con la columna `video`) y el teléfono viaja de todos modos
dentro del correo.

Con la 0009 son **nueve** las migraciones, todas aplicadas.

### 3. El carrusel de la galería de Nosotros pierde los puntos

`src/components/sections/GaleriaAliados.tsx` deja de mostrar la fila de
puntos indicadores debajo de las fotos, junto con el espacio vertical que
ocupaba: el bloque termina justo donde terminan las imágenes. Se sigue
recorriendo con las **flechas**, deslizando con el dedo, con la rueda del
ratón o con el teclado — todo eso sigue igual. Puramente visual, sin
migración.

### 4. QA final

Repaso de cierre antes de declarar el sitio terminado: páginas públicas
revisadas en escritorio y en móvil, sin errores de consola, y el envío del
formulario de contacto probado de punta a punta (incluido el teléfono nuevo).

### Estado del proyecto

Con este cierre, el sitio queda **terminado**: Fases 1 y 2 completas, las
nueve migraciones aplicadas, el correo del formulario activo en producción y
el QA final pasado. Y desde el **19 de agosto de 2026** el dominio está
conectado: el sitio vive en **https://www.gpiprofesionales.com** (ver la
iteración de lanzamiento). No queda ningún pendiente técnico.

## Iteración del 19 de agosto de 2026 — lanzamiento: dominio conectado

GPI aprobó la entrega y el dominio quedó apuntado el mismo día. Estado
verificado contra los nameservers autoritativos de GoDaddy y contra el sitio
en vivo:

- **DNS (GoDaddy)**: raíz `gpiprofesionales.com` con **A `216.198.79.1`**
  (Vercel) y `www` en **CNAME al raíz**. Los **MX** (`smtp.secureserver.net`,
  `mailstore1.secureserver.net`) y el **SPF** (`v=spf1 include:secureserver.net -all`)
  del correo Workspace **no se tocaron**.
- **Vercel**: tres dominios en el proyecto — `www.gpiprofesionales.com`
  (**principal**, Production), `gpiprofesionales.com` (redirige **308** a `www`)
  y `website-gpi.vercel.app`. `www` como principal es deliberado: es lo que
  declaran `sitemap.ts`, `robots.ts`, las canónicas, el JSON-LD y las OpenGraph
  desde el primer día.
- **Certificado**: Let's Encrypt emitido automáticamente (Vercel lo renueva solo).
- **Verificación en vivo (19 ago)**: raíz→www y http→https en 308; 20/20 rutas
  del sitemap más `/mi-cuenta`, `/sitemap.xml` y `/robots.txt` en 200; `/admin`
  en 307 sin sesión; `/api/visita` en 200; 7/7 cabeceras de seguridad; imágenes
  desde el bucket; formulario con teléfono y envío directo activo; sitemap con
  las 20 URLs en `www`.
- **Hosting viejo de GoDaddy** (cPanel «Web Hosting Deluxe»): quedó **sin
  renovar** — expira el **10 de octubre de 2026** y nada del proyecto depende de
  él. OJO: el **registro del dominio** y el **correo Workspace** son productos
  aparte y esos **sí deben seguir renovándose**.
- **Siguiente paso SEO**: propiedad de dominio en **Google Search Console**
  (verificación por TXT en el DNS de GoDaddy) y enviar
  `https://www.gpiprofesionales.com/sitemap.xml`.

## Iteración del 14 de septiembre de 2026 — optimizador de imágenes apagado

La cuenta Hobby de Vercel (GOCAS) agotó su cupo mensual de **transformaciones
de imagen**; con el optimizador encendido, `/_next/image` respondería errores
al exceder el cupo y las fotos del sitio se verían rotas. Decisión:

- `images.unoptimized: true` en `next.config.ts` — **ninguna imagen pasa por
  el optimizador de Vercel**: se sirven tal cual desde su origen (bucket de
  Supabase o Cloudinary), así que no hay cupo que agotar y no se rompen nunca.
- Trade-off asumido: se pierden el WebP/AVIF y el redimensionado automáticos
  (páginas algo más pesadas, sobre todo en móvil). Si el rendimiento volviera
  a ser prioridad: plan Pro, o servir las fotos grandes desde Cloudinary con
  transformaciones en la URL (`f_auto,q_auto,w_…`), que optimiza gratis.
- `remotePatterns`, `HOSTS_IMAGEN_OPTIMIZABLES` y la lógica condicional de
  `ContentImage` **se conservan sin tocar** por si el optimizador se reactiva.
  El aviso ámbar del panel sigue vigente: la **CSP** sí sigue bloqueando
  imágenes de hosts no permitidos.

## Iteración del 16 de septiembre de 2026 — CSV numérico y URLs del sitio viejo

- **CSV de jornadas**: GPI reportó que las duraciones (`8h 30m`) llegaban a Excel
  como texto y no se podían sumar. Ahora las once columnas de duración salen
  como número con coma decimal (`10`, `10,5`, `7,33`) y se quitó la columna
  «Horas (decimal)», ya redundante: el archivo queda en **19 columnas**. En
  pantalla las duraciones se siguen mostrando con horas y minutos.
- **Redirecciones del sitio viejo**: el equipo reportó que desde Google a veces
  veían el sitio anterior. Diagnóstico: en sus dispositivos era la **caché del
  navegador** (el sitio viejo no enviaba `Cache-Control` y sus archivos eran de
  2023, así que los navegadores lo guardaban por meses según su regla
  heurística), no un problema de DNS — verificado: dominio y `www` apuntan a
  Vercel, TTL de 1 h, sin registros AAAA sueltos. Al revisarlo apareció algo
  real y corregible: las **15 páginas `.html` del sitio viejo** siguen
  indexadas en Google y daban **404**. Se añadieron redirecciones **308** en
  `redirects()` de `next.config.ts`, con el mapeo tomado de los enlaces reales
  del sitio viejo. Verificadas las 15 en local antes de desplegar.

## Iteración del 17 de septiembre de 2026 — calendario interno de programación

Primera de las dos funcionalidades que pidió la gerencia en la reunión del 16 de
septiembre (la segunda, nómina, va aparte). **Migración 0010 aplicada.**

### 1. Qué se construyó

Un módulo nuevo del panel, **`/admin/calendario`**, solo para managers (admin y
coordinador), con tres pestañas sobre los mismos datos:

- **Calendario** — cuadrícula mensual **hecha a mano** (sin librerías nuevas: son
  quince líneas de aritmética de fechas en `src/lib/calendario.ts`), con la
  semana empezando en lunes, los festivos colombianos que ya usaban las jornadas
  y los eventos del día como fichas de color. Al lado —o debajo, según el ancho—
  una **agenda del mes**. El mes viaja en la URL (`?anio=&mes=`).
- **Notas** — todas las notas de seguimiento en una tabla, de la más reciente a
  la más antigua, con filtros por evento, autor y rango de fechas, y paginación.
- **Métricas** — KPIs y Recharts con las piezas del tablero de jornadas
  (`dashboard-ui`): eventos por estado, evolución mensual, carga por responsable
  (externos incluidos), tasa de cumplimiento y eventos con más notas.

Un evento tiene título, día, hora de inicio y fin, descripción y varios
**responsables**, que pueden ser cuentas del portal o personas externas escritas
a mano con la opción «Otro». Nace **programado** y se cierra como **cumplido** o
**incompleto**, o se **aplaza** a otra fecha.

### 2. Las decisiones que importan

- **`fecha_original`**: al aplazar por primera vez se guarda el día en el que el
  evento estaba programado, y no se vuelve a tocar aunque se mueva tres veces.
  Sin ese dato, mover un evento borraba la historia, que es justo lo que la
  gerencia quiere poder ver.
- **Marcar incompleto ≠ eliminar**, con el mismo discurso que «rechazar ≠
  eliminar» en jornadas: lo primero deja constancia con sus notas, lo segundo
  borra el evento y su historia. Eliminar pide dos confirmaciones.
- **Quién ve qué**: los managers ven todo; cualquier otra cuenta activa ve solo
  los eventos en los que figura como responsable y puede añadirles notas, desde
  la sección **«Mis eventos»** del portal. El Community Manager **no** es
  manager: en el calendario se comporta como un empleado.
- **Las notas no se pintan en la cuadrícula**: convertirían cada casilla en un
  muro de texto. Se leen en su pestaña y dentro de cada evento.

### 3. El apodo de las cuentas

A mitad de la iteración, GPI pidió un campo **apodo** por cuenta («YC» para
Yeison Camacho): es lo que se muestra donde el nombre completo no cabe —fichas
del calendario, agenda, tabla de notas, gráficas por responsable— mientras que
en el detalle y en el formulario se sigue leyendo «Nombre completo (YC)».

Va en `profiles.apodo` y **solo lo edita un administrador**: al coordinador se le
muestra en un campo de solo lectura —esconderlo haría pensar que el dato no
existe— y la server action **descarta** el campo si quien guarda no es
administrador, aunque manipule el formulario. Verificado en la prueba: con una
cuenta de coordinador se renombró el campo a mano y se envió «ZZ»; el valor no
cambió.

### 4. Dos hallazgos de fondo (no eran del calendario)

1. **Un Client Component que importe COMPONENTES de `components/admin/ui.tsx`
   deja colgadas las server actions de esa pantalla en producción.** El botón se
   queda en «Guardando…» para siempre aunque el dato ya esté escrito en la base
   de datos; en desarrollo no se reproduce. `ui.tsx` no lleva `"use client"` y
   depende de `PuntoDeCarga`, que sí: arrastrarlo al grafo del navegador rompe la
   respuesta de la acción. Diagnosticado por bisección con `next build` +
   `next start`. La solución es `components/admin/ui-base.tsx` (`"use client"`)
   con los campos, insignias, tarjetas y notas de ayuda, reexportado desde
   `ui.tsx` para no tocar ningún import existente. `JornadasDashboard`,
   `ReviewActions` y las barras de filtros pasaron también a `ui-base`: el
   tablero de métricas tenía el mismo defecto latente, invisible solo porque esa
   vista no ejecuta acciones.
2. **El portal no podía nombrar a los compañeros.** Las políticas de `profiles`
   solo dejan a cada quien leer su propia fila, así que en «Mis eventos» los
   demás responsables aparecían como «Cuenta eliminada». Ahora `mapaDePerfiles()`
   completa con la clave de servicio lo que la sesión no puede leer, y **solo**
   nombre, apodo y cargo —ni cédula, ni teléfono, ni correo—, sobre ids que RLS
   ya autorizó a través de sus eventos.

### 5. Verificación

`npm run lint` y `npm run build` en verde. Prueba de punta a punta contra
`localhost` con Playwright: crear un evento con dos cuentas y un externo,
editarlo, dos notas, aplazarlo (con su `fecha_original`), cerrarlo como
cumplido; un segundo evento marcado incompleto; un tercero eliminado; las
pestañas de Notas y Métricas reflejando todo; el empleado viendo en su portal
solo lo suyo, dejando una nota y quedando fuera de `/admin/calendario`; y el
coordinador sin poder tocar el apodo. Capturas revisadas en 1440 y 390 px, cero
errores de consola, y todas las filas de prueba borradas al terminar.

## Iteración del 17–18 de septiembre de 2026 — sistema de nómina y volante de pago

La segunda funcionalidad que pidió la gerencia en la reunión del 16 de
septiembre: que los administradores vean **automáticamente la nómina
desglosada** de cada empleado, a partir de las jornadas ya aprobadas,
configurando por persona su salario y el valor de cada tipo de hora.
**Migración 0011 aplicada.**

### 1. Qué se construyó

Un módulo nuevo del panel, **`/admin/nomina`**, solo para managers (admin y
coordinador), con tres pestañas:

- **Liquidación** (por defecto) — el período elegido (quincena 1, quincena 2 o
  mes completo) con **todas las cuentas activas**: días, sueldo, horas y
  recargos, otros devengados, descuentos, **neto** y estado. Al abrir una
  persona se ve su **desglose completo** —cantidad de horas y valor por
  concepto—, con los conceptos manuales editables mientras esté en borrador, y
  los botones **Cerrar**, **Marcar pagada**, **Reabrir**, **Eliminar** y
  **Descargar volante (PDF)**. Hay un botón «Liquidar todos» y exportación a
  **CSV** (`;`, BOM UTF-8 y números con coma decimal, igual que el de jornadas).
- **Configuración** — por empleado y mes: salario básico, auxilio de transporte,
  las **siete tarifas por hora**, y los porcentajes de salud y pensión. Al abrir
  un mes nuevo **se copia solo del mes anterior**, igual que `/admin/horarios`.
  *(Reemplazado el 18 sep 2026 por el modelo «vigente desde»: ver la iteración
  «cuatro ajustes de la nómina» más abajo.)*
- **Tablero** — KPIs, nómina por período (últimos doce), reparto por concepto,
  neto por persona e **historial** filtrable con enlace al volante de cada uno.

Y, fuera del panel, **«Mi nómina»** en `/mi-cuenta`: cada persona ve sus
liquidaciones **cerradas o pagadas** y descarga su propio comprobante.

### 2. Cómo se calcula (las decisiones que hay que conocer)

- **El salario básico cubre las horas ordinarias diurnas**: esas se muestran
  para cuadrar el total de horas, pero **no se pagan aparte**. Las siete tarifas
  son **pesos por hora que se pagan ADEMÁS** del salario.
- **Sueldo del período** = `salario / 30 × días liquidados` (convención
  colombiana de mes de 30 días: una quincena completa son 15 días, tenga el mes
  28 o 31). El **auxilio de transporte** sigue la misma regla.
- **Salud y pensión** = porcentajes configurables (4 % y 4 % por defecto) sobre
  `sueldo del período + horas y recargos`. **No** incluyen el auxilio de
  transporte ni los bonos, igual que el Excel de GPI.
- **Mapeo del desglose de jornadas → conceptos de nómina** (las horas salen
  SIEMPRE del desglose **congelado** al aprobar, vía `obtenerDesglose()`):
  `ordinariaNocturna` → rotación nocturna (recargo) · `extraDiurna` → extra
  diurna · `extraNocturna` → extra nocturna · `dominicalDiurna` → hora en
  festivo · `dominicalNocturna` → **hora en festivo + rotación nocturna**
  (composición, con línea propia en el desglose para que sea auditable) ·
  `extraDominicalDiurna` y `extraDominicalNocturna` → sus extras festivas.
- **Valores sugeridos** = `salario / 240 × factor`, con los factores del Excel
  que GPI usa hoy (0,35 · 1,25 · 1,75 · 2,15 · 2,65). La única excepción es la
  **hora extra diurna en festivo**, que en el Excel tiene exactamente el mismo
  valor que la hora ordinaria en festivo (2,15) —una fórmula copiada, no una
  regla— y por eso se sugiere con el valor de ley (2,05). Como eso deja una
  hora extra valiendo menos que una ordinaria, el formulario **avisa en ámbar**
  y las tres tarifas festivas quedan en la lista de dudas para el cliente.
- **Liquidación congelada**: al **cerrar** se guarda el cálculo completo en
  `nomina_liquidaciones.snapshot` (cantidades, valores unitarios, devengados,
  descuentos, neto y la configuración aplicada). A partir de ahí, corregir un
  horario, una tarifa o una jornada **no altera** esa nómina — la misma regla
  del desglose congelado de la 0004. **Reabrir** vuelve a borrador y borra el
  snapshot: es el único mecanismo para recalcular. **Reabrir ≠ eliminar.**
- **Redondeo**: todo se paga en **pesos enteros**, redondeando **línea por
  línea**. Así el volante cuadra al sumarlo a mano, cosa que el Excel actual no
  hace (sus devengados impresos suman 1.340.190 pero el total impreso dice
  1.340.189, porque la hoja arrastra centavos y solo redondea al imprimir).

### 3. El volante de pago

PDF de verdad, generado en el servidor con **`@react-pdf/renderer`** (única
dependencia nueva; nada de navegadores headless) desde
`GET /admin/nomina/volante/[id]/pdf` y su gemela
`GET /mi-cuenta/volante/[id]/pdf`, que solo sirve el volante propio. Lleva los
mismos bloques que GPI espera de su comprobante actual —razón social, NIT,
«COMPROBANTE DE NÓMINA», empleado, cédula, cargo, período, fecha de pago,
devengados, descuentos, totales, neto y las dos firmas— con tres mejoras:

1. el **período son fechas reales** (en el comprobante hecho a mano, un recibo
   de septiembre seguía diciendo «QUINCENA DE ENERO»);
2. las horas van **desglosadas**, con cantidad y valor por hora, en vez de una
   sola línea «HORAS EXTRAS»;
3. los subtotales cuadran al sumarlos.

La **razón social y el NIT** se editan en `/admin/ajustes` → «Datos de la
empresa para nómina» (clave `site_settings.empresa`).

### 4. Verificación

Pruebas del módulo puro en verde —`node --experimental-strip-types
scripts/pruebas-nomina.mjs`, 71 comprobaciones— incluida la **reproducción
exacta del volante de referencia de GPI** (sueldo 875.048, auxilio 124.548,
salud y pensión 42.586 y **neto 1.255.017 al peso**). `npm run lint` y
`npm run build` en verde. Prueba de punta a punta contra `localhost` con
Playwright: configurar a dos empleados con jornadas aprobadas reales, liquidar
la 2.ª quincena de agosto de 2026, revisar el desglose contra las jornadas,
editar conceptos manuales, cerrar, marcar pagada, descargar el PDF (revisado
como imagen), exportar el CSV, revisar el tablero, y luego —como empleado— ver
«Mi nómina», descargar su volante, quedar fuera de `/admin/nomina` y recibir
401 en la ruta de volantes del panel. Capturas revisadas en 1440 y 390 px, cero
errores de consola, y todas las filas de prueba borradas al terminar.

Dos fallos reales salieron de esa prueba y quedaron corregidos: el parseo de
importes borraba el **punto decimal** (un `<input type="number">` manda
«9115.08» y se guardaba 911.508, cien veces la tarifa), y el aviso del detalle
se quedaba mostrando el de la primera acción usada («liquidación creada») aunque
después se cerrara o se pagara.

## Iteración del 18 de septiembre de 2026 — pruebas del cliente: estados del calendario, acciones por estado y portal en pestañas

César probó el calendario en local y reportó tres cosas. Las tres quedaron
resueltas. **Sin migración nueva**: la corrección de datos fue un `update`
puntual, no un cambio de esquema.

### 1. El fallo de las métricas: la pantalla y el tablero se contradecían

**Lo que se veía**: creó un evento, lo marcó cumplido, lo devolvió a programado
y lo aplazó. En la ficha se leía el aviso ámbar «estaba programado para el … y
se aplazó», pero el tablero no lo contaba entre los aplazados.

**La causa real** (confirmada en la base y reproducida en local): la señal
visual de aplazamiento sale de `fecha_original`, mientras que las métricas
cuentan por `estado`, y **el botón «Volver a programado» escribía
`estado = 'programado'` conservando `fecha_original`**. Un evento que se aplaza
y después se reabre quedaba diciendo dos cosas a la vez. El evento de César
estaba exactamente así en la base: `fecha = 2026-09-19`,
`fecha_original = 2026-09-18`, `estado = 'programado'`.

**El invariante que cierra el agujero** (documentado en `src/lib/calendario.ts`):

> Un evento **abierto** que ya se movió de fecha es **`aplazado`**, nunca
> `programado`. Es decir: entre los estados abiertos,
> `estado = 'aplazado'` ⇔ `fecha_original ≠ null`.

Los estados **cerrados** (`cumplido`, `incompleto`) sí pueden llevar
`fecha_original`: ahí es historia («se movió y luego se hizo»), no una
afirmación sobre el presente.

De ahí salen tres cambios concretos:

- **Reabrir devuelve al estado abierto que corresponde**: `programado` si el
  evento nunca se movió, `aplazado` si ya se había movido. Lo decide el
  servidor; el formulario sigue mandando `estado=programado` («reabrir») y
  `cambiarEstadoEvento` lo traduce.
- **El botón lo dice**: «Reabrir (queda programado)» o «Reabrir (queda
  aplazado)», y la confirmación lo explica en una frase.
- **Los datos existentes se normalizaron** con
  `update eventos set estado='aplazado' where fecha_original is not null and estado='programado'`
  (Management API). El «Evento de Prueba» de César **no se borró**: quedó en la
  base, ya consistente, para que lo vea corregido.

### 2. Auditoría completa del tablero de métricas

Se montó un conjunto de eventos de prueba con **números conocidos** (cuatro
estados, responsables internos y externos, notas repartidas, eventos fuera del
rango y uno aplazado de un mes a otro) y se verificó número por número contra lo
que pinta la pantalla. Todo cuadró tras los ajustes; lo que cambió:

- **Los KPI pasaron de cuatro a seis** y cada estado tiene el suyo:
  *Eventos del período · Cumplidos · Incompletos · Aplazados · Programados ·
  Tasa de cumplimiento*. Desaparece «Incompletos y aplazados», que escondía dos
  cosas distintas en un mismo número —justo el dato que el cliente fue a buscar
  y no encontró—.
- **La tasa de cumplimiento explica su denominador** en la propia tarjeta:
  «2 de 3 ya cerrados (cumplidos + incompletos)». Sin eventos cerrados muestra
  «—», nunca 0 %.
- **Las notas del período** salen como dato visible en la primera tarjeta
  («3 cerrado(s) · 4 sin cerrar · 7 nota(s)»), no escondidas en el subtítulo de
  la tasa.
- **Regla del período, escrita**: un evento cuenta en el período de la fecha que
  tiene **ahora**, no en el de la fecha de la que se movió. Y cuando alguna
  actividad se aplaza **fuera** del rango filtrado, aparece un aviso ámbar bajo
  los KPI diciendo cuántas fueron y que cuentan en el período al que se
  movieron. Antes simplemente desaparecían sin explicación.
- **«Evolución mensual» avisa en la propia tarjeta** —una etiqueta ámbar «No usa
  el filtro de fechas: siempre el año completo»— en vez de decirlo solo dentro
  del botón *Ayuda*.
- **Cumplimiento por responsable** aclara que su porcentaje es
  *cumplidos ÷ asignados* (denominador: todos sus eventos del rango, abiertos
  incluidos), que **no** es la misma cuenta que la tasa de arriba.
- **Corrección de fondo en la consulta** (`listEventos`, `src/lib/admin.ts`):
  los responsables y las notas se pedían en una sola llamada con hasta 2000 ids
  de evento en la URL y sin paginar. Supabase corta cualquier respuesta en 1000
  filas, así que «carga por responsable» y «notas escritas» podían quedarse
  cortas **en silencio**. Ahora se piden por tandas de 100 eventos y se pagina
  dentro de cada tanda.

Números verificados con el conjunto de prueba (rango septiembre 2026, 7 eventos):
total 7 · cumplidos 2 (29 %) · incompletos 1 (14 %) · aplazados 2 (29 %) ·
programados 2 (29 %) · cerrados 3 · tasa 67 % (2 de 3) · notas 7 · 1 actividad
salida del período · carga por responsable 3/2/1/1/1/1 · evolución ago 1,
sep 7, oct 2. Al ampliar el rango a octubre, los mismos números se mueven como
deben (9 eventos, 3 aplazados, 3 programados, 8 notas) y el aviso de «salieron
del período» desaparece porque el evento ya está dentro.

### 3. Qué acciones tiene sentido ofrecer en cada estado

Un evento **cumplido ofrecía «Aplazar a otra fecha»**, que no significa nada:
ya se hizo. Ahora existe una matriz única (`accionesDisponibles()` en
`src/lib/calendario.ts`) que aplican **a la vez** la interfaz y las server
actions:

| Estado | Cumplido | Incompleto | Reabrir | Aplazar | Editar | Eliminar |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| Programado | Sí | Sí | — | Sí | Sí | Sí |
| Aplazado | Sí | Sí | — | Sí | Sí | Sí |
| Cumplido | — | Sí | Sí | **No** | Sí | Sí |
| Incompleto | Sí | — | Sí | Sí («Reprogramar») | Sí | Sí |

- **Cumplido no se aplaza.** Donde iría el botón hay una explicación de qué
  hacer en su lugar (reabrir o marcar incompleto y después mover).
- **Incompleto sí se reprograma**: el botón se llama «Reprogramar a otra fecha»
  y el evento vuelve a quedar **abierto** (aplazado) en la fecha nueva.
- **Reabrir solo aparece en los cerrados**: sobre uno abierto no haría nada.
- **El servidor rechaza lo demás**, no solo la interfaz lo esconde. Probado
  forzando el envío con la pantalla desactualizada: «Ese evento ya está marcado
  como CUMPLIDO: una actividad que ya se hizo no se aplaza…», «"Reabrir" es
  para eventos ya cerrados, y este está programado…», «Ese evento ya está
  marcado como cumplido.»

### 4. El portal del empleado, en pestañas

`/mi-cuenta` era una sola página larga con todo encima. Ahora son **cuatro
pestañas** y la pestaña viaja en la dirección con `?seccion=`, igual que el
panel usa `?vista=`:

| Pestaña | Dirección | Qué tiene |
| --- | --- | --- |
| Registrar jornada *(por defecto)* | `/mi-cuenta` | El resumen (pendientes/aprobadas/rechazadas), el formulario y «Mis jornadas» |
| Mis eventos | `/mi-cuenta?seccion=eventos` | Los eventos asignados de hoy en adelante, con su caja de notas |
| Mi nómina | `/mi-cuenta?seccion=nomina` | Las liquidaciones cerradas o pagadas y el volante |
| Mi contraseña | `/mi-cuenta?seccion=clave` | Cambiar la contraseña |

- El parámetro se llama **`seccion`** y no `vista` ni `portal` a propósito:
  `?portal=1` ya significa «quiero el portal aunque tenga panel» y **sigue
  funcionando igual**; las pestañas lo arrastran
  (`/mi-cuenta?portal=1&seccion=nomina`), porque sin él un admin rebotaría al
  panel al cambiar de pestaña. El aterrizaje por rol y el rebote a `/admin` no
  se tocaron.
- En escritorio es la misma tira de pastillas del panel; en el teléfono son
  **dos filas de dos**, con las etiquetas cortas («Jornada», «Eventos»,
  «Nómina», «Contraseña»), para que las cuatro se vean sin desplazamiento
  horizontal. Cada pestaña lleva su contador: jornadas pendientes, eventos
  asignados y volantes disponibles.
- **Vacíos amables**: «Mi nómina» ya no devuelve `null` cuando no hay
  liquidaciones —antes colgaba de una página larga y no pintarse tenía
  sentido; una pestaña que se abre en blanco, no— y explica qué aparecerá ahí y
  cuándo. «Mis eventos» ya tenía el suyo.
- **El borrador del formulario se pierde al cambiar de pestaña** y se acepta a
  conciencia: conservarlo obligaría a montar las cuatro secciones a la vez en un
  componente de cliente con estado, y la pestaña por defecto es justamente la
  del formulario.
- Enlaces con `prefetch={false}`, como todo el panel.

### 5. Verificación

`npm run lint` y `npm run build` en verde. Prueba de punta a punta contra
`localhost` con Playwright:

- **La secuencia del cliente, repetida**: cumplido → reabrir → aplazar →
  cumplir → reabrir. En cada paso se comprobó que el **badge**, el **aviso de
  aplazamiento** y los **números del tablero** dicen lo mismo. El paso que antes
  fallaba (reabrir un evento ya aplazado) ahora deja el evento en *Aplazado* y
  el tablero lo cuenta ahí.
- **Auditoría de métricas** con los números conocidos del apartado 2, en el
  rango por defecto y ampliándolo a dos meses.
- **Acciones por estado**: ficha revisada en los cuatro estados, y las tres
  acciones forzadas contra el servidor con la pantalla desactualizada.
- **Portal como empleado (`dgomez`)**: las cuatro pestañas, el registro de una
  jornada real (guardada como pendiente, con su desglose correcto) y el vacío de
  nómina.
- Capturas en 1440 y 390 px revisadas como imagen, **cero errores de consola**,
  y todas las filas de prueba borradas al terminar —salvo el «Evento de Prueba»
  de César, que se queda en la base ya consistente—.

## Iteración del 18 de septiembre de 2026 — se despliega solo el calendario (nómina fuera) y dos ajustes de aplazamiento

GPI quiere **publicar ya el calendario** y **no publicar la nómina** hasta
terminar de probarla. El despliegue se parte en dos y, de paso, entran dos
ajustes que pidió el cliente sobre el aplazamiento de eventos.

### 1. La nómina sale del árbol desplegable

> Estado histórico: la nómina **volvió a `main` y se desplegó el 19 sep 2026**
> (ver esa iteración, más abajo). Lo que sigue cuenta cómo salió.

- Antes de tocar nada se creó la rama de respaldo **`nomina-wip`** sobre el
  estado completo del trabajo, así que **nada se perdió**.
- El módulo salió con un **`git revert` del commit de nómina**, no reescribiendo
  el historial: el revert es reversible (`git revert <hash del revert>` lo trae
  de vuelta) y deja la trazabilidad intacta.
- En el mismo commit se ajustó lo que dependía de él: el **portal del empleado**
  queda con **tres** pestañas (fuera «Mi nómina») y el **menú del panel** vuelve
  a **siete** entradas (fuera «Nómina»).
- Se comprobó que no queda ninguna referencia colgada: rutas `/admin/nomina/*` y
  `/mi-cuenta/volante/*`, `src/lib/nomina.ts`, `src/lib/volante*`,
  `src/components/nomina/*`, `scripts/pruebas-nomina.mjs`, `@react-pdf/renderer`
  en `package.json`/`package-lock.json` y lo que la nómina había añadido a
  `next.config.ts` (`serverExternalPackages`, `outputFileTracingIncludes`), a
  `src/data/site.ts` y a `/admin/ajustes`.
- **Las migraciones 0011 y 0012 se quedan aplicadas en la base.** Sus tablas existen vacías
  y endurecer o borrar nada de eso era innecesario y arriesgado; el día que la
  nómina vuelva, la base ya está lista. El archivo `0011_nomina.sql` viaja con
  el código en `nomina-wip`, junto con la **0012**, que el mismo día dejó la
  nómina **solo en manos del administrador** (el coordinador quedó fuera, a
  pedido de GPI; el detalle está en esa rama).
- `docs/PRUEBAS_CALENDARIO_NOMINA.md` **se conserva tal cual**: es el plan de
  pruebas con el que se va a probar la nómina cuando se reintegre.

### 2. No se puede aplazar hacia atrás

Aplazar es **mover hacia adelante**: la fecha nueva tiene que ser **posterior a
la que el evento tiene ahora**. Antes se podía elegir cualquier día, incluso uno
anterior, y quedaba un «aplazado» que en realidad adelantaba la actividad.

- En el formulario, el campo de fecha lleva **`min` = el día siguiente al del
  evento**, así que el propio calendario del navegador no deja elegir antes.
- En la **server action** se valida igual, porque esconder una opción no es una
  barrera: `aplazarEvento` rechaza cualquier fecha que no sea posterior a la
  actual, con un mensaje que explica el porqué y qué hacer en su lugar
  (*«Aplazar es mover la actividad hacia adelante…»*).

### 3. «Devolver a su fecha original»

Botón nuevo en la ficha del evento, **solo visible cuando el evento tiene fecha
original** (es decir, cuando alguna vez se aplazó). Deshace el aplazamiento: el
evento **vuelve a su día original**, se **limpia `fecha_original`** y queda
**programado**.

- Es la operación inversa de aplazar, y por eso respeta el mismo invariante del
  calendario: entre los estados abiertos, `aplazado` ⇔ `fecha_original ≠ null`.
  Si se limpiara la fecha original dejando el evento en *aplazado*, la ficha y
  el tablero volverían a contradecirse.
- **Solo aparece en los estados ABIERTOS** (*programado* —que en la práctica
  nunca tiene fecha original— y *aplazado*). En un evento ya **cerrado**
  (*cumplido* o *incompleto*) la fecha original es **historia**: dice que se
  movió y después se cerró. Borrarla reescribiría el pasado y, además, movería
  de día una actividad que ya se hizo. Para eso está *Reabrir*: primero se
  reabre y después, si procede, se devuelve a su fecha.
- La acción nueva (`devolverFechaOriginal`) valida rol de manager, que el evento
  exista, que **tenga** fecha original y que el estado lo permita, y la interfaz
  pide confirmación diciendo a qué día vuelve.
- La matriz estado → acciones de `src/lib/calendario.ts` gana una columna
  (`devolverFechaOriginal`) y la tabla de `docs/ADMIN.md` se actualizó con ella.

### 4. Verificación

`npm run lint` y `npm run build` en verde **sin nómina**. Con `next start` y
Playwright contra `localhost`:

- Aplazar a una fecha anterior: rechazado por el formulario **y** por la action
  al forzarla.
- Aplazar hacia adelante y **devolver a la fecha original**: en la base, la
  fecha vuelve, `fecha_original` queda en `null` y el estado es `programado`.
- `/admin/nomina`, `/admin/nomina/volante/<id>/pdf` y `/mi-cuenta/volante/<id>/pdf`
  responden **404**; el menú no muestra «Nómina»; el portal muestra **tres**
  pestañas; el resto del panel y el sitio público, intactos.
- Capturas en 1440 y 390 px revisadas como imagen y **cero errores de consola**.

---

## Iteración del 18 de septiembre de 2026 — la nómina queda solo para el administrador

> Se hizo en la rama **`nomina-wip`** mientras la nómina estaba fuera del
> despliegue, y llegó a `main` el **19 sep 2026** (ver esa iteración).

GPI revisó los permisos del rol **coordinador** y pidió dos cosas opuestas:

1. **Abrirle el «Apodo»** de las cuentas (antes solo del administrador). Eso
   toca `/admin/empleados`, no la nómina, así que se hizo directamente en
   `main` (iteración anterior).
2. **Cerrarle la nómina.** El coordinador aprueba jornadas y lleva el
   calendario, pero **no liquida la nómina de nadie**: de la nómina ve *solo la
   suya*, como cualquier empleado. Eso es lo que describe esta sección.

### Las tres capas del cambio

| Capa | Qué se hizo |
| --- | --- |
| **RLS** (migración **0012**, ya aplicada) | Las políticas de `nomina_config_mensual` y las de escritura y lectura-total de `nomina_liquidaciones` pasan de `is_manager()` a `is_admin_activo()`. `nomina_liquidaciones_select_propia` **no se toca**: es la que deja a cada quien ver su volante |
| **Servidor** | `requireAdmin()` en `/admin/nomina`, `getAdminOrNull()` en las ocho server actions y en `GET /admin/nomina/volante/[id]/pdf`. `GET /mi-cuenta/volante/[id]/pdf` sigue igual: valida que quien pide sea el **dueño** |
| **Navegación** | La entrada «Nómina» del menú es `adminOnly` (campo nuevo de `AdminSection`, más estricto que `managerOnly`) y la tarjeta del dashboard solo se añade para admin |

### Por qué `is_admin_activo()` y no `is_admin()` a secas

`public.is_admin()` (migración 0001) comprueba el rol pero **no** que la cuenta
siga activa; `public.is_manager()` (0002) sí. Cambiar una por otra habría
endurecido el rol y, al mismo tiempo, **aflojado** la exigencia de cuenta
activa: un administrador desactivado habría conservado acceso a la nómina desde
la API con un token válido. Por eso la 0012 crea `is_admin_activo()`, que es
`is_admin()` **más** la comprobación de `active`, con la misma forma que
`is_manager()`. `is_admin()` no se toca: lo usan las políticas de contenido.

### Estado y reintegración

- **La migración 0012 está aplicada** en el GPI Project desde el 18 sep 2026,
  antes de que el código llegara a `main`: solo endurecía permisos sobre tablas
  vacías.
- La reintegración se hizo el 19 sep 2026 tal como se había previsto: en
  `main`, revert del revert para recuperar el módulo y `cherry-pick` de este
  commit para que llegara ya con los permisos correctos.

---

## Iteración del 18 de septiembre de 2026 — cuatro ajustes de la nómina tras probarla César

> Trabajo hecho en la rama **`nomina-wip`** mientras la nómina estaba fuera del
> despliegue; llegó a `main` el 19 sep 2026.
> **Sin migración nueva**: `nomina_config_mensual` ya guardaba empleado + año +
> mes, que es todo lo que el modelo nuevo necesita. `copiado_de` queda como
> columna legada (ya no se escribe ni se lee).

César probó la nómina en local y pidió cuatro cosas.

### 1. Separadores de miles en todo el dinero

- **Un solo módulo para leer y escribir dinero: `src/lib/dinero.ts`**, puro (sin
  `"use client"` ni importaciones), que usan el navegador, las server actions y
  el volante. Formato colombiano: **punto de miles, coma decimal**
  (`1.300.000`, `9.115,08`). No usa `Intl.NumberFormat`: según la versión de
  los datos de idioma, «es» agrupa o no los números de cuatro cifras y usa
  espacios duros distintos, y una diferencia entre servidor y navegador rompe
  la hidratación.
- **`parsearNumero()`** es la regla de lectura única. El caso ambiguo de **un
  solo punto** se resuelve así: es de **miles** si lo siguen exactamente tres
  cifras y hay algo distinto de cero delante (`9.115` = 9115, como se escribe en
  Colombia); si no, es **decimal** (`9115.08`, `4.5`, `0.125`), porque un
  separador de miles siempre va seguido de tres cifras. Con coma y punto a la
  vez manda el que va **último** (así también entra `1,300,000.50` pegado de una
  hoja en inglés). Los grupos de miles se validan: `1.30.000` no es un número y
  el servidor lo dice en vez de adivinar. El bug de antes (`9115.08` guardado
  como 911.508) queda cubierto por una prueba explícita.
- **`CampoDinero`** (`src/components/admin/CampoDinero.tsx`): campo de texto con
  `inputMode` decimal/numérico que pone los miles mientras se escribe sin que
  el cursor salte (`reformatearEntrada()`, pura y probada), borra la cifra de al
  lado al pulsar ← sobre un punto, lee lo **pegado** con `parsearNumero` y manda
  al servidor el valor **limpio** en un `<input type="hidden">`. En las tarifas,
  un punto tecleado **al final de una cifra de 4 dígitos o más** se toma como la
  coma decimal (el del teclado numérico: `9115.08` → `9.115,08`); en el resto de
  casos el punto se ignora porque los miles los pone el campo. Se usa en el
  salario, el auxilio, las siete tarifas, los porcentajes (sin miles, con coma:
  `4,5`) y los nueve conceptos manuales de la liquidación.
- **Las server actions** leen con el mismo `parsearNumero` (`leerImporte` en
  `src/app/admin/nomina/actions.ts`, que reemplaza a `aNumero`). Un valor que no
  es número, o negativo, ya **no se convierte en cero en silencio**: la acción
  responde con el nombre del campo.
- **Visualización**: tabla y detalle de la liquidación (incluidas las tarifas
  con centavos, `$ 9.115,08`, que antes salían redondeadas), configuración
  (valores sugeridos y factores), tablero, historial, «Mi nómina» y el **volante
  PDF** (valor unitario con centavos, porcentajes con coma, días).
- **Excepción a propósito: el CSV** sigue con números **sin miles** y coma
  decimal (`decimalCSV`), para que Excel los reconozca como números.

### 2. Bug: en Configuración, al cambiar de persona o de mes seguían los valores anteriores

**Causa**: el salario y las tarifas vivían en `useState(config…)` y el auxilio y
los porcentajes en `defaultValue`; los dos se leen **una sola vez**, al montar.
Cambiar de persona o de mes navega a la misma página con otros parámetros y
React **reutiliza** el componente montado, así que el formulario seguía con lo
de antes hasta recargar.

**Arreglo de raíz**, con dos `key`: la de fuera (`configuracion.tsx`) es
**persona + año + mes** y monta un formulario nuevo al cambiar cualquiera; la de
dentro es **la fila que rige + su `updated_at`**, así que después de guardar o
de quitar un cambio los campos vuelven a leer la base sin perder el aviso de
«guardado». El mismo patrón estaba en la **Liquidación**: el panel entero lleva
ahora `key` de período + persona (el detalle abierto, los campos con
`defaultValue` y el aviso de «Liquidar todos» se quedaban con lo del período
anterior) y el detalle, `key` por persona + liquidación. Mientras se navega,
la pantalla dice «Cargando…» (`useTransition`) en vez de enseñar lo viejo como
si fuera lo nuevo.

### 3. La configuración se hereda: modelo «vigente desde»

- **Regla**: la configuración efectiva de una persona en el mes M es **la fila
  válida más reciente con (año, mes) ≤ M**. Vive en `configVigente()` y
  `estadoConfigMes()` de `src/lib/nomina.ts` (puras, probadas) y la usan la
  Configuración, la Liquidación (tabla, «Liquidar todos», crear, cerrar), el
  Tablero y el volante: `getNominaConfigVigente` y `mapaNominaConfigsVigentes`
  en `src/lib/admin.ts`.
- **Ver un mes no crea filas**: `asegurarNominaConfig` desapareció. Solo
  **guardar** (`saveNominaConfig`) crea o cambia la fila de ese mes.
- **Quitar el cambio de un mes** (`quitarConfigMes`): borra la fila y el mes
  vuelve a heredar. Con confirmación que dice a qué vuelve; si no hay ningún mes
  anterior, la confirmación avisa que la persona queda **sin configuración** y
  el servidor exige además una marca explícita (`sin_respaldo_confirmado`).
- **Filas en cero = no son configuración.** El formulario nunca deja guardar
  salario 0, así que una fila en cero solo puede ser un resto del modelo
  anterior (se creaban vacías al abrir un mes). Se ignoran: no tapan lo
  heredado y no hace falta borrarlas. **En la base de César hay cuatro** (ver
  abajo).
- La pantalla dice de dónde salen los valores («Configurado en este mes» /
  «Heredado de agosto de 2026 — si guardas aquí, el cambio rige desde este mes
  en adelante» / «Sin configurar»), hasta cuándo rigen y la lista de cambios
  guardados de la persona. La ayuda `AYUDA_NOMINA_CONFIG` explica, en llano, que
  un aumento se guarda en el mes en que empieza y que **un monto de una sola
  vez va en los conceptos de la liquidación, no en la configuración**.
- **Las liquidaciones cerradas o pagadas no se tocan**: siguen leyendo su
  snapshot (`obtenerLiquidacion`). De paso, el detalle y el CSV toman el
  salario **del cálculo** (el congelado en una cerrada) y no el de la
  configuración de hoy.

### 4. Filtro por persona en la Liquidación

- Selector **Persona** («Todas las personas» + cada cuenta activa; buscador sin
  tildes si hay más de diez) persistido en la URL como **`?persona=<id>`**:
  sobrevive a recargar y a cambiar de período. Un id que no es de una cuenta
  activa se ignora.
- El filtro se aplica en el **servidor**, así que totales, avisos, botones y CSV
  trabajan con lo que se ve. Aviso verde «Estás viendo solo a …» con *Ver a
  todas las personas*.
- **«Liquidar todos» con el filtro activo actúa SOLO sobre lo que se ve**: el
  botón pasa a **«Liquidar a <nombre>»** y la acción recibe `persona`; nunca
  crea liquidaciones de quien no está en pantalla.
- **CSV**: exporta lo filtrado; el botón dice **«Exportar CSV (solo <nombre>)»**
  y el archivo lleva el usuario: `nomina_GPI_2027-02-Q1_oprueba.csv`.
- De paso se corrigió un fallo de «Liquidar todos»: en la **2.ª quincena** daba
  por liquidado a quien solo tenía la 1.ª (no filtraba por quincena).

### Otros ajustes visuales

- Pestañas de la nómina a 390 px: se salían de la pantalla (scroll
  horizontal); ahora ocupan el ancho y aprietan el relleno en móvil.
- Tablero: los KPI pasan a dos columnas (un importe con miles no se parte y a
  cuatro columnas se montaba sobre el icono); «liquidaciónes» → «liquidaciones».

### Datos de César en la base (estado al terminar)

Las filas de César quedaron **intactas** (comparadas contra el listado tomado al
empezar). En `nomina_config_mensual` hay **cuatro filas en cero** creadas solas
por el modelo anterior al abrir meses —`admin` sep-2026, `dgomez` ago-2026 y
sep-2026, `scordoba` ago-2026—; con el modelo nuevo **se ignoran** (no cuentan
como configuración), así que no estorban, pero pueden borrarse cuando César
quiera. La única configuración real es la de una cuenta desde sep-2026, y su
liquidación de la 2.ª quincena de septiembre sigue en borrador.

### Verificación

- `node --experimental-strip-types scripts/pruebas-nomina.mjs`: **168/168** (los
  de antes + lectura/escritura de dinero, el campo mientras se escribe y la
  resolución «vigente desde»).
- `npm run lint` y `npm run build` en verde.
- `next start` + Playwright contra **localhost** como `admin`, con datos de
  prueba propios (cuenta «Operario de prueba» y la nómina del propio admin),
  borrados al final: escribir y pegar importes, guardar y comprobar el valor
  exacto en la base, cambiar de persona y de mes sin recargar, heredar y quitar
  cambios, liquidar cuatro meses después sin abrir la Configuración, filtro por
  persona con recarga, volante PDF rasterizado y CSV sin miles; capturas a 1440
  y 390, **cero errores de consola**.

---

## Iteración del 19 de septiembre de 2026 — la nómina vuelve a `main` y se despliega

GPI terminó de probar la nómina y pide publicarla. **Sin migración nueva**: la
0011 y la 0012 ya estaban aplicadas en el GPI Project y **no se volvieron a
aplicar**.

### Cómo se reintegró

1. En `main`, **revert del revert** de la nómina (`5020f50`): vuelven el
   módulo, `@react-pdf/renderer`, el logo del volante, las pruebas y la 0011.
2. `cherry-pick` de los tres commits de `nomina-wip`, en orden: nómina solo
   para el administrador (0012), los cuatro ajustes (dinero con miles,
   «vigente desde», filtro por persona, arreglo del formulario) y su
   documentación.
3. La rama `nomina-wip` **se conserva** (local y remota) como respaldo.

### Qué se cuidó al resolver los conflictos

- **Apodo**: manda `main` — lo editan **admin y coordinador**
  (`apodoSiEsManager`, `isManagerRole` en `EmployeeFields`, `AYUDA_APODO`);
  el código de `nomina-wip` no tocaba esos archivos, así que no hubo que
  descartar nada.
- **Calendario**: intactos «aplazar solo hacia adelante» y «Devolver a su fecha
  original».
- **Portal**: cuatro pestañas; en el teléfono, dos filas de dos con las
  etiquetas cortas *Jornada · Eventos · Nómina · Clave* (se queda «Clave», el
  ajuste que se hizo en `main` para que no se cortara).
- **Menú**: ocho entradas; «Nómina» es `adminOnly` (el coordinador ve siete).
- **Documentación**: los conflictos fueron solo en `AGENTS.md`, `docs/ADMIN.md` y
  este plan. Se dejó una sola versión: la nómina desplegada, el historial de
  iteraciones completo (las secciones del 18 sep quedan como historia) y las
  migraciones de la 0001 a la 0012.

### Verificación

- `npm install` (vuelve `@react-pdf/renderer`), `npm run lint` y `npm run build`
  limpio (sin `.next`) en verde; `scripts/pruebas-nomina.mjs`: **168/168**.
- `next start` + Playwright contra **localhost**: como `admin`, menú de ocho
  entradas con Nómina; `/admin/nomina` con sus tres pestañas; Configuración con
  punto de miles (`1.300.000`, `9.115,08`) y el valor limpio en el campo oculto;
  filtro por persona; en el calendario, un evento temporal rechazado al forzar
  una fecha anterior (el servidor lo niega aunque se quite el `min`), aplazado
  hacia adelante (`aplazado` + `fecha_original`) y devuelto a su fecha
  (`programado`, `fecha_original` en `null`), y borrado al terminar; el campo
  apodo editable. Como `dgomez`, en 390 y 1440 px: cuatro pestañas sin cortes y
  «Mi nómina» con su vacío amable. **Cero errores de consola.**
- Datos de nómina (`nomina_config_mensual`, `nomina_liquidaciones` y
  `site_settings.empresa`) **idénticos** antes y después de la verificación.

---

## Iteración del 19 de septiembre de 2026 — tablas de 10 filas y quincena por defecto

Dos pedidos de GPI. **Sin migración.**

### 1. Máximo 10 filas por página en todas las tablas

Un **único control** para todo el sitio: `Paginacion`
(`src/components/admin/ui-base.tsx`) con la constante `FILAS_POR_PAGINA = 10`
de `src/lib/paginacion.ts` (módulo puro con `paginar`, `leerPagina` y
`hrefConPagina`). Pinta «Mostrando a–b de N · Anterior · Página [n] de N ·
Siguiente», el número se puede escribir, no aparece con una sola página y en
390 px cabe en una fila (la palabra «Página» se omite en el teléfono). El
`Pagination` de las gráficas del tablero pasó a ser un adaptador de ese mismo
control.

| Tabla / listado | Dónde se filtra | Cómo quedó |
| --- | --- | --- |
| Aprobaciones de jornadas | Servidor | `?pagina=`; los filtros la reinician |
| Detalle de jornadas (Métricas; antes 50 por página) | Cliente | Estado local; cada filtro vuelve a la 1; el CSV exporta todo |
| Control semanal de horas extra (Métricas) | Cliente | Estado local, reinicio con los filtros |
| Equipo y cuentas | Servidor | `?pagina=`; buscar vuelve a la 1 |
| Servicios, Proyectos, Clientes, FAQ, Valores | — | `?pagina=`; el orden se cambia con el campo «orden» |
| Notas del calendario (antes 25 por página) | Servidor | `?pagina=` |
| Agenda del mes (calendario) | — | Estado local; cambiar de mes vuelve a la 1 |
| Cumplimiento por responsable (métricas del calendario) | Cliente | Estado local, reinicio con el rango |
| Liquidación de nómina | Servidor | `?pagina=`; totales, «Liquidar todos» y CSV siguen sobre todo el período |
| Historial del tablero de nómina | Cliente | Estado local, reinicio con los filtros |
| *Mi Cuenta*: Mis jornadas, Mis eventos | — | Estado local |
| *Mi Cuenta*: Mi nómina | — | `?pagina=` junto a `?seccion=nomina` (y `?portal=1`) |

**Fuera, a propósito**: las gráficas y los «top N» de los tableros, el editor
semanal de `/admin/horarios` (7 días fijos) y las tablas del desglose de una
liquidación (conceptos fijos). No hay pantalla de mensajes de contacto.

**Reordenar**: servicios, proyectos, clientes, FAQ y valores no tienen «mover
arriba/abajo»: el orden es un número que se edita en cada elemento. Por eso
paginar no rompe nada: al guardar un número nuevo, el elemento aparece en su
página. Para que el reparto sea estable con números repetidos (hay 8 clientes
con orden 0), las lecturas del panel desempatan por `created_at`. El sitio
público **no** se tocó: allí los empates siguen en el orden que devuelva la base.

### 2. Quincena por defecto

La Liquidación ya abría el período de hoy; ahora la regla vive en
`periodoDeHoy(hoy)` de `src/lib/nomina.ts` (pura y probada: 1–15 → primera,
16–fin → segunda) y se alimenta con `hoyEnColombia()` **en el servidor**. Si la
URL trae período, manda la URL. Además, al pasar de «Mes completo» a
«Quincena» se elige la quincena de hoy si es el mes en curso (antes siempre la
primera).

### Verificación

- `npm run lint`, `npm run build` limpio y `scripts/pruebas-nomina.mjs`
  **191/191** (se añadieron el período por defecto y la paginación).
- `next start` + Playwright contra **localhost**, como `admin`: Servicios 10 + 1
  con la página 2 conservada al recargar; Clientes 10 + 7; Aprobaciones con
  «todas» 10/10/10/3 —la página 4 escrita a mano— y el filtro de empleado
  quitando `pagina` de la URL; detalle de Métricas 10 por página con el CSV
  exportando las **33** filas y el cambio de estado volviendo a la página 1;
  `/admin/nomina` sin parámetros abre **septiembre de 2026, segunda
  quincena**, y con `?mes=8&quincena=1` manda la URL. Como `dgomez`: Mis
  jornadas 10 + 1 en 390 y 1440 px. **Cero errores de consola.**
- Reordenar a través del borde: un cliente de la página 1 pasó a la 2 al
  cambiarle el orden y se le devolvió el suyo desde la 2; los datos quedaron
  iguales salvo su `updated_at`, que lo pone un disparador de la base y no se
  puede restaurar desde la API.

---

## Iteración del 19 de septiembre de 2026 — auditoría legal del cálculo de horas

Una auditoría legal (normativa vigente a septiembre de 2026, 25 casos
ejecutados contra el código) encontró que el sistema **clasifica bien las
horas pero no las pagaba bien**. Aquí se implementó **solo lo que la ley
obliga**; lo que depende de GPI quedó como decisión pendiente (abajo). **Sin
migración y sin tocar datos**: la configuración de nómina que ya estaba en la
base (÷ 240) no se modificó —la corrige el administrador desde el panel— y las
jornadas aprobadas siguen congeladas.

### Lo que se implementó

| # | Qué | Dónde |
| --- | --- | --- |
| P0 | Módulo puro de reglas que cambian con la fecha: recargo dominical (75 → 80 % el 1-jul-2025 → **90 %** el 1-jul-2026 → 100 % el 1-jul-2027), jornada máxima (… 44 → **42 h** el 15-jul-2026), divisor (horas ÷ 6 × 30 → **210**), factores legales y **festivos de cualquier año** (fijos, trasladables con la Ley Emiliani —incluido el **9 de julio** desde 2026, Ley 2578— y los de la Pascua) | `src/lib/ley-laboral.ts` |
| P1 | Valor hora con el divisor de la **jornada del mes** (horario del mes, nunca más que las horas legales): hoy **÷ 210**. `derivarTarifas(salario, { divisor, recargoDominical })`: `nomina.ts` sigue sin importaciones | `nomina.ts`, `admin.ts` (`parametrosLegalesNomina`), Configuración |
| P2 | Sugeridos con el recargo del mes (sep-2026: **1,90 / 2,15 / 2,65**). **Aviso ámbar de «por debajo del mínimo legal»** en el formulario, en el mensaje de guardado y en la Liquidación: aviso, no bloqueo. Sustituye al aviso `festivoIncoherente`, que empujaba al revés. En `jornada.ts`, `horasEquivalentes` y el contexto congelado usan el recargo de la fecha de cada minuto | `ConfigNominaForm`, `nomina/actions.ts`, `LiquidacionPanel`, `jornada.ts` |
| P3 | `nombreFestivo` = `festivosDelAnio`: 2026 = la tabla anterior + 13-jul; 2027 y 2028 verificados (19 por año). El calendario queda arreglado de paso | `jornada.ts`, calendario |
| P6 (mínimo) | Se **rechaza** una jornada que se cruce con otra propia (crear y editar en el portal) y se **avisa** si ese día ya había otra. Tampoco se aprueba una jornada que se cruce con otra de la misma persona | `mi-cuenta/actions.ts`, `admin/jornadas/actions.ts` |
| P8 | Textos corregidos: la franja de las 7:00 p. m. es de la **Ley 2466 de 2025**; el recargo vigente es **90 %**; el 2,15 del Excel para la extra festiva **era el legal** | comentarios, `AGENTS.md`, `docs/ADMIN.md`, ayudas del panel |
| P9 | Pruebas: el volante de referencia usa las **tarifas explícitas del Excel** y quedó **anonimizado**; batería nueva `scripts/pruebas-jornada.mjs` (alias `@/` con `scripts/alias.mjs`) | `scripts/` |

Además: `.claude/` al `.gitignore`, y ningún nombre real ni salario de una
persona en pruebas, comentarios ni documentación (el repositorio es público).

### Decisiones que quedaron pendientes con GPI — TODAS RESUELTAS el 23 sep 2026

En su día no se tocó el comportamiento en ninguna de las tres, y la batería
`scripts/pruebas-jornada.mjs` fijó lo que el sistema hacía entonces. GPI
respondió el 23 de septiembre: **la nómina se rige estrictamente por la ley**.
El detalle de cada una está en la iteración del 23 de septiembre, más abajo.

1. **P4 · El sábado** — *resuelta: se paga como la ley*. Antes, un día sin
   horario (sábado) se pagaba **como domingo** (extra dominical ×2,15). Ahora es
   **extra normal** (×1,25 de día, ×1,75 de noche).
2. **P5 · Festivo entre semana** — *resuelta: se paga como la ley*. Antes, todo
   el turno iba como extra festiva. Ahora, las horas de la jornada del día van
   como **festivas ordinarias** (×1,90) y solo el exceso como extra festiva.
3. **P7 · La regla del almuerzo** — *resuelta: tres reglas*, con el salto de las
   6 h eliminado.
4. **P6 (completo)** — *resuelta*: el cálculo ya resta la jornada ordinaria y el
   almuerzo que otra jornada del mismo día haya consumido.

### Después del despliegue (lo hace el administrador desde el panel)

1. `/admin/nomina` → **Configuración**, septiembre de 2026: «Usar los valores
   sugeridos» y Guardar en la cuenta configurada (hoy tiene las tarifas ÷ 240 y
   el panel las marca en ámbar), y completar las demás cuentas.
   *(Desde el 23 sep 2026 esto ya no hace falta: las tarifas se derivan solas y
   el botón desapareció. Basta con que el salario esté bien.)*
2. El borrador de la 2.ª quincena de septiembre se recalcula solo (no hay nada
   cerrado).
3. Decidir con GPI el destino de las 6 jornadas de sábado (P4).
   *(Decidido el 23 sep: las 6 siguen congeladas como extra dominical; si se
   quieren recalcular, un manager las devuelve a pendiente y las vuelve a
   aprobar.)*

### Verificación

- `scripts/pruebas-nomina.mjs` **208/208** y `scripts/pruebas-jornada.mjs`
  **74/74**; `npm run lint` y `npm run build` limpio.
- `next start` + Playwright contra **localhost**: Configuración de
  septiembre de 2026 con «Ley de septiembre de 2026: jornada de 42 h semanales
  → valor hora = salario ÷ 210 · recargo del 90 %» y los sugeridos con ×1,9 /
  ×2,15 / ×2,65; con la configuración vieja de la base (÷ 240, **sin
  modificarla**) salen el aviso «7 tarifas están por debajo del mínimo legal»
  y las siete marcas en ámbar, y el aviso equivalente en la Liquidación; el
  calendario marca el 1 y el 11 de enero de 2027 y el 12 de julio de 2027
  (Chiquinquirá); en el portal de un empleado, una jornada que se cruza con
  otra aprobada se rechaza con el mensaje explicativo (en 1440 y 390 px).
  **Cero errores de consola** y las tablas de la base idénticas antes y
  después.

## Iteración del 22 de septiembre de 2026 — nómina: pestañas rápidas, «dejar sin configuración» y la regla de los borradores

César probó la nómina en producción y pidió tres cambios. Quedan en **commits
locales de `main`, sin push**: el 22 sep César se reúne con GPI para mostrar el
módulo y ese día no se despliega. **Migración 0013 aplicada** en el GPI Project
(compatible con el código desplegado, que la ignora).

### 1. Navegación lenta entre Liquidación, Configuración y Tablero

**Medido antes de tocar nada** (`next build` + `next start`, sesión de admin,
localhost contra Supabase, ~115 ms por viaje; mediana de 5; en el navegador,
medido con `performance.now()` de la propia página):

| | Antes | Después |
| --- | --- | --- |
| Servidor, documento completo — Liquidación | 836–901 ms | 301 ms |
| Servidor — Configuración | 652–684 ms | 297 ms |
| Servidor — Tablero | 777–788 ms | 279 ms |
| Servidor — Liquidación, otro período / persona | 690–1.032 ms | 285–292 ms |
| Clic → pestaña marcada | 820–890 ms (se marcaba al final) | **1–2 ms** |
| Clic → esqueleto visible | — (no había: la pantalla vieja se quedaba quieta) | ~150 ms |
| Clic → contenido — Configuración / Tablero / Liquidación | 890 / 821 / 870 ms | 461 / 461 / 463 ms |
| Cambio de quincena / de persona | 832 / 724 ms | 465 / 455 ms |

**Qué lo hacía lento:**

- **La sesión, dos veces y en serie.** `getUser()` y después el perfil (dos
  viajes), en el layout de `/admin` y otra vez en la página, y solo después
  empezaban los datos.
- **Liquidación: consultas N+1.** `horasDelPeriodo` por **cada persona**: dos
  `listJornadas` (aprobadas y pendientes), cada una con su consulta de nombres
  a `profiles` —cuatro viajes por cabeza—, más otra consulta de nombres detrás
  de `listLiquidaciones`.
- **Tablero:** una consulta de configuración **por cada mes** con borradores, y
  los nombres en serie detrás de las liquidaciones.
- **Ninguna señal:** en Next 16 la frontera `loading.tsx` de una página **no se
  vuelve a montar cuando solo cambian los parámetros de búsqueda** (la clave del
  segmento es `__PAGE__` sin la búsqueda; comprobado en `layout-router.js`), así
  que la pestaña vieja seguía marcada y la pantalla quieta hasta tener todo.

**Qué se hizo:**

- `getSessionProfile()` (`src/lib/supabase/auth.ts`) con `cache()` de React
  —una lectura por petición, nada compartido entre usuarios— y el perfil pedido
  **en paralelo** con `getUser()` por un cliente aparte con el token
  (`getTokenSupabase`), porque el cliente de la sesión encola sus peticiones
  detrás de `getUser()`. Solo se acepta si `getUser()` confirma el mismo id.
- Cada vista hace `requireAdmin()` **en la misma tanda** (`Promise.all`) que sus
  lecturas; la página ya no espera la sesión para pintar cabecera y pestañas.
  Sigue siendo la barrera autoritativa: no se pinta un dato hasta que responde,
  y redirige igual si no es administrador.
- Liquidación: **una** consulta de jornadas del período para todo el equipo
  (`leerJornadasNomina` + `horasPorEmpleado`, por tandas de 1000),
  `listLiquidaciones({ nombres: false })` y toda la configuración en una lectura
  (`listNominaConfigsPorEmpleado`). Configuración y Tablero: una sola tanda en
  paralelo, configuración entera de una vez (la tabla es pequeña).
- `<Suspense key={pestaña + parámetros}>` en `page.tsx` con esqueletos por
  pestaña (`esqueletos.tsx`), y pestañas en un componente de cliente
  (`PestanasNomina`) que marca la pulsada **en el mismo clic** y lleva el
  `PuntoDeCarga`. `prefetch={false}` y `PuntoDeCarga` siguen en su sitio (el
  `app/admin/loading.tsx` se eliminó el 22 sep 2026: colgaba las server
  actions; el `<Suspense>` de dentro de la página se queda).
- Los ~300 ms entre que llegan los datos y se ven son la regla de React de no
  revelar el contenido antes de 300 ms desde que apareció el esqueleto (evita
  parpadeos); contra Supabase desde Vercel, datos y esqueleto llegan casi a la
  vez.

### 2. Qué pasa con las liquidaciones al quitar la configuración

Decisión de César, aplicada en el **servidor** y en la **misma transacción** que
quita la configuración (función `nomina_aplicar_cambio_config` de la 0013; la
regla es `efectoEnBorradores()` de `nomina.ts`):

- **Cerradas o pagadas**: no se tocan jamás.
- **Borradores** de los meses afectados (desde el mes del cambio hasta antes del
  próximo cambio): si el mes **sigue** con configuración heredada, se
  **conservan** con sus conceptos y se recalculan (el detalle dice «Se calcula
  con la configuración guardada en … (heredada)»); si queda **sin ninguna**, se
  **eliminan** y la persona vuelve a salir como sin configurar.
- La **confirmación** (ventana propia, ya no `window.confirm`) dice antes
  cuántos borradores y de qué períodos se eliminarían, y cuántos se conservan.
  La pantalla manda sus ids; si al llegar al servidor la cuenta es otra, la
  acción no hace nada y pide recargar.
- **Reabrir** una cerrada de un mes sin configuración se rechaza: «configura
  primero a la persona en ese mes».
- Un **borrador huérfano** de antes (el de la 2.ª quincena de septiembre de una
  cuenta cuya única fila de configuración es un resto en cero) se ve marcado
  «Sin configuración», **sin cifras** (nunca en cero ni viejas), fuera de los
  totales, del CSV y del Tablero, con su aviso y su botón «Eliminar el
  borrador»; el volante de un huérfano no se imprime.

### 3. «Dejar sin configuración desde este mes» (suspender la herencia)

- **Datos (0013)**: `nomina_config_mensual.sin_configuracion boolean not null
  default false`. Una fila con `true` es un **corte**: sin configuración desde
  ese mes hasta el próximo cambio. No se reutiliza «salario 0» (esas filas son
  restos del modelo anterior y se ignoran). No hizo falta relajar ninguna
  restricción: un corte va con los valores por defecto (0), que las
  restricciones `>= 0` ya aceptan.
- **Regla única**: `configVigente()` / `estadoConfigMes()` entienden el corte
  (si el cambio más reciente ≤ M es un corte → sin configuración).
  `estadoConfigMes` gana `origen: "suspendida"`, `corte` y `cambioDelMes`.
- **Pantalla**: tres estados distinguibles —«Configurado en este mes»,
  «Heredado de X» y «Sin configuración desde X (herencia suspendida)»—; botón
  **«Dejar sin configuración desde este mes»** en un mes que hereda; en un mes
  con corte propio, «Quitar el cambio de este mes» restaura la herencia; la
  lista de *Cambios guardados* muestra los cortes en ámbar. Guardar en un mes
  con corte lo convierte en configuración.
- Acciones `quitarConfigMes` / `cortarHerenciaConfig` con `getAdminOrNull()` y
  validación (no se corta un mes con configuración propia, ni uno ya
  suspendido, ni uno sin nada que heredar). Ayudas `AYUDA_NOMINA_CORTE` y
  `AYUDA_NOMINA_BORRADORES`.

### Otros

- Los textos `AYUDA_*` pasan a `src/components/admin/ayudas.ts` (puro); `ui.tsx`
  los reexporta. `ConfigNominaForm` y `LiquidacionPanel` —los únicos
  componentes de cliente que importaban de `ui.tsx`— importan ahora de ahí.
- Los tramos de vigencia se escriben «solo en noviembre de 2026» cuando el
  próximo cambio es al mes siguiente (antes: «desde noviembre hasta noviembre»).
- Manual del cliente, 6.18: «Dejar a alguien sin configuración (retiro o
  licencia)» y la regla de los borradores en lenguaje llano; PDF regenerado
  (53 páginas, las mismas que antes; sin títulos huérfanos ni tablas partidas).

### Hallazgo: un guardado que a veces no «termina» en pantalla

En las pruebas con Playwright, **alrededor de 1 de cada 10–20 acciones** de la
nómina (guardar configuración, crear una liquidación) se queda en
«Guardando…» / «Creando…» aunque **el dato sí se guardó** y la respuesta del
servidor llegó completa. **Pasa igual en la versión desplegada** (medido sobre el
commit `ab19007`: 2 de 12 guardados), así que no lo introdujo esta iteración.
Descartados: la precarga de los enlaces del encabezado público (con todos en
`prefetch={false}` siguió pasando, 1 de 20) y errores de consola (no hay
ninguno). Recargar la página muestra el dato guardado.

> **Resuelto el mismo 22 de septiembre**: era `app/admin/loading.tsx`. Detalle
> completo en la iteración siguiente.

### Datos (estado al terminar)

Listado inicial y final de `nomina_config_mensual` (5 filas) y
`nomina_liquidaciones` (2 filas) **idéntico** (hash por fila). Todo lo de las
pruebas se hizo con `oprueba` en meses de noviembre de 2026 en adelante y se
borró. Datos de César que se conservan: la configuración de `oprueba` de
septiembre de 2026 y su liquidación **cerrada** de la 2.ª quincena de
septiembre.

### Verificación

- `scripts/pruebas-nomina.mjs` **249/249** (41 nuevas: corte y regla de los
  borradores) y `scripts/pruebas-jornada.mjs` **74/74**; `lint` y `build`
  limpios.
- Playwright contra **localhost** como admin: tiempos de las tres pestañas
  (tabla de arriba); quitar un cambio con borrador que sigue heredando → el
  borrador se conserva con su bono; suspender la herencia en un mes heredado →
  la confirmación cuenta y nombra los 2 borradores, y el mes y los siguientes
  quedan sin configuración; quitar el corte → vuelve la herencia; corte +
  cambio posterior → vuelve a haber configuración; quitar el último cambio → el
  borrador desaparece y la cerrada no se toca; reabrir una cerrada sin
  configuración → rechazo con mensaje; el huérfano de septiembre se ve como
  tal. **29/29**, cero errores de consola. Capturas a 1440 y 390 de los tres
  estados y de las confirmaciones, revisadas.

---

## Iteración del 22 de septiembre de 2026 — el bug de «Guardando…» que no terminaba nunca

**Qué reportaba el cliente.** De vez en cuando, al guardar la configuración de
nómina o crear una liquidación, el botón se quedaba en «Guardando…» /
«Creando…» para siempre. El dato **sí** quedaba guardado (al recargar aparecía),
no había errores en consola y la respuesta del servidor llegaba entera. No era
de la nómina ni de esta iteración: pasaba igual en lo desplegado.

### 1. Cómo se reprodujo

`next build` + `next start` contra `localhost` y un bucle de Playwright que
repite la misma acción decenas de veces, registrando de cada intento la petición
POST de la acción (envío, cabeceras y **fin** del stream), el texto del botón y
el tiempo. Instrumentando además `fetch` y `history.pushState/replaceState` en
la página se vio lo esencial:

- en los cuelgues la respuesta **termina completa** (`POST-fin`, decenas de KB),
  pero **no hay `history.replaceState`**: el router nunca confirma el re-render;
- **no hay una segunda petición** del segmento que falta (ni `_rsc` ni nada);
- el DOM se queda con los datos viejos y no hay ni un error de consola;
- esperando 15–60 s más, no se destraba solo.

Y la pista que lo resolvió: **la tasa de cuelgue crece con el tamaño de la
respuesta**. Midiendo en dos pantallas:

| Pantalla | Tamaño de la respuesta | Cuelgues (antes) |
| --- | --- | --- |
| Nómina → Configuración (guardar) | ~53 KB | 3/30 y 1/24 |
| Calendario → Notas (guardar nota) | ~56 KB | 26/40 |
| Calendario → Notas, con la tabla más llena | ~65 KB | **40/40** |

Es decir: **no era de la nómina**, era de todo el panel, y con la tabla llena se
volvía determinista — que es lo que permitió cerrarlo rápido.

### 2. La causa: `app/admin/loading.tsx`

Un `loading.tsx` es la frontera de carga **del segmento**: Next envuelve la
página en un `<Suspense>` a nivel de router. Eso es justo lo que permite que la
respuesta de una server action se parta en dos:

1. la acción llama a `revalidatePath`, así que su respuesta trae —en el mismo
   stream— el **re-render de la ruta** (es como funciona Next 16: una sola
   petición lleva el resultado de la acción y la UI nueva);
2. como el segmento tiene frontera de carga, React puede **descargar el
   cascarón antes de que la página esté lista**: primera oleada = layout +
   esqueleto; segunda oleada, cientos de ms después = el contenido de la página;
3. el cliente siembra con esa respuesta una navegación, el segmento de página
   llega **parcial**, el router **no vuelve a pedir lo que falta** y la
   transición de React que sostiene el `pending` de `useActionState` no confirma
   nunca. El dato está guardado, la respuesta llegó entera y el botón se queda
   en «Guardando…» hasta recargar.

Por eso la probabilidad dependía del tamaño y de lo que tardase la página
respecto al layout: es la probabilidad de que la respuesta se parta en dos
oleadas. (La nómina colgaba menos porque su `page.tsx` no espera datos: los pide
dentro de un `<Suspense>` propio.)

### 3. El arreglo

**Se elimina `src/app/admin/loading.tsx`.** Con eso la respuesta de la acción
llega de una pieza y el cuelgue desaparece.

Lo que se conserva del arreglo de «el panel se traba» (17 sep): **`PuntoDeCarga`
en cada enlace del panel y `prefetch={false}`**, que es la mitad que de verdad
quita la sensación de panel congelado. Medido después de quitar la frontera: la
navegación del menú confirma en **533 ms de mediana** (16 transiciones) y, tras
**12 clics en ráfaga** cada 120 ms, la última navegación se completa igual — no
vuelve el «toca recargar».

Si una pantalla quiere esqueleto, va un **`<Suspense>` dentro de la página**,
como hace `/admin/nomina` con sus pestañas: esa frontera es de React, no de
segmento, y no reproduce el fallo (50/50 guardados limpios).

### 4. Red de seguridad: el vigilante de acciones

Aunque la causa esté corregida, ninguna pantalla debería quedarse muda
esperando una respuesta que quizá no llegue (una red lenta basta). Por eso
**todas** las acciones del panel y del portal pasan de `useActionState` a
**`useAccionPanel`** (`src/components/admin/ui-base.tsx`), que es el mismo hook
con un vigilante de tiempo: si a los **9 s** (`ESPERA_MAXIMA_ACCION_MS`) no hay
respuesta, apaga el «pendiente» —el botón se reactiva y deja de decir
«Guardando…»— y enciende **`VigilanteDeAcciones`**, el aviso ámbar fijo abajo
(«La respuesta se demoró más de lo normal. Es muy probable que el cambio sí se
haya guardado: actualiza para verlo») con un botón **Actualizar** que recarga la
pantalla. El aviso se monta UNA vez por pantalla: en `AdminShell` y en
`/mi-cuenta`. Son 23 puntos de uso en 13 archivos (nómina, calendario, jornadas,
equipo, horarios, contenido y las cuatro pestañas del portal).

Apagar el «pendiente» no destraba nada en React —si la transición estaba
colgada, lo sigue estando—, por eso la salida que ofrece el aviso es recargar.

### 5. Verificación

- Bucles con `next build` + `next start` contra `localhost`, como admin:
  **configuración de nómina 0/50**, **notas del calendario 0/40** (con la misma
  tabla llena que antes daba 40/40) y **crear liquidación 0/20**. Cero errores
  de consola en las tres.
- El vigilante, probado bloqueando a propósito la respuesta de la acción: el
  aviso sale, el botón vuelve a quedar utilizable y «Actualizar» devuelve la
  pantalla. Revisado a **1440 y 390 px** (sin desbordes).
- `scripts/pruebas-nomina.mjs` **249/249**, `scripts/pruebas-jornada.mjs`
  **74/74**; `lint` y `build` limpios.

### 6. Datos

Listado inicial y final (hash por fila) de `nomina_config_mensual`,
`nomina_liquidaciones`, `eventos`, `evento_responsables`, `evento_notas`,
`profiles`, `jornadas`, `horarios_mensuales`, `site_faqs`, `site_values` y
`site_settings`: **idéntico**. Todo lo de las pruebas se hizo con `oprueba` en
**2027** (12 configuraciones y 20 liquidaciones) y con un evento de prueba
creado para el bucle de notas; todo se borró al terminar. Los datos de César
—configuración de `oprueba` de septiembre de 2026 y su liquidación cerrada— no
se tocaron.

---

## Iteración del 23 de septiembre de 2026 — «Mis eventos» pasa a ser un calendario

**Qué pidió el cliente.** Xiomara, al ver el módulo del calendario, pidió que en
el portal del empleado (`/mi-cuenta?seccion=eventos`) los eventos **se vean como
calendario, igual que en el panel**, y no como la lista que había hasta ahora —
pero solo con los eventos en los que esa persona figura como responsable.

### 1. Una sola cuadrícula para las dos pantallas

La vista mensual del panel se partió en piezas reutilizables:
**`src/components/calendario/CuadriculaMes.tsx`** (Client Component) exporta

- **`BarraMes`** — «‹ septiembre de 2026 › · Hoy», con los enlaces que le pase
  quien la use (`hrefMes(anio, mes)` y `hrefHoy`), porque el panel navega a
  `/admin/calendario?anio=&mes=` y el portal a
  `/mi-cuenta?seccion=eventos&anio=&mes=` (arrastrando `portal=1` si vino);
- **`LeyendaEstados`** — los cuatro colores;
- **`CuadriculaMes`** — la cuadrícula: semanas de lunes a domingo, festivos de
  `festivosDelAnio`, «hoy» marcado, fichas de color en escritorio y puntos en
  móvil.

`CalendarioPanel` quedó como el envoltorio del panel (agenda del mes, ventanas
de detalle / formulario / creación) y **no cambió de comportamiento**: lo que
antes tenía escrito dentro ahora lo llama. Las dos diferencias entre pantallas
viajan por props: `onCrear` (el «+» de cada día, que el portal **no** pasa) y
`onSeleccionarDia` (la selección de un día, que solo usa el portal). Sin
`onSeleccionarDia` la cuadrícula se comporta exactamente como antes.

**Detalle del evento: el mismo componente.** `EventoDetalle` cambió de API — en
vez de `acciones` + `puedeAdministrar` + `onEditar` + `onCerrar`, recibe
`agregarNota` y un objeto **`manager: AccionesManager | null`**. El portal pasa
`manager={null}`: así ninguna server action de manager entra siquiera en el
grafo de esa pantalla. No es la barrera (las actions siguen pidiendo
`getManagerOrNull()` y RLS lo comprueba otra vez), pero tampoco hay por qué
mandarle al empleado referencias a acciones que no puede ejecutar.

### 2. El móvil (390 px)

La cuadrícula de siete columnas **cabe** en un teléfono, pero una ficha con
texto dentro de una casilla de ~50 px no se lee. La decisión, de las dos que
estaban sobre la mesa, fue **cuadrícula + agenda del día seleccionado**:

- la casilla enseña puntos del color del estado (hasta cuatro, y «+N» si hay
  más) y **se toca entera** — una capa `absolute inset-0 sm:hidden` encima del
  contenido, con su `sr-only` («Ver el jueves, 10 de septiembre de 2026: 1
  evento(s)») para quien use lector de pantalla;
- el día elegido queda con fondo verde claro y anillo de marca;
- justo debajo de la cuadrícula aparece la **agenda de ese día**, con fichas
  grandes (título, rango de horas y estado) que se pulsan con el pulgar y abren
  el detalle;
- sin día elegido, esa tarjeta dice qué hacer («Los días con actividad llevan un
  punto de color. Tócalo para ver qué hay»), en vez de quedarse muda.

En escritorio esa tarjeta no se pinta (`sm:hidden`): allí lo pulsable son las
fichas de la casilla, como en el panel. Medido con Playwright: `scrollWidth` =
390 px, **cero scroll horizontal**.

### 3. Lo que se conserva

- La **agenda del mes** sigue debajo del calendario, paginada de 10 en 10 con el
  control `Paginacion` (`usePaginaLocal`, que vuelve a la página 1 al cambiar de
  mes) — es el complemento de la cuadrícula, no la vista principal.
- El **contador de la pestaña** no cambia de significado: sigue siendo «lo que
  tienes esperando», es decir los eventos propios **de hoy en adelante**. Por eso
  la página hace dos lecturas: la de siempre para el contador (sin notas) y otra
  **solo cuando la pestaña es `eventos`** con el mes que se está viendo y sus
  notas. Las cuatro pestañas siguen entrando en un único `Promise.all`.
- El empleado **no** puede crear, editar, aplazar, cerrar ni eliminar: ni ve los
  botones ni el servidor se lo aceptaría.

### 4. Seguridad: no se relajó nada

No se tocó ninguna política ni se usó la clave de servicio para traer eventos.
La lectura es `listEventos({ responsableId, desde, hasta, conNotas })`: filtra
por responsable en la consulta **y** la RLS de la 0010 vuelve a filtrar en la
base. El único uso de la clave de servicio sigue siendo `mapaDePerfiles`, para
resolver los nombres de los compañeros.

Comprobado en vivo con un empleado que tenía tres eventos propios y, en el mismo
mes, **tres ajenos** (uno de otro empleado, otro creado a propósito con otro
responsable y el «Evento de Prueba» de César): ni en la cuadrícula, ni en la
agenda, ni en el **HTML de la respuesta**, ni pidiendo el mes a mano por la URL
(`?seccion=eventos&anio=2026&mes=9`), ni navegando a otro mes aparece ninguno —
tampoco la nota «confidencial» del evento ajeno.

### 5. Verificación

`npm run lint`, `npm run build` y las dos baterías (`pruebas-nomina.mjs` 249/249
y `pruebas-jornada.mjs` 74/74) en verde. Con `next start` + Playwright contra
`localhost`, **44 comprobaciones en verde y cero errores de consola**: la
cuadrícula con sus eventos y sin ninguno ajeno, la navegación de mes (que
conserva sesión, pestaña y `?anio=&mes=` en la URL), el detalle con título,
fecha, horas, descripción, estado, responsables y notas, el guardado de una nota
nueva, la ausencia de los siete botones de manager, el móvil de 390 px (tocar un
día → su agenda → el detalle) y, como admin, que `/admin/calendario` sigue
intacto con «Nuevo evento» y los cuatro botones de cierre.

Capturas revisadas a ojo en 1440 y 390 px (pestaña y detalle abierto). El único
arreglo que salió de mirarlas: el fondo del día seleccionado se decidía con dos
utilidades de fondo en la misma cadena de clases (`bg-white` y `bg-brand-tint`),
que no se resuelven por el orden en que están escritas sino por el del CSS
generado; ahora es una sola clase elegida con un ternario.

**Datos.** Listado inicial y final de `eventos`, `evento_responsables` y
`evento_notas`: **idéntico** (2 / 5 / 2 filas). Se crearon cuatro eventos de
prueba con sus responsables y notas, y se borraron al terminar (las notas y los
responsables se van por `on delete cascade`). Las contraseñas del archivo de
credenciales ya no son válidas —GPI las cambió en producción—, así que el QA
corrió con **dos cuentas temporales** (`qaempleado` y `qaadmin`) creadas para
esto y **eliminadas** al final: `profiles` volvió a sus nueve filas. No se tocó
el «Evento de Prueba» de César ni nada de `oprueba`.

---

## Iteración del 23 de septiembre de 2026 — la nómina se rige estrictamente por la ley

GPI decidió que la nómina tiene que **resistir una auditoría**: nada de reglas
de la casa que se aparten del Código Sustantivo del Trabajo, y ningún valor por
hora escrito a mano. Con eso se cierran las tres decisiones que quedaban
pendientes (P4, P5 y P7), se completa P6 y las tarifas dejan de ser editables.

**Sin migración y sin tocar datos.** Las jornadas ya aprobadas siguen con su
desglose congelado y las liquidaciones cerradas con su `snapshot`.

### 1. P4 · El sábado se paga como extra normal

En `calcularJornada` (`src/lib/jornada.ts`) la condición por minuto pasó de
`diaSemana === 0 || festivo !== null || noLaboral` a
`diaSemana === 0 || festivo !== null`. Un día sin horario en el mes sigue con
**jornada ordinaria 0** —todo lo trabajado es extra—, pero ya no arrastra el
recargo dominical. Un sábado que además sea festivo sigue siendo festivo.

| Turno | Antes | Ahora |
| --- | --- | --- |
| Sábado 19-sep 08:00–14:00 | extra dominical diurna 6 h (×2,15) | **extra diurna 6 h** (×1,25) |
| Sábado 19-sep 08:00–17:00 | extra dominical diurna 9 h | **extra diurna 8 h** (descuenta 1 h de almuerzo) |
| Sábado 20:00 → domingo 04:00 | extra dominical nocturna 8 h | **extra nocturna 4 h + extra dominical nocturna 4 h** |

Con un salario de ejemplo de 2.100.000 (hora de 10.000), el sábado de 6 h pasa
de 129.000 a **75.000 pesos**: GPI venía pagando por encima de la ley.

### 2. P5 · Festivo o domingo en día programado

Se separó **día programado** (`horarioBase !== null`: el horario del mes tiene
turno ese día) de **día laboral** (programado y no festivo). La jornada
ordinaria sale ahora del día PROGRAMADO, también cuando es festivo;
`diaLaboral` se conserva como indicador de interfaz y para la regla del
almuerzo, y `construirContextoCalculo` guarda los dos en el contexto congelado.

| Turno | Antes | Ahora |
| --- | --- | --- |
| Festivo lunes 12-oct-2026 08:00–17:30 | extra dominical diurna 9,5 h | **dominical diurna 8,5 h** (×1,90), 0 extra |
| Festivo lunes 12-oct-2026 08:00–19:30 | extra dominical 9,5 h + 1 h nocturna | **dominical 8,5 h + extra festiva 1,5 h diurna y 0,5 h nocturna** |
| Festivo martes 8-dic-2026 08:00–12:00 | extra dominical diurna 4 h | **dominical diurna 4 h** |

Un **domingo** no tiene jornada programada en el horario de GPI, así que sigue
yendo entero como extra festiva: la regla es la misma, cambia el horario.

### 3. P7 · La regla del almuerzo, en tres reglas

Constantes nombradas en `jornada.ts`, no números sueltos:
`UMBRAL_ALMUERZO_DIA_NO_PROGRAMADO_MINUTOS` (480),
`ALMUERZO_DIA_NO_PROGRAMADO_MINUTOS` (60),
`TURNO_NOCTURNO_DIA_DESDE_MINUTOS` / `TURNO_NOCTURNO_DIA_HASTA_MINUTOS`
(360 y 1140) y la función `esTurnoNocturno()`.

1. **Turno nocturno: nunca se descuenta.** Definición inequívoca y documentada:
   el turno que **no tiene ningún minuto entre las 6:00 a. m. y las 7:00 p. m.**
   Manda sobre las otras dos. Así, 20:00–06:00 es nocturno; **16:00–02:00 no lo
   es**, porque de 16:00 a 19:00 es de día.
2. **Día programado** (y no festivo): se descuenta el almuerzo del horario solo
   si **la duración del turno ≥ la duración programada de ese día** (presencia:
   jornada neta + almuerzo; L–J 9,5 h, V 9 h). Un turno de 6 h no descuenta, y
   **desaparece el salto**: 6 h 1 min ya no se convierten en 5 h 1 min.
3. **Día no programado** (sábado, domingo o festivo): 1 h **solo si el turno
   dura 8 horas o más**.

Y si ese día ya se descontó el almuerzo en otra jornada, aquí no se vuelve a
descontar (ver P6).

| Turno | Antes | Ahora |
| --- | --- | --- |
| Lunes 08:00–17:30 (justo la jornada) | ordinaria 8,5 h | **ordinaria 8,5 h** (igual) |
| Lunes 08:00–17:29 | 8,5 h + 0,48 h extra | **8,5 h + 0,98 h extra** (no descuenta) |
| Lunes 08:00–14:01 | ordinaria 5,02 h | **ordinaria 6,02 h** |
| Sábado 08:00–16:00 (8 h justas) | extra dominical 8 h | **extra diurna 7 h** |
| Sábado 08:00–15:59 | extra dominical 7,98 h | **extra diurna 7,98 h** |
| Miércoles 22:00 → jueves 06:00 | ordinaria nocturna 7 h | **ordinaria nocturna 8 h** |

Detalle de implementación: cuando no hay tramo ordinario (día sin jornada
programada), el almuerzo se centra en el **turno completo** en vez de pegarse a
la hora de entrada, y el límite del tramo ordinario es 0 —no `0 + almuerzo`—,
que si no contaría como ordinarios los primeros minutos de un sábado.

### 4. P6 completo · dos jornadas el mismo día

GPI confirmó que puede haber dos jornadas el mismo día, sin cruzarse (el rechazo
por solapamiento del 19 sep sigue vigente). Antes, cada registro recibía su
propia jornada ordinaria y su propio almuerzo: las extras del día se perdían y
el almuerzo se descontaba dos veces.

Ahora `calcularJornada` y `obtenerDesglose` reciben un `ConsumoPrevioDia`
opcional —`{ ordinariosUsados, almuerzoDescontado }`—: la **jornada ordinaria
del día es una sola**, se reparte **por orden cronológico**, y el **almuerzo se
descuenta una sola vez**. Lo alimentan tres sitios:

- **`approveJornada`** (`src/app/admin/jornadas/actions.ts`): `consumoPrevioDelDia`
  lee las otras jornadas **aprobadas** del mismo día con `start_at` anterior,
  las resuelve con `obtenerDesglose()` (su snapshot) y las suma con
  `acumularConsumo()`, **antes** de congelar el desglose.
- **`horasPorEmpleado`** (`src/lib/admin.ts`), vía el helper puro
  `resolverDesglosesDeUnaPersona()`: agrupa por día, ordena y va acumulando. Las
  congeladas no se recalculan, pero sí cuentan para lo que consumieron.
- **La vista previa del portal**: `/mi-cuenta` calcula `consumoPorDia()` en el
  servidor con las jornadas aprobadas del empleado y se lo pasa a `JornadaForm`,
  que filtra con `consumoAntesDe()` según la hora de inicio que se esté
  escribiendo.

Ejemplo (lunes, jornada de 8,5 h):

| Jornada | Sin consumo previo | Con consumo previo |
| --- | --- | --- |
| A · 06:00–12:00 | ordinaria 6 h | ordinaria 6 h |
| B · 14:00–20:00 | ordinaria 5 h + nocturna 1 h (se perdían las extras) | **ordinaria 2,5 h + extra diurna 2,5 h + extra nocturna 1 h** |

Y con almuerzo: A de 05:00 a 15:00 descuenta 1 h; B de 16:00 a 22:00 ya **no**
vuelve a descontar y todo lo suyo es extra (la jornada del día se agotó).

**Aprobar fuera de orden** (primero la de la tarde) dejaría a las dos con la
jornada completa: se corrige devolviendo la segunda a pendiente y volviéndola a
aprobar. Está documentado en la propia función.

### 5. Las tarifas se bloquean y se vuelven automáticas

Las siete tarifas **dejaron de editarse**. Se derivan siempre del **salario** y
de la **ley vigente del mes que se liquida**
(`derivarTarifas(salario, parametrosLegalesDelMes(...))`), y en Configuración
aparecen en una tabla de **solo lectura** con la cuenta al lado
(«salario ÷ 210 × 1,25»). El administrador solo edita **salario, auxilio de
transporte y los porcentajes de salud y pensión**.

- **Borradores**: `liquidacion.tsx`, `cerrarLiquidacion` y `volante-datos.ts`
  derivan las tarifas con la ley del mes liquidado. Así, el **1 de julio de
  2027** el recargo dominical pasa al 100 % **sin que nadie toque nada** (era el
  pedido nº 7 del cliente): con un salario de 2.100.000, la hora en festivo pasa
  de 19.000 a 20.000, la extra festiva diurna de 21.500 a 22.500 y la nocturna
  de 26.500 a 27.500; la hora base y las extras normales no se mueven.
- **Cerradas**: intactas, con su `snapshot`.
- **Columnas de `nomina_config_mensual`**: quedan como **histórico**.
  `saveNominaConfig` las sigue escribiendo con lo derivado, pero **el cálculo ya
  no depende de ellas**.
- **Código muerto retirado**: `tarifasBajoMinimoLegal()` y `TarifaBajoMinimo`
  (`nomina.ts`), `FilaNomina.tarifasBajoMinimo` (`admin-types.ts`), el aviso
  ámbar de la Liquidación, el botón «Usar los valores sugeridos», los siete
  campos del formulario y su lectura en `saveNominaConfig`, y la constante
  `AYUDA_NOMINA_SUGERIDAS` (sustituida por `AYUDA_NOMINA_TARIFAS_AUTOMATICAS`).

### 6. «Horas ordinarias» pasa a «Jornada laboral: N días»

En el desglose de la Liquidación y en el **volante**, lo que cubre el salario ya
no se imprime como un renglón de horas: el básico del período se titula
**«Jornada laboral: N días»**, con la cuenta debajo
(«Salario mensual $X ÷ 30 × N»). Las líneas de horas que no se pagan salen del
cuadro y, en su lugar, va una línea **informativa sin dinero** —«Horas
trabajadas en el período», con «—» en la columna de importe— que dice el total
trabajado y cuántas de esas horas son de la jornada laboral.

Los datos **no cambian**: `CONCEPTOS_HORA` sigue guardando `ordinariaDiurna`
con `sePaga: false` (su importe siempre fue 0), así que ningún total se mueve y
una liquidación cerrada se sigue leyendo igual. Las pruebas lo fijan: quitar del
cuadro las líneas que no se pagan no cambia `totalHoras`.

### 7. Botón «Reglas de cálculo»

Pedido explícito de GPI. En `/admin/nomina`, junto a las pestañas —así se ve
desde Liquidación, Configuración y Tablero—, un botón abre una ventana
(`ModalPanel`) con **doce grupos** de reglas explicadas para alguien que no es
técnico, con la norma citada en lenguaje llano: qué cubre el salario; cómo se
calcula el valor de la hora (÷210 con la jornada de 42 h) y desde cuándo; los
siete conceptos con su factor y qué los dispara; el recargo dominical por fecha
(80 % → 90 % desde jul-2026 → 100 % desde jul-2027) y que el sistema lo cambia
solo; la franja nocturna 19:00–06:00 y de qué ley sale; los sábados; los
festivos en día programado; **las tres reglas del almuerzo**; dos jornadas el
mismo día; que solo se pagan jornadas **aprobadas**; que al cerrar se congela; y
de dónde salen salud y pensión.

El texto vive en **un solo sitio**: `REGLAS_NOMINA` y `REGLAS_NOMINA_INTRO` de
`src/components/admin/ayudas.ts` (módulo puro: grupos con `titulo`, `puntos` y
`norma`). Lo pinta `src/components/nomina/ReglasCalculo.tsx`. **Si cambia una
regla del cálculo, se cambia ahí.**

### 8. NIT del volante

Lo guardado en `site_settings.empresa` ya era **901.638.649-7**, que es
justamente el que GPI decidió dejar. No se tocó la base: solo se corrigieron los
comentarios de `src/data/site.ts` que lo daban por pendiente.

### Verificación

- `scripts/pruebas-jornada.mjs` **129/129** y `scripts/pruebas-nomina.mjs`
  **257/257**; `npm run lint` y `npm run build` limpios.
- La batería de jornadas se actualizó al comportamiento NUEVO, con lo que daba
  ANTES escrito al lado de cada caso. El **modelo legal independiente** del
  script también se actualizó (sábado no dominical, jornada en día programado,
  las tres reglas del almuerzo, consumo previo), y los casos de P4 y P5 pasaron
  del grupo «decisiones pendientes» al de «coinciden con la ley minuto a minuto
  y en pesos». Casos nuevos: los bordes del almuerzo (turno exactamente igual a
  la jornada programada y un minuto menos; 8 h justas y un minuto menos en día
  no programado; 20:00–06:00 y 16:00–02:00) y dos jornadas el mismo día.
- `next start` + Playwright contra **localhost**, como administrador:
  Configuración con las siete tarifas de solo lectura y su explicación, la
  ventana de reglas en 1440 y 390 px, una liquidación en borrador con «Jornada
  laboral: N días» y una liquidación cerrada que no cambia. Sin errores de
  consola.
- **Datos**: se guardó un listado de `nomina_config_mensual`,
  `nomina_liquidaciones`, `jornadas` y `profiles` antes de empezar; se probó con
  una cuenta temporal de administrador, **eliminada al terminar**. Las tablas
  quedaron idénticas y no se tocó nada de septiembre de 2026.

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
  servidor). Sin la 0007, el inicio y Nosotros muestran los mismos textos y
  fotos desde `src/data/site.ts`, el panel los enseña listos para guardar,
  `saveService` reintenta sin la columna `video` y la tarjeta de visitas no se
  pinta. Sin la 0008, los ocho títulos del pulido final —secciones del inicio y
  cabeceras de página— también salen del respaldo estático de `src/data/site.ts`
  y `/admin/inicio` / `/admin/paginas` los muestran listos para guardar; a
  diferencia de las demás migraciones, aquí **no hay ningún reintento
  especial** porque `home` y `paginas` son claves dentro de `site_settings`
  (tabla que ya existe desde la 0001), así que el panel guarda esos ocho
  bloques igual con o sin la 0008 aplicada — la migración solo adelanta la
  semilla inicial. Sin la 0009 (hoy ya aplicada), el formulario seguiría
  pidiendo y enviando el teléfono igual —viaja dentro del correo—, solo que
  `site_mensajes` se quedaría sin la columna y el `insert` reintentaría sin
  ella, el mismo patrón que la columna `video` de la 0007. El build no
  depende de la base de datos.
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

> ✅ El correo del formulario de contacto ya no es un pendiente: desde el 13
> de agosto de 2026 envía de verdad, en producción, desde el buzón del
> dominio (`smtpout.secureserver.net`, el correo Workspace de GoDaddy).

- ~~Conectar el dominio~~ ✅ **hecho el 19 de agosto de 2026** (ver la
  iteración de lanzamiento): el sitio vive en `https://www.gpiprofesionales.com`.
  Queda como sugerencia SEO registrar el dominio en **Google Search Console** y
  enviar el sitemap.
- **Imágenes**: confirmar/actualizar fotografías de servicios y proyectos si
  GPI quiere reemplazar las heredadas del sitio viejo.
- **Lista de empleados** (Fase 2): nombres, **usuarios**, cédulas, cargos,
  teléfonos y correos de contacto para crear las cuentas desde
  `/admin/empleados`. El sistema ya está listo: solo falta cargarlos.
- **Tres decisiones de la auditoría legal** ⚠️ (reunión del 22 sep 2026):
  el **sábado** (hoy se paga como domingo; la ley, como extra normal), el
  **festivo entre semana** (hoy todo el turno como extra festiva; la ley, las
  horas de la jornada como festivas ordinarias) y la **regla del almuerzo**
  (salto a las 6 h). Detalle y qué cambiaría en cada caso: iteración del 19 sep
  2026, «auditoría legal del cálculo de horas».
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

### Dudas abiertas de NÓMINA (17–18 sep 2026)

Salen del análisis del Excel `NOMINA_LIQUIDACION.xlsx` y de un volante real de
GPI. Ninguna bloquea el módulo —**todo es configurable desde el panel**—, pero
conviene cerrarlas antes de liquidar de verdad.

1. ~~**Tarifas de domingo y festivo**~~ ✅ **Resuelto por la auditoría legal
   del 19 sep 2026**: con el recargo del 90 % (desde el 1-jul-2026) la ley pide
   1,90 / 2,15 / 2,65. El 2,15 del Excel para la extra diurna festiva **era el
   legal**; lo que no cuadraba era el 2,15 de «hora en festivo» (1,90). Los
   sugeridos del panel ya son los legales y el formulario avisa si alguna
   tarifa queda por debajo. Queda como pregunta para GPI solo si quiere pagar
   **más** que la ley en algún concepto.
2. ~~**Divisor del valor hora**~~ ✅ **Resuelto por la auditoría**: con 42 h
   semanales la ley pide **÷ 210** (horas ÷ 6 × 30); el 240 del Excel es la
   cuenta de 48 h y dejaba todo un 12,5 % por debajo. El sistema ya sugiere
   ÷ 210.
3. **Auxilio de transporte 2026**: ¿cuál es el valor mensual vigente que debe
   quedar por defecto? (El Excel tiene un valor viejo en una fórmula sin usar y
   valores digitados a mano en las filas reales.)
4. **«Rotación nocturna»**: se implementó como **recargo aditivo** sobre la
   hora ordinaria nocturna (la hora ya la paga el salario), que es como lo hace
   el Excel. ¿GPI lo entiende así, o espera digitar un valor absoluto que
   reemplace el salario de esas horas?
5. **Hora ordinaria NOCTURNA en festivo**: no existe como tarifa ni en el Excel
   ni en el pedido de la gerencia. Se paga como **festivo + rotación nocturna**
   y se muestra como línea propia. ¿Se acepta o quieren una octava tarifa?
6. **Período**: el único ejemplo real es quincenal. ¿Alguien se liquida por mes
   completo? (El módulo soporta los dos.)
7. **Prima y cesantías**: hoy entran como **campos manuales** del período
   cuando corresponde pagarlas. ¿Se quiere que el sistema las calcule (proceso
   semestral/anual aparte) o siguen a cargo del contador?
8. **NIT y razón social del volante** ✅ *(resuelto el 23 sep 2026)*: GPI se
   queda con el del documento que ya usaba, **901.638.649-7**. Es el valor por
   defecto del código (`empresaDefaults`), el que siembra la migración 0011 y el
   que está guardado en `site_settings.empresa`: **no hubo que cambiar nada**.
   El 901.877.993-0 de los documentos comerciales queda descartado. Sigue siendo
   editable en `/admin/ajustes`.
9. **«Bono» vs «Bono cumplimiento» vs «Comisiones»**: el Excel usa las tres
   etiquetas en distintas copias del mismo bloque. ¿Son tres conceptos reales y
   simultáneos o nombres alternativos según el cargo? (Hoy existen los tres.)
10. **Préstamos por cuotas**: hoy se digita la cuota de cada período. ¿Hace
    falta que el sistema lleve el **saldo** del préstamo y lo descuente solo
    hasta agotarlo?
11. **Costo patronal**: el módulo liquida lo que se le paga al empleado. Las
    provisiones (cesantías, intereses, vacaciones, prima) y los aportes
    patronales (caja, pensión, ARL) que el Excel calcula agregados **no** se
    construyeron. ¿Se quieren en una fase 2 del módulo?

## Referencias

- [`README.md`](../README.md) — visión general, stack y comandos.
- [`docs/ADMIN.md`](ADMIN.md) — migración de Supabase, variables de entorno y
  uso del panel `/admin`.
- [`docs/CONTENIDO.md`](CONTENIDO.md) — contenido original del sitio viejo
  (fuente de textos e inventario de imágenes).
- [`AGENTS.md`](../AGENTS.md) — contexto de marca, datos de contacto oficiales
  y flujo de trabajo con Claude.
