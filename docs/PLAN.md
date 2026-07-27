# Plan del proyecto — Sitio web GPI

Estado al **27 de julio de 2026**. Este documento existe para que cualquier
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

Flujo completo: **el empleado registra su jornada** en `/mi-cuenta` (con vista
previa del desglose) → queda **pendiente** → un **coordinador o admin** la ve en
`/admin/jornadas` con el desglose calculado y la **aprueba** o la **rechaza con
una nota obligatoria** → el empleado ve el resultado y la nota en su portal.
Mientras esté pendiente puede editarla o eliminarla; después queda congelada
(un manager puede devolverla a pendiente).

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
  ley colombiana 2026 si la clave no existe.
- **ISR + revalidación explícita**: las páginas públicas usan
  `revalidate = 300` (5 minutos) y, además, cada server action de `/admin`
  llama a `revalidatePath("/", "layout")` para que los cambios se vean de
  inmediato sin esperar al intervalo de ISR.

## Pendientes del cliente

- **Imágenes**: confirmar/actualizar fotografías de servicios y proyectos si
  GPI quiere reemplazar las heredadas del sitio viejo.
- **Lista de empleados** (Fase 2): nombres, correos, cargos y teléfonos para
  crear las cuentas desde `/admin/empleados`. El sistema ya está listo: solo
  falta cargarlos.
- **Reglas de cálculo de horas extra** (Fase 2): confirmar horario base, horas
  ordinarias por día, franja nocturna, porcentajes de recargo y tratamiento de
  festivos. Los valores actuales (`site_settings.jornada_config`) son los de la
  ley colombiana 2026 y sirven de punto de partida; se ajustan sin tocar código.
- **Quién aprueba las jornadas**: definir qué personas llevan el rol
  `coordinador` (pueden aprobar y gestionar cuentas) frente a `marketing` (solo
  contenido del sitio).

## Referencias

- [`README.md`](../README.md) — visión general, stack y comandos.
- [`docs/ADMIN.md`](ADMIN.md) — migración de Supabase, variables de entorno y
  uso del panel `/admin`.
- [`docs/CONTENIDO.md`](CONTENIDO.md) — contenido original del sitio viejo
  (fuente de textos e inventario de imágenes).
- [`AGENTS.md`](../AGENTS.md) — contexto de marca, datos de contacto oficiales
  y flujo de trabajo con Claude.
