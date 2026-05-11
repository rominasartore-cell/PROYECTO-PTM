"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type RequestDetail = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  vehicle_plate: string | null;
  request_id: string;
  status: string | null;
  fine_count: number | null;
  prescribed_count: number | null;
  total_amount_utm: number | null;
  utm_value_clp: number | null;
  payment_status: string | null;
  purchase_status?: string | null;
  payment_amount?: number | null;
  payment_paid_at?: string | null;
  payment_id?: string | null;
  preference_id?: string | null;
  payment_customer_email?: string | null;
  payment_mock?: boolean;
  payment_sandbox?: boolean;
  payment_local_record?: boolean;
  local_only?: boolean;
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
    events?: Array<{
      at: string;
      type: string;
      payload?: Record<string, unknown>;
    }>;
  } | null;
  raw_analysis_json: any;
  internal_notes: string | null;
  created_at: string;
  updated_at: string | null;
  pdf_path?: string | null;
  pdf_filename?: string | null;
  pdf_url?: string | null;
};

type Note = {
  id: string;
  request_id: string;
  note: string;
  created_at: string;
};

function formatCLP(value: number | null | undefined): string {
  const safeValue = Number(value || 0);

  return safeValue.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha invalida";
  }

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "processing":
    case "pending":
      return "En proceso";
    case "completed":
    case "approved":
      return "Completada";
    case "paid":
      return "Pagada";
    case "failed":
    case "rejected":
      return "Rechazada";
    case "error":
      return "Error";
    default:
      return status || "Sin estado";
  }
}

function getStatusClass(status: string | null | undefined): string {
  switch (status) {
    case "processing":
    case "pending":
      return "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50";
    case "completed":
    case "approved":
      return "bg-blue-900/50 text-blue-300 border border-blue-700/50";
    case "paid":
      return "bg-green-900/50 text-green-300 border border-green-700/50";
    case "failed":
    case "rejected":
      return "bg-red-900/50 text-red-300 border border-red-700/50";
    default:
      return "bg-gray-700 text-gray-300 border border-gray-600";
  }
}

function getPaymentStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "approved":
    case "paid":
      return "Pago aprobado";
    case "pending":
    case "created":
    case "in_process":
      return "Pago pendiente";
    case "rejected":
    case "failed":
    case "cancelled":
    case "canceled":
      return "Pago rechazado";
    default:
      return status || "No procesado";
  }
}

function getPaymentStatusClass(status: string | null | undefined): string {
  switch (status) {
    case "approved":
    case "paid":
      return "bg-green-900/50 text-green-300 border border-green-700/50";
    case "pending":
    case "created":
    case "in_process":
      return "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50";
    case "rejected":
    case "failed":
    case "cancelled":
    case "canceled":
      return "bg-red-900/50 text-red-300 border border-red-700/50";
    default:
      return "bg-gray-700 text-gray-400 border border-gray-600";
  }
}

