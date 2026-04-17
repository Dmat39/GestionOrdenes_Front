import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-3xl font-bold text-gray-800">RestauranteApp</h1>
      <p className="text-gray-500">Sistema de gestión de órdenes</p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Ingresar (Mesero / Cocinero)
        </Link>
      </div>
    </div>
  );
}
