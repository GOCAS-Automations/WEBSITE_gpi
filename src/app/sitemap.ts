import type { MetadataRoute } from "next";
import { getServices } from "@/lib/content";

const baseUrl = "https://www.gpiprofesionales.com";

/**
 * `lastModified` diferenciado por página, no un `new Date()` para todas.
 *
 * Antes el sitemap declaraba «todo cambió hoy» en cada despliegue, y una señal
 * que siempre dice lo mismo es una señal que Google acaba ignorando. Ahora:
 *
 *   · `BUILD_DATE` (fecha del despliegue) para lo que se edita de verdad desde
 *     /admin: inicio, hub de servicios, proyectos y cada servicio.
 *   · `CONTENT_DATE` (fija) para las páginas institucionales, que cambian
 *     cuando alguien las reescribe, no cuando se despliega el sitio.
 *
 * `changeFrequency` y `priority` acompañan la misma lógica.
 */
const BUILD_DATE = new Date();

/** Última reescritura de las páginas institucionales. Actualizar a mano. */
const CONTENT_DATE = new Date("2026-07-29T00:00:00Z");

// /mi-cuenta y /admin quedan fuera del sitemap a propósito (portal privado).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await getServices();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: BUILD_DATE,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/servicios`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/nosotros`,
      lastModified: CONTENT_DATE,
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/proyectos`,
      lastModified: BUILD_DATE,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: CONTENT_DATE,
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${baseUrl}/servicios/${service.slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...serviceRoutes];
}
