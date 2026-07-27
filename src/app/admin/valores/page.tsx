import { listValues, type ValueRecord } from "@/lib/admin";
import {
  AdminPageHeader,
  Card,
  CardTitle,
  Field,
  Select,
  TextArea,
} from "@/components/admin/ui";
import { AdminForm, DeleteForm } from "@/components/admin/AdminForm";
import { saveValue, deleteValue } from "../actions";
import { iconMap } from "@/lib/icons";

const iconOptions = Object.keys(iconMap).map((key) => ({
  value: key,
  label: key,
}));

function ValueFields({ value }: { value?: ValueRecord }) {
  return (
    <>
      {value && <input type="hidden" name="id" value={value.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Título"
          name="title"
          required
          defaultValue={value?.title}
          placeholder="Compromiso"
        />
        <Select
          label="Icono"
          name="icon_key"
          defaultValue={value?.icon_key ?? "shield"}
          options={iconOptions}
        />
        <Field
          label="Orden"
          name="sort"
          type="number"
          defaultValue={value?.sort ?? 0}
        />
      </div>
      <TextArea
        label="Descripción"
        name="description"
        rows={2}
        defaultValue={value?.description}
        placeholder="La rentabilidad de nuestros clientes es nuestra obligación."
      />
    </>
  );
}

export default async function AdminValoresPage() {
  const values = await listValues();

  return (
    <>
      <AdminPageHeader
        title="Valores corporativos"
        description="Los principios que se muestran en el inicio y en la página Nosotros."
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Valores" }]}
      />

      <div className="space-y-5">
        {values.map((value) => (
          <Card key={value.id}>
            <CardTitle
              title={value.title}
              action={
                <DeleteForm
                  action={deleteValue}
                  id={value.id}
                  confirmMessage={`¿Eliminar el valor "${value.title}"?`}
                />
              }
            />
            <AdminForm action={saveValue} submitLabel="Guardar valor">
              <ValueFields value={value} />
            </AdminForm>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardTitle
            title="Añadir valor"
            description="Se recomienda mantener seis valores para que la cuadrícula quede pareja."
          />
          <AdminForm action={saveValue} submitLabel="Crear valor">
            <ValueFields />
          </AdminForm>
        </Card>
      </div>
    </>
  );
}
