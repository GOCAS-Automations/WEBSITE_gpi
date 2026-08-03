export interface ProjectImage {
  src: string;
  alt: string;
}

export interface Project {
  /** Parte final de la URL de su página: /proyectos/<slug> */
  slug: string;
  title: string;
  client?: string;
  category: "industrial" | "ambiental";
  /** Frase corta que acompaña al proyecto (editable desde /admin) */
  description?: string;
  /** Descripción larga de la página de detalle. Si falta, se usa `description`. */
  details?: string;
  image: string;
  imageAlt: string;
  /** Fotos adicionales que se muestran al final de la página del proyecto */
  gallery?: ProjectImage[];
}

// Proyectos realizados (docs/CONTENIDO.md) — imágenes proyectos/10a-13a.jpg
// Los `slug` son los mismos que siembra la migración 0005: si algún día el
// sitio cae en estos datos estáticos, las URLs no cambian.
export const projects: Project[] = [
  {
    slug: "extraccion-aire-clinica-farallones",
    title: "Sistema de extracción de aire caliente — planta de emergencia",
    client: "Clínica Farallones",
    category: "industrial",
    description:
      "Diseño y montaje del sistema de extracción de aire caliente de la planta de emergencia.",
    details:
      "Diseñamos e instalamos el sistema de extracción de aire caliente de la planta de emergencia de la Clínica Farallones. El trabajo incluyó el dimensionamiento de los ductos, la selección del extractor y el montaje de la estructura de soporte, cuidando que la evacuación del calor no comprometiera la operación del equipo ni la seguridad del cuarto técnico.",
    image: "/images/proyectos/10a.jpg",
    imageAlt:
      "Sistema de extracción de aire caliente instalado sobre una planta de emergencia",
  },
  {
    slug: "chiller-laboratorios-osa",
    title: "Instalación de chiller de 30 TON",
    client: "Laboratorios OSA",
    category: "industrial",
    description:
      "Instalación completa de un chiller industrial de 30 toneladas de refrigeración.",
    details:
      "Instalación completa de un chiller de 30 toneladas de refrigeración para el proceso productivo de Laboratorios OSA: montaje del equipo, tendido de tubería hidráulica, aislamiento térmico, conexiones eléctricas y puesta en marcha con las pruebas de operación correspondientes.",
    image: "/images/proyectos/11a.jpg",
    imageAlt: "Instalación de un chiller industrial de 30 toneladas",
  },
  {
    slug: "bodega-laboratorios-osa",
    title: "Ampliación de bodega logística",
    client: "Laboratorios OSA",
    category: "industrial",
    description:
      "Ampliación de la bodega logística para aumentar la capacidad de almacenamiento.",
    details:
      "Ampliación de la bodega logística de Laboratorios OSA para aumentar su capacidad de almacenamiento. El proyecto abarcó la estructura metálica, la cubierta y las adecuaciones necesarias para mantener la operación de la planta durante la obra.",
    image: "/images/proyectos/12a.jpg",
    imageAlt: "Ampliación de una bodega logística industrial",
  },
  {
    slug: "planta-piloto-vaselina",
    title: "Montaje de planta piloto para fabricación de vaselina",
    category: "industrial",
    description:
      "Montaje de una planta piloto con tanques, tuberías y sistema de calentamiento.",
    details:
      "Montaje de una planta piloto para la fabricación de vaselina: tanques de proceso, tubería, sistema de calentamiento y accesorios, dispuestos de forma que el cliente pudiera validar su producto a escala antes de llevar el proceso a producción industrial.",
    image: "/images/proyectos/13a.jpg",
    imageAlt:
      "Planta piloto con tanques y tuberías para la fabricación de vaselina",
    gallery: [
      {
        src: "/images/cm/foto-montaje-planta-vaselina-alt.jpg",
        alt: "Otra vista del montaje de la planta piloto de vaselina, con los tanques y la tubería instalados",
      },
    ],
  },
];
