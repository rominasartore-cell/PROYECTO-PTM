"use client";

import { type ChangeEvent, type DragEvent, type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  name: string;
  email: string;
  plate: string;
};

type AnalyzeResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  requestId?: string;
  request_id?: string;
  id?: string;
  redirectUrl?: string;
  url?: string;
  result?: {
    requestId?: string;
    request_id?: string;
  };
  analysis?: {
    requestId?: string;
    request_id?: string;
  };
};

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function normalizePlateInput(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function isValidPlate(value: string) {
  return /^[A-Z]{4}\d{2}$/.test(value) || /^[A-Z]{2}\d{4}$/.test(value);
}

function isPdfFile(file: File) {
  const nameLooksPdf = file.name.toLowerCase().endsWith(".pdf");
  const typeLooksPdf = file.type === "application/pdf" || file.type.includes("pdf");

  return nameLooksPdf || typeLooksPdf;
}

function getString(...values: unknown[]) {
  const found = values.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof found === "string" ? found.trim() : "";
}

async function readJsonSafely(response: Response): Promise<AnalyzeResponse | null> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as AnalyzeResponse;
  } catch {
    return {
      ok: false,
      error: text,
    };
  }
}

export function UploadForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    plate: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [consent, setConsent] = useState(false);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    if (!["name", "email", "plate"].includes(name)) return;

    const key = name as keyof FormState;

    setFormData((prev) => ({
      ...prev,
      [key]: key === "plate" ? normalizePlateInput(value) : value,
    }));
  }

  function setSelectedFile(nextFile?: File) {
    setError("");

    if (!nextFile) return;

    if (!isPdfFile(nextFile)) {
      setFile(null);
      setError("Carga un archivo PDF válido.");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setError(`El PDF no puede superar ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setFile(nextFile);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0]);
  }

  function handleDrag(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
      return;
    }

    if (event.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    setSelectedFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const plate = normalizePlateInput(formData.plate);

    setError("");

    if (!name || !email || !plate || !file) {
      setError("Completa nombre, correo, patente y PDF.");
      return;
    }

    if (!isValidPlate(plate)) {
      setError("Ingresa una patente chilena válida. Ejemplos: ABCD12 o AB1234.");
      return;
    }

    if (!consent) {
      setError("Debes aceptar el tratamiento de datos y las condiciones del análisis.");
      return;
    }

    try {
      setLoading(true);

      const body = new FormData();
      body.append("file", file);
      body.append("name", name);
      body.append("email", email);
      body.append("plate", plate);
      body.append("vehiclePlate", plate);
      body.append("patente", plate);
      body.append("consent", "true");

      const response = await fetch("/api/analyze-certificate", {
        method: "POST",
        body,
        cache: "no-store",
      });

      const payload = await readJsonSafely(response);

      if (!response.ok || payload?.ok === false) {
        throw new Error(
          payload?.error ||
            payload?.message ||
            "No se pudo procesar el certificado."
        );
      }

      const redirectUrl = getString(payload?.redirectUrl, payload?.url);
      const requestId = getString(
        payload?.requestId,
        payload?.request_id,
        payload?.id,
        payload?.result?.requestId,
        payload?.result?.request_id,
        payload?.analysis?.requestId,
        payload?.analysis?.request_id
      );

      if (redirectUrl) {
        router.push(redirectUrl);
        return;
      }

      if (requestId) {
        router.push(`/resultados/${encodeURIComponent(requestId)}`);
        return;
      }

      throw new Error("El análisis terminó, pero no se recibió código de solicitud.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el certificado.");
      setLoading(false);
    }
  }

  return (
    <section id="upload-form" className="bg-slate-50 py-20">
      <div className="container max-w-2xl">
        <div className="card">
          <div className="mb-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">
              Análisis preliminar
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">
              Analiza tu certificado
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              Sube el PDF del Certificado de Multas de Tránsito No Pagadas.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
                dragActive ? "border-blue-500 bg-emerald-50" : "border-slate-300 bg-white"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
                disabled={loading}
              />
              <label htmlFor="file-input" className="block cursor-pointer">
                {file ? (
                  <>
                    <span className="mb-2 block text-2xl" aria-hidden="true">
                      ✓
                    </span>
                    <p className="font-black text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">Haz clic para cambiar</p>
                  </>
                ) : (
                  <>
                    <span className="mb-2 block text-4xl" aria-hidden="true">
                      📄
                    </span>
                    <p className="mb-1 font-black text-slate-900">
                      Arrastra tu PDF aquí o haz clic
                    </p>
                    <p className="text-sm text-slate-500">
                      Máximo {MAX_FILE_SIZE_MB} MB.
                    </p>
                  </>
                )}
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                name="name"
                placeholder="Nombre"
                value={formData.name}
                onChange={handleInputChange}
                disabled={loading}
                autoComplete="name"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                required
              />

              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                required
              />
            </div>

            <input
              type="text"
              name="plate"
              placeholder="Patente. Ej: ABCD12 o AB1234"
              value={formData.plate}
              onChange={handleInputChange}
              disabled={loading}
              autoComplete="off"
              inputMode="text"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              required
            />

            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                disabled={loading}
                className="mt-1 h-5 w-5"
              />
              <label htmlFor="consent" className="text-sm font-medium leading-6 text-slate-700">
                Entiendo que este es un análisis informativo, que no garantiza resultado favorable y acepto el tratamiento de los datos necesarios para procesar el certificado.
              </label>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-900 py-4 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Analizando..." : "Analizar certificado gratis"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default UploadForm;
