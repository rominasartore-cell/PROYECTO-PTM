"use client";

import Image from "next/image";
import Link from "next/link";

export default function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center" aria-label="Ir al inicio de Prescribe tu Multa">
          <Image
            src="/logo-prescribe-tu-multa.png"
            alt="Prescribe tu Multa"
            width={260}
            height={95}
            priority
            className="h-14 w-auto object-contain sm:h-16"
          />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex" aria-label="Navegación principal">
          <Link href="/#analizar" className="transition hover:text-teal-700">
            Analizar
          </Link>
          <Link href="/#como-funciona" className="transition hover:text-teal-700">
            Cómo funciona
          </Link>
          <Link href="/#faq" className="transition hover:text-teal-700">
            Preguntas
          </Link>
        </nav>

        <Link
          href="/#analizar"
          className="shrink-0 rounded-2xl bg-emerald-700 px-4 py-3 text-xs font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-slate-950 sm:text-sm"
        >
          Analizar certificado
        </Link>
      </div>
    </header>
  );
}
