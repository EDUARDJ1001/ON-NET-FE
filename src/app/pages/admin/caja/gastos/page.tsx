"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface Gasto {
    id: number;
    descripcion: string;
    monto: number;
    fecha: string; // YYYY-MM-DD
    created_at?: string | null;
    updated_at?: string | null;
}

type ModalMode = "create" | "edit" | null;

interface Filtros {
    q: string;           // búsqueda por descripción
    startDate: string;   // YYYY-MM-DD
    endDate: string;     // YYYY-MM-DD
}

const TZ = "America/Tegucigalpa";

const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${String(token)}` } : {};
};

const formatMonto = (monto: number | undefined): string => {
    const n = Number(monto);
    if (isNaN(n)) return "L. 0.00";
    return new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(n);
};

const formatFechaLocal = (fechaISOoYMD: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaISOoYMD)) return fechaISOoYMD;
    if (!fechaISOoYMD) return "—";
    const d = new Date(fechaISOoYMD);
    return new Intl.DateTimeFormat("es-HN", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
};

const GastosPage = () => {
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // paginación local
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);

    // filtros
    const [filtros, setFiltros] = useState<Filtros>({
        q: "",
        startDate: "",
        endDate: "",
    });

    // modal
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editing, setEditing] = useState<Gasto | null>(null);
    const [form, setForm] = useState<{ descripcion: string; monto: string; fecha: string }>({
        descripcion: "",
        monto: "",
        fecha: "",
    });
    const [formError, setFormError] = useState<string>("");

    const requestIdRef = useRef(0);
    // ===== Fetch helpers (sin AbortError ruidoso) =====
    const safeFetch = async (url: string, init?: RequestInit): Promise<Response> => {
        // Genera un id para esta solicitud y marca que es la más reciente
        const myId = ++requestIdRef.current;

        const headers: HeadersInit = {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
            ...(init?.headers || {}),
        };

        const res = await fetch(url, { ...init, headers });

        // Si, cuando terminó, ya existe una solicitud más nueva, marcamos esta como "stale"
        if (myId !== requestIdRef.current) {
            return new Response(null, { status: 499, statusText: "Stale response" });
        }

        return res;
    };


    // ===== Carga inicial =====
    useEffect(() => {
        void cargarGastos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cargarGastos = async (): Promise<void> => {
        try {
            setLoading(true);
            setError("");

            // Intento con parámetros si tu backend los soporta (opcional)
            const params = new URLSearchParams();
            if (filtros.startDate) params.set("startDate", `${filtros.startDate}T00:00`);
            if (filtros.endDate) params.set("endDate", `${filtros.endDate}T23:59`);
            const url = `${apiHost}/api/gastos${params.toString() ? `?${params.toString()}` : ""}`;

            let res = await safeFetch(url);
            if (res.status === 499) return; // solicitud abortada por otra más nueva

            if (!res.ok) {
                // fallback a GET simple
                res = await safeFetch(`${apiHost}/api/gastos`);
                if (res.status === 499) return;
            }

            if (!res.ok) throw new Error("Error al obtener gastos");
            const data: Gasto[] = await res.json();
            setGastos(Array.isArray(data) ? data : []);
            setPage(1);
        } catch (e: unknown) {
            console.error(e);
            setError(e instanceof Error ? e.message : "No se pudieron cargar los gastos");
        } finally {
            setLoading(false);
        }
    };

    // ===== CRUD =====
    const validarForm = (): string | null => {
        if (!form.descripcion?.trim()) return "La descripción es obligatoria";
        const monto = parseFloat(form.monto);
        if (isNaN(monto) || monto <= 0) return "El monto debe ser un número positivo";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)) return "Fecha inválida (use YYYY-MM-DD)";
        return null;
    };

    const abrirCrear = () => {
        setModalMode("create");
        setEditing(null);
        setForm({ descripcion: "", monto: "", fecha: new Date().toISOString().slice(0, 10) });
        setFormError("");
    };

    const abrirEditar = (g: Gasto) => {
        setModalMode("edit");
        setEditing(g);
        setForm({
            descripcion: g.descripcion,
            monto: String(g.monto),
            fecha: /^\d{4}-\d{2}-\d{2}$/.test(g.fecha) ? g.fecha : new Date(g.fecha).toISOString().slice(0, 10),
        });
        setFormError("");
    };

    const cerrarModal = () => {
        setModalMode(null);
        setEditing(null);
        setFormError("");
    };

    const guardarGasto = async (): Promise<void> => {
        const err = validarForm();
        if (err) {
            setFormError(err);
            return;
        }
        try {
            setLoading(true);
            setFormError("");
            const body = JSON.stringify({
                descripcion: form.descripcion.trim(),
                monto: parseFloat(form.monto),
                fecha: form.fecha, // YYYY-MM-DD
            });

            if (modalMode === "create") {
                const res = await safeFetch(`${apiHost}/api/gastos`, { method: "POST", body });
                if (res.status === 499) return;
                if (!res.ok) throw new Error("No se pudo crear el gasto");
            } else if (modalMode === "edit" && editing) {
                const res = await safeFetch(`${apiHost}/api/gastos/${editing.id}`, { method: "PUT", body });
                if (res.status === 499) return;
                if (!res.ok) throw new Error("No se pudo actualizar el gasto");
            }

            await cargarGastos();
            cerrarModal();
        } catch (e: unknown) {
            console.error(e);
            setFormError(e instanceof Error ? e.message : "Error al guardar el gasto");
        } finally {
            setLoading(false);
        }
    };

    const eliminarGasto = async (g: Gasto): Promise<void> => {
        if (!confirm(`¿Eliminar el gasto "${g.descripcion}" por ${formatMonto(g.monto)}?`)) return;
        try {
            setLoading(true);
            const res = await safeFetch(`${apiHost}/api/gastos/${g.id}`, { method: "DELETE" });
            if (res.status === 499) return;
            if (!res.ok) throw new Error("No se pudo eliminar");
            await cargarGastos();
        } catch (e: unknown) {
            console.error(e);
            setError(e instanceof Error ? e.message : "Error al eliminar");
        } finally {
            setLoading(false);
        }
    };

    // ===== Filtrado & paginación local =====
    const gastosFiltrados = useMemo<Gasto[]>(() => {
        let list = [...gastos];
        if (filtros.q.trim()) {
            const q = filtros.q.toLowerCase();
            list = list.filter((g) => g.descripcion.toLowerCase().includes(q));
        }
        if (filtros.startDate) {
            list = list.filter((g) => g.fecha >= filtros.startDate);
        }
        if (filtros.endDate) {
            list = list.filter((g) => g.fecha <= filtros.endDate);
        }
        // orden reciente por fecha desc y luego id desc
        list.sort((a, b) => {
            const fa = a.fecha, fb = b.fecha;
            if (fa < fb) return 1;
            if (fa > fb) return -1;
            return b.id - a.id;
        });
        return list;
    }, [gastos, filtros]);

    const totalFiltrados = gastosFiltrados.length;
    const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / pageSize));
    const visibleRows = useMemo<Gasto[]>(() => {
        const start = (page - 1) * pageSize;
        return gastosFiltrados.slice(start, start + pageSize);
    }, [gastosFiltrados, page, pageSize]);

    const totalMontoPagina = visibleRows.reduce<number>((s, g) => s + (Number(g.monto) || 0), 0);
    const totalMontoFiltrado = gastosFiltrados.reduce<number>((s, g) => s + (Number(g.monto) || 0), 0);

    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8 py-16">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-orange-600">Gastos</h1>
                        <p className="text-slate-600 mt-1">Gestione los gastos operativos del sistema</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={abrirCrear}
                            className="inline-flex items-center px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
                        >
                            + Nuevo Gasto
                        </button>
                        <Link
                            href="/pages/admin/balance"
                            className="inline-flex items-center px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                        >
                            Ver Balance
                        </Link>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Buscar</label>
                            <input
                                type="text"
                                placeholder="Descripción..."
                                value={filtros.q}
                                onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
                            <input
                                type="date"
                                value={filtros.startDate}
                                onChange={(e) => setFiltros({ ...filtros, startDate: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
                            <input
                                type="date"
                                value={filtros.endDate}
                                onChange={(e) => setFiltros({ ...filtros, endDate: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => { setFiltros({ q: "", startDate: "", endDate: "" }); setPage(1); }}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 h-10"
                            >
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                        <div className="ml-auto flex items-center gap-2">
                            <label className="text-sm text-slate-600">Filas por página</label>
                            <select
                                className="px-2 py-1 border rounded"
                                value={pageSize}
                                onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                            >
                                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="text-sm text-slate-600">Gastos filtrados</div>
                        <div className="text-2xl font-bold text-orange-600">{totalFiltrados}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="text-sm text-slate-600">Total filtrado</div>
                        <div className="text-2xl font-bold text-green-600">{formatMonto(totalMontoFiltrado)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="text-sm text-slate-600">Total en página</div>
                        <div className="text-2xl font-bold text-blue-600">{formatMonto(totalMontoPagina)}</div>
                    </div>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Descripción</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Monto</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Cargando...</td></tr>
                                ) : visibleRows.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Sin resultados</td></tr>
                                ) : (
                                    visibleRows.map((g) => (
                                        <tr key={g.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-4 text-sm">{g.id}</td>
                                            <td className="px-4 py-4 text-sm">{g.descripcion}</td>
                                            <td className="px-4 py-4 text-sm font-semibold text-red-600">{formatMonto(g.monto)}</td>
                                            <td className="px-4 py-4 text-sm">{formatFechaLocal(g.fecha)}</td>
                                            <td className="px-4 py-4 text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => abrirEditar(g)}
                                                        className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 text-xs"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => void eliminarGasto(g)}
                                                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-xs"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Paginación */}
                <div className="mt-4 bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span className="text-sm text-slate-600">
                        Mostrando <strong>{visibleRows.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, totalFiltrados)}</strong> de <strong>{totalFiltrados}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                        >
                            ← Anterior
                        </button>
                        <span className="text-sm text-slate-700">Página {page} / {totalPaginas}</span>
                        <button
                            className="px-3 py-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                            onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                            disabled={page >= totalPaginas}
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>

                {error && <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

                {/* Modal Crear/Editar */}
                {modalMode && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5">
                            <h2 className="text-lg font-semibold mb-4">
                                {modalMode === "create" ? "Nuevo Gasto" : "Editar Gasto"}
                            </h2>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                    <input
                                        type="text"
                                        value={form.descripcion}
                                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.monto}
                                        onChange={(e) => setForm({ ...form, monto: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={form.fecha}
                                        onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                {formError && <div className="p-2 rounded bg-red-100 text-red-700 text-sm">{formError}</div>}
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                <button onClick={cerrarModal} className="px-4 py-2 rounded bg-slate-200 text-slate-700 hover:bg-slate-300">
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => void guardarGasto()}
                                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default GastosPage;
