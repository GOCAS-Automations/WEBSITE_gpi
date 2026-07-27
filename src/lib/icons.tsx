import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Wrapper con los atributos comunes de todos los iconos de línea. */
function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ---------- UI ---------- */
export const ArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Base>
);

export const ArrowLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 12H5" />
    <path d="m11 18-6-6 6-6" />
  </Base>
);

export const Check = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Base>
);

export const ChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
);

export const Menu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Base>
);

export const Close = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Base>
);

export const Phone = (p: IconProps) => (
  <Base {...p}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
  </Base>
);

export const Mail = (p: IconProps) => (
  <Base {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </Base>
);

export const MapPin = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Base>
);

export const Clock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const Quote = (p: IconProps) => (
  <Base {...p} fill="currentColor" stroke="none">
    <path d="M7 7h4v6a4 4 0 0 1-4 4v-2a2 2 0 0 0 2-2H7V7Zm8 0h4v6a4 4 0 0 1-4 4v-2a2 2 0 0 0 2-2h-2V7Z" />
  </Base>
);

export const Play = (p: IconProps) => (
  <Base {...p} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5Z" />
  </Base>
);

export const User = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Base>
);

export const Lock = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Base>
);

export const LogOut = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 8 6 12l4 4M6 12h9" />
  </Base>
);

export const Plus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const Trash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M10 11v6M14 11v6" />
  </Base>
);

export const Upload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 16V4m0 0L8 8m4-4 4 4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Base>
);

export const Pencil = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m14.5 5.5 4 4" />
  </Base>
);

export const Sliders = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Base>
);

export const Photo = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m4 17 5-5 4 4 3-2 4 4" />
  </Base>
);

export const Info = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Base>
);

/* ---------- Redes sociales ---------- */
export const WhatsApp = (p: IconProps) => (
  <Base {...p} fill="currentColor" stroke="none">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.06 8.06 0 0 1 2.37 5.72c0 4.48-3.65 8.11-8.13 8.11h-.01a8.13 8.13 0 0 1-4.14-1.13l-.3-.18-3.11.82.83-3.04-.19-.31a8.05 8.05 0 0 1-1.24-4.28c0-4.48 3.64-8.12 8.13-8.12Zm-4.5 4.34c-.14 0-.37.05-.56.26-.19.21-.74.72-.74 1.76 0 1.04.76 2.04.86 2.18.11.14 1.49 2.28 3.62 3.19.5.22.9.35 1.2.45.5.16.96.14 1.32.08.4-.06 1.24-.5 1.42-1 .18-.49.18-.91.12-1-.05-.09-.19-.14-.4-.25-.21-.11-1.24-.61-1.43-.68-.19-.07-.33-.1-.47.11-.14.21-.54.68-.66.82-.12.14-.24.16-.45.05-.21-.11-.88-.32-1.68-1.03-.62-.55-1.04-1.24-1.16-1.45-.12-.21-.01-.32.09-.43.09-.09.21-.24.31-.36.11-.12.14-.21.21-.35.07-.14.03-.26-.02-.37-.05-.1-.46-1.15-.65-1.57-.15-.35-.31-.35-.45-.36h-.38Z" />
  </Base>
);

export const Facebook = (p: IconProps) => (
  <Base {...p} fill="currentColor" stroke="none">
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
  </Base>
);

export const Instagram = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </Base>
);

export const YouTube = (p: IconProps) => (
  <Base {...p} fill="currentColor" stroke="none">
    <path d="M21.6 7.2a2.9 2.9 0 0 0-2.05-2.06C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.55.44A2.9 2.9 0 0 0 2.4 7.2 30.4 30.4 0 0 0 2 12a30.4 30.4 0 0 0 .4 4.8 2.9 2.9 0 0 0 2.05 2.06C6.2 19.3 12 19.3 12 19.3s5.8 0 7.55-.44a2.9 2.9 0 0 0 2.05-2.06A30.4 30.4 0 0 0 22 12a30.4 30.4 0 0 0-.4-4.8ZM10 15.3V8.7L15.5 12 10 15.3Z" />
  </Base>
);

