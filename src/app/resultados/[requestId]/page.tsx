'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface Fine {
  rol: string;
  year: number;
  rmnpEntryDate: string;
  amount: number;
  status: 'PRESCRITA' | 'NO_PRESCRITA' | 'REQUIERE_REVISION';
  yearsElapsed: number;
}

interface AnalysisResult {
  requestId: string;
  plate: string;
  issueDate: string;
  totalFines: number;
  prescribedFines: number;
  notPrescribedFines: number;
  reviewRequiredFines: number;
  fines: Fine[];
  certificateInfo: {
    ownerName: string;
    ownerRun: string;
    issueDate: string;
  };
}

interface RequestData {
  status: string;
  analysis?: AnalysisResult;
  metadata?: {
    name: string;
    email: string;
    plate: string;
  };
}

export default function ResultadosPage() {
  const params = useParams();
  const requestId = params.requestId as string;
  const [data, setData] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/results/${requestId}`);
        if (!response.ok) {
          throw new Error('No se encontraron resultados');
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Error al cargar resultados');
      } finally {
        setLoading(false);
      }
    };

    if (requestId) {
      fetchResults();
    }
  }, [requestId]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="py-20 bg-gray-50">
          <div className="container max-w-2xl">
            <div className="card text-center">
              <p className="text-gray-600">Cargando resultados...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header />
        <div className="py-20 bg-gray-50">
          <div className="container max-w-2xl">
            <div className="card">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error || 'Error al cargar los resultados'}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const analysis = data.analysis;

  if (!analysis) {
    return (
      <>
        <Header />
        <div className="py-20 bg-gray-50">
          <div className="container max-w-2xl">
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Análisis en Progreso</h2>
              <p className="text-gray-600">
                Tu certificado está siendo analizado. Por favor revisa tu email para más detalles.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="py-20 bg-gray-50">
        <div className="container max-w-3xl">
          {/* Header Summary */}
          <div className="card mb-8 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <h1 className="text-3xl font-bold mb-2">Resultados del Análisis</h1>
            <p className="text-gray-600 mb-6">Patente: <span className="font-semibold">{analysis.plate}</span></p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{analysis.totalFines}</div>
                <p className="text-sm text-gray-600">Total de Multas</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{analysis.prescribedFines}</div>
                <p className="text-sm text-gray-600">Prescritas</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{analysis.notPrescribedFines}</div>
                <p className="text-sm text-gray-600">Vigentes</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">{analysis.reviewRequiredFines}</div>
                <p className="text-sm text-gray-600">Requieren Revisión</p>
              </div>
            </div>
          </div>

          {/* Certificate Info */}
          <div className="card mb-8">
            <h2 className="text-xl font-bold mb-4">Información del Certificado</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex justify-between">
                <span className="font-semibold">Propietario:</span>
                <span>{analysis.certificateInfo.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">RUN:</span>
                <span>{analysis.certificateInfo.ownerRun}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Fecha de Emisión:</span>
                <span>{new Date(analysis.certificateInfo.issueDate).toLocaleDateString('es-CL')}</span>
              </div>
            </div>
          </div>

          {/* Fines Table */}
          {analysis.fines.length > 0 && (
            <div className="card mb-8">
              <h2 className="text-xl font-bold mb-4">Detalle de Multas</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">ROL</th>
                      <th className="px-4 py-3 text-left">Año</th>
                      <th className="px-4 py-3 text-left">Entrada RMNP</th>
                      <th className="px-4 py-3 text-right">Años Transcurridos</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.fines.map((fine, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono">{fine.rol}</td>
                        <td className="px-4 py-3">{fine.year}</td>
                        <td className="px-4 py-3">{fine.rmnpEntryDate}</td>
                        <td className="px-4 py-3 text-right">{fine.yearsElapsed.toFixed(1)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              fine.status === 'PRESCRITA'
                                ? 'bg-green-100 text-green-800'
                                : fine.status === 'NO_PRESCRITA'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {fine.status === 'PRESCRITA'
                              ? '✅ Prescrita'
                              : fine.status === 'NO_PRESCRITA'
                                ? '❌ Vigente'
                                : '⚠️ Revisar'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">${fine.amount.toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CTA Section */}
          {analysis.prescribedFines > 0 && (
            <div className="card bg-blue-50 border-blue-200">
              <h2 className="text-xl font-bold mb-4">Próximos Pasos</h2>
              <p className="text-gray-700 mb-6">
                Identificamos {analysis.prescribedFines} multa{analysis.prescribedFines !== 1 ? 's' : ''} prescrita{analysis.prescribedFines !== 1 ? 's' : ''}.
                Obtén el informe completo con documentos listos para presentar en tribunal.
              </p>
              <button className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition">
                Comprar Informe Completo - $49,900
              </button>
              <p className="text-xs text-gray-600 text-center mt-4">
                Incluye análisis detallado, solicitudes por tribunal y documentos listos para presentar.
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p className="font-semibold mb-2">⚠️ Descargo Legal</p>
            <p>
              Este análisis es informativo y preliminar. La decisión final sobre prescripción corresponde exclusivamente al tribunal.
              Te recomendamos consultar con un abogado antes de presentar cualquier solicitud.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
