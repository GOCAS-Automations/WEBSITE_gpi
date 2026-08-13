import { notFound } from "next/navigation";
import Link from "next/link";
import { getServiceRecord } from "@/lib/admin";
import { AdminPageHeader, AvisoGuardar } from "@/components/admin/ui";
import { AdminForm, DeleteForm } from "@/components/admin/AdminForm";
import { ServiceFormFields } from "../ServiceFormFields";
import { saveService, deleteService } from "../../actions";
import { ArrowRight } from "@/lib/icons";

export default async function EditarServicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getServiceRecord(id);
  if (!service) notFound();

  return (
    <>
      <AdminPageHeader
        title={service.title}
        description="Edita la información del servicio y guarda para actualizar el sitio."
        backHref="/admin/servicios"
        backLabel="Volver a Servicios"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio", href: "/admin/contenido" },
          { label: "Servicios", href: "/admin/servicios" },
          { label: "Editar" },
        ]}
        action={
          <Link
            prefetch={false}
            href={`/servicios/${service.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            Ver en el sitio
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <AvisoGuardar unico />

      <AdminForm
        action={saveService}
        submitLabel="Guardar cambios"
        backHref="/admin/servicios"
        backLabel="Volver a Servicios"
      >
        <ServiceFormFields service={service} />
      </AdminForm>

      <div className="mt-8 rounded-2xl border border-red-100 bg-red-50/50 p-5">
        <h2 className="text-sm font-bold text-ink">Zona de peligro</h2>
        <p className="mt-1 text-sm text-graphite">
          Eliminar este servicio también quita su página pública
          (/servicios/{service.slug}).
        </p>
        <div className="mt-3">
          <DeleteForm
            action={deleteService}
            id={service.id}
            label="Eliminar servicio"
            confirmMessage={`¿Eliminar el servicio "${service.title}"? Esta acción no se puede deshacer.`}
          />
        </div>
      </div>
    </>
  );
}
