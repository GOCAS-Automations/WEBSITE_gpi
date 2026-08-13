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
import { GalleryField, LineaTiempoField, ListField } from "@/components/admin/ListField";
import {
  saveNosotrosCta,
  saveNosotrosGaleria,
  saveNosotrosHero,
  saveNosotrosLineaTiempo,
  saveNosotrosMisionVision,
  saveNosotrosQuienesSomos,
  saveNosotrosValoresIntro,
  saveVisibilityNosotros,
  saveYouTubeSettings,
} from "../actions";

/**
 * PÁGINA NOSOTROS
 * ===============
 * La página que cuenta la historia de GPI: primera pantalla, Quiénes Somos,
 * Misión y Visión, la galería de «aliados estratégicos», la línea de tiempo
 * empresarial, la introducción de los valores, el video y el cierre.
 *
 * Los VALORES en sí (sus títulos, textos e iconos) y las PREGUNTAS FRECUENTES
 * son listas y viven en sus propias secciones del panel; aquí se editan solo
 * los textos que envuelven esas listas y los interruptores de la página.
 */
export default async function AdminNosotrosPage() {
  const { nosotros, youtube, visibility } = await getAdminSettings();

  return (
    <>
      <AdminPageHeader
        title="Página Nosotros"
        description="Todo el contenido de la página Nosotros: presentación, misión y visión, galería, línea de tiempo, video y textos de cierre."
        backHref="/admin/contenido"
        backLabel="Volver a Contenido del sitio"
        breadcrumb={[
          { label: "Panel", href: "/admin" },
          { label: "Contenido del sitio", href: "/admin/contenido" },
          { label: "Página Nosotros" },
        ]}
      />

      <AvisoGuardar />

      <AyudaSeccion title="Qué se edita aquí" className="mb-6">
        Los bloques están en el <strong>mismo orden</strong> en que se ven en la
        página. Los <strong>valores corporativos</strong> y las{" "}
        <strong>preguntas frecuentes</strong> que aparecen en esta página son
        listas y se editan en sus propias secciones del panel: aquí solo están
        los títulos que los presentan.
      </AyudaSeccion>

      <div className="space-y-6">
        {/* ---------------- Visibilidad ---------------- */}
        <Card>
          <CardTitle
            title="Qué se ve en la página Nosotros"
            description="Apaga un bloque completo sin borrar nada: al volver a encenderlo, el contenido reaparece tal como estaba."
          />
          <AdminForm action={saveVisibilityNosotros} submitLabel="Guardar qué se ve">
            <div className="grid gap-4 sm:grid-cols-2">
              <Switch
                label="Quiénes Somos"
                name="nosotrosQuienesSomos"
                defaultChecked={visibility.nosotrosQuienesSomos}
                hint="La foto del equipo con los dos párrafos de presentación."
              />
              <Switch
                label="Misión y Visión"
                name="nosotrosMisionVision"
                defaultChecked={visibility.nosotrosMisionVision}
                hint="Las dos tarjetas verdes."
              />
              <Switch
                label="Galería de aliados"
                name="nosotrosGaleria"
                defaultChecked={visibility.nosotrosGaleria}
                hint="«Más que proveedores, somos aliados estratégicos» y sus fotos."
              />
              <Switch
                label="Línea de tiempo"
                name="nosotrosLineaTiempo"
                defaultChecked={visibility.nosotrosLineaTiempo}
                hint="La trayectoria de la empresa con sus hitos."
              />
              <Switch
                label="Valores corporativos"
                name="nosotrosValores"
                defaultChecked={visibility.nosotrosValores}
                hint="Solo en esta página. Para quitarlos también del inicio, usa el interruptor de «Contacto y ajustes»."
              />
              <Switch
                label="Video corporativo"
                name="nosotrosVideo"
                defaultChecked={visibility.nosotrosVideo && visibility.videoSection}
                hint="El video de YouTube que se edita más abajo."
              />
              <Switch
                label="Preguntas frecuentes"
                name="nosotrosFaq"
                defaultChecked={visibility.nosotrosFaq && visibility.faqSection}
                hint="El acordeón de preguntas y su marcado para Google."
              />
            </div>
          </AdminForm>
        </Card>

        {/* ---------------- Primera pantalla ---------------- */}
        <Card>
          <CardTitle
            title="Primera pantalla"
            description="La cabecera oscura con la foto de fondo que abre la página."
          />
          <AdminForm action={saveNosotrosHero} submitLabel="Guardar primera pantalla">
            <Field
              scope="hero"
              label="Título"
              name="titulo"
              required
              defaultValue={nosotros.hero.titulo}
              placeholder="Optimizamos procesos, generamos rentabilidad"
            />
            <TextArea
              scope="hero"
              label="Descripción"
              name="descripcion"
              rows={2}
              defaultValue={nosotros.hero.descripcion}
            />
            <ImageField
              label="Imagen de fondo"
              name="imagen_url"
              folder="nosotros"
              defaultValue={nosotros.hero.imagen.url}
              hint="Se ve oscurecida detrás del título: conviene una foto horizontal, sin texto encima."
            />
            <Field
              scope="hero"
              label="Texto alternativo de la imagen"
              name="imagen_alt"
              defaultValue={nosotros.hero.imagen.alt}
              hint={AYUDA_ALT}
            />
          </AdminForm>
        </Card>

        {/* ---------------- Quiénes Somos ---------------- */}
        <Card>
          <CardTitle
            title="Quiénes Somos"
            description="La presentación larga de GPI, con la foto del equipo al lado."
          />
          <AdminForm action={saveNosotrosQuienesSomos} submitLabel="Guardar Quiénes Somos">
            <Field
              scope="qs"
              label="Título"
              name="titulo"
              required
              defaultValue={nosotros.quienesSomos.titulo}
            />
            <ListField
              label="Párrafos"
              name="parrafos"
              defaultValues={nosotros.quienesSomos.parrafos}
              placeholder="Escribe un párrafo completo."
              hint="Cada fila es un párrafo y se muestran en ese orden. Para separar una idea, añade una fila nueva en vez de dejar renglones en blanco."
            />
            <ImageField
              label="Foto"
              name="imagen_url"
              folder="nosotros"
              defaultValue={nosotros.quienesSomos.imagen.url}
              hint="La foto del equipo de GPI. Se muestra grande, al lado del texto."
            />
            <Field
              scope="qs"
              label="Texto alternativo de la foto"
              name="imagen_alt"
              defaultValue={nosotros.quienesSomos.imagen.alt}
              hint={AYUDA_ALT}
            />
          </AdminForm>
        </Card>

        {/* ---------------- Misión y Visión ---------------- */}
        <Card>
          <CardTitle
            title="Misión y Visión"
            description="Las dos tarjetas que van justo debajo de Quiénes Somos."
          />
          <AdminForm action={saveNosotrosMisionVision} submitLabel="Guardar misión y visión">
            <TextArea
              label="Misión"
              name="mision"
              rows={4}
              defaultValue={nosotros.mision.texto}
            />
            <TextArea
              label="Visión"
              name="vision"
              rows={4}
              defaultValue={nosotros.vision.texto}
            />
          </AdminForm>
        </Card>

        {/* ---------------- Galería de aliados ---------------- */}
        <Card>
          <CardTitle
            title="Galería «Más que proveedores, somos aliados estratégicos»"
            description="El texto de aliados estratégicos con la tira de fotos de trabajo en campo."
          />
          <AdminForm action={saveNosotrosGaleria} submitLabel="Guardar galería">
            <Field
              scope="galeria"
              label="Título"
              name="titulo"
              defaultValue={nosotros.galeria.titulo}
            />
            <TextArea
              scope="galeria"
              label="Descripción"
              name="descripcion"
              rows={4}
              defaultValue={nosotros.galeria.descripcion}
            />
            <GalleryField
              label="Fotos"
              defaultValues={nosotros.galeria.fotos.map((f) => ({
                src: f.url,
                alt: f.alt,
              }))}
              hint="Lo ideal son tres fotos verticales de trabajo en campo, en el orden de las filas. A cada una conviene ponerle su texto alternativo."
            />
          </AdminForm>
        </Card>

        {/* ---------------- Línea de tiempo ---------------- */}
        <Card>
          <CardTitle
            title="Línea de tiempo empresarial"
            description="La trayectoria de GPI: los hitos con fecha de arriba y las etiquetas que van debajo de la flecha."
          />
          <AdminForm action={saveNosotrosLineaTiempo} submitLabel="Guardar línea de tiempo">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                scope="linea"
                label="Texto superior"
                name="eyebrow"
                defaultValue={nosotros.lineaTiempo.eyebrow}
                placeholder="Nuestra trayectoria"
              />
              <Field
                scope="linea"
                label="Título"
                name="titulo"
                defaultValue={nosotros.lineaTiempo.titulo}
              />
            </div>
            <TextArea
              scope="linea"
              label="Descripción"
              name="descripcion"
              rows={2}
              defaultValue={nosotros.lineaTiempo.descripcion}
            />

            <LineaTiempoField
              label="Hitos (las tarjetas de arriba)"
              prefijo="hito"
              conFecha
              iconoPorDefecto="cog"
              defaultValues={nosotros.lineaTiempo.hitos.map((h) => ({
                fecha: h.fecha,
                titulo: h.titulo,
                descripcion: h.descripcion,
                icono: h.icono,
              }))}
              addLabel="Añadir hito"
              hint="Se muestran de izquierda a derecha en el orden de las tarjetas. El diseño está pensado para cuatro."
            />

            <LineaTiempoField
              label="Etiquetas (debajo de la flecha)"
              prefijo="etiqueta"
              iconoPorDefecto="shield"
              defaultValues={nosotros.lineaTiempo.etiquetas.map((e) => ({
                titulo: e.titulo,
                descripcion: e.descripcion,
                icono: e.icono,
              }))}
              addLabel="Añadir etiqueta"
              hint="Resumen de una palabra de cada etapa (Enfoque inicial, Crecimiento…). Lo natural es que haya tantas como hitos."
            />
          </AdminForm>
        </Card>

        {/* ---------------- Introducción de los valores ---------------- */}
        <Card>
          <CardTitle
            title="Título de los valores corporativos"
            description="El encabezado que presenta los valores en esta página. Los valores en sí se editan en la sección «Valores» del panel."
          />
          <AdminForm action={saveNosotrosValoresIntro} submitLabel="Guardar título de valores">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                scope="valores"
                label="Texto superior"
                name="eyebrow"
                defaultValue={nosotros.valoresIntro.eyebrow}
                placeholder="Nuestros valores"
              />
              <Field
                scope="valores"
                label="Título"
                name="titulo"
                defaultValue={nosotros.valoresIntro.titulo}
                placeholder="Lo que nos define"
              />
            </div>
            <TextArea
              scope="valores"
              label="Descripción"
              name="descripcion"
              rows={2}
              defaultValue={nosotros.valoresIntro.descripcion}
            />
          </AdminForm>
        </Card>

        {/* ---------------- Video de YouTube ---------------- */}
        <Card>
          <CardTitle
            title="Video corporativo (YouTube)"
            description="El video que se muestra en esta página. Solo se carga cuando el visitante pulsa play, para que el sitio siga siendo rápido."
          />
          <AdminForm action={saveYouTubeSettings} submitLabel="Guardar video">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Enlace o ID del video"
                name="id"
                required
                defaultValue={youtube.id}
                hint="Puedes pegar la dirección completa de YouTube; se extrae el identificador automáticamente."
              />
              <Field
                label="Dirección para ver en YouTube"
                name="watchUrl"
                defaultValue={youtube.watchUrl}
              />
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

        {/* ---------------- CTA final ---------------- */}
        <Card>
          <CardTitle
            title="Cierre de la página"
            description="La franja verde del final que invita a contactar a GPI."
          />
          <AdminForm action={saveNosotrosCta} submitLabel="Guardar cierre">
            <Field
              scope="cta"
              label="Título"
              name="titulo"
              defaultValue={nosotros.cta.titulo}
              placeholder="¿Listo para optimizar sus procesos?"
            />
            <TextArea
              scope="cta"
              label="Descripción"
              name="descripcion"
              rows={2}
              defaultValue={nosotros.cta.descripcion}
            />
          </AdminForm>
        </Card>
      </div>
    </>
  );
}
