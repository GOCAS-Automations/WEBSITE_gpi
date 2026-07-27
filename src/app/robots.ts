import type { MetadataRoute } from "next";

const baseUrl = "https://www.gpiprofesionales.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Portal privado: no debe indexarse.
      disallow: ["/admin", "/admin/", "/mi-cuenta"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
