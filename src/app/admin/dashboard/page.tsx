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
  payment_status: string;
  created_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('ptm-admin-token');
    if (!token) {
      router.push('/admin');
      return;
    }

    fetchMetrics();
    fetchRequests();
  }, [router]);

  useEffect(() => {
    fetchRequests();
  }, [search, status, page]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (data.ok) {
        setMetrics(data.metrics);
      }
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
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ptm-admin-token');
    router.push('/admin');
  };

  if (!metrics) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Panel Administrativo</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Total</p>
            <p className="text-3xl font-bold">{metrics.total}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Pendiente</p>
            <p className="text-3xl font-bold text-yellow-400">{metrics.pending}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Aprobado</p>
            <p className="text-3xl font-bold text-blue-400">{metrics.approved}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Pagado</p>
            <p className="text-3xl font-bold text-green-400">{metrics.paid}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Rechazado</p>
            <p className="text-3xl font-bold text-red-400">{metrics.rejected}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm">Pagos Aprobados</p>
            <p className="text-3xl font-bold text-green-500">{metrics.paymentApproved}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Buscar por nombre, correo o patente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="paid">Pagado</option>
              <option value="rejected">Rechazado</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Cargando solicitudes...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay solicitudes</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700 border-b border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium">Nombre</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Correo</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Patente</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Estado</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Pago</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Multas</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-750 transition">
                        <td className="px-6 py-3 text-sm">{req.customer_name}</td>
                        <td className="px-6 py-3 text-sm">{req.customer_email}</td>
                        <td className="px-6 py-3 text-sm font-mono">{req.vehicle_plate}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            req.status === 'pending'
                              ? 'bg-yellow-900 text-yellow-200'
                              : req.status === 'approved'
                              ? 'bg-blue-900 text-blue-200'
                              : req.status === 'paid'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-red-900 text-red-200'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            req.payment_status === 'approved'
                              ? 'bg-green-900 text-green-200'
                              : req.payment_status === 'failed'
                              ? 'bg-red-900 text-red-200'
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {req.payment_status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm">
                          {req.prescribed_count}/{req.fine_count}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <button
                            onClick={() => router.push(`/admin/request/${req.request_id}`)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-700 px-6 py-4 border-t border-gray-600 flex justify-between items-center">
                <p className="text-sm text-gray-300">
                  Mostrando {requests.length} de {total} solicitudes
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded text-sm transition"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 bg-gray-800 rounded text-sm">
                    {page} / {pages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(pages, page + 1))}
                    disabled={page === pages}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 rounded text-sm transition"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
