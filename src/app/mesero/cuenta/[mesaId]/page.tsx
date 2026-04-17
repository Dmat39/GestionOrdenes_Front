'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, formatPrecio } from '@/lib/api';
import type { Cuenta, Visita } from '@/types';

export default function CuentaMesaPage() {
  const { mesaId } = useParams<{ mesaId: string }>();
  const router = useRouter();
  const [visita, setVisita] = useState<Visita | null>(null);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA'>('EFECTIVO');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: v } = await api.get(`/visitas/mesa/${mesaId}/activa`);
        setVisita(v);
        if (v) {
          const { data: c } = await api.get(`/cuenta/visita/${v.id}`).catch(() => ({ data: null }));
          setCuenta(c);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mesaId]);

  async function generarCuenta() {
    if (!visita) return;
    setProcesando(true);
    try {
      const { data } = await api.post(`/cuenta/visita/${visita.id}`);
      setCuenta(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err?.response?.data?.message || 'Error al generar cuenta');
    } finally {
      setProcesando(false);
    }
  }

  async function pagar() {
    if (!cuenta) return;
    setProcesando(true);
    try {
      await api.put(`/cuenta/${cuenta.id}/pagar`, { metodoPago });
      alert('Pago registrado. Mesa liberada.');
      router.push('/mesero/dashboard');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err?.response?.data?.message || 'Error al procesar pago');
    } finally {
      setProcesando(false);
    }
  }

  if (loading) return <div className="text-center mt-8 text-gray-500">Cargando...</div>;

  if (!visita) {
    return <div className="text-center mt-8 text-gray-500">No hay visita activa en esta mesa.</div>;
  }

  const allItems = visita.ordenes?.flatMap((o) => o.items) ?? [];
  const itemsValidos = allItems.filter((i) => i.estado !== 'CANCELADO');
  const totalCalculado = itemsValidos.reduce(
    (sum, i) => sum + Number(i.plato.precio) * i.cantidad,
    0,
  );

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Cuenta - Mesa {visita.mesa?.numero}
      </h1>

      {/* Detalle de ítems */}
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-700">Detalle del consumo</h2>
        </div>
        <div className="p-4 flex flex-col gap-2">
          {itemsValidos.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.cantidad}x {item.plato.nombre}
              </span>
              <span className="font-medium text-gray-800">
                {formatPrecio(Number(item.plato.precio) * item.cantidad)}
              </span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-blue-600">{formatPrecio(totalCalculado)}</span>
        </div>
      </div>

      {!cuenta ? (
        <button
          onClick={generarCuenta}
          disabled={procesando}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {procesando ? 'Generando...' : 'Generar cuenta'}
        </button>
      ) : cuenta.estado_pago === 'PAGADO' ? (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center">
          <p className="text-green-700 font-bold">Cuenta pagada</p>
          <p className="text-green-600 text-sm">Método: {cuenta.metodo_pago}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Método de pago</h3>
          <div className="flex gap-3 mb-4">
            {(['EFECTIVO', 'TARJETA'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetodoPago(m)}
                className={`flex-1 py-3 rounded-xl border-2 font-semibold transition ${
                  metodoPago === m
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={pagar}
            disabled={procesando}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
          >
            {procesando ? 'Procesando...' : `Cobrar ${formatPrecio(Number(cuenta.total))}`}
          </button>
        </div>
      )}
    </div>
  );
}
