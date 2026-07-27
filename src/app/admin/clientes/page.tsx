import { listClients, type ClientRecord } from "@/lib/admin";
import { AdminPageHeader, Card, CardTitle, Field } from "@/components/admin/ui";
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
          hint="Menor número = aparece antes."
        />
      </div>
      <ImageField
        label="Logo"
        name="logo_url"
        folder="clientes"
        defaultValue={client?.logo_url}
        hint="Preferiblemente con fondo blanco o transparente."
      />
      <Field
        label="Sitio web (opcional)"
        name="website"
        defaultValue={client?.website}
        placeholder="https://..."
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
        description="Logos de clientes que aparecen en la portada del sitio."
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Clientes" }]}
      />

      <div className="space-y-5">
        {clients.map((client) => (
          <Card key={client.id}>
            <CardTitle
              title={client.name}
              action={
                <DeleteForm
                  action={deleteClient}
                  id={client.id}
                  confirmMessage={`¿Eliminar el cliente "${client.name}"?`}
                />
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
