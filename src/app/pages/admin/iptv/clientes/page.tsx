"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import Pagination from "@/app/components/pagination";
import SearchDropdown from "@/app/components/searchBar";
import Swal from "sweetalert2";
import ClienteTvModal from "../components/clienteTvModal";
import DispositivosClienteModal from "../components/dispositivosClienteModal";

const apiHost = process.env.NEXT_PUBLIC_API_HOST || "";

/** ===== Tipos ===== */
type EstadoCore = "Activo" | "Inactivo" | "Suspendido" | "Cancelado";
type Moneda = "HNL" | "USD";

interface EstadoMensualTV {
    mes: number;
    anio: number;
    estado: string;
}

interface ClienteTV {
    id: number;
    nombre: string;
    usuario: string;
    direccion: string | null;
    telefono: string | null;
    plantv_id: number;
    estado_id: number;
    fecha_creacion: string;
    fecha_inicio: string;
    fecha_expiracion: string;
    monto_cancelado: number;
    moneda: Moneda;
    creditos_otorgados: number;
    notas: string | null;
    
    // Campos de joins
    plan_nombre?: string;
    plan_precio?: number;
    plan_duracion?: number;
    estado_nombre?: string;
    estado_descripcion?: string;
    total_dispositivos?: number;
    dias_restantes?: number;
    estado_vencimiento?: "Expirado" | "Por Expirar" | "Vigente";
    
    // Para el modal
    estados?: EstadoMensualTV[];
}

/** ===== Utils ===== */
const normalizeEstado = (valor?: string | null): EstadoCore | "Otro" => {
    const v = (valor || "").trim().toLowerCase();
    if (v === "activo") return "Activo";
    if (v === "inactivo") return "Inactivo";
    if (v === "suspendido") return "Suspendido";
    if (v === "cancelado") return "Cancelado";
    return "Otro";
};

const isEstadoCore = (e: string): e is EstadoCore =>
    e === "Activo" || e === "Inactivo" || e === "Suspendido" || e === "Cancelado";

const badgeEstado = (estadoDesc?: string | null) => {
    const label = normalizeEstado(estadoDesc);
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
        case "Cancelado":
            cls += " bg-red-50 text-red-700 border-red-200";
            break;
        default:
            cls += " bg-slate-100 text-slate-600 border-slate-200";
    }
    return <span className={cls}>{label}</span>;
};

const badgeVencimiento = (estado?: string) => {
    let cls = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border";
    switch (estado) {
        case "Expirado":
            cls += " bg-red-50 text-red-700 border-red-200";
            break;
        case "Por Expirar":
            cls += " bg-orange-50 text-orange-700 border-orange-200";
            break;
        case "Vigente":
            cls += " bg-green-50 text-green-700 border-green-200";
            break;
        default:
            cls += " bg-slate-100 text-slate-600 border-slate-200";
    }
    return <span className={cls}>{estado}</span>;
};

const formatCurrency = (amount: number, moneda: Moneda): string => {
    return new Intl.NumberFormat('es-HN', {
        style: 'currency',
        currency: moneda === 'USD' ? 'USD' : 'HNL',
        minimumFractionDigits: 2
    }).format(amount);
};

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-HN');
};

const buildMapLinksFromAddress = (direccion?: string | null) => {
    const q = encodeURIComponent(direccion || "");
    return q
        ? {
            gmaps: `https://www.google.com/maps?q=${q}`,
            label: direccion,
        }
        : null;
};

