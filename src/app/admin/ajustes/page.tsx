import { getAdminSettings } from "@/lib/admin";
import {
  AdminPageHeader,
  AyudaSeccion,
  AYUDA_ALT,
  Card,
  CardTitle,
  Field,
  Switch,
  TextArea,
} from "@/components/admin/ui";
import { AdminForm } from "@/components/admin/AdminForm";
import { ImageField } from "@/components/admin/ImageField";
import { PairListField } from "@/components/admin/ListField";
import {
  saveContactSettings,
  saveHeroSettings,
  saveExcellenceSettings,
  saveVisibilitySettings,
  saveYouTubeSettings,
} from "../actions";

export default async function AdminAjustesPage() {
  const { contact, hero, excellence, youtube, visibility } =
    await getAdminSettings();

  return (
    <>
      <AdminPageHeader
        title="Contacto y ajustes"
        description="Los datos de contacto de GPI, las redes, el mapa, los textos de la primera pantalla del inicio, el video y los interruptores de secciones completas."
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contacto y ajustes" },
        ]}
      />

      <AyudaSeccion title="Cómo se usa esta pantalla" className="mb-6">
        Cada bloque de abajo se guarda <strong>por separado</strong>, con su
        propio botón: si cambias un teléfono, pulsa «Guardar contacto» y ya. Lo
        que guardes se ve en el sitio en pocos minutos. Aquí tienes, en orden:
        los interruptores para <strong>apagar secciones completas</strong>, los{" "}
        <strong>datos de contacto</strong> (que alimentan el pie de página, la
        página Contacto y el botón de WhatsApp), los{" "}
        <strong>textos e imagen de la primera pantalla</strong> del inicio, las{" "}
        <strong>cifras</strong> de «Quiénes somos» y el{" "}
        <strong>video</strong> de la página Nosotros.
      </AyudaSeccion>

      <div className="space-y-6">
        {/* ---------------- Visibilidad de secciones ---------------- */}
        <Card>
          <CardTitle
            title="Visibilidad de secciones"
            description="Apaga bloques completos del sitio público sin borrar nada: al volver a encenderlos, el contenido reaparece tal como estaba. Es lo recomendado cuando algo no está listo para mostrarse."
          />
          <AdminForm
            action={saveVisibilitySettings}
            submitLabel="Guardar visibilidad"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Switch
                label="Valores corporativos"
                name="valuesSection"
                defaultChecked={visibility.valuesSection}
                hint="Bloque «Nuestros valores» del inicio y de la página Nosotros."
              />
              <Switch
                label="Clientes"
                name="clientsSection"
                defaultChecked={visibility.clientsSection}
                hint="Banda de logos de clientes en la página de inicio."
              />
              <Switch
                label="Video corporativo"
                name="videoSection"
                defaultChecked={visibility.videoSection}
                hint="Video de YouTube que se muestra en la página Nosotros."
              />
              <Switch
                label="Preguntas frecuentes"
                name="faqSection"
                defaultChecked={visibility.faqSection}
                hint="Acordeón de FAQ en Nosotros (y su marcado FAQPage para Google)."
              />
            </div>
          </AdminForm>
        </Card>

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

        {/* ---------------- Hero ---------------- */}
        <Card>
          <CardTitle
            title="Primera pantalla del inicio"
            description="Lo primero que ve alguien al entrar a gpiprofesionales.com: la imagen de fondo, el título grande y los dos botones."
          />
          <AdminForm action={saveHeroSettings} submitLabel="Guardar hero">
            <Field
              label="Etiqueta superior"
              name="badge"
              defaultValue={hero.badge}
              placeholder="+5 años en el sector industrial-ambiental"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Título (primera parte)"
                name="titleLead"
                defaultValue={hero.titleLead}
                hint="Se muestra en blanco."
              />
              <Field
                label="Título (palabra destacada)"
                name="titleHighlight"
                defaultValue={hero.titleHighlight}
                hint="Se muestra con el degradado verde."
              />
            </div>
            <TextArea
              label="Descripción"
              name="description"
              rows={3}
              defaultValue={hero.description}
            />
            <ImageField
              label="Imagen de fondo"
              name="image"
              folder="hero"
              required
              defaultValue={hero.image}
              hint="Ocupa toda la primera pantalla, así que conviene una foto horizontal y de buena calidad."
            />
            <Field
              label="Texto alternativo"
              name="imageAlt"
              defaultValue={hero.imageAlt}
              hint={AYUDA_ALT}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Botón principal — texto"
                name="primaryCtaLabel"
                defaultValue={hero.primaryCtaLabel}
              />
              <Field
                label="Botón principal — enlace"
                name="primaryCtaHref"
                defaultValue={hero.primaryCtaHref}
              />
              <Field
                label="Botón secundario — texto"
                name="secondaryCtaLabel"
                defaultValue={hero.secondaryCtaLabel}
              />
              <Field
                label="Botón secundario — enlace"
                name="secondaryCtaHref"
                defaultValue={hero.secondaryCtaHref}
              />
            </div>
          </AdminForm>
        </Card>

        {/* ---------------- Banda EXCELENCIA + estadísticas ---------------- */}
        <Card>
          <CardTitle
            title="Cifras y banda oscura del inicio"
            description="Las cifras que acompañan a «Quiénes somos» y la franja oscura con el mensaje destacado, ambas en la página de inicio."
          />
          <AdminForm action={saveExcellenceSettings} submitLabel="Guardar sección">
            <Field label="Texto superior" name="eyebrow" defaultValue={excellence.eyebrow} />
            <TextArea
              label="Mensaje"
              name="messageLead"
              rows={2}
              defaultValue={excellence.messageLead}
              hint="Se completa con la palabra destacada y un punto final."
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Palabra destacada"
                name="messageHighlight"
                defaultValue={excellence.messageHighlight}
              />
              <Field label="Botón — texto" name="ctaLabel" defaultValue={excellence.ctaLabel} />
              <Field label="Botón — enlace" name="ctaHref" defaultValue={excellence.ctaHref} />
            </div>
            <PairListField
              label="Estadísticas"
              nameA="stat_value"
              nameB="stat_label"
              labelA="Cifra (+5, 100%…)"
              labelB="Descripción"
              defaultValues={excellence.stats.map((s) => ({
                a: s.value,
                b: s.label,
              }))}
              addLabel="Añadir estadística"
              hint="Se muestran en una cuadrícula de dos columnas; lo ideal son 4."
            />
          </AdminForm>
        </Card>

        {/* ---------------- YouTube ---------------- */}
        <Card>
          <CardTitle
            title="Video corporativo (YouTube)"
            description="El video que se muestra en la página Nosotros. Solo se carga cuando el visitante pulsa play, para que el sitio siga siendo rápido."
          />
          <AdminForm action={saveYouTubeSettings} submitLabel="Guardar video">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="ID o URL del video"
                name="id"
                required
                defaultValue={youtube.id}
                hint="Puedes pegar la URL completa; se extrae el ID automáticamente."
              />
              <Field label="URL para ver en YouTube" name="watchUrl" defaultValue={youtube.watchUrl} />
            </div>
            <Field label="Título del video" name="title" defaultValue={youtube.title} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Texto superior de la sección"
                name="sectionEyebrow"
                defaultValue={youtube.sectionEyebrow}
              />
              <Field
                label="Título de la sección"
                name="sectionTitle"
                defaultValue={youtube.sectionTitle}
              />
            </div>
            <TextArea
              label="Descripción de la sección"
              name="sectionDescription"
              rows={2}
              defaultValue={youtube.sectionDescription}
            />
          </AdminForm>
        </Card>
      </div>
    </>
  );
}
