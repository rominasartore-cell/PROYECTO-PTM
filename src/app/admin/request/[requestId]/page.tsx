'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type RequestDetail = {
  id: string;
  customer_name: string;
  customer_email: string;
  vehicle_plate: string;
  request_id: string;
  status: string;
  fine_count: number;
  prescribed_count: number;
  total_amount_utm: number;
  utm_value_clp: number;
  payment_status: string;
  raw_analysis_json: any;
  internal_notes: string;
  created_at: string;
  updated_at: string;
};

type Note = {
  id: string;
  request_id: string;
  note: string;
  created_at: string;
};

export default function RequestDetail() {
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
    const token = localStorage.getItem('ptm-admin-token');
    if (!token) {
      router.push('/admin');
      return;
    }

    fetchRequest();
  }, [router]);

  useEffect(() => {
    if (request) {
      setNewStatus(request.status);
    }
  }, [request]);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}`);
      const data = await res.json();

      if (data.ok) {
        setRequest(data.data);
        setNotes(data.notes || []);
      } else {
        alert(data.error || 'Error al cargar solicitud');
        router.push('/admin/dashboard');
      }
    } catch (err) {
      console.error('Error fetching request:', err);
      alert('Error al cargar solicitud');
      router.push('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!request || newStatus === request.status) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (data.ok) {
        setRequest(data.data);
        alert('Estado actualizado');
      } else {
        alert(data.error || 'Error al actualizar estado');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error al actualizar estado');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });

      const data = await res.json();

      if (data.ok) {
        setNotes([data.data, ...notes]);
        setNewNote('');
        alert('Nota agregada');
      } else {
        alert(data.error || 'Error al agregar nota');
      }
    } catch (err) {
      console.error('Error adding note:', err);
      alert('Error al agregar nota');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !request) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-blue-400 hover:text-blue-300 mb-4"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold">Detalle de Solicitud</h1>
          <p className="text-gray-400 text-sm mt-2">ID: {request.request_id}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Información del Cliente</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Nombre</p>
                  <p className="text-lg">{request.customer_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Correo</p>
                  <p className="text-lg">{request.customer_email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Patente</p>
                  <p className="text-lg font-mono">{request.vehicle_plate}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Fecha de Solicitud</p>
                  <p className="text-lg">
                    {new Date(request.created_at).toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Análisis</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total de Multas</p>
                  <p className="text-2xl font-bold">{request.fine_count}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Multas Prescritas</p>
                  <p className="text-2xl font-bold text-green-400">
                    {request.prescribed_count}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Monto Total (UTM)</p>
                  <p className="text-2xl font-bold">{request.total_amount_utm}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Valor UTM (CLP)</p>
                  <p className="text-2xl font-bold">
                    ${request.utm_value_clp.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>

            {/* Raw Analysis JSON */}
            {request.raw_analysis_json && (
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4">Análisis Completo (JSON)</h2>
                <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(request.raw_analysis_json, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Update */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Estado</h2>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4 focus:border-blue-500 outline-none"
              >
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobado</option>
                <option value="paid">Pagado</option>
                <option value="rejected">Rechazado</option>
              </select>
              <button
                onClick={handleUpdateStatus}
                disabled={saving || newStatus === request.status}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition"
              >
                {saving ? 'Actualizando...' : 'Actualizar Estado'}
              </button>

              <div className="mt-4 space-y-2">
                <p className="text-gray-400 text-sm">Estado de Pago</p>
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  request.payment_status === 'approved'
                    ? 'bg-green-900 text-green-200'
                    : request.payment_status === 'failed'
                    ? 'bg-red-900 text-red-200'
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  {request.payment_status || 'No procesado'}
                </span>
              </div>
            </div>

            {/* Add Note */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Agregar Nota</h2>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escribe una nota interna..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 resize-none h-24 mb-4 focus:border-blue-500 outline-none"
              />
              <button
                onClick={handleAddNote}
                disabled={saving || !newNote.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition"
              >
                {saving ? 'Guardando...' : 'Agregar Nota'}
              </button>
            </div>

            {/* Notes History */}
            {notes.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4">Notas ({notes.length})</h2>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-gray-700 p-3 rounded-lg text-sm">
                      <p className="text-gray-300">{note.note}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        {new Date(note.created_at).toLocaleString('es-CL')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
