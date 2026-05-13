"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 py-12 text-slate-300">
      <div className="container">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-black text-white">Prescribe tu Multa</h3>
            <p className="text-sm leading-6 text-slate-400">
              Herramienta documental para analizar certificados de multas de tránsito no pagadas en Chile.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-white">Enlaces</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#faq" className="text-slate-400 transition hover:text-white">
                  Preguntas frecuentes
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className="text-slate-400 transition hover:text-white">
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="text-slate-400 transition hover:text-white">
                  Términos de servicio
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/descargo-legal" className="text-slate-400 transition hover:text-white">
                  Descargo legal
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="text-slate-400 transition hover:text-white">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold text-white">Contacto</h4>
            <p className="mb-2 text-sm text-slate-400">
              <a
                href="mailto:contacto@prescribetumulta.cl"
                className="transition hover:text-white"
              >
                contacto@prescribetumulta.cl
              </a>
            </p>
            <p className="text-sm text-slate-400">Chile</p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <p className="text-center text-sm leading-6 text-slate-400">
            © {currentYear} Prescribe tu Multa. Servicio informativo y documental. No constituye asesoría legal personalizada ni garantiza resultado favorable.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
