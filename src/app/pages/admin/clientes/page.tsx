"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import ClienteModal from "./components/clienteModal";
import Pagination from "@/app/components/pagination";
import SearchDropdown from "@/app/components/searchBar";
import Swal from "sweetalert2";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface EstadoMensual {
  mes: number;
  anio: number;
  estado: string;
}

type EstadoNombre = "Activo" | "Inactivo" | "Suspendido" | string;

interface Cliente {
  id: number;
  nombre: string;
  ip: string;
  direccion: string;
  telefono: string;
  pass_onu: string;
  coordenadas: string;
  plan_id: number;
  dia_pago: number;
  estado_id?: number;
  fecha_instalacion: string;
  descripcion?: EstadoNombre;
  estados: EstadoMensual[];
}

const badgeEstado = (nombreEstado?: EstadoNombre, estado_id?: number) => {
  const label =
    nombreEstado ??
    (estado_id === 1 ? "Activo" : estado_id === 2 ? "Inactivo" : estado_id === 3 ? "Suspendido" : "Desconocido");

  let cls = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border";
  switch (label) {
    case "Activo":
      cls += " bg-green-50 text-green-700 border-green-200";
      break;
    case "Inactivo":
      cls += " bg-gray-100 text-gray-700 border-gray-300";
      break;
    case "Suspendido":
      cls += " bg-yellow-50 text-yellow-700 border-yellow-200";
      break;
    default:
      cls += " bg-slate-100 text-slate-600 border-slate-200";
  }
  return <span className={cls}>{label}</span>;
};

const buildMapLinks = (coordenadas?: string, direccion?: string) => {
  const c = (coordenadas || "").trim();
  const latLngRegex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

  if (c && latLngRegex.test(c)) {
    const [lat, lng] = c.split(",").map((s) => s.trim());
    return {
      gmaps: `https://www.google.com/maps?q=${lat},${lng}`,
      waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      label: `${lat}, ${lng}`,
    };
  }

  const q = encodeURIComponent(direccion || "");
  return q
    ? {
      gmaps: `https://www.google.com/maps?q=${q}`,
      waze: `https://waze.com/ul?q=${q}&navigate=yes`,
      label: direccion,
    }
    : null;
};

const GestionClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [modalCliente, setModalCliente] = useState<Cliente | null>(null);
  const [anioActual] = useState(new Date().getFullYear());
  const [aniosCliente, setAniosCliente] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const obtenerOInicializarEstados = async (clienteId: number, anio: number): Promise<EstadoMensual[]> => {
    try {
      const response = await fetch(`${apiHost}/api/estado-mensual/cliente/${clienteId}/anio/${anio}`);
      if (response.ok) {
        const estados = await response.json();
        if (Array.isArray(estados) && estados.length > 0) return estados;
      }
    } catch (error) {
      console.error("Error al obtener estados:", error);
    }

    // Inicializa 12 meses si no existen
    const nuevosEstados = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const mes = i + 1;
        try {
          const res = await fetch(`${apiHost}/api/estado-mensual`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cliente_id: clienteId, mes, anio, estado: "Pendiente" }),
          });
          return res.ok ? { mes, anio, estado: "Pendiente" } : null;
        } catch (error) {
          console.error("Error al crear estado:", error);
          return null;
        }
      })
    );

    return nuevosEstados.filter(Boolean) as EstadoMensual[];
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${apiHost}/api/clientes`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Respuesta inesperada del servidor");

      const year = new Date().getFullYear();
      const clientesConEstados = await Promise.all(
        data.map(async (cliente: Cliente) => {
          try {
            const estados = await obtenerOInicializarEstados(cliente.id, year);
            return { ...cliente, estados };
          } catch (error) {
            console.error(`Error con cliente ${cliente.id}:`, error);
            return { ...cliente, estados: [] };
          }
        })
      );
      setClientes(clientesConEstados);
      setClientesFiltrados(clientesConEstados);
    } catch (err) {
      console.error("Error al obtener clientes:", err);
      setError("No se pudo cargar la lista de clientes.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setClientesFiltrados(clientes);
      setCurrentPage(1);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = clientes.filter(cliente =>
      cliente.nombre.toLowerCase().includes(term) ||
      cliente.telefono.includes(term) ||
      cliente.direccion.toLowerCase().includes(term) ||
      (cliente.descripcion && cliente.descripcion.toLowerCase().includes(term))
    );

    setClientesFiltrados(filtered);
    setCurrentPage(1);
  };

  const handleEliminar = async (id: number) => {
    // Buscar el cliente en el estado actual
    const clienteAEliminar = clientes.find(cliente => cliente.id === id);

    if (!clienteAEliminar) {
      await Swal.fire(
        'Error',
        'No se encontró el cliente a eliminar',
        'error'
      );
      return;
    }

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      html: `Estás a punto de eliminar al cliente: <br><strong>${clienteAEliminar.nombre}</strong>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      focusCancel: true
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${apiHost}/api/clientes/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Error en la respuesta del servidor");
        }

        // Actualizar el estado eliminando el cliente
        setClientes(clientes.filter((cliente) => cliente.id !== id));
        setClientesFiltrados(clientesFiltrados.filter((cliente) => cliente.id !== id));

        await Swal.fire(
          '¡Eliminado!',
          `El cliente <strong>${clienteAEliminar.nombre}</strong> ha sido eliminado correctamente.`,
          'success'
        );
      } catch (error) {
        console.error("Error al eliminar cliente:", error);
        await Swal.fire(
          'Error',
          `No se pudo eliminar a ${clienteAEliminar.nombre}`,
          'error'
        );
      }
    }
  };

  const clientNames = clientes.map(cliente => cliente.nombre);
  const indexOfLastClient = currentPage * itemsPerPage;
  const indexOfFirstClient = indexOfLastClient - itemsPerPage;
  const currentClients = clientesFiltrados.slice(indexOfFirstClient, indexOfLastClient);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return (
    <AdminLayout>
      {/* Contenedor principal con mejor espaciado */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Header con título y botón */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">Gestión de Clientes</h1>
            <p className="text-sm text-slate-600 mt-2">
              Consulta el estado de los clientes y gestiona sus pagos
            </p>
          </div>
          <Link
            href="/pages/admin/clientes/registrar"
            className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Cliente
          </Link>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-8">
          <SearchDropdown
            items={clientNames}
            placeholder="Buscar por nombre, teléfono, dirección o estado..."
            onSearch={handleSearch}
            className="w-full max-w-md"
          />
        </div>

        {/* Contenido principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Cargando clientes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 text-lg mb-4">{error}</p>
              <button
                onClick={fetchClientes}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Reintentar
              </button>
            </div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 text-lg mb-4">No hay clientes registrados.</p>
              <Link
                href="/pages/admin/clientes/registrar"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Registrar primer cliente
              </Link>
            </div>
          ) : (
            <>
              {clientesFiltrados.length === 0 && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-600 text-center">
                    No se encontraron clientes que coincidan con la búsqueda.
                  </p>
                </div>
              )}

              {/* Vista móvil */}
              <div className="grid gap-4 md:hidden">
                {currentClients.map((cliente) => {
                  const anio = aniosCliente[cliente.id] || anioActual;
                  const maps = buildMapLinks(cliente.coordenadas, cliente.direccion);
                  
                  return (
                    <div
                      key={cliente.id}
                      className="rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Header de la tarjeta */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-orange-700 truncate">
                            {cliente.nombre}
                          </h3>
                          <p className="text-sm text-slate-600">{cliente.telefono}</p>
                          <p className="text-sm text-slate-500 break-words mt-1">{cliente.direccion}</p>
                        </div>
                        <div className="shrink-0">
                          {badgeEstado(cliente.descripcion, cliente.estado_id)}
                        </div>
                      </div>

                      {/* Ubicación */}
                      {maps && (
                        <div className="mb-4">
                          <a
                            href={maps.gmaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
                          >
                            📍 Ver en Google Maps
                          </a>
                        </div>
                      )}

                      {/* Controles de año */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-slate-600">Año: {anio}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAniosCliente(prev => ({ ...prev, [cliente.id]: anio - 1 }))}
                            className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            ← Anterior
                          </button>
                          <button
                            onClick={() => setAniosCliente(prev => ({ ...prev, [cliente.id]: anio + 1 }))}
                            className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            Siguiente →
                          </button>
                        </div>
                      </div>

                      {/* Estados mensuales */}
                      <div className="mb-4">
                        <div className="grid grid-cols-4 gap-2">
                          {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map((mes, index) => {
                            const estado = cliente.estados?.find(e => e.mes === index + 1 && e.anio === anio);
                            let bgColor = "bg-slate-100";
                            let textColor = "text-slate-600";
                            
                            if (estado?.estado === "Pagado") {
                              bgColor = "bg-green-100";
                              textColor = "text-green-700";
                            } else if (estado?.estado === "Pagado Parcial") {
                              bgColor = "bg-yellow-100";
                              textColor = "text-yellow-700";
                            } else if (estado?.estado === "Pendiente") {
                              bgColor = "bg-red-100";
                              textColor = "text-red-700";
                            }

                            return (
                              <div
                                key={index}
                                className={`p-2 rounded text-center ${bgColor} ${textColor}`}
                                title={estado?.estado || "Sin estado"}
                              >
                                <div className="text-xs font-semibold">{mes}</div>
                                <div className="text-[10px] mt-1">
                                  {estado?.estado?.charAt(0) || "-"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModalCliente(cliente)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
                        >
                          Ver detalles
                        </button>
                        <button
                          onClick={() => handleEliminar(cliente.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista desktop */}
              <div className="hidden md:block">
                <div className="overflow-x-auto rounded-lg">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">ID</th>
                        <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                        <th className="px-4 py-3 text-left font-semibold">Teléfono</th>
                        <th className="px-4 py-3 text-left font-semibold">Dirección</th>
                        <th className="px-4 py-3 text-left font-semibold">Ubicación</th>
                        <th className="px-4 py-3 text-left font-semibold">Estado</th>
                        <th className="px-4 py-3 text-left font-semibold">Estados de Pago</th>
                        <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentClients.map((cliente) => {
                        const anio = aniosCliente[cliente.id] || anioActual;
                        const maps = buildMapLinks(cliente.coordenadas, cliente.direccion);
                        
                        return (
                          <tr key={cliente.id} className="hover:bg-orange-50">
                            <td className="px-4 py-3 font-medium">{cliente.id}</td>
                            <td className="px-4 py-3 font-medium text-orange-700">{cliente.nombre}</td>
                            <td className="px-4 py-3">{cliente.telefono}</td>
                            <td className="px-4 py-3 break-words max-w-xs">{cliente.direccion}</td>
                            <td className="px-4 py-3">
                              {maps ? (
                                <a
                                  href={maps.gmaps}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-xs"
                                >
                                  Ver ubicación
                                </a>
                              ) : (
                                <span className="text-slate-400 text-xs">Sin ubicación</span>
                              )}
                            </td>
                            <td className="px-4 py-3">{badgeEstado(cliente.descripcion, cliente.estado_id)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-slate-600">Año: {anio}</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => setAniosCliente(prev => ({ ...prev, [cliente.id]: anio - 1 }))}
                                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                                  >
                                    ←
                                  </button>
                                  <button
                                    onClick={() => setAniosCliente(prev => ({ ...prev, [cliente.id]: anio + 1 }))}
                                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                                  >
                                    →
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-6 gap-1">
                                {["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((mes, index) => {
                                  const estado = cliente.estados?.find(e => e.mes === index + 1 && e.anio === anio);
                                  let color = "bg-slate-100 text-slate-600";
                                  
                                  if (estado?.estado === "Pagado") color = "bg-green-100 text-green-700";
                                  else if (estado?.estado === "Pagado Parcial") color = "bg-yellow-100 text-yellow-700";
                                  else if (estado?.estado === "Pendiente") color = "bg-red-100 text-red-700";
                                  else if (estado?.estado === "Suspendido") color = "bg-gray-400 text-gray-700";

                                  return (
                                    <div
                                      key={index}
                                      className={`p-1 rounded text-center text-xs ${color}`}
                                      title={`${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][index]}: ${estado?.estado || "Sin estado"}`}
                                    >
                                      {mes}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setModalCliente(cliente)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                >
                                  Ver
                                </button>
                                <button
                                  onClick={() => handleEliminar(cliente.id)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginación */}
              {clientesFiltrados.length > itemsPerPage && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={clientesFiltrados.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalCliente && (
        <ClienteModal
          cliente={modalCliente}
          onClose={() => setModalCliente(null)}
          onClienteUpdated={() => {
            setModalCliente(null);
            fetchClientes();
          }}
          apiHost={apiHost}
        />
      )}
    </AdminLayout>
  );
};

export default GestionClientes;
