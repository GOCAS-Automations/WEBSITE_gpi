export interface Project {
  title: string;
  client?: string;
  category: "industrial" | "ambiental";
  image: string;
  imageAlt: string;
}

// Proyectos realizados (docs/CONTENIDO.md) — imágenes proyectos/10a-13a.jpg
export const projects: Project[] = [
  {
    title: "Sistema de extracción de aire caliente — planta de emergencia",
    client: "Clínica Farallones",
    category: "industrial",
    image: "/images/proyectos/10a.jpg",
    imageAlt:
      "Sistema de extracción de aire caliente instalado sobre una planta de emergencia",
  },
  {
    title: "Instalación de chiller de 30 TON",
    client: "Laboratorios OSA",
    category: "industrial",
    image: "/images/proyectos/11a.jpg",
    imageAlt: "Instalación de un chiller industrial de 30 toneladas",
  },
  {
    title: "Ampliación de bodega logística",
    client: "Laboratorios OSA",
    category: "industrial",
    image: "/images/proyectos/12a.jpg",
    imageAlt: "Ampliación de una bodega logística industrial",
  },
  {
    title: "Montaje de planta piloto para fabricación de vaselina",
    category: "industrial",
    image: "/images/proyectos/13a.jpg",
    imageAlt:
      "Planta piloto con tanques y tuberías para la fabricación de vaselina",
  },
];
