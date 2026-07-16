# Sitio web de GPI

Sitio web corporativo de **GPI — Optimización de Procesos Industriales y Ambientales**
(Cali, Colombia). Rediseño y migración del sitio anterior a una aplicación moderna,
rápida y optimizada para SEO, lista para producción en Vercel.

Dominio: [gpiprofesionales.com](https://www.gpiprofesionales.com)

## Stack

- **Next.js 16** (App Router, carpeta `src/`)
- **TypeScript**
- **Tailwind CSS v4** (tokens de marca con `@theme` en `globals.css`)
- **next/font** (Inter + Manrope, autoalojadas)
- **next/image** para optimización de imágenes
- Iconos SVG propios en línea (sin dependencias externas)
- Cero dependencias de UI adicionales

## Comandos

```bash
npm run dev     # Entorno de desarrollo (http://localhost:3000)
npm run build   # Compilación de producción
npm start       # Servir la compilación de producción
npm run lint    # Análisis con ESLint
```

## Estructura

```
src/
├── app/                     # Rutas (App Router)
│   ├── layout.tsx           # Layout raíz: fuentes, metadata, JSON-LD, header/footer
│   ├── page.tsx             # Inicio
│   ├── nosotros/            # Quiénes somos, valores, video y FAQ
│   ├── servicios/           # Hub de servicios
│   │   └── [slug]/          # Página por servicio (11 servicios)
│   ├── proyectos/           # Proyectos realizados
│   ├── contacto/            # Datos, mapa y formulario → WhatsApp
│   ├── sitemap.ts           # Sitemap dinámico
│   ├── robots.ts            # robots.txt
│   └── icon.png             # Favicon
├── components/
│   ├── layout/              # Header, Footer, botón flotante de WhatsApp
│   ├── sections/            # Bloques reutilizables (hero, tarjetas, FAQ, formulario…)
│   └── ui/                  # Primitivas (Container, Button, SectionHeading, Reveal)
├── data/                    # Contenido editable centralizado (fuente de verdad)
│   ├── services.ts          # 11 servicios + 2 categorías
│   ├── projects.ts          # Proyectos
│   ├── clients.ts           # Logos de clientes
│   ├── contact.ts           # Datos de contacto oficiales
│   ├── faq.ts               # Preguntas frecuentes
│   └── values.ts            # Valores corporativos
└── lib/
    └── icons.tsx            # Set de iconos SVG en línea
```

## Contenido editable

Todo el contenido textual y de datos vive en `src/data/`. Las páginas y componentes
solo consumen de ahí, lo que facilita su edición y prepara el terreno para el panel
de administración con Supabase (Fase 2).

## SEO

- `metadataBase`, títulos con plantilla `%s | GPI` y descripción única por página.
- OpenGraph y Twitter Card.
- JSON-LD: `Organization` + `LocalBusiness` (layout) y `FAQPage` (Nosotros).
- `sitemap.xml` y `robots.txt` generados dinámicamente.
- HTML semántico, `lang="es"` y texto alternativo en todas las imágenes.

## Despliegue

Optimizado para [Vercel](https://vercel.com). El dominio se apuntará por DNS cuando
GPI apruebe la publicación.

---

Desarrollado por **GOCAS Automations**.
