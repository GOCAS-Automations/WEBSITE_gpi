import { AdminPageHeader, AvisoGuardar } from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/AdminForm";
import { ServiceFormFields } from "../ServiceFormFields";
import { saveService } from "../../actions";

export default function NuevoServicioPage() {
  return (
    <>
      <AdminPageHeader
        title="Nuevo servicio"
        description="Completa la información y guarda para publicarlo en el sitio."
        backHref="/admin/servicios"
        backLabel="Volver a Servicios"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio", href: "/admin/contenido" },
          { label: "Servicios", href: "/admin/servicios" },
          { label: "Nuevo" },
        ]}
      />

      <AvisoGuardar unico />

      <AdminForm
        action={saveService}
        submitLabel="Crear servicio"
        backHref="/admin/servicios"
        backLabel="Volver a Servicios"
      >
        <ServiceFormFields />
      </AdminForm>
    </>
  );
}
