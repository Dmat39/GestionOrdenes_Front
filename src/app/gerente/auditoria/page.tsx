'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuditLog {
  id: number;
  usuario_id: number | null;
  usuario_email: string | null;
  accion: string;
  entidad: string;
  entidad_id: number | null;
  detalle: object | null;
  created_at: string;
}

interface Usuario {
  id: number;
  email: string;
  rol: string;
}

const ACCIONES = [
  '',
  'CREAR_PLATO',
  'ACTUALIZAR_PLATO',
  'ELIMINAR_PLATO',
  'CREAR_CATEGORIA',
  'ACTUALIZAR_CATEGORIA',
  'ELIMINAR_CATEGORIA',
  'CANCELAR_ORDEN',
  'ENTREGAR_ORDEN',
  'CAMBIAR_ESTADO_ITEM',
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(today());
  const [usuarioId, setUsuarioId] = useState('');
  const [accion, setAccion] = useState('');

  useEffect(() => {
    api.get('/gerente/usuarios').then((r) => setUsuarios(r.data)).catch(() => {});
  }, []);

  async function buscar() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { desde, hasta };
      if (usuarioId) params.usuarioId = usuarioId;
      if (accion) params.accion = accion;
      const { data } = await api.get('/gerente/auditoria', { params });
      setLogs(data);
    } catch {
      setError('Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
        <p className="text-sm text-gray-500 mt-1">Registro de acciones del sistema</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
          <select
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} ({u.rol})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Acción</label>
          <select
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {ACCIONES.map((a) => (
              <option key={a} value={a}>
                {a || 'Todas'}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={buscar}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          Buscar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            {loading ? 'Cargando...' : 'Usa los filtros para consultar el registro de auditoría'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Fecha</th>
                  <th className="text-left px-5 py-3 font-medium">Usuario</th>
                  <th className="text-left px-5 py-3 font-medium">Acción</th>
                  <th className="text-left px-5 py-3 font-medium">Entidad</th>
                  <th className="text-left px-5 py-3 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-gray-700 text-xs">
                      {log.usuario_email ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {log.entidad}
                      {log.entidad_id ? ` #${log.entidad_id}` : ''}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs font-mono max-w-xs truncate">
                      {log.detalle ? JSON.stringify(log.detalle) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
