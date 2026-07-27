export interface Client {
  name: string;
  logo: string;
  /** Sitio web del cliente (opcional, editable desde /admin) */
  website?: string;
}

// Logos de clientes de GPI (public/images/portfolio/1-6.jpg).
// Editable desde el panel admin (Fase 2).
export const clients: Client[] = [
  { name: "Colgas", logo: "/images/portfolio/1.jpg" },
  { name: "Recuin", logo: "/images/portfolio/2.jpg" },
  { name: "Laboratorios OSA", logo: "/images/portfolio/3.jpg" },
  { name: "Jardín Infantil Michín", logo: "/images/portfolio/4.jpg" },
  { name: "Tatiendo.com", logo: "/images/portfolio/5.jpg" },
  { name: "Primma", logo: "/images/portfolio/6.jpg" },
];
