'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, formatPrecio } from '@/lib/api';
import type { MenuDia, CartItem, Visita } from '@/types';

const CATEGORIA_COLORS: Record<string, string> = {
  Entradas: 'bg-amber-100 text-amber-700',
  'Platos de fondo': 'bg-orange-100 text-orange-700',
  Postres: 'bg-pink-100 text-pink-700',
  Bebidas: 'bg-blue-100 text-blue-700',
  Sopas: 'bg-yellow-100 text-yellow-700',
};

const ETIQUETA_COLORS: Record<string, string> = {
  'Oferta': 'bg-orange-500 text-white',
  'Especial del día': 'bg-purple-600 text-white',
  'Nuevo': 'bg-green-500 text-white',
  'Popular': 'bg-blue-500 text-white',
  'Recomendado': 'bg-teal-500 text-white',
  'Limitado': 'bg-red-500 text-white',
};

function getCatColor(nombre: string) {
  return CATEGORIA_COLORS[nombre] ?? 'bg-gray-100 text-gray-600';
}

function getEtiquetaColor(etiqueta: string) {
  return ETIQUETA_COLORS[etiqueta] ?? 'bg-gray-600 text-white';
}

export default function MesaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [menu, setMenu] = useState<MenuDia | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [visita, setVisita] = useState<Visita | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todos');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const { data: v } = await api.post(`/visitas/mesa/${id}`);
        setVisita(v);
        localStorage.setItem(`visita_mesa_${id}`, v.id.toString());

        const { data: m } = await api.get('/menu-dia/hoy');
        setMenu(m);

        const savedCart = localStorage.getItem(`cart_mesa_${id}`);
        if (savedCart) setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  function saveCart(newCart: CartItem[]) {
    setCart(newCart);
    localStorage.setItem(`cart_mesa_${id}`, JSON.stringify(newCart));
  }

  function addToCart(item: { platoId: number; nombre: string; precio: number }) {
    const existing = cart.find((c) => c.platoId === item.platoId);
    if (existing) {
      saveCart(cart.map((c) => c.platoId === item.platoId ? { ...c, cantidad: c.cantidad + 1 } : c));
    } else {
      saveCart([...cart, { ...item, cantidad: 1 }]);
    }
  }

  function removeFromCart(platoId: number) {
    const existing = cart.find((c) => c.platoId === platoId);
    if (!existing) return;
    if (existing.cantidad === 1) {
      saveCart(cart.filter((c) => c.platoId !== platoId));
    } else {
      saveCart(cart.map((c) => c.platoId === platoId ? { ...c, cantidad: c.cantidad - 1 } : c));
    }
  }

  async function enviarOrden() {
    if (!visita || cart.length === 0) return;
    setEnviando(true);
    try {
      await api.post(`/ordenes/visita/${visita.id}`, {
        items: cart.map((c) => ({ platoId: c.platoId, cantidad: c.cantidad, notas: c.notas })),
      });
      localStorage.removeItem(`cart_mesa_${id}`);
      setCart([]);
      router.push(`/mesa/${id}/estado`);
    } catch (e) {
      console.error(e);
      alert('Error al enviar la orden');
    } finally {
      setEnviando(false);
    }
  }

  const categorias = menu
    ? ['Todos', ...Array.from(new Set(menu.items?.map((i) => i.plato.categoria.nombre) ?? []))]
    : [];

  const itemsFiltrados = menu?.items?.filter(
    (i) => i.disponible && (filtroCategoria === 'Todos' || i.plato.categoria.nombre === filtroCategoria),
  ) ?? [];

  const totalCarrito = cart.reduce((s, c) => s + c.precio * c.cantidad, 0);
  const cantidadCarrito = cart.reduce((s, c) => s + c.cantidad, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50">
        <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-orange-600 font-medium">Cargando menú...</p>
      </div>
    );
  }

  if (!menu || (menu.items?.filter((i) => i.disponible).length ?? 0) === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 px-6 text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sin menú disponible</h2>
        <p className="text-gray-500 text-sm">
          No hay menú disponible en este momento.<br />Por favor consulta con el mesero.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-50 pb-32">

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 pt-8 pb-6 sticky top-0 z-20 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-orange-100 text-xs font-medium uppercase tracking-widest mb-1">Bienvenido</p>
            <h1 className="text-3xl font-bold leading-tight">Mesa {visita?.mesa?.numero}</h1>
            <p className="text-orange-100 text-sm mt-1">Menú del día</p>
          </div>
          {cantidadCarrito > 0 && (
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="relative bg-white/20 hover:bg-white/30 transition rounded-2xl px-4 py-2 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-bold text-sm">{cantidadCarrito}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtro categorías */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white shadow-sm border-b border-gray-100">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltroCategoria(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filtroCategoria === cat
                ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Platos */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {itemsFiltrados.length === 0 ? (
          <div className="text-center text-gray-400 mt-8 py-8">
            <p className="text-lg font-medium">Sin platos en esta categoría</p>
          </div>
        ) : (
          itemsFiltrados.map((item) => {
            const enCarrito = cart.find((c) => c.platoId === item.plato.id);
            const catColor = getCatColor(item.plato.categoria.nombre);
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all ${
                  enCarrito ? 'ring-2 ring-orange-400 shadow-md' : ''
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor}`}>
                          {item.plato.categoria.nombre}
                        </span>
                        {item.etiqueta && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getEtiquetaColor(item.etiqueta)}`}>
                            {item.etiqueta}
                          </span>
                        )}
                        {item.stock !== null && item.stock <= 3 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            Solo {item.stock} restantes
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 text-base leading-tight">{item.plato.nombre}</h3>
                      {item.plato.descripcion && (
                        <p className="text-gray-500 text-sm mt-1 leading-snug line-clamp-2">{item.plato.descripcion}</p>
                      )}
                      {item.precio_oferta !== null ? (
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-orange-500 font-bold text-xl">{formatPrecio(item.precio_oferta)}</p>
                          <p className="text-gray-400 line-through text-sm">{formatPrecio(item.plato.precio)}</p>
                          <span className="bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded">
                            -{Math.round((1 - Number(item.precio_oferta) / Number(item.plato.precio)) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <p className="text-orange-500 font-bold text-xl mt-2">{formatPrecio(item.plato.precio)}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {enCarrito ? (
                        <div className="flex items-center gap-2 bg-orange-50 rounded-xl p-1">
                          <button
                            onClick={() => removeFromCart(item.plato.id)}
                            className="w-9 h-9 rounded-lg bg-white border border-orange-200 text-orange-600 font-bold text-lg flex items-center justify-center shadow-sm hover:bg-orange-50 transition active:scale-95"
                          >
                            −
                          </button>
                          <span className="w-7 text-center font-bold text-gray-800 text-lg">{enCarrito.cantidad}</span>
                          <button
                            onClick={() => addToCart({ platoId: item.plato.id, nombre: item.plato.nombre, precio: item.precio_oferta !== null ? Number(item.precio_oferta) : Number(item.plato.precio) })}
                            className="w-9 h-9 rounded-lg bg-orange-500 text-white font-bold text-lg flex items-center justify-center shadow-sm hover:bg-orange-600 transition active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart({ platoId: item.plato.id, nombre: item.plato.nombre, precio: item.precio_oferta !== null ? Number(item.precio_oferta) : Number(item.plato.precio) })}
                          className="w-11 h-11 rounded-xl bg-orange-500 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-orange-200 hover:bg-orange-600 transition active:scale-95"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Panel de carrito expandible */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 max-w-lg mx-auto">
          {cartOpen && (
            <div className="bg-white border-t border-gray-200 shadow-2xl px-4 pt-4 pb-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Tu pedido</h3>
                <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col gap-2 mb-3">
                {cart.map((c) => (
                  <div key={c.platoId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                        {c.cantidad}
                      </span>
                      <span className="text-gray-700 font-medium">{c.nombre}</span>
                    </div>
                    <span className="text-gray-600">{formatPrecio(c.precio * c.cantidad)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="font-bold text-orange-500">{formatPrecio(totalCarrito)}</span>
              </div>
            </div>
          )}

          <div className="bg-white border-t border-gray-200 shadow-2xl px-4 py-3">
            <div className="w-full flex items-center justify-between bg-orange-500 text-white px-5 py-4 rounded-2xl font-bold shadow-lg shadow-orange-200">
              <button
                onClick={() => setCartOpen(!cartOpen)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                  {cantidadCarrito}
                </span>
                <span className="text-base">Ver mi pedido</span>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-base">{formatPrecio(totalCarrito)}</span>
                <button
                  onClick={enviarOrden}
                  disabled={enviando}
                  className="bg-white text-orange-600 px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-orange-50 transition disabled:opacity-50"
                >
                  {enviando ? 'Enviando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
