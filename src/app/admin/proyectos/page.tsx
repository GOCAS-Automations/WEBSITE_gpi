import { listProjects, type ProjectRecord } from "@/lib/admin";
import {
  AdminPageHeader,
  AvisoGuardar,
  AyudaSeccion,
  AYUDA_ALT,
  AYUDA_ORDEN,
  AYUDA_VISIBILIDAD,
  Card,
  CardTitle,
  Field,
  PublishedBadge,
  Select,
  Switch,
  TextArea,
} from "@/components/admin/ui";
import { AdminForm, DeleteForm } from "@/components/admin/AdminForm";
import { ImageField } from "@/components/admin/ImageField";
import { GalleryField } from "@/components/admin/ListField";
import { saveProject, deleteProject } from "../actions";
import { Plus } from "@/lib/icons";

const categoryOptions = [
  { value: "industrial", label: "Industrial" },
  { value: "ambiental", label: "Ambiental" },
];

function ProjectFields({ project }: { project?: ProjectRecord }) {
  return (
    <>
      {project && <input type="hidden" name="id" value={project.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Título"
          name="title"
          required
          defaultValue={project?.title}
          placeholder="Instalación de chiller de 30 TON"
        />
        <Field
          label="Cliente (opcional)"
          name="client"
          defaultValue={project?.client}
          placeholder="Laboratorios OSA"
        />
        <Field
          label="Dirección web (slug)"
          name="slug"
          defaultValue={project?.slug}
          placeholder="chiller-laboratorios-osa"
          hint="Es la parte final de la dirección de su página: gpiprofesionales.com/proyectos/… Se genera desde el título si lo dejas vacío. Cambiarlo cambia la dirección pública."
        />
        <Select
          label="Categoría"
          name="category"
          defaultValue={project?.category ?? "industrial"}
          options={categoryOptions}
        />
        <Field
          label="Orden"
          name="sort"
          type="number"
          defaultValue={project?.sort ?? 0}
          hint={`${AYUDA_ORDEN} Es la posición en la página Proyectos.`}
        />
        <Switch
          label="Visibilidad en el sitio"
          name="published"
          defaultChecked={project?.published ?? true}
          hint="Oculto = no se muestra en la página Proyectos ni tiene página propia, pero se conserva aquí y puedes volver a mostrarlo."
        />
      </div>
      <TextArea
        label="Descripción corta (opcional)"
        name="description"
        rows={2}
        defaultValue={project?.description}
        placeholder="Una o dos líneas que resuman el proyecto."
        hint="Se muestra bajo el título en la página del proyecto y es lo que ven Google y las redes sociales."
      />
      <TextArea
        label="Descripción larga (opcional)"
        name="details"
        rows={5}
        defaultValue={project?.details}
        placeholder="Cuenta el alcance del trabajo: qué se hizo, con qué equipos, qué resultado se obtuvo. Puedes usar varios párrafos separándolos con una línea en blanco."
        hint="Es el texto principal de la página del proyecto. Si la dejas vacía, se usa la descripción corta."
      />
      <ImageField
        label="Imagen del proyecto"
        name="image_url"
        folder="proyectos"
        defaultValue={project?.image_url}
        hint="Es la foto que se ve en la tarjeta y en la cabecera de su página."
      />
      <Field
        label="Texto alternativo de la imagen"
        name="image_alt"
        defaultValue={project?.image_alt}
        placeholder="Ej.: chiller instalado en la planta de Laboratorios OSA."
        hint={AYUDA_ALT}
      />
      <GalleryField
        label="Galería (opcional)"
        defaultValues={project?.gallery}
        hint="Fotos adicionales que se muestran al final de la página del proyecto, en el orden de las filas. A cada una conviene ponerle su texto alternativo."
      />
    </>
  );
}

export default async function AdminProyectosPage() {
  const projects = await listProjects();

  return (
    <>
      <AdminPageHeader
        title="Proyectos"
        description="Los trabajos ya realizados que se muestran, con su foto, en la página Proyectos del sitio. Lo que guardes se ve en el sitio en pocos minutos."
        backHref="/admin/contenido"
        backLabel="Volver a Contenido del sitio"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio", href: "/admin/contenido" },
          { label: "Proyectos" },
        ]}
      />

      <AvisoGuardar />

      <AyudaSeccion className="mb-6">
        Además de la tarjeta, cada proyecto tiene su{" "}
        <strong>propia página</strong> en el sitio (
        <code className="rounded bg-white px-1 py-0.5 text-xs">
          /proyectos/…
        </code>
        ), con la descripción larga y la galería que cargues aquí.{" "}
        {AYUDA_VISIBILIDAD}
      </AyudaSeccion>

      <div className="space-y-5">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardTitle
              title={project.title}
              action={
                <div className="flex items-center gap-2">
                  <PublishedBadge published={project.published} />
                  <DeleteForm
                    action={deleteProject}
                    id={project.id}
                    confirmMessage={`¿Eliminar el proyecto "${project.title}"?\n\nSe borra para siempre y no se puede deshacer.\n\nSi solo quieres retirarlo del sitio, cancela y ponlo en "Oculto".`}
                  />
                </div>
              }
            />
            <AdminForm action={saveProject} submitLabel="Guardar proyecto">
              <ProjectFields project={project} />
            </AdminForm>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardTitle
            title="Añadir proyecto"
            description="Completa los datos y guarda para publicarlo."
          />
          <AdminForm action={saveProject} submitLabel="Crear proyecto">
            <ProjectFields />
          </AdminForm>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-graphite">
            <Plus className="h-3.5 w-3.5" />
            El nuevo proyecto aparecerá en la lista tras guardar.
          </p>
        </Card>
      </div>
    </>
  );
}
