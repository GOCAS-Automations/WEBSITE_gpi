import type { CorporateValue } from "@/data/values";
import { iconMap } from "@/lib/icons";

export function ValueCard({ value }: { value: CorporateValue }) {
  const Icon = iconMap[value.icon];
  return (
    /* Tarjeta compacta del prototipo: cuadradito verde arriba a la izquierda,
       título en negrita y descripción corta. */
    <div className="group relative flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card sm:p-6">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand-deep transition-colors duration-300 group-hover:bg-brand-deep group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-bold text-ink">{value.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-graphite">
        {value.description}
      </p>
    </div>
  );
}
