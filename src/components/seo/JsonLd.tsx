/**
 * Datos estructurados (schema.org) para Google.
 *
 * Un solo sitio donde se serializa el JSON-LD, con el escape de `<` que evita
 * que un texto de contenido pueda cerrar la etiqueta <script>.
 *
 * `SITE_URL` debe ser absoluta: schema.org exige URLs absolutas incluso cuando
 * el resto de la metadata usa rutas relativas sobre `metadataBase`.
 */

export const SITE_URL = "https://www.gpiprofesionales.com";

/** `@id` de la Organization declarada en el layout raíz: se referencia, no se repite. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
