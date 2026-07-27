import type { CorporateValue } from "@/data/values";
import { iconMap } from "@/lib/icons";

export function ValueCard({ value }: { value: CorporateValue }) {
  const Icon = iconMap[value.icon];
  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand-dark transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-ink">{value.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-graphite">
        {value.description}
      </p>
    </div>
  );
}
