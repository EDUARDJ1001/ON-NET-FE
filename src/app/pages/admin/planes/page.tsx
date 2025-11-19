"use client";

import { useAuth } from "@/app/auth/useAuth";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Plan {
  id: number;
  nombre: string;
  precio_mensual: number;
  descripcion: string;
}

const Planes = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    precio_mensual: "",
    descripcion: ""
  });
  const apiHost = process.env.NEXT_PUBLIC_API_HOST;

  useEffect(() => {
    fetchPlanes();
  }, [apiHost]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/noAuth";
    }
  }, [isAuthenticated, authLoading]);

  const fetchPlanes = async () => {
    try {
      const response = await fetch(`${apiHost}/api/planes`);
      const data = await response.json();
      setPlanes(data);
    } catch (error) {
      console.error("Error al obtener los planes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        ...formData,
        precio_mensual: parseFloat(formData.precio_mensual)
      };

      const url = editingPlan 
        ? `${apiHost}/api/planes/${editingPlan.id}`
        : `${apiHost}/api/planes`;
      
      const method = editingPlan ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      });

      if (response.ok) {
        // Recargar la lista de planes
        fetchPlanes();
        
        // Cerrar modal y resetear formulario
        setShowModal(false);
        setEditingPlan(null);
        setFormData({
          nombre: "",
          precio_mensual: "",
          descripcion: ""
        });
      } else {
        const errorData = await response.json();
        console.error("Error al guardar el plan:", errorData.error);
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      nombre: plan.nombre,
      precio_mensual: plan.precio_mensual.toString(),
      descripcion: plan.descripcion
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este plan?")) {
      return;
    }
    
    try {
      const response = await fetch(`${apiHost}/api/planes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Recargar la lista de planes
        fetchPlanes();
        alert("Plan eliminado correctamente");
      } else {
        const errorData = await response.json();
        console.error("Error al eliminar el plan:", errorData.error);
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    setFormData({
      nombre: "",
      precio_mensual: "",
      descripcion: ""
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header con título y botón */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">Gestión de Planes de Internet</h1>
            <p className="text-sm text-slate-600 mt-2">
              Gestiona los planes disponibles en el sistema
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Agregar Nuevo Plan
          </button>
        </div>

        {/* Lista de Planes */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Cargando planes...</p>
            </div>
          ) : planes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No hay planes disponibles en este momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Mensual
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {planes.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {plan.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        L. {Number(plan.precio_mensual).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {plan.descripcion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(plan.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal para agregar/editar plan */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-[1px]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingPlan ? "Editar Plan" : "Agregar Nuevo Plan"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-4">
                <div className="mb-4">
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Plan
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="precio_mensual" className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Mensual (L.)
                  </label>
                  <input
                    type="number"
                    id="precio_mensual"
                    name="precio_mensual"
                    value={formData.precio_mensual}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors"
                  >
                    {editingPlan ? "Actualizar" : "Crear"} Plan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Planes;
