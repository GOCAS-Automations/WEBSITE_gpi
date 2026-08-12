import type { IconName } from "@/lib/icons";

export type ServiceCategoryId = "industrial" | "ambiental";

export interface ServiceCategory {
  id: ServiceCategoryId;
  name: string;
  /** Descripción oficial de la categoría (docs/CONTENIDO.md) */
  description: string;
  image: string;
  imageAlt: string;
  icon: IconName;
}

/**
 * Video de YouTube de un servicio (columna `site_services.video`, migración
 * 0007). Opcional: la inmensa mayoría de los servicios no tiene video.
 *
 * En la base de datos se guarda `{ url, titulo, descripcion, visible }`; el
 * `id` se DERIVA de la URL al leer (`youtubeId()`), no se persiste, para que
 * no puedan quedar desincronizados.
 */
export interface ServiceVideo {
  /** La URL de YouTube tal como la pegó quien edita el panel. */
  url: string;
  /** Identificador del video extraído de la URL. Vacío = URL no reconocida. */
  id: string;
  titulo: string;
  descripcion: string;
  /** false = el video existe pero no se muestra (se oculta sin borrarlo). */
  visible: boolean;
}

export interface Service {
  slug: string;
  title: string;
  /** Título corto para la barra de navegación / dropdown */
  navTitle: string;
  category: ServiceCategoryId;
  icon: IconName;
  /** Frase corta para tarjetas */
  excerpt: string;
  /** Párrafo de introducción en la página de detalle */
  intro: string;
  /** Ítems del servicio (listas con check verde) */
  items: string[];
  /** Imagen principal (tarjeta + hero de detalle) */
  cover: string;
  coverAlt: string;
  /** Galería opcional de imágenes adicionales */
  gallery?: { src: string; alt: string }[];
  /** Video de YouTube opcional, al final de la página del servicio. */
  video?: ServiceVideo;
  metaTitle: string;
  metaDescription: string;
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: "industrial",
    name: "Servicios Industriales",
    description:
      "Servicios orientados a las diferentes necesidades generadas a partir de los procesos industriales.",
    image: "/images/servicios/s1.jpg",
    imageAlt:
      "Planta de procesamiento industrial con tanques, tuberías y estructuras metálicas",
    icon: "cog",
  },
  {
    id: "ambiental",
    name: "Servicios Ambientales",
    description:
      "Apoyamos el fortalecimiento empresarial a través de estrategias ambientales que apuntan al cumplimiento regulatorio y actividades operativas óptimas que garantizan el funcionamiento de plantas de tratamiento de agua y manejo de residuos; trabajamos en cultura corporativa y responsabilidad ambiental.",
    image: "/images/servicios/s2.jpg",
    imageAlt:
      "Muestra de agua en un tubo de ensayo sostenido con guante sobre un fondo verde natural",
    icon: "leaf",
  },
];