/** ===== Componente ===== */
const GestionClientesTv = () => {
    const [clientes, setClientes] = useState<ClienteTV[]>([]);
    const [clientesFiltrados, setClientesFiltrados] = useState<ClienteTV[]>([]);
    const [modalDispositivos, setModalDispositivos] = useState<{ clienteId: number; clienteNombre: string } | null>(null);
    const openDispositivos = (c: ClienteTV) => {
        setModalDispositivos({ clienteId: c.id, clienteNombre: c.nombre });
    };
    const [modalClienteTv, setModalClienteTv] = useState<ClienteTV | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // búsqueda y filtros
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [estadoFilters, setEstadoFilters] = useState<Record<EstadoCore, boolean>>({
        Activo: false,
        Inactivo: false,
        Suspendido: false,
        Cancelado: false,
    });

    // paginación
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 10;

    /** Cargar clientes */
    const fetchClientes = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiHost}/api/tv/clientes`);
            if (!res.ok) throw new Error("No se pudo cargar la lista de clientes.");
            const data = await res.json() as ClienteTV[];
            setClientes(data);
            setClientesFiltrados(data);
        } catch (err) {
            console.error("Error al obtener clientes TV:", err);
            setError("No se pudo cargar la lista de clientes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClientes();
    }, []);

    /** Conteos por estado */
    const counts = useMemo(() => {
        const base = { 
            total: clientes.length, 
            Activo: 0, 
            Inactivo: 0, 
            Suspendido: 0, 
            Cancelado: 0 
        };
        for (const c of clientes) {
            const est = normalizeEstado(c.estado_nombre);
            if (est === "Activo") base.Activo++;
            if (est === "Inactivo") base.Inactivo++;
            if (est === "Suspendido") base.Suspendido++;
            if (est === "Cancelado") base.Cancelado++;
        }
        return base;
    }, [clientes]);

    /** Aplicar búsqueda + filtros */
    const filtradosMemo = useMemo(() => {
        let base = [...clientes];

        const term = searchTerm.trim().toLowerCase();
        if (term) {
            base = base.filter((c) => {
                const nombre = c.nombre?.toLowerCase() || "";
                const usuario = c.usuario?.toLowerCase() || "";
                const tel = c.telefono?.toLowerCase() || "";
                const dir = c.direccion?.toLowerCase() || "";
                const est = c.estado_nombre?.toLowerCase() || "";
                const plan = c.plan_nombre?.toLowerCase() || "";
                return (
                    nombre.includes(term) ||
                    usuario.includes(term) ||
                    tel.includes(term) ||
                    dir.includes(term) ||
                    est.includes(term) ||
                    plan.includes(term)
                );
            });
        }

        const activos: EstadoCore[] = Object.entries(estadoFilters)
            .filter(([, v]) => v)
            .map(([k]) => k as EstadoCore);

        if (activos.length > 0) {
            base = base.filter((c) => {
                const est = normalizeEstado(c.estado_nombre);
                return isEstadoCore(est) && activos.includes(est);
            });
        }
        return base;
    }, [clientes, searchTerm, estadoFilters]);

    useEffect(() => {
        setClientesFiltrados(filtradosMemo);
        setCurrentPage(1);
    }, [filtradosMemo]);

    /** Handlers UI */
    const handleSearch = (val: string) => setSearchTerm(val || "");

    const handleEliminar = async (id: number) => {
        const clienteAEliminar = clientes.find((x) => x.id === id);
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

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`${apiHost}/api/tv/clientes/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Error al eliminar en el servidor");

            const nueva = clientes.filter((c) => c.id !== id);
            setClientes(nueva);
            setClientesFiltrados((prev) => prev.filter((c) => c.id !== id));

            await Swal.fire(
                "¡Eliminado!",
                `El cliente <strong>${clienteAEliminar.nombre}</strong> ha sido eliminado.`,
                "success"
            );
        } catch (e) {
            console.error(e);
            await Swal.fire("Error", `No se pudo eliminar a ${clienteAEliminar.nombre}`, "error");
        }
    };

    /** Abrir modal (cargar detalle por ID y asegurar "estados") */
    const handleVer = async (id: number) => {
        try {
            const res = await fetch(`${apiHost}/api/tv/clientes/${id}`);
            if (!res.ok) throw new Error("No se pudo cargar el cliente.");
            const data = await res.json() as ClienteTV;
            // Garantiza que el modal reciba un arreglo (aunque sea vacío)
            setModalClienteTv({ ...data, estados: Array.isArray(data.estados) ? data.estados : [] });
        } catch (err) {
            console.error("Error al obtener cliente TV:", err);
            await Swal.fire("Error", "No se pudo cargar el cliente.", "error");
        }
    };

    /** Paginación */
    const clientNames = clientes.map((c) => c.nombre);
    const indexOfLastClient = currentPage * itemsPerPage;
    const indexOfFirstClient = indexOfLastClient - itemsPerPage;
    const currentClients = clientesFiltrados.slice(indexOfFirstClient, indexOfLastClient);
    const handlePageChange = (page: number) => setCurrentPage(page);

    /** Render */
    return (
        <AdminLayout>
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">Gestión de Clientes TV</h1>
                        <p className="text-sm text-slate-600 mt-2">Consulta y gestiona clientes de TV</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href="/pages/admin/iptv/planestv"
                            className="inline-flex items-center justify-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
                        >
                            Planes de TV
                        </Link>
                        <Link
                            href="/pages/admin/iptv/registrar"
                            className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nuevo Cliente
                        </Link>
                    </div>
                </div>

                {/* Búsqueda */}
                <div className="mb-4">
                    <SearchDropdown
                        items={clientNames}
                        placeholder="Buscar por nombre, usuario, teléfono, dirección, estado o plan..."
                        onSearch={handleSearch}
                        className="w-full max-w-md"
                    />
                </div>

                {/* Filtros + resumen */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                checked={estadoFilters.Activo}
                                onChange={() => setEstadoFilters((p) => ({ ...p, Activo: !p.Activo }))}
                            />
                            <span className="inline-flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                    Activos
                                </span>
                                <span className="text-slate-500 text-xs">({counts.Activo})</span>
                            </span>
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                checked={estadoFilters.Inactivo}
                                onChange={() => setEstadoFilters((p) => ({ ...p, Inactivo: !p.Inactivo }))}
                            />
                            <span className="inline-flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                                    Inactivos
                                </span>
                                <span className="text-slate-500 text-xs">({counts.Inactivo})</span>
                            </span>
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                checked={estadoFilters.Suspendido}
                                onChange={() => setEstadoFilters((p) => ({ ...p, Suspendido: !p.Suspendido }))}
                            />
                            <span className="inline-flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                                    Suspendidos
                                </span>
                                <span className="text-slate-500 text-xs">({counts.Suspendido})</span>
                            </span>
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                checked={estadoFilters.Cancelado}
                                onChange={() => setEstadoFilters((p) => ({ ...p, Cancelado: !p.Cancelado }))}
                            />
                            <span className="inline-flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                    Cancelados
                                </span>
                                <span className="text-slate-500 text-xs">({counts.Cancelado})</span>
                            </span>
                        </label>

                        <button
                            type="button"
                            onClick={() => setEstadoFilters({ 
                                Activo: false, 
                                Inactivo: false, 
                                Suspendido: false, 
                                Cancelado: false 
                            })}
                            className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                            title="Mostrar todos"
                        >
                            Ver todos
                        </button>
                    </div>

                    <div className="text-sm text-slate-600">
                        Mostrando <span className="font-semibold">{clientesFiltrados.length}</span> de{" "}
                        <span className="font-semibold">{counts.total}</span> clientes —{" "}
                        <span className="text-green-700 font-medium">{counts.Activo} activos</span>,{" "}
                        <span className="text-gray-700 font-medium">{counts.Inactivo} inactivos</span>,{" "}
                        <span className="text-yellow-700 font-medium">{counts.Suspendido} suspendidos</span>,{" "}
                        <span className="text-red-700 font-medium">{counts.Cancelado} cancelados</span>.
                    </div>
                </div>

                {/* Contenido principal */}
                <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto" />
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
                                href="/pages/admin/iptv/registrar"
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

                            {/* Móvil */}
                            <div className="grid gap-4 md:hidden">
                                {currentClients.map((c) => {
                                    const maps = buildMapLinksFromAddress(c.direccion);
                                    return (
                                        <div
                                            key={c.id}
                                            className="rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-semibold text-orange-700 truncate">
                                                        {c.nombre}
                                                    </h3>
                                                    <p className="text-sm text-slate-600">{c.usuario}</p>
                                                    <p className="text-sm text-slate-600">{c.telefono || "-"}</p>
                                                    <p className="text-sm text-slate-500 break-words mt-1">
                                                        {c.direccion || "-"}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Plan: <span className="font-medium">{c.plan_nombre || "-"}</span> ·{" "}
                                                        <span className="font-medium">
                                                            {formatCurrency(c.monto_cancelado, c.moneda)}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Expira: <span className="font-medium">{formatDate(c.fecha_expiracion)}</span> ·{" "}
                                                        <button
                                                            onClick={() => openDispositivos(c)}
                                                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                                            title="Ver dispositivos del cliente"
                                                        >
                                                            Dispositivos: <span className="ml-1">{c.total_dispositivos ?? 0}</span>
                                                        </button>
                                                    </p>
                                                </div>
                                                <div className="shrink-0 flex flex-col gap-1">
                                                    {badgeEstado(c.estado_nombre)}
                                                    {c.estado_vencimiento && badgeVencimiento(c.estado_vencimiento)}
                                                </div>
                                            </div>

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

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleVer(c.id)}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium text-center"
                                                >
                                                    Ver
                                                </button>
                                                <button
                                                    onClick={() => handleEliminar(c.id)}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop */}
                            <div className="hidden md:block">
                                <div className="overflow-x-auto rounded-lg">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="bg-orange-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold">ID</th>
                                                <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                                                <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                                                <th className="px-4 py-3 text-left font-semibold">Teléfono</th>
                                                <th className="px-4 py-3 text-left font-semibold">Plan</th>
                                                <th className="px-4 py-3 text-left font-semibold">Monto</th>
                                                <th className="px-4 py-3 text-left font-semibold">Expiración</th>
                                                <th className="px-4 py-3 text-left font-semibold">Dispositivos</th>
                                                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                                <th className="px-4 py-3 text-left font-semibold">Vencimiento</th>
                                                <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {currentClients.map((c) => {
                                                return (
                                                    <tr key={c.id} className="hover:bg-orange-50">
                                                        <td className="px-4 py-3 font-medium">{c.id}</td>
                                                        <td className="px-4 py-3 font-medium text-orange-700">
                                                            <div>
                                                                <div>{c.nombre}</div>
                                                                <div className="text-xs text-slate-500 truncate max-w-xs">
                                                                    {c.direccion || "-"}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">@{c.usuario}</td>
                                                        <td className="px-4 py-3">{c.telefono || "-"}</td>
                                                        <td className="px-4 py-3">{c.plan_nombre || "-"}</td>
                                                        <td className="px-4 py-3 font-medium">
                                                            {formatCurrency(c.monto_cancelado, c.moneda)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {formatDate(c.fecha_expiracion)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => openDispositivos(c)}
                                                                className="px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                                                title="Ver dispositivos del cliente"
                                                            >
                                                                {c.total_dispositivos ?? 0}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3">{badgeEstado(c.estado_nombre)}</td>
                                                        <td className="px-4 py-3">
                                                            {c.estado_vencimiento && badgeVencimiento(c.estado_vencimiento)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleVer(c.id)}
                                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                                                >
                                                                    Ver
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEliminar(c.id)}
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

            {/* Modal */}
            {modalClienteTv && (
                <ClienteTvModal
                    cliente={modalClienteTv}
                    onClose={() => setModalClienteTv(null)}
                    onClienteUpdated={() => {
                        setModalClienteTv(null);
                        fetchClientes();
                    }}
                    apiHost={apiHost}
                />
            )}

            {modalDispositivos && (
                <DispositivosClienteModal
                    apiHost={apiHost}
                    clienteId={modalDispositivos.clienteId}
                    clienteNombre={modalDispositivos.clienteNombre}
                    onClose={() => setModalDispositivos(null)}
                    onChanged={() => {
                        fetchClientes();
                    }}
                />
            )}
        </AdminLayout>
    );
};

export default GestionClientesTv;
