"use client";

import { useEffect, useMemo, useState } from "react";

type AnyRecord = Record<string, unknown>;

type ManagementStatus =
  | "pending_review"
  | "in_progress"
  | "documents_sent"
  | "closed";

type ManagementStatusInfo = {
  status: ManagementStatus;
  label: string;
  note?: string;
  updatedAt?: string | null;
};

type FilterKey =
  | "all"
  | "paid"
  | "unpaid"
  | "pending_review"
  | "in_progress"
  | "documents_sent"
  | "closed";

const STATUS_LABELS: Record<ManagementStatus, string> = {
  pending_review: "Pendiente de revisión",
  in_progress: "En preparación",
  documents_sent: "Documentos enviados",
  closed: "Cerrado",
};

const STATUS_CLASSES: Record<ManagementStatus, string> = {
  pending_review: "border-amber-200 bg-amber-50 text-amber-800",
  in_progress: "border-teal-200 bg-teal-50 text-teal-800",
  documents_sent: "border-emerald-200 bg-emerald-50 text-emerald-800",
  closed: "border-slate-200 bg-slate-100 text-slate-800",
};

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function getString(record: AnyRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function getNumber(record: AnyRecord, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(
        value
          .replace(/[^\d.,-]/g, "")
          .replace(/\./g, "")
          .replace(",", ".")
      );

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function extractRows(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  const record = asRecord(payload);

  for (const key of ["requests", "items", "data", "results", "rows"]) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value.map(asRecord);
    }
  }

  return [];
}

function getNestedPayment(row: AnyRecord): AnyRecord {
  return asRecord(row.payment);
}

function getRequestId(row: AnyRecord): string {
  const payment = getNestedPayment(row);

  return (
    getString(row, [
      "request_id",
      "requestId",
      "external_reference",
      "externalReference",
      "id",
    ]) ||
    getString(payment, [
      "request_id",
      "requestId",
      "external_reference",
      "externalReference",
    ])
  );
}

function getCustomerName(row: AnyRecord): string {
  const payment = getNestedPayment(row);

  return (
    getString(row, [
      "customer_name",
      "customerName",
      "client_name",
      "clientName",
      "name",
    ]) ||
    getString(payment, ["customer_name", "customerName", "name"]) ||
    "Sin nombre"
  );
}

function getEmail(row: AnyRecord): string {
  const payment = getNestedPayment(row);

  return (
    getString(row, [
      "customer_email",
      "customerEmail",
      "client_email",
      "clientEmail",
      "email",
    ]) ||
    getString(payment, ["customer_email", "customerEmail", "email"]) ||
    "Sin correo"
  );
}

function getPlate(row: AnyRecord): string {
  const payment = getNestedPayment(row);

  return (
    getString(row, ["plate", "patente", "vehicle_plate", "vehiclePlate"]) ||
    getString(payment, ["plate", "patente", "vehicle_plate", "vehiclePlate"]) ||
    "Sin patente"
  );
}

function getAmount(row: AnyRecord): number {
  const payment = getNestedPayment(row);

  return (
    getNumber(row, [
      "payment_amount",
      "paymentAmount",
      "amount",
      "paid_amount",
      "paidAmount",
      "total_amount",
      "totalAmount",
    ]) ||
    getNumber(payment, [
      "payment_amount",
      "paymentAmount",
      "amount",
      "paid_amount",
      "paidAmount",
      "total_amount",
      "totalAmount",
    ])
  );
}

function getPaymentStatus(row: AnyRecord): string {
  const payment = getNestedPayment(row);

  return (
    getString(row, [
      "payment_status",
      "paymentStatus",
      "purchase_status",
      "purchaseStatus",
      "status",
    ]) ||
    getString(payment, [
      "payment_status",
      "paymentStatus",
      "purchase_status",
      "purchaseStatus",
      "status",
    ]) ||
    "pending"
  ).toLowerCase();
}

function isPaid(row: AnyRecord): boolean {
  const payment = getNestedPayment(row);

  const status = getPaymentStatus(row);
  const purchaseStatus =
    getString(row, ["purchase_status", "purchaseStatus"]).toLowerCase() ||
    getString(payment, ["purchase_status", "purchaseStatus"]).toLowerCase();

  const rawStatus =
    getString(row, ["raw_status", "rawStatus"]).toLowerCase() ||
    getString(payment, ["raw_status", "rawStatus"]).toLowerCase();

  return (
    status === "approved" ||
    status === "paid" ||
    purchaseStatus === "paid" ||
    rawStatus === "approved"
  );
}

