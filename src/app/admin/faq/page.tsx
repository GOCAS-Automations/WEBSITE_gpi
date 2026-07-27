import { listFaqs, type FaqRecord } from "@/lib/admin";
import {
  AdminPageHeader,
  Card,
  CardTitle,
  Field,
  PublishedBadge,
  Switch,
  TextArea,
} from "@/components/admin/ui";
import { AdminForm, DeleteForm } from "@/components/admin/AdminForm";
import { saveFaq, deleteFaq } from "../actions";

function FaqFields({ faq }: { faq?: FaqRecord }) {
  return (
    <>
      {faq && <input type="hidden" name="id" value={faq.id} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field
          label="Pregunta"
          name="question"
          required
          defaultValue={faq?.question}
          placeholder="¿Cómo solicito una cotización?"
        />
        <Field
          label="Orden"
          name="sort"
          type="number"
          defaultValue={faq?.sort ?? 0}
        />
      </div>
      <TextArea
        label="Respuesta"
        name="answer"
        required
        rows={4}
        defaultValue={faq?.answer}
        placeholder="Respuesta clara y concreta para el visitante."
      />
      <Switch
        label="Visibilidad en el sitio"
        name="published"
        defaultChecked={faq?.published ?? true}
        hint="Oculta = no se muestra en Nosotros ni en el marcado FAQPage de Google."
      />
    </>
  );
}

export default async function AdminFaqPage() {
  const faqs = await listFaqs();

  return (
    <>
      <AdminPageHeader
        title="Preguntas frecuentes"
        description="Se muestran en la página Nosotros y alimentan el marcado FAQPage para Google."
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "FAQ" }]}
      />

      <div className="space-y-5">
        {faqs.map((faq) => (
          <Card key={faq.id}>
            <CardTitle
              title={faq.question}
              action={
                <div className="flex items-center gap-2">
                  <PublishedBadge published={faq.published} />
                  <DeleteForm
                    action={deleteFaq}
                    id={faq.id}
                    confirmMessage={`¿Eliminar la pregunta "${faq.question}"?`}
                  />
                </div>
              }
            />
            <AdminForm action={saveFaq} submitLabel="Guardar pregunta">
              <FaqFields faq={faq} />
            </AdminForm>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardTitle
            title="Añadir pregunta"
            description="Escribe la pregunta y la respuesta que verá el visitante."
          />
          <AdminForm action={saveFaq} submitLabel="Crear pregunta">
            <FaqFields />
          </AdminForm>
        </Card>
      </div>
    </>
  );
}
