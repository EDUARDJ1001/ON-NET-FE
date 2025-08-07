"use client";

import { useState, useEffect } from "react";

interface Estado {
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
    estados: Estado[];
}

interface ClienteModalProps {
    cliente: Cliente;
    onClose: () => void;
    onClienteUpdated: () => void;
    apiHost: string;
}

const camposEditables: (keyof Omit<Cliente, "id" | "estados">)[] = [
    "nombre", "ip", "direccion", "telefono", "coordenadas", "plan_id"
];

const ClienteModal = ({ cliente, onClose, onClienteUpdated, apiHost }: ClienteModalProps) => {
    const [form, setForm] = useState<Cliente>(cliente);
    const [editando, setEditando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [registrandoPago, setRegistrandoPago] = useState(false);
    const [planes, setPlanes] = useState<{ id: number; nombre: string }[]>([]);
    const [pago, setPago] = useState({
        monto: "",
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
        observacion: ""
    });

    useEffect(() => {
        const fetchPlanes = async () => {
            try {
                const res = await fetch(`${apiHost}/api/planes`);
                const data = await res.json();
                setPlanes(data);
            } catch (error) {
                console.error("Error al cargar planes:", error);
            }
        };

        fetchPlanes();
    }, [apiHost]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGuardar = async () => {
        try {
            const res = await fetch(`${apiHost}/api/clientes/${cliente.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            });

            if (!res.ok) throw new Error("Error al actualizar cliente");

            setMensaje("✅ Cliente actualizado");
            setEditando(false);
            onClienteUpdated();
        } catch (error) {
            console.error(error);
            setMensaje("❌ No se pudo actualizar");
        }
    };

    const handlePagoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setPago({ ...pago, [e.target.name]: e.target.value });
    };

    const handleRegistrarPago = async () => {
        setMensaje("");
        try {
            const res = await fetch(`${apiHost}/api/pagos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cliente_id: cliente.id,
                    monto: parseFloat(pago.monto),
                    fecha_pago: `${pago.anio}-${String(pago.mes).padStart(2, '0')}-01`,
                    observacion: pago.observacion
                })
            });

            if (!res.ok) throw new Error("Error al registrar el pago");

            setMensaje("✅ Pago registrado y estado actualizado");
            setPago({
                monto: "",
                mes: new Date().getMonth() + 1,
                anio: new Date().getFullYear(),
                observacion: ""
            });
            setRegistrandoPago(false);
            onClienteUpdated();
        } catch (error) {
            console.error(error);
            setMensaje("❌ No se pudo registrar el pago");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-2xl p-6 rounded-lg shadow-lg relative">
                <button onClick={onClose} className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl">×</button>

                <h2 className="text-2xl font-bold text-orange-600 mb-4">Detalles del Cliente</h2>

                <div className="space-y-3">
                    {camposEditables.filter(c => c !== "plan_id").map((campo) => (
                        <input
                            key={campo}
                            type="text"
                            name={campo}
                            value={form[campo].toString()}
                            onChange={handleChange}
                            readOnly={!editando}
                            className={`w-full px-3 py-2 border rounded ${!editando ? "bg-gray-100" : ""}`}
                        />
                    ))}

                    {/* Select para plan_id */}
                    <label className="text-sm font-semibold text-slate-700 mt-3">Plan</label>
                    <select
                        name="plan_id"
                        value={form.plan_id}
                        onChange={handleChange}
                        disabled={!editando}
                        className={`w-full px-3 py-2 border rounded ${!editando ? "bg-gray-100 text-gray-500" : ""}`}
                    >
                        <option value="">Selecciona un plan</option>
                        {planes.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                                {plan.nombre}
                            </option>
                        ))}
                    </select>



                    <div className="mt-4">
                        <h3 className="font-semibold mb-2 text-sm">Estados de Pago:</h3>
                        {cliente.estados?.length > 0 ? (
                            <ul className="text-sm space-y-1">
                                {cliente.estados.map((e, i) => (
                                    <li key={i}>
                                        {e.mes}/{e.anio}:{" "}
                                        <span className={
                                            e.estado === "Pagado" ? "text-green-600 font-semibold" :
                                                e.estado === "Pagado Parcial" ? "text-yellow-600 font-semibold" :
                                                    "text-red-600 font-semibold"
                                        }>
                                            {e.estado}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 italic text-sm">Sin historial</p>
                        )}
                    </div>

                    {mensaje && (
                        <p className="text-center text-sm font-semibold text-orange-500">{mensaje}</p>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3 justify-between">
                        <button
                            onClick={() => setEditando(!editando)}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            {editando ? "Cancelar Edición" : "Editar Cliente"}
                        </button>

                        {editando && (
                            <button
                                onClick={handleGuardar}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                                Guardar Cambios
                            </button>
                        )}

                        <button
                            onClick={() => setRegistrandoPago(!registrandoPago)}
                            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                        >
                            {registrandoPago ? "Cancelar Pago" : "Registrar Pago"}
                        </button>
                    </div>

                    {registrandoPago && (
                        <div className="mt-4 border-t pt-4">
                            <h3 className="text-sm font-semibold text-slate-600 mb-2">Nuevo Pago</h3>

                            <input
                                type="number"
                                name="monto"
                                value={pago.monto}
                                onChange={handlePagoChange}
                                placeholder="Monto"
                                className="w-full px-3 py-2 border rounded mb-2"
                            />

                            <div className="flex gap-2 mb-2">
                                <select
                                    name="mes"
                                    value={pago.mes}
                                    onChange={(e) => setPago({ ...pago, mes: parseInt(e.target.value) })}
                                    className="w-1/2 px-3 py-2 border rounded"
                                >
                                    {[
                                        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                                    ].map((nombre, index) => (
                                        <option key={index} value={index + 1}>{nombre}</option>
                                    ))}
                                </select>

                                <select
                                    name="anio"
                                    value={pago.anio}
                                    onChange={(e) => setPago({ ...pago, anio: parseInt(e.target.value) })}
                                    className="w-1/2 px-3 py-2 border rounded"
                                >
                                    {Array.from({ length: 5 }).map((_, i) => {
                                        const anio = new Date().getFullYear() + i;
                                        return <option key={anio} value={anio}>{anio}</option>;
                                    })}
                                </select>
                            </div>


                            <textarea
                                name="observacion"
                                value={pago.observacion}
                                onChange={handlePagoChange}
                                placeholder="Observación"
                                className="w-full px-3 py-2 border rounded"
                            />

                            <button
                                onClick={handleRegistrarPago}
                                className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                                Guardar Pago
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClienteModal;
