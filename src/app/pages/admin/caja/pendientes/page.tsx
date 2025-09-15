"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Pagination from "@/app/components/pagination";
import SearchDropdown from "@/app/components/searchBar";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface EstadoMensual {
  mes: number;
  anio: number;
  estado: string;
}

interface Cliente {
  id: number;
  nombre: string;
  ip: string;
  direccion: string;
  telefono: string;
  dia_pago: number;
  estado_id?: number;
  descripcion?: string;
  estados: EstadoMensual[];
}

// Función para determinar si un cliente está pendiente de pago
const estaPendienteDePago = (cliente: Cliente): boolean => {
  const hoy = new Date();
  const diaActual = hoy.getDate();
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();
  
  // Si el cliente no tiene estados mensuales, considerar como pendiente
  if (!cliente.estados || cliente.estados.length === 0) return true;
  
  // Buscar el estado del mes actual
  const estadoMesActual = cliente.estados.find(
    e => e.mes === mesActual && e.anio === anioActual
  );
  
  // Si no hay estado para el mes actual, considerar como pendiente
  if (!estadoMesActual) return true;
  
  // Si ya está pagado, OMITIR (no mostrar)
  if (estadoMesActual.estado === "Pagado") return false;
  
  // Verificar según el día de pago y la fecha actual
  if (cliente.dia_pago === 15) {
    // Para día de pago 15, mostrar como pendiente a partir del día 16 del mes
    return diaActual > 15;
  } else if (cliente.dia_pago === 30) {
    // Para día de pago 30, mostrar como pendiente a partir del día 1 del siguiente mes
    // Pero como estamos en el mes actual, mostramos siempre que no haya pagado
    return true;
  }
  
  return true;
};

const GestionClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesPendientes, setClientesPendientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtroDiaPago, setFiltroDiaPago] = useState<number | 'todos'>('todos');
  const [anioActual] = useState(new Date().getFullYear());
  const itemsPerPage = 10;

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${apiHost}/api/clientes`);
      const data = await res.json();
      
      if (!Array.isArray(data)) throw new Error("Respuesta inesperada del servidor");

      const year = new Date().getFullYear();
      const clientesConEstados = await Promise.all(
        data.map(async (cliente: Cliente) => {
          try {
            // Obtener estados del año actual
            const response = await fetch(`${apiHost}/api/estado-mensual/cliente/${cliente.id}/anio/${year}`);
            if (response.ok) {
              const estados = await response.json();
              if (Array.isArray(estados) && estados.length > 0) {
                return { ...cliente, estados };
              }
            }
            return { ...cliente, estados: [] };
          } catch (error) {
            console.error(`Error con cliente ${cliente.id}:`, error);
            return { ...cliente, estados: [] };
          }
        })
      );
      
      setClientes(clientesConEstados);
      
      // Filtrar solo los clientes pendientes de pago
      const pendientes = clientesConEstados.filter(estaPendienteDePago);
      setClientesPendientes(pendientes);
      aplicarFiltros(pendientes, filtroDiaPago);
    } catch (err) {
      console.error("Error al obtener clientes:", err);
      setError("No se pudo cargar la lista de clientes.");
    } finally {
      setLoading(false);
    }
  };

  // Función para aplicar filtros
  const aplicarFiltros = (lista: Cliente[], diaPagoFiltro: number | 'todos') => {
    let filtered = [...lista];
    
    // Aplicar filtro por día de pago
    if (diaPagoFiltro !== 'todos') {
      filtered = filtered.filter(cliente => cliente.dia_pago === diaPagoFiltro);
    }
    
    setClientesFiltrados(filtered);
    setCurrentPage(1);
  };

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      aplicarFiltros(clientesPendientes, filtroDiaPago);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = clientesPendientes.filter(cliente =>
      cliente.nombre.toLowerCase().includes(term) ||
      cliente.telefono.includes(term) ||
      cliente.direccion.toLowerCase().includes(term)
    );

    aplicarFiltros(filtered, filtroDiaPago);
  };

  const handleFiltroDiaPago = (diaPago: number | 'todos') => {
    setFiltroDiaPago(diaPago);
    aplicarFiltros(clientesPendientes, diaPago);
  };

  const clientNames = clientesPendientes.map(cliente => cliente.nombre);
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">Clientes Pendientes de Pago</h1>
            <p className="text-sm text-slate-600 mt-2">
              Lista de clientes con pagos pendientes del mes actual
            </p>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <SearchDropdown
              items={clientNames}
              placeholder="Buscar clientes pendientes..."
              onSearch={handleSearch}
              className="w-full max-w-md"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleFiltroDiaPago('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroDiaPago === 'todos'
                  ? 'bg-orange-600 text-white' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handleFiltroDiaPago(15)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroDiaPago === 15
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Día 15
            </button>
            <button
              onClick={() => handleFiltroDiaPago(30)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroDiaPago === 30
                  ? 'bg-green-600 text-white' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Día 30
            </button>
          </div>
        </div>

        {/* Información */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm">
            Mostrando solo clientes pendientes de pago. 
            Día de pago 15: mostrados a partir del día 16. 
            Día de pago 30: mostrados siempre que no hayan pagado.
            Los clientes con pago completado no se muestran en esta lista.
          </p>
        </div>

        {/* Contenido principal */}
        <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Cargando clientes pendientes...</p>
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
          ) : clientesPendientes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-green-600 text-lg mb-4">¡Excelente! No hay clientes pendientes de pago.</p>
              <p className="text-slate-600">Todos los clientes están al día con sus pagos.</p>
            </div>
          ) : (
            <>
              {clientesFiltrados.length === 0 && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-600 text-center">
                    {filtroDiaPago === 'todos' 
                      ? "No se encontraron clientes pendientes que coincidan con la búsqueda."
                      : `No hay clientes pendientes con día de pago ${filtroDiaPago}.`}
                  </p>
                </div>
              )}

              {/* Resumen */}
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-700 text-sm">
                  Total de clientes pendientes: <strong>{clientesPendientes.length}</strong>
                  {filtroDiaPago !== 'todos' && (
                    <> | Día {filtroDiaPago}: <strong>{
                      clientesPendientes.filter(c => c.dia_pago === filtroDiaPago).length
                    }</strong></>
                  )}
                  {clientesFiltrados.length !== clientesPendientes.length && (
                    <> | Mostrando: <strong>{clientesFiltrados.length}</strong></>
                  )}
                </p>
              </div>

              {/* Vista de escritorio */}
              <div className="overflow-x-auto rounded-lg">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-orange-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                      <th className="px-4 py-3 text-left font-semibold">Teléfono</th>
                      <th className="px-4 py-3 text-left font-semibold">Dirección</th>
                      <th className="px-4 py-3 text-left font-semibold">Día Pago</th>
                      <th className="px-4 py-3 text-left font-semibold">Estado Servicio</th>
                      <th className="px-4 py-3 text-left font-semibold">Meses Pendientes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentClients.map((cliente) => {
                      return (
                        <tr key={cliente.id} className="hover:bg-orange-50">
                          <td className="px-4 py-3 font-medium">{cliente.id}</td>
                          <td className="px-4 py-3 font-medium text-orange-700">{cliente.nombre}</td>
                          <td className="px-4 py-3">{cliente.telefono}</td>
                          <td className="px-4 py-3 break-words max-w-xs">{cliente.direccion}</td>
                          <td className="px-4 py-3 font-medium text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              cliente.dia_pago === 15 
                                ? "bg-blue-100 text-blue-700" 
                                : "bg-green-100 text-green-700"
                            }`}>
                              {cliente.dia_pago}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              cliente.descripcion === "Activo" || cliente.estado_id === 1 
                                ? "bg-green-100 text-green-700" 
                                : cliente.descripcion === "Suspendido" || cliente.estado_id === 3
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {cliente.descripcion || (cliente.estado_id === 1 ? "Activo" : cliente.estado_id === 2 ? "Inactivo" : "Suspendido")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="grid grid-cols-6 gap-1">
                              {["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((mes, index) => {
                                const estado = cliente.estados?.find(e => e.mes === index + 1 && e.anio === anioActual);
                                let color = "bg-slate-100 text-slate-400";
                                
                                // Solo mostrar en rojo los meses pendientes, los pagados en gris claro
                                if (estado?.estado === "Pendiente") {
                                  color = "bg-red-100 text-red-700 border border-red-200";
                                } else if (estado?.estado === "Pagado Parcial") {
                                  color = "bg-yellow-100 text-yellow-700 border border-yellow-200";
                                } else if (estado?.estado === "Pagado") {
                                  color = "bg-slate-100 text-slate-400";
                                }

                                return (
                                  <div
                                    key={index}
                                    className={`p-1 rounded text-center text-xs ${color} cursor-help`}
                                    title={`${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][index]} ${anioActual}: ${estado?.estado || "Sin estado"}`}
                                  >
                                    {mes}
                                  </div>
                                );
                              })}
                            </div>
                            {/* Información adicional debajo de la cuadrícula */}
                            <div className="mt-2 text-xs text-slate-500">
                              {cliente.estados?.filter(e => e.estado === "Pendiente" && e.anio === anioActual).length > 0 && (
                                <span className="text-red-600">
                                  {cliente.estados.filter(e => e.estado === "Pendiente" && e.anio === anioActual).length} mes(es) pendiente(s)
                                </span>
                              )}
                              {cliente.estados?.filter(e => e.estado === "Pagado Parcial" && e.anio === anioActual).length > 0 && (
                                <span className="text-yellow-600 ml-2">
                                  {cliente.estados.filter(e => e.estado === "Pagado Parcial" && e.anio === anioActual).length} parcial(es)
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
    </AdminLayout>
  );
};

export default GestionClientes;