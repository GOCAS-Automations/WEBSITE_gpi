import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * ============================================================
 *  POLÍTICAS DE SEGURIDAD (cabeceras HTTP)
 * ============================================================
 *
 * Se aplican a TODAS las rutas desde `headers()`. Vercel ya emite y renueva el
 * certificado TLS; `Strict-Transport-Security` es lo que obliga al navegador a
 * no volver a hablar en HTTP con el dominio.
 *
 * ── Sobre la Content-Security-Policy ────────────────────────
 * Esta CSP es **estricta en todo menos en `script-src`**, que necesita
 * `'unsafe-inline'`. El motivo es arquitectónico, no un descuido:
 *
 *   · La alternativa recomendada (nonce + `'strict-dynamic'` generado en
 *     `src/proxy.ts`) **obliga a renderizado dinámico en todas las páginas**:
 *     el nonce se inyecta durante el SSR de cada petición, así que ISR y el
 *     prerenderizado estático quedan deshabilitados (documentado en
 *     `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`).
 *   · Este sitio es deliberadamente estático + ISR (`revalidate = 300` en las
 *     páginas públicas) y se sirve desde el CDN de Vercel. Pasar todo a
 *     dinámico degradaría LCP/TTFB y el coste de hosting a cambio de un
 *     endurecimiento que aquí aporta poco: el sitio público **no inyecta HTML
 *     de terceros ni contenido de usuarios**, que es el vector que un CSP
 *     estricto de scripts mitiga.
 *
 * Lo que SÍ queda cerrado, y es lo que de verdad contiene el daño:
 *   `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`,
 *   `form-action 'self'`, `frame-ancestors 'self'` (anti-clickjacking),
 *   y listas blancas explícitas de `frame-src`, `img-src` y `connect-src`.
 *
 * Si en el futuro se añade un endpoint dinámico donde importe el XSS, la vía
 * de endurecimiento es aplicar nonce SOLO a `/admin` y `/mi-cuenta` (ya son
 * `force-dynamic`) desde `src/proxy.ts`, dejando el sitio público estático.
 */

/** Orígenes de Supabase (contenido, sesión y bucket de imágenes). */
const SUPABASE_ORIGINS = [
  "https://*.supabase.co",
  "https://*.supabase.in",
  "wss://*.supabase.co",
  "wss://*.supabase.in",
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",

  // Next.js emite scripts de arranque en línea (flight data, hidratación).
  // Ver la nota de arriba: `'unsafe-eval'` solo en desarrollo (React lo usa
  // para reconstruir stacks de error); en producción no se permite.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `script-src-elem 'self' 'unsafe-inline'`,

  // React escribe atributos `style` en línea (Recharts los usa intensamente).
  "style-src 'self' 'unsafe-inline'",
  "style-src-attr 'unsafe-inline'",

  // Imágenes propias, data:/blob: (previsualización de subidas en /admin), el
  // bucket público `site-images` de Supabase y Cloudinary, que es el servicio
  // que se le recomienda a GPI para alojar imágenes por su cuenta (ver
  // `docs/ADMIN.md`). Una URL de otro servidor no rompe nada —se pinta sin
  // optimizar, ver `src/lib/imagenes.ts`— pero el navegador la bloqueará aquí:
  // por eso el panel recomienda subir el archivo o usar Cloudinary.
  `img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://res.cloudinary.com`,

  // next/font autoaloja las tipografías en /_next/static/media.
  "font-src 'self' data:",

  // Sesión, contenido y subida de imágenes a Supabase (incl. Realtime por wss).
  `connect-src 'self' ${SUPABASE_ORIGINS}${isDev ? " ws://localhost:* http://localhost:*" : ""}`,

  // Solo los dos embeds que el sitio usa de verdad: mapa de Google (la URL es
  // editable desde /admin/ajustes) y el facade de YouTube sin cookies.
  "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube-nocookie.com https://www.youtube.com",

  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",

  // Nadie puede meter este sitio en un iframe ajeno (anti-clickjacking).
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",

  // Fuerza a https cualquier subrecurso que se colara por http. Solo en
  // producción: sobre `http://localhost` esta directiva reescribe TODOS los
  // assets a https y en WebKit/Safari (que, al contrario que Chromium, no exime
  // a localhost) el sitio se queda sin CSS, sin fuentes y sin imágenes con
  // "SSL connect error". En producción todo va ya por https, así que quitarla
  // en desarrollo no cambia nada de lo que ve el usuario final.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  {
    // HSTS: 2 años para ESTE host. Deliberadamente SIN `includeSubDomains` ni
    // `preload`: los subdominios de gpiprofesionales.com (mail., webmail.,
    // cpanel.) viven en el cPanel de GoDaddy y sirven el CORREO de GPI —
    // comprometerlos a HTTPS desde aquí podría dejar el webmail inaccesible.
    // Endurecer a `includeSubDomains; preload` solo cuando se confirme que
    // todos los subdominios sirven HTTPS válido (ver hstspreload.org).
    key: "Strict-Transport-Security",
    value: "max-age=63072000",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    // Respaldo para navegadores sin `frame-ancestors`.
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // El sitio no necesita ninguna de estas capacidades del dispositivo.
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "midi=()",
      "magnetometer=()",
      "browsing-topics=()",
    ].join(", "),
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

