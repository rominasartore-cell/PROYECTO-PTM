"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            ⚖️
          </span>
          <span className="truncate text-xl font-black text-slate-950">
            Prescribe tu Multa
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
          <Link href="/#upload-form" className="transition hover:text-teal-700">
            Analizar
          </Link>
          <Link href="/#faq" className="transition hover:text-teal-700">
            Preguntas
          </Link>
        </nav>

        <Link
          href="/contacto"
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-50"
        >
          Contacto
        </Link>
      </div>
    </header>
  );
}

export default Header;
