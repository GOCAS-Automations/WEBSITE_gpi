import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { getServices, getSettings, type ContactSettings } from "@/lib/content";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

/**
 * Revalidación ISR: el contenido se refresca cada 5 minutos y, además, de forma
 * inmediata al guardar desde /admin (revalidatePath("/", "layout")).
 */
export const revalidate = 300;

const siteUrl = "https://www.gpiprofesionales.com";
const homeTitle =
  "GPI — Optimización de Procesos Industriales y Ambientales | Cali";
const homeDescription =
  "GPI optimiza procesos industriales y ambientales en Cali: automatización y control, sistemas eléctricos, análisis energético, gestión ambiental, cumplimiento legal e ISO 14001. Más de 5 años buscando la excelencia.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: homeTitle,
    template: "%s | GPI",
  },
  description: homeDescription,
  applicationName: "GPI",
  authors: [{ name: "GPI" }],
  creator: "GOCAS Automations",
  keywords: [
    "GPI",
    "optimización de procesos",
    "automatización industrial Cali",
    "sistemas eléctricos industriales",
    "análisis energético",
    "seguridad de maquinaria LOTO",
    "gestión ambiental",
    "cumplimiento legal ambiental",
    "recurso hídrico",
    "ISO 14001",
    "ingeniería Cali",
    "Valle del Cauca",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: siteUrl,
    siteName: "GPI",
    title: homeTitle,
    description: homeDescription,
    images: [
      {
        url: "/images/logo_full.jpg",
        width: 3300,
        height: 1875,
        alt: "GPI — Optimización de Procesos Industriales y Ambientales",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: ["/images/logo_full.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "business",
};

function OrganizationJsonLd({ contact }: { contact: ContactSettings }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "GPI — Optimización de Procesos Industriales y Ambientales",
        legalName: contact.legalName,
        alternateName: "GPI",
        url: siteUrl,
        logo: `${siteUrl}/images/logo_full.jpg`,
        description: homeDescription,
        email: contact.emails[0]?.address,
        sameAs: [
          contact.social.facebook,
          contact.social.instagram,
          contact.social.youtube,
        ],
      },
      {
        "@type": "LocalBusiness",
        "@id": `${siteUrl}/#localbusiness`,
        name: "GPI — Optimización de Procesos Industriales y Ambientales",
        legalName: contact.legalName,
        image: `${siteUrl}/images/logo_full.jpg`,
        url: siteUrl,
        telephone: `+${contact.phones[0]?.intl ?? ""}`,
        priceRange: "$$",
        address: {
          "@type": "PostalAddress",
          streetAddress: `${contact.address.street}, ${contact.address.area}`,
          addressLocality: contact.address.city,
          addressRegion: contact.address.region,
          addressCountry: "CO",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: contact.geo.latitude,
          longitude: contact.geo.longitude,
        },
        areaServed: "Cali y suroccidente colombiano",
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "08:00",
            closes: "17:00",
          },
        ],
        sameAs: [
          contact.social.facebook,
          contact.social.instagram,
          contact.social.youtube,
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, services] = await Promise.all([getSettings(), getServices()]);

  return (
    <html lang="es" className={`${inter.variable} ${manrope.variable} h-full`}>
      <head>
        <OrganizationJsonLd contact={settings.contact} />
        {/* Fallback: si el usuario no tiene JavaScript, revela el contenido animado */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col bg-white font-sans text-ink antialiased">
        <Header services={services} />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} services={services} />
        <WhatsAppFloat contact={settings.contact} />
      </body>
    </html>
  );
}
