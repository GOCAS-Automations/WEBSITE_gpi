export interface FaqItem {
  question: string;
  answer: string;
}

// FAQ real de GPI (reemplaza el "lorem ipsum" del sitio viejo).
// Redactado a partir del contenido oficial (docs/CONTENIDO.md y AGENTS.md).
export const faq: FaqItem[] = [
  {
    question: "¿Qué hace GPI?",
    answer:
      "Somos una empresa de gestión estratégica y ejecución enfocada en la optimización de procesos industriales y ambientales. Adaptamos los procesos integrando diferentes disciplinas para lograr eficiencia y rentabilidad, sin exceder los límites de diseño ni de seguridad, y apoyamos a las compañías en el cumplimiento de sus requisitos internos y de la normatividad ambiental.",
  },
  {
    question: "¿Cómo trabajan? ¿Cuál es su metodología?",
    answer:
      "Trabajamos por etapas: iniciamos con un diagnóstico y levantamiento de información de su proceso; a partir de ahí construimos una propuesta técnica y económica acorde a su necesidad y presupuesto; ejecutamos la solución bajo estándares industriales; y cerramos con acompañamiento, entrega de la documentación (dossier) y seguimiento a los resultados. Todo basado en la mejora continua.",
  },
  {
    question: "¿Dónde operan?",
    answer:
      "Estamos ubicados en Cali (Cl. 33 #5-76, Comuna 4, Valle del Cauca) y atendemos proyectos en Cali y el suroccidente colombiano. Podemos coordinar proyectos en otras regiones según su alcance.",
  },
  {
    question: "¿Qué sectores y tipos de empresa atienden?",
    answer:
      "Acompañamos a empresas industriales y a organizaciones que requieren gestión ambiental: plantas de producción, laboratorios, sector salud, comercio y proyectos de infraestructura, entre otros. Nos adaptamos al modelo de negocio de cada organización para integrar sus variables de operación.",
  },
  {
    question: "¿Cómo solicito una cotización?",
    answer:
      "Puede escribirnos por WhatsApp a los números 318 434 1249 o 311 649 9038, enviar un correo a xperea@gpiprofesionales.com o ycamacho@gpiprofesionales.com, o diligenciar el formulario de la página de Contacto. Cuéntenos brevemente su necesidad y le responderemos con una propuesta.",
  },
];
