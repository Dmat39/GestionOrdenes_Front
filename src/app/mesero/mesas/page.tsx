'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Mesa } from '@/types';

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadMesas() {
    const { data } = await api.get('/mesas');
    setMesas(data);
    setLoading(false);
  }

  useEffect(() => { loadMesas(); }, []);

  async function toggleQR(mesa: Mesa) {
    const { data } = await api.post(`/mesas/${mesa.id}/qr`);
    setMesas((prev) => prev.map((m) => (m.id === data.id ? data : m)));
  }

  if (loading) return <div className="text-center mt-8 text-gray-500">Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mesas</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {mesas.map((mesa) => (
          <div key={mesa.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">Mesa #{mesa.numero}</h2>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                mesa.estado === 'LIBRE' ? 'bg-green-100 text-green-700' :
                mesa.estado === 'OCUPADA' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {mesa.estado}
              </span>
            </div>

            {mesa.qr_code && (
              <Image src={mesa.qr_code} alt={`QR Mesa ${mesa.numero}`} width={96} height={96} className="mx-auto mb-3 rounded" />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => toggleQR(mesa)}
                className="flex-1 text-sm py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Regenerar QR
              </button>
              {mesa.estado !== 'LIBRE' && (
                <Link
                  href={`/mesero/cuenta/${mesa.id}`}
                  className="flex-1 text-sm py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center"
                >
                  Ver cuenta
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
