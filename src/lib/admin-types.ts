/**
 * Tipos del panel de administración.
 *
 * Módulo PURO (sin `next/headers` ni Supabase): lo importan tanto los Server
 * Components como los Client Components del panel.
 */

import type {
  ContactSettings,
  ExcellenceSettings,
  HeroSettings,
  VisibilitySettings,
  YouTubeSettings,
} from "@/data/site";
import type { UserRole } from "@/lib/roles";
import type { HorarioDias } from "@/lib/horarios";
import type { ContextoCalculo, DesgloseJornada } from "@/lib/jornada";

export type ActionStatus = "idle" | "success" | "error";

export interface ActionState {
  status: ActionStatus;
  message?: string;
}

export const idleState: ActionState = { status: "idle" };

/**
 * Estado extendido para las acciones que generan una contraseña: el panel la
 * muestra UNA sola vez (no se puede volver a consultar, solo restablecer).
 */
export interface CredentialState extends ActionState {
  credential?: {
    /** Con lo que la persona inicia sesión: su USUARIO (o el correo, en cuentas antiguas). */
    usuario: string;
    password: string;
    kind: "created" | "reset";
  };
}

export const idleCredentialState: CredentialState = { status: "idle" };

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface ServiceImages {
  cover?: string;
  coverAlt?: string;
  gallery?: GalleryImage[];
}

export interface ServiceRecord {
  id: string;
  slug: string;
  category: "industrial" | "ambiental";
  title: string;
  nav_title: string | null;
  icon_key: string;
  summary: string | null;
  description: string | null;
  items: string[];
  images: ServiceImages;
  meta_title: string | null;
  meta_description: string | null;
  sort: number;
  /** false = oculto en el sitio público (sigue editable en /admin). */
  published: boolean;
}

export interface ProjectRecord {
  id: string;
  title: string;
  client: string | null;
  category: "industrial" | "ambiental";
  description: string | null;
  image_url: string | null;
  image_alt: string | null;
  sort: number;
  published: boolean;
}

export interface ClientRecord {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  sort: number;
  published: boolean;
}

export interface FaqRecord {
  id: string;
  question: string;
  answer: string;
  sort: number;
  published: boolean;
}

export interface ValueRecord {
  id: string;
  title: string;
  description: string | null;
  icon_key: string;
  sort: number;
  published: boolean;
}

export interface AdminSettings {
  contact: ContactSettings;
  hero: HeroSettings;
  excellence: ExcellenceSettings;
  youtube: YouTubeSettings;
  visibility: VisibilitySettings;
}

/* ------------------------------------------------------------------ */
/* Cuentas del equipo (`profiles`)                                     */
/* ------------------------------------------------------------------ */

export interface ProfileRecord {
  id: string;
  /** Correo con el que Supabase Auth identifica la cuenta (puede ser sintético). */
  email: string;
  /** Usuario del portal. `null` en las cuentas creadas antes de la migración 0003. */
  username: string | null;
  full_name: string;
  role: UserRole;
  cargo: string | null;
  phone: string | null;
  /** Documento de identidad (informativo). */
  cedula: string | null;
  /** Correo REAL de contacto (informativo; no sirve para iniciar sesión). */
  email_contacto: string | null;
  active: boolean;
  created_at: string | null;
}

/* ------------------------------------------------------------------ */
/* Horarios laborales mensuales                                        */
/* ------------------------------------------------------------------ */

export interface HorarioMensualRecord {
  /** `null` cuando el mes todavía no está guardado en la base de datos. */
  id: string | null;
  anio: number;
  mes: number;
  dias: HorarioDias;
  notas: string | null;
  updated_at: string | null;
}

/* ------------------------------------------------------------------ */
/* Jornadas (registro de horas extra)                                  */
/* ------------------------------------------------------------------ */

export type JornadaStatus = "pendiente" | "aprobada" | "rechazada";

export interface JornadaRecord {
  id: string;
  employee_id: string;
  work_order: string;
  /** Día laboral en formato `YYYY-MM-DD`. */
  work_date: string;
  /** Instantes ISO (con zona horaria). */
  start_at: string;
  end_at: string;
  description: string;
  observations: string | null;
  status: JornadaStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;

  /* --- Desglose CONGELADO al aprobar (migración 0004) --------------- */
  /**
   * Desglose de horas guardado en el momento de aprobar. `null` mientras la
   * jornada no esté aprobada, si se aprobó antes de la 0004, o si la migración
   * todavía no está aplicada: en esos casos el cálculo se hace en vivo.
   * Se lee SIEMPRE con `obtenerDesglose()` de `src/lib/jornada.ts`.
   */
  desglose: DesgloseJornada | null;
  /** Con qué horario y qué recargos se calculó (respaldo de auditoría). */
  contexto_calculo: ContextoCalculo | null;
  /** Cuándo se congeló el desglose. */
  calculado_at: string | null;

  /** Datos del empleado, resueltos aparte (la tabla solo guarda el id). */
  employee_name?: string;
  employee_email?: string;
  /** Nombre de quien revisó, resuelto aparte. */
  reviewer_name?: string;
}

export const JORNADA_STATUS_LABELS: Record<JornadaStatus, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export const JORNADA_STATUS_CLASSES: Record<JornadaStatus, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  aprobada: "bg-brand-tint text-brand-dark",
  rechazada: "bg-red-100 text-red-700",
};
