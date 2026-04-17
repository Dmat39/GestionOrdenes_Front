'use client';
import { useState } from 'react';
import { api, formatPrecio } from '@/lib/api';

type Tab = 'ventas' | 'ranking' | 'detalle';

interface VentaDia {
  dia: string;
  total: string;
  cuentas: string;
}

interface RankingPlato {
  platoId: number;
  nombre: string;
  categoria: string;
  totalVendido: string;
  totalIngreso: string;
}

interface VentaDetalle {
  id: number;
  total: string;
  metodo_pago: string | null;
  estado_pago: string;
  fecha_pago: string | null;
  created_at: string;
  mesa_numero: number;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function ReportesPage() {
  const [tab, setTab] = useState<Tab>('ventas');
  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [ventasDia, setVentasDia] = useState<VentaDia[]>([]);
  const [ranking, setRanking] = useState<RankingPlato[]>([]);
  const [detalle, setDetalle] = useState<VentaDetalle[]>([]);

  async function buscar() {
    setLoading(true);
    setError('');
    try {
      const params = { desde, hasta };
      const [vRes, rRes, dRes] = await Promise.all([
        api.get('/gerente/ventas/dia', { params }),
        api.get('/gerente/platos/ranking', { params }),
        api.get('/gerente/ventas/detalle', { params }),
      ]);
      setVentasDia(vRes.data);
      setRanking(rRes.data);
      setDetalle(dRes.data);
    } catch {
      setError('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  }

  const totalVentas = ventasDia.reduce((s, v) => s + parseFloat(v.total), 0);
  const totalCuentas = ventasDia.reduce((s, v) => s + parseInt(v.cuentas, 10), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-1">Ventas y rendimiento por período</p>
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
        <button
          onClick={buscar}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          Consultar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['ventas', 'ranking', 'detalle'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'ventas' ? 'Ventas por día' : t === 'ranking' ? 'Ranking platos' : 'Detalle cuentas'}
          </button>
        ))}
      </div>

      {/* Ventas por día */}
      {tab === 'ventas' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {ventasDia.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Usa los filtros para consultar</p>
          ) : (
            <>
              <div className="flex gap-6 px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Total período</p>
                  <p className="text-lg font-bold text-gray-900">{formatPrecio(totalVentas)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cuentas pagadas</p>
                  <p className="text-lg font-bold text-gray-900">{totalCuentas}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium">Día</th>
                    <th className="text-right px-5 py-3 font-medium">Cuentas</th>
                    <th className="text-right px-5 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ventasDia.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700">
                        {new Date(v.dia).toLocaleDateString('es-PE', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">{v.cuentas}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">
                        {formatPrecio(parseFloat(v.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Ranking platos */}
      {tab === 'ranking' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {ranking.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Usa los filtros para consultar</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">#</th>
                  <th className="text-left px-5 py-3 font-medium">Plato</th>
                  <th className="text-left px-5 py-3 font-medium">Categoría</th>
                  <th className="text-right px-5 py-3 font-medium">Cant. vendida</th>
                  <th className="text-right px-5 py-3 font-medium">Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ranking.map((r, i) => (
                  <tr key={r.platoId} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-400 font-bold">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{r.nombre}</td>
                    <td className="px-5 py-3 text-gray-500">{r.categoria}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{r.totalVendido}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatPrecio(parseFloat(r.totalIngreso))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Detalle cuentas */}
      {tab === 'detalle' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {detalle.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Usa los filtros para consultar</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Fecha</th>
                  <th className="text-left px-5 py-3 font-medium">Mesa</th>
                  <th className="text-left px-5 py-3 font-medium">Método</th>
                  <th className="text-left px-5 py-3 font-medium">Estado</th>
                  <th className="text-right px-5 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {detalle.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {new Date(d.created_at).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-gray-700">Mesa {d.mesa_numero}</td>
                    <td className="px-5 py-3 text-gray-500">{d.metodo_pago ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          d.estado_pago === 'PAGADO'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {d.estado_pago}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatPrecio(parseFloat(d.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
