"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Metrics = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processing: number;
  completed: number;
  failed: number;
  paid: number;
  paymentApproved: number;
  paymentPending: number;
  paymentRejected: number;
  paidAmount: number;
  supabasePaymentRecords: number;
  localPaymentRecords: number;
  localOnlyPayments: number;
  mockPayments: number;
  sandboxPayments: number;
};

type AdminRequest = {
  id?: string;
  request_id: string;
  source?: "analysis" | "payment_only";
  customer_name?: string | null;
  customer_email?: string | null;
  vehicle_plate?: string | null;
  status?: string | null;
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
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  metrics?: Metrics;
  data?: AdminRequest[];
  requests?: AdminRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
};

const FILTERS = [
  { key: "all", label: "Todas", paymentStatus: "" },
  { key: "pending", label: "Pendientes", paymentStatus: "pending" },
  { key: "approved", label: "Pagadas", paymentStatus: "approved" },
  { key: "rejected", label: "Rechazadas", paymentStatus: "rejected" },
];

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

  if (status === "approved") return "Pago aprobado";
  if (status === "pending" || status === "created" || status === "processing") return "Pendiente";
  if (status === "rejected" || status === "failed") return "Rechazado";

  return status || "Sin estado";
}

function statusClass(value?: string | null): string {
  const status = String(value || "").toLowerCase();

  if (status === "approved") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  if (status === "rejected" || status === "failed") return "border-red-500/40 bg-red-500/10 text-red-200";

  return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeFilter = useMemo(
    () => FILTERS.find((item) => item.key === filter) || FILTERS[0],
    [filter]
  );

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const stamp = Date.now();
      const query = new URLSearchParams();
      query.set("limit", "100");
      query.set("ts", String(stamp));

      if (activeFilter.paymentStatus) {
        query.set("payment_status", activeFilter.paymentStatus);
      }

      if (search.trim()) {
        query.set("search", search.trim());
      }

      const [metricsResponse, requestsResponse] = await Promise.all([
        fetch(`/api/admin/metrics?ts=${stamp}`, { cache: "no-store" }),
        fetch(`/api/admin/requests?${query.toString()}`, { cache: "no-store" }),
      ]);

      const metricsJson = (await metricsResponse.json()) as ApiResponse;
      const requestsJson = (await requestsResponse.json()) as ApiResponse;

      if (!metricsJson.ok) throw new Error(metricsJson.error || "No se pudieron cargar métricas");
      if (!requestsJson.ok) throw new Error(requestsJson.error || "No se pudieron cargar solicitudes");

      setMetrics(metricsJson.metrics || null);
      setRequests(requestsJson.requests || requestsJson.data || []);
    } catch (err: any) {
      setError(err?.message || "Error cargando dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadData();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Prescribe tu Multa
            </p>
            <h1 className="mt-2 text-3xl font-black">Dashboard administrativo</h1>
            <p className="mt-2 text-sm text-slate-300">
              Vista unificada de solicitudes, preferencias Mercado Pago y pagos registrados en Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            Actualizar
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total registros</p>
            <p className="mt-2 text-3xl font-black">{metrics?.total ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Pendientes</p>
            <p className="mt-2 text-3xl font-black text-yellow-300">{metrics?.paymentPending ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Pagadas</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">{metrics?.paid ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Ingresos aprobados</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">{money(metrics?.paidAmount || 0)}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Supabase pagos</p>
            <p className="mt-1 text-xl font-bold">{metrics?.supabasePaymentRecords ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Mock</p>
            <p className="mt-1 text-xl font-bold">{metrics?.mockPayments ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Sandbox</p>
            <p className="mt-1 text-xl font-bold">{metrics?.sandboxPayments ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Solo local</p>
            <p className="mt-1 text-xl font-bold">{metrics?.localOnlyPayments ?? 0}</p>
          </div>
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
                    filter === item.key
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar correo, patente, requestId o preferenceId"
                className="w-full min-w-[280px] rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold hover:bg-slate-600"
              >
                Buscar
              </button>
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
              {requests.map((item) => (
                <button
                  key={item.request_id}
                  type="button"
                  onClick={() => router.push(`/admin/request/${encodeURIComponent(item.request_id)}`)}
                  className="block w-full p-5 text-left transition hover:bg-slate-800/70"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusClass(item.payment_status)}>
                          {statusLabel(item.payment_status)}
                        </Badge>

                        {item.source === "payment_only" && (
                          <Badge className="border-purple-500/40 bg-purple-500/10 text-purple-200">
                            Pago sin análisis vinculado
                          </Badge>
                        )}

                        {item.payment_mock && (
                          <Badge className="border-blue-500/40 bg-blue-500/10 text-blue-200">
                            Mock
                          </Badge>
                        )}

                        {item.payment_sandbox && (
                          <Badge className="border-orange-500/40 bg-orange-500/10 text-orange-200">
                            Sandbox
                          </Badge>
                        )}

                        {!item.payment_mock && !item.payment_sandbox && item.preference_id && (
                          <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                            Mercado Pago real
                          </Badge>
                        )}

                        {item.payment_supabase_record && (
                          <Badge className="border-cyan-500/40 bg-cyan-500/10 text-cyan-200">
                            Supabase
                          </Badge>
                        )}

                        {item.local_only && (
                          <Badge className="border-slate-500/40 bg-slate-500/10 text-slate-200">
                            Solo local
                          </Badge>
                        )}
                      </div>

                      <h3 className="truncate text-lg font-bold">
                        {item.customer_name || "Cliente sin nombre"}
                      </h3>

                      <div className="grid gap-1 text-sm text-slate-400 md:grid-cols-2">
                        <p>Correo: {item.customer_email || item.payment_customer_email || "Sin correo"}</p>
                        <p>Patente: {item.vehicle_plate || "Sin patente"}</p>
                        <p>Request ID: {item.request_id}</p>
                        <p>Preference ID: {item.preference_id || "Sin preference_id"}</p>
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-2xl font-black">{money(item.payment_amount || 0)}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Creado: {dateText(item.created_at)}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Pago: {item.payment_paid_at ? dateText(item.payment_paid_at) : "No aprobado"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
