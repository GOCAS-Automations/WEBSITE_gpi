import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireContentEditor } from "@/lib/supabase/auth";
import { signOutAction } from "@/lib/session-actions";

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

/** El panel siempre se evalúa en cada request: depende de la sesión. */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sin Supabase configurado no existe panel: se envía al portal.
  if (!isSupabaseConfigured()) redirect("/mi-cuenta");

  // Verificación autoritativa: sesión válida, cuenta activa y rol con permiso
  // de contenido (admin | coordinador | marketing). Las secciones internas
  // (Equipo y Jornadas) vuelven a exigir rol de manager en su propia página.
  const { profile } = await requireContentEditor();

  return (
    <AdminShell
      identificador={profile.identificador}
      role={profile.role}
      signOut={signOutAction}
    >
      {children}
    </AdminShell>
  );
}
