'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { Orden } from '@/types';

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  EN_PREPARACION: 'bg-blue-100 text-blue-700',
  LISTO: 'bg-green-100 text-green-700',
  ENTREGADO: 'bg-gray-100 text-gray-600',
  CANCELADO: 'bg-red-100 text-red-600',
};

export default function OrdenesPage() {
  const [alertas, setAlertas] = useState<Orden[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playAlert() {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  useEffect(() => {
    const socket = getSocket();
    socket.emit('unirse_meseros');

    socket.on('orden_lista_para_entregar', (orden: Orden) => {
      setAlertas((prev) => [...prev.filter((o) => o.id !== orden.id), orden]);
      playAlert();
    });

    return () => {
      socket.off('orden_lista_para_entregar');
    };
  }, []);

  async function marcarEntregado(ordenId: number) {
    await api.put(`/ordenes/${ordenId}/entregar`);
    setAlertas((prev) => prev.filter((o) => o.id !== ordenId));
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Órdenes listas</h1>

      {alertas.length === 0 ? (
        <div className="text-center text-gray-500 mt-12">
          <p className="text-4xl mb-3">✓</p>
          <p>No hay órdenes listas para entregar</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {alertas.map((orden) => (
            <div
              key={orden.id}
              className="bg-white border-2 border-green-400 rounded-xl p-4 shadow animate-pulse-once"
            >
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-bold text-lg">Orden #{orden.id}</p>
                  <p className="text-gray-500 text-sm">
                    Mesa {orden.visita?.mesa?.numero}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${ESTADO_COLORS[orden.estado]}`}>
                  {orden.estado}
                </span>
              </div>

              <div className="flex flex-col gap-1 mb-3">
                {orden.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.cantidad}x {item.plato?.nombre}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${ESTADO_COLORS[item.estado]}`}>
                      {item.estado}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => marcarEntregado(orden.id)}
                className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Marcar como entregada
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