function Badge({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function InfoRow({
  label,
  value,
  valueClassName = "text-gray-100",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-700/60 py-3 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-right text-sm font-medium break-all ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.requestId as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, string> | null>(null);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("ptm-admin-token") ||
      localStorage.getItem("ptm-admin-session");

    if (!token) {
      router.push("/admin");
      return;
    }

    fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    if (request) {
      setNewStatus(request.status || "processing");
    }
  }, [request]);

  const fetchRequest = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
        cache: "no-store",
      });

      const payload = await res.json();

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || "Error al cargar solicitud");
      }

      const requestPayload = payload.request || payload.data;

      if (!requestPayload) {
        throw new Error("La API no devolvio la solicitud.");
      }

      const normalizedRequest = Array.isArray(requestPayload)
        ? requestPayload[0]
        : requestPayload;

      if (!normalizedRequest) {
        throw new Error("Solicitud no encontrada.");
      }

      setRequest(normalizedRequest);
      setNotes(payload.notes || []);
    } catch (err) {
      console.error("Error fetching request:", err);
      alert(err instanceof Error ? err.message : "Error al cargar solicitud");
      router.push("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!request || newStatus === request.status) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || "Error al actualizar estado");
      }

      const updatedRequest = payload.request || payload.data;

      if (updatedRequest) {
        setRequest(Array.isArray(updatedRequest) ? updatedRequest[0] : updatedRequest);
      } else {
        await fetchRequest();
      }

      alert(payload.warning || "Estado actualizado");
    } catch (err) {
      console.error("Error updating status:", err);
      alert(err instanceof Error ? err.message : "Error al actualizar estado");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDrafts = async () => {
    if (showDrafts) {
      setShowDrafts(false);
      return;
    }

    if (drafts) {
      setShowDrafts(true);
      return;
    }

    setDraftsLoading(true);

    try {
      const res = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/preview-drafts`,
        { cache: "no-store" }
      );
      const payload = await res.json();

      if (payload.ok) {
        setDrafts(payload.drafts || {});
        setShowDrafts(true);
      } else {
        alert(payload.error || "Error al generar borradores");
      }
    } catch (err) {
      console.error("Error loading drafts:", err);
      alert("Error al cargar borradores");
    } finally {
      setDraftsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || "Error al agregar nota");
      }

      const createdNote = payload.note || payload.data;

      if (createdNote) {
        setNotes((previousNotes) => [createdNote, ...previousNotes]);
      } else {
        await fetchRequest();
      }

      setNewNote("");
      alert("Nota agregada");
    } catch (err) {
      console.error("Error adding note:", err);
      alert(err instanceof Error ? err.message : "Error al agregar nota");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        Cargando solicitud...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
        <p className="mb-4 text-xl font-bold">Solicitud no encontrada</p>
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="rounded-lg bg-blue-600 px-4 py-2 font-bold hover:bg-blue-700"
        >
          Volver al dashboard
        </button>
      </div>
    );
  }

  const totalAmountClp =
    Number(request.total_amount_utm || 0) * Number(request.utm_value_clp || 0);
  const paidAmount = Number(request.payment_amount || request.payment?.amount || 0);
  const hasPdf = Boolean(request.pdf_path || request.pdf_url);
  const isLocalOnly = Boolean(request.local_only);
  const isMock = Boolean(request.payment_mock || request.payment?.mock);
  const isSandbox = Boolean(request.payment_sandbox || request.payment?.sandbox);
  const paymentEvents = request.payment?.events || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="mb-4 text-blue-400 hover:text-blue-300"
          >
            ← Volver al dashboard
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Detalle de solicitud</h1>
              <p className="mt-2 break-all text-sm text-gray-400">ID: {request.request_id}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusClass(request.status)}>
                {getStatusLabel(request.status)}
              </Badge>
              <Badge className={getPaymentStatusClass(request.payment_status)}>
                {getPaymentStatusLabel(request.payment_status)}
              </Badge>
              {isLocalOnly ? (
                <Badge className="border border-cyan-700/50 bg-cyan-900/40 text-cyan-300">
                  Solo local
                </Badge>
              ) : null}
              {isMock ? (
                <Badge className="border border-amber-700/50 bg-amber-900/40 text-amber-300">
                  Mock
                </Badge>
              ) : null}
              {isSandbox ? (
                <Badge className="border border-blue-700/50 bg-blue-900/40 text-blue-300">
                  Sandbox
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-bold">Informacion del cliente</h2>

            <div className="rounded-lg bg-gray-900/40 px-4">
              <InfoRow label="Nombre" value={request.customer_name || "Sin nombre"} />
              <InfoRow label="Correo" value={request.customer_email || "Sin correo"} />
              <InfoRow label="Patente" value={request.vehicle_plate || "Sin patente"} />
              <InfoRow label="Creada" value={formatDate(request.created_at)} />
              <InfoRow label="Actualizada" value={formatDate(request.updated_at)} />
            </div>
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-bold">Estado comercial</h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-green-700/40 bg-green-900/20 p-4">
                <p className="text-sm text-green-300">Pago</p>
                <p className="mt-2 text-2xl font-black text-green-400">
                  {getPaymentStatusLabel(request.payment_status)}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-4">
                <p className="text-sm text-emerald-300">Monto pagado</p>
                <p className="mt-2 text-2xl font-black text-emerald-400">
                  {formatCLP(paidAmount)}
                </p>
              </div>

              <div className="rounded-xl border border-blue-700/40 bg-blue-900/20 p-4">
                <p className="text-sm text-blue-300">Compra</p>
                <p className="mt-2 text-2xl font-black text-blue-400">
                  {request.purchase_status || "pending"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-gray-900/40 px-4">
              <InfoRow label="Fecha pago" value={formatDate(request.payment_paid_at || request.payment?.paidAt)} />
              <InfoRow label="Payment ID" value={request.payment_id || request.payment?.paymentId || "Sin payment ID"} />
              <InfoRow label="Preference ID" value={request.preference_id || request.payment?.preferenceId || "Sin preference ID"} />
              <InfoRow label="Correo pago" value={request.payment_customer_email || request.payment?.customerEmail || request.customer_email || "Sin correo"} />
              <InfoRow label="Origen" value={isLocalOnly ? "Registro local" : "Supabase + pago"} />
              <InfoRow label="Modo prueba" value={isMock ? "Si" : "No"} />
              <InfoRow label="Sandbox" value={isSandbox ? "Si" : "No"} />
            </div>
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-bold">Resultado del analisis</h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-900/40 p-4">
                <p className="text-sm text-gray-400">Total multas</p>
                <p className="mt-2 text-3xl font-black">{request.fine_count ?? "—"}</p>
              </div>

              <div className="rounded-xl bg-gray-900/40 p-4">
                <p className="text-sm text-gray-400">Potencialmente prescritas</p>
                <p className="mt-2 text-3xl font-black text-green-400">
                  {request.prescribed_count ?? "—"}
                </p>
              </div>

              <div className="rounded-xl bg-gray-900/40 p-4">
                <p className="text-sm text-gray-400">Monto multas</p>
                <p className="mt-2 text-2xl font-black text-emerald-400">
                  {formatCLP(totalAmountClp)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Certificado y documentos</h2>

              <button
                onClick={handleLoadDrafts}
                disabled={draftsLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              >
                {draftsLoading
                  ? "Cargando..."
                  : showDrafts
                  ? "Ocultar borradores"
                  : "Previsualizar borradores"}
              </button>
            </div>

            <div className="rounded-lg bg-gray-900/40 px-4">
              <InfoRow label="PDF" value={hasPdf ? request.pdf_filename || "certificado.pdf" : "Sin certificado asociado"} />
              <InfoRow label="Ruta PDF" value={request.pdf_path || request.pdf_url || "Sin ruta"} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {request.pdf_url ? (
                <a
                  href={request.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-600"
                >
                  Ver PDF
                </a>
              ) : null}

              <a
                href={`/api/download/${encodeURIComponent(request.request_id)}`}
                className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-600"
              >
                Descargar documentos
              </a>
            </div>

            {showDrafts && drafts ? (
              <div className="mt-5 space-y-4">
                {Object.entries(drafts).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">
                      {key}
                    </h3>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs leading-5 text-gray-200">
                      {String(value)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-bold">Eventos de pago</h2>

            {paymentEvents.length > 0 ? (
              <div className="space-y-3">
                {paymentEvents.map((event, index) => (
                  <div key={`${event.at}-${index}`} className="rounded-lg bg-gray-900/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-white">{event.type}</p>
                      <p className="text-xs text-gray-500">{formatDate(event.at)}</p>
                    </div>
                    {event.payload ? (
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 text-xs text-gray-300">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No hay eventos de pago registrados.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-bold">Gestion interna</h2>

            <label className="mb-2 block text-sm text-gray-400">
              Estado solicitud
            </label>

            <select
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="processing">En proceso</option>
              <option value="completed">Completada</option>
              <option value="failed">Fallida</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobada</option>
              <option value="rejected">Rechazada</option>
              <option value="paid">Pagada</option>
            </select>

            <button
              onClick={handleUpdateStatus}
              disabled={saving || !request || newStatus === request.status}
              className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {saving ? "Guardando..." : "Actualizar estado"}
            </button>

            {isLocalOnly ? (
              <p className="mt-3 rounded-lg border border-amber-700/50 bg-amber-900/30 p-3 text-xs text-amber-200">
                Esta solicitud existe solo en storage local. Puede verse y gestionarse parcialmente, pero los cambios permanentes deben migrarse a Supabase para produccion.
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-bold">Notas internas</h2>

            <textarea
              value={newNote}
              onChange={(event) => setNewNote(event.target.value)}
              placeholder="Agregar nota interna..."
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700/60 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <button
              onClick={handleAddNote}
              disabled={saving || !newNote.trim()}
              className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {saving ? "Guardando..." : "Agregar nota"}
            </button>

            <div className="mt-5 space-y-3">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-gray-900/40 p-4">
                    <p className="text-sm text-gray-200">{note.note}</p>
                    <p className="mt-2 text-xs text-gray-500">{formatDate(note.created_at)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">Sin notas internas.</p>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
