'use client';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold gradient-text">âš–ï¸</span>
          <h1 className="text-xl font-bold text-gray-900">Prescribe Tu Multa</h1>
        </div>
        <a
          href="mailto:soporte@prescribetumulta.cl"
          className="button-secondary text-sm"
        >
          Contacto
        </a>
      </div>
    </header>
  );
}

