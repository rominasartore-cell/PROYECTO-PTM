"use client";

import PreliminaryResultCard from "@/components/ptm/PreliminaryResultCard";
import { trackAnalysisCompleted, trackAnalysisStarted } from "@/lib/analytics";
import Image from "next/image";
import { useRef, useState } from "react";

type AnalysisResult = {
  totalMultas: number;
  multasSusceptibles: number;
  multasDentroPlazo: number;
  multasRevisionManual: number;
  montoPotencial: number;
  montoPotencialUtm?: number;
  valorUtm?: number;
  ahorroTramitacion: number;
  oportunidadTotalReferencial: number;
  eligible: boolean;
  logs?: unknown[];
  requestId?: string;
  request_id?: string;
  quoteToken?: string;
  quote_token?: string;
  name?: string;
  email?: string;
  plate?: string;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const REGISTRO_CIVIL_URL = "https://www.registrocivil.cl/";
const PROCEDURE_SAVINGS_NUMBER = 250000;

function formatPlate(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

  if (/^[A-Z]{4}[0-9]{2}$/.test(cleaned)) {
    return cleaned.slice(0, 4) + "-" + cleaned.slice(4);
  }

  if (/^[A-Z]{2}[0-9]{4}$/.test(cleaned)) {
    return cleaned.slice(0, 2) + "-" + cleaned.slice(2);
  }

  return cleaned;
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    let cleaned = value.replace(/[^\d,.-]/g, "").trim();

    if (!cleaned) return fallback;

    if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function normalizeAnalysisResult(input: unknown): AnalysisResult {
  const raw = asObject(input);
  const resumen = asObject(raw.resumen);
  const result = asObject(raw.result);
  const analysis = asObject(raw.analysis);
  const analysisResult = asObject(raw.analysisResult);
  const preliminaryResult = asObject(raw.preliminaryResult);
  const data = asObject(raw.data);

  const logs =
    Array.isArray(raw.logs)
      ? raw.logs
      : Array.isArray(result.logs)
        ? result.logs
        : Array.isArray(analysis.logs)
          ? analysis.logs
          : Array.isArray(analysisResult.logs)
            ? analysisResult.logs
            : Array.isArray(preliminaryResult.logs)
              ? preliminaryResult.logs
              : Array.isArray(data.logs)
                ? data.logs
                : [];

  const reviewableFromLogs = logs.filter((fine: any) => {
    return (
      fine?.prescripciónPorFecha === true ||
      fine?.estado === "POTENCIALMENTE_PRESCRITA" ||
      fine?.status === "reviewable" ||
      fine?.isReviewable === true ||
      fine?.isPrescribed === true
    );
  });

  const manualReviewFromLogs = logs.filter((fine: any) => {
    return (
      fine?.estado === "REVISION_MANUAL" ||
      fine?.status === "manual_review" ||
      fine?.requiresManualReview === true
    );
  });

  const totalMultas = toNumber(
    resumen.multasTotalesDetectadas ??
      result.multasTotalesDetectadas ??
      analysis.multasTotalesDetectadas ??
      analysisResult.multasTotalesDetectadas ??
      preliminaryResult.multasTotalesDetectadas ??
      data.multasTotalesDetectadas ??
      raw.multasTotalesDetectadas ??
      raw.totalMultas ??
      raw.multasTotales ??
      raw.totalFinesDetected ??
      logs.length
  );

  const multasSusceptibles = toNumber(
    resumen.multasPotencialmentePrescritas ??
      result.multasPotencialmentePrescritas ??
      analysis.multasPotencialmentePrescritas ??
      analysisResult.multasPotencialmentePrescritas ??
      preliminaryResult.multasPotencialmentePrescritas ??
      data.multasPotencialmentePrescritas ??
      raw.multasPotencialmentePrescritas ??
      raw.multasPrescritas ??
      raw.prescribedCount ??
      raw.prescribedFinesCount ??
      raw.multasSusceptibles ??
      reviewableFromLogs.length
  );

  const multasRevisionManual = toNumber(
    resumen.multasPrescritasRevisionManual ??
      result.multasPrescritasRevisionManual ??
      analysis.multasPrescritasRevisionManual ??
      analysisResult.multasPrescritasRevisionManual ??
      preliminaryResult.multasPrescritasRevisionManual ??
      data.multasPrescritasRevisionManual ??
      raw.multasPrescritasRevisionManual ??
      raw.multasRevisionManual ??
      raw.manualReviewCount ??
      manualReviewFromLogs.length
  );

  const montoPotencialUtm = toNumber(
    resumen.sumaTotalUtmPrescritas ??
      result.sumaTotalUtmPrescritas ??
      analysis.sumaTotalUtmPrescritas ??
      analysisResult.sumaTotalUtmPrescritas ??
      preliminaryResult.sumaTotalUtmPrescritas ??
      data.sumaTotalUtmPrescritas ??
      raw.sumaTotalUtmPrescritas ??
      raw.totalUtmPrescritas ??
      raw.montoPotencialUtm
  );

  const valorUtm = toNumber(
    resumen.valorUtmUsado ??
      result.valorUtmUsado ??
      analysis.valorUtmUsado ??
      analysisResult.valorUtmUsado ??
      preliminaryResult.valorUtmUsado ??
      data.valorUtmUsado ??
      raw.valorUtmUsado ??
      raw.valorUtmClp ??
      raw.utmClp ??
      raw.valorUtm,
    70588
  );

  const montoPotencial = toNumber(
    resumen.montoPotencialPesos ??
      result.montoPotencialPesos ??
      analysis.montoPotencialPesos ??
      analysisResult.montoPotencialPesos ??
      preliminaryResult.montoPotencialPesos ??
      data.montoPotencialPesos ??
      raw.montoPotencialPesos ??
      raw.montoPotencialClp ??
      raw.montoTotalPrescrito ??
      raw.potentialSavingsAmount ??
      raw.montoPotencial ??
      Math.round(montoPotencialUtm * valorUtm)
  );

  const ahorroTramitacion = toNumber(
    resumen.ahorroReferencialTramitacionPersonalAbogado ??
      result.ahorroReferencialTramitacionPersonalAbogado ??
      analysis.ahorroReferencialTramitacionPersonalAbogado ??
      analysisResult.ahorroReferencialTramitacionPersonalAbogado ??
      preliminaryResult.ahorroReferencialTramitacionPersonalAbogado ??
      data.ahorroReferencialTramitacionPersonalAbogado ??
      raw.ahorroReferencialTramitacionPersonalAbogado ??
      raw.ahorroReferencial ??
      raw.ahorroTramitacion,
    PROCEDURE_SAVINGS_NUMBER
  );

  const oportunidadTotalReferencial = toNumber(
    resumen.totalReferencial ??
      result.totalReferencial ??
      analysis.totalReferencial ??
      analysisResult.totalReferencial ??
      preliminaryResult.totalReferencial ??
      data.totalReferencial ??
      raw.totalReferencial ??
      raw.oportunidadTotalReferencial ??
      montoPotencial + ahorroTramitacion
  );

  return {
    totalMultas,
    multasSusceptibles,
    multasDentroPlazo: Math.max(totalMultas - multasSusceptibles - multasRevisionManual, 0),
    multasRevisionManual,
    montoPotencial,
    montoPotencialUtm,
    valorUtm,
    ahorroTramitacion,
    oportunidadTotalReferencial,
    eligible: multasSusceptibles > 0,
    logs,
  };
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
      />
    </label>
  );
}

function Header() {
  const navItems = [
    { label: "Cómo funciona", href: "#como-funciona" },
    { label: "Precio", href: "#servicio" },
    { label: "Preguntas frecuentes", href: "#preguntas" },
    { label: "Contacto", href: "/contacto" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center">
          <Image
            src="/logo-prescribe-tu-multa.png"
            alt="Prescribe tu Multa"
            width={260}
            height={99}
            priority
            className="h-12 w-auto object-contain sm:h-14"
          />
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-black text-slate-700 transition hover:text-emerald-700"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="#analizar"
          className="hidden rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-700/25 transition hover:from-emerald-800 hover:to-teal-800 sm:inline-flex"
        >
          Analizar mi multa
        </a>
      </div>
    </header>
  );
}

function Hero({
  result,
  setResult,
  resultRef,
}: {
  result: AnalysisResult | null;
  setResult: (result: AnalysisResult | null) => void;
  resultRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
      <div className="absolute right-[-12rem] top-[-10rem] hidden h-[32rem] w-[32rem] rounded-full bg-emerald-200/30 blur-3xl lg:block" />

      <div className="relative mx-auto grid w-full max-w-7xl items-start gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-14">
        <div className="pt-2 lg:pt-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/90 px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
            <span className="text-emerald-700">⚖</span>
            Servicio legal especializado en multas de tránsito en Chile
          </div>

          <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            ¿Tienes multas que podrían estar prescritas?
          </h1>

          <p className="mt-4 text-xl font-black leading-tight text-emerald-700 sm:text-2xl">
            Analiza tu certificado al instante
          </p>

          <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-700">
            Sube tu certificado y obtén un resultado preliminar inmediato de tus multas.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <Feature title="100% online" />
            <Feature title="Resultado inmediato" />
            <Feature title="Documental" subtitle="Informe y solicitudes editables" />
          </div>

          <div className="mt-8 rounded-3xl border border-teal-200 bg-teal-50 p-5 text-sm leading-7 text-teal-950">
            <p className="font-black">Importante</p>
            <p className="mt-1">
              El servicio no elimina multas automáticamente ni garantiza resultado. Entrega análisis documental, informe y solicitudes editables para tramitación personal.
            </p>
          </div>
<HowItWorks />
        </div>

        <div id="analizar" className="scroll-mt-28">
          <div className="rounded-[2rem] border border-emerald-200 bg-white p-5 shadow-2xl shadow-emerald-950/15 ring-1 ring-emerald-100 sm:p-7">
            <AnalysisForm result={result} setResult={setResult} resultRef={resultRef} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
        ✓
      </div>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        {subtitle ? <p className="text-xs font-semibold text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Sube tu certificado",
      text: "Adjunta el Certificado de Multas de Tránsito No Pagadas en PDF.",
      color: "bg-slate-950",
    },
    {
      n: "2",
      title: "Revisamos los antecedentes",
      text: "El sistema identifica multas y posibles antecedentes de prescripción.",
      color: "bg-emerald-700",
    },
    {
      n: "3",
      title: "Obtén tu resultado preliminar",
      text: "Luego puedes comprar el informe completo con solicitudes editables.",
      color: "bg-teal-700",
    },
  ];

  return (
    <div id="como-funciona" className="mt-5 rounded-3xl border border-emerald-200 bg-white/90 p-5 shadow-lg shadow-emerald-950/5">
      <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
        Cómo funciona
      </p>

      <div className="mt-4 grid gap-3">
        {steps.map((step) => (
          <div key={step.n} className="flex gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step.color} text-xs font-black text-white`}>
              {step.n}
            </span>
            <div>
              <p className="text-sm font-black text-slate-950">{step.title}</p>
              <p className="text-xs font-semibold leading-5 text-slate-600">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisForm({
  result,
  setResult,
  resultRef,
}: {
  result: AnalysisResult | null;
  setResult: (result: AnalysisResult | null) => void;
  resultRef: React.RefObject<HTMLDivElement>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plate, setPlate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    name.trim().length >= 3 &&
    isValidEmailAddress(email) &&
    plate.trim().length >= 6 &&
    accepted &&
    !!file;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setError("");
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setError("El archivo debe ser PDF.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setError("El archivo supera el máximo de 10 MB.");
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    trackAnalysisStarted({
      has_file: Boolean(file),
      plate_length: plate.trim().length,
    });

    if (!canSubmit || !file) {
      setError("Completa todos los campos y acepta el consentimiento.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("certificate", file);
      formData.append("name", name.trim());
      formData.append("email", email.trim());
      formData.append("plate", plate.trim());

      const response = await fetch("/api/analyze-certificate", {
        method: "POST",
        body: formData,
      });

      const raw = await response.json();

      if (!response.ok || raw.ok === false) {
        throw new Error(raw.error || "No se pudo analizar el certificado.");
      }

      const normalized = normalizeAnalysisResult(raw);
      const rawAny = raw as any;
      const normalizedAny = normalized as any;

      const analysisRequestId = String(
        rawAny?.requestId ||
          rawAny?.request_id ||
          rawAny?.solicitudId ||
          rawAny?.id ||
          rawAny?.result?.requestId ||
          rawAny?.result?.request_id ||
          rawAny?.analysis?.requestId ||
          rawAny?.analysis?.request_id ||
          rawAny?.quote?.requestId ||
          rawAny?.quote?.request_id ||
          normalizedAny?.requestId ||
          normalizedAny?.request_id ||
          ""
      ).trim();

      const enrichedResult: AnalysisResult = {
        ...normalized,
        requestId: analysisRequestId,
        request_id: analysisRequestId,
        quoteToken: analysisRequestId,
        quote_token: analysisRequestId,
        name: name.trim(),
        email: email.trim(),
        plate: plate.trim(),
      };

      setResult(enrichedResult);

      trackAnalysisCompleted({
        total_multas: normalized.totalMultas,
        multas_susceptibles: normalized.multasSusceptibles,
        monto_potencial: normalized.montoPotencial,
        eligible: normalized.eligible,
        request_id: analysisRequestId,
      });

      console.info("[PTM Analytics] requestId análisis:", analysisRequestId);

      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Ocurrió un error al analizar el certificado."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <section id="analizar" className="space-y-6">
      <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-7">
        <div>
          <div className="mb-2 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-teal-700">
            Análisis preliminar
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            Analiza gratis tu certificado
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Carga el certificado y revisa si existen multas respecto de las cuales podrías solicitar prescripción.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField
            id="name"
            label="Nombre completo"
            value={name}
            onChange={setName}
            placeholder="Ej: Juan Pérez"
            autoComplete="name"
          />

          <TextField
            id="email"
            label="Correo electrónico"
            value={email}
            onChange={setEmail}
            placeholder="ejemplo@correo.com"
            type="email"
            autoComplete="email"
          />

          <TextField
            id="plate"
            label="Patente"
            value={plate}
            onChange={(value) => setPlate(formatPlate(value))}
            placeholder="Ej: ABCD12"
            maxLength={7}
          />

          <label
            htmlFor="certificate"
            className="group flex cursor-pointer flex-col justify-center rounded-3xl border-2 border-dashed border-teal-200 bg-teal-50/40 p-6 text-center transition hover:border-emerald-400 hover:bg-teal-50"
          >
            <div className="mb-3 text-4xl text-slate-400 transition group-hover:text-teal-600">
              {"\u2b06"}
            </div>
            <span className="text-sm font-bold text-slate-800">
              {file?.name || "Sube tu certificado de multas"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Solo PDF. Máx. 10 MB.
            </span>
            <input
              id="certificate"
              name="certificate"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
            <p className="text-sm font-black text-slate-900">¿No tienes el certificado?</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Puedes obtenerlo en el Registro Civil y luego subirlo aquí para analizarlo.
            </p>
            <a
              href={REGISTRO_CIVIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-xs font-black text-teal-700"
            >
              Obtener certificado {"\u2197"}
            </a>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600"
            />
            <span>
              Consiento el tratamiento de mis datos personales para realizar el análisis del certificado, generar el informe y enviarlo al correo indicado. Entiendo que no incluye representación judicial, patrocinio profesional, presentación ante tribunales, seguimiento ni garantía de resultado.
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-800">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || isAnalyzing}
            className="flex w-full justify-center rounded-2xl bg-emerald-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-700/25 transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isAnalyzing ? "Analizando certificado..." : <>Analizar ahora {"\u2192"}</>}
          </button>

          <div className="flex justify-center gap-2 text-xs font-semibold text-slate-500">
            {"\u{1f512}"} Tu información se usa solo para este análisis.
          </div>
        </form>
      </div>

      {result ? (
        <PreliminaryResult
          result={result}
          name={name}
          email={email}
          plate={plate}
          resultRef={resultRef}
        />
      ) : null}
    </section>
  );
}

function PreliminaryResult({
  result,
  name,
  email,
  plate,
  resultRef,
}: {
  result: AnalysisResult;
  name: string;
  email: string;
  plate: string;
  resultRef: React.RefObject<HTMLDivElement>;
}) {
  const requestId = result.requestId || result.request_id || "";
  const quoteToken = result.quoteToken || result.quote_token || requestId;

  const paymentPayload = {
    requestId,
    request_id: requestId,
    quoteToken,
    quote_token: quoteToken,
    name,
    email,
    plate,
    totalMultas: result.totalMultas,
    multasSusceptibles: result.multasSusceptibles,
    montoPotencial: result.montoPotencial,
    montoPotencialUtm: result.montoPotencialUtm,
    valorUtm: result.valorUtm,
    analysisResult: result,
  };

  return (
    <div ref={resultRef} id="resultado-preliminar" className="scroll-mt-28">
      <PreliminaryResultCard
        result={result}
        eligible={result.eligible}
        requestId={requestId}
        quoteToken={quoteToken}
        paymentPayload={paymentPayload}
      />
    </div>
  );
}

function ReportIncludes() {
  const items = [
    "Informe de análisis del certificado aportado",
    "Detalle de multas detectadas y revisables",
    "Identificación de multas potencialmente prescritas",
    "Solicitudes editables de prescripción",
    "Guía de tramitación personal paso a paso",
    "Advertencias, límites y alcance del servicio",
  ];

  return (
    <section id="servicio" className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
            Producto
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Informe completo + solicitudes editables
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Un producto documental preparado con los antecedentes del certificado aportado. No incluye representación judicial ni tramitación completa.
          </p>
          <div className="mt-5 inline-flex flex-col rounded-[2rem] border border-emerald-300 bg-slate-950 px-6 py-5 shadow-2xl shadow-emerald-950/25">
            <span className="inline-flex w-fit rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Oferta de lanzamiento
            </span>
            <span className="mt-3 text-6xl font-black tracking-tight text-emerald-300">
              $9.990 <span className="align-middle text-base font-black text-emerald-100">CLP</span>
            </span>
            <span className="mt-2 text-xs font-bold text-emerald-100/90">
              Precio único por informe completo + solicitudes editables
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="flex gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-black text-white">
                ✓
              </div>
              <p className="font-bold leading-6 text-slate-800">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const questions = [
    {
      q: "¿Este servicio elimina mis multas?",
      a: "No. El servicio entrega un informe documental y solicitudes editables para solicitar la prescripción. La decisión depende del tribunal competente.",
    },
    {
      q: "¿El servicio incluye representación o presentación ante tribunales?",
      a: "No. La persona usuaria debe revisar, completar y presentar personalmente los documentos ante el tribunal correspondiente.",
    },
    {
      q: "¿Sirve solo para multas TAG?",
      a: "No. Está pensado para multas de tránsito informadas al Registro de Multas No Pagadas, incluyendo partes empadronados cuando consten en el certificado.",
    },
    {
      q: "¿Cuándo recibo el informe completo?",
      a: "Una vez realizada la compra, el informe y las solicitudes editables se envían al correo electrónico indicado. Revisa también la carpeta de spam, promociones o correo no deseado.",
    },
    {
      q: "¿Qué hago si compré y no recibí el correo?",
      a: "Primero revisa spam, promociones o correo no deseado. Si el pago fue confirmado y no recibiste el correo, contacta a soporte para solicitar el reenvío.",
    },
  ];

  return (
    <section id="preguntas" className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
            Preguntas frecuentes
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Lo básico, sin letra chica
          </h2>
        </div>

        <div className="mt-10 space-y-4">
          {questions.map((item) => (
            <details key={item.q} className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <summary className="flex cursor-pointer list-none justify-between gap-4 text-base font-black text-slate-950">
                {item.q}
                <span className="text-emerald-700">⌄</span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 py-10 text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_2fr_1fr] lg:px-8">
        <div>
          <p className="text-sm font-black text-white">Prescribe tu Multa</p>
          <p className="mt-2 text-xs leading-6 text-slate-400">
            Servicio legal documental especializado en multas de tránsito en Chile.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-x-8 gap-y-3 text-xs text-slate-400 lg:justify-center">
          <a href="/terminos-y-condiciones" className="transition hover:text-white">
            Términos y Condiciones
          </a>
          <a href="/politica-de-privacidad" className="transition hover:text-white">
            Política de Privacidad
          </a>
          <a href="/politica-de-reembolso" className="transition hover:text-white">
            Política de Reembolso
          </a>
          <a href="/contacto" className="transition hover:text-white">
            Contacto
          </a>
        </div>

        <div className="text-xs leading-6 text-slate-500 lg:text-right">
          © {new Date().getFullYear()} Prescribe tu Multa. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}

export default function Page() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Header />
      <Hero result={result} setResult={setResult} resultRef={resultRef} />

      <section className="bg-gradient-to-b from-emerald-50/70 to-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl" />
      </section>

      <ReportIncludes />
      <FAQ />
      <Footer />
    </main>
  );
}