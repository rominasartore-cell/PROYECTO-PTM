'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

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

  return safeValue.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  return date.toLocaleString('es-CL');
}

function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'approved':
      return 'Aprobado';
    case 'paid':
      return 'Pagado';
    case 'rejected':
      return 'Rechazado';
    case 'error':
      return 'Error';
    default:
      return status || 'Sin estado';
  }
}

function getPaymentStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'approved':
      return 'Aprobado';
    case 'failed':
      return 'Fallido';
    default:
      return status || 'No procesado';
  }
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.requestId as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem('ptm-admin-token') ||
      localStorage.getItem('ptm-admin-session');

    if (!token) {
      router.push('/admin');
      return;
    }

    fetchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    if (request) {
      setNewStatus(request.status || 'pending');
    }
  }, [request]);

  const fetchRequest = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
        cache: 'no-store',
      });

      const payload = await res.json();

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || 'Error al cargar solicitud');
      }

      const requestPayload = payload.request || payload.data;

      if (!requestPayload) {
        throw new Error('La API no devolvió la solicitud.');
      }

      const normalizedRequest = Array.isArray(requestPayload)
        ? requestPayload[0]
        : requestPayload;

      if (!normalizedRequest) {
        throw new Error('Solicitud no encontrada.');
      }

      setRequest(normalizedRequest);
      setNotes(payload.notes || []);
    } catch (err) {
      console.error('Error fetching request:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Error al cargar solicitud'
      );
      router.push('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!request || newStatus === request.status) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || 'Error al actualizar estado');
      }

      const updatedRequest = payload.request || payload.data;

      if (updatedRequest) {
        setRequest(Array.isArray(updatedRequest) ? updatedRequest[0] : updatedRequest);
      } else {
        await fetchRequest();
      }

      alert('Estado actualizado');
    } catch (err) {
      console.error('Error updating status:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Error al actualizar estado'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/requests/${encodeURIComponent(requestId)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote.trim() }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || 'Error al agregar nota');
      }

      const createdNote = payload.note || payload.data;

      if (createdNote) {
        setNotes([createdNote, ...notes]);
      } else {
        await fetchRequest();
      }

      setNewNote('');
      alert('Nota agregada');
    } catch (err) {
      console.error('Error adding note:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Error al agregar nota'
      );
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
          onClick={() => router.push('/admin/dashboard')}
          className="rounded-lg bg-blue-600 px-4 py-2 font-bold hover:bg-blue-700"
        >
          Volver al dashboard
        </button>
      </div>
    );
  }

  const totalAmountClp = Number(request.total_amount_utm || 0) * Number(request.utm_value_clp || 0);
  const hasPdf = Boolean(request.pdf_path || request.pdf_url);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mb-4 text-blue-400 hover:text-blue-300"
          >
            ← Volver al Dashboard
          </button>

          <h1 className="text-3xl font-bold">Detalle de Solicitud</h1>
          <p className="mt-2 text-sm text-gray-400">ID: {request.request_id}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-xl font-bold">Información del Cliente</h2>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Nombre</p>
                  <p className="text-lg">{request.customer_name || 'Sin nombre'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Correo</p>
                  <p className="text-lg">{request.customer_email || 'Sin correo'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Patente</p>
                  <p className="font-mono text-lg">{request.vehicle_plate || 'Sin patente'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Fecha de Solicitud</p>
                  <p className="text-lg">{formatDate(request.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-xl font-bold">Análisis</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Total de Multas</p>
                  <p className="text-2xl font-bold">{request.fine_count || 0}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Multas Potencialmente Prescritas</p>
                  <p className="text-2xl font-bold text-green-400">
                    {request.prescribed_count || 0}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Monto Total UTM</p>
                  <p className="text-2xl font-bold">{request.total_amount_utm || 0}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Valor UTM usado</p>
                  <p className="text-2xl font-bold">
                    {formatCLP(request.utm_value_clp)}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm text-gray-400">Monto referencial en pesos</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {formatCLP(totalAmountClp)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-xl font-bold">Archivo PDF</h2>

              {hasPdf ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Nombre archivo</p>
                    <p className="break-words text-sm">
                      {request.pdf_filename || 'Certificado PDF'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400">Ruta Storage</p>
                    <p className="break-words font-mono text-xs text-gray-300">
                      {request.pdf_path || 'Sin ruta'}
                    </p>
                  </div>

                  {request.pdf_url ? (
                    <a
                      href={request.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-700"
                    >
                      Abrir PDF
                    </a>
                  ) : (
                    <p className="rounded-lg bg-gray-900 p-3 text-sm text-gray-300">
                      PDF guardado en Storage privado. Para abrirlo desde el dashboard,
                      falta crear un endpoint de descarga o URL firmada.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">No hay PDF asociado a esta solicitud.</p>
              )}
            </div>

            {request.raw_analysis_json && (
              <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
                <h2 className="mb-4 text-xl font-bold">Análisis Completo JSON</h2>

                <div className="overflow-x-auto rounded-lg bg-gray-900 p-4">
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs text-gray-300">
                    {JSON.stringify(request.raw_analysis_json, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-xl font-bold">Estado</h2>

              <div className="mb-4">
                <p className="mb-2 text-sm text-gray-400">Estado actual</p>
                <span className="inline-block rounded bg-gray-700 px-3 py-1 text-sm font-medium text-gray-200">
                  {getStatusLabel(request.status)}
                </span>
              </div>

              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mb-4 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white outline-none focus:border-blue-500"
              >
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobado</option>
                <option value="paid">Pagado</option>
                <option value="rejected">Rechazado</option>
                <option value="error">Error</option>
              </select>

              <button
                onClick={handleUpdateStatus}
                disabled={saving || newStatus === request.status}
                className="w-full rounded-lg bg-blue-600 py-2 transition hover:bg-blue-700 disabled:bg-gray-600"
              >
                {saving ? 'Actualizando...' : 'Actualizar Estado'}
              </button>

              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-400">Estado de Pago</p>

                <span
                  className={`inline-block rounded px-3 py-1 text-sm font-medium ${
                    request.payment_status === 'approved'
                      ? 'bg-green-900 text-green-200'
                      : request.payment_status === 'failed'
                        ? 'bg-red-900 text-red-200'
                        : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {getPaymentStatusLabel(request.payment_status)}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-xl font-bold">Agregar Nota</h2>

              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escribe una nota interna..."
                className="mb-4 h-24 w-full resize-none rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-500 outline-none focus:border-blue-500"
              />

              <button
                onClick={handleAddNote}
                disabled={saving || !newNote.trim()}
                className="w-full rounded-lg bg-blue-600 py-2 transition hover:bg-blue-700 disabled:bg-gray-600"
              >
                {saving ? 'Guardando...' : 'Agregar Nota'}
              </button>
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-xl font-bold">Notas ({notes.length})</h2>

              {notes.length > 0 ? (
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-lg bg-gray-700 p-3 text-sm">
                      <p className="text-gray-300">{note.note}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin notas internas.</p>
              )}
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
              <h2 className="mb-4 text-xl font-bold">Acciones</h2>

              <button
                onClick={fetchRequest}
                disabled={saving}
                className="w-full rounded-lg bg-gray-700 py-2 transition hover:bg-gray-600 disabled:bg-gray-600"
              >
                Actualizar datos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}