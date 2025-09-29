"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import Pagination from "@/app/components/pagination";
import SearchDropdown from "@/app/components/searchBar";
import Swal from "sweetalert2";

const apiHost = process.env.NEXT_PUBLIC_API_HOST || "";

/** ===== Tipos ===== */
type EstadoCore = "Activo" | "Inactivo" | "Suspendido";

interface ClienteTV {
    id: number;
    nombre: string;
    direccion: string | null;
    telefono: string | null;
    plantv_id: number;
    estado_id: number;
    plan_nombre?: string | null;
    plan_precio_mensual?: number | null;
    estado_descripcion?: string | null;
    total_dispositivos?: number | null;
}

/** ===== Utils ===== */
const normalizeEstado = (valor?: string | null): EstadoCore | "Otro" => {
    const v = (valor || "").trim().toLowerCase();
    if (v === "activo") return "Activo";
    if (v === "inactivo") return "Inactivo";
    if (v === "suspendido") return "Suspendido";
    return "Otro";
};

const isEstadoCore = (e: string): e is EstadoCore =>
    e === "Activo" || e === "Inactivo" || e === "Suspendido";

const badgeEstado = (estadoDesc?: string | null, _estado_id?: number) => {
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
        default:
            cls += " bg-slate-100 text-slate-600 border-slate-200";
    }
    return <span className={cls}>{label}</span>;
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
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // búsqueda y filtros
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [estadoFilters, setEstadoFilters] = useState<Record<EstadoCore, boolean>>({
        Activo: false,
        Inactivo: false,
        Suspendido: false,
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
            const data = (await res.json()) as ClienteTV[];
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Conteos por estado */
    const counts = useMemo(() => {
        const base = { total: clientes.length, Activo: 0, Inactivo: 0, Suspendido: 0 };
        for (const c of clientes) {
            const est = normalizeEstado(c.estado_descripcion);
            if (est === "Activo") base.Activo++;
            if (est === "Inactivo") base.Inactivo++;
            if (est === "Suspendido") base.Suspendido++;
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
                const tel = c.telefono?.toLowerCase() || "";
                const dir = c.direccion?.toLowerCase() || "";
                const est = c.estado_descripcion?.toLowerCase() || "";
                const plan = c.plan_nombre?.toLowerCase() || "";
                return (
                    nombre.includes(term) ||
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
                const est = normalizeEstado(c.estado_descripcion);
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

                {/* Búsqueda */}
                <div className="mb-4">
                    <SearchDropdown
                        items={clientNames}
                        placeholder="Buscar por nombre, teléfono, dirección, estado o plan..."
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

                        <button
                            type="button"
                            onClick={() => setEstadoFilters({ Activo: false, Inactivo: false, Suspendido: false })}
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
                        <span className="text-yellow-700 font-medium">{counts.Suspendido} suspendidos</span>.
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
                                                    <h3 className="text-lg font-semibold text-orange-700 truncate">{c.nombre}</h3>
                                                    <p className="text-sm text-slate-600">{c.telefono || "-"}</p>
                                                    <p className="text-sm text-slate-500 break-words mt-1">{c.direccion || "-"}</p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Plan: <span className="font-medium">{c.plan_nombre || "-"}</span> · Dispositivos:{" "}
                                                        <span className="font-medium">{c.total_dispositivos ?? 0}</span>
                                                    </p>
                                                </div>
                                                <div className="shrink-0">{badgeEstado(c.estado_descripcion, c.estado_id)}</div>
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
                                                <Link
                                                    href={`/pages/admin/tv/clientes/${c.id}`}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium text-center"
                                                >
                                                    Ver
                                                </Link>
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
                                                <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                                                <th className="px-4 py-3 text-left font-semibold">Teléfono</th>
                                                <th className="px-4 py-3 text-left font-semibold">Dirección</th>
                                                <th className="px-4 py-3 text-left font-semibold">Plan</th>
                                                <th className="px-4 py-3 text-left font-semibold">Dispositivos</th>
                                                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                                <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {currentClients.map((c) => {
                                                return (
                                                    <tr key={c.id} className="hover:bg-orange-50">
                                                        <td className="px-4 py-3 font-medium">{c.id}</td>
                                                        <td className="px-4 py-3 font-medium text-orange-700">{c.nombre}</td>
                                                        <td className="px-4 py-3">{c.telefono || "-"}</td>
                                                        <td className="px-4 py-3 break-words max-w-xs">{c.direccion || "-"}</td>
                                                        <td className="px-4 py-3">{c.plan_nombre || "-"}</td>
                                                        <td className="px-4 py-3">{c.total_dispositivos ?? 0}</td>
                                                        <td className="px-4 py-3">{badgeEstado(c.estado_descripcion, c.estado_id)}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex gap-2">
                                                                <Link
                                                                    href={`/pages/admin/tv/clientes/${c.id}`}
                                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                                                >
                                                                    Ver
                                                                </Link>
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
        </AdminLayout>
    );
};

export default GestionClientesTv;
