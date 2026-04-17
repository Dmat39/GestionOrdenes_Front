'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { Orden, OrdenItem } from '@/types';

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDIENTE:      { label: 'Pendiente',           bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-400' },
  EN_PREPARACION: { label: 'En preparación',      bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400' },
  LISTO:          { label: 'Listo para entregar', bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  ENTREGADO:      { label: 'Entregado',           bg: 'bg-gray-50',    text: 'text-gray-500',   dot: 'bg-gray-400' },
  CANCELADO:      { label: 'Cancelado',           bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400' },
};

const ORDEN_ESTADO_CONFIG: Record<string, { label: string; badge: string }> = {
  PENDIENTE:      { label: 'Pendiente',      badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  EN_PREPARACION: { label: 'En preparación', badge: 'bg-blue-100 text-blue-700 border border-blue-200' },
  LISTO:          { label: 'Listo',          badge: 'bg-green-100 text-green-700 border border-green-200' },
  ENTREGADO:      { label: 'Entregado',      badge: 'bg-gray-100 text-gray-600 border border-gray-200' },
  CANCELADO:      { label: 'Cancelado',      badge: 'bg-red-100 text-red-600 border border-red-200' },
};

export default function EstadoMesaPage() {
  const { id } = useParams<{ id: string }>();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [cuentaGenerada, setCuentaGenerada] = useState(false);

  useEffect(() => {
    const visitaId = localStorage.getItem(`visita_mesa_${id}`);
    if (!visitaId) return;

    api.get(`/ordenes/visita/${visitaId}`).then(({ data }) => setOrdenes(data));

    const socket = getSocket();
    socket.emit('unirse_mesa', Number(id));

    socket.on('orden_item_actualizado', (item: OrdenItem) => {
      setOrdenes((prev) =>
        prev.map((orden) => ({
          ...orden,
          items: orden.items.map((i) => (i.id === item.id ? item : i)),
        })),
      );
    });

    socket.on('cuenta_generada', () => setCuentaGenerada(true));

    return () => {
      socket.off('orden_item_actualizado');
      socket.off('cuenta_generada');
    };
  }, [id]);

  const totalItems = ordenes.reduce((s, o) => s + o.items.length, 0);
  const itemsListos = ordenes.reduce(
    (s, o) => s + o.items.filter((i) => i.estado === 'LISTO' || i.estado === 'ENTREGADO').length,
    0,
  );
  const progreso = totalItems > 0 ? Math.round((itemsListos / totalItems) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 pt-8 pb-6">
        <p className="text-orange-100 text-xs font-medium uppercase tracking-widest mb-1">Mesa {id}</p>
        <h1 className="text-2xl font-bold">Estado de tu orden</h1>
        {totalItems > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-sm text-orange-100 mb-1">
              <span>{itemsListos} de {totalItems} preparados</span>
              <span>{progreso}%</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        {/* Alerta cuenta */}
        {cuentaGenerada && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-green-800 font-semibold">Cuenta generada</p>
              <p className="text-green-600 text-sm">El mesero se acercará en breve con la cuenta.</p>
            </div>
          </div>
        )}

        {ordenes.length === 0 ? (
          <div className="text-center mt-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-1">No hay órdenes activas</p>
            <p className="text-gray-400 text-sm mb-4">Aún no has realizado ningún pedido</p>
            <Link
              href={`/mesa/${id}`}
              className="inline-block bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition"
            >
              Ver menú
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {ordenes.map((orden) => {
              const cfg = ORDEN_ESTADO_CONFIG[orden.estado];
              return (
                <div key={orden.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-semibold text-gray-700 text-sm">Pedido #{orden.id}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-2.5">
                    {orden.items.map((item) => {
                      const ic = ESTADO_CONFIG[item.estado];
                      return (
                        <div key={item.id} className={`flex items-center justify-between rounded-xl px-3 py-2 ${ic.bg}`}>
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-700 shadow-sm">
                              {item.cantidad}
                            </span>
                            <div>
                              <p className={`text-sm font-semibold ${ic.text}`}>{item.plato.nombre}</p>
                              {item.notas && (
                                <p className="text-xs text-gray-400">{item.notas}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${ic.dot}`} />
                            <span className={`text-xs font-medium ${ic.text}`}>{ic.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <Link
              href={`/mesa/${id}`}
              className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-orange-300 rounded-2xl text-orange-500 font-medium hover:bg-orange-50 transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar más platos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
