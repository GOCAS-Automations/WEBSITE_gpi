import { getAdminSettings } from "@/lib/admin";
import {
  AdminPageHeader,
  AvisoGuardar,
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
import { ListField, PairListField } from "@/components/admin/ListField";
import { ETIQUETA_VISITAS } from "@/data/site";
import {
  saveExcellenceSettings,
  saveHeroSettings,
  saveHomeClientes,
  saveHomeCta,
  saveHomeQuienesSomos,
  saveHomeServiciosIntro,
  saveHomeValoresIntro,
  saveVisibilityInicio,
} from "../actions";

/**
 * PÁGINA DE INICIO
 * ================
 * Todo lo que se ve en gpiprofesionales.com de arriba abajo: la primera
 * pantalla, el bloque «Quiénes somos» con sus cifras, la banda oscura y los
 * interruptores de las secciones de esta página.
 *
 * Los servicios, los proyectos, los clientes y los valores que también salen
 * en el inicio se administran en sus propias secciones del panel: aquí solo
 * están los textos e imágenes que no pertenecen a ninguna lista.
 */
export default async function AdminInicioPage() {
  const { hero, excellence, home, visibility } = await getAdminSettings();
  const qs = home.quienesSomos;

  return (
    <>
      <AdminPageHeader
        title="Página de inicio"
        description="Los textos y las imágenes de la portada del sitio, de arriba abajo: primera pantalla, «Quiénes somos», títulos de servicios, valores y clientes, banda oscura y cierre."
        backHref="/admin/contenido"
        backLabel="Volver a Contenido del sitio"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio", href: "/admin/contenido" },
          { label: "Página de inicio" },
        ]}
      />

      <AvisoGuardar />

      <AyudaSeccion title="Qué se edita aquí" className="mb-6">
        Los bloques están en el <strong>mismo orden</strong> en que se ven en la
        página. Los <strong>servicios</strong>, los <strong>proyectos</strong>,
        los <strong>logos de clientes</strong> y los <strong>valores</strong>{" "}
        que aparecen en el inicio son listas y se editan en sus propias
        secciones: aquí solo están los títulos que los presentan.
      </AyudaSeccion>

      <div className="space-y-6">
        {/* ---------------- Visibilidad de las secciones del inicio ---------------- */}
        <Card>
          <CardTitle
            title="Qué se ve en la página de inicio"
            description="Apaga un bloque completo sin borrar nada: al volver a encenderlo, el contenido reaparece tal como estaba."
          />
          <AdminForm action={saveVisibilityInicio} submitLabel="Guardar qué se ve">
            <div className="grid gap-4 sm:grid-cols-2">
              <Switch
                label="Quiénes somos y cifras"
                name="homeQuienesSomos"
                defaultChecked={visibility.homeQuienesSomos}
                hint="El bloque con el texto de presentación, los puntos con visto verde y las tarjetas de cifras."
              />
              <Switch
                label="Clientes"
                name="clientsSection"
                defaultChecked={visibility.clientsSection}
                hint="La banda con los logos de las empresas que confían en GPI."
              />
            </div>
          </AdminForm>
        </Card>

        {/* ---------------- Hero ---------------- */}
        <Card>
          <CardTitle
            title="Primera pantalla"
            description="Lo primero que ve alguien al entrar a gpiprofesionales.com: la imagen de fondo, el título grande y los dos botones."
          />
          <AdminForm action={saveHeroSettings} submitLabel="Guardar primera pantalla">
            <Field
              label="Etiqueta superior"
              name="badge"
              defaultValue={hero.badge}
              placeholder="+15 años en el sector industrial-ambiental"
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

        {/* ---------------- Quiénes somos (inicio) ---------------- */}
        <Card>
          <CardTitle
            title="Quiénes somos y cifras"
            description="La presentación corta de GPI en el inicio, con sus puntos de visto verde y las tarjetas de cifras que la acompañan."
          />
          <AdminForm
            action={saveHomeQuienesSomos}
            submitLabel="Guardar Quiénes somos"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                scope="quienes"
                label="Texto superior"
                name="eyebrow"
                defaultValue={qs.eyebrow}
                placeholder="Quiénes somos"
                hint="El rótulo pequeño en verde que va encima del título."
              />
              <Field label="Título" name="titulo" defaultValue={qs.titulo} required />
            </div>
            <TextArea
              label="Descripción"
              name="descripcion"
              rows={4}
              defaultValue={qs.descripcion}
            />
            <ListField
              label="Puntos con visto verde"
              name="bullets"
              defaultValues={qs.bullets}
              placeholder="Objetivo: lograr el 100% en el desempeño de nuestros clientes."
              hint="Frases cortas, una por fila. Se muestran en el mismo orden de las filas."
            />
            <ImageField
              label="Imagen de apoyo"
              name="imagen_url"
              folder="inicio"
              defaultValue={qs.imagen.url}
              hint="Foto que acompaña a esta sección. Lo natural aquí es la foto del equipo de GPI."
            />
            <Field
              label="Texto alternativo de la imagen"
              name="imagen_alt"
              defaultValue={qs.imagen.alt}
              hint={AYUDA_ALT}
            />
            <PairListField
              label="Cifras"
              nameA="stat_value"
              nameB="stat_label"
              labelA="Cifra (+15, 100%…)"
              labelB="Descripción"
              defaultValues={qs.stats.map((s) => ({ a: s.value, b: s.label }))}
              addLabel="Añadir cifra"
              hint={`Se muestran en tarjetas. Junto a ellas aparece, automáticamente, la tarjeta de «${ETIQUETA_VISITAS}»: esa no se edita aquí porque la cuenta el sitio solo.`}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                scope="quienes"
                label="Botón — texto"
                name="ctaLabel"
                defaultValue={qs.ctaLabel}
              />
              <Field
                scope="quienes"
                label="Botón — enlace"
                name="ctaHref"
                defaultValue={qs.ctaHref}
                hint="Normalmente /nosotros."
              />
            </div>
          </AdminForm>
        </Card>

        {/* ---------------- Encabezado de los servicios (0008) ---------------- */}
        <Card>
          <CardTitle
            title="Título de la sección de servicios"
            description="El encabezado centrado que presenta las dos tarjetas grandes (Servicios Industriales y Servicios Ambientales) en el inicio."
          />
          <AdminForm
            action={saveHomeServiciosIntro}
            submitLabel="Guardar título de servicios"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                scope="servicios"
                label="Texto superior"
                name="eyebrow"
                defaultValue={home.serviciosIntro.eyebrow}
                placeholder="Nuestros servicios"
                hint="El rótulo pequeño en verde que va encima del título."
              />
              <Field
                scope="servicios"
                label="Título"
                name="titulo"
                defaultValue={home.serviciosIntro.titulo}
                placeholder="Dos áreas, una misma excelencia"
              />
            </div>
            <TextArea
              scope="servicios"
              label="Descripción"
              name="descripcion"
              rows={2}
              defaultValue={home.serviciosIntro.descripcion}
            />
            <AyudaSeccion>
              Los <strong>servicios</strong> en sí (sus textos, imágenes y
              orden) se editan en la sección <strong>Servicios</strong> del
              panel: aquí solo está el encabezado que los presenta.
            </AyudaSeccion>
          </AdminForm>
        </Card>

        {/* ---------------- Encabezado de los valores (0008) ---------------- */}
        <Card>
          <CardTitle
            title="Título de los valores en el inicio"
            description="El encabezado del bloque de valores corporativos de la página de inicio. La página Nosotros tiene el suyo, aparte."
          />
          <AdminForm
            action={saveHomeValoresIntro}
            submitLabel="Guardar título de valores"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                scope="valores"
                label="Texto superior"
                name="eyebrow"
                defaultValue={home.valoresIntro.eyebrow}
                placeholder="Nuestros valores"
              />
              <Field
                scope="valores"
                label="Título"
                name="titulo"
                defaultValue={home.valoresIntro.titulo}
                placeholder="Los principios que guían cada proyecto"
              />
            </div>
            <TextArea
              scope="valores"
              label="Descripción (opcional)"
              name="descripcion"
              rows={2}
              defaultValue={home.valoresIntro.descripcion}
              hint="En el inicio va vacía a propósito: el bloque se lee mejor con solo el título. Si escribes algo, aparece debajo."
            />
          </AdminForm>
        </Card>

        {/* ---------------- Banda EXCELENCIA ---------------- */}
        <Card>
          <CardTitle
            title="Banda oscura del inicio"
            description="La franja oscura con el mensaje destacado que separa los valores de los logos de clientes."
          />
          <AdminForm action={saveExcellenceSettings} submitLabel="Guardar banda oscura">
            <Field
              scope="banda"
              label="Texto superior"
              name="eyebrow"
              defaultValue={excellence.eyebrow}
            />
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
              <Field
                scope="banda"
                label="Botón — texto"
                name="ctaLabel"
                defaultValue={excellence.ctaLabel}
              />
              <Field
                scope="banda"
                label="Botón — enlace"
                name="ctaHref"
                defaultValue={excellence.ctaHref}
              />
            </div>
            <AyudaSeccion>
              Las <strong>cifras</strong> ya no se editan aquí: viven en el
              bloque «Quiénes somos y cifras» de arriba, que es donde se ven.
            </AyudaSeccion>
          </AdminForm>
        </Card>

        {/* ---------------- Portafolio de clientes (0008) ---------------- */}
        <Card>
          <CardTitle
            title="Título del portafolio de clientes"
            description="El encabezado de la banda de logos de empresas, casi al final del inicio."
          />
          <AdminForm action={saveHomeClientes} submitLabel="Guardar título de clientes">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                scope="clientes"
                label="Texto superior"
                name="eyebrow"
                defaultValue={home.clientes.eyebrow}
                placeholder="Clientes"
              />
              <Field
                scope="clientes"
                label="Título"
                name="titulo"
                defaultValue={home.clientes.titulo}
                placeholder="Portafolio de clientes"
              />
            </div>
            <TextArea
              scope="clientes"
              label="Descripción"
              name="descripcion"
              rows={2}
              defaultValue={home.clientes.descripcion}
            />
            <AyudaSeccion>
              Los <strong>logos</strong> se añaden y se ordenan en la sección{" "}
              <strong>Clientes</strong> del panel. Para quitar la banda entera,
              usa el interruptor «Clientes» del primer bloque de esta pantalla.
            </AyudaSeccion>
          </AdminForm>
        </Card>

        {/* ---------------- Cierre del inicio (0008) ---------------- */}
        <Card>
          <CardTitle
            title="Cierre de la página"
            description="La franja verde del final que invita a contactar a GPI, con los botones «Contáctanos» y «WhatsApp»."
          />
          <AdminForm action={saveHomeCta} submitLabel="Guardar cierre">
            <Field
              scope="cta"
              label="Título"
              name="titulo"
              defaultValue={home.cta.titulo}
              placeholder="¿Listo para optimizar sus procesos?"
            />
            <TextArea
              scope="cta"
              label="Descripción"
              name="descripcion"
              rows={2}
              defaultValue={home.cta.descripcion}
            />
            <AyudaSeccion>
              El número de WhatsApp de los botones sale de{" "}
              <strong>Ajustes</strong> → «Datos de contacto».
            </AyudaSeccion>
          </AdminForm>
        </Card>
      </div>
    </>
  );
}
