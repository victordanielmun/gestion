import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span>Hola, {user?.name}</span>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/warehouses" className="p-6 bg-blue-100 rounded-lg shadow hover:bg-blue-200">
          <h2 className="text-xl font-semibold">Almacenes</h2>
        </Link>
        <Link to="/products" className="p-6 bg-green-100 rounded-lg shadow hover:bg-green-200">
          <h2 className="text-xl font-semibold">Productos</h2>
        </Link>
        <Link to="/clients" className="p-6 bg-yellow-100 rounded-lg shadow hover:bg-yellow-200">
          <h2 className="text-xl font-semibold">Clientes</h2>
        </Link>
        <Link to="/sales" className="p-6 bg-purple-100 rounded-lg shadow hover:bg-purple-200">
          <h2 className="text-xl font-semibold">Ventas</h2>
        </Link>
      </div>
    </div>
  );
}
