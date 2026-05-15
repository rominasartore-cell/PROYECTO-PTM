"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type FormState = {
  rutSolicitante: string;
  profesionOficio: string;
  domicilioSolicitante: string;
  comunaSolicitante: string;
  consentAccepted: boolean;
};

const EMPTY_FORM: FormState = {
  rutSolicitante: "",
  profesionOficio: "",
  domicilioSolicitante: "",
  comunaSolicitante: "",
  consentAccepted: false,
};

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export default function ClientDocumentDataPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = useMemo(() => cleanText(params?.requestId), [params]);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!requestId) return;

      setLoading(true);
      setMessage("");

      try {
        const response = await fetch(`/api/results/${encodeURIComponent(requestId)}/client-data?ts=${Date.now()}`, {
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (!alive) return;

        if (data?.ok && data?.data) {
          setForm({
            rutSolicitante: cleanText(data.data.rut_solicitante),
            profesionOficio: cleanText(data.data.profesion_oficio),
            domicilioSolicitante: cleanText(data.data.domicilio_solicitante),
            comunaSolicitante: cleanText(data.data.comuna_solicitante),
            consentAccepted: Boolean(data.data.consent_accepted),
          });
        }

        if (!data?.ok && data?.needsDatabaseSetup) {
          setMessage("Falta configurar la tabla de datos documentales. Contacta al administrador.");
          setStatus("error");
        }
      } catch {
        if (!alive) return;
        setMessage("No se pudieron cargar los datos guardados.");
        setStatus("error");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [requestId]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!requestId) return;

    setSaving(true);
    setStatus("idle");
    setMessage("");

    try {
      const response = await fetch(`/api/results/${encodeURIComponent(requestId)}/client-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        const detail = Array.isArray(data?.errors) ? data.errors.join(" ") : data?.error;
        throw new Error(detail || "No se pudieron guardar los datos.");
      }

      setStatus("saved");
      setMessage("Datos guardados correctamente. Con esto se pueden preparar tus documentos.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudieron guardar los datos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <section className="mx-auto max-w-3xl rounded-3xl border border-emerald-400/20 bg-slate-900/80 p-6 shadow-2xl shadow-emerald-950/30 sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
            Prescribe tu Multa
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Completa tus datos para documentos
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Estos datos se usan solo para personalizar el informe y los borradores de solicitud.
            No cambia el resultado del analisis ni garantiza una resolucion favorable del tribunal.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p>
            <span className="font-bold text-slate-100">Solicitud:</span>{" "}
            <span className="font-mono">{requestId || "sin requestId"}</span>
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 text-sm text-slate-300">
            Cargando datos...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-slate-100">RUT solicitante</span>
              <input
                value={form.rutSolicitante}
                onChange={(event) => updateField("rutSolicitante", event.target.value)}
                placeholder="12.345.678-9"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-emerald-400/40 transition focus:border-emerald-300 focus:ring-4"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-100">Profesion u oficio</span>
              <input
                value={form.profesionOficio}
                onChange={(event) => updateField("profesionOficio", event.target.value)}
                placeholder="Ej.: contador, tecnico, comerciante, estudiante"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-emerald-400/40 transition focus:border-emerald-300 focus:ring-4"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-100">Domicilio</span>
              <input
                value={form.domicilioSolicitante}
                onChange={(event) => updateField("domicilioSolicitante", event.target.value)}
                placeholder="Calle, numero, departamento si corresponde"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-emerald-400/40 transition focus:border-emerald-300 focus:ring-4"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-100">Comuna</span>
              <input
                value={form.comunaSolicitante}
                onChange={(event) => updateField("comunaSolicitante", event.target.value)}
                placeholder="Ej.: Santiago, Maipu, Puente Alto"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-emerald-400/40 transition focus:border-emerald-300 focus:ring-4"
              />
            </label>

            <label className="flex gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
              <input
                type="checkbox"
                checked={form.consentAccepted}
                onChange={(event) => updateField("consentAccepted", event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Declaro que los datos ingresados son correctos y autorizo su uso para preparar
                documentos asociados a mi solicitud. Entiendo que el servicio no incluye
                representacion judicial, presentacion ante tribunales, seguimiento ni garantia de resultado.
              </span>
            </label>

            {message ? (
              <div
                className={
                  status === "saved"
                    ? "rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"
                    : "rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100"
                }
              >
                {message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar datos"}
              </button>

              <Link
                href={`/resultados/${encodeURIComponent(requestId)}`}
                className="rounded-2xl border border-slate-600 px-6 py-3 text-center text-sm font-bold text-slate-100 transition hover:bg-slate-800"
              >
                Volver al resultado
              </Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}