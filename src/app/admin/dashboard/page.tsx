"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_TOKEN_KEY = "ptm-admin-token";

type Metrics = {
  total?: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  processing?: number;
  completed?: number;
  failed?: number;
  paid?: number;
  paymentApproved?: number;
  paymentPending?: number;
  paymentRejected?: number;
  paidAmount?: number;
  supabasePaymentRecords?: number;
  localPaymentRecords?: number;
  localOnlyPayments?: number;
  mockPayments?: number;
  sandboxPayments?: number;
};

type AdminRequest = {
  id?: string;
  request_id?: string;
  requestId?: string;
  source?: "analysis" | "payment_only" | string;
  customer_name?: string | null;
  customerName?: string | null;
  customer_email?: string | null;
  customerEmail?: string | null;
  vehicle_plate?: string | null;
  vehiclePlate?: string | null;
  plate?: string | null;
  status?: string | null;
  payment_status?: string | null;
  paymentStatus?: string | null;
  purchase_status?: string | null;
  purchaseStatus?: string | null;
  payment_amount?: number | string | null;
  paymentAmount?: number | string | null;
  amount?: number | string | null;
  payment_paid_at?: string | null;
  paymentPaidAt?: string | null;
  payment_id?: string | number | null;
  paymentId?: string | number | null;
  preference_id?: string | null;
  preferenceId?: string | null;
  payment_customer_email?: string | null;
  paymentCustomerEmail?: string | null;
  payment_mock?: boolean;
  paymentMock?: boolean;
  mock?: boolean;
  payment_sandbox?: boolean;
  paymentSandbox?: boolean;
  sandbox?: boolean;
  payment_supabase_record?: boolean;
  paymentSupabaseRecord?: boolean;
  payment_local_record?: boolean;
  paymentLocalRecord?: boolean;
  local_only?: boolean;
  localOnly?: boolean;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

type ApiResponse = {
  ok?: boolean;
  metrics?: Metrics;
  data?: AdminRequest[];
  requests?: AdminRequest[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
  error?: string;
  message?: string;
};

type FilterKey = "all" | "pending" | "approved" | "rejected";

const FILTERS: Array<{ key: FilterKey; label: string; paymentStatus: string }> = [
  { key: "all", label: "Todas", paymentStatus: "" },
  { key: "pending", label: "Pendientes", paymentStatus: "pending" },
  { key: "approved", label: "Pagadas", paymentStatus: "approved" },
  { key: "rejected", label: "Rechazadas", paymentStatus: "rejected" },
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error inesperado cargando el dashboard";
}

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function buildAdminHeaders(): HeadersInit {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new Error(`Respuesta no JSON desde ${response.url}`);
  }
}

function numberValue(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = typeof value === "string" ? value.replace(/\./g, "").replace(",", ".") : value;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function money(value: unknown): string {
  return numberValue(value).toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function dateText(value?: string | null): string {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getRequestId(item: AdminRequest): string {
  return String(item.request_id || item.requestId || item.id || "");
}

function getCustomerName(item: AdminRequest): string {
  return String(item.customer_name || item.customerName || "Cliente sin nombre");
}

function getCustomerEmail(item: AdminRequest): string {
  return String(
    item.customer_email ||
      item.customerEmail ||
      item.payment_customer_email ||
      item.paymentCustomerEmail ||
      "Sin correo"
  );
}

function getPlate(item: AdminRequest): string {
  return String(item.vehicle_plate || item.vehiclePlate || item.plate || "Sin patente");
}

function getPaymentStatus(item: AdminRequest): string {
  return String(item.payment_status || item.paymentStatus || item.purchase_status || item.purchaseStatus || item.status || "").toLowerCase();
}

function getPreferenceId(item: AdminRequest): string {
  return String(item.preference_id || item.preferenceId || "");
}

function getPaymentAmount(item: AdminRequest): number {
  return numberValue(item.payment_amount || item.paymentAmount || item.amount || 0);
}

function getCreatedAt(item: AdminRequest): string | null | undefined {
  return item.created_at || item.createdAt;
}

function getPaidAt(item: AdminRequest): string | null | undefined {
  return item.payment_paid_at || item.paymentPaidAt;
}

function isPaymentOnly(item: AdminRequest): boolean {
  return item.source === "payment_only";
}

function isMock(item: AdminRequest): boolean {
  return Boolean(item.payment_mock || item.paymentMock || item.mock);
}

function isSandbox(item: AdminRequest): boolean {
  return Boolean(item.payment_sandbox || item.paymentSandbox || item.sandbox);
}

function isSupabaseRecord(item: AdminRequest): boolean {
  return Boolean(item.payment_supabase_record || item.paymentSupabaseRecord);
}

function isLocalOnly(item: AdminRequest): boolean {
  return Boolean(item.local_only || item.localOnly);
}

function statusLabel(value?: string | null): string {
  const status = String(value || "").toLowerCase();

  if (status === "approved" || status === "paid") return "Pago aprobado";
  if (status === "pending" || status === "created" || status === "processing" || status === "in_process") {
    return "Pendiente";
  }
  if (status === "rejected" || status === "failed" || status === "cancelled" || status === "canceled") {
    return "Rechazado";
  }
  if (status === "completed") return "Completado";

  return status || "Sin estado";
}

function statusClass(value?: string | null): string {
  const status = String(value || "").toLowerCase();

  if (status === "approved" || status === "paid" || status === "completed") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "rejected" || status === "failed" || status === "cancelled" || status === "canceled") {
    return "border-red-500/40 bg-red-500/10 text-red-200";
  }

  return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
}

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function MetricCard({ label, value, tone = "text-white" }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeFilter = useMemo(() => FILTERS.find((item) => item.key === filter) || FILTERS[0], [filter]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const stamp = Date.now();
      const query = new URLSearchParams({ limit: "100", ts: String(stamp) });

      if (activeFilter.paymentStatus) query.set("payment_status", activeFilter.paymentStatus);
      if (submittedSearch.trim()) query.set("search", submittedSearch.trim());

      const headers = buildAdminHeaders();

      const [metricsResponse, requestsResponse] = await Promise.all([
        fetch(`/api/admin/metrics?ts=${stamp}`, { cache: "no-store", headers }),
        fetch(`/api/admin/requests?${query.toString()}`, { cache: "no-store", headers }),
      ]);

      const metricsJson = await readJson<ApiResponse>(metricsResponse);
      const requestsJson = await readJson<ApiResponse>(requestsResponse);

      if (!metricsResponse.ok || metricsJson.ok === false) {
        throw new Error(metricsJson.error || metricsJson.message || "No se pudieron cargar métricas");
      }

      if (!requestsResponse.ok || requestsJson.ok === false) {
        throw new Error(requestsJson.error || requestsJson.message || "No se pudieron cargar solicitudes");
      }

      setMetrics(metricsJson.metrics || null);
      setRequests(requestsJson.requests || requestsJson.data || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter.paymentStatus, submittedSearch]);

  useEffect(() => {
    const token = getAdminToken();

    if (!token) {
      router.replace("/admin");
      return;
    }

    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    void loadData();
  }, [authReady, loadData]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  }

  function handleClearSearch() {
    setSearch("");
    setSubmittedSearch("");
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm text-slate-300 shadow-xl">
          Verificando sesión administrativa...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Prescribe tu Multa</p>
            <h1 className="mt-2 text-3xl font-black">Dashboard administrativo</h1>
            <p className="mt-2 text-sm text-slate-300">
              Vista unificada de solicitudes, preferencias Mercado Pago y pagos registrados en Supabase.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(ADMIN_TOKEN_KEY);
                router.replace("/admin");
              }}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
            >
              Salir
            </button>
          </div>
        </header>

        {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total registros" value={metrics?.total ?? "—"} />
          <MetricCard label="Pendientes" value={metrics?.paymentPending ?? metrics?.pending ?? "—"} tone="text-yellow-300" />
          <MetricCard label="Pagadas" value={metrics?.paid ?? metrics?.paymentApproved ?? "—"} tone="text-emerald-300" />
          <MetricCard label="Ingresos aprobados" value={money(metrics?.paidAmount || 0)} tone="text-emerald-300" />
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Supabase pagos" value={metrics?.supabasePaymentRecords ?? 0} />
          <MetricCard label="Mock" value={metrics?.mockPayments ?? 0} />
          <MetricCard label="Sandbox" value={metrics?.sandboxPayments ?? 0} />
          <MetricCard label="Solo local" value={metrics?.localOnlyPayments ?? 0} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    filter === item.key ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar correo, patente, requestId o preferenceId"
                className="w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400 sm:min-w-[320px]"
              />
              <button type="submit" className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-600">
                Buscar
              </button>
              {(search || submittedSearch) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
                >
                  Limpiar
                </button>
              )}
            </form>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-xl font-black">Solicitudes y pagos</h2>
            <p className="mt-1 text-sm text-slate-400">
              Las preferencias creadas en Mercado Pago sin análisis vinculado se muestran como pendientes.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Cargando...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No hay registros para este filtro.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {requests.map((item, index) => {
                const requestId = getRequestId(item);
                const paymentStatus = getPaymentStatus(item);
                const preferenceId = getPreferenceId(item);
                const rowKey = requestId || preferenceId || `request-${index}`;

                return (
                  <button
                    key={rowKey}
                    type="button"
                    onClick={() => requestId && router.push(`/admin/request/${encodeURIComponent(requestId)}`)}
                    disabled={!requestId}
                    className="block w-full p-5 text-left transition hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={statusClass(paymentStatus)}>{statusLabel(paymentStatus)}</Badge>

                          {isPaymentOnly(item) && <Badge className="border-purple-500/40 bg-purple-500/10 text-purple-200">Pago sin análisis vinculado</Badge>}
                          {isMock(item) && <Badge className="border-blue-500/40 bg-blue-500/10 text-blue-200">Mock</Badge>}
                          {isSandbox(item) && <Badge className="border-orange-500/40 bg-orange-500/10 text-orange-200">Sandbox</Badge>}
                          {!isMock(item) && !isSandbox(item) && preferenceId && (
                            <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">Mercado Pago real</Badge>
                          )}
                          {isSupabaseRecord(item) && <Badge className="border-cyan-500/40 bg-cyan-500/10 text-cyan-200">Supabase</Badge>}
                          {isLocalOnly(item) && <Badge className="border-slate-500/40 bg-slate-500/10 text-slate-200">Solo local</Badge>}
                        </div>

                        <h3 className="truncate text-lg font-bold">{getCustomerName(item)}</h3>

                        <div className="grid gap-1 text-sm text-slate-400 md:grid-cols-2">
                          <p>Correo: {getCustomerEmail(item)}</p>
                          <p>Patente: {getPlate(item)}</p>
                          <p className="break-all">Request ID: {requestId || "Sin requestId"}</p>
                          <p className="break-all">Preference ID: {preferenceId || "Sin preference_id"}</p>
                        </div>
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-2xl font-black">{money(getPaymentAmount(item))}</p>
                        <p className="mt-1 text-sm text-slate-400">Creado: {dateText(getCreatedAt(item))}</p>
                        <p className="mt-1 text-sm text-slate-400">Pago: {getPaidAt(item) ? dateText(getPaidAt(item)) : "No aprobado"}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
