import {
  AYUDA_ALT,
  AYUDA_ORDEN,
  AYUDA_VIDEO_SERVICIO,
  AyudaSeccion,
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
          description="Estos textos aparecen en la tarjeta del servicio y en su página de detalle. Al guardar, el cambio se ve en el sitio en pocos minutos."
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
            hint={`${AYUDA_ORDEN} Es la posición en el menú y en la página Servicios.`}
          />
          <Switch
            label="Visibilidad en el sitio"
            name="published"
            defaultChecked={service?.published ?? true}
            hint="Oculto = el servicio desaparece del menú y de la página Servicios, pero no se borra: sigues editándolo aquí y puedes volver a mostrarlo."
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
          description="Cada ítem se muestra como una tarjeta con visto verde en la página del servicio."
        />
        <ListField
          label="Ítems"
          name="items"
          defaultValues={service?.items}
          placeholder="Describe una actividad o alcance del servicio."
          hint="Se muestran en el sitio en el mismo orden de las filas: la fila 1 es el primer ítem. Para cambiar el orden, corta y pega el texto entre filas; para quitar uno, usa el botón de la papelera."
        />
      </Card>

      <Card>
        <CardTitle
          title="Imágenes"
          description="La portada es la foto grande del servicio. La galería es opcional."
        />
        <div className="space-y-4">
          <ImageField
            label="Imagen principal (portada)"
            name="cover"
            folder="servicios"
            defaultValue={service?.images.cover}
            hint="Se usa en la tarjeta del servicio y en la cabecera de su página."
          />
          <Field
            label="Texto alternativo de la portada"
            name="cover_alt"
            defaultValue={service?.images.coverAlt}
            placeholder="Ej.: técnico revisando un tablero de control eléctrico."
            hint={AYUDA_ALT}
          />
          <GalleryField
            label="Galería (opcional)"
            defaultValues={service?.images.gallery}
            hint="Imágenes adicionales que se muestran al final de la página del servicio, en el orden de las filas. A cada una conviene ponerle su texto alternativo."
          />
        </div>
      </Card>

      <Card>
        <CardTitle
          title="Video del servicio (YouTube)"
          description="Opcional. Si pegas un enlace de YouTube, el video se muestra al final de la página de este servicio."
        />
        <div className="space-y-4">
          <AyudaSeccion>{AYUDA_VIDEO_SERVICIO}</AyudaSeccion>
          <Field
            label="Enlace del video"
            name="video_url"
            type="url"
            defaultValue={service?.video?.url}
            placeholder="https://www.youtube.com/watch?v=..."
            hint="Copia la dirección de la barra del navegador mientras ves el video. También sirven los enlaces cortos (youtu.be) y los de Shorts. Déjalo vacío para quitar el video."
          />
          <Field
            label="Título del video"
            name="video_titulo"
            defaultValue={service?.video?.titulo}
            placeholder="Ej.: Montaje de tablero de control en planta"
          />
          <TextArea
            label="Descripción del video"
            name="video_descripcion"
            rows={2}
            defaultValue={service?.video?.descripcion}
            placeholder="Una frase que cuente qué se ve en el video."
          />
          <Switch
            label="Mostrar el video"
            name="video_visible"
            defaultChecked={service?.video?.visible ?? true}
            hint="Apagarlo lo esconde del sitio pero conserva el enlace y los textos aquí."
          />
        </div>
      </Card>

      <Card>
        <CardTitle
          title="SEO"
          description="El título y el resumen que ven Google y las redes sociales cuando alguien comparte este servicio. Si los dejas vacíos se usan el título y el resumen de arriba."
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
