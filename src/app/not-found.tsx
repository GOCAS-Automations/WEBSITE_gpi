import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight } from "@/lib/icons";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center py-20">
      <Container className="text-center">
        <p className="text-7xl font-extrabold text-brand sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">
          Página no encontrada
        </h1>
        <p className="mx-auto mt-3 max-w-md text-graphite">
          Lo sentimos, la página que buscas no existe o fue movida. Volvamos a un
          lugar conocido.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" variant="primary">
            Ir al inicio
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink href="/servicios" variant="outline">
            Ver servicios
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
