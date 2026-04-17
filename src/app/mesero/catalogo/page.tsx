'use client';
import { useEffect, useState } from 'react';
import { api, formatPrecio } from '@/lib/api';
import type { Plato, Categoria } from '@/types';

type Tab = 'platos' | 'categorias';

interface PlatoForm {
  nombre: string;
  descripcion: string;
  precio: string;
  categoriaId: string;
  activo: boolean;
}

const FORM_EMPTY: PlatoForm = { nombre: '', descripcion: '', precio: '', categoriaId: '', activo: true };

export default function CatalogoPage() {
  const [tab, setTab] = useState<Tab>('platos');
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Platos state
  const [modalPlato, setModalPlato] = useState<'crear' | 'editar' | null>(null);
  const [editingPlato, setEditingPlato] = useState<Plato | null>(null);
  const [form, setForm] = useState<PlatoForm>(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('Todos');
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [confirmDeletePlato, setConfirmDeletePlato] = useState<Plato | null>(null);

  // Categorías state
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [editingCat, setEditingCat] = useState<{ id: number; nombre: string } | null>(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Categoria | null>(null);
  const [savingCat, setSavingCat] = useState(false);

  async function loadData() {
    const [platosRes, catsRes] = await Promise.all([
      api.get('/platos'),
      api.get('/platos/categorias/all'),
    ]);
    setPlatos(platosRes.data);
    setCategorias(catsRes.data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  // ── Platos ──────────────────────────────────────────────────────────────

  function abrirCrear() {
    setForm(FORM_EMPTY);
    setEditingPlato(null);
    setModalPlato('crear');
  }

  function abrirEditar(plato: Plato) {
    setForm({
      nombre: plato.nombre,
      descripcion: plato.descripcion ?? '',
      precio: String(plato.precio),
      categoriaId: String(plato.categoria.id),
      activo: plato.activo,
    });
    setEditingPlato(plato);
    setModalPlato('editar');
  }

  async function guardarPlato() {
    if (!form.nombre.trim() || !form.precio || !form.categoriaId) return;
    setSaving(true);
    try {
      const body = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        precio: parseFloat(form.precio),
        categoriaId: parseInt(form.categoriaId),
        activo: form.activo,
      };
      if (modalPlato === 'crear') {
        const { data } = await api.post('/platos', body);
        setPlatos((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      } else if (editingPlato) {
        const { data } = await api.put(`/platos/${editingPlato.id}`, body);
        setPlatos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      }
      setModalPlato(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(plato: Plato) {
    const { data } = await api.put(`/platos/${plato.id}`, { activo: !plato.activo });
    setPlatos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
  }

  async function eliminarPlato() {
    if (!confirmDeletePlato) return;
    await api.delete(`/platos/${confirmDeletePlato.id}`);
    setPlatos((prev) => prev.filter((p) => p.id !== confirmDeletePlato.id));
    setConfirmDeletePlato(null);
  }

  // ── Categorías ──────────────────────────────────────────────────────────

  async function crearCategoria() {
    if (!nuevaCategoria.trim()) return;
    setSavingCat(true);
    try {
      const { data } = await api.post('/platos/categorias', { nombre: nuevaCategoria.trim() });
      setCategorias((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNuevaCategoria('');
    } finally {
      setSavingCat(false);
    }
  }

  async function guardarCategoria() {
    if (!editingCat || !editingCat.nombre.trim()) return;
    setSavingCat(true);
    try {
      const { data } = await api.put(`/platos/categorias/${editingCat.id}`, { nombre: editingCat.nombre.trim() });
      setCategorias((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      setEditingCat(null);
    } finally {
      setSavingCat(false);
    }
  }

  async function eliminarCategoria() {
    if (!confirmDeleteCat) return;
    await api.delete(`/platos/categorias/${confirmDeleteCat.id}`);
    setCategorias((prev) => prev.filter((c) => c.id !== confirmDeleteCat.id));
    setConfirmDeleteCat(null);
  }

  // ── Filtros de platos ────────────────────────────────────────────────────

  const platosFiltrados = platos.filter((p) => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCat = filtroCat === 'Todos' || p.categoria.nombre === filtroCat;
    const matchActivo =
      filtroActivo === 'todos' ||
      (filtroActivo === 'activo' && p.activo) ||
      (filtroActivo === 'inactivo' && !p.activo);
    return matchBusqueda && matchCat && matchActivo;
  });

  const platosActivos = platos.filter((p) => p.activo).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catálogo</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {platos.length} platos &nbsp;·&nbsp;
            <span className="text-green-600">{platosActivos} activos</span>
            &nbsp;·&nbsp;{categorias.length} categorías
          </p>
        </div>
        {tab === 'platos' && (
          <button
            onClick={abrirCrear}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo plato
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        <button
          onClick={() => setTab('platos')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === 'platos' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Platos
        </button>
        <button
          onClick={() => setTab('categorias')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === 'categorias' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Categorías &nbsp;
          <span className="bg-gray-200 text-gray-600 text-xs rounded-full px-2 py-0.5">{categorias.length}</span>
        </button>
      </div>

      {/* ── TAB: PLATOS ── */}
      {tab === 'platos' && (
        <div>
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar plato..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              />
            </div>
            <select
              value={filtroCat}
              onChange={(e) => setFiltroCat(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white"
            >
              <option value="Todos">Todas las categorías</option>
              {categorias.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
            <select
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value as typeof filtroActivo)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white"
            >
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>

          {/* Lista de platos */}
          {platosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
              <p className="font-medium">No se encontraron platos</p>
              {busqueda && <p className="text-sm mt-1">Prueba con otro nombre</p>}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div className="col-span-4">Plato</div>
                <div className="col-span-2">Categoría</div>
                <div className="col-span-2 text-right">Precio</div>
                <div className="col-span-2 text-center">Activo</div>
                <div className="col-span-2 text-right">Acciones</div>
              </div>
              <div className="divide-y divide-gray-50">
                {platosFiltrados.map((plato) => (
                  <div
                    key={plato.id}
                    className={`grid grid-cols-12 gap-2 px-5 py-4 items-center hover:bg-gray-50/50 transition ${!plato.activo ? 'opacity-50' : ''}`}
                  >
                    <div className="col-span-4">
                      <p className="font-semibold text-gray-800 text-sm">{plato.nombre}</p>
                      {plato.descripcion && (
                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{plato.descripcion}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                        {plato.categoria.nombre}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-bold text-blue-600 text-sm">{formatPrecio(plato.precio)}</span>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button
                        onClick={() => toggleActivo(plato)}
                        title={plato.activo ? 'Desactivar' : 'Activar'}
                        className={`w-11 h-6 rounded-full transition-colors relative ${plato.activo ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${plato.activo ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div className="col-span-2 flex justify-end gap-1.5">
                      <button
                        onClick={() => abrirEditar(plato)}
                        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeletePlato(plato)}
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CATEGORÍAS ── */}
      {tab === 'categorias' && (
        <div className="max-w-lg">
          {/* Agregar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Nueva categoría</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: Entradas, Sopas, Bebidas..."
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && crearCategoria()}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              />
              <button
                onClick={crearCategoria}
                disabled={savingCat || !nuevaCategoria.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {categorias.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p className="font-medium">No hay categorías</p>
                <p className="text-sm mt-1">Agrega una categoría para empezar</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {categorias.map((cat) => {
                  const platosEnCat = platos.filter((p) => p.categoria.id === cat.id).length;
                  const isEditing = editingCat?.id === cat.id;
                  return (
                    <div key={cat.id} className="flex items-center gap-3 px-5 py-4">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editingCat.nombre}
                            onChange={(e) => setEditingCat({ ...editingCat, nombre: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && guardarCategoria()}
                            autoFocus
                            className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                          <button
                            onClick={guardarCategoria}
                            disabled={savingCat}
                            className="text-blue-600 hover:text-blue-700 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-blue-50 transition"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingCat(null)}
                            className="text-gray-400 hover:text-gray-600 text-sm px-2 py-2 rounded-lg hover:bg-gray-50 transition"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 text-sm">{cat.nombre}</p>
                            <p className="text-gray-400 text-xs">{platosEnCat} platos</p>
                          </div>
                          <button
                            onClick={() => setEditingCat({ id: cat.id, nombre: cat.nombre })}
                            className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteCat(cat)}
                            className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: crear/editar plato ── */}
      {modalPlato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">
                {modalPlato === 'crear' ? 'Nuevo plato' : 'Editar plato'}
              </h2>
              <button onClick={() => setModalPlato(null)} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Lomo saltado"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción del plato (opcional)"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Precio (S/.) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Categoría *
                  </label>
                  <select
                    value={form.categoriaId}
                    onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Plato activo</p>
                  <p className="text-xs text-gray-400">Visible al crear el menú del día</p>
                </div>
                <button
                  onClick={() => setForm({ ...form, activo: !form.activo })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.activo ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.activo ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setModalPlato(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPlato}
                disabled={saving || !form.nombre.trim() || !form.precio || !form.categoriaId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : modalPlato === 'crear' ? 'Crear plato' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: confirmar eliminar plato ── */}
      {confirmDeletePlato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 text-lg mb-2">¿Eliminar plato?</h3>
            <p className="text-gray-500 text-sm mb-1">
              Se eliminará <span className="font-semibold text-gray-700">{confirmDeletePlato.nombre}</span> del catálogo.
            </p>
            <p className="text-amber-600 text-xs mb-5">
              Si este plato está en el menú del día actual, también se quitará.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeletePlato(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={eliminarPlato} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: confirmar eliminar categoría ── */}
      {confirmDeleteCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 text-lg mb-2">¿Eliminar categoría?</h3>
            <p className="text-gray-500 text-sm mb-1">
              Se eliminará <span className="font-semibold text-gray-700">{confirmDeleteCat.nombre}</span>.
            </p>
            <p className="text-red-500 text-xs mb-5">
              Los platos asignados a esta categoría quedarán sin categoría. Asigna otra categoría antes de eliminar.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteCat(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={eliminarCategoria} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