export const services: Service[] = [
  /* ---------------- INDUSTRIALES ---------------- */
  {
    slug: "automatizacion-y-control",
    title: "Automatización y Control",
    navTitle: "Automatización y Control",
    category: "industrial",
    icon: "chip",
    excerpt:
      "Estrategias de automatización que mejoran la eficiencia de los procesos y los rentabilizan.",
    intro:
      "Generación de estrategias automáticas que permiten mejorar la eficiencia de los procesos, además de rentabilizarlos.",
    items: [
      "Ingeniería básica y de detalle, levantamiento de información, diseño de arquitectura de control, selección de equipos acorde a la necesidad y presupuesto del cliente, y presentación ejecutiva.",
      "Migración de controladores lógicos programables (PLC), variadores de velocidad, servo drives, servomotores, sistemas basados en PC, interfaces hombre-máquina (HMI) y redes de comunicación.",
      "Diseño, programación y puesta en marcha de sistemas de automatización bajo estándares industriales, acorde a las necesidades y presupuesto de cada cliente.",
      "Integración con sistemas de información y bases de datos.",
      "Actualización de sistemas de control con lógica cableada a PLC.",
      "Mantenimiento preventivo y correctivo.",
      "Detección de fallas y averías.",
      "Ingeniería de detalle: layout (en 3D si el cliente lo desea), planos eléctricos y unifilares, cálculos eléctricos, especificación técnica de sistemas de control y dossier con toda la información desarrollada.",
    ],
    cover: "/images/servicios/in1.jpg",
    coverAlt: "Tablero de control y automatización industrial en operación",
    gallery: [
      { src: "/images/servicios/in2.jpg", alt: "Componentes de un sistema de control industrial" },
      { src: "/images/servicios/in3.jpg", alt: "Instalación de equipos de automatización en planta" },
      { src: "/images/servicios/in5.jpg", alt: "Cableado y montaje de sistema de control" },
    ],
    metaTitle: "Automatización y Control Industrial",
    metaDescription:
      "Automatización industrial en Cali: diseño, programación y puesta en marcha de PLC, HMI y redes de control para mejorar la eficiencia de sus procesos.",
  },
  {
    slug: "sistemas-electricos",
    title: "Sistemas Eléctricos",
    navTitle: "Sistemas Eléctricos",
    category: "industrial",
    icon: "bolt",
    excerpt:
      "Montaje, cableado y mantenimiento eléctrico industrial confiable y eficiente.",
    intro:
      "Diseño, montaje y mantenimiento de instalaciones eléctricas industriales, con foco en la confiabilidad y la eficiencia energética de su operación.",
    items: [
      "Montaje de nuevas acometidas.",
      "Análisis de energía.",
      "Corrección de energía reactiva.",
      "Cableado de maquinaria.",
      "Mantenimiento eléctrico correctivo y preventivo.",
    ],
    cover: "/images/servicios/elec1.jpg",
    coverAlt: "Trabajos de instalación eléctrica industrial",
    gallery: [
      { src: "/images/servicios/elec2.jpg", alt: "Acometida eléctrica industrial" },
      { src: "/images/servicios/elec3.jpg", alt: "Cableado de maquinaria industrial" },
      { src: "/images/servicios/elec4.jpg", alt: "Mantenimiento de tablero eléctrico" },
    ],
    metaTitle: "Sistemas Eléctricos Industriales",
    metaDescription:
      "Instalaciones eléctricas industriales en Cali: acometidas, cableado de maquinaria, corrección de energía reactiva y mantenimiento preventivo y correctivo.",
  },
  {
    slug: "seguridad-de-maquinaria",
    title: "Seguridad de Maquinaria",
    navTitle: "Seguridad de Maquinaria",
    category: "industrial",
    icon: "shield",
    excerpt:
      "Análisis de riesgo, LOTO y guardas para proteger a su personal y sus activos.",
    intro:
      "Evaluamos y adecuamos su maquinaria para proteger al personal y los activos, bajo estándares de bloqueo y etiquetado (LOTO) y control de riesgos.",
    items: [
      "Análisis de riesgo.",
      "Auditoría interna LOTO.",
      "Diseño y creación de procedimientos LOTO.",
      "Diseño, construcción e instalación de guardas de seguridad de maquinaria acorde a las necesidades del proceso y del cliente.",
      "Diseño, construcción e instalación de circuitos de seguridad basados en las especificaciones funcionales generadas en la evaluación de riesgos.",
    ],
    cover: "/images/servicios/seguridad1.jpg",
    coverAlt: "Guarda de seguridad instalada en maquinaria industrial",
    gallery: [
      { src: "/images/servicios/seguridad2.jpg", alt: "Sistema de seguridad de maquinaria" },
      { src: "/images/servicios/seguridad3.jpg", alt: "Procedimiento de bloqueo y etiquetado LOTO" },
      { src: "/images/servicios/seguridad4.jpg", alt: "Circuito de seguridad en línea de producción" },
    ],
    metaTitle: "Seguridad de Maquinaria (LOTO)",
    metaDescription:
      "Seguridad de maquinaria en Cali: análisis de riesgo, auditorías y procedimientos LOTO, guardas y circuitos de seguridad para proteger a su personal.",
  },
  {
    slug: "analisis-energetico",
    title: "Análisis Energético",
    navTitle: "Análisis Energético",
    category: "industrial",
    icon: "gauge",
    excerpt:
      "Ahorros demostrables mediante el análisis de consumos y variables de proceso.",
    intro:
      "Analizamos las variables y el consumo de servicios de su planta para obtener ahorros demostrables y optimizar el costo del producto final.",
    items: [
      "Análisis de las diferentes variables del proceso para la obtención de ahorros demostrables.",
      "Análisis del consumo de servicios (agua, energía, vapor, gas) frente a la producción obtenida en el mes, con foco de optimización en el costo del producto final.",
      "Creación de sistemas que permiten el monitoreo de los utilities en la planta.",
    ],
    cover: "/images/servicios/ener1.jpg",
    coverAlt: "Medición y análisis energético en planta industrial",
    gallery: [
      { src: "/images/servicios/ener2.jpg", alt: "Monitoreo de consumo de energía" },
      { src: "/images/servicios/ener3.jpg", alt: "Análisis de utilities de planta" },
      { src: "/images/servicios/ener4.jpg", alt: "Instrumentación para análisis energético" },
    ],
    metaTitle: "Análisis Energético Industrial",
    metaDescription:
      "Análisis energético en Cali: estudio de consumos de agua, energía, vapor y gas frente a la producción para lograr ahorros demostrables en su planta.",
  },
  {
    slug: "medicion-de-variables",
    title: "Sistemas de Medición para Variables de Proceso",
    navTitle: "Medición de Variables",
    category: "industrial",
    icon: "activity",
    excerpt:
      "Instrumentación y medición precisa de variables de proceso con cumplimiento normativo.",
    intro:
      "Selección, venta, instalación y mantenimiento de instrumentación para medir con precisión las variables de su proceso, con cumplimiento normativo.",
    items: [
      "Venta de equipos de medición.",
      "Servicios de ingeniería para la selección de equipos.",
      "Mantenimiento de instrumentos.",
      "Instalación y puesta en marcha de instrumentos con cumplimiento normativo.",
    ],
    cover: "/images/servicios/ener5.jpg",
    coverAlt: "Instrumentos de medición de variables de proceso",
    gallery: [
      { src: "/images/servicios/ener6.jpg", alt: "Equipo de medición instalado en planta" },
      { src: "/images/servicios/in6.jpg", alt: "Instrumentación de proceso industrial" },
      { src: "/images/servicios/in7.jpg", alt: "Puesta en marcha de instrumentos de medición" },
    ],
    metaTitle: "Sistemas de Medición de Variables de Proceso",
    metaDescription:
      "Instrumentación industrial en Cali: venta, selección, instalación y mantenimiento de equipos de medición de variables de proceso con cumplimiento normativo.",
  },
  {
    slug: "gestion-del-mantenimiento",
    title: "Gestión del Mantenimiento y Proyectos",
    navTitle: "Gestión del Mantenimiento",
    category: "industrial",
    icon: "wrench",
    excerpt:
      "Planes y sistemas de mantenimiento que elevan la eficiencia de la producción.",
    intro:
      "Estructuramos el sistema de información y los planes que llevan a la eficiencia de los procesos, e intervenimos las líneas de producción para ejecutar los planes preventivos.",
    items: [
      "Estructuración del sistema de información que permite la ejecución de los planes de mantenimiento.",
      "Ejecución de planes que llevan a la eficiencia de los procesos.",
      "Mantenimiento a sistemas de producción (mecánico, eléctrico y electrónico).",
      "Intervención de líneas de producción para la ejecución de los planes preventivos.",
    ],
    cover: "/images/servicios/in8.jpg",
    coverAlt: "Mantenimiento de sistemas de producción industrial",
    gallery: [
      { src: "/images/servicios/elec5.jpg", alt: "Mantenimiento eléctrico de línea de producción" },
      { src: "/images/servicios/seguridad5.jpg", alt: "Intervención de maquinaria en planta" },
    ],
    metaTitle: "Gestión del Mantenimiento y Proyectos",
    metaDescription:
      "Gestión del mantenimiento industrial en Cali: planes preventivos y correctivos e intervención de líneas de producción mecánicas y eléctricas.",
  },

  /* ---------------- AMBIENTALES ---------------- */
  {
    slug: "gestion-ambiental-empresarial",
    title: "Gestión Ambiental Empresarial",
    navTitle: "Gestión Ambiental Empresarial",
    category: "ambiental",
    icon: "leaf",
    excerpt:
      "Estrategias para reducir, mitigar y compensar los impactos ambientales de su operación.",
    intro:
      "Conjunto de estrategias o actividades ejecutadas en compañías, encaminadas a la reducción, mitigación, compensación y eliminación de los impactos negativos que puedan generar al ambiente producto de su dinámica empresarial, en favor del cumplimiento normativo, la cultura y la responsabilidad ambiental.",
    items: [
      "Reducción y mitigación de los impactos ambientales de la operación.",
      "Compensación y eliminación de impactos negativos sobre el ambiente.",
      "Alineación con el cumplimiento normativo ambiental.",
      "Fortalecimiento de la cultura y la responsabilidad ambiental corporativa.",
    ],
    cover: "/images/servicios/am1.jpg",
    coverAlt: "Gestión ambiental empresarial en campo",
    gallery: [
      { src: "/images/servicios/am2.jpg", alt: "Actividades de gestión ambiental en una empresa" },
    ],
    metaTitle: "Gestión Ambiental Empresarial",
    metaDescription:
      "Gestión ambiental empresarial en Cali: estrategias para reducir, mitigar y compensar los impactos ambientales de su operación de forma responsable.",
  },
  {
    slug: "cumplimiento-legal-ambiental",
    title: "Cumplimiento Legal Ambiental",
    navTitle: "Cumplimiento Legal Ambiental",
    category: "ambiental",
    icon: "scale",
    excerpt:
      "Trámites, permisos y respuesta técnica ante la autoridad ambiental.",
    intro:
      "Apoyamos el proceso de respuesta a través de la implementación de actividades como soporte, que llevan al cumplimiento de los requerimientos regulatorios ambientales.",
    items: [
      "Acompañamiento en procesos sancionatorios ambientales.",
      "Trámite de permiso de concesión de agua subterránea y superficial.",
      "Respuesta técnica a requerimientos de la autoridad ambiental.",
      "Inscripción en plataformas de regulación legal (RUA, RESPEL, PCB's, EIA, etc.).",
      "Programas de envase y empaque, y posconsumo de medicamentos vencidos.",
      "Caracterización de efluentes domésticos e industriales.",
      "Permisos de ocupación de cauce.",
      "Estudio de impacto ambiental.",
      "Trámite de permiso de vertimientos.",
    ],
    cover: "/images/servicios/am3.jpg",
    coverAlt: "Trabajo técnico para cumplimiento legal ambiental",
    gallery: [
      { src: "/images/servicios/am4.jpg", alt: "Caracterización de efluentes y muestreo ambiental" },
    ],
    metaTitle: "Cumplimiento Legal Ambiental",
    metaDescription:
      "Cumplimiento legal ambiental en Cali: permisos de vertimientos y concesión de agua, RUA, RESPEL, estudios de impacto y procesos sancionatorios.",
  },
  {
    slug: "gestion-urbanistica",
    title: "Gestión Urbanística",
    navTitle: "Gestión Urbanística",
    category: "ambiental",
    icon: "building",
    excerpt:
      "Requisitos ambientales para licencias de construcción y proyectos de infraestructura.",
    intro:
      "Acompañamiento en las estrategias de gestión y control de los requisitos ambientales asociados a proyectos de infraestructura de pequeña y gran escala.",
    items: [
      "Planes de Medidas de Manejo Ambiental en obras y proyectos para la obtención de licencias de construcción.",
      "Acompañamiento en el trámite de obtención de concepto ambiental para obras, proyectos y construcciones.",
    ],
    cover: "/images/servicios/am5.jpg",
    coverAlt: "Gestión de requisitos ambientales en proyectos de infraestructura",
    gallery: [
      { src: "/images/servicios/s2.jpg", alt: "Control ambiental en obra" },
    ],
    metaTitle: "Gestión Urbanística Ambiental",
    metaDescription:
      "Gestión urbanística ambiental en Cali: Planes de Medidas de Manejo Ambiental y concepto ambiental para licencias de construcción e infraestructura.",
  },
  {
    slug: "recurso-hidrico",
    title: "Recurso Hídrico",
    navTitle: "Recurso Hídrico",
    category: "ambiental",
    icon: "droplet",
    excerpt:
      "Formulación de proyectos y diseño u optimización de sistemas de tratamiento de agua.",
    intro:
      "Experiencia en la formulación de proyectos sobre el recurso hídrico, y en el diseño y/u optimización de sistemas de tratamiento de agua, en los componentes estructural, operativo y documental.",
    items: [
      "Formulación de proyectos sobre el recurso hídrico.",
      "Diseño y optimización de sistemas de tratamiento de agua.",
      "Desarrollo de los componentes estructural, operativo y documental.",
    ],
    cover: "/images/servicios/am2.jpg",
    coverAlt: "Sistema de tratamiento y monitoreo del recurso hídrico",
    gallery: [
      { src: "/images/slides/2.jpg", alt: "Medición de variables en un punto de captación de agua" },
    ],
    metaTitle: "Recurso Hídrico",
    metaDescription:
      "Recurso hídrico en Cali: formulación de proyectos y diseño u optimización de sistemas de tratamiento de agua en su componente estructural y operativo.",
  },
  {
    slug: "iso-14001",
    title: "ISO 14001:2015",
    navTitle: "ISO 14001:2015",
    category: "ambiental",
    icon: "certificate",
    excerpt:
      "Acompañamiento y auditorías internas para certificar su sistema en ISO 14001:2015.",
    intro:
      "Acompañamos a las empresas en el camino a la certificación en la Norma ISO 14001:2015; ofrecemos auditorías internas integrales en los diferentes sistemas de gestión como preparación ante los entes certificadores.",
    items: [
      "Creación del grupo de trabajo para el levantamiento de información.",
      "Elaboración de los procedimientos y documentos necesarios para la certificación.",
      "Mejoras estructurales del sistema de gestión ambiental.",
      "Auditorías internas integrales como preparación ante los entes certificadores.",
      "Acompañamiento en la obtención de la certificación.",
    ],
    cover: "/images/servicios/am4.jpg",
    coverAlt: "Auditoría de sistema de gestión ambiental ISO 14001",
    gallery: [
      { src: "/images/servicios/am1.jpg", alt: "Preparación documental para certificación ISO 14001" },
    ],
    metaTitle: "Certificación ISO 14001:2015",
    metaDescription:
      "ISO 14001:2015 en Cali: acompañamiento a la certificación y auditorías internas de su sistema de gestión ambiental ante los entes certificadores.",
  },
];

/* ---------------- Helpers ---------------- */
export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function getServicesByCategory(category: ServiceCategoryId): Service[] {
  return services.filter((s) => s.category === category);
}

export function getCategory(id: ServiceCategoryId): ServiceCategory {
  return serviceCategories.find((c) => c.id === id)!;
}