function getCreatedAt(row: AnyRecord): string {
  const payment = getNestedPayment(row);

  return (
    getString(row, ["created_at", "createdAt", "updated_at", "updatedAt"]) ||
    getString(payment, ["created_at", "createdAt", "updated_at", "updatedAt"])
  );
}

function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function normalizeStatus(value: unknown): ManagementStatus {
  const status = String(value || "").trim();

  if (
    status === "pending_review" ||
    status === "in_progress" ||
    status === "documents_sent" ||
    status === "closed"
  ) {
    return status;
  }

  return "pending_review";
}

function getStatusInfo(
  statuses: Record<string, ManagementStatusInfo>,
  requestId: string
): ManagementStatusInfo {
  return (
    statuses[requestId] || {
      status: "pending_review",
      label: STATUS_LABELS.pending_review,
      note: "",
      updatedAt: null,
    }
  );
}

function paymentBadge(row: AnyRecord) {
  if (isPaid(row)) {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
        Pagado
      </span>
    );
  }

  const status = getPaymentStatus(row);

  if (status === "rejected") {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700">
        Rechazado
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
      Pendiente
    </span>
  );
}

function statusBadge(info: ManagementStatusInfo) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${STATUS_CLASSES[info.status]}`}
    >
      {info.label}
    </span>
  );
}

function formatMetricValue(value: unknown): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("es-CL").format(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "—";
  }

  return JSON.stringify(value);
}

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<AnyRecord[]>([]);
  const [rawMetrics, setRawMetrics] = useState<AnyRecord | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ManagementStatusInfo>>({});
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadStatuses(requestIds: string[]) {
    if (requestIds.length === 0) {
      setStatuses({});
      return;
    }

    try {
      const response = await fetch("/api/admin/management-status/bulk", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestIds,
        }),
      });

      const data = (await response.json().catch(() => null)) as AnyRecord | null;

      if (!response.ok || !data?.ok) {
        throw new Error("Bulk endpoint no disponible.");
      }

      const rawStatuses = asRecord(data.statuses);
      const nextStatuses: Record<string, ManagementStatusInfo> = {};

      for (const requestId of requestIds) {
        const item = asRecord(rawStatuses[requestId]);
        const status = normalizeStatus(item.status);

        nextStatuses[requestId] = {
          status,
          label: getString(item, ["label"]) || STATUS_LABELS[status],
          note: getString(item, ["note"]),
          updatedAt: getString(item, ["updatedAt", "updated_at"]) || null,
        };
      }

      setStatuses(nextStatuses);
    } catch {
      const entries = await Promise.all(
        requestIds.slice(0, 40).map(async (requestId) => {
          try {
            const response = await fetch(
              `/api/admin/requests/${encodeURIComponent(requestId)}/management-status?ts=${Date.now()}`,
              {
                method: "GET",
                cache: "no-store",
              }
            );

            const data = (await response.json().catch(() => null)) as AnyRecord | null;
            const status = normalizeStatus(data?.status);

            return [
              requestId,
              {
                status,
                label: getString(asRecord(data), ["label"]) || STATUS_LABELS[status],
                note: getString(asRecord(data), ["note"]),
                updatedAt: getString(asRecord(data), ["updatedAt", "updated_at"]) || null,
              },
            ] as const;
          } catch {
            return [
              requestId,
              {
                status: "pending_review" as ManagementStatus,
                label: STATUS_LABELS.pending_review,
                note: "",
                updatedAt: null,
              },
            ] as const;
          }
        })
      );

      setStatuses(Object.fromEntries(entries));
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [requestsResponse, metricsResponse] = await Promise.all([
        fetch(`/api/admin/requests?limit=100&ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`/api/admin/metrics?ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        }).catch(() => null),
      ]);

      const requestsPayload = await requestsResponse.json().catch(() => null);

      if (!requestsResponse.ok) {
        throw new Error("No se pudieron cargar las solicitudes.");
      }

      const nextRows = extractRows(requestsPayload);
      setRows(nextRows);

      if (metricsResponse && metricsResponse.ok) {
        const metricsPayload = await metricsResponse.json().catch(() => null);
        setRawMetrics(asRecord(metricsPayload));
      }

      const requestIds = Array.from(
        new Set(nextRows.map(getRequestId).filter(Boolean))
      );

      await loadStatuses(requestIds);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado cargando dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const paidRows = useMemo(() => rows.filter(isPaid), [rows]);

  const income = useMemo(
    () => paidRows.reduce((total, row) => total + getAmount(row), 0),
    [paidRows]
  );

  const managementCounts = useMemo(() => {
    const counts: Record<ManagementStatus, number> = {
      pending_review: 0,
      in_progress: 0,
      documents_sent: 0,
      closed: 0,
    };

    for (const row of rows) {
      const requestId = getRequestId(row);
      const info = getStatusInfo(statuses, requestId);
      counts[info.status] += 1;
    }

    return counts;
  }, [rows, statuses]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const requestId = getRequestId(row);
      const status = getStatusInfo(statuses, requestId).status;

      if (filter === "all") return true;
      if (filter === "paid") return isPaid(row);
      if (filter === "unpaid") return !isPaid(row);
      return status === filter;
    });
  }, [filter, rows, statuses]);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt("Copiar:", value);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
              Prescribe tu Multa
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Dashboard administrativo
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Vista operativa: ventas, gestión interna y entregas.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        {errorMessage ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
              Compras pagadas
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {paidRows.length}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Pagos aprobados
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
              Ingresos confirmados
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-800">
              {formatCLP(income)}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              Solo compras pagadas
            </p>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-teal-700">
              En preparación
            </p>
            <p className="mt-2 text-3xl font-black text-teal-800">
              {managementCounts.in_progress}
            </p>
            <p className="mt-1 text-xs font-semibold text-teal-700">
              Casos en trabajo
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
              Documentos enviados
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {managementCounts.documents_sent}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Entregas registradas
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">
                Solicitudes
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {filteredRows.length} visibles de {rows.length} registros cargados.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "Todos"],
                ["paid", "Pagadas"],
                ["unpaid", "No pagadas"],
                ["pending_review", "Pendiente"],
                ["in_progress", "En preparación"],
                ["documents_sent", "Enviados"],
                ["closed", "Cerrados"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key as FilterKey)}
                  className={
                    filter === key
                      ? "rounded-full bg-teal-700 px-3 py-1.5 text-xs font-black text-white"
                      : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Patente</th>
                  <th className="px-3 py-2">Pago</th>
                  <th className="px-3 py-2">Gestión</th>
                  <th className="px-3 py-2">Monto</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row, index) => {
                  const requestId = getRequestId(row);
                  const info = getStatusInfo(statuses, requestId);
                  const amount = getAmount(row);

                  return (
                    <tr
                      key={`${requestId}-${index}`}
                      className="rounded-xl bg-slate-50 text-sm shadow-sm"
                    >
                      <td className="rounded-l-xl px-3 py-3">
                        <p className="font-black text-slate-900">
                          {getCustomerName(row)}
                        </p>
                        <p className="mt-0.5 max-w-[260px] truncate text-xs font-semibold text-slate-500">
                          {getEmail(row)}
                        </p>
                        <p className="mt-0.5 max-w-[260px] truncate text-[11px] text-slate-400">
                          {requestId || "Sin requestId"}
                        </p>
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-black text-slate-800 ring-1 ring-slate-200">
                          {getPlate(row)}
                        </span>
                      </td>

                      <td className="px-3 py-3">{paymentBadge(row)}</td>

                      <td className="px-3 py-3">{statusBadge(info)}</td>

                      <td className="px-3 py-3">
                        <p className="text-sm font-black text-slate-900">
                          {formatCLP(amount)}
                        </p>
                      </td>

                      <td className="px-3 py-3">
                        <p className="text-xs font-bold text-slate-600">
                          {formatDate(getCreatedAt(row))}
                        </p>
                      </td>

                      <td className="rounded-r-xl px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/admin/request/${encodeURIComponent(requestId)}`}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
                          >
                            Ver
                          </a>

                          <button
                            type="button"
                            onClick={() => copyText(requestId)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                          >
                            Copiar
                          </button>

                          <a
                            href={`/resultados/${encodeURIComponent(requestId)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 hover:bg-teal-100"
                          >
                            Resultado
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && filteredRows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                No hay registros para este filtro.
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                Cargando dashboard...
              </div>
            ) : null}
          </div>
        </section>

        <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-black text-slate-800">
            Ver métricas técnicas
          </summary>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {rawMetrics
              ? Object.entries(rawMetrics)
                  .filter(([key]) => !["ok"].includes(key))
                  .slice(0, 24)
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                        {key}
                      </p>
                      <p className="mt-1 break-all text-xs font-bold text-slate-800">
                        {formatMetricValue(value)}
                      </p>
                    </div>
                  ))
              : (
                <p className="text-sm font-bold text-slate-500">
                  Sin métricas técnicas cargadas.
                </p>
              )}
          </div>
        </details>
      </div>
    </main>
  );
}