/* ---------- Valores corporativos ---------- */
export const Handshake = (p: IconProps) => (
  <Base {...p}>
    <path d="m11 17 2 2a1 1 0 0 0 1.5 0l3.5-3.5" />
    <path d="m8.5 8.5 3-3a1.4 1.4 0 0 1 2 0l3.5 3.5H21v6l-3 3" />
    <path d="M3 8h3l4 4a1.4 1.4 0 0 1 0 2l-.5.5a1.4 1.4 0 0 1-2 0L5 12" />
    <path d="M3 8v6l3 3" />
  </Base>
);

export const Trophy = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    <path d="M10 14.5V17h4v-2.5M8 21h8M12 17v4" />
  </Base>
);

export const Shield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 5 6v5c0 4.3 2.9 8 7 9 4.1-1 7-4.7 7-9V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Base>
);

export const Flame = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3s5 3.5 5 8.5a5 5 0 0 1-10 0c0-1.6.6-2.9 1.3-3.9C9 9.5 10 10 10 10s-.5-2.5.5-4S12 3 12 3Z" />
  </Base>
);

export const TrendingUp = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 17 9.5 10.5l4 4L21 7" />
    <path d="M15 7h6v6" />
  </Base>
);

export const Shuffle = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5h3.5c1 0 1.9.5 2.5 1.3L15 13c.6.8 1.5 1.3 2.5 1.3H21" />
    <path d="M4 19h3.5c1 0 1.9-.5 2.5-1.3l.8-1.1M14.2 8.4l.8-1.1c.6-.8 1.5-1.3 2.5-1.3H21" />
    <path d="m18 3 3 3-3 3M18 15l3 3-3 3" />
  </Base>
);

/* ---------- Servicios ---------- */
export const Chip = (p: IconProps) => (
  <Base {...p}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <path d="M10.5 10.5h3v3h-3z" />
    <path d="M9 3v2M12 3v2M15 3v2M9 19v2M12 19v2M15 19v2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2" />
  </Base>
);

export const Bolt = (p: IconProps) => (
  <Base {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </Base>
);

export const Gauge = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 19a9 9 0 1 1 16 0" />
    <path d="m12 15 4-4" />
    <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
  </Base>
);

export const Activity = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12h4l2.5-7 5 14L17 12h4" />
  </Base>
);

export const Wrench = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 4.5a4.5 4.5 0 0 0-5.9 5.6L3 16.2 4.5 20l6.1-6.1a4.5 4.5 0 0 0 5.6-5.9l-2.6 2.6-2.1-2.1L14.1 6" />
  </Base>
);

export const Cog = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </Base>
);

export const Leaf = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20c0-8 6-14 16-14 0 10-6 15-14 15-1.3 0-2 0-2-1Z" />
    <path d="M4 20c3-6 7-9 11-10" />
  </Base>
);

export const Scale = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v18M7 21h10M6 6h12" />
    <path d="M6 6 3.5 12h5L6 6ZM18 6l-2.5 6h5L18 6Z" />
    <path d="M3.5 12a2.5 2.5 0 0 0 5 0M15.5 12a2.5 2.5 0 0 0 5 0" />
  </Base>
);

export const Building = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
    <path d="M14 9h4a2 2 0 0 1 2 2v10M2 21h20" />
    <path d="M7 7h3M7 11h3M7 15h3M17 13h1M17 17h1" />
  </Base>
);

export const Droplet = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
    <path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" />
  </Base>
);

export const Certificate = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="9" r="6" />
    <path d="m9 8.5 2 2 4-4" />
    <path d="M8.5 13.5 7 22l5-2.5L17 22l-1.5-8.5" />
  </Base>
);

/** Mapa de nombre → componente para uso data-driven. */
export const iconMap = {
  handshake: Handshake,
  trophy: Trophy,
  shield: Shield,
  flame: Flame,
  trendingUp: TrendingUp,
  shuffle: Shuffle,
  chip: Chip,
  bolt: Bolt,
  gauge: Gauge,
  activity: Activity,
  wrench: Wrench,
  cog: Cog,
  leaf: Leaf,
  scale: Scale,
  building: Building,
  droplet: Droplet,
  certificate: Certificate,
} as const;

export type IconName = keyof typeof iconMap;
