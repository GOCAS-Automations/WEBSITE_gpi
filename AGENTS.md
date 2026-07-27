<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# website_GPI — Sitio web de GPI (gpiprofesionales.com)

Sitio corporativo de **GPI — Optimización de Procesos Industriales y Ambientales** (Cali, Colombia).
Migración/rediseño del sitio viejo en GoDaddy → Next.js hosteado en Vercel (cuenta GOCAS Automations).
Repo remoto: https://github.com/GOCAS-Automations/website_GPI.git

## Stack
- Next.js 16 (App Router, `src/`), TypeScript, Tailwind CSS v4.
- Deploy: Vercel (gratis). Dominio `gpiprofesionales.com` permanece en GoDaddy (se apuntará por DNS cuando GPI apruebe).
- Contenido editable centralizado en `src/data/` (services, projects, clients, contact, faq) — pensado para migrar a Supabase cuando se construya el panel admin (Fase 2).

## Comandos
- `npm run dev` — desarrollo
- `npm run build` — build de producción (verificar SIEMPRE antes de commit)
- `npm run lint`

## Estructura del sitio
- `/` inicio (hero, valores corporativos, servicios, clientes, CTA)
- `/nosotros`
- `/servicios` (hub: Industriales + Ambientales) y `/servicios/[slug]` — 11 servicios definidos en `src/data/services.ts`
- `/proyectos`
- `/contacto` (datos + mapa Google Maps embebido + formulario → WhatsApp)
- SEO: `sitemap.ts`, `robots.ts`, metadata por página, JSON-LD LocalBusiness, OpenGraph.

## Marca
- Logo: engranaje gris + hoja verde (`public/images/logo.png`). Verde ≈ `#3dae2b` / verde claro `#8cc63f`, gris ≈ `#6d6e71`.
- Tagline: "Optimización de Procesos Industriales y Ambientales".
- Tono: profesional, industrial, moderno; español colombiano, con tildes correctas.

## Datos de contacto OFICIALES (2026 — no usar los del sitio viejo)
- Dirección: Cl. 33 #5-76, Comuna 4, Cali, Valle del Cauca
- Teléfonos/WhatsApp: 318 434 1249 · 311 649 9038 (+57)
- Correos: xperea@gpiprofesionales.com · ycamacho@gpiprofesionales.com (NUNCA @gpiingenieros.com — dominio viejo)
- Redes: facebook.com/gpiprofesionales · instagram.com/gpiprofesionales

## Roadmap
- Fase 1 (actual): sitio migrado y mejorado + SEO. Luego: panel admin (login) para editar logos de clientes, textos e imágenes principales y datos de contacto.
- Fase 2 (tras aprobación de cotización): sistema de registro/aprobación de horas extra para empleados con Supabase (auth + DB gratis) — sección interna con credenciales por empleado y dashboard para administradores.

## Referencia
- Contenido original extraído del sitio viejo: `docs/CONTENIDO.md` (fuente de verdad de textos e inventario de imágenes).
- El sitio viejo tenía: link roto a "Recursos Hídricos" (404), lorem ipsum en FAQ de Nosotros, title "GPI" sin metadata — todo eso ya se corrige aquí.

## Backend / Supabase
- El contenido vive en Supabase (tablas `site_services`, `site_projects`, `site_clients`, `site_faqs`, `site_values`, `site_settings`) y se consume desde `src/lib/content.ts`, que **cae en `src/data/*` si no hay env vars o si la consulta falla** — el sitio nunca depende de la BD.
- Credenciales y roles en `profiles` (`admin` | `employee`, trigger desde `auth.users`); RLS: SELECT público, escritura solo `is_admin()`. Imágenes en el bucket público `site-images`.
- `/mi-cuenta` = login con marca GPI; `/admin` = panel CRUD (servicios, proyectos, clientes, FAQ, valores, contacto/ajustes) con server actions que validan rol y llaman `revalidatePath("/", "layout")`.
- Migración lista para pegar en el SQL Editor: `supabase/migrations/0001_site_content.sql`. Guía completa (env vars, credenciales, fallback): `docs/ADMIN.md`.
- Env vars en `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`); la sesión se refresca en `src/proxy.ts` (el `middleware` de Next 16).

## Flujo de trabajo con Claude
- **Fable solo analiza, planea y orquesta** (recon ligero, verificación de builds, git, memoria/docs). **La ejecución de código la hacen agentes**: Opus para tareas complejas (features, backend) y Sonnet para tareas rápidas (fixes visuales, documentos). Ediciones triviales de una línea no ameritan agente.
- El diseño es prioridad del cliente: el sitio debe verse claramente más profesional y moderno que el anterior — cuidar estética en cada cambio.
