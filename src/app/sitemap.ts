import type { MetadataRoute } from "next";
import { services } from "@/data/services";

const baseUrl = "https://www.gpiprofesionales.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/nosotros`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/servicios`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/proyectos`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contacto`, lastModified, changeFrequency: "yearly", priority: 0.7 },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${baseUrl}/servicios/${service.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...serviceRoutes];
}
