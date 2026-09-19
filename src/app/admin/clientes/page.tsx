import { listClients, type ClientRecord } from "@/lib/admin";
import {
  AdminPageHeader,
  AvisoGuardar,
  AyudaSeccion,
  AYUDA_ORDEN,
  AYUDA_ORDEN_PAGINAS,
  AYUDA_VISIBILIDAD,
  Card,
  CardTitle,
  Field,
  Paginacion,
  PublishedBadge,
  Switch,
} from "@/components/admin/ui";
import { leerPagina, paginar } from "@/lib/paginacion";
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

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const clients = await listClients();
  // 10 por página (regla del panel), con la página en la URL.
  const pagina = paginar(clients, leerPagina((await searchParams).pagina));

  return (
    <>
      <AdminPageHeader
        title="Clientes"
        description="Los logos de clientes que se muestran en la página de inicio. Lo que guardes se ve en el sitio en pocos minutos."
        backHref="/admin/contenido"
        backLabel="Volver a Contenido del sitio"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio", href: "/admin/contenido" },
          { label: "Clientes" },
        ]}
      />

      <AvisoGuardar />

      <AyudaSeccion className="mb-6">
        Los logos se muestran centrados en la banda «Portafolio de clientes» de
        la página de inicio, en el orden que indiques. {AYUDA_VISIBILIDAD} {AYUDA_ORDEN_PAGINAS}
      </AyudaSeccion>

      <div id="lista-clientes" className="scroll-mt-28 space-y-5">
        {pagina.visibles.map((client) => (
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

        <Paginacion
          pagina={pagina.pagina}
          total={pagina.total}
          hrefBase="/admin/clientes"
          ancla="lista-clientes"
          etiqueta="Páginas de clientes"
          className="mt-0"
        />

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
