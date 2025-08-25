"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface Pago {
    id: number;
    cliente_id: number;
    monto: number;
    fecha_pago: string;
    metodo_id: number;
    metodo_pago_desc: string;
    referencia: string;
    observaciones: string;
    created_at: string;
    updated_at: string;
}

interface Cliente {
    id: number;
    nombre: string;
}

const VerPagos = () => {
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [clientes, setClientes] = useState<{ [key: number]: string }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    const [filtroCliente, setFiltroCliente] = useState<string>("");
    const [filtroMetodo, setFiltroMetodo] = useState<string>("");

    useEffect(() => {
        cargarPagos();
        cargarClientes();
    }, []);

    const cargarPagos = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${apiHost}/api/pagos`);
            if (!res.ok) throw new Error("Error al cargar pagos");
            const data: Pago[] = await res.json();
            setPagos(data);
        } catch (err) {
            console.error(err);
            setError("No se pudieron cargar los pagos");
        } finally {
            setLoading(false);
        }
    };

    const cargarClientes = async () => {
        try {
            const res = await fetch(`${apiHost}/api/clientes`);
            if (res.ok) {
                const data: Cliente[] = await res.json();
                const clientesMap = data.reduce((acc, cliente) => {
                    acc[cliente.id] = cliente.nombre;
                    return acc;
                }, {} as { [key: number]: string });
                setClientes(clientesMap);
            }
        } catch (error) {
            console.error("Error al cargar clientes:", error);
        }
    };

    const formatFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const formatMonto = (monto: number | undefined) => {
        // Asegurarse de que monto sea un número válido
        const montoNumero = Number(monto);
        if (isNaN(montoNumero)) {
            return 'L. 0.00';
        }
        return new Intl.NumberFormat('es-HN', {
            style: 'currency',
            currency: 'HNL'
        }).format(montoNumero);
    };

    const pagosFiltrados = pagos.filter(pago => {
        const nombreCliente = clientes[pago.cliente_id]?.toLowerCase() || '';
        const metodoPago = pago.metodo_pago_desc?.toLowerCase() || '';
        
        const coincideCliente = nombreCliente.includes(filtroCliente.toLowerCase());
        const coincideMetodo = metodoPago.includes(filtroMetodo.toLowerCase());
        
        return coincideCliente && coincideMetodo;
    });

    // Asegurarse de que cada monto sea un número válido antes de sumar
    const totalMonto = pagosFiltrados.reduce((sum, pago) => {
        const montoNumero = Number(pago.monto);
        return sum + (isNaN(montoNumero) ? 0 : montoNumero);
    }, 0);

    if (loading) {
        return (
            <AdminLayout>
                <div className="px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">Cargando pagos...</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-orange-600">Registro de Pagos</h1>
                        <p className="text-slate-600 mt-1">Todos los pagos registrados en el sistema</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/pages/admin/registrar-pago"
                            className="inline-flex items-center px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
                        >
                            + Nuevo Pago
                        </Link>
                        <Link
                            href="/pages/admin/clientes"
                            className="inline-flex items-center px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm"
                        >
                            ← Volver a Clientes
                        </Link>
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Filtrar por Cliente
                            </label>
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={filtroCliente}
                                onChange={(e) => setFiltroCliente(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Filtrar por Método
                            </label>
                            <input
                                type="text"
                                placeholder="Buscar método..."
                                value={filtroMetodo}
                                onChange={(e) => setFiltroMetodo(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="text-sm text-slate-600">Total de Pagos</div>
                        <div className="text-2xl font-bold text-orange-600">{pagosFiltrados.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="text-sm text-slate-600">Monto Total</div>
                        <div className="text-2xl font-bold text-green-600">{formatMonto(totalMonto)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="text-sm text-slate-600">Pagos Último Mes</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {pagosFiltrados.filter(pago => {
                                const fechaPago = new Date(pago.fecha_pago);
                                const unMesAtras = new Date();
                                unMesAtras.setMonth(unMesAtras.getMonth() - 1);
                                return fechaPago >= unMesAtras;
                            }).length}
                        </div>
                    </div>
                </div>

                {/* Tabla de Pagos */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Cliente
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Monto
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Fecha Pago
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Método
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Referencia
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                        Observaciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {pagosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-4 text-center text-slate-500">
                                            {pagos.length === 0 ? 'No hay pagos registrados' : 'No se encontraron pagos con los filtros aplicados'}
                                        </td>
                                    </tr>
                                ) : (
                                    pagosFiltrados.map((pago) => (
                                        <tr key={pago.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-4 text-sm text-slate-900">
                                                {pago.id}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-900">
                                                {clientes[pago.cliente_id] || `Cliente #${pago.cliente_id}`}
                                            </td>
                                            <td className="px-4 py-4 text-sm font-semibold text-green-600">
                                                {formatMonto(pago.monto)}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-900">
                                                {formatFecha(pago.fecha_pago)}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-900">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {pago.metodo_pago_desc}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-900">
                                                {pago.referencia || '-'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-900 max-w-xs truncate">
                                                {pago.observaciones || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Resumen */}
                {pagosFiltrados.length > 0 && (
                    <div className="mt-4 bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">
                                Mostrando {pagosFiltrados.length} de {pagos.length} pagos
                            </span>
                            <span className="text-sm font-semibold text-green-600">
                                Total: {formatMonto(totalMonto)}
                            </span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default VerPagos;
