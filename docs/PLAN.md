# Plan del proyecto — Sitio web GPI

Estado al **28 de julio de 2026**. Este documento existe para que cualquier
sesión futura (humana o de Claude) arranque con contexto completo sin tener
que reconstruir el historial desde los commits.

## Fases

| # | Fase | Estado | Notas |
| - | --- | --- | --- |
| 1 | Sitio base: 16 páginas + SEO | ✅ Hecho | App Router, Tailwind v4, metadata por página, JSON-LD `Organization`/`LocalBusiness`/`FAQPage`, `sitemap.ts`, `robots.ts`, breadcrumbs y navegación anterior/siguiente entre servicios. |
| 2 | Mi Cuenta GPI + panel admin CRUD | ✅ Código listo | `/mi-cuenta` (login) y `/admin` (servicios, proyectos, clientes, FAQ, valores, contacto/ajustes) construidos sobre Supabase. **Falta**: aplicar `supabase/migrations/0001_site_content.sql` en el proyecto **"GPI Project"** de Supabase y configurar `.env.local` (ver `docs/ADMIN.md`). |
| 3 | Conexión a DB real y prueba end-to-end en local | ⏳ Pendiente | Depende de las fases 2 y 4: una vez aplicadas las migraciones y configuradas las env vars, probar login, CRUD completo, creación de cuentas, registro y aprobación de jornadas, y que el fallback estático siga funcionando si se apagan las variables. |
| 4 | Fase 2 del proyecto — Núcleo de horas extra | ✅ Completa | Roles ampliados, CRUD de empleados con cuentas, portal del empleado con registro de jornadas, aprobaciones y visibilidad del contenido. Migraciones 0001 y 0002 **ya aplicadas** en el GPI Project (27 jul 2026); `SUPABASE_SERVICE_ROLE_KEY` configurada en `.env.local`. |
| 4b | Fase 2 — Tablero de métricas de horas extra | ✅ Completa | `/admin/jornadas?vista=metricas`: 4 KPIs, gráficas Recharts (por día, por empleado, extras, Gantt de turnos), filtros client-side, control semanal contra topes legales, glosario amable y export CSV para nómina. |
| 4c | Fase 2 — Iteración post-feedback de GPI | ✅ Código listo | Horarios laborales **mes a mes** (`/admin/horarios`), cuentas por **usuario** en vez de correo, y el rol *marketing* pasa a llamarse **Community Manager** (y también registra jornadas). **Falta**: aplicar `supabase/migrations/0003_horarios_mensuales.sql` en el GPI Project. |
| 4d | Fase 2 — Desglose congelado + ayudas del panel | ✅ Código listo | Al **aprobar** una jornada su desglose de horas se guarda tal cual, con el horario y los recargos que se usaron: los reportes de nómina ya cerrados no cambian si después se corrige un horario. Además, textos de ayuda en todo el panel para usuarios no técnicos. **Falta**: aplicar `supabase/migrations/0004_congelar_desglose.sql` en el GPI Project (el código funciona igual sin ella: calcula en vivo). |
| 5 | Deploy en Vercel desde el repo de GitHub + variables de entorno | ⏳ Pendiente | Repo: `GOCAS-Automations/website_GPI`. Cuenta Vercel: GOCAS Automations (plan gratis). Recordar añadir `SUPABASE_SERVICE_ROLE_KEY` **sin** prefijo `NEXT_PUBLIC_`. |
| 6 | Apuntar dominio `gpiprofesionales.com` de GoDaddy → Vercel | ⏳ Pendiente | Al final, cuando el sitio esté aprobado por GPI y desplegado en Vercel. |
| 7 | Extra cotizable aparte: chatbot IA | 💡 Planeado | Claude Haiku 4.5 vía `/api/chat`, con conocimiento del contenido del sitio (servicios, proyectos, contacto) y captura de leads hacia Supabase. No incluido en la cotización actual. |

## Fase 2 — qué quedó construido (núcleo)

| Pieza | Dónde vive |
| --- | --- |
| Migración de roles, jornadas y visibilidad | `supabase/migrations/0002_empleados_jornadas.sql` |
| Roles `admin` / `coordinador` / `marketing` / `empleado` | `src/lib/roles.ts` + guardas en `src/lib/supabase/auth.ts` |
| Cliente service-role (Auth Admin API) | `src/lib/supabase/admin.ts` — **solo servidor** |
| CRUD de cuentas del equipo | `/admin/empleados` (+ `nuevo`, `[id]`) |
| Aprobación de jornadas | `/admin/jornadas` |
| Portal del empleado (registro + historial + contraseña) | `/mi-cuenta` |
| Cálculo de horas ordinarias, extra, nocturnas y dominicales | `src/lib/jornada.ts` (función pura `calcularJornada`) |
| Visibilidad por ítem (`published`) y por sección (`visibility`) | Formularios de `/admin/*` y `/admin/ajustes` |
| Horario laboral mes a mes | `supabase/migrations/0003…`, `src/lib/horarios.ts`, `/admin/horarios` |
| Cuentas por usuario (correo sintético interno) | `src/lib/usuarios.ts`, `/mi-cuenta` (login) y `/admin/empleados` |
| Desglose congelado al aprobar | `supabase/migrations/0004…`, `obtenerDesglose()` en `src/lib/jornada.ts` |
| Ayudas del panel para usuarios no técnicos | `AyudaSeccion` / `AyudaDesplegable` + constantes `AYUDA_*` en `src/components/admin/ui.tsx` |

Flujo completo: **el empleado registra su jornada** en `/mi-cuenta` (con vista
previa del desglose) → queda **pendiente** → un **coordinador o admin** la ve en
`/admin/jornadas` con el desglose calculado y la **aprueba** o la **rechaza con
una nota obligatoria** → el empleado ve el resultado y la nota en su portal.
Mientras esté pendiente puede editarla o eliminarla; después queda congelada
(un manager puede devolverla a pendiente).

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
  snapshot. El build no depende de la base de datos.
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
