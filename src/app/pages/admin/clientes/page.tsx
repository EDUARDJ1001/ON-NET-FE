"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import ClienteModal from "./components/clienteModal";

const apiHost = process.env.NEXT_PUBLIC_API_HOST;

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
    coordenadas: string;
    plan_id: number;
    estados: EstadoMensual[];
}

const GestionClientes = () => {
    const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [modalCliente, setModalCliente] = useState<Cliente | null>(null);
    const [anioActual] = useState(new Date().getFullYear());
    const [aniosCliente, setAniosCliente] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const obtenerOInicializarEstados = async (clienteId: number, anio: number): Promise<EstadoMensual[]> => {
        const response = await fetch(`${apiHost}/api/estado-mensual/cliente/${clienteId}/anio/${anio}`);
        const estados = await response.json();

        if (estados.length > 0) return estados;

        const nuevosEstados = await Promise.all(
            Array.from({ length: 12 }, async (_, i) => {
                const mes = i + 1;
                const res = await fetch(`${apiHost}/api/estado-mensual`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cliente_id: clienteId,
                        mes,
                        anio,
                        estado: "Pendiente"
                    })
                });
                return res.ok ? { mes, anio, estado: "Pendiente" } : null;
            })
        );

        return nuevosEstados.filter(Boolean) as EstadoMensual[];
    };

    const fetchClientes = async () => {
        try {
            const res = await fetch(`${apiHost}/api/clientes`);
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error("Respuesta inesperada del servidor");

            const anioActual = new Date().getFullYear();

            const clientesConEstados = await Promise.all(
                data.map(async (cliente: Cliente) => {
                    const estados = await obtenerOInicializarEstados(cliente.id, anioActual);
                    return { ...cliente, estados };
                })
            );

            setClientes(clientesConEstados);
        } catch (error) {
            console.error("Error al obtener clientes o estados:", error);
            setError("No se pudo cargar la lista de clientes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClientes();
    }, []);

    return (
        <AdminLayout>
            <div>
                <div className="flex justify-between items-center mb-4">
                    <Link
                        href="/pages/admin/clientes/registrar"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                        + Registrar Cliente
                    </Link>
                </div>

                <div className="w-full max-w-7xl mx-auto bg-white p-6 rounded-2xl shadow-xl border border-orange-300">
                    <h1 className="text-4xl font-extrabold text-orange-500 mb-4 text-center">
                        Gestión de Clientes
                    </h1>
                    <p className="text-lg text-slate-700 mb-6 text-center">
                        Consulta el estado de los clientes y gestiona sus pagos.
                    </p>

                    {loading ? (
                        <p className="text-center text-slate-500">Cargando clientes...</p>
                    ) : error ? (
                        <p className="text-center text-red-500">{error}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-auto w-full text-sm text-left border-collapse border border-gray-300">
                                <thead className="bg-orange-100">
                                    <tr>
                                        <th className="px-3 py-2 border">Nombre</th>
                                        <th className="px-3 py-2 border">Teléfono</th>
                                        <th className="px-3 py-2 border">Dirección</th>
                                        <th className="px-3 py-2 border">Estados de Pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientes.map((cliente) => (
                                        <tr key={cliente.id} className="hover:bg-orange-50">
                                            <td className="px-3 py-2 border font-medium text-orange-700">
                                                {cliente.nombre}
                                            </td>
                                            <td className="px-3 py-2 border">{cliente.telefono}</td>
                                            <td className="px-3 py-2 border">{cliente.direccion}</td>
                                            <td className="px-3 py-2 border">
                                                {cliente.estados && cliente.estados.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-medium text-slate-500">
                                                                Año: {aniosCliente[cliente.id] || anioActual}
                                                            </span>
                                                            <div className="flex gap-2 text-xs">
                                                                <button
                                                                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                                                    onClick={() =>
                                                                        setAniosCliente((prev) => ({
                                                                            ...prev,
                                                                            [cliente.id]: (prev[cliente.id] || anioActual) - 1,
                                                                        }))
                                                                    }
                                                                >
                                                                    ← Año anterior
                                                                </button>
                                                                <button
                                                                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                                                    onClick={() =>
                                                                        setAniosCliente((prev) => ({
                                                                            ...prev,
                                                                            [cliente.id]: (prev[cliente.id] || anioActual) + 1,
                                                                        }))
                                                                    }
                                                                >
                                                                    Año siguiente →
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <table className="table-auto border border-collapse text-center text-xs w-full">
                                                            <thead className="bg-slate-100">
                                                                <tr>
                                                                    {["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                                                                      "Jul", "Ago", "Sept", "Oct", "Nov", "Dic"].map((mes, idx) => (
                                                                        <th key={idx} className="px-1 py-1 border border-slate-300 min-w-[40px]">
                                                                            {mes}
                                                                        </th>
                                                                    ))}
                                                                    <th className="px-2 py-1 border border-slate-300">Acción</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    {Array.from({ length: 12 }, (_, i) => {
                                                                        const anio = aniosCliente[cliente.id] || anioActual;
                                                                        const estado = cliente.estados.find(e => e.mes === i + 1 && e.anio === anio);
                                                                        let color = "text-gray-400";
                                                                        if (estado?.estado === "Pagado") color = "text-green-600 font-semibold";
                                                                        else if (estado?.estado === "Pagado Parcial") color = "text-yellow-500 font-semibold";
                                                                        else if (estado?.estado === "Pendiente") color = "text-red-500 font-semibold";

                                                                        return (
                                                                            <td key={i} className={`border px-1 py-1 ${color}`}>
                                                                                {estado?.estado?.split(" ")[0] || "-"}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td className="border px-2 py-1 text-center">
                                                                        <button
                                                                            className="text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
                                                                            onClick={() => setModalCliente(cliente)}
                                                                        >
                                                                            VER MÁS
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin historial</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
