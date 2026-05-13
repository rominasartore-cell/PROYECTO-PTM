"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type AdminRequest = {
  request_id: string;
  source?: "analysis" | "payment_only";
  customer_name?: string | null;
  customer_email?: string | null;
  vehicle_plate?: string | null;
  status?: string | null;
  fine_count?: number | null;
  prescribed_count?: number | null;
  total_amount_utm?: number | null;
  utm_value_clp?: number | null;
  payment_status?: string | null;
  purchase_status?: string | null;
  payment_amount?: number | null;
  payment_paid_at?: string | null;
  payment_id?: string | null;
  preference_id?: string | null;
  payment_customer_email?: string | null;
  payment_mock?: boolean;
  payment_sandbox?: boolean;
  payment_supabase_record?: boolean;
  payment_local_record?: boolean;
  local_only?: boolean;
  raw_analysis_json?: unknown;
  internal_notes?: string | null;
  pdf_path?: string | null;
  pdf_filename?: string | null;
  pdf_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  payment?: {
    requestId?: string;
    externalReference?: string | null;
    status?: string | null;
    rawStatus?: string | null;
    statusDetail?: string | null;
    amount?: number | null;
    paidAt?: string | null;
    paymentId?: string | null;
    preferenceId?: string | null;
    customerEmail?: string | null;
    customerName?: string | null;
    plate?: string | null;
    product?: string | null;
    mock?: boolean;
    sandbox?: boolean;
    checkoutUrl?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
    events?: unknown[];
  } | null;
};

function money(value: unknown): string {
  const amount = Number(value || 0);
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function dateText(value?: string | null): string {
  if (!value) return "Sin fecha";

  try {
    return new Date(value).toLocaleString("es-CL");
  } catch {
    return value;
  }
}

function statusLabel(value?: string | null): string {
  const status = String(value || "").toLowerCase();

  if (status === "approved") return "Aprobado / pagado";
  if (status === "pending" || status === "created" || status === "processing") return "Pendiente";
  if (status === "rejected" || status === "failed") return "Rechazado";

  return status || "Sin estado";
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-200">
      {children}
    </span>
  );
}

export default function AdminRequestDetailPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();

  const requestId = params?.requestId;
  const [request, setRequest] = useState<AdminRequest | null>(null);
  const [notes, setNotes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRequest() {
    if (!requestId) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}?ts=${Date.now()}`, {
        cache: "no-store",
      });

      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error || "No se pudo cargar la solicitud");
      }

      setRequest(json.request || json.data || null);
      setNotes(json.notes || []);
    } catch (err: any) {
      setError(err?.message || "Error cargando detalle");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function resendEmail() {
    if (!requestId) return;

    try {
      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/resend-email?ts=${Date.now()}`,
        { method: "POST" }
      );

      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error || "No se pudo reenviar correo");
      }

      alert(json.message || "Correo reenviado correctamente");
    } catch (err: any) {
      alert(err?.message || "Error reenviando correo");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <p>Cargando...</p>
      </main>
    );
  }

  if (error || !request) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <button onClick={() => router.push("/admin/dashboard")} className="mb-4 text-cyan-300">
          ← Volver
        </button>
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-red-100">
          {error || "Solicitud no encontrada"}
        </div>
      </main>
    );
  }

  const isPaymentOnly = request.source === "payment_only";
  const events = request.payment?.events || [];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700"
        >
          ← Volver al dashboard
        </button>

        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Detalle interno</p>
              <h1 className="mt-2 text-2xl font-black">{request.customer_name || "Cliente"}</h1>
              <p className="mt-2 text-sm text-slate-400">Request ID: {request.request_id}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>{statusLabel(request.payment_status)}</Badge>
              {isPaymentOnly && <Badge>Pago sin análisis vinculado</Badge>}
              {request.payment_mock && <Badge>Mock</Badge>}
              {request.payment_sandbox && <Badge>Sandbox</Badge>}
              {!request.payment_mock && !request.payment_sandbox && request.preference_id && <Badge>Mercado Pago real</Badge>}
              {request.payment_supabase_record && <Badge>Supabase</Badge>}
            </div>
          </div>
        </header>

        {isPaymentOnly && (
          <section className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-5 text-purple-100">
            Este registro viene desde <strong>ptm_payments</strong> y no tiene análisis vinculado en <strong>analysis_requests</strong>.
            Debe gestionarse como preferencia/pago creado sin expediente interno asociado.
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Cliente</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">Nombre</dt>
                <dd className="font-semibold">{request.customer_name || "Sin nombre"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Correo</dt>
                <dd className="font-semibold">{request.customer_email || request.payment_customer_email || "Sin correo"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Patente</dt>
                <dd className="font-semibold">{request.vehicle_plate || "Sin patente"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Creado</dt>
                <dd className="font-semibold">{dateText(request.created_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Pago</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">Estado pago</dt>
                <dd className="font-semibold">{statusLabel(request.payment_status)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Compra</dt>
                <dd className="font-semibold">{request.purchase_status || "pending"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Monto</dt>
                <dd className="font-semibold">{money(request.payment_amount || request.payment?.amount || 0)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Fecha pago</dt>
                <dd className="font-semibold">{dateText(request.payment_paid_at || request.payment?.paidAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Preference ID</dt>
                <dd className="break-all font-semibold">{request.preference_id || request.payment?.preferenceId || "Sin preference_id"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Payment ID</dt>
                <dd className="break-all font-semibold">{request.payment_id || request.payment?.paymentId || "Sin payment_id"}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={resendEmail}
              className="mt-5 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Reenviar correo
            </button>
          </div>
        </section>

        {!isPaymentOnly && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Análisis</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Multas</p>
                <p className="text-2xl font-black">{request.fine_count ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Prescribibles</p>
                <p className="text-2xl font-black">{request.prescribed_count ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Monto UTM</p>
                <p className="text-2xl font-black">{request.total_amount_utm ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-400">UTM CLP</p>
                <p className="text-2xl font-black">{request.utm_value_clp ? money(request.utm_value_clp) : "—"}</p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-black">Eventos de pago</h2>

          {events.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Sin eventos registrados.</p>
          ) : (
            <pre className="mt-4 max-h-[360px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-200">
              {JSON.stringify(events, null, 2)}
            </pre>
          )}
        </section>

        {notes.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Notas</h2>
            <pre className="mt-4 max-h-[260px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-200">
              {JSON.stringify(notes, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
