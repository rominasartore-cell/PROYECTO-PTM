import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = "https://www.prescribetumulta.cl";
const googleTagId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Prescribe tu Multa | Análisis de multas de tránsito en Chile",
    template: "%s | Prescribe tu Multa",
  },
  description:
    "Analiza tu Certificado de Multas de Tránsito No Pagadas y revisa si existen multas potencialmente prescritas. Obtén informe y solicitudes editables para tramitación personal.",
  keywords: [
    "prescripción de multas",
    "multas de tránsito",
    "multas TAG",
    "Registro de Multas No Pagadas",
    "RMNP",
    "certificado de multas",
    "Juzgado de Policía Local",
    "Chile",
    "solicitud de prescripción",
  ],
  applicationName: "Prescribe tu Multa",
  authors: [{ name: "Prescribe tu Multa" }],
  creator: "Prescribe tu Multa",
  publisher: "Prescribe tu Multa",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: siteUrl,
    siteName: "Prescribe tu Multa",
    title: "Prescribe tu Multa | Análisis de multas de tránsito en Chile",
    description:
      "Sube tu certificado y obtén un resultado preliminar inmediato de tus multas. Informe completo y solicitudes editables para tramitación personal.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prescribe tu Multa | Análisis de multas de tránsito",
    description:
      "Revisa si tienes multas potencialmente prescritas y obtén informe con solicitudes editables.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CL">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#047857" />
      </head>
      <body>
        {googleTagId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=G-E83RMS6BH4`}
              strategy="afterInteractive"
            />
            <Script id="google-tag" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-E83RMS6BH4');
              `}
            </Script>
          </>
        ) : null}

        {children}
      </body>
    </html>
  );
}