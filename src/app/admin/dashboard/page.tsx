'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Metrics = {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  paymentApproved: number;
};

type Request = {
  id: string;
  customer_name: string;
  customer_email: string;
  vehicle_plate: string;
  request_id: string;
  status: string;
  fine_count: number;
  prescribed_count: number;
  total_amount_utm: number | null;
  utm_value_clp: number | null;
  payment_status: string;
  pdf_url: string | null;
  pdf_filename: string | null;
  pdf_path: string | null;
  created_at: string;
};

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
  raw_analysis_json: unknown;
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
  const n = Number(value || 0);
  return n.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Fecha inválida';
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'pending': return 'Pendiente pago';
    case 'approved': return 'Aprobado';
    case 'paid': return 'Pagada';
    case 'rejected': return 'Rechazado';
    case 'error': return 'Error';
    default: return status || 'Sin estado';
  }
}

function getStatusClass(status: string | null | undefined): string {
  switch (status) {
    case 'pending': return 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50';
    case 'approved': return 'bg-blue-900/50 text-blue-300 border border-blue-700/50';
    case 'paid': return 'bg-green-900/50 text-green-300 border border-green-700/50';
    case 'rejected': return 'bg-red-900/50 text-red-300 border border-red-700/50';
    default: return 'bg-gray-700 text-gray-300';
  }
}

function getPaymentLabel(status: string | null | undefined): string {
  switch (status) {
    case 'pending': return 'Pendiente';
    case 'approved': return 'Aprobado';
    case 'failed': return 'Fallido';
    default: return 'N/A';
  }
}

function getPaymentClass(status: string | null | undefined): string {
  switch (status) {
    case 'approved': return 'bg-green-900/50 text-green-300 border border-green-700/50';
    case 'pending': return 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50';
    case 'failed': return 'bg-red-900/50 text-red-300 border border-red-700/50';
    default: return 'bg-gray-700 text-gray-400';
  }
}

function calcMontoCLP(req: Pick<Request, 'total_amount_utm' | 'utm_value_clp'>): number {
  return Number(req.total_amount_utm || 0) * Number(req.utm_value_clp || 0);
}

