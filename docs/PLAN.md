# Plan del proyecto — Sitio web GPI

Estado al **27 de julio de 2026**. Este documento existe para que cualquier
sesión futura (humana o de Claude) arranque con contexto completo sin tener
que reconstruir el historial desde los commits.

## Fases

| # | Fase | Estado | Notas |
| - | --- | --- | --- |
| 1 | Sitio base: 16 páginas + SEO | ✅ Hecho | App Router, Tailwind v4, metadata por página, JSON-LD `Organization`/`LocalBusiness`/`FAQPage`, `sitemap.ts`, `robots.ts`, breadcrumbs y navegación anterior/siguiente entre servicios. |
| 2 | Mi Cuenta GPI + panel admin CRUD | ✅ Código listo | `/mi-cuenta` (login) y `/admin` (servicios, proyectos, clientes, FAQ, valores, contacto/ajustes) construidos sobre Supabase. **Falta**: aplicar `supabase/migrations/0001_site_content.sql` en el proyecto **"GPI Project"** de Supabase y configurar `.env.local` (ver `docs/ADMIN.md`). |
| 3 | Conexión a DB real y prueba end-to-end en local | ⏳ Pendiente | Depende de la fase 2: una vez aplicada la migración y configuradas las env vars, probar login, CRUD completo y que el fallback estático siga funcionando si se apagan las variables. |
| 4 | Fase 2 del proyecto — Sistema de horas extra | ⏳ Pendiente | Login de empleados, registro de jornadas, flujo de aprobación, dashboard para administradores y gestión de cuentas de empleados. Requiere del cliente: las reglas de cálculo del sistema actual (hoja de Google) y la lista de empleados. Se factura tras aprobación de la cotización. |
| 5 | Deploy en Vercel desde el repo de GitHub + variables de entorno | ⏳ Pendiente | Repo: `GOCAS-Automations/website_GPI`. Cuenta Vercel: GOCAS Automations (plan gratis). |
| 6 | Apuntar dominio `gpiprofesionales.com` de GoDaddy → Vercel | ⏳ Pendiente | Al final, cuando el sitio esté aprobado por GPI y desplegado en Vercel. |
| 7 | Extra cotizable aparte: chatbot IA | 💡 Planeado | Claude Haiku 4.5 vía `/api/chat`, con conocimiento del contenido del sitio (servicios, proyectos, contacto) y captura de leads hacia Supabase. No incluido en la cotización actual. |

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
  `profiles` con `role` (`admin` | `employee`) vía trigger. RLS: lectura
  pública en las tablas `site_*`, escritura solo si `is_admin()`. La Fase 2
  reutilizará estos mismos roles y perfiles para el login de empleados.
- **ISR + revalidación explícita**: las páginas públicas usan
  `revalidate = 300` (5 minutos) y, además, cada server action de `/admin`
  llama a `revalidatePath("/", "layout")` para que los cambios se vean de
  inmediato sin esperar al intervalo de ISR.

## Pendientes del cliente

- **Imágenes**: confirmar/actualizar fotografías de servicios y proyectos si
  GPI quiere reemplazar las heredadas del sitio viejo.
- **Lista de empleados** (Fase 2): nombres, correos y datos básicos para crear
  las cuentas del sistema de horas extra.
- **Reglas de cálculo de horas extra** (Fase 2): cómo calcula hoy GPI las horas
  extra en su hoja de Google (recargos, topes, festivos, aprobación) para
  poder replicarlas en el sistema.

## Referencias

- [`README.md`](../README.md) — visión general, stack y comandos.
- [`docs/ADMIN.md`](ADMIN.md) — migración de Supabase, variables de entorno y
  uso del panel `/admin`.
- [`docs/CONTENIDO.md`](CONTENIDO.md) — contenido original del sitio viejo
  (fuente de textos e inventario de imágenes).
- [`AGENTS.md`](../AGENTS.md) — contexto de marca, datos de contacto oficiales
  y flujo de trabajo con Claude.
