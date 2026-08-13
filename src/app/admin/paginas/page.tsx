import { getAdminSettings } from "@/lib/admin";
import {
  AdminPageHeader,
  AvisoGuardar,
  AyudaSeccion,
  AYUDA_ALT,
  Card,
  CardTitle,
  Field,
  TextArea,
} from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/AdminForm";
import { ImageField } from "@/components/admin/ImageField";
import type { PaginaHero } from "@/data/site";
import type { ActionState } from "@/lib/admin-types";
import {
  savePaginaContacto,
  savePaginaFooter,
  savePaginaProyectos,
  savePaginaServicios,
} from "../actions";

/**
 * CABECERAS DE PÁGINAS Y PIE DEL SITIO
 * ====================================
 * Las cabeceras de **Servicios**, **Proyectos** y **Contacto** —la banda oscura
 * con la foto de fondo, el título grande y el párrafo— estaban escritas en el
 * código de cada página. GPI pidió poder editar «todos esos títulos e
 * información visual relevante», así que pasaron a `site_settings.paginas`
 * (migración 0008), junto con el párrafo de presentación del pie.
 *
 * La pantalla se llamaba «Títulos de páginas» y el nombre se quedaba corto: aquí
 * también se cambian las descripciones, las fotos de fondo y el texto del pie.
 * **La URL no cambió** (`/admin/paginas`): renombrar una pantalla no es mover
 * una ruta, y los enlaces que GPI tenga guardados siguen funcionando.
 *
 * El inicio y Nosotros NO están aquí: son páginas enteras y tienen su propia
 * pantalla, con muchos más bloques.
 */
export default async function AdminPaginasPage() {
  const { paginas } = await getAdminSettings();

  return (
    <>
      <AdminPageHeader
        title="Cabeceras de páginas y pie del sitio"
        description="Los textos e imágenes de cabecera de Servicios, Proyectos y Contacto, y la descripción del pie de página."
        backHref="/admin/contenido"
        backLabel="Volver a Contenido del sitio"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio", href: "/admin/contenido" },
          { label: "Cabeceras de páginas y pie del sitio" },
        ]}
      />

      <AvisoGuardar />

      <AyudaSeccion title="Qué se edita aquí" className="mb-6">
        La <strong>primera pantalla</strong> es la banda oscura con foto de
        fondo que abre cada página: es lo primero que ve el visitante y lo que
        Google enseña como titular. El <strong>inicio</strong> y{" "}
        <strong>Nosotros</strong> no están en esta lista porque tienen su propia
        pantalla, con todos sus bloques.
      </AyudaSeccion>

      <div className="space-y-6">
        <CabeceraDePagina
          scope="servicios"
          title="Página Servicios"
          description="Abre la lista de servicios industriales y ambientales (gpiprofesionales.com/servicios)."
          submitLabel="Guardar cabecera de Servicios"
          action={savePaginaServicios}
          valores={paginas.servicios}
        />

        <CabeceraDePagina
          scope="proyectos"
          title="Página Proyectos"
          description="Abre el portafolio de trabajos realizados (gpiprofesionales.com/proyectos)."
          submitLabel="Guardar cabecera de Proyectos"
          action={savePaginaProyectos}
          valores={paginas.proyectos}
        />

        <CabeceraDePagina
          scope="contacto"
          title="Página Contacto"
          description="Abre la página con los datos de GPI, el mapa y el formulario (gpiprofesionales.com/contacto)."
          submitLabel="Guardar cabecera de Contacto"
          action={savePaginaContacto}
          valores={paginas.contacto}
        />

        {/* ---------------- Pie de página ---------------- */}
        <Card>
          <CardTitle
            title="Pie de página"
            description="El párrafo que acompaña al logo abajo del todo, en TODAS las páginas del sitio."
          />
          <AdminForm action={savePaginaFooter} submitLabel="Guardar pie de página">
            <TextArea
              scope="footer"
              label="Texto de presentación"
              name="descripcion"
              rows={4}
              defaultValue={paginas.footer.descripcion}
              hint="Dos o tres frases sobre GPI. Los datos de contacto, las redes y los enlaces del pie salen de «Ajustes» y de las demás secciones: aquí solo va este párrafo."
            />
          </AdminForm>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Las tres cabeceras tienen exactamente los mismos campos, así que comparten
 * componente: si mañana se añade uno, aparece en las tres a la vez y no en dos
 * de tres.
 *
 * `scope` evita `id` duplicados en el documento: los `name` sí pueden repetirse
 * entre formularios distintos, pero los `id` no, y sin esto la etiqueta
 * «Título» apuntaría siempre al primer campo para quien navega con lector de
 * pantalla.
 */
function CabeceraDePagina({
  scope,
  title,
  description,
  submitLabel,
  action,
  valores,
}: {
  scope: string;
  title: string;
  description: string;
  submitLabel: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  valores: PaginaHero;
}) {
  return (
    <Card>
      <CardTitle title={title} description={description} />
      <AdminForm action={action} submitLabel={submitLabel}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            scope={scope}
            label="Texto superior"
            name="eyebrow"
            defaultValue={valores.eyebrow}
            hint="El rótulo pequeño en verde claro que va encima del título."
          />
          <Field
            scope={scope}
            label="Título"
            name="titulo"
            required
            defaultValue={valores.titulo}
            hint="El titular grande de la página. Es también lo que Google destaca."
          />
        </div>
        <TextArea
          scope={scope}
          label="Descripción"
          name="descripcion"
          rows={3}
          defaultValue={valores.descripcion}
          hint="Una o dos frases debajo del título."
        />
        <ImageField
          label="Imagen de fondo"
          name="imagen_url"
          folder="paginas"
          required
          defaultValue={valores.imagen.url}
          hint="Se ve oscurecida detrás del título: conviene una foto horizontal, de buena calidad y sin texto encima."
        />
        <Field
          scope={scope}
          label="Texto alternativo de la imagen"
          name="imagen_alt"
          defaultValue={valores.imagen.alt}
          hint={AYUDA_ALT}
        />
      </AdminForm>
    </Card>
  );
}
