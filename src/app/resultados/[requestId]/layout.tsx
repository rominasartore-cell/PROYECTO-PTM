import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resultado de análisis",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ResultadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}