/**
 * REDIRECCIONES DEL SITIO VIEJO (16 sep 2026)
 * ===========================================
 * El sitio anterior (GoDaddy) vivió años en este mismo dominio con páginas
 * `.html` planas, así que Google todavía tiene esas direcciones indexadas y
 * hay gente que llega a ellas desde los resultados de búsqueda. Sin estas
 * reglas caen en el 404 del sitio nuevo y, de paso, se pierde el
 * posicionamiento acumulado de cada URL.
 *
 * Se redirige con `permanent: true` (**308**, el equivalente moderno del 301):
 * le dice a Google que reemplace definitivamente la dirección vieja por la
 * nueva en su índice, en vez de tratarla como un desvío temporal.
 *
 * El mapeo sale de los enlaces reales del sitio viejo, no de suposiciones:
 * `industrial.html` y `ambiental.html` eran las portadas de cada categoría
 * (van al hub `/servicios`) y el resto eran páginas de un servicio concreto.
 * `hidricos.html` ya estaba roto allá (era el enlace 404 del sitio viejo) y se
 * incluye igual, porque pudo quedar indexado.
 */
const REDIRECCIONES_SITIO_VIEJO: Array<[string, string]> = [
  ["/index.html", "/"],
  ["/nosotros.html", "/nosotros"],
  ["/proyectos.html", "/proyectos"],
  ["/contacto.html", "/contacto"],

  // Portadas de categoría → hub de servicios.
  ["/industrial.html", "/servicios"],
  ["/ambiental.html", "/servicios"],

  // Una página por servicio.
  ["/automatizacion.html", "/servicios/automatizacion-y-control"],
  ["/electricos.html", "/servicios/sistemas-electricos"],
  ["/seguridad.html", "/servicios/seguridad-de-maquinaria"],
  ["/energetico.html", "/servicios/analisis-energetico"],
  ["/medicion.html", "/servicios/medicion-de-variables"],
  ["/legal.html", "/servicios/cumplimiento-legal-ambiental"],
  ["/urbanistica.html", "/servicios/gestion-urbanistica"],
  ["/hidricos.html", "/servicios/recurso-hidrico"],
  ["/iso.html", "/servicios/iso-14001"],
];

const nextConfig: NextConfig = {
  // No anunciar la versión del framework.
  poweredByHeader: false,

  // `nodemailer` (envío del formulario de contacto por SMTP) es una librería
  // puramente de Node: abre sockets TLS y carga módulos con `require`
  // dinámico. Empaquetarla con el resto del código de servidor la rompe, así
  // que se deja fuera del bundle y se carga con el `require` nativo.
  // `@react-pdf/renderer` genera el volante de nómina en PDF. Como nodemailer,
  // es una librería de Node (fuentes, streams, `require` dinámico) que hay que
  // dejar fuera del bundle para que funcione en la función de servidor.
  serverExternalPackages: ["nodemailer", "@react-pdf/renderer"],

  /**
   * El volante de nómina lee el logo de `public/images/logo-volante.png` con
   * `fs` en tiempo de ejecución (`src/lib/volante.tsx`). El trazado automático
   * de Next no puede adivinar esa ruta, así que se declara: sin esto el archivo
   * no viaja con la función en Vercel y el PDF saldría sin logo.
   */
  outputFileTracingIncludes: {
    "/admin/nomina/volante/[id]/pdf": ["./public/images/logo-volante.png"],
    "/mi-cuenta/volante/[id]/pdf": ["./public/images/logo-volante.png"],
  },

  images: {
    /**
     * OPTIMIZADOR DE IMÁGENES: APAGADO GLOBALMENTE (14 sep 2026)
     * ==========================================================
     * El proyecto vive en el plan Hobby de Vercel (sin costo mensual para
     * GPI) y la cuenta agotó su cupo de transformaciones de imagen: con el
     * optimizador encendido, `/_next/image` respondería errores al exceder
     * el cupo y las fotos del sitio se verían rotas. Con `unoptimized` las
     * imágenes se sirven TAL CUAL desde su origen (el bucket de Supabase o
     * Cloudinary, que ya entregan archivos de peso razonable): no hay cupo
     * que agotar y las fotos no se rompen nunca.
     *
     * Trade-off asumido: se pierden el WebP/AVIF y el redimensionado
     * automáticos (páginas algo más pesadas, sobre todo en móvil). Si el
     * rendimiento volviera a ser prioridad, las salidas son el plan Pro o
     * servir las fotos grandes desde Cloudinary con transformaciones en la
     * propia URL (`f_auto,q_auto,w_…`), que optimiza gratis en su CDN.
     */
    unoptimized: true,

    /**
     * HOSTS DE IMAGEN PERMITIDOS (hoy sin efecto: optimizador apagado)
     * ================================================================
     * Se conserva tal cual por si el optimizador se reactiva algún día.
     * Esta lista es la que decide qué imágenes pasan por el optimizador de
     * Next (`/_next/image`). Tiene que ir SINCRONIZADA con
     * `HOSTS_IMAGEN_OPTIMIZABLES` de `src/lib/imagenes.ts`, que es lo que
     * `ContentImage` consulta para no mandar al optimizador una URL que
     * rechazaría: en desarrollo el rechazo es una excepción que tumba la
     * página y en producción un 400 que deja la foto rota.
     *
     *   · Supabase: el bucket público `site-images`, donde vive TODA la
     *     imagen de contenido (`<ref>.supabase.co`).
     *   · Cloudinary: el servicio que se le recomienda a GPI para publicar
     *     imágenes desde su propia cuenta y pegar aquí el enlace.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  async redirects() {
    return REDIRECCIONES_SITIO_VIEJO.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },

  async headers() {
    return [
      {
        // Todas las rutas, incluidos los assets estáticos y las imágenes
        // optimizadas (`headers()` se evalúa antes del sistema de archivos).
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
