'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UploadForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    plate: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [consent, setConsent] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.plate || !file || !consent) {
      setError('Por favor completa todos los campos y acepta los términos.');
      return;
    }

    if (!file.type.includes('pdf')) {
      setError('Por favor carga un archivo PDF válido.');
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('plate', formData.plate);
      formDataToSend.append('consent', consent ? 'true' : 'false');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      router.push(`/resultados/${result.requestId}`);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el certificado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="upload-form" className="py-20 bg-gray-50">
      <div className="container max-w-2xl">
        <div className="card">
          <h2 className="text-3xl font-bold mb-8 text-center">Analiza tu Certificado</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer block">
                {file ? (
                  <>
                    <span className="text-2xl mb-2 block">✅</span>
                    <p className="text-gray-900 font-semibold">{file.name}</p>
                    <p className="text-gray-500 text-sm">Click para cambiar</p>
                  </>
                ) : (
                  <>
                    <span className="text-4xl mb-2 block">📄</span>
                    <p className="text-gray-900 font-semibold mb-1">Arrastra tu PDF aquí o haz click</p>
                    <p className="text-gray-500">Carga tu certificado RMNP en formato PDF</p>
                  </>
                )}
              </label>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="name"
                placeholder="Tu nombre"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Tu email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <input
              type="text"
              name="plate"
              placeholder="Patente (ej: ABCD1234)"
              value={formData.plate}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Consent Checkbox */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <label htmlFor="consent" className="text-sm text-gray-700">
                Entiendo que este es un análisis informativo y no constituye asesoramiento legal. Acepto los
                términos de privacidad.
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 text-white font-semibold py-3 rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
            >
              {loading ? 'Analizando...' : 'Analizar Certificado (Gratis)'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
