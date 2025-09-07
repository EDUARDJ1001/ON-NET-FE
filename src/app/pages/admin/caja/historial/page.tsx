"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import SearchSelect from "@/app/components/searchSelect";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface Pago {
    id: number;
    cliente_id: number;
    monto: number;
    fecha_pago: string;
    metodo_id: number;
    metodo_pago_desc: string;
    referencia: string;
    observacion: string;
    mes_aplicado: number;
    anio_aplicado: number;
    created_at: string;
    updated_at: string;
    cliente_nombre?: string;
}

interface Cliente {
    id: number;
    nombre: string;
}

interface MetodoPago {
    id: number;
    descripcion: string;
}

interface Filtros {
    cliente: string;
    metodo: string;
    mes: string;
    anio: string;
}

const VerPagos = () => {
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    const [filtros, setFiltros] = useState<Filtros>({
        cliente: "",
        metodo: "",
        mes: "",
        anio: ""
    });

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        try {
            setLoading(true);
            await Promise.all([
                cargarPagos(),
                cargarClientes(),
                cargarMetodosPago()
            ]);
        } catch (error) {
            console.error("Error al cargar datos:", error);
            setError("Error al cargar los datos");
        } finally {
            setLoading(false);
        }
    };

    const cargarPagos = async () => {
        try {
            const res = await fetch(`${apiHost}/api/pagos`);
            if (!res.ok) throw new Error("Error al cargar pagos");
            const data: Pago[] = await res.json();
            setPagos(data);
        } catch (err) {
            console.error(err);
            setError("No se pudieron cargar los pagos");
            throw err;
        }
    };

    const cargarClientes = async () => {
        try {
            const res = await fetch(`${apiHost}/api/clientes`);
            if (res.ok) {
                const data: Cliente[] = await res.json();
                setClientes(data);
            }
        } catch (error) {
            console.error("Error al cargar clientes:", error);
            throw error;
        }
    };

    const cargarMetodosPago = async () => {
        try {
            const res = await fetch(`${apiHost}/api/pagos/metodos`);
            if (res.ok) {
                const data: MetodoPago[] = await res.json();
                setMetodosPago(data);
            }
        } catch (error) {
            console.error("Error al cargar métodos de pago:", error);
            throw error;
        }
    };

    const cargarPagosPorMes = async (mes: number, anio: number) => {
        try {
            setLoading(true);
            const res = await fetch(`${apiHost}/api/pagos/mes/${mes}/${anio}`);
            if (!res.ok) throw new Error("Error al cargar pagos del mes");
            const data: Pago[] = await res.json();
            setPagos(data);
        } catch (err) {
            console.error(err);
            setError("No se pudieron cargar los pagos del mes");
        } finally {
            setLoading(false);
        }
    };

    const cargarPagosPorCliente = async (clienteId: number) => {
        try {
            setLoading(true);
            const res = await fetch(`${apiHost}/api/pagos/cliente/${clienteId}`);
            if (!res.ok) throw new Error("Error al cargar pagos del cliente");
            const data: Pago[] = await res.json();
            setPagos(data);
        } catch (err) {
            console.error(err);
            setError("No se pudieron cargar los pagos del cliente");
        } finally {
            setLoading(false);
        }
    };

    const aplicarFiltros = () => {
        const { cliente, metodo, mes, anio } = filtros;

        // Si hay filtros específicos, hacer llamadas a la API
        if (mes && anio) {
            cargarPagosPorMes(parseInt(mes), parseInt(anio));
            return;
        }

        if (cliente) {
            const clienteId = parseInt(cliente);
            if (!isNaN(clienteId)) {
                cargarPagosPorCliente(clienteId);
                return;
            }
        }

        // Si no hay filtros específicos, cargar todos los pagos
        cargarPagos();
    };

    const limpiarFiltros = () => {
        setFiltros({
            cliente: "",
            metodo: "",
            mes: "",
            anio: ""
        });
        cargarPagos();
    };

    const formatFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const formatMonto = (monto: number | undefined) => {
        const montoNumero = Number(monto);
        if (isNaN(montoNumero)) {
            return 'L. 0.00';
        }
        return new Intl.NumberFormat('es-HN', {
            style: 'currency',
            currency: 'HNL'
        }).format(montoNumero);
    };

    const getNombreCompletoCliente = (clienteId: number) => {
        const cliente = clientes.find(c => c.id === clienteId);
        if (!cliente) return `Cliente #${clienteId}`;
        return `${cliente.nombre}`.trim();
    };

    const getNombreMes = (mes: number) => {
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return meses[mes - 1] || mes.toString();
    };

    // Filtrar localmente por método si no se está filtrando por API
    const pagosFiltrados = pagos.filter(pago => {
        const { metodo } = filtros;
        if (!metodo) return true;

        const metodoPago = pago.metodo_pago_desc?.toLowerCase() || '';
        return metodoPago.includes(metodo.toLowerCase());
    });

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
            <div className="px-4 sm:px-6 lg:px-8 py-16">
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Cliente
                            </label>
                            <SearchSelect
                                clientes={clientes}
                                value={filtros.cliente}
                                onChange={(clienteId) => setFiltros({ ...filtros, cliente: clienteId })}
                                placeholder="Buscar cliente..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Método de Pago
                            </label>
                            <select
                                value={filtros.metodo}
                                onChange={(e) => setFiltros({ ...filtros, metodo: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="">Todos los métodos</option>
                                {metodosPago.map(metodo => (
                                    <option key={metodo.id} value={metodo.descripcion}>
                                        {metodo.descripcion}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Mes
                            </label>
                            <select
                                value={filtros.mes}
                                onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                            >
                                <option value="">Todos los meses</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                                    <option key={mes} value={mes}>
                                        {getNombreMes(mes)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Año
                            </label>
                            <input
                                type="number"
                                placeholder="2024"
                                value={filtros.anio}
                                onChange={(e) => setFiltros({ ...filtros, anio: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md"
                                min="2000"
                                max="2100"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={aplicarFiltros}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Aplicar Filtros
                        </button>
                        <button
                            onClick={limpiarFiltros}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <div className="text-sm text-slate-600">Clientes Únicos</div>
                        <div className="text-2xl font-bold text-purple-600">
                            {new Set(pagosFiltrados.map(p => p.cliente_id)).size}
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
                                        Mes Aplicado
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
                                        <td colSpan={8} className="px-4 py-4 text-center text-slate-500">
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
                                                {getNombreCompletoCliente(pago.cliente_id)}
                                            </td>
                                            <td className="px-4 py-4 text-sm font-semibold text-green-600">
                                                {formatMonto(pago.monto)}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-900">
                                                {formatFecha(pago.fecha_pago)}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-900">
                                                {getNombreMes(pago.mes_aplicado)} {pago.anio_aplicado}
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
                                                {pago.observacion || '-'}
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
