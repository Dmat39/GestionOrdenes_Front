'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { getToken, getRol } from '@/lib/auth';
import type { OrdenItem } from '@/types';

type Estado = 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO';

const SIGUIENTE_ESTADO: Record<string, Estado | null> = {
  PENDIENTE: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTO',
  LISTO: null,
};

const ESTADO_CONFIG: Record<string, { label: string; badge: string; card: string; btn: string; dot: string }> = {
  PENDIENTE: {
    label: 'Pendiente',
    badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    card: 'border-yellow-500/50 bg-gradient-to-b from-yellow-950/30 to-gray-800',
    btn: 'bg-yellow-500 hover:bg-yellow-400 text-gray-900',
    dot: 'bg-yellow-400',
  },
  EN_PREPARACION: {
    label: 'En preparación',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    card: 'border-blue-500/50 bg-gradient-to-b from-blue-950/30 to-gray-800',
    btn: 'bg-blue-500 hover:bg-blue-400 text-white',
    dot: 'bg-blue-400',
  },
  LISTO: {
    label: 'Listo',
    badge: 'bg-green-500/20 text-green-300 border border-green-500/30',
    card: 'border-green-500/50 bg-gradient-to-b from-green-950/30 to-gray-800',
    btn: 'bg-green-500 hover:bg-green-400 text-white',
    dot: 'bg-green-400',
  },
};

function tiempoTranscurrido(created_at: string): string {
  const diff = Math.floor((Date.now() - new Date(created_at).getTime()) / 60000);
  if (diff < 1) return 'Ahora';
  if (diff === 1) return '1 min';
  return `${diff} min`;
}

export default function CocinaPage() {
  const router = useRouter();
  const [items, setItems] = useState<OrdenItem[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [, forceUpdate] = useState(0);

  // Actualizar tiempos cada minuto
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!getToken() || getRol() !== 'COCINERO') {
      router.push('/login');
      return;
    }

    api.get('/ordenes/cocina/items').then(({ data }) => setItems(data));

    const socket = getSocket();
    socket.emit('unirse_cocina');

    socket.on('nueva_orden', () => {
      api.get('/ordenes/cocina/items').then(({ data }) => {
        setItems(data);
        try {
          if (!audioRef.current) {
            audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...');
          }
          audioRef.current.play().catch(() => {});
        } catch {}
      });
    });

    socket.on('orden_item_actualizado', (item: OrdenItem) => {
      setItems((prev) => {
        const exists = prev.find((i) => i.id === item.id);
        if (!exists) return prev;
        if (['LISTO', 'CANCELADO', 'ENTREGADO'].includes(item.estado)) {
          return prev.filter((i) => i.id !== item.id);
        }
        return prev.map((i) => (i.id === item.id ? item : i));
      });
    });

    return () => {
      socket.off('nueva_orden');
      socket.off('orden_item_actualizado');
    };
  }, [router]);

  async function avanzarEstado(item: OrdenItem) {
    const siguiente = SIGUIENTE_ESTADO[item.estado];
    if (!siguiente) return;
    try {
      const { data } = await api.put(`/ordenes/items/${item.id}/estado`, { estado: siguiente });
      setItems((prev) => {
        if (['LISTO', 'CANCELADO'].includes(data.estado)) {
          return prev.filter((i) => i.id !== data.id);
        }
        return prev.map((i) => (i.id === data.id ? data : i));
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function cancelarItem(item: OrdenItem) {
    try {
      await api.put(`/ordenes/items/${item.id}/estado`, { estado: 'CANCELADO' });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      console.error(e);
    }
  }

  const categorias = ['Todos', ...Array.from(new Set(items.map((i) => i.plato?.categoria?.nombre).filter(Boolean)))];

  const itemsFiltrados = filtroCategoria === 'Todos'
    ? items
    : items.filter((i) => i.plato?.categoria?.nombre === filtroCategoria);

  const pendientes = items.filter((i) => i.estado === 'PENDIENTE').length;
  const enPrep = items.filter((i) => i.estado === 'EN_PREPARACION').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* Header */}
      <div className="bg-gray-950 border-b border-gray-800 px-5 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Cocina</h1>
            </div>

            <div className="flex items-center gap-2">
              {pendientes > 0 && (
                <span className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-semibold px-3 py-1 rounded-full">
                  {pendientes} pendientes
                </span>
              )}
              {enPrep > 0 && (
                <span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full">
                  {enPrep} en preparación
                </span>
              )}
              {items.length === 0 && (
                <span className="bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-semibold px-3 py-1 rounded-full">
                  Todo al día
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filtro categorías */}
      <div className="bg-gray-900 border-b border-gray-800 px-5 py-3">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filtroCategoria === cat
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="max-w-7xl mx-auto p-5">
        {itemsFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium text-lg">Todo preparado</p>
            <p className="text-gray-600 text-sm mt-1">No hay pedidos pendientes en este momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {itemsFiltrados.map((item) => {
              const cfg = ESTADO_CONFIG[item.estado];
              const siguiente = SIGUIENTE_ESTADO[item.estado];
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border ${cfg.card} overflow-hidden transition-all hover:scale-[1.01]`}
                >
                  {/* Card header */}
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <h3 className="text-white font-bold text-lg leading-tight">{item.plato?.nombre}</h3>
                        <p className="text-gray-400 text-sm mt-0.5">
                          {item.plato?.categoria?.nombre}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gray-700/60 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
                        <span className="text-white font-bold text-2xl">{item.cantidad}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                        </svg>
                        Mesa {item.orden?.visita?.mesa?.numero}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {tiempoTranscurrido(item.created_at)}
                      </span>
                    </div>

                    {item.notas && (
                      <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                        <p className="text-amber-300 text-xs font-medium">Nota del cliente</p>
                        <p className="text-amber-200 text-sm mt-0.5">{item.notas}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    {siguiente && (
                      <button
                        onClick={() => avanzarEstado(item)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition active:scale-95 ${cfg.btn}`}
                      >
                        {siguiente === 'EN_PREPARACION' ? 'Iniciar' : 'Marcar listo'}
                      </button>
                    )}
                    <button
                      onClick={() => cancelarItem(item)}
                      className="px-3 py-2.5 bg-gray-700 hover:bg-red-900/40 hover:text-red-400 text-gray-400 rounded-xl text-sm transition"
                      title="Cancelar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
