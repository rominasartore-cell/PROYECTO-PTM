"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type ApiResult = {
  ok?: boolean;
  requestId?: string;
  mock?: boolean;
  status?: string;
  paymentStatus?: string;
  result?: Record<string, any>;
  analysis?: Record<string, any>;
  analysisResult?: Record<string, any>;
  preliminaryResult?: Record<string, any>;
  data?: Record<string, any>;
  resumen?: Record<string, any>;
  metadata?: Record<string, any>;
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    let cleaned = value.replace(/[^\d,.-]/g, "").trim();
    if (!cleaned) return fallback;
    if (cleaned.includes(",")) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function Logo() {
  return (
    <a href="/" className="flex items-center gap-3" aria-label="Prescribe tu Multa">
      <div className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-blue-700 bg-white shadow-sm">
        <span className="text-3xl font-black tracking-tight text-blue-800">P</span>
        <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-xs font-black text-white">✓</span>
        <span className="absolute bottom-1 left-2 h-4 w-7 rounded-t-full border-t-4 border-blue-700" />
      </div>
      <div className="leading-none">
        <p className="text-2xl font-black tracking-tight text-blue-900">Prescribe</p>
        <p className="text-2xl font-black tracking-tight text-blue-900"><span className="text-emerald-500">tu</span> Multa</p>
      </div>
    </a>
  );
}

function Header() {
  return (
    <header className="border-b border-blue-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-12 md:flex">
          <a className="border-b-2 border-blue-600 pb-2 text-sm font-bold text-blue-700" href="/">Inicio</a>
          <a className="pb-2 text-sm font-semibold text-blue-950/75 transition hover:text-blue-700" href="/#como-funciona">Cómo funciona</a>
          <a className="pb-2 text-sm font-semibold text-blue-950/75 transition hover:text-blue-700" href="/#precios">Precios</a>
        </nav>
        <a href="/#analizar" className="hidden rounded-xl border border-blue-300 px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50 sm:inline-flex">
          Analizar certificado
        </a>
      </div>
    </header>
  );
}

function DocumentIllustration() {
  return (
    <div className="relative hidden h-56 w-80 lg:block">
      <div className="absolute left-3 top-24 h-24 w-36 rounded-t-full border-l-[28px] border-t-[28px] border-blue-100" />
      <div className="absolute right-0 top-8 h-28 w-24 rounded-[2rem] border-8 border-emerald-100 opacity-90" />
      <div className="absolute right-20 top-8 w-40 rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-950/5">
        <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 text-sm font-black text-blue-800">P</div>
        <div className="space-y-3">
          <div className="h-2 rounded-full bg-blue-100" />
          <div className="h-2 w-4/5 rounded-full bg-blue-100" />
          <div className="h-2 w-2/3 rounded-full bg-blue-100" />
        </div>
        <div className="mt-5 grid h-10 w-10 place-items-center rounded-full bg-emerald-500 text-xl font-black text-white shadow-lg shadow-emerald-600/20">✓</div>
      </div>
      <span className="absolute left-20 top-16 text-2xl text-blue-200">✦</span>
      <span className="absolute left-32 top-8 text-xl text-blue-200">✦</span>
    </div>
  );
}

