import Link from "next/link";
import { getContentCounts } from "@/lib/admin";
import { getSessionProfile } from "@/lib/supabase/auth";
import { Card } from "@/components/admin/ui";
import {
  Cog,
  Photo,
  Handshake,
  Info,
  Shield,
  Sliders,
  ArrowRight,
} from "@/lib/icons";

export default async function AdminDashboardPage() {
  const [counts, session] = await Promise.all([
    getContentCounts(),
    getSessionProfile(),
  ]);

  const sections = [
    {
      href: "/admin/servicios",
      label: "Servicios",
      icon: Cog,
      count: counts.services,
      unit: "servicios",
      description:
        "Título, resumen, descripción, ítems, imágenes, categoría y orden de cada servicio.",
    },
    {
      href: "/admin/proyectos",
      label: "Proyectos",
      icon: Photo,
      count: counts.projects,
      unit: "proyectos",
      description: "Proyectos realizados que se muestran en la página /proyectos.",
    },
    {
      href: "/admin/clientes",
      label: "Clientes",
      icon: Handshake,
      count: counts.clients,
      unit: "logos",
      description: "Logos de clientes de la portada y su enlace opcional.",
    },
    {
      href: "/admin/faq",
      label: "Preguntas frecuentes",
      icon: Info,
      count: counts.faqs,
      unit: "preguntas",
      description: "Preguntas y respuestas de la sección Nosotros.",
    },
    {
      href: "/admin/valores",
      label: "Valores corporativos",
      icon: Shield,
      count: counts.values,
      unit: "valores",
      description: "Los principios que se muestran en el inicio y en Nosotros.",
    },
    {
      href: "/admin/ajustes",
      label: "Contacto y ajustes",
      icon: Sliders,
      count: null,
      unit: "",
      description:
        "Datos de contacto, redes, mapa, textos del hero, banda de estadísticas y video de YouTube.",
    },
  ];

  return (
    <>
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
          Hola, {session?.profile.fullName || "administrador"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite">
          Desde aquí puedes editar todo el contenido público del sitio de GPI.
          Los cambios se publican al guardar.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group flex flex-col rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                {section.count !== null && (
                  <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-graphite">
                    {section.count} {section.unit}
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-base font-bold text-ink group-hover:text-brand-dark">
                {section.label}
              </h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-graphite">
                {section.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
                Administrar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <h2 className="text-base font-bold text-ink">¿Cómo funcionan las imágenes?</h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          En cada campo de imagen puedes <strong>subir un archivo</strong> (se
          guarda en el bucket <code className="rounded bg-mist px-1">site-images</code>{" "}
          de Supabase) o <strong>pegar una URL</strong>. Las rutas que empiezan por{" "}
          <code className="rounded bg-mist px-1">/images/</code> corresponden a las
          imágenes que ya vienen con el sitio.
        </p>
      </Card>
    </>
  );
}
