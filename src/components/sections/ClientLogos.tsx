import Image from "next/image";
import { clients } from "@/data/clients";

export function ClientLogos() {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {clients.map((client) => (
        <li
          key={client.name}
          className="group flex h-24 items-center justify-center rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
        >
          <div className="relative h-full w-full">
            <Image
              src={client.logo}
              alt={`Logo de ${client.name}, cliente de GPI`}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 15vw"
              className="object-contain opacity-80 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
