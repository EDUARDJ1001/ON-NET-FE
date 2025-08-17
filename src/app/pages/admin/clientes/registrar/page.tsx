"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";

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
        plan_id: ""
    });

    const [planes, setPlanes] = useState<Plan[]>([]);
    const [mensaje, setMensaje] = useState("");

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

        try {
            const res = await fetch(`${apiHost}/api/clientes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            });

            if (!res.ok) throw new Error("Error al registrar cliente");

            setMensaje("✅ Cliente registrado con éxito.");
            setForm({
                nombre: "",
                ip: "",
                direccion: "",
                coordenadas: "",
                telefono: "",
                plan_id: ""
            });

        } catch (error) {
            console.error(error);
            setMensaje("❌ Error al registrar el cliente.");
        }
    };

    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8 md:mt-16">
                <div className="w-full max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-orange-300">
                    <h1 className="text-3xl font-bold text-orange-500 mb-6 text-center">
                        Registrar Cliente
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text"
                            name="nombre"
                            placeholder="Nombre del cliente"
                            value={form.nombre}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-md"
                        />

                        <input
                            type="text"
                            name="ip"
                            placeholder="IP"
                            value={form.ip}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-md"
                        />

                        <input
                            type="text"
                            name="direccion"
                            placeholder="Dirección"
                            value={form.direccion}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-md"
                        />

                        <input
                            type="text"
                            name="coordenadas"
                            placeholder="Coordenadas (ej. 14.078,-87.213)"
                            value={form.coordenadas}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-md"
                        />

                        <input
                            type="text"
                            name="telefono"
                            placeholder="Teléfono"
                            value={form.telefono}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-md"
                        />

                        <select
                            name="plan_id"
                            value={form.plan_id}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border rounded-md"
                        >
                            <option value="">Selecciona un plan</option>
                            {planes.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.nombre} - L.{plan.precio_mensual}
                                </option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                        >
                            Registrar Cliente
                        </button>
                    </form>

                    {mensaje && (
                        <p className="mt-4 text-center text-sm font-semibold text-orange-600">
                            {mensaje}
                        </p>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default RegistrarCliente;
