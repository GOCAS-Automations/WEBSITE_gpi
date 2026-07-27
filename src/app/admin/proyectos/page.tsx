import { listProjects, type ProjectRecord } from "@/lib/admin";
import {
  AdminPageHeader,
  Card,
  CardTitle,
  Field,
  Select,
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
          hint="Menor número = aparece antes."
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
      />
      <Field
        label="Texto alternativo de la imagen"
        name="image_alt"
        defaultValue={project?.image_alt}
        placeholder="Describe la imagen para lectores de pantalla."
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
        description="Los proyectos realizados que se muestran en la página /proyectos."
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Proyectos" }]}
      />

      <div className="space-y-5">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardTitle
              title={project.title}
              action={
                <DeleteForm
                  action={deleteProject}
                  id={project.id}
                  confirmMessage={`¿Eliminar el proyecto "${project.title}"?`}
                />
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
