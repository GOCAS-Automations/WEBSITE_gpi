import {
  Field,
  Select,
  Switch,
  TextArea,
  Card,
  CardTitle,
} from "@/components/admin/ui";
import { ImageField } from "@/components/admin/ImageField";
import { ListField, GalleryField } from "@/components/admin/ListField";
import { iconMap } from "@/lib/icons";
import type { ServiceRecord } from "@/lib/admin";

const iconOptions = Object.keys(iconMap).map((key) => ({
  value: key,
  label: key,
}));

const categoryOptions = [
  { value: "industrial", label: "Servicios Industriales" },
  { value: "ambiental", label: "Servicios Ambientales" },
];

/** Campos compartidos entre crear y editar un servicio. */
export function ServiceFormFields({ service }: { service?: ServiceRecord }) {
  return (
    <>
      {service && <input type="hidden" name="id" value={service.id} />}

      <Card>
        <CardTitle
          title="Información principal"
          description="Estos textos aparecen en la tarjeta del servicio y en su página de detalle."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Título"
            name="title"
            required
            defaultValue={service?.title}
            placeholder="Automatización y Control"
          />
          <Field
            label="Título corto (menú)"
            name="nav_title"
            defaultValue={service?.nav_title}
            placeholder="Automatización"
            hint="Se usa en el menú y el pie de página. Si lo dejas vacío se usa el título."
          />
          <Field
            label="Slug (URL)"
            name="slug"
            defaultValue={service?.slug}
            placeholder="automatizacion-y-control"
            hint="Se genera desde el título si lo dejas vacío. Cambiarlo cambia la URL pública."
          />
          <Select
            label="Categoría"
            name="category"
            defaultValue={service?.category ?? "industrial"}
            options={categoryOptions}
          />
          <Select
            label="Icono"
            name="icon_key"
            defaultValue={service?.icon_key ?? "cog"}
            options={iconOptions}
            hint="Icono de línea que acompaña al servicio."
          />
          <Field
            label="Orden"
            name="sort"
            type="number"
            defaultValue={service?.sort ?? 0}
            hint="Menor número = aparece antes."
          />
          <Switch
            label="Visibilidad en el sitio"
            name="published"
            defaultChecked={service?.published ?? true}
            hint="Si lo ocultas, el servicio deja de aparecer en el menú y en /servicios, pero no se borra."
          />
        </div>

        <div className="mt-4 space-y-4">
          <TextArea
            label="Resumen (tarjetas)"
            name="summary"
            rows={2}
            defaultValue={service?.summary}
            placeholder="Frase corta que resume el servicio."
          />
          <TextArea
            label="Descripción (página de detalle)"
            name="description"
            rows={4}
            defaultValue={service?.description}
            placeholder="Párrafo de introducción del servicio."
          />
        </div>
      </Card>

      <Card>
        <CardTitle
          title="¿Qué incluye este servicio?"
          description="Cada ítem se muestra como una tarjeta con check verde en la página del servicio."
        />
        <ListField
          label="Ítems"
          name="items"
          defaultValues={service?.items}
          placeholder="Describe una actividad o alcance del servicio."
        />
      </Card>

      <Card>
        <CardTitle
          title="Imágenes"
          description="Sube archivos al bucket de Supabase o pega una URL / ruta local."
        />
        <div className="space-y-4">
          <ImageField
            label="Imagen principal (portada)"
            name="cover"
            folder="servicios"
            defaultValue={service?.images.cover}
            hint="Se usa en la tarjeta y en la cabecera de la página del servicio."
          />
          <Field
            label="Texto alternativo de la portada"
            name="cover_alt"
            defaultValue={service?.images.coverAlt}
            placeholder="Describe la imagen para lectores de pantalla."
          />
          <GalleryField
            label="Galería (opcional)"
            defaultValues={service?.images.gallery}
            hint="Imágenes adicionales que se muestran al final de la página del servicio."
          />
        </div>
      </Card>

      <Card>
        <CardTitle
          title="SEO"
          description="Título y descripción que ven Google y las redes sociales."
        />
        <div className="space-y-4">
          <Field
            label="Título SEO"
            name="meta_title"
            defaultValue={service?.meta_title}
            placeholder="Automatización y Control Industrial"
          />
          <TextArea
            label="Descripción SEO"
            name="meta_description"
            rows={3}
            defaultValue={service?.meta_description}
            placeholder="Resumen de 150-160 caracteres para los buscadores."
          />
        </div>
      </Card>
    </>
  );
}