// Pagination helper: returns array of page numbers/ellipsis to show
function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export default function AdminDashboard() {
  const router = useRouter();

  // Dashboard state
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [detailNotes, setDetailNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('ptm-admin-token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchMetrics();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (data.ok) setMetrics(data.metrics);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);
      params.append('page', page.toString());

      const res = await fetch(`/api/admin/requests?${params.toString()}`);
      const data = await res.json();

      if (data.ok) {
        setRequests(data.data);
        setTotal(data.pagination.total);
        setPages(data.pagination.pages);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
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
        cache: 'no-store',
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || 'Error al cargar');
      const req = payload.request || payload.data;
      setDetail(Array.isArray(req) ? req[0] : req);
      setDetailNotes(payload.notes || []);
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetail = (requestId: string) => {
    setSelectedId(requestId);
    setSidebarOpen(true);
    setNewNote('');
    setResendStatus('idle');
    setResendError('');
    fetchDetail(requestId);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedId(null);
    setDetail(null);
    setDetailNotes([]);
    setNewNote('');
    setResendStatus('idle');
    setResendError('');
  };

  const handleResendEmail = async () => {
    if (!selectedId) return;
    setResendingEmail(true);
    setResendStatus('idle');
    setResendError('');
    try {
      const res = await fetch(
        `/api/admin/requests/${encodeURIComponent(selectedId)}/resend-email`,
        { method: 'POST' }
      );
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error || 'Error al reenviar');
      setResendStatus('success');
    } catch (err) {
      setResendStatus('error');
      setResendError(err instanceof Error ? err.message : 'Error al reenviar correo');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedId || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(selectedId)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || 'Error al guardar nota');
      const created = payload.note || payload.data;
      if (created) setDetailNotes([created, ...detailNotes]);
      setNewNote('');
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ptm-admin-token');
    router.push('/admin');
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Cargando...
      </div>
    );
  }

  const pageList = buildPages(page, pages);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-10 h-10 rounded-lg bg-green-600/20 border border-green-600/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg leading-none">Prescribe</span>
                <span className="font-bold text-green-400 text-lg leading-none">tu Multa</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Panel Administrativo · Versión 1 · Gestión simple de solicitudes</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <p className="text-sm text-gray-400 hidden sm:block">
                Última actualización: {formatDate(lastUpdated.toISOString())}
              </p>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total solicitudes */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-600/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total solicitudes</p>
              <p className="text-3xl font-bold text-green-400">{metrics.total}</p>
            </div>
          </div>

          {/* Pendientes de pago */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">Pendientes de pago</p>
              <p className="text-3xl font-bold text-amber-400">{metrics.pending}</p>
            </div>
          </div>

          {/* Pagadas */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">Pagadas</p>
              <p className="text-3xl font-bold text-blue-400">{metrics.paid}</p>
            </div>
          </div>

          {/* Requieren revisión */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-600/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400">Requieren revisión</p>
              <p className="text-3xl font-bold text-purple-400">{metrics.approved}</p>
            </div>
          </div>
        </div>

        {/* Search + filter */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, correo o patente..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="appearance-none pl-3 pr-8 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="all">Estado · Todos</option>
                  <option value="pending">Pendiente pago</option>
                  <option value="approved">Aprobado</option>
                  <option value="paid">Pagada</option>
                  <option value="rejected">Rechazado</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <button
                onClick={() => { fetchMetrics(); fetchRequests(); }}
                className="px-3 py-2.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-sm transition-colors flex items-center gap-1.5"
                title="Actualizar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Requests table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700">
            <h2 className="font-semibold text-white">Solicitudes</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400">Cargando solicitudes...</div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No hay solicitudes que coincidan con los filtros.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/60 border-b border-gray-700">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Correo</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Patente</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pot. prescritas</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Monto asociado</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pago</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60">
                    {requests.map((req) => (
                      <tr
                        key={req.id}
                        className={`hover:bg-gray-700/30 transition-colors ${selectedId === req.request_id ? 'bg-gray-700/40' : ''}`}
                      >
                        <td className="px-5 py-3.5 text-sm text-gray-300 whitespace-nowrap">{formatDate(req.created_at)}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-white">{req.customer_name || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-300">{req.customer_email || '—'}</td>
                        <td className="px-5 py-3.5 text-sm font-mono font-medium text-white">{req.vehicle_plate || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-300">
                          <span className="font-semibold text-white">{req.prescribed_count ?? '—'}</span>
                          {req.fine_count != null && <span className="text-gray-500">/{req.fine_count}</span>}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-emerald-400">
                          {formatCLP(calcMontoCLP(req))}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(req.status)}`}>
                            {getStatusLabel(req.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentClass(req.payment_status)}`}>
                            {getPaymentLabel(req.payment_status)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleOpenDetail(req.request_id)}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-xs font-medium transition-colors"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-700/60">
                {requests.map((req) => (
                  <div key={req.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{req.customer_name || '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{req.customer_email || '—'}</p>
                      </div>
                      <span className="font-mono text-sm font-bold text-gray-300 flex-shrink-0">{req.vehicle_plate || '—'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentClass(req.payment_status)}`}>
                        {getPaymentLabel(req.payment_status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400">
                          Prescritas: <span className="text-white font-medium">{req.prescribed_count ?? '—'}/{req.fine_count ?? '—'}</span>
                        </p>
                        <p className="text-xs text-emerald-400 font-medium">{formatCLP(calcMontoCLP(req))}</p>
                        <p className="text-xs text-gray-500">{formatDate(req.created_at)}</p>
                      </div>
                      <button
                        onClick={() => handleOpenDetail(req.request_id)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="px-5 py-4 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-400">
                  Mostrando {requests.length} de {total} solicitudes
                </p>
                {pages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {pageList.map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-500 text-sm">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            page === p
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setPage(Math.min(pages, page + 1))}
                      disabled={page === pages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={handleCloseSidebar}
          />
          {/* Panel */}
          <div className="relative w-full max-w-md bg-gray-800 border-l border-gray-700 overflow-y-auto flex flex-col shadow-2xl">
            {/* Sidebar header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-lg">Detalle de solicitud</h2>
              <button
                onClick={handleCloseSidebar}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 p-10">
                Cargando...
              </div>
            ) : !detail ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 p-10">
                No se pudo cargar la solicitud.
              </div>
            ) : (
              <div className="flex-1 p-5 space-y-5">
                {/* Datos del cliente */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Datos del cliente</h3>
                  <div className="bg-gray-700/40 rounded-lg p-4 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm text-gray-400">Nombre</span>
                      <span className="text-sm font-medium text-right">{detail.customer_name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm text-gray-400">Correo</span>
                      <span className="text-sm font-medium text-right break-all">{detail.customer_email || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm text-gray-400">Patente</span>
                      <span className="text-sm font-mono font-bold">{detail.vehicle_plate || '—'}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm text-gray-400">Fecha</span>
                      <span className="text-sm text-gray-300">{formatDate(detail.created_at)}</span>
                    </div>
                  </div>
                </section>

                {/* Certificado subido */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Certificado subido</h3>
                  <div className="bg-gray-700/40 rounded-lg p-4">
                    {detail.pdf_path || detail.pdf_url ? (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-900/40 border border-red-700/40 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{detail.pdf_filename || 'certificado.pdf'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(detail.created_at)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No hay certificado asociado.</p>
                    )}
                    {(detail.pdf_path || detail.pdf_url) && (
                      <div className="flex gap-2 mt-3">
                        {detail.pdf_url ? (
                          <>
                            <a
                              href={detail.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded-lg text-xs font-medium transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ver PDF
                            </a>
                            <a
                              href={detail.pdf_url}
                              download={detail.pdf_filename || 'certificado.pdf'}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded-lg text-xs font-medium transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Descargar
                            </a>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500 italic">PDF en storage privado. Se requiere URL firmada para descarga.</p>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Resultado del análisis */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Resultado del análisis</h3>
                  <div className="bg-gray-700/40 rounded-lg p-4 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Total multas detectadas</span>
                      <span className="text-sm font-bold text-white">{detail.fine_count ?? '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Multas potencialmente prescritas</span>
                      <span className="text-sm font-bold text-green-400">{detail.prescribed_count ?? '—'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-600">
                      <span className="text-sm text-gray-400">Monto asociado</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {formatCLP(Number(detail.total_amount_utm || 0) * Number(detail.utm_value_clp || 0))}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Estado del pago */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Estado del pago</h3>
                  <div className="bg-gray-700/40 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-sm text-gray-400">Estado</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPaymentClass(detail.payment_status)}`}>
                      {getPaymentLabel(detail.payment_status)}
                    </span>
                  </div>
                  <div className="bg-gray-700/40 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-sm text-gray-400">Estado de solicitud</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(detail.status)}`}>
                      {getStatusLabel(detail.status)}
                    </span>
                  </div>
                </section>

                {/* Nota interna */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Nota interna</h3>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Agregar nota interna..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-700/60 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  />
                  {detailNotes.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {detailNotes.map((note) => (
                        <div key={note.id} className="bg-gray-700/40 rounded-lg p-3">
                          <p className="text-sm text-gray-200">{note.note}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(note.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Acciones */}
                <section className="grid grid-cols-2 gap-2 pb-2">
                  <div className="flex flex-col gap-1">
                  <button
                    onClick={handleResendEmail}
                    disabled={resendingEmail || resendStatus === 'success'}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                      resendStatus === 'success'
                        ? 'bg-green-900/40 border border-green-700/50 text-green-400'
                        : resendStatus === 'error'
                        ? 'bg-red-900/40 border border-red-700/50 text-red-400 hover:bg-red-900/60'
                        : 'bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {resendingEmail ? 'Enviando...' : resendStatus === 'success' ? 'Enviado ✓' : 'Reenviar correo'}
                  </button>
                  {resendStatus === 'error' && resendError && (
                    <p className="text-xs text-red-400 px-1">{resendError}</p>
                  )}
                </div>
                  {/* Regenerar documentos - pendiente de implementar endpoint */}
                  <button
                    disabled
                    title="Funcionalidad pendiente de implementar"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-700/40 border border-gray-600/50 rounded-lg text-xs font-medium text-gray-500 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerar docs
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote || !newNote.trim()}
                    className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {savingNote ? 'Guardando...' : 'Guardar nota'}
                  </button>
                  <button
                    onClick={() => router.push(`/admin/request/${selectedId}`)}
                    className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-xs font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Ver detalle completo
                  </button>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
