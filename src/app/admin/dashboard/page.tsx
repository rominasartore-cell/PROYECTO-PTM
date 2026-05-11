"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Metrics = {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  processing?: number;
  completed?: number;
  failed?: number;
  paymentApproved?: number;
  paymentPending?: number;
  paymentRejected?: number;
  paidAmount?: number;
  localPaymentRecords?: number;
  localOnlyPayments?: number;
  mockPayments?: number;
  sandboxPayments?: number;
};

type AdminRequest = {
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
  pdf_url: string | null;
  pdf_filename: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at?: string | null;
};

type Note = {
  id: string;
  request_id: string;
  note: string;
  created_at: string;
};

function formatCLP(value: number | null | undefined): string {
  const n = Number(value || 0);
  return n.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Sin fecha";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "Fecha invalida";

  return d.toLocaleString("es-CL", {
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

function getPaymentLabel(status: string | null | undefined): string {
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
      return "Sin pago";
  }
}

function getPaymentClass(status: string | null | undefined): string {
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

function calcPotentialAmountCLP(req: Pick<AdminRequest, "total_amount_utm" | "utm_value_clp">): number {
  return Number(req.total_amount_utm || 0) * Number(req.utm_value_clp || 0);
}

function getPaidAmount(req: AdminRequest): number {
  return Number(req.payment_amount || 0);
}

function buildPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent: "green" | "amber" | "blue" | "emerald" | "purple";
}) {
  const styles = {
    green: "text-green-400 bg-green-600/15",
    amber: "text-amber-400 bg-amber-600/15",
    blue: "text-blue-400 bg-blue-600/15",
    emerald: "text-emerald-400 bg-emerald-600/15",
    purple: "text-purple-400 bg-purple-600/15",
  }[accent];

  const [textClass, bgClass] = styles.split(" ");

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
        <div className={`h-3 w-3 rounded-full ${textClass.replace("text", "bg")}`} />
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className={`text-3xl font-bold ${textClass}`}>{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminRequest | null>(null);
  const [detailNotes, setDetailNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle");
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("ptm-admin-token") ||
      localStorage.getItem("ptm-admin-session");

    if (!token) {
      router.push("/admin");
      return;
    }

    fetchMetrics();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, paymentStatus, page]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/admin/metrics", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setMetrics(data.metrics);
    } catch (err) {
      console.error("Error fetching metrics:", err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (search) params.append("search", search);
      if (status !== "all") params.append("status", status);
      if (paymentStatus !== "all") params.append("payment_status", paymentStatus);

      params.append("page", page.toString());

      const res = await fetch(`/api/admin/requests?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.ok) {
        setRequests(data.data || []);
        setTotal(data.pagination?.total || 0);
        setPages(data.pagination?.pages || 1);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (requestId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setDetailNotes([]);

    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
        cache: "no-store",
      });
      const payload = await res.json();

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || "Error al cargar detalle");
      }

      const req = payload.request || payload.data;
      setDetail(Array.isArray(req) ? req[0] : req);
      setDetailNotes(payload.notes || []);
    } catch (err) {
      console.error("Error fetching detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetail = (requestId: string) => {
    setSelectedId(requestId);
    setSidebarOpen(true);
    setNewNote("");
    setResendStatus("idle");
    setResendError("");
    fetchDetail(requestId);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedId(null);
    setDetail(null);
    setDetailNotes([]);
    setNewNote("");
    setResendStatus("idle");
    setResendError("");
  };

  const handleResendEmail = async () => {
    if (!selectedId) return;

    setResendingEmail(true);
    setResendStatus("idle");
    setResendError("");

    try {
      const res = await fetch(
        `/api/admin/requests/${encodeURIComponent(selectedId)}/resend-email`,
        { method: "POST" }
      );
      const payload = await res.json();

      if (!payload.ok) throw new Error(payload.error || "Error al reenviar");

      setResendStatus("success");
    } catch (err) {
      setResendStatus("error");
      setResendError(err instanceof Error ? err.message : "Error al reenviar correo");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedId || !newNote.trim()) return;

    setSavingNote(true);

    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(selectedId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      const payload = await res.json();

      if (!res.ok || !payload.ok) throw new Error(payload.error || "Error al guardar nota");

      const created = payload.note || payload.data;
      if (created) setDetailNotes([created, ...detailNotes]);

      setNewNote("");
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ptm-admin-token");
    localStorage.removeItem("ptm-admin-session");
    router.push("/admin");
  };

  if (!metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        Cargando...
      </div>
    );
  }

  const pageList = buildPages(page, pages);
  const paidAmount = Number(metrics.paidAmount || 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="sticky top-0 z-30 border-b border-gray-700 bg-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-600/40 bg-green-600/20">
              <span className="text-sm font-black text-green-400">PTM</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold leading-none text-white">Prescribe</span>
                <span className="text-lg font-bold leading-none text-green-400">tu Multa</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                Panel Administrativo · Gestion comercial y solicitudes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdated ? (
              <p className="hidden text-sm text-gray-400 sm:block">
                Actualizado: {formatDate(lastUpdated.toISOString())}
              </p>
            ) : null}

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-700"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            title="Total solicitudes"
            value={metrics.total}
            subtitle={`${metrics.localOnlyPayments || 0} solo pago local`}
            accent="green"
          />
          <MetricCard
            title="En proceso"
            value={metrics.pending}
            subtitle={`${metrics.processing || 0} processing`}
            accent="amber"
          />
          <MetricCard
            title="Pagadas"
            value={metrics.paid}
            subtitle={`${metrics.paymentApproved || 0} pagos aprobados`}
            accent="blue"
          />
          <MetricCard
            title="Ingresos"
            value={formatCLP(paidAmount)}
            subtitle={`${metrics.mockPayments || 0} mock · ${metrics.sandboxPayments || 0} sandbox`}
            accent="emerald"
          />
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre, correo, patente o solicitud..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Solicitud · Todas</option>
              <option value="processing">En proceso</option>
              <option value="completed">Completadas</option>
              <option value="failed">Fallidas</option>
            </select>

            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Pago · Todos</option>
              <option value="approved">Pagadas</option>
              <option value="pending">Pago pendiente</option>
              <option value="rejected">Pago rechazado</option>
            </select>

            <button
              onClick={() => {
                fetchMetrics();
                fetchRequests();
              }}
              className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2.5 text-sm transition-colors hover:bg-gray-600"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <div className="border-b border-gray-700 px-5 py-4">
            <h2 className="font-semibold text-white">Solicitudes</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400">Cargando solicitudes...</div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No hay solicitudes que coincidan con los filtros.</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="border-b border-gray-700 bg-gray-700/60">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Fecha</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Cliente</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Patente</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Prescritas</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Monto multas</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Pago</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Origen</th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Accion</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-700/60">
                    {requests.map((req) => (
                      <tr
                        key={req.request_id || req.id}
                        className={`transition-colors hover:bg-gray-700/30 ${
                          selectedId === req.request_id ? "bg-gray-700/40" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-300">
                          {formatDate(req.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-white">{req.customer_name || "Cliente"}</p>
                          <p className="text-xs text-gray-400">{req.customer_email || "Sin correo"}</p>
                          <p className="mt-1 max-w-[180px] truncate text-xs text-gray-500">{req.request_id}</p>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-white">
                          <span className="font-mono">{req.vehicle_plate || "—"}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-300">
                          <span className="font-semibold text-white">{req.prescribed_count ?? "—"}</span>
                          {req.fine_count != null ? <span className="text-gray-500">/{req.fine_count}</span> : null}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-emerald-400">
                          {formatCLP(calcPotentialAmountCLP(req))}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <Badge className={getPaymentClass(req.payment_status)}>
                              {getPaymentLabel(req.payment_status)}
                            </Badge>
                            {getPaidAmount(req) > 0 ? (
                              <p className="text-xs font-bold text-emerald-400">
                                {formatCLP(getPaidAmount(req))}
                              </p>
                            ) : null}
                            {req.payment_paid_at ? (
                              <p className="text-[11px] text-gray-500">{formatDate(req.payment_paid_at)}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {req.local_only ? (
                              <Badge className="border border-cyan-700/50 bg-cyan-900/40 text-cyan-300">
                                Local
                              </Badge>
                            ) : (
                              <Badge className="border border-gray-600 bg-gray-700 text-gray-300">
                                Supabase
                              </Badge>
                            )}
                            {req.payment_mock ? (
                              <Badge className="border border-amber-700/50 bg-amber-900/40 text-amber-300">
                                Mock
                              </Badge>
                            ) : null}
                            {req.payment_sandbox ? (
                              <Badge className="border border-blue-700/50 bg-blue-900/40 text-blue-300">
                                Sandbox
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleOpenDetail(req.request_id)}
                            className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-600"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-700/60 md:hidden">
                {requests.map((req) => (
                  <div key={req.request_id || req.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{req.customer_name || "Cliente"}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{req.customer_email || "Sin correo"}</p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-bold text-gray-300">
                        {req.vehicle_plate || "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className={getStatusClass(req.status)}>
                        {getStatusLabel(req.status)}
                      </Badge>
                      <Badge className={getPaymentClass(req.payment_status)}>
                        {getPaymentLabel(req.payment_status)}
                      </Badge>
                      {req.payment_mock ? (
                        <Badge className="border border-amber-700/50 bg-amber-900/40 text-amber-300">
                          Mock
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400">
                          Prescritas:{" "}
                          <span className="font-medium text-white">
                            {req.prescribed_count ?? "—"}/{req.fine_count ?? "—"}
                          </span>
                        </p>
                        <p className="text-xs font-medium text-emerald-400">
                          Pago: {formatCLP(getPaidAmount(req))}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(req.created_at)}</p>
                      </div>
                      <button
                        onClick={() => handleOpenDetail(req.request_id)}
                        className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-600"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-700 px-5 py-4 sm:flex-row">
                <p className="text-sm text-gray-400">
                  Mostrando {requests.length} de {total} solicitudes
                </p>

                {pages > 1 ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ‹
                    </button>

                    {pageList.map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-gray-500">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            page === p
                              ? "bg-green-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => setPage(Math.min(pages, page + 1))}
                      disabled={page === pages}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </main>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={handleCloseSidebar} />

          <div className="relative flex w-full max-w-md flex-col overflow-y-auto border-l border-gray-700 bg-gray-800 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-gray-800 px-5 py-4">
              <h2 className="text-lg font-bold">Detalle de solicitud</h2>
              <button
                onClick={handleCloseSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-700"
              >
                ×
              </button>
            </div>

            {detailLoading ? (
              <div className="flex flex-1 items-center justify-center p-10 text-gray-400">Cargando...</div>
            ) : !detail ? (
              <div className="flex flex-1 items-center justify-center p-10 text-gray-400">
                No se pudo cargar la solicitud.
              </div>
            ) : (
              <div className="flex-1 space-y-5 p-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Datos del cliente
                  </h3>
                  <div className="space-y-2.5 rounded-lg bg-gray-700/40 p-4">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-gray-400">Nombre</span>
                      <span className="text-right text-sm font-medium">{detail.customer_name || "Cliente"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-gray-400">Correo</span>
                      <span className="break-all text-right text-sm font-medium">{detail.customer_email || "Sin correo"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-gray-400">Patente</span>
                      <span className="font-mono text-sm font-bold">{detail.vehicle_plate || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-gray-400">Solicitud</span>
                      <span className="break-all text-right text-xs text-gray-300">{detail.request_id}</span>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Estado comercial
                  </h3>
                  <div className="space-y-3 rounded-lg bg-gray-700/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-400">Pago</span>
                      <Badge className={getPaymentClass(detail.payment_status)}>
                        {getPaymentLabel(detail.payment_status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-400">Compra</span>
                      <span className="text-sm font-bold text-white">{detail.purchase_status || "pending"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-400">Monto pagado</span>
                      <span className="text-sm font-bold text-emerald-400">{formatCLP(getPaidAmount(detail))}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-400">Fecha pago</span>
                      <span className="text-right text-sm text-gray-300">{formatDate(detail.payment_paid_at)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {detail.payment_mock ? (
                        <Badge className="border border-amber-700/50 bg-amber-900/40 text-amber-300">
                          Modo prueba
                        </Badge>
                      ) : null}
                      {detail.payment_sandbox ? (
                        <Badge className="border border-blue-700/50 bg-blue-900/40 text-blue-300">
                          Sandbox
                        </Badge>
                      ) : null}
                      {detail.local_only ? (
                        <Badge className="border border-cyan-700/50 bg-cyan-900/40 text-cyan-300">
                          Solo local
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Resultado del analisis
                  </h3>
                  <div className="space-y-2.5 rounded-lg bg-gray-700/40 p-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Total multas</span>
                      <span className="text-sm font-bold text-white">{detail.fine_count ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Potencialmente prescritas</span>
                      <span className="text-sm font-bold text-green-400">{detail.prescribed_count ?? "—"}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-600 pt-2">
                      <span className="text-sm text-gray-400">Monto multas</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {formatCLP(calcPotentialAmountCLP(detail))}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Notas internas
                  </h3>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Agregar nota interna..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700/60 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />

                  {detailNotes.length > 0 ? (
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {detailNotes.map((note) => (
                        <div key={note.id} className="rounded-lg bg-gray-700/40 p-3">
                          <p className="text-sm text-gray-200">{note.note}</p>
                          <p className="mt-1 text-xs text-gray-500">{formatDate(note.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="grid grid-cols-2 gap-2 pb-2">
                  <button
                    onClick={handleResendEmail}
                    disabled={resendingEmail || resendStatus === "success"}
                    className={`flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                      resendStatus === "success"
                        ? "border border-green-700/50 bg-green-900/40 text-green-400"
                        : resendStatus === "error"
                        ? "border border-red-700/50 bg-red-900/40 text-red-400 hover:bg-red-900/60"
                        : "border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {resendingEmail ? "Enviando..." : resendStatus === "success" ? "Enviado" : "Reenviar correo"}
                  </button>

                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote || !newNote.trim()}
                    className="rounded-lg bg-green-600 px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
                  >
                    {savingNote ? "Guardando..." : "Guardar nota"}
                  </button>

                  <button
                    onClick={() => router.push(`/admin/request/${selectedId}`)}
                    className="col-span-2 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-gray-600"
                  >
                    Ver detalle completo
                  </button>

                  {resendStatus === "error" && resendError ? (
                    <p className="col-span-2 px-1 text-xs text-red-400">{resendError}</p>
                  ) : null}
                </section>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