function MetricCard({ icon, label, value, accent = "blue" }: { icon: string; label: string; value: string | number; accent?: "blue" | "emerald" }) {
  const color = accent === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-700";

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-950/5">
      <div className="flex items-center gap-4">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${color}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-black text-blue-950">{label}</p>
          <p className={`mt-1 text-4xl font-black tracking-tight ${accent === "emerald" ? "text-emerald-600" : "text-blue-700"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function normalizeData(apiData: ApiResult | null, requestId: string, statusFromUrl: string | null) {
  const result = asObject(apiData?.result);
  const analysis = asObject(apiData?.analysis);
  const analysisResult = asObject(apiData?.analysisResult);
  const preliminaryResult = asObject(apiData?.preliminaryResult);
  const data = asObject(apiData?.data);
  const resumen = asObject(apiData?.resumen);

  const source = {
    ...resumen,
    ...result,
    ...analysis,
    ...analysisResult,
    ...preliminaryResult,
    ...data,
  };

  const totalMultas = toNumber(
    source.multasTotalesDetectadas ?? source.totalMultas ?? source.totalFines ?? source.finesCount,
    0
  );

  const prescritas = toNumber(
    source.multasPotencialmentePrescritas ?? source.multasPrescritas ?? source.multasSusceptibles ?? source.prescribedCount,
    0
  );

  const monto = toNumber(
    source.montoPotencialPesos ?? source.montoPotencialClp ?? source.montoPotencial ?? source.totalSavings,
    0
  );

  const status = apiData?.paymentStatus || apiData?.status || statusFromUrl || "approved";

  return {
    requestId: apiData?.requestId || requestId,
    totalMultas,
    prescritas,
    monto,
    status,
  };
}

export default function ResultadosPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const requestId = String(params?.requestId || "");
  const [apiData, setApiData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResults() {
      try {
        const query = searchParams?.toString();
        const response = await fetch(`/api/results/${requestId}${query ? `?${query}` : ""}`, { cache: "no-store" });
        const json = await response.json().catch(() => ({}));

        if (!response.ok || json.ok === false) {
          throw new Error(json.message || json.error || "No se pudieron cargar los resultados.");
        }

        setApiData(json);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Error al cargar los resultados.");
      } finally {
        setLoading(false);
      }
    }

    if (requestId) loadResults();
  }, [requestId, searchParams]);

  const summary = useMemo(() => normalizeData(apiData, requestId, searchParams?.get("status")), [apiData, requestId, searchParams]);
  const approved = ["approved", "success", "aprobado"].includes(String(summary.status).toLowerCase());

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white text-blue-950">
      <Header />

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-blue-100 bg-white/95 p-6 shadow-xl shadow-blue-950/5 sm:p-10 lg:p-14">
          {loading ? (
            <div className="py-24 text-center">
              <p className="text-lg font-bold text-blue-700">Cargando resultado...</p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center text-red-700">
              <p className="text-lg font-black">No se pudo cargar el resultado</p>
              <p className="mt-2 text-sm font-semibold">{error}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="inline-flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-base font-black text-emerald-700">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-white">✓</span>
                    {approved ? "Pago aprobado" : "Solicitud registrada"}
                  </div>

                  <h1 className="mt-8 max-w-3xl text-4xl font-black leading-tight tracking-tight text-blue-950 sm:text-5xl">
                    Solicitud recibida con éxito
                  </h1>
                  <p className="mt-4 text-lg font-medium text-blue-950/65">
                    Tu informe está listo para descarga y revisión.
                  </p>
                </div>

                <DocumentIllustration />
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-3">
                <MetricCard icon="🚘" label="Multas detectadas" value={summary.totalMultas || "—"} />
                <MetricCard icon="✓" label="Potencialmente prescritas" value={summary.prescritas || "—"} accent="emerald" />
                <MetricCard icon="$" label="Monto estimado" value={summary.monto ? formatCLP(summary.monto) : "—"} />
              </div>

              <div className="mt-8 flex justify-center">
                <a href="/" className="inline-flex min-w-72 items-center justify-center gap-3 rounded-2xl border-2 border-blue-600 bg-white px-7 py-4 text-base font-black text-blue-700 transition hover:bg-blue-50">
                  <span className="text-2xl">⌂</span>
                  Volver al inicio
                </a>
              </div>

              <div className="mx-auto mt-8 flex max-w-4xl items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 px-6 py-4 text-sm font-semibold text-blue-950/65">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-blue-700 shadow-sm">▣</span>
                <p>Este informe es <strong className="text-blue-700">referencial</strong>. Para acciones legales, te recomendamos asesoría profesional.</p>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-black tracking-tight text-blue-950">¿Qué sigue ahora?</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3 md:divide-x md:divide-blue-100">
            {[
              ["1", "▤", "Revisa tu informe"],
              ["2", "⚖", "Evalúa tus opciones"],
              ["3", "♙", "Obtén respaldo legal"],
            ].map(([number, icon, text], index) => (
              <div key={number} className="flex items-center justify-center gap-4 rounded-2xl bg-white/60 p-4 md:rounded-none md:bg-transparent">
                <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${index === 1 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{number}</span>
                <span className="text-2xl text-blue-700">{icon}</span>
                <span className="text-sm font-bold text-blue-950">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-blue-100 py-8 text-center text-sm font-medium text-blue-950/50">
        © 2024 Prescribe tu Multa. Todos los derechos reservados.
      </footer>
    </main>
  );
}
