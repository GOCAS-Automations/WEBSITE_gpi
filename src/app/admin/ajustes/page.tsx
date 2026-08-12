import { getAdminSettings } from "@/lib/admin";
import {
  AdminPageHeader,
  AyudaSeccion,
  Card,
  CardTitle,
  Field,
  NextStepLink,
  Switch,
  TextArea,
} from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/AdminForm";
import { PairListField } from "@/components/admin/ListField";
import { saveContactSettings, saveVisibilitySettings } from "../actions";

/**
 * CONTACTO Y AJUSTES
 * ==================
 * Lo transversal del sitio: los datos con los que la gente contacta a GPI
 * (pie de página, página de Contacto, botón de WhatsApp, marcado para Google)
 * y el único interruptor de visibilidad que afecta a más de una página.
 *
 * Los textos e imágenes de cada página se editan en «Página de inicio» y
 * «Página Nosotros», que es de donde salieron el hero, las cifras y el video
 * que antes vivían aquí.
 */
export default async function AdminAjustesPage() {
  const { contact, visibility } = await getAdminSettings();

  return (
    <>
      <AdminPageHeader
        title="Contacto y ajustes"
        description="Los datos de contacto de GPI, las redes sociales, el mapa, el correo al que llega el formulario y la visibilidad de los valores en todo el sitio."
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contacto y ajustes" },
        ]}
      />

      <AyudaSeccion title="Cómo se usa esta pantalla" className="mb-6">
        Aquí están los datos que se repiten en <strong>todo</strong> el sitio:
        dirección, teléfonos, correos, redes, el mapa y el buzón al que llega el
        formulario de contacto. Cada bloque se guarda{" "}
        <strong>por separado</strong>, con su propio botón, y lo que guardes se
        ve en el sitio en pocos minutos. Los textos e imágenes de cada página se
        editan en <strong>Página de inicio</strong> y{" "}
        <strong>Página Nosotros</strong>.
      </AyudaSeccion>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <NextStepLink href="/admin/inicio" label="Editar la página de inicio" />
        <NextStepLink href="/admin/nosotros" label="Editar la página Nosotros" />
      </div>

      <div className="space-y-6">
        {/* ---------------- Contacto ---------------- */}
        <Card>
          <CardTitle
            title="Datos de contacto"
            description="Se usan en el pie de página, la página de Contacto, el botón de WhatsApp y el marcado LocalBusiness."
          />
          <AdminForm action={saveContactSettings} submitLabel="Guardar contacto">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre corto" name="companyName" defaultValue={contact.companyName} />
              <Field label="Razón social" name="legalName" defaultValue={contact.legalName} />
            </div>
            <Field label="Tagline" name="tagline" defaultValue={contact.tagline} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dirección (calle)" name="street" defaultValue={contact.address.street} />
              <Field label="Barrio / comuna" name="area" defaultValue={contact.address.area} />
              <Field label="Ciudad" name="city" defaultValue={contact.address.city} />
              <Field label="Departamento" name="region" defaultValue={contact.address.region} />
              <Field label="País" name="country" defaultValue={contact.address.country} />
              <Field
                label="Dirección completa"
                name="address_full"
                defaultValue={contact.address.full}
                hint="Si la dejas vacía se arma automáticamente."
              />
              <Field
                label="Latitud"
                name="latitude"
                type="number"
                defaultValue={contact.geo.latitude}
                hint="Para el marcado LocalBusiness."
              />
              <Field
                label="Longitud"
                name="longitude"
                type="number"
                defaultValue={contact.geo.longitude}
              />
            </div>

            <PairListField
              label="Teléfonos / WhatsApp"
              nameA="phone_label"
              nameB="phone_intl"
              labelA="Etiqueta visible (318 434 1249)"
              labelB="Número internacional (573184341249)"
              defaultValues={contact.phones.map((p) => ({ a: p.label, b: p.intl }))}
              addLabel="Añadir teléfono"
              hint="El número internacional se usa en los enlaces de WhatsApp y tel:."
            />

            <Field
              label="WhatsApp principal"
              name="primaryWhatsApp"
              defaultValue={contact.primaryWhatsApp}
              hint="Número internacional usado por el botón flotante y el formulario."
            />

            <PairListField
              label="Correos electrónicos"
              nameA="email_address"
              nameB="email_person"
              labelA="correo@gpiprofesionales.com"
              labelB="Nombre de la persona"
              defaultValues={contact.emails.map((e) => ({
                a: e.address,
                b: e.person,
              }))}
              addLabel="Añadir correo"
              hint="Son los correos de las personas que se muestran en la página de Contacto y en el pie de página."
            />

            <Field
              label="Correo del formulario de contacto"
              name="correoFormulario"
              type="email"
              defaultValue={contact.correoFormulario}
              placeholder="gpi.gerencia1@gmail.com"
              hint="A este correo llegan los mensajes del formulario de contacto del sitio. Puede cambiarlo cuando quiera y se aplica en minutos."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Facebook" name="facebook" defaultValue={contact.social.facebook} />
              <Field label="Instagram" name="instagram" defaultValue={contact.social.instagram} />
              <Field
                label="Canal de YouTube"
                name="youtube_channel"
                defaultValue={contact.social.youtube}
              />
              <Field label="Horario de atención" name="schedule" defaultValue={contact.schedule} />
            </div>

            <TextArea
              label="URL del mapa embebido (Google Maps)"
              name="mapEmbedUrl"
              rows={3}
              defaultValue={contact.mapEmbedUrl}
              hint="En Google Maps: Compartir → Insertar un mapa → copiar la URL del atributo src."
            />
            <Field label="URL del sitio" name="siteUrl" defaultValue={contact.siteUrl} />
          </AdminForm>
        </Card>

        {/* ---------------- Visibilidad global ---------------- */}
        <Card>
          <CardTitle
            title="Visibilidad en todo el sitio"
            description="El único bloque que sale en más de una página y, por eso, se apaga desde aquí. Apagarlo no borra nada: al volver a encenderlo, el contenido reaparece tal como estaba."
          />
          <AdminForm
            action={saveVisibilitySettings}
            submitLabel="Guardar visibilidad"
          >
            <Switch
              label="Valores corporativos"
              name="valuesSection"
              defaultChecked={visibility.valuesSection}
              hint="Los apaga a la vez en la página de inicio y en Nosotros. Para quitarlos solo de Nosotros, usa el interruptor de esa pantalla."
            />
            <AyudaSeccion>
              El resto de los interruptores están en la pantalla de la página a
              la que pertenecen: <strong>Página de inicio</strong> (Quiénes
              somos, clientes) y <strong>Página Nosotros</strong> (misión y
              visión, galería, línea de tiempo, video, preguntas frecuentes).
            </AyudaSeccion>
          </AdminForm>
        </Card>
      </div>
    </>
  );
}
