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
  YouTubeSettings,
} from "@/data/site";

export type ActionStatus = "idle" | "success" | "error";

export interface ActionState {
  status: ActionStatus;
  message?: string;
}

export const idleState: ActionState = { status: "idle" };

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
}

export interface ClientRecord {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  sort: number;
}

export interface FaqRecord {
  id: string;
  question: string;
  answer: string;
  sort: number;
}

export interface ValueRecord {
  id: string;
  title: string;
  description: string | null;
  icon_key: string;
  sort: number;
}

export interface AdminSettings {
  contact: ContactSettings;
  hero: HeroSettings;
  excellence: ExcellenceSettings;
  youtube: YouTubeSettings;
}
