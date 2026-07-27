# Sitio web de GPI

Sitio web corporativo de **Grupo de Profesionales en Ingeniería GPI S.A.S** (Cali,
Colombia), operando bajo la marca **GPI — Optimización de Procesos Industriales y
Ambientales**. Incluye el sitio público (11 servicios, proyectos, nosotros,
contacto), SEO completo y un panel de administración (`/mi-cuenta` + `/admin`)
para editar el contenido sin tocar código.

Dominio: [gpiprofesionales.com](https://www.gpiprofesionales.com)

## Stack

- **Next.js 16** (App Router, carpeta `src/`) — ver notas de compatibilidad en
  `AGENTS.md` antes de usar APIs de Next que no reconozcas.
- **TypeScript**
- **Tailwind CSS v4** (tokens de marca con `@theme` en `globals.css`)
- **Supabase** (Postgres + Auth + Storage) para el contenido editable y el login
  del panel — **con fallback estático**: si no hay variables de entorno o falla
  la consulta, el sitio sirve el contenido de `src/data/*` y sigue 100%
  funcional. Ver `src/lib/content.ts`.
- `next/font` (Inter + Manrope, autoalojadas) y `next/image` para optimización.
- Iconos SVG propios en línea, sin dependencias de UI externas.

## Comandos

```bash
npm run dev     # Entorno de desarrollo (http://localhost:3000)
npm run build   # Compilación de producción — verificar SIEMPRE antes de commit
npm start       # Servir la compilación de producción
npm run lint    # Análisis con ESLint
```

## Variables de entorno

El sitio **funciona sin configurarlas** (usa el contenido estático de
`src/data/`). Para conectar Supabase y habilitar `/mi-cuenta` y `/admin`:

```bash
cp .env.example .env.local
```

y completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Guía
completa (dónde encontrarlas, migración SQL, credenciales, despliegue en
Vercel): **[`docs/ADMIN.md`](docs/ADMIN.md)**.

## Estructura de carpetas

```
src/
├── app/                        # Rutas (App Router)
│   ├── layout.tsx              # Layout raíz: fuentes, metadata, JSON-LD, header/footer
│   ├── page.tsx                # Inicio
│   ├── nosotros/                Quiénes somos, valores, video y FAQ
│   ├── servicios/                Hub de servicios
│   │   └── [slug]/               Página por servicio (dinámico vía getServices())
│   ├── proyectos/                Proyectos realizados
│   ├── contacto/                 Datos, mapa y formulario → WhatsApp
│   ├── mi-cuenta/                Login del panel (marca GPI)
│   ├── admin/                    Panel CRUD: servicios, proyectos, clientes, FAQ, valores, ajustes
│   ├── sitemap.ts / robots.ts    SEO
│   └── icon.png                  Favicon
├── components/
│   ├── layout/                 Header, Footer, botón flotante de WhatsApp
│   ├── sections/                Bloques reutilizables (hero, tarjetas, breadcrumbs, CTA, FAQ…)
│   ├── ui/                      Primitivas (Container, Button, Breadcrumbs, SectionHeading, Reveal)
│   └── admin/                   Componentes del panel (formularios, campos de imagen, listas)
├── data/                       # Contenido estático — fuente de verdad y fallback
│   ├── services.ts              11 servicios + 2 categorías
│   ├── projects.ts / clients.ts / faq.ts / values.ts / site.ts / contact.ts
├── lib/
│   ├── content.ts               Capa de contenido: Supabase con fallback a src/data/*
│   ├── admin.ts / admin-types.ts  Lecturas y tipos del panel admin
│   ├── icons.tsx                 Set de iconos SVG en línea
│   └── supabase/                 Clientes de Supabase (server, browser, auth, config)
└── proxy.ts                    Middleware de Next 16: refresca sesión de Supabase

docs/
├── ADMIN.md        Guía del backend/Supabase y del panel de administración
├── PLAN.md          Plan de fases y estado del proyecto (arranque de contexto)
└── CONTENIDO.md     Contenido original del sitio viejo (fuente de textos e imágenes)
```

## Contenido editable

Todo el contenido pasa por `src/lib/content.ts`: si Supabase está configurado,
lee de las tablas `site_*`; si no, cae en `src/data/*`. Las páginas públicas
nunca dependen de que la base de datos esté disponible. Detalle de qué se
puede editar desde `/admin`: **[`docs/ADMIN.md`](docs/ADMIN.md)**.

## SEO

- `metadataBase`, títulos con plantilla `%s | GPI` y descripción única por página.
- OpenGraph y Twitter Card.
- JSON-LD: `Organization` + `LocalBusiness` (layout) y `FAQPage` (Nosotros).
- `sitemap.xml` y `robots.txt` generados dinámicamente (excluyen `/mi-cuenta` y `/admin`).
- HTML semántico, `lang="es"`, breadcrumbs y texto alternativo en todas las imágenes.

## Despliegue

Optimizado para [Vercel](https://vercel.com). El dominio
`gpiprofesionales.com` permanece en GoDaddy hasta que GPI apruebe el cambio de
DNS. Ver el estado y los próximos pasos en **[`docs/PLAN.md`](docs/PLAN.md)**.

## Documentación

| Documento | Contenido |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Contexto del proyecto, marca, datos de contacto oficiales y flujo de trabajo con Claude |
| [`docs/PLAN.md`](docs/PLAN.md) | Fases del proyecto, estado actual y pendientes |
| [`docs/ADMIN.md`](docs/ADMIN.md) | Backend/Supabase: migración, variables de entorno, panel `/admin` |
| [`docs/CONTENIDO.md`](docs/CONTENIDO.md) | Contenido e inventario de imágenes del sitio original |

---

Desarrollado por **GOCAS Automations**.
