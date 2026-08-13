import { ContentImage } from "@/components/ui/ContentImage";
import type { Client } from "@/data/clients";

/**
 * Portafolio de clientes.
 *
 * Los logos van SIEMPRE a color (petición de GPI del 12 ago 2026): antes se
 * pintaban en escala de grises al 80 % y solo recuperaban su color al pasar el
 * ratón, algo que en móvil no ocurre nunca. El hover ahora resalta la tarjeta
 * (elevación y sombra), no el color.
 *
 * MAQUETACIÓN CENTRADA (pulido final)
 * -----------------------------------
 * Era una rejilla `grid-cols-6`, y con 7 logos la segunda fila quedaba con uno
 * solo pegado a la izquierda: se leía como un hueco, no como un cierre. Un
 * `grid` no puede centrar su última fila —las columnas están fijadas—, así que
 * esto es un `flex-wrap` con `justify-center` y el ancho de cada tarjeta
 * calculado para dar exactamente las mismas 2 / 3 / 6 columnas de antes
 * (100 % menos los huecos, repartido entre las tarjetas de la fila).
 */
export function ClientLogos({ clients }: { clients: Client[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-4">
      {clients.map((client) => (
        <li
          key={client.name}
          className="group flex h-24 w-[calc((100%-1rem)/2)] items-center justify-center rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-5rem)/6)]"
        >
          <div className="relative h-full w-full">
            <ContentImage
              src={client.logo}
              alt={`Logo de ${client.name}, cliente de GPI`}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 15vw"
              className="object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
