'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Mesa } from '@/types';

const ESTADO_CONFIG: Record<string, { label: string; card: string; num: string; dot: string }> = {
  LIBRE: {
    label: 'Libre',
    card: 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md',
    num: 'text-gray-800',
    dot: 'bg-green-400',
  },
  OCUPADA: {
    label: 'Ocupada',
    card: 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-300 hover:shadow-md',
    num: 'text-amber-800',
    dot: 'bg-amber-400',
  },
  CUENTA_PENDIENTE: {
    label: 'Cuenta',
    card: 'bg-red-50 border-red-200 text-red-700 hover:border-red-300 hover:shadow-md',
    num: 'text-red-700',
    dot: 'bg-red-500',
  },
};

export default function DashboardPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    function fetchMesas() {
      api.get('/mesas').then(({ data }) => {
        setMesas(data);
        setLastUpdate(new Date());
      });
    }
    fetchMesas();
    const interval = setInterval(fetchMesas, 10000);
    return () => clearInterval(interval);
  }, []);

  const libres = mesas.filter((m) => m.estado === 'LIBRE').length;
  const ocupadas = mesas.filter((m) => m.estado === 'OCUPADA').length;
  const cuentas = mesas.filter((m) => m.estado === 'CUENTA_PENDIENTE').length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            Actualizado {lastUpdate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          En vivo
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs text-gray-400 font-medium">LIBRES</span>
          </div>
          <p className="text-4xl font-bold text-gray-800">{libres}</p>
          <p className="text-gray-500 text-sm mt-1">mesas disponibles</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
            </div>
            <span className="text-xs text-amber-500 font-medium">OCUPADAS</span>
          </div>
          <p className="text-4xl font-bold text-amber-700">{ocupadas}</p>
          <p className="text-amber-600 text-sm mt-1">mesas con clientes</p>
        </div>

        <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-xs text-red-400 font-medium">COBRAR</span>
          </div>
          <p className="text-4xl font-bold text-red-600">{cuentas}</p>
          <p className="text-red-500 text-sm mt-1">cuentas pendientes</p>
        </div>
      </div>

      {/* Mesas */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Estado de mesas</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {mesas.map((mesa) => {
            const cfg = ESTADO_CONFIG[mesa.estado];
            const clickable = mesa.estado !== 'LIBRE';
            return (
              <Link
                key={mesa.id}
                href={clickable ? `/mesero/cuenta/${mesa.id}` : '#'}
                onClick={(e) => !clickable && e.preventDefault()}
                className={`border-2 rounded-2xl p-3 text-center transition-all ${cfg.card} ${
                  clickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                </div>
                <p className={`text-2xl font-bold ${cfg.num}`}>{mesa.numero}</p>
                <p className="text-xs mt-0.5 font-medium opacity-70">{cfg.label}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
