"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";

interface Plan {
    id: number;
    nombre: string;
    precio_mensual: number;
}

const apiHost = process.env.NEXT_PUBLIC_API_HOST;

const RegistrarCliente = () => {
    const [form, setForm] = useState({
        nombre: "",
        ip: "",
        direccion: "",
        coordenadas: "",
        telefono: "",
        pass_onu: "",
        plan_id: "",
        fecha_pago: "",
        fecha_instalacion: new Date().toISOString().split('T')[0] // Fecha actual por defecto
    });

    const [planes, setPlanes] = useState<Plan[]>([]);
    const [mensaje, setMensaje] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchPlanes = async () => {
            try {
                const res = await fetch(`${apiHost}/api/planes`);
                const data = await res.json();
                setPlanes(data);
            } catch (error) {
                console.error("Error al obtener planes:", error);
            }
        };

        fetchPlanes();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensaje("");
        setLoading(true);

        try {
            // Validaciones básicas
            if (!form.nombre || !form.direccion || !form.telefono || !form.pass_onu || !form.plan_id) {
                throw new Error("Por favor complete todos los campos requeridos");
            }

            const res = await fetch(`${apiHost}/api/clientes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Error al registrar cliente");
            }

            setMensaje("✅ Cliente registrado con éxito.");
            setForm({
                nombre: "",
                ip: "",
                direccion: "",
                coordenadas: "",
                telefono: "",
                pass_onu: "",
                plan_id: "",
                fecha_pago: "",
                fecha_instalacion: new Date().toISOString().split('T')[0]
            });

        } catch (error) {
            console.error(error);
            setMensaje(error instanceof Error ? error.message : "❌ Error al registrar el cliente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-orange-600">Registrar Nuevo Cliente</h1>
                        <p className="text-slate-600 mt-1">Complete la información del nuevo cliente</p>
                    </div>
                    <Link
                        href="/pages/admin/clientes"
                        className="inline-flex items-center px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm"
                    >
                        ← Volver a Clientes
                    </Link>
                </div>

                <div className="w-full max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-orange-300">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Campos en grid responsive */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Nombre */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nombre del cliente *
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    placeholder="Ej: Juan Pérez"
                                    value={form.nombre}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Teléfono *
                                </label>
                                <input
                                    type="text"
                                    name="telefono"
                                    placeholder="Ej: 1234-5678"
                                    value={form.telefono}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>

                            {/* Fecha de instalación */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Fecha de instalación *
                                </label>
                                <input
                                    type="date"
                                    name="fecha_instalacion"
                                    value={form.fecha_instalacion}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Fecha cuando inició el servicio
                                </p>
                            </div>

                            {/* Fecha de Pago */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Fecha de Pago *
                                </label>
                                <input
                                    type="text"
                                    name="fecha_pago"
                                    placeholder="Coloque 1 o 15 según el día de pago"
                                    value={form.fecha_pago}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Fecha que corresponde al pago mensual
                                </p>
                            </div>

                            {/* Dirección */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Dirección completa *
                                </label>
                                <input
                                    type="text"
                                    name="direccion"
                                    placeholder="Ej: Colonia, calle, número de casa"
                                    value={form.direccion}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>

                            {/* Coordenadas */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Coordenadas (opcional)
                                </label>
                                <input
                                    type="text"
                                    name="coordenadas"
                                    placeholder="Ej: 14.078,-87.213"
                                    value={form.coordenadas}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Latitud,Longitud para GPS
                                </p>
                            </div>

                            {/* IP */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    IP (opcional)
                                </label>
                                <input
                                    type="text"
                                    name="ip"
                                    placeholder="Ej: 192.168.1.100"
                                    value={form.ip}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>

                            {/* Contraseña ONU */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Contraseña ONU *
                                </label>
                                <input
                                    type="text"
                                    name="pass_onu"
                                    placeholder="Contraseña del equipo"
                                    value={form.pass_onu}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>

                            {/* Plan */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Plan de servicio *
                                </label>
                                <select
                                    name="plan_id"
                                    value={form.plan_id}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border rounded-md"
                                >
                                    <option value="">Selecciona un plan</option>
                                    {planes.map((plan) => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.nombre} - L.{plan.precio_mensual.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Botón de submit */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {loading ? "Registrando..." : "Registrar Cliente"}
                            </button>
                        </div>
                    </form>

                    {mensaje && (
                        <div className={`mt-4 p-3 rounded-md text-center ${
                            mensaje.includes("✅") 
                                ? "bg-green-100 text-green-700 border border-green-200" 
                                : "bg-red-100 text-red-700 border border-red-200"
                        }`}>
                            <p className="font-medium">{mensaje}</p>
                            {mensaje.includes("✅") && (
                                <p className="text-sm mt-1">
                                    Se crearán automáticamente los estados de pago desde la fecha de instalación.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Información adicional */}
                    <div className="mt-6 p-4 bg-slate-50 rounded-md">
                        <h3 className="font-medium text-slate-700 mb-2">📋 Información importante</h3>
                        <ul className="text-sm text-slate-600 space-y-1">
                            <li>• Los campos marcados con * son obligatorios</li>
                            <li>• La fecha de instalación determina desde cuándo se generarán los estados de pago</li>
                            <li>• Los estados mensuales se crearán automáticamente desde la fecha de instalación</li>
                            <li>• El cliente quedará con estado Activo automáticamente</li>
                        </ul>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default RegistrarCliente;
