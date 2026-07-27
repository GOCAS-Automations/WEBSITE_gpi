import Link from "next/link";
import { listServices } from "@/lib/admin";
import { AdminPageHeader, EmptyState, PrimaryLink } from "@/components/admin/ui";
import { DeleteForm } from "@/components/admin/AdminForm";
import { deleteService } from "../actions";
import { iconMap, Plus, Pencil, ArrowRight } from "@/lib/icons";

export default async function AdminServiciosPage() {
  const services = await listServices();

  return (
    <>
      <AdminPageHeader
        title="Servicios"
        description="Crea, edita, reordena y elimina los servicios industriales y ambientales."
        breadcrumb={[{ label: "Panel", href: "/admin" }, { label: "Servicios" }]}
        action={
          <PrimaryLink href="/admin/servicios/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo servicio
          </PrimaryLink>
        }
      />

      {services.length === 0 ? (
        <EmptyState
          title="Todavía no hay servicios"
          description="Crea el primero o aplica la migración SQL para cargar los 11 servicios que ya tiene el sitio."
          action={
            <PrimaryLink href="/admin/servicios/nuevo">
              <Plus className="h-4 w-4" />
              Crear servicio
            </PrimaryLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {services.map((service) => {
            const Icon =
              iconMap[service.icon_key as keyof typeof iconMap] ?? iconMap.cog;
            return (
              <li
                key={service.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-dark">
                  <Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-ink">{service.title}</h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        service.category === "ambiental"
                          ? "bg-brand-tint text-brand-dark"
                          : "bg-mist text-graphite"
                      }`}
                    >
                      {service.category}
                    </span>
                    <span className="text-xs text-graphite">orden {service.sort}</span>
                  </div>
                  <p className="mt-1 truncate text-sm text-graphite">
                    /servicios/{service.slug}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/servicios/${service.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-brand hover:text-brand-dark"
                  >
                    Ver
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/admin/servicios/${service.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink-soft"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Link>
                  <DeleteForm
                    action={deleteService}
                    id={service.id}
                    confirmMessage={`¿Eliminar el servicio "${service.title}"? Esta acción no se puede deshacer.`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
