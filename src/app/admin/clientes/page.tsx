import { listClients, type ClientRecord } from "@/lib/admin";
import {
  AdminPageHeader,
  AyudaSeccion,
  AYUDA_ORDEN,
  AYUDA_VISIBILIDAD,
  Card,
  CardTitle,
  Field,
  PublishedBadge,
  Switch,
} from "@/components/admin/ui";
import { AdminForm, DeleteForm } from "@/components/admin/AdminForm";
import { ImageField } from "@/components/admin/ImageField";
import { saveClient, deleteClient } from "../actions";

function ClientFields({ client }: { client?: ClientRecord }) {
  return (
    <>
      {client && <input type="hidden" name="id" value={client.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre del cliente"
          name="name"
          required
          defaultValue={client?.name}
          placeholder="Laboratorios OSA"
        />
        <Field
          label="Orden"
          name="sort"
          type="number"
          defaultValue={client?.sort ?? 0}
          hint={`${AYUDA_ORDEN} Es la posición en la banda de logos del inicio.`}
        />
      </div>
      <ImageField
        label="Logo"
        name="logo_url"
        folder="clientes"
        defaultValue={client?.logo_url}
        hint="Lo mejor es un logo con fondo blanco o transparente (archivo .png)."
      />
      <Field
        label="Sitio web (opcional)"
        name="website"
        defaultValue={client?.website}
        placeholder="https://..."
        hint="Si lo pones, el logo se vuelve un enlace al sitio del cliente."
      />
      <Switch
        label="Visibilidad en el sitio"
        name="published"
        defaultChecked={client?.published ?? true}
        hint="Oculto = su logo no aparece en el inicio, pero se conserva aquí y puedes volver a mostrarlo."
      />
    </>
  );
}

export default async function AdminClientesPage() {
  const clients = await listClients();

  return (
    <>
      <AdminPageHeader
        title="Clientes"
        description="Los logos de clientes que se muestran en la página de inicio. Lo que guardes se ve en el sitio en pocos minutos."
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Clientes" }]}
      />

      <AyudaSeccion className="mb-6">
        Cada cliente se guarda por separado con su propio botón{" "}
        <strong>Guardar cliente</strong>. {AYUDA_VISIBILIDAD}
      </AyudaSeccion>

      <div className="space-y-5">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardTitle
              title={client.name}
              action={
                <div className="flex items-center gap-2">
                  <PublishedBadge published={client.published} />
                  <DeleteForm
                    action={deleteClient}
                    id={client.id}
                    confirmMessage={`¿Eliminar el cliente "${client.name}"?\n\nSe borra para siempre y no se puede deshacer.\n\nSi solo quieres retirar su logo del sitio, cancela y ponlo en "Oculto".`}
                  />
                </div>
              }
            />
            <AdminForm action={saveClient} submitLabel="Guardar cliente">
              <ClientFields client={client} />
            </AdminForm>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardTitle
            title="Añadir cliente"
            description="Sube el logo o pega su URL y guarda."
          />
          <AdminForm action={saveClient} submitLabel="Crear cliente">
            <ClientFields />
          </AdminForm>
        </Card>
      </div>
    </>
  );
}
