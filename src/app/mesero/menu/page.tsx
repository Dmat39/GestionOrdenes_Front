'use client';
import { useEffect, useState } from 'react';
import { api, formatPrecio } from '@/lib/api';
import type { MenuDia, Plato, MenuDiaItem } from '@/types';

type Tab = 'menu' | 'agregar';

const ETIQUETAS_PRESET = ['Oferta', 'Especial del día', 'Nuevo', 'Popular', 'Recomendado', 'Limitado'];

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuDia | null>(null);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('menu');
  const [saving, setSaving] = useState(false);
  const [selectedPlatos, setSelectedPlatos] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');

  // Edición inline por item
  const [editItem, setEditItem] = useState<Record<number, {
    stock: string;
    precio_oferta: string;
    etiqueta: string;
  }>>({});

  async function loadData() {
    try {
      const [menuRes, platosRes] = await Promise.all([
        api.get('/menu-dia/hoy').catch(() => ({ data: null })),
        api.get('/platos'),
      ]);
      setMenu(menuRes.data);
      setPlatos(platosRes.data.filter((p: Plato) => p.activo));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // Inicializar estado de edición cuando carga el menú
  useEffect(() => {
    if (menu) {
      const inicial: typeof editItem = {};
      menu.items.forEach((i) => {
        inicial[i.id] = {
          stock: i.stock !== null ? String(i.stock) : '',
          precio_oferta: i.precio_oferta !== null ? String(i.precio_oferta) : '',
          etiqueta: i.etiqueta ?? '',
        };
      });
      setEditItem(inicial);
    }
  }, [menu?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const platosEnMenu = new Set(menu?.items?.map((i) => i.plato.id) ?? []);
  const platosDisponibles = platos.filter((p) => !platosEnMenu.has(p.id));
  const categorias = ['Todos', ...Array.from(new Set(platosDisponibles.map((p) => p.categoria.nombre)))];
  const platosFiltrados = filtroCategoria === 'Todos'
    ? platosDisponibles
    : platosDisponibles.filter((p) => p.categoria.nombre === filtroCategoria);

  async function crearMenuConSeleccionados() {
    if (selectedPlatos.size === 0) return;
    setSaving(true);
    try {
      const { data } = await api.post('/menu-dia', { platoIds: Array.from(selectedPlatos) });
      setMenu(data);
      setSelectedPlatos(new Set());
      setTab('menu');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err?.response?.data?.message || 'Error al crear menú');
    } finally {
      setSaving(false);
    }
  }

  async function crearMenuConTodos() {
    setSaving(true);
    try {
      const { data } = await api.post('/menu-dia', { platoIds: platos.map((p) => p.id) });
      setMenu(data);
      setTab('menu');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err?.response?.data?.message || 'Error al crear menú');
    } finally {
      setSaving(false);
    }
  }

  async function agregarPlato(platoId: number) {
    if (!menu) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/menu-dia/${menu.id}/platos`, { platoId });
      setMenu((prev) => prev ? { ...prev, items: [...prev.items, data] } : prev);
      setEditItem((prev) => ({
        ...prev,
        [data.id]: { stock: '', precio_oferta: '', etiqueta: '' },
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function agregarSeleccionados() {
    if (!menu || selectedPlatos.size === 0) return;
    setSaving(true);
    try {
      for (const platoId of Array.from(selectedPlatos)) {
        const { data } = await api.post(`/menu-dia/${menu.id}/platos`, { platoId });
        setMenu((prev) => prev ? { ...prev, items: [...prev.items, data] } : prev);
        setEditItem((prev) => ({
          ...prev,
          [data.id]: { stock: '', precio_oferta: '', etiqueta: '' },
        }));
      }
      setSelectedPlatos(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleDisponible(item: MenuDiaItem) {
    const { data } = await api.put(`/menu-dia/items/${item.id}`, { disponible: !item.disponible });
    setMenu((prev) =>
      prev ? { ...prev, items: prev.items.map((i) => (i.id === data.id ? data : i)) } : prev,
    );
  }

  async function guardarItem(itemId: number) {
    const e = editItem[itemId];
    if (!e) return;
    const payload: Record<string, unknown> = {
      stock: e.stock === '' ? null : parseInt(e.stock),
      precio_oferta: e.precio_oferta === '' ? null : parseFloat(e.precio_oferta),
      etiqueta: e.etiqueta.trim() === '' ? null : e.etiqueta.trim(),
    };
    const { data } = await api.put(`/menu-dia/items/${itemId}`, payload);
    setMenu((prev) =>
      prev ? { ...prev, items: prev.items.map((i) => (i.id === data.id ? data : i)) } : prev,
    );
  }

  async function eliminarItem(itemId: number) {
    await api.delete(`/menu-dia/items/${itemId}`);
    setMenu((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev,
    );
  }

  async function eliminarMenuHoy() {
    setSaving(true);
    try {
      await api.delete('/menu-dia/hoy');
      setMenu(null);
      setConfirmDelete(false);
      setTab('menu');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function toggleSelectPlato(id: number) {
    setSelectedPlatos((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function updateEdit(itemId: number, field: string, value: string) {
    setEditItem((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Sin menú ─────────────────────────────────────────────────────────────
  if (!menu) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Menú del día</h1>
            <p className="text-gray-500 text-sm mt-0.5">No hay menú creado para hoy</p>
          </div>
          <button
            onClick={crearMenuConTodos}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Creando...' : 'Crear con todos los platos'}
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-amber-700 text-sm">
            Selecciona los platos del catálogo para el menú de hoy, o crea el menú con todos los platos activos de golpe.
            Puedes agregar ofertas y etiquetas especiales después de crear el menú.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">
              Seleccionar platos
              {selectedPlatos.size > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {selectedPlatos.size} seleccionados
                </span>
              )}
            </h2>
            <button
              onClick={crearMenuConSeleccionados}
              disabled={saving || selectedPlatos.size === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40"
            >
              Crear menú
            </button>
          </div>
          <div className="px-5 py-3 border-b border-gray-50 flex gap-2 overflow-x-auto">
            {['Todos', ...Array.from(new Set(platos.map((p) => p.categoria.nombre)))].map((cat) => (
              <button key={cat} onClick={() => setFiltroCategoria(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filtroCategoria === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="divide-y divide-gray-50">
            {(filtroCategoria === 'Todos' ? platos : platos.filter((p) => p.categoria.nombre === filtroCategoria)).map((plato) => (
              <label key={plato.id} className="flex items-center px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition">
                <input type="checkbox" checked={selectedPlatos.has(plato.id)} onChange={() => toggleSelectPlato(plato.id)}
                  className="w-4 h-4 rounded accent-blue-600 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{plato.nombre}</p>
                  <p className="text-gray-400 text-xs">{plato.categoria.nombre}</p>
                </div>
                <span className="text-blue-600 font-semibold text-sm ml-3">{formatPrecio(plato.precio)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Con menú ─────────────────────────────────────────────────────────────
  const disponibles = menu.items.filter((i) => i.disponible).length;
  const conOferta = menu.items.filter((i) => i.precio_oferta !== null).length;
  const conEtiqueta = menu.items.filter((i) => i.etiqueta !== null).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Menú del día</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-gray-500 text-sm">{menu.items.length} platos</span>
            <span className="text-green-600 text-sm font-medium">{disponibles} disponibles</span>
            {conOferta > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {conOferta} con oferta
              </span>
            )}
            {conEtiqueta > 0 && (
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {conEtiqueta} con etiqueta
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setConfirmDelete(true)}
          className="border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition">
          Eliminar menú
        </button>
      </div>

      {/* Modal confirmación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 text-lg mb-2">¿Eliminar menú de hoy?</h3>
            <p className="text-gray-500 text-sm mb-5">Los comensales no podrán ver el menú hasta que crees uno nuevo.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={eliminarMenuHoy} disabled={saving}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                {saving ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        <button onClick={() => setTab('menu')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === 'menu' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Menú actual
        </button>
        <button onClick={() => { setTab('agregar'); setSelectedPlatos(new Set()); }}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${tab === 'agregar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Agregar platos
          {platosDisponibles.length > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{platosDisponibles.length}</span>
          )}
        </button>
      </div>

      {/* ── Tab: Menú actual ── */}
      {tab === 'menu' && (
        <div className="flex flex-col gap-3">
          {menu.items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-12 text-gray-400">
              <p className="font-medium">El menú está vacío</p>
              <p className="text-sm mt-1">Agrega platos desde la pestaña &quot;Agregar platos&quot;</p>
            </div>
          ) : (
            menu.items.map((item) => {
              const e = editItem[item.id] ?? { stock: '', precio_oferta: '', etiqueta: '' };
              const tieneOferta = item.precio_oferta !== null;
              const tieneEtiqueta = item.etiqueta !== null;
              return (
                <div key={item.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${!item.disponible ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>

                  {/* Fila principal */}
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800">{item.plato.nombre}</p>
                        <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                          {item.plato.categoria.nombre}
                        </span>
                        {tieneEtiqueta && (
                          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            {item.etiqueta}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {tieneOferta ? (
                          <>
                            <span className="text-gray-400 line-through text-sm">{formatPrecio(item.plato.precio)}</span>
                            <span className="text-orange-600 font-bold">{formatPrecio(item.precio_oferta!)}</span>
                            <span className="bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 rounded font-medium">
                              -{Math.round((1 - Number(item.precio_oferta) / Number(item.plato.precio)) * 100)}%
                            </span>
                          </>
                        ) : (
                          <span className="text-blue-600 font-semibold">{formatPrecio(item.plato.precio)}</span>
                        )}
                        {item.stock !== null && (
                          <span className="text-xs text-gray-400">· Stock: {item.stock}</span>
                        )}
                      </div>
                    </div>

                    {/* Toggle disponible */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 hidden sm:block">
                        {item.disponible ? 'Disponible' : 'Agotado'}
                      </span>
                      <button onClick={() => toggleDisponible(item)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${item.disponible ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${item.disponible ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Eliminar */}
                    <button onClick={() => eliminarItem(item.id)}
                      className="w-8 h-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Fila de edición: stock, oferta, etiqueta */}
                  <div className="border-t border-gray-50 bg-gray-50/50 px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Stock */}
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                        Stock disponible
                      </label>
                      <input
                        type="number" min="0"
                        value={e.stock}
                        placeholder="Sin límite"
                        onChange={(ev) => updateEdit(item.id, 'stock', ev.target.value)}
                        onBlur={() => guardarItem(item.id)}
                        onKeyDown={(ev) => ev.key === 'Enter' && guardarItem(item.id)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                      />
                    </div>

                    {/* Precio oferta */}
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                        Precio oferta (S/.)
                      </label>
                      <input
                        type="number" min="0" step="0.50"
                        value={e.precio_oferta}
                        placeholder={`Normal: ${formatPrecio(item.plato.precio)}`}
                        onChange={(ev) => updateEdit(item.id, 'precio_oferta', ev.target.value)}
                        onBlur={() => guardarItem(item.id)}
                        onKeyDown={(ev) => ev.key === 'Enter' && guardarItem(item.id)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                      />
                    </div>

                    {/* Etiqueta */}
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                        Etiqueta especial
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={e.etiqueta}
                          placeholder="Sin etiqueta"
                          onChange={(ev) => updateEdit(item.id, 'etiqueta', ev.target.value)}
                          onBlur={() => guardarItem(item.id)}
                          onKeyDown={(ev) => ev.key === 'Enter' && guardarItem(item.id)}
                          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
                        />
                        <div className="relative group">
                          <button className="h-full px-2 border border-gray-200 rounded-lg bg-white text-gray-400 hover:text-gray-600 hover:border-gray-300 transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44 hidden group-hover:block">
                            <button onClick={() => { updateEdit(item.id, 'etiqueta', ''); setTimeout(() => guardarItem(item.id), 0); }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 italic">
                              Sin etiqueta
                            </button>
                            {ETIQUETAS_PRESET.map((et) => (
                              <button key={et} onClick={() => { updateEdit(item.id, 'etiqueta', et); setTimeout(() => guardarItem(item.id), 0); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium">
                                {et}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: Agregar platos ── */}
      {tab === 'agregar' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {platosDisponibles.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">Todos los platos del catálogo ya están en el menú</p>
              <p className="text-sm mt-1">Agrega más platos desde la sección Catálogo</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-1.5 overflow-x-auto">
                  {categorias.map((cat) => (
                    <button key={cat} onClick={() => setFiltroCategoria(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filtroCategoria === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                {selectedPlatos.size > 0 && (
                  <button onClick={agregarSeleccionados} disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">
                    {saving ? 'Agregando...' : `Agregar ${selectedPlatos.size} seleccionados`}
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {platosFiltrados.map((plato) => (
                  <div key={plato.id} className="flex items-center px-4 py-3.5 hover:bg-gray-50 transition">
                    <input type="checkbox" checked={selectedPlatos.has(plato.id)} onChange={() => toggleSelectPlato(plato.id)}
                      className="w-4 h-4 rounded accent-blue-600 mr-3 flex-shrink-0 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{plato.nombre}</p>
                      <p className="text-gray-400 text-xs">{plato.categoria.nombre}</p>
                    </div>
                    <span className="text-blue-600 font-semibold text-sm mx-4">{formatPrecio(plato.precio)}</span>
                    <button onClick={() => agregarPlato(plato.id)} disabled={saving}
                      className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Agregar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
