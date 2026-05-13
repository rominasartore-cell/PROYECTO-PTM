"use client";

import Link from "next/link";
import PublicSiteHeader from "./PublicSiteHeader";

interface InformationPageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function InformationPageLayout({
  title,
  subtitle,
  children,
}: InformationPageLayoutProps) {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicSiteHeader />

      <section className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 text-lg leading-8 text-slate-600">{subtitle}</p>
          )}
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8 text-slate-700">
          {children}
        </div>
      </section>

      <footer className="bg-slate-950 py-12 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-lg font-black text-white">Prescribe tu Multa</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Servicio documental automatizado para analizar multas de transito.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-black text-white">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/terminos-y-condiciones" className="text-sm text-slate-400 transition hover:text-white">
                    Términos y Condiciones
                  </Link>
                </li>
                <li>
                  <Link href="/politica-de-privacidad" className="text-sm text-slate-400 transition hover:text-white">
                    Política de Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/politica-de-reembolso" className="text-sm text-slate-400 transition hover:text-white">
                    Política de Reembolso
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-black text-white">Soporte</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/contacto" className="text-sm text-slate-400 transition hover:text-white">
                    Contacto
                  </Link>
                </li>
                <li>
                  <a href="/#preguntas" className="text-sm text-slate-400 transition hover:text-white">
                    Preguntas Frecuentes
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-black text-white">Descargo</h3>
              <p className="mt-4 text-xs leading-5 text-slate-400">
                No incluye representacion judicial, patrocinio profesional, asesoria personalizada, presentacion ante tribunales, seguimiento del tramite ni garantia de resultado.
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
            {"©"} {new Date().getFullYear()} Prescribe tu Multa. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </main>
  );
}
