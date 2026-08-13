import { listValues, type ValueRecord } from "@/lib/admin";
import {
  AdminPageHeader,
  AvisoGuardar,
  AyudaSeccion,
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
          hint="El dibujo que acompaña al valor en el sitio."
        />
        <Field
          label="Orden"
          name="sort"
          type="number"
          defaultValue={value?.sort ?? 0}
          hint={AYUDA_ORDEN}
        />
      </div>
      <TextArea
        label="Descripción"
        name="description"
        rows={2}
        defaultValue={value?.description}
        placeholder="La rentabilidad de nuestros clientes es nuestra obligación."
        hint="Una frase corta: es lo que se lee debajo del título en la tarjeta."
      />
      <Switch
        label="Visibilidad en el sitio"
        name="published"
        defaultChecked={value?.published ?? true}
        hint="Oculto = no aparece en el inicio ni en Nosotros, pero se conserva aquí y puedes volver a mostrarlo."
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
        description="Los principios de GPI que se muestran en el inicio y en la página Nosotros. Lo que guardes se ve en el sitio en pocos minutos."
        backHref="/admin/contenido"
        backLabel="Volver a Contenido del sitio"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio", href: "/admin/contenido" },
          { label: "Valores" },
        ]}
      />

      <AvisoGuardar />

      <AyudaSeccion className="mb-6">
        Se ven como tarjetas con icono, en el orden que indiques.{" "}
        {AYUDA_VISIBILIDAD}
      </AyudaSeccion>

      <div className="space-y-5">
        {values.map((value) => (
          <Card key={value.id}>
            <CardTitle
              title={value.title}
              action={
                <div className="flex items-center gap-2">
                  <PublishedBadge published={value.published} />
                  <DeleteForm
                    action={deleteValue}
                    id={value.id}
                    confirmMessage={`¿Eliminar el valor "${value.title}"?\n\nSe borra para siempre y no se puede deshacer.\n\nSi solo quieres retirarlo del sitio, cancela y ponlo en "Oculto".`}
                  />
                </div>
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
