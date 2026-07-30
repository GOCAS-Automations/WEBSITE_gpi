import { listProjects, type ProjectRecord } from "@/lib/admin";
import {
  AdminPageHeader,
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
          hint="Oculto = no se muestra en la página Proyectos, pero se conserva aquí y puedes volver a mostrarlo."
        />
      </div>
      <TextArea
        label="Descripción (opcional)"
        name="description"
        rows={2}
        defaultValue={project?.description}
        placeholder="Notas internas o detalle del alcance."
      />
      <ImageField
        label="Imagen del proyecto"
        name="image_url"
        folder="proyectos"
        defaultValue={project?.image_url}
        hint="Es la foto que se ve en la tarjeta del proyecto."
      />
      <Field
        label="Texto alternativo de la imagen"
        name="image_alt"
        defaultValue={project?.image_alt}
        placeholder="Ej.: chiller instalado en la planta de Laboratorios OSA."
        hint={AYUDA_ALT}
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
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Proyectos" }]}
      />

      <AyudaSeccion className="mb-6">
        Cada proyecto se guarda por separado con su propio botón{" "}
        <strong>Guardar proyecto</strong>. {AYUDA_VISIBILIDAD}
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
