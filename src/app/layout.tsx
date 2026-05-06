import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prescribe Tu Multa - Análisis de Prescripción de Multas de Tránsito',
  description: 'Analiza tu certificado RMNP y descubre cuáles de tus multas podrían estar prescritas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}

