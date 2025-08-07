"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import Swal from "sweetalert2";
import EmpleadoModal from "./components/empleadoModal";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  cargo_id: number;
}

interface Cargo {
  id: number;
  nombreCargo: string;
}

const GestionEmpleados = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [modalEmpleado, setModalEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpleados = async () => {
    try {
      const [empRes, cargoRes] = await Promise.all([
        fetch(`${apiHost}/api/users`),
        fetch(`${apiHost}/api/cargos`)
      ]);
      const empData = await empRes.json();
      const cargoData = await cargoRes.json();
      setEmpleados(empData);
      setCargos(cargoData);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  };

  const eliminarEmpleado = async (id: number) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar empleado?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`${apiHost}/api/empleados/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Error al eliminar");

      await fetchEmpleados();
      Swal.fire("Eliminado", "Empleado eliminado con éxito.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo eliminar.", "error");
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, []);

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-4">
        <Link
          href="/pages/admin/empleados/registrar"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          + Registrar Empleado
        </Link>
      </div>

      <div className="w-full bg-white p-6 rounded-xl border shadow">
        <h1 className="text-2xl font-bold text-orange-600 mb-4 text-center">
          Gestión de Empleados
        </h1>

        {loading ? (
          <p className="text-center text-gray-500">Cargando empleados...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <table className="table-auto w-full text-sm border border-gray-300">
            <thead className="bg-orange-100">
              <tr>
                <th className="px-3 py-2 border">Nombre</th>
                <th className="px-3 py-2 border">Apellido</th>
                <th className="px-3 py-2 border">Usuario</th>
                <th className="px-3 py-2 border">Cargo</th>
                <th className="px-3 py-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border">{e.nombre}</td>
                  <td className="px-3 py-2 border">{e.apellido}</td>
                  <td className="px-3 py-2 border">{e.username}</td>
                  <td className="px-3 py-2 border">
                    {cargos.find(c => c.id === e.cargo_id)?.nombreCargo || "Sin cargo"}
                  </td>
                  <td className="px-3 py-2 border flex gap-2">
                    <button
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                      onClick={() => setModalEmpleado(e)}
                    >
                      Editar
                    </button>
                    <button
                      className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                      onClick={() => eliminarEmpleado(e.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalEmpleado && (
        <EmpleadoModal
          empleado={modalEmpleado}
          cargos={cargos}
          apiHost={apiHost}
          onClose={() => setModalEmpleado(null)}
          onEmpleadoUpdated={fetchEmpleados}
        />
      )}
    </AdminLayout>
  );
};

export default GestionEmpleados;
