import type { IconName } from "@/lib/icons";

export interface CorporateValue {
  title: string;
  description: string;
  icon: IconName;
}

// Valores corporativos oficiales (6) — docs/CONTENIDO.md
export const values: CorporateValue[] = [
  {
    title: "Compromiso",
    description: "La rentabilidad de nuestros clientes es nuestra obligación.",
    icon: "handshake",
  },
  {
    title: "Competitividad",
    description: "Ejecución de altos estándares.",
    icon: "trophy",
  },
  {
    title: "Seguridad",
    description: "Con personal seguro obtenemos procesos y activos seguros.",
    icon: "shield",
  },
  {
    title: "Pasión",
    description:
      "Impresa en cada propuesta y ejecución de valor para nuestros clientes.",
    icon: "flame",
  },
  {
    title: "Constancia",
    description:
      "Perseverar en la consecución de los objetivos nuestros y de los clientes.",
    icon: "trendingUp",
  },
  {
    title: "Adaptabilidad",
    description:
      "Capacidad de responder adecuadamente a las exigencias de nuestros clientes.",
    icon: "shuffle",
  },
];
