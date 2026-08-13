import { getContentCounts } from "@/lib/admin";
import { requireContentEditor } from "@/lib/supabase/auth";
import {
  AdminPageHeader,
  AyudaSeccion,
  SeccionCard,
} from "@/components/admin/ui";
import {
  Cog,
  Photo,
  Handshake,
  Home,
  Info,
  Layers,
  Shield,
  Users,
} from "@/lib/icons";

/**
 * CONTENIDO DEL SITIO — índice
 * ============================
 * El menú lateral tenía doce entradas y ocho eran contenido: se leía como un
 * inventario. Esta pantalla las recoge todas bajo una sola entrada del menú y
 * las presenta como lo que son —las páginas del sitio, en el orden en que un
 * visitante las recorre—, con una frase que dice qué se administra en cada una.
 *
 * **Ninguna URL cambió**: `/admin/servicios` sigue siendo `/admin/servicios`.
 * Lo único que se reorganizó es el menú.
 */
export default async function AdminContenidoPage() {
  await requireContentEditor();
  const counts = await getContentCounts();

  const secciones = [
    {
      href: "/admin/inicio",
      label: "Página de inicio",
      icon: Home,
      description:
        "La portada: primera pantalla, «Quiénes somos» con las cifras, los títulos de servicios, valores y clientes, la banda oscura y el cierre.",
    },
    {
      href: "/admin/nosotros",
      label: "Página Nosotros",
      icon: Users,
      description:
        "La historia de GPI: presentación, misión y visión, galería de aliados, línea de tiempo, video y textos de cierre.",
    },
    {
      href: "/admin/paginas",
      label: "Títulos de páginas",
      icon: Layers,
      description:
        "La primera pantalla de Servicios, Proyectos y Contacto (título, texto y foto de fondo) y el párrafo de presentación del pie de página.",
    },
    {
      href: "/admin/servicios",
      label: "Servicios",
      icon: Cog,
      count: counts.services,
      unit: "servicios",
      description:
        "Los servicios que ofrece GPI: textos, imágenes, video, lista de alcances y el orden en que aparecen en el menú y en la página Servicios.",
    },
    {
      href: "/admin/proyectos",
      label: "Proyectos",
      icon: Photo,
      count: counts.projects,
      unit: "proyectos",
      description:
        "Los trabajos ya realizados, cada uno con su foto, su galería y su propia página.",
    },
    {
      href: "/admin/clientes",
      label: "Clientes",
      icon: Handshake,
      count: counts.clients,
      unit: "logos",
      description:
        "Los logos de clientes del «Portafolio de clientes» de la página de inicio, con el enlace opcional a su sitio web.",
    },
    {
      href: "/admin/faq",
      label: "Preguntas frecuentes",
      icon: Info,
      count: counts.faqs,
      unit: "preguntas",
      description:
        "Las preguntas y respuestas que el visitante despliega al final de la página Nosotros.",
    },
    {
      href: "/admin/valores",
      label: "Valores corporativos",
      icon: Shield,
      count: counts.values,
      unit: "valores",
      description:
        "Los principios de la empresa, con su icono, que se muestran en el inicio y en la página Nosotros.",
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Contenido del sitio"
        description="Todo lo que se ve en gpiprofesionales.com, página por página. Elige qué quieres editar."
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio" },
        ]}
      />

      <AyudaSeccion title="Cómo está organizado" className="mb-6">
        Cada tarjeta abre una pantalla con los textos y las imágenes de esa
        parte del sitio. Las de arriba son <strong>páginas completas</strong>;
        las de abajo, <strong>listas</strong> (servicios, proyectos, logos,
        preguntas y valores) donde se añaden y se ordenan elementos. Dentro de
        cada pantalla, recuerda que <strong>cada bloque se guarda con su propio
        botón</strong>.
      </AyudaSeccion>

      <div className="grid gap-4 sm:grid-cols-2">
        {secciones.map((seccion) => (
          <SeccionCard key={seccion.href} {...seccion} />
        ))}
      </div>
    </>
  );
}
