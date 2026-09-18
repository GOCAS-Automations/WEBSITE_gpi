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
| Arreglo del bug «el panel se traba» (pulido final) | `src/app/admin/loading.tsx`, `src/components/admin/PuntoDeCarga.tsx`, `prefetch={false}` en `AdminShell` |
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
exacta del volante real de Santiago Córdoba** (sueldo 875.048, auxilio 124.548,
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

## Iteración del 18 de septiembre de 2026 — la nómina queda solo para el administrador

> Esta sección describe trabajo que vive en la rama **`nomina-wip`**, junto con
> el resto del módulo de nómina. En `main` la nómina está fuera del despliegue.

GPI revisó los permisos del rol **coordinador** y pidió dos cosas opuestas:

1. **Abrirle el «Apodo»** de las cuentas (antes solo del administrador). Eso
   toca `/admin/empleados`, no la nómina, así que vive en **`main`**.
2. **Cerrarle la nómina.** El coordinador aprueba jornadas y lleva el
   calendario, pero **no liquida la nómina de nadie**: de la nómina ve *solo la
   suya*, como cualquier empleado. Eso es lo que hay aquí.

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

- **La migración 0012 ya está aplicada** en el GPI Project, aunque `main` no
  lleve el código de nómina: solo endurece permisos sobre tablas vacías.
- Esta rama es `main` **antes** del revert de la nómina más este commit. No
  incluye lo que entró en `main` después (los ajustes de aplazamiento del
  calendario ni el apodo para el coordinador).
- **Para reintegrar**: en `main`, revertir el revert (`git revert <hash del
  revert>`) para recuperar el módulo, y después traer este commit
  (`git cherry-pick`) para que llegue ya con los permisos correctos.
- Queda **pendiente de probar a fondo** el módulo completo con el plan de
  `docs/PRUEBAS_CALENDARIO_NOMINA.md` cuando se decida desplegarlo.

---

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

Salen del análisis del Excel `NOMINA_LIQUIDACION.xlsx` y del volante real de
GPI. Ninguna bloquea el módulo —**todo es configurable desde el panel**—, pero
conviene cerrarlas antes de liquidar de verdad.

1. **Tarifas de domingo y festivo** ⚠️ *(la más importante: es dinero)*. El
   Excel de GPI usa 2,15 / 2,15 / 2,65 (festivo ordinario / extra diurna
   festiva / extra nocturna festiva) sobre el valor hora; la ley vigente y los
   valores por defecto de la webapp (`jornada_config`) dan 1,80 / 2,05 / 2,55.
   Además, en el Excel «hora en festivo» y «hora extra diurna en festivo»
   tienen **el mismo** valor, lo que parece una fórmula copiada. ¿Cuáles son
   las tres tarifas reales?
2. **Divisor del valor hora**: el Excel usa `salario / 240` («30 días × 8 h»),
   anterior a la Ley 2101; GPI ya trabaja 42 h semanales. ¿Se mantiene 240 como
   convención de nómina o se recalcula?
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
8. **NIT y razón social del volante** ⚠️: el comprobante actual imprime
   **901.638.649-7**, pero en los documentos comerciales del proyecto aparece
   **901.877.993-0**. Se dejó el del comprobante como valor inicial y es
   editable en `/admin/ajustes`. **Confirmar cuál es el correcto.**
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
