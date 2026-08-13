import { listFaqs, type FaqRecord } from "@/lib/admin";
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
          hint={AYUDA_ORDEN}
        />
      </div>
      <TextArea
        label="Respuesta"
        name="answer"
        required
        rows={4}
        defaultValue={faq?.answer}
        placeholder="Respuesta clara y concreta para el visitante."
        hint="Responde en dos o tres frases, como se lo explicarías a un cliente por teléfono."
      />
      <Switch
        label="Visibilidad en el sitio"
        name="published"
        defaultChecked={faq?.published ?? true}
        hint="Oculta = no se muestra en la página Nosotros ni la tiene en cuenta Google, pero se conserva aquí."
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
        description="Las preguntas y respuestas que el visitante despliega al final de la página Nosotros. Lo que guardes se ve en el sitio en pocos minutos."
        backHref="/admin/contenido"
        backLabel="Volver a Contenido del sitio"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio", href: "/admin/contenido" },
          { label: "FAQ" },
        ]}
      />

      <AvisoGuardar />

      <AyudaSeccion className="mb-6">
        Google también las lee y puede mostrarlas en sus resultados, así que vale
        la pena responder con claridad. {AYUDA_VISIBILIDAD}
      </AyudaSeccion>

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
                    confirmMessage={`¿Eliminar la pregunta "${faq.question}"?\n\nSe borra para siempre y no se puede deshacer.\n\nSi solo quieres retirarla del sitio, cancela y ponla en "Oculta".`}
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
