"use client";

import React, { useState } from "react";

const DEMO_AMOUNT = "$248.000";
const PROCEDURE_SAVINGS = "$250.000";
const TOTAL_OPPORTUNITY = "$498.000";
const REGISTRO_CIVIL_URL = "https://www.registrocivil.cl/principal/servicios-en-linea";

function SvgIcon({ className = "h-5 w-5", children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </SvgIcon>
  );
}

function BadgeCheckIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M7.5 3.5 12 2l4.5 1.5 3 3V11c0 5-3.5 8.5-7.5 10-4-1.5-7.5-5-7.5-10V6.5l3-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </SvgIcon>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="m20 6-11 11-5-5" />
    </SvgIcon>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </SvgIcon>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="m6 9 6 6 6-6" />
    </SvgIcon>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </SvgIcon>
  );
}

function FileCheckIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="m9 15 2 2 4-4" />
    </SvgIcon>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </SvgIcon>
  );
}

function GaugeIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M4.5 19a9 9 0 1 1 15 0" />
      <path d="M12 19v-2" />
      <path d="m12 14 4-4" />
      <path d="M7 13h1" />
      <path d="M16 13h1" />
    </SvgIcon>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </SvgIcon>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </SvgIcon>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </SvgIcon>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </SvgIcon>
  );
}

function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M16 16h1a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6-1.5A4.5 4.5 0 0 0 7 16h1" />
      <path d="M12 12v9" />
      <path d="m8 16 4-4 4 4" />
    </SvgIcon>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </SvgIcon>
  );
}

export function formatPlate(value: string): string {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const modernMatch = clean.match(/^([A-Z]{4})([0-9]{1,2})$/);
  const oldMatch = clean.match(/^([A-Z]{2})([0-9]{1,4})$/);

  if (modernMatch) return `${modernMatch[1]}-${modernMatch[2]}`;
  if (oldMatch) return `${oldMatch[1]}-${oldMatch[2]}`;
  return clean;
}

