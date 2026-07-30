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

  // Imágenes propias, data:/blob: (previsualización de subidas en /admin) y el
  // bucket público `site-images` de Supabase.
  `img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in`,

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

const nextConfig: NextConfig = {
  // No anunciar la versión del framework.
  poweredByHeader: false,

  images: {
    // Imágenes subidas desde /admin al bucket público `site-images`.
    // El hostname del proyecto Supabase es <ref>.supabase.co.
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
    ],
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
