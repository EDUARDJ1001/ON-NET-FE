"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "./adminLayout";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface EstadoMensual {
    mes: number;
    anio: number;
    estado: string;
}

interface Plan {
    id: number;
    nombre: string;
    precio_mensual: number;
}

interface Cliente {
    id: number;
    nombre: string;
    telefono: string;
    direccion: string;
    coordenadas?: string;
    plan_id: number;
    plan?: Plan;
    estados?: EstadoMensual[];
}

interface MetodoPago {
    id: number;
    descripcion: string;
}

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const RegistrarPago = () => {
    const searchParams = useSearchParams();
    const clienteIdParam = searchParams.get("clienteId");

    const [clienteIdInput, setClienteIdInput] = useState<string>("");
    const [clienteId, setClienteId] = useState<number | null>(
        clienteIdParam ? Number(clienteIdParam) : null
    );
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [metodoId, setMetodoId] = useState<number | null>(null);
    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

    const now = new Date();
    const [anioAplicado, setAnioAplicado] = useState(now.getFullYear());
    const [mesAplicado, setMesAplicado] = useState(now.getMonth() + 1);
    const [fechaPago, setFechaPago] = useState(now.toISOString().split('T')[0]);

    const [monto, setMonto] = useState<number>(0);
    const [referencia, setReferencia] = useState("");
    const [observacion, setObservacion] = useState("");
    const [recibido, setRecibido] = useState<number>(0);

    const [loading, setLoading] = useState(false);
    const [loadingCliente, setLoadingCliente] = useState(false);
    const [loadingMetodos, setLoadingMetodos] = useState(false);
    const [error, setError] = useState<string>("");
    const [okMsg, setOkMsg] = useState<string>("");

    const cambio = useMemo(() => {
        const c = (recibido || 0) - (monto || 0);
        return isNaN(c) ? 0 : c;
    }, [recibido, monto]);

    // Validar si el mes aplicado es futuro
    const isMesFuturo = useMemo(() => {
        const selectedDate = new Date(anioAplicado, mesAplicado - 1, 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate > today;
    }, [mesAplicado, anioAplicado]);

    // Función para cargar cliente desde el input
    const handleCargarCliente = () => {
        if (clienteIdInput && !isNaN(Number(clienteIdInput))) {
            setClienteId(Number(clienteIdInput));
        }
    };

    // Cargar métodos de pago
    useEffect(() => {
        const fetchMetodosPago = async () => {
            setLoadingMetodos(true);
            try {
                const res = await fetch(`${apiHost}/api/pagos/metodos`);
                if (res.ok) {
                    const data: MetodoPago[] = await res.json();
                    setMetodosPago(data);
                    if (data.length > 0) {
                        setMetodoId(data[0].id);
                    }
                } else {
                    throw new Error("Error al cargar métodos de pago");
                }
            } catch (error) {
                console.error("Error cargando métodos de pago:", error);
                setError("No se pudieron cargar los métodos de pago");
            } finally {
                setLoadingMetodos(false);
            }
        };

        fetchMetodosPago();
    }, []);

    // Cargar cliente
    const fetchCliente = async (id: number) => {
        setLoadingCliente(true);
        setError("");
        try {
            const res = await fetch(`${apiHost}/api/clientes/${id}`);
            if (!res.ok) throw new Error("No se pudo obtener el cliente");
            const data: Cliente = await res.json();
            setCliente(data);

            if (data.plan && typeof data.plan.precio_mensual === "number") {
                setPlan(data.plan);
                setMonto(Number(data.plan.precio_mensual || 0));
            } else {
                const pr = await fetch(`${apiHost}/api/planes/${data.plan_id}`);
                if (pr.ok) {
                    const p: Plan = await pr.json();
                    setPlan(p);
                    setMonto(Number(p.precio_mensual || 0));
                } else {
                    setPlan(null);
                    setMonto(0);
                }
            }
        } catch (e) {
            console.error(e);
            setError("No se pudo cargar la información del cliente/plan.");
            setCliente(null);
        } finally {
            setLoadingCliente(false);
        }
    };

    useEffect(() => {
        if (clienteId) {
            fetchCliente(clienteId);
        }
    }, [clienteId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setOkMsg("");
        setError("");

        if (!clienteId) {
            setError("Selecciona o indica un cliente válido.");
            return;
        }
        if (!metodoId) {
            setError("Selecciona un método de pago.");
            return;
        }
        if (!monto || monto <= 0) {
            setError("El monto debe ser mayor a 0.");
            return;
        }
        if (mesAplicado < 1 || mesAplicado > 12) {
            setError("Selecciona un mes válido.");
            return;
        }
        if (!anioAplicado || anioAplicado < 2000) {
            setError("Selecciona un año válido.");
            return;
        }
        if (isMesFuturo) {
            setError("No se pueden registrar pagos para meses futuros.");
            return;
        }
        if (!fechaPago) {
            setError("La fecha de pago es requerida.");
            return;
        }

        setLoading(true);
        try {
            const body = {
                cliente_id: clienteId,
                monto: Number(monto),
                fecha_pago: fechaPago,
                metodo_id: metodoId,
                referencia: referencia || null,
                observacion: observacion || null,
                mes_aplicado: mesAplicado,
                anio_aplicado: anioAplicado
            };

            const res = await fetch(`${apiHost}/api/pagos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Error al registrar el pago");
            }

            const result = await res.json();

            setOkMsg(`✅ Pago registrado con éxito para ${monthNames[mesAplicado - 1]} ${anioAplicado}.`);
            setReferencia("");
            setObservacion("");
            setRecibido(0);

            // Opcional: resetear a mes actual después de éxito
            const now = new Date();
            setMesAplicado(now.getMonth() + 1);
            setAnioAplicado(now.getFullYear());
            setFechaPago(now.toISOString().split('T')[0]);

        } catch (err) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("❌ No se pudo registrar el pago.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-orange-600">Registrar Pago</h1>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/pages/admin/clientes"
                            className="inline-flex items-center px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm"
                        >
                            ← Volver a Clientes
                        </Link>
                    </div>
                </div>

                <div className="w-full bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-xl border border-orange-300">
                    {/* Selector de cliente si no vino en query */}
                    {!cliente && !loadingCliente && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                ID del Cliente
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Ej. 123"
                                    value={clienteIdInput}
                                    className="w-40 px-3 py-2 border rounded-md"
                                    onChange={(e) => setClienteIdInput(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleCargarCliente();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleCargarCliente}
                                    disabled={!clienteIdInput}
                                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    Cargar Cliente
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                También puedes abrir esta página como <code>?clienteId=123</code>
                            </p>
                        </div>
                    )}

                    {/* Info cliente + plan */}
                    {loadingCliente ? (
                        <p className="text-slate-500 text-sm">Cargando cliente...</p>
                    ) : cliente ? (
                        <div className="rounded-lg border border-slate-200 p-3 sm:p-4 mb-6 relative">
                            {/* Botón para cambiar de cliente */}
                            <button
                                type="button"
                                onClick={() => {
                                    setCliente(null);
                                    setClienteId(null);
                                    setClienteIdInput("");
                                    setPlan(null);
                                    setMonto(0);
                                }}
                                className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600"
                                title="Cambiar cliente"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <p className="text-sm text-slate-500">Cliente</p>
                                    <p className="font-semibold">{cliente.nombre}</p>
                                    <p className="text-sm text-slate-600">{cliente.telefono}</p>
                                    <p className="text-sm text-slate-600 break-words">{cliente.direccion}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Plan</p>
                                    <p className="font-semibold">{plan?.nombre || "—"}</p>
                                    <p className="text-sm">
                                        Precio mensual:{" "}
                                        <span className="font-semibold">
                                            L.{plan?.precio_mensual?.toLocaleString?.() ?? "0"}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Botón secundario para cambiar cliente */}
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCliente(null);
                                        setClienteId(null);
                                        setClienteIdInput("");
                                        setPlan(null);
                                        setMonto(0);
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Cambiar de cliente
                                </button>
                            </div>
                        </div>
                    ) : clienteId ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
                            <p className="text-red-600 font-medium mb-2">No se pudo cargar el cliente con ID: {clienteId}</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setClienteId(null);
                                    setClienteIdInput("");
                                    setCliente(null);
                                }}
                                className="text-sm text-red-600 hover:text-red-800"
                            >
                                Intentar con otro ID
                            </button>
                        </div>
                    ) : null}

                    {/* Formulario de pago */}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fecha de pago */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Fecha de pago
                            </label>
                            <input
                                type="date"
                                value={fechaPago}
                                onChange={(e) => setFechaPago(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>

                        {/* Método de pago */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Método de pago
                            </label>
                            {loadingMetodos ? (
                                <select className="w-full px-3 py-2 border rounded-md bg-white" disabled>
                                    <option>Cargando métodos...</option>
                                </select>
                            ) : (
                                <select
                                    value={metodoId || ""}
                                    onChange={(e) => setMetodoId(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-md bg-white"
                                    required
                                >
                                    <option value="">Seleccionar método</option>
                                    {metodosPago.map((metodo) => (
                                        <option key={metodo.id} value={metodo.id}>
                                            {metodo.descripcion}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Mes/Año aplicado */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Mes a aplicar
                            </label>
                            <select
                                value={mesAplicado}
                                onChange={(e) => setMesAplicado(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md bg-white"
                            >
                                {monthNames.map((m, idx) => (
                                    <option key={m} value={idx + 1}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                            {isMesFuturo && (
                                <p className="mt-1 text-xs text-red-600">
                                    ⚠️ Mes futuro seleccionado
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Año a aplicar
                            </label>
                            <input
                                type="number"
                                value={anioAplicado}
                                onChange={(e) => setAnioAplicado(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md"
                                min={2000}
                                max={2099}
                            />
                            {isMesFuturo && (
                                <p className="mt-1 text-xs text-red-600">
                                    ⚠️ No se permiten pagos futuros
                                </p>
                            )}
                        </div>

                        {/* Monto / Recibido / Cambio */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Monto a pagar
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={monto}
                                onChange={(e) => setMonto(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Sugerido por plan: L.{plan?.precio_mensual ?? 0}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Recibido
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={recibido}
                                onChange={(e) => setRecibido(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                            <p className={`mt-1 text-sm ${cambio < 0 ? "text-red-600" : "text-slate-700"}`}>
                                {cambio < 0 ? "Falta" : "Cambio"}:{" "}
                                <span className="font-semibold">L.{Math.abs(cambio).toFixed(2)}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Referencia (opcional)
                            </label>
                            <input
                                type="text"
                                value={referencia}
                                onChange={(e) => setReferencia(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="N° transacción, voucher, etc."
                            />
                        </div>

                        {/* Observaciones */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Observaciones (opcional)
                            </label>
                            <textarea
                                rows={3}
                                value={observacion}
                                onChange={(e) => setObservacion(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="Notas adicionales sobre el pago..."
                            />
                        </div>

                        <div className="md:col-span-2 mt-2">
                            <button
                                type="submit"
                                disabled={loading || !clienteId || !metodoId || isMesFuturo}
                                className="w-full md:w-auto px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {loading ? "Registrando..." : "Registrar Pago"}
                            </button>
                        </div>
                    </form>

                    {(okMsg || error) && (
                        <div className="mt-4 text-center">
                            {okMsg && <p className="text-green-600 font-semibold">{okMsg}</p>}
                            {error && <p className="text-red-600 font-semibold">{error}</p>}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default RegistrarPago;
