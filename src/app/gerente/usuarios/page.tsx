'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Usuario {
  id: number;
  email: string;
  rol: string;
  activo: boolean;
}

const ROLES = ['MESERO', 'COCINERO', 'GERENTE'];

function RolBadge({ rol }: { rol: string }) {
  const colors: Record<string, string> = {
    MESERO: 'bg-blue-100 text-blue-700',
    COCINERO: 'bg-orange-100 text-orange-700',
    GERENTE: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[rol] ?? 'bg-gray-100 text-gray-600'}`}>
      {rol}
    </span>
  );
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulario crear usuario
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRol, setNewRol] = useState('MESERO');
  const [creating, setCreating] = useState(false);

  // Cambiar contraseña
  const [pwdUserId, setPwdUserId] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  async function cargarUsuarios() {
    try {
      const { data } = await api.get('/gerente/usuarios');
      setUsuarios(data);
    } catch {
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  async function toggleActivo(id: number) {
    try {
      const { data } = await api.patch(`/gerente/usuarios/${id}/toggle`);
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo: data.activo } : u)));
    } catch {
      alert('Error al cambiar estado del usuario');
    }
  }

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post('/gerente/usuarios', {
        email: newEmail,
        password: newPassword,
        rol: newRol,
      });
      setUsuarios((prev) => [...prev, data]);
      setNewEmail('');
      setNewPassword('');
      setNewRol('MESERO');
      setShowForm(false);
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Error al crear usuario');
    } finally {
      setCreating(false);
    }
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdUserId) return;
    setChangingPwd(true);
    try {
      await api.patch(`/gerente/usuarios/${pwdUserId}/password`, { password: newPwd });
      setPwdUserId(null);
      setNewPwd('');
    } catch {
      alert('Error al cambiar contraseña');
    } finally {
      setChangingPwd(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pwdUser = usuarios.find((u) => u.id === pwdUserId);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de acceso al sistema</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* Formulario nuevo usuario */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Crear nuevo usuario</h2>
          <form onSubmit={crearUsuario} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-gray-500 mb-1">Correo</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="correo@ejemplo.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="min. 6 caracteres"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
              <select
                value={newRol}
                onChange={(e) => setNewRol(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {usuarios.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Sin usuarios registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-medium">Correo</th>
                <th className="text-left px-5 py-3 font-medium">Rol</th>
                <th className="text-left px-5 py-3 font-medium">Estado</th>
                <th className="text-right px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-800 font-medium">{u.email}</td>
                  <td className="px-5 py-3">
                    <RolBadge rol={u.rol} />
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActivo(u.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition border ${
                          u.activo
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => { setPwdUserId(u.id); setNewPwd(''); }}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition border border-gray-200 text-gray-600 hover:bg-gray-100"
                      >
                        Cambiar clave
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal cambiar contraseña */}
      {pwdUserId !== null && pwdUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Cambiar contraseña</h3>
            <p className="text-sm text-gray-500 mb-4">{pwdUser.email}</p>
            <form onSubmit={cambiarPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  placeholder="min. 6 caracteres"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={changingPwd}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  {changingPwd ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setPwdUserId(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
