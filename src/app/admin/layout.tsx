import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireAdmin } from "@/lib/supabase/auth";
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

  // Verificación autoritativa: sesión válida + role = 'admin'.
  const { profile } = await requireAdmin();

  return (
    <AdminShell email={profile.email} signOut={signOutAction}>
      {children}
    </AdminShell>
  );
}
