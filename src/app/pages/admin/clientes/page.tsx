"use client";

import { useEffect, useMemo, useState } from "react";
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

interface Plan {
  id: number;
  nombre: string;
  precio_mensual: number;
}
type PlanMap = Record<number, Plan>;

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
  plan?: Plan; // si viene poblado desde el API
}

const HNL = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  maximumFractionDigits: 2,
});

const mesCorto = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const mesLargo = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const badgeEstado = (nombreEstado?: EstadoNombre, estado_id?: number) => {
  const label =
    nombreEstado ??
    (estado_id === 1
      ? "Activo"
      : estado_id === 2
      ? "Inactivo"
      : estado_id === 3
      ? "Suspendido"
      : "Desconocido");

  let cls =
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border";
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

// Helper para mapear estado_id/descripcion a ID numérico
const getEstadoId = (c: Cliente): number => {
  if (typeof c.estado_id === "number") return c.estado_id;
  const d = (c.descripcion || "").toLowerCase();
  if (d === "activo") return 1;
  if (d === "inactivo") return 2;
  if (d === "suspendido") return 3;
  return 0; // desconocido
};

/** Devuelve los meses (1-12) adeudados del año actual hasta el mes actual (inclusive) */
const obtenerMesesAdeudados = (
  cliente: Cliente,
  anioActual: number,
  mesActual: number
): number[] => {
  const meses: number[] = [];
  for (let m = 1; m <= mesActual; m++) {
    const estado = cliente.estados?.find(
      (e) => e.mes === m && e.anio === anioActual
    )?.estado;
    if (estado !== "Pagado") {
      // cuenta "Pendiente", "Pagado Parcial" o "Sin estado"
      meses.push(m);
    }
  }
  return meses;
};

const GestionClientes = () => {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [planes, setPlanes] = useState<PlanMap>({});
  const [modalCliente, setModalCliente] = useState<Cliente | null>(null);
  const [aniosCliente, setAniosCliente] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // NUEVO: búsqueda y filtros por estado
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilters, setEstadoFilters] = useState<{ [k: number]: boolean }>(
    {
      1: false, // Activo
      2: false, // Inactivo
      3: false, // Suspendido
    }
  );

  const cargarPlanes = async (): Promise<PlanMap> => {
    try {
      const resp = await fetch(`${apiHost}/api/planes`);
      if (!resp.ok) return {};
      const data: Plan[] = await resp.json();
      const mapa: PlanMap = {};
      data.forEach((p) => {
        mapa[p.id] = p;
      });
      setPlanes(mapa);
      return mapa;
    } catch {
      return {};
    }
  };

  const obtenerOInicializarEstados = async (
    clienteId: number,
    anio: number
  ): Promise<EstadoMensual[]> => {
    try {
      const response = await fetch(
        `${apiHost}/api/estado-mensual/cliente/${clienteId}/anio/${anio}`
      );
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
            body: JSON.stringify({
              cliente_id: clienteId,
              mes,
              anio,
              estado: "Pendiente",
            }),
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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiHost}/api/clientes`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Respuesta inesperada del servidor");

      // estados del año actual
      const year = anioActual;
      const clientesConEstados: Cliente[] = await Promise.all(
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

      // cargar planes si faltan
      const faltaPlan = clientesConEstados.some(
        (c) => !c.plan || typeof c.plan.precio_mensual !== "number"
      );
      if (faltaPlan) await cargarPlanes();
    } catch (err) {
      console.error("Error al obtener clientes:", err);
      setError("No se pudo cargar la lista de clientes.");
    } finally {
      setLoading(false);
    }
  };

  // Conteos por estado (sobre el total, para mostrar info)
  const counts = useMemo(() => {
    const base = { total: clientes.length, a: 0, i: 0, s: 0 };
    for (const c of clientes) {
      const id = getEstadoId(c);
      if (id === 1) base.a++;
      else if (id === 2) base.i++;
      else if (id === 3) base.s++;
    }
    return base;
  }, [clientes]);

  // Filtro combinado (búsqueda + checks de estado)
  const filtradosMemo = useMemo(() => {
    let base = [...clientes];

    // búsqueda
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      base = base.filter(
        (cliente) =>
          cliente.nombre.toLowerCase().includes(term) ||
          cliente.telefono?.toLowerCase?.().includes(term) ||
          cliente.direccion?.toLowerCase?.().includes(term) ||
          (cliente.descripcion &&
            cliente.descripcion.toLowerCase().includes(term))
      );
    }

    // estados (si no hay checks activos => TODOS)
    const activos = Object.entries(estadoFilters)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));

    if (activos.length > 0) {
      base = base.filter((c) => activos.includes(getEstadoId(c)));
    }

    return base;
  }, [clientes, searchTerm, estadoFilters]);

  // Sincroniza lista filtrada y resetea paginación
  useEffect(() => {
    setClientesFiltrados(filtradosMemo);
    setCurrentPage(1);
  }, [filtradosMemo]);

  const handleSearch = (val: string) => {
    setSearchTerm(val || "");
  };

  const handleEliminar = async (id: number) => {
    const clienteAEliminar = clientes.find((cliente) => cliente.id === id);
    if (!clienteAEliminar) {
      await Swal.fire("Error", "No se encontró el cliente a eliminar", "error");
      return;
    }

    const result = await Swal.fire({
      title: "¿Estás seguro?",
      html: `Estás a punto de eliminar al cliente: <br><strong>${clienteAEliminar.nombre}</strong>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      focusCancel: true,
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${apiHost}/api/clientes/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Error en la respuesta del servidor");
        }

        setClientes(clientes.filter((cliente) => cliente.id !== id));
        setClientesFiltrados(
          clientesFiltrados.filter((cliente) => cliente.id !== id)
        );

        await Swal.fire(
          "¡Eliminado!",
          `El cliente <strong>${clienteAEliminar.nombre}</strong> ha sido eliminado correctamente.`,
          "success"
        );
      } catch (error) {
        console.error("Error al eliminar cliente:", error);
        await Swal.fire(
          "Error",
          `No se pudo eliminar a ${clienteAEliminar.nombre}`,
          "error"
        );
      }
    }
  };

  const clientNames = clientes.map((cliente) => cliente.nombre);
  const indexOfLastClient = currentPage * itemsPerPage;
  const indexOfFirstClient = indexOfLastClient - itemsPerPage;
  const currentClients = clientesFiltrados.slice(
    indexOfFirstClient,
    indexOfLastClient
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== Cálculos de adeudos para Suspendidos (sobre la lista visible) ======
  const suspendidosVisibles = useMemo(
    () => clientesFiltrados.filter((c) => getEstadoId(c) === 3),
    [clientesFiltrados]
  );

  const resumenSuspendidos = useMemo(() => {
    if (suspendidosVisibles.length === 0) {
      return { totalClientes: 0, totalAdeudado: 0 };
    }
    let total = 0;
    for (const c of suspendidosVisibles) {
      const precio =
        c.plan?.precio_mensual ?? planes[c.plan_id]?.precio_mensual ?? 0;
      const meses = obtenerMesesAdeudados(c, anioActual, mesActual).length;
      total += precio * meses;
    }
    return { totalClientes: suspendidosVisibles.length, totalAdeudado: total };
  }, [suspendidosVisibles, planes, anioActual, mesActual]);

  const mostrarBannerSuspendidos =
    suspendidosVisibles.length > 0 &&
    // mostramos banner si el filtro incluye explícitamente suspendidos
    (estadoFilters[3] ||
      // o si no hay filtros activos (vista general) pero hay suspendidos visibles
      (!estadoFilters[1] && !estadoFilters[2] && !estadoFilters[3]));

  return (
    <AdminLayout>
      {/* Contenedor principal con mejor espaciado */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header con título y botón */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">
              Gestión de Clientes
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              Consulta el estado de los clientes y gestiona sus pagos
            </p>
          </div>
          <Link
            href="/pages/admin/clientes/registrar"
            className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nuevo Cliente
          </Link>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-4">
          <SearchDropdown
            items={clientNames}
            placeholder="Buscar por nombre, teléfono, dirección o estado..."
            onSearch={handleSearch}
            className="w-full max-w-md"
          />
        </div>

        {/* Filtros por estado + resumen */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Checkboxes */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                checked={estadoFilters[1]}
                onChange={() =>
                  setEstadoFilters((prev) => ({ ...prev, 1: !prev[1] }))
                }
              />
              <span className="inline-flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                  Activos
                </span>
                <span className="text-slate-500 text-xs">({counts.a})</span>
              </span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                checked={estadoFilters[2]}
                onChange={() =>
                  setEstadoFilters((prev) => ({ ...prev, 2: !prev[2] }))
                }
              />
              <span className="inline-flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                  Inactivos
                </span>
                <span className="text-slate-500 text-xs">({counts.i})</span>
              </span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                checked={estadoFilters[3]}
                onChange={() =>
                  setEstadoFilters((prev) => ({ ...prev, 3: !prev[3] }))
                }
              />
              <span className="inline-flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                  Suspendidos
                </span>
                <span className="text-slate-500 text-xs">({counts.s})</span>
              </span>
            </label>

            {/* Botón “Todos” */}
            <button
              type="button"
              onClick={() => setEstadoFilters({ 1: false, 2: false, 3: false })}
              className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
              title="Mostrar todos"
            >
              Ver todos
            </button>
          </div>

          {/* Resumen conteos */}
          <div className="text-sm text-slate-600">
            Mostrando <span className="font-semibold">{clientesFiltrados.length}</span> de{" "}
            <span className="font-semibold">{counts.total}</span> clientes —{" "}
            <span className="text-green-700 font-medium">{counts.a} activos</span>,{" "}
            <span className="text-gray-700 font-medium">{counts.i} inactivos</span>,{" "}
            <span className="text-yellow-700 font-medium">{counts.s} suspendidos</span>.
          </div>
        </div>

        {/* Banner resumen para Suspendidos */}
        {mostrarBannerSuspendidos && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              Suspendidos visibles:{" "}
              <strong>{resumenSuspendidos.totalClientes}</strong>{" "}
              {resumenSuspendidos.totalClientes === 1 ? "cliente" : "clientes"} | Total adeudado:{" "}
              <strong>{HNL.format(resumenSuspendidos.totalAdeudado)}</strong>{" "}
              <span className="text-xs text-yellow-700">
                (Se considera adeudado todo mes del año actual hasta {mesLargo[mesActual - 1]} que no esté en <b>Pagado</b>).
              </span>
            </p>
          </div>
        )}

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
              <p className="text-slate-600 text-lg mb-4">
                No hay clientes registrados.
              </p>
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
                    No se encontraron clientes que coincidan con la búsqueda/filtros.
                  </p>
                </div>
              )}

              {/* Vista móvil */}
              <div className="grid gap-4 md:hidden">
                {currentClients.map((cliente) => {
                  const anio = aniosCliente[cliente.id] || anioActual;
                  const maps = buildMapLinks(
                    cliente.coordenadas,
                    cliente.direccion
                  );
                  const esSuspendido = getEstadoId(cliente) === 3;

                  // cálculo adeudado para suspendidos
                  const precio =
                    cliente.plan?.precio_mensual ??
                    planes[cliente.plan_id]?.precio_mensual ??
                    0;
                  const mesesAdeudados = esSuspendido
                    ? obtenerMesesAdeudados(cliente, anioActual, mesActual)
                    : [];
                  const montoAdeudado =
                    esSuspendido ? precio * mesesAdeudados.length : 0;

                  return (
                    <div
                      key={cliente.id}
                      className="rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Header de la tarjeta */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-orange-700 truncate">
                            {cliente.nombre}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {cliente.telefono}
                          </p>
                          <p className="text-sm text-slate-500 break-words mt-1">
                            {cliente.direccion}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {badgeEstado(cliente.descripcion, cliente.estado_id)}
                        </div>
                      </div>

                      {/* Resumen adeudado si suspendido */}
                      {esSuspendido && (
                        <div className="mb-3 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">
                              Adeudado al {mesLargo[mesActual - 1]}:
                            </span>
                            <span className="text-sm font-bold text-yellow-800">
                              {HNL.format(montoAdeudado)}
                            </span>
                          </div>
                          {mesesAdeudados.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {mesesAdeudados.map((m) => (
                                <span
                                  key={`mchip-${cliente.id}-${m}`}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200"
                                  title={`${mesLargo[m - 1]} ${anioActual} pendiente`}
                                >
                                  {mesCorto[m - 1]}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-slate-500">—</p>
                          )}
                        </div>
                      )}

                      {/* Ubicación */}
                      {maps && (
                        <div className="mb-3">
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
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-600">
                          Año: {anio}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setAniosCliente((prev) => ({
                                ...prev,
                                [cliente.id]: anio - 1,
                              }))
                            }
                            className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            ← Anterior
                          </button>
                          <button
                            onClick={() =>
                              setAniosCliente((prev) => ({
                                ...prev,
                                [cliente.id]: anio + 1,
                              }))
                            }
                            className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            Siguiente →
                          </button>
                        </div>
                      </div>

                      {/* Estados mensuales */}
                      <div className="mb-4">
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            "Ene",
                            "Feb",
                            "Mar",
                            "Abr",
                            "May",
                            "Jun",
                            "Jul",
                            "Ago",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dic",
                          ].map((mes, index) => {
                            const estado = cliente.estados?.find(
                              (e) => e.mes === index + 1 && e.anio === anio
                            );
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
                        {/* Columna nueva condicional para Suspendidos */}
                        <th className="px-4 py-3 text-left font-semibold">
                          Adeudado (si Suspendido)
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentClients.map((cliente) => {
                        const anio = aniosCliente[cliente.id] || anioActual;
                        const maps = buildMapLinks(
                          cliente.coordenadas,
                          cliente.direccion
                        );
                        const esSuspendido = getEstadoId(cliente) === 3;

                        const precio =
                          cliente.plan?.precio_mensual ??
                          planes[cliente.plan_id]?.precio_mensual ??
                          0;
                        const mesesAdeudados = esSuspendido
                          ? obtenerMesesAdeudados(cliente, anioActual, mesActual)
                          : [];
                        const montoAdeudado =
                          esSuspendido ? precio * mesesAdeudados.length : 0;

                        return (
                          <tr key={cliente.id} className="hover:bg-orange-50">
                            <td className="px-4 py-3 font-medium">{cliente.id}</td>
                            <td className="px-4 py-3 font-medium text-orange-700">
                              {cliente.nombre}
                            </td>
                            <td className="px-4 py-3">{cliente.telefono}</td>
                            <td className="px-4 py-3 break-words max-w-xs">
                              {cliente.direccion}
                            </td>
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
                                <span className="text-slate-400 text-xs">
                                  Sin ubicación
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {badgeEstado(cliente.descripcion, cliente.estado_id)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-slate-600">
                                  Año: {anio}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() =>
                                      setAniosCliente((prev) => ({
                                        ...prev,
                                        [cliente.id]: anio - 1,
                                      }))
                                    }
                                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                                  >
                                    ←
                                  </button>
                                  <button
                                    onClick={() =>
                                      setAniosCliente((prev) => ({
                                        ...prev,
                                        [cliente.id]: anio + 1,
                                      }))
                                    }
                                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                                  >
                                    →
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-6 gap-1">
                                {["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map(
                                  (mes, index) => {
                                    const estado = cliente.estados?.find(
                                      (e) =>
                                        e.mes === index + 1 && e.anio === anio
                                    );
                                    let color = "bg-slate-100 text-slate-600";

                                    if (estado?.estado === "Pagado")
                                      color = "bg-green-100 text-green-700";
                                    else if (
                                      estado?.estado === "Pagado Parcial"
                                    )
                                      color = "bg-yellow-100 text-yellow-700";
                                    else if (estado?.estado === "Pendiente")
                                      color = "bg-red-100 text-red-700";
                                    else if (estado?.estado === "Suspendido")
                                      color = "bg-gray-400 text-gray-700";

                                    return (
                                      <div
                                        key={index}
                                        className={`p-1 rounded text-center text-xs ${color}`}
                                        title={`${
                                          [
                                            "Ene",
                                            "Feb",
                                            "Mar",
                                            "Abr",
                                            "May",
                                            "Jun",
                                            "Jul",
                                            "Ago",
                                            "Sep",
                                            "Oct",
                                            "Nov",
                                            "Dic",
                                          ][index]
                                        }: ${estado?.estado || "Sin estado"}`}
                                      >
                                        {mes}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </td>

                            {/* Adeudado si suspendido */}
                            <td className="px-4 py-3 align-top">
                              {esSuspendido ? (
                                <div>
                                  <div className="font-semibold">
                                    {HNL.format(montoAdeudado)}
                                  </div>
                                  {mesesAdeudados.length > 0 ? (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {mesesAdeudados.map((m) => (
                                        <span
                                          key={`chip-${cliente.id}-${m}`}
                                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"
                                          title={`${mesLargo[m - 1]} ${anioActual} pendiente`}
                                        >
                                          {mesCorto[m - 1]}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      —
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
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