export function isValidEmailAddress(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

export function canSubmitForm(params: { name: string; email: string; plate: string; accepted: boolean; fileName: string }): boolean {
  return params.name.trim().length >= 3 && isValidEmailAddress(params.email) && params.plate.length >= 5 && params.accepted && Boolean(params.fileName);
}

export function runLandingPageSelfTests(): boolean {
  const tests = [
    formatPlate("abcd12") === "ABCD-12",
    formatPlate("ab1234") === "AB-1234",
    formatPlate("ab cd 12") === "ABCD-12",
    formatPlate("a!b@1#2$3%4") === "AB-1234",
    formatPlate("ZZZZ99") === "ZZZZ-99",
    isValidEmailAddress("persona@correo.cl") === true,
    isValidEmailAddress("persona-correo.cl") === false,
    canSubmitForm({ name: "Juan Pérez", email: "juan@correo.cl", plate: "ABCD-12", accepted: true, fileName: "certificado.pdf" }) === true,
    canSubmitForm({ name: "JP", email: "juan@correo.cl", plate: "ABCD-12", accepted: true, fileName: "certificado.pdf" }) === false,
    REGISTRO_CIVIL_URL.includes("registrocivil.cl") === true,
    PROCEDURE_SAVINGS.length > 0,
    TOTAL_OPPORTUNITY.length > 0,
  ];

  return tests.every(Boolean);
}

function Header() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Cómo funciona", href: "#como-funciona" },
    { label: "Servicio", href: "#servicio" },
    { label: "Preguntas", href: "#preguntas" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#inicio" className="flex items-center gap-3" aria-label="Ir al inicio">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <ShieldCheckIcon className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-black tracking-tight text-slate-950 sm:text-lg">Prescribe tu Multa</p>
            <p className="hidden text-xs font-medium text-slate-500 lg:block">Informe documental automatizado</p>
          </div>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-semibold text-slate-600 transition hover:text-blue-600">
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#analizar"
          className="hidden items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 md:inline-flex"
        >
          Analizar mi certificado
          <ArrowRightIcon className="h-4 w-4" />
        </a>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {links.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {link.label}
              </a>
            ))}
            <a href="#analizar" onClick={() => setOpen(false)} className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white">
              Analizar mi certificado
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function HeroForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plate, setPlate] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [fileName, setFileName] = useState("");
  const [showDemo, setShowDemo] = useState(true);
  const [error, setError] = useState("");
  const canSubmit = canSubmitForm({ name, email, plate, accepted, fileName });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Completa todos los campos, sube el PDF y acepta las condiciones para continuar.");
      setShowDemo(true);
      return;
    }

    setError("");
    setShowDemo(true);
  }

  return (
    <div id="analizar" className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 sm:p-6 lg:sticky lg:top-20">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
          Análisis preliminar
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Analiza gratis tu certificado</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Carga el certificado y revisa si existen multas que podrían solicitar prescripción. Abajo puedes ver una vista previa del resultado preliminar.
        </p>
      </div>

      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-bold text-slate-800">
            Nombre completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Juan Pérez"
            autoComplete="name"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-slate-800">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ejemplo@correo.com"
            autoComplete="email"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="plate" className="mb-1.5 block text-sm font-bold text-slate-800">
            Patente
          </label>
          <input
            id="plate"
            name="plate"
            type="text"
            value={plate}
            onChange={(event) => setPlate(formatPlate(event.target.value))}
            placeholder="Ej: ABCD12"
            maxLength={7}
            autoComplete="off"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black uppercase tracking-wider outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="certificate" className="mb-1.5 block text-sm font-bold text-slate-800">
            Certificado PDF
          </label>
          <label
            htmlFor="certificate"
            className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center transition hover:border-blue-400 hover:bg-blue-50"
          >
            <UploadCloudIcon className="mb-3 h-10 w-10 text-slate-400 transition group-hover:text-blue-600" />
            <span className="text-sm font-bold text-slate-800">{fileName || "Sube tu certificado de multas"}</span>
            <span className="mt-1 text-xs text-slate-500">Solo PDF. Máx. 10 MB.</span>
            <input
              id="certificate"
              name="certificate"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
          </label>

          <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">¿No tienes el certificado?</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Puedes obtenerlo en el Registro Civil y luego subirlo aquí para analizarlo.</p>
              </div>
              <a
                href={REGISTRO_CIVIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
              >
                Obtener certificado
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer gap-3 rounded-2xl bg-blue-50 p-4 text-xs leading-relaxed text-blue-950">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            Consiento el tratamiento de mis datos personales para realizar el análisis del certificado, generar el informe y enviarlo al correo indicado. Entiendo que este servicio corresponde a un producto documental automatizado y que no incluye representación judicial, patrocinio profesional, presentación ante tribunales, seguimiento ni garantía de resultado.
          </span>
        </label>

        {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <button type="submit" className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700">
          Analizar ahora
          <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-1" />
        </button>

        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
          <LockIcon className="h-4 w-4 text-blue-600" />
          Tu información se usa solo para este análisis.
        </div>
      </form>

      {showDemo ? <PreliminaryResult /> : null}
    </div>
  );
}

function PreliminaryResult() {
  return (
    <div className="mt-6 overflow-hidden rounded-[1.7rem] border border-emerald-200 bg-emerald-50 shadow-lg shadow-emerald-900/5">
      <div className="bg-gradient-to-br from-emerald-600 to-blue-600 p-5 text-white">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5" />
          <p className="text-sm font-black uppercase tracking-[0.16em]">Vista previa del resultado preliminar</p>
        </div>
        <h3 className="text-2xl font-black tracking-tight">Tienes multas que podrían estar prescritas</h3>
        <p className="mt-2 text-sm leading-relaxed text-emerald-50">
          Se detectaron multas que podrían encontrarse en condiciones de solicitar prescripción. Si la solicitud es acogida, podrías evitar pagar el monto asociado a esas multas.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-[1.4rem] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Podrías ahorrarte en multas</p>
          <p className="mt-1 text-5xl font-black tracking-tight text-emerald-600">{DEMO_AMOUNT}</p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">Monto potencial asociado a multas revisables según el certificado aportado.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Tramitación personal</p>
            <p className="mt-1 text-2xl font-black text-blue-700">{PROCEDURE_SAVINGS}</p>
            <p className="mt-2 text-xs leading-relaxed text-blue-950/75">Referencia de ahorro potencial al gestionar personalmente, sin contratar una tramitación completa por abogado.</p>
          </div>

          <div className="rounded-[1.25rem] border border-emerald-100 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Oportunidad total referencial</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">{TOTAL_OPPORTUNITY}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Suma comercial estimada entre multas revisables y posible ahorro por tramitación personal.</p>
          </div>
        </div>

        <div className="rounded-[1.25rem] bg-white p-4 text-center shadow-sm">
          <p className="text-sm font-black text-slate-950">Compra tu informe y recíbelo por correo</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Recibe dentro de 24 horas el detalle de las multas revisables, monto asociado, borradores editables e instrucciones básicas para presentar personalmente.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700">
            Comprar informe completo
            <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-1" />
          </button>

          <a href={REGISTRO_CIVIL_URL} target="_blank" rel="noopener noreferrer" className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50">
            Obtener certificado
            <ExternalLinkIcon className="h-5 w-5" />
          </a>
        </div>

        <p className="text-[11px] leading-relaxed text-emerald-950/75">
          Los montos son referenciales y no constituyen garantía de eliminación, rebaja o extinción de multas. La declaración de prescripción depende de la solicitud que realice la persona interesada y de la decisión del tribunal competente.
        </p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,#dbeafe,transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-blue-100/80 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-5 sm:px-6 sm:pb-14 sm:pt-7 lg:grid-cols-[1.03fr_0.97fr] lg:items-start lg:px-8 lg:pb-16 lg:pt-10">
        <div className="flex flex-col justify-start">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 shadow-sm">
            <BadgeCheckIcon className="h-4 w-4" />
            Multas de tránsito informadas al Registro
          </div>

          <h1 className="max-w-3xl text-[2.65rem] font-black leading-[0.92] tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-7xl">
            Tienes multas que podrían estar <span className="text-blue-600">prescritas</span>
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg lg:text-xl">
            Descubre el monto asociado y obtén tu informe para solicitar la prescripción personalmente.
          </p>

          <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-white p-6 shadow-xl shadow-emerald-900/5">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-100" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <GaugeIcon className="h-6 w-6" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-700">Monto potencial asociado</p>
                <p className="mt-2 text-5xl font-black tracking-tight text-emerald-600">{DEMO_AMOUNT}</p>
                <p className="mt-2 text-sm font-bold text-slate-600">Podrías ahorrarte este monto.</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-900/5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <FileCheckIcon className="h-6 w-6" />
              </div>
              <p className="text-lg font-black text-slate-950">Tramítalo tú mismo</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Obtén un informe documental y borradores editables para revisar, completar y presentar.</p>
              <div className="my-4 h-px bg-slate-100" />
              <p className="text-sm font-bold text-blue-700">Obtén tu informe en línea y recíbelo por correo dentro de 24 horas.</p>
              <p className="mt-3 rounded-2xl bg-blue-50 p-3 text-xs font-black text-blue-800">Ahorro referencial por tramitación personal: {PROCEDURE_SAVINGS}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center">
            <span className="flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-blue-600" /> Sin promesas falsas
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-blue-600" /> Basado en tu certificado
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-blue-600" /> Producto descargable
            </span>
          </div>
        </div>

        <HeroForm />
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      IconComponent: FileTextIcon,
      title: "Sube tu certificado",
      text: "Carga el certificado de multas de tránsito no pagadas en formato PDF.",
    },
    {
      IconComponent: SearchIcon,
      title: "Analizamos los antecedentes",
      text: "El sistema revisa la información contenida en el documento y detecta multas revisables.",
    },
    {
      IconComponent: FileCheckIcon,
      title: "Obtén tu informe",
      text: "Compra el informe completo y recibe por correo los documentos para solicitar la prescripción personalmente.",
    },
  ];

  return (
    <section id="como-funciona" className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">Proceso simple</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">¿Cómo funciona?</h2>
          <p className="mt-4 text-slate-600">Tres pasos, todo en línea: subes el certificado, compras el informe y lo recibes por correo dentro de 24 horas.</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <step.IconComponent className="h-7 w-7" />
                </div>
                <span className="text-5xl font-black tracking-tight text-slate-100">0{index + 1}</span>
              </div>
              <h3 className="text-xl font-black text-slate-950">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportIncludes() {
  const items = [
    "Análisis del certificado aportado",
    "Detalle de multas revisables",
    "Monto potencial asociado",
    "Borradores editables por tribunal",
    "Instrucciones básicas de presentación",
    "Advertencias y alcance del servicio",
  ];

  return (
    <section id="servicio" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">Informe completo</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Qué recibe la persona que compra</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">Un producto documental preparado con los antecedentes del certificado. No es representación judicial ni tramitación completa.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item} className="flex gap-4 rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                  <CheckIcon className="h-4 w-4" />
                </div>
                <p className="font-bold text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "¿El servicio elimina mis multas?",
      a: "No. El servicio entrega un informe documental y borradores para solicitar prescripción. La decisión depende del tribunal competente.",
    },
    {
      q: "¿Incluye representación o presentación ante tribunales?",
      a: "No. La persona usuaria debe revisar, completar y presentar personalmente los documentos ante el tribunal correspondiente.",
    },
    {
      q: "¿Sirve solo para multas TAG?",
      a: "No. Está pensado para multas de tránsito informadas al Registro de Multas No Pagadas, incluyendo partes empadronados cuando consten en el certificado.",
    },
    {
      q: "¿Cuándo recibo el informe completo?",
      a: "Una vez realizada la compra, el informe y los borradores se envían al correo electrónico indicado dentro de 24 horas.",
    },
    {
      q: "¿Qué pasa después de presentar la solicitud?",
      a: "La tramitación posterior depende del tribunal competente. Esto ocurre tanto si la solicitud la presenta una persona natural como si la presenta un abogado.",
    },
  ];

  return (
    <section id="preguntas" className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">Preguntas</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Lo básico, sin letra chica ninja</h2>
        </div>

        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <details key={faq.q} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-black text-slate-950">
                {faq.q}
                <ChevronDownIcon className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-sm leading-7 text-slate-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] bg-slate-950 shadow-2xl shadow-slate-950/20 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 sm:p-10 lg:p-12">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-300">Listo para partir</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">Revisa antes de pagar multas que podrían estar prescritas.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              Obtén un análisis preliminar gratuito y compra solo si existen multas revisables conforme al certificado aportado. El informe completo se envía a tu correo dentro de 24 horas.
            </p>
            <a href="#analizar" className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-4 text-sm font-black text-white transition hover:bg-blue-500">
              Analizar mi certificado
              <ArrowRightIcon className="h-5 w-5" />
            </a>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-emerald-500 p-8 sm:p-10 lg:p-12">
            <div className="rounded-[2rem] bg-white/95 p-6 shadow-xl">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Ejemplo de valor visible</p>
              <p className="mt-3 text-5xl font-black text-emerald-600">{DEMO_AMOUNT}</p>
              <p className="mt-3 text-sm font-semibold text-slate-600">Monto potencial asociado a multas revisables.</p>
              <div className="my-5 h-px bg-slate-200" />
              <p className="text-xs leading-6 text-slate-500">El monto indicado es referencial y se calcula sobre la base del certificado aportado. No constituye garantía de eliminación, rebaja ni extinción de multas.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <ShieldCheckIcon className="h-6 w-6" />
              </div>
              <p className="text-lg font-black text-white">Prescribe tu Multa</p>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">Servicio documental automatizado para analizar multas de tránsito informadas al Registro de Multas No Pagadas sobre la base del certificado aportado por el usuario.</p>
          </div>

          <div className="rounded-3xl bg-white/5 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Alcance del servicio</p>
            <p className="mt-3 text-xs leading-6 text-slate-400">
              Este servicio corresponde a un producto documental automatizado. No incluye representación judicial, patrocinio profesional, asesoría personalizada, presentación ante tribunales, seguimiento del trámite ni garantía de resultado. El monto potencial asociado es referencial y se calcula sobre la base de los antecedentes contenidos en el certificado aportado por el usuario.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Prescribe tu Multa. Todos los derechos reservados.</div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white font-sans text-slate-950">
      <Header />
      <Hero />
      <HowItWorks />
      <ReportIncludes />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
