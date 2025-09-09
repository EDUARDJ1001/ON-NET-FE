"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "./adminLayout";
import html2pdf from "html2pdf.js";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface EstadoMensual {
    id?: number;
    mes: number;
    anio: number;
    estado: string;
    total_pagado?: number;
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

interface MesSeleccionado {
    id?: number;
    mes: number;
    anio: number;
    seleccionado: boolean;
}

type FacturaTipo = "simple" | "multiple";

interface PagoMultipleItem {
    id: number;
    mes_aplicado: number;
    anio_aplicado: number;
    monto: number;
}

interface PagoMultipleResponse {
    message?: string;
    pagos?: PagoMultipleItem[];
    total_meses?: number;
    monto_por_mes?: number[] | number;
}

interface PagoSimpleResponse {
    message?: string;
    id: number;
    mes_aplicado: number;
    anio_aplicado: number;
}

interface FacturaData {
    numero?: string;
    fechaEmision: string;
    cliente: {
        id: number;
        nombre: string;
        telefono: string;
        direccion: string;
    };
    plan?: { nombre?: string; precio_mensual?: number };
    metodoPago: string;
    referencia?: string | null;
    observacion?: string | null;
    tipo: FacturaTipo;
    // simple:
    mes_aplicado?: number;
    anio_aplicado?: number;
    pagoId?: number;
    // multiple:
    meses?: { mes: number; anio: number }[];
    pagoIds?: number[];
    // totales:
    total: number;
    recibido: number;
    cambio: number;
}

/** ===== Tipos mínimos html2pdf (sin any) ===== */
interface Html2PdfOptions {
    margin?: number | [number, number] | [number, number, number, number];
    filename?: string;
    image?: { type?: "jpeg" | "png"; quality?: number };
    html2canvas?: {
        scale?: number;
        useCORS?: boolean;
        allowTaint?: boolean;
        backgroundColor?: string | null;
    };
    jsPDF?: {
        unit?: "pt" | "mm" | "cm" | "in";
        format?: string | number[];
        orientation?: "portrait" | "landscape";
    };
    pagebreak?: { mode?: Array<"css" | "legacy" | "avoid-all"> };
}
interface Html2PdfChain {
    set: (opt: Html2PdfOptions) => Html2PdfChain;
    from: (el: HTMLElement | string) => Html2PdfChain;
    save: () => Promise<void>;
    toPdf: () => Html2PdfChain;
    get: (key: "pdf") => Promise<{ save: (name?: string) => void }>;
    output: (type?: "blob" | "datauristring") => Promise<Blob | string>;
}
type Html2Pdf = () => Html2PdfChain;
const html2pdfTyped = html2pdf as unknown as Html2Pdf;
/** ============================================ */

const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmt = (n: number | undefined | null) =>
    new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function RegistrarPago() {
    const searchParams = useSearchParams();
    const clienteIdParam = searchParams.get("clienteId");

    const [clienteIdInput, setClienteIdInput] = useState<string>("");
    const [clienteId, setClienteId] = useState<number | null>(clienteIdParam ? Number(clienteIdParam) : null);
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [metodoId, setMetodoId] = useState<number | null>(null);
    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
    const [mesesPendientes, setMesesPendientes] = useState<EstadoMensual[]>([]);

    const now = new Date();
    const [fechaPago, setFechaPago] = useState(now.toISOString().split("T")[0]);
    const [montoTotal, setMontoTotal] = useState<number>(0);
    const [referencia, setReferencia] = useState("");
    const [observacion, setObservacion] = useState("");
    const [recibido, setRecibido] = useState<number>(0);
    const [mesesSeleccionados, setMesesSeleccionados] = useState<MesSeleccionado[]>([]);
    const [modoMultiplesMeses, setModoMultiplesMeses] = useState(false);

    const [loading, setLoading] = useState(false);
    const [loadingCliente, setLoadingCliente] = useState(false);
    const [loadingMetodos, setLoadingMetodos] = useState(false);
    const [loadingMeses, setLoadingMeses] = useState(false);
    const [error, setError] = useState<string>("");
    const [okMsg, setOkMsg] = useState<string>("");

    // PDF
    const [factura, setFactura] = useState<FacturaData | null>(null);
    const pdfRef = useRef<HTMLDivElement | null>(null);

    const mesesSeleccionadosCount = useMemo(
        () => mesesSeleccionados.filter((m) => m.seleccionado).length,
        [mesesSeleccionados]
    );

    const cambio = useMemo(() => {
        const c = (recibido || 0) - (montoTotal || 0);
        return isNaN(c) ? 0 : c;
    }, [recibido, montoTotal]);

    const montoPorMes = useMemo(() => {
        if (!mesesSeleccionadosCount) return 0;
        return Number(montoTotal) / mesesSeleccionadosCount;
    }, [montoTotal, mesesSeleccionadosCount]);

    const mesMasAntiguoPendiente = useMemo(() => {
        if (!mesesSeleccionados.length) return undefined;
        const copia = [...mesesSeleccionados];
        copia.sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
        return copia[0];
    }, [mesesSeleccionados]);

    // Métodos
    useEffect(() => {
        const fetchMetodosPago = async () => {
            setLoadingMetodos(true);
            try {
                const res = await fetch(`${apiHost}/api/pagos/metodos`);
                if (!res.ok) throw new Error("Error al cargar métodos de pago");
                const data: MetodoPago[] = await res.json();
                setMetodosPago(data);
                if (data.length > 0) setMetodoId(data[0].id);
            } catch (e) {
                console.error("Error cargando métodos de pago:", e);
                setError("No se pudieron cargar los métodos de pago.");
            } finally {
                setLoadingMetodos(false);
            }
        };
        fetchMetodosPago();
    }, []);

    // Cliente
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
                setMontoTotal(Number(data.plan.precio_mensual || 0));
            } else {
                const pr = await fetch(`${apiHost}/api/planes/${data.plan_id}`);
                if (pr.ok) {
                    const p: Plan = await pr.json();
                    setPlan(p);
                    setMontoTotal(Number(p.precio_mensual || 0));
                } else {
                    setPlan(null);
                    setMontoTotal(0);
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

    // Meses pendientes
    const fetchMesesPendientes = async (cid: number) => {
        setLoadingMeses(true);
        try {
            const res = await fetch(`${apiHost}/api/pagos/meses-pendientes/${cid}`);
            if (res.ok) {
                const data: EstadoMensual[] = await res.json();
                const hoy = new Date();
                const filtrados = data.filter((m) => new Date(m.anio, m.mes - 1, 1) <= hoy);
                filtrados.sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes));
                setMesesPendientes(filtrados);

                const mesesInit = filtrados.map((m, idx) => ({
                    id: m.id,
                    mes: m.mes,
                    anio: m.anio,
                    seleccionado: idx === 0,
                }));
                setMesesSeleccionados(mesesInit);
            }
        } catch (e) {
            console.error("Error al cargar meses pendientes:", e);
        } finally {
            setLoadingMeses(false);
        }
    };

    // Reacción a clienteId
    useEffect(() => {
        if (clienteId) {
            fetchCliente(clienteId);
            fetchMesesPendientes(clienteId);
        }
    }, [clienteId]);

    // Total automático (múltiple)
    useEffect(() => {
        if (modoMultiplesMeses && plan) {
            if (mesesSeleccionadosCount > 0) {
                setMontoTotal(Number(plan.precio_mensual) * mesesSeleccionadosCount);
            } else {
                setMontoTotal(0);
            }
        }
    }, [modoMultiplesMeses, plan, mesesSeleccionadosCount]);

    const handleCargarCliente = () => {
        if (clienteIdInput && !isNaN(Number(clienteIdInput))) {
            setClienteId(Number(clienteIdInput));
        }
    };

    const toggleMesSeleccionado = (key: string) => {
        setMesesSeleccionados((prev) =>
            prev.map((mes) => {
                const k = `${mes.mes}-${mes.anio}`;
                return k === key ? { ...mes, seleccionado: !mes.seleccionado } : mes;
            })
        );
    };
    const toggleTodosMeses = (sel: boolean) => {
        setMesesSeleccionados((prev) => prev.map((m) => ({ ...m, seleccionado: sel })));
    };
    const getMesKey = (mes: number, anio: number) => `${mes}-${anio}`;

    /** ===== Exportar PDF: clonar y renderizar visible ===== */
    const exportarPDF = async () => {
        const source = pdfRef.current;
        if (!source) return;

        // Clonar el contenido y hacerlo visible temporalmente
        const clone = source.cloneNode(true) as HTMLElement;
        // Asegurar que el clon tenga layout normal y fondo blanco
        Object.assign(clone.style, {
            position: "static",
            left: "auto",
            top: "auto",
            width: "800px",
            background: "white",
            opacity: "1",
            pointerEvents: "auto",
            zIndex: "99999",
        } as Partial<CSSStyleDeclaration>);

        document.body.appendChild(clone);

        // Esperar a que el clon se inserte y pinte
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => setTimeout(r, 60));

        const nombreCliente = cliente?.nombre ? cliente.nombre.replace(/\s+/g, "_") : "cliente";
        const filename = `factura_${nombreCliente}_${fechaPago}.pdf`;

        const opt: Html2PdfOptions = {
            margin: 0,                           // <— importante
            filename,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
            pagebreak: { mode: ["css"] },
        };


        try {
            await html2pdfTyped().set(opt).from(clone).toPdf().get("pdf").then((pdf) => pdf.save(filename));
        } catch (err) {
            console.error("html2pdf save() falló, probando fallback a blob:", err);
            try {
                const blob = (await html2pdfTyped().set(opt).from(clone).toPdf().output("blob")) as Blob;
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            } catch (err2) {
                console.error("Fallback blob también falló:", err2);
                setError("No se pudo generar el PDF. Revisa la consola para más detalles.");
            }
        } finally {
            // Limpiar el clon del DOM
            document.body.removeChild(clone);
        }
    };

    // Dispara export al tener factura renderizada
    useEffect(() => {
        if (factura && pdfRef.current) {
            const t = setTimeout(() => { void exportarPDF(); }, 80);
            return () => clearTimeout(t);
        }
    }, [factura]);

    /** ===== Submit ===== */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setOkMsg("");
        setError("");

        if (!clienteId) return setError("Selecciona o indica un cliente válido.");
        if (!metodoId) return setError("Selecciona un método de pago.");
        if (!montoTotal || montoTotal <= 0) return setError("El monto debe ser mayor a 0.");
        if (!fechaPago) return setError("La fecha de pago es requerida.");
        if (recibido < montoTotal) return setError("El recibido no puede ser menor que el monto total.");

        setLoading(true);
        try {
            const metodoDesc = metodosPago.find((m) => m.id === metodoId)?.descripcion || `Método #${metodoId}`;

            if (modoMultiplesMeses) {
                const months = mesesSeleccionados.filter((m) => m.seleccionado);
                if (months.length === 0) {
                    setError("Selecciona al menos un mes para aplicar el pago.");
                    setLoading(false);
                    return;
                }

                const body = {
                    cliente_id: clienteId,
                    monto_total: Number(montoTotal),
                    fecha_pago: fechaPago,
                    metodo_id: metodoId,
                    referencia: referencia || null,
                    observacion: observacion || null,
                    meses: months.map((m) =>
                        m.id ? { id: m.id, mes: m.mes, anio: m.anio } : { mes: m.mes, anio: m.anio }
                    ),
                };

                const res = await fetch(`${apiHost}/api/pagos/multiples`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const errorData: Partial<PagoMultipleResponse> = await res.json().catch(() => ({} as Partial<PagoMultipleResponse>));
                    throw new Error(errorData.message || "Error al registrar los pagos");
                }

                const data: PagoMultipleResponse = await res.json();

                const pagoIds: number[] | undefined = Array.isArray(data?.pagos)
                    ? data.pagos.map((p) => Number(p.id)).filter((v) => Number.isFinite(v))
                    : undefined;

                setOkMsg(`✅ Pagos registrados con éxito para ${months.length} mes(es).`);
                fetchMesesPendientes(clienteId);

                setFactura({
                    numero: (pagoIds && pagoIds.length ? pagoIds[0] : Date.now()).toString(),
                    fechaEmision: fechaPago,
                    cliente: {
                        id: clienteId,
                        nombre: cliente?.nombre || "",
                        telefono: cliente?.telefono || "",
                        direccion: cliente?.direccion || "",
                    },
                    plan: { nombre: plan?.nombre, precio_mensual: plan?.precio_mensual },
                    metodoPago: metodoDesc,
                    referencia: referencia || null,
                    observacion: observacion || null,
                    tipo: "multiple",
                    meses: months.map((m) => ({ mes: m.mes, anio: m.anio })),
                    pagoIds,
                    total: Number(montoTotal),
                    recibido: Number(recibido),
                    cambio: Number(cambio),
                });
            } else {
                const target = mesMasAntiguoPendiente;
                const fallbackMes = new Date().getMonth() + 1;
                const fallbackAnio = new Date().getFullYear();

                const body = {
                    cliente_id: clienteId,
                    monto: Number(montoTotal),
                    fecha_pago: fechaPago,
                    metodo_id: metodoId,
                    referencia: referencia || null,
                    observacion: observacion || null,
                    mes_aplicado: target?.mes ?? fallbackMes,
                    anio_aplicado: target?.anio ?? fallbackAnio,
                };

                const res = await fetch(`${apiHost}/api/pagos`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const errorData: Partial<PagoSimpleResponse> = await res.json().catch(() => ({} as Partial<PagoSimpleResponse>));
                    throw new Error((errorData as { message?: string })?.message || "Error al registrar el pago");
                }

                const result: PagoSimpleResponse = await res.json();

                setOkMsg(`✅ Pago registrado para ${monthNames[(result.mes_aplicado as number) - 1]} ${result.anio_aplicado}.`);
                fetchMesesPendientes(clienteId);

                setFactura({
                    numero: String(result.id ?? Date.now()),
                    fechaEmision: fechaPago,
                    cliente: {
                        id: clienteId,
                        nombre: cliente?.nombre || "",
                        telefono: cliente?.telefono || "",
                        direccion: cliente?.direccion || "",
                    },
                    plan: { nombre: plan?.nombre, precio_mensual: plan?.precio_mensual },
                    metodoPago: metodoDesc,
                    referencia: referencia || null,
                    observacion: observacion || null,
                    tipo: "simple",
                    mes_aplicado: Number(result.mes_aplicado),
                    anio_aplicado: Number(result.anio_aplicado),
                    pagoId: Number(result.id),
                    total: Number(montoTotal),
                    recibido: Number(recibido),
                    cambio: Number(cambio),
                });
            }

            // limpiar campos volátiles
            setReferencia("");
            setObservacion("");
            setRecibido(0);
            setMesesSeleccionados((prev) => prev.map((m, i) => ({ ...m, seleccionado: i === 0 })));
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "❌ No se pudo registrar el pago.");
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
                    {/* Selector de cliente */}
                    {!cliente && !loadingCliente && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">ID del Cliente</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Ej. 123"
                                    value={clienteIdInput}
                                    className="w-40 px-3 py-2 border rounded-md"
                                    onChange={(e) => setClienteIdInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
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
                            <button
                                type="button"
                                onClick={() => {
                                    setCliente(null);
                                    setClienteId(null);
                                    setClienteIdInput("");
                                    setPlan(null);
                                    setMontoTotal(0);
                                    setMesesSeleccionados([]);
                                    setModoMultiplesMeses(false);
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
                                        Precio mensual: <span className="font-semibold">L.{fmt(plan?.precio_mensual)}</span>
                                    </p>
                                </div>
                            </div>

                            {!modoMultiplesMeses && (
                                <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                                    {mesMasAntiguoPendiente ? (
                                        <>Este pago se acreditará al <b>mes más antiguo pendiente</b>: {monthNames[mesMasAntiguoPendiente.mes - 1]} {mesMasAntiguoPendiente.anio}.</>
                                    ) : (
                                        <>Este cliente no tiene meses pendientes hasta hoy. El pago se acreditará al <b>mes actual</b>.</>
                                    )}
                                </div>
                            )}

                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCliente(null);
                                        setClienteId(null);
                                        setClienteIdInput("");
                                        setPlan(null);
                                        setMontoTotal(0);
                                        setMesesSeleccionados([]);
                                        setModoMultiplesMeses(false);
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

                    {/* Selector de modo */}
                    {cliente && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Pago</label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        checked={!modoMultiplesMeses}
                                        onChange={() => setModoMultiplesMeses(false)}
                                        className="mr-2"
                                    />
                                    Pago de un mes
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        checked={modoMultiplesMeses}
                                        onChange={() => setModoMultiplesMeses(true)}
                                        className="mr-2"
                                    />
                                    Pago de múltiples meses
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de pago</label>
                            <input
                                type="date"
                                value={fechaPago}
                                onChange={(e) => setFechaPago(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Método de pago</label>
                            {loadingMetodos ? (
                                <select className="w-full px-3 py-2 border rounded-md bg-white" disabled>
                                    <option>Cargando métodos...</option>
                                </select>
                            ) : (
                                <select
                                    value={metodoId ?? ""}
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

                        {cliente && modoMultiplesMeses && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Meses a pagar ({mesesSeleccionadosCount} seleccionados)
                                </label>

                                {loadingMeses ? (
                                    <p className="text-slate-500">Cargando meses pendientes...</p>
                                ) : mesesSeleccionados.length === 0 ? (
                                    <p className="text-slate-500">No hay meses pendientes de pago.</p>
                                ) : (
                                    <>
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                type="button"
                                                onClick={() => toggleTodosMeses(true)}
                                                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                            >
                                                Seleccionar todos
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleTodosMeses(false)}
                                                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                            >
                                                Deseleccionar todos
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded">
                                            {mesesSeleccionados.map((mes) => (
                                                <label key={`${mes.mes}-${mes.anio}`} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={mes.seleccionado}
                                                        onChange={() => toggleMesSeleccionado(getMesKey(mes.mes, mes.anio))}
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm">
                                                        {monthNames[mes.mes - 1]} {mes.anio}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {modoMultiplesMeses ? "Monto Total" : "Monto a pagar"}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={montoTotal}
                                onChange={(e) => setMontoTotal(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                            {modoMultiplesMeses && mesesSeleccionadosCount > 0 && (
                                <p className="mt-1 text-xs text-slate-500">
                                    {mesesSeleccionadosCount} mes(es) × L.{fmt(montoPorMes)} = L.{fmt(montoTotal)}
                                </p>
                            )}
                            {!modoMultiplesMeses && (
                                <p className="mt-1 text-xs text-slate-500">Sugerido por plan: L.{fmt(plan?.precio_mensual)}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Recibido</label>
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={recibido}
                                onChange={(e) => setRecibido(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                            <p className={`mt-1 text-sm ${cambio < 0 ? "text-red-600" : "text-slate-700"}`}>
                                {cambio < 0 ? "Falta" : "Cambio"}: <span className="font-semibold">L.{fmt(Math.abs(cambio))}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Referencia (opcional)</label>
                            <input
                                type="text"
                                value={referencia}
                                onChange={(e) => setReferencia(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="N° transacción, voucher, etc."
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones (opcional)</label>
                            <textarea
                                rows={3}
                                value={observacion}
                                onChange={(e) => setObservacion(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="Notas adicionales sobre el pago..."
                            />
                        </div>

                        <div className="md:col-span-2 mt-2 flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    !clienteId ||
                                    !metodoId ||
                                    (modoMultiplesMeses && mesesSeleccionadosCount === 0) ||
                                    recibido < montoTotal
                                }
                                className="w-full md:w-auto px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {loading
                                    ? "Registrando..."
                                    : modoMultiplesMeses
                                        ? `Registrar ${mesesSeleccionadosCount} Pago(s)`
                                        : "Registrar Pago"}
                            </button>

                            {factura && (
                                <button
                                    type="button"
                                    onClick={() => { void exportarPDF(); }}
                                    className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    Descargar PDF
                                </button>
                            )}
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

            {/* ====== Plantilla PDF (2 páginas: Original + Copia) ====== */}
            {factura && (
                <div
                    ref={pdfRef}
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: "210mm",
                        background: "white",
                        opacity: 0,
                        pointerEvents: "none",
                    }}
                >
                    <style>{`
                    .pdf-wrap { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #0f172a; }
                    .pdf-page {
                        width: 190mm;
                        min-height: 277mm;   /* 297mm - 20mm padding */
                        padding: 10mm;
                        box-sizing: border-box;
                        margin: 0 auto;
                    }
                    .pdf-page + .pdf-page { page-break-before: always; }

                    /* --- Banner --- */
                    .pdf-banner { margin-bottom: 8px; }
                    .pdf-banner img {
                        display: block;
                        width: 100%;
                        height: auto;
                        max-height: 28mm;     /* limita el alto para no forzar salto */
                        object-fit: contain;  /* mantiene proporción sin recortar */
                    }

                    .pdf-header { display:flex; justify-content: space-between; align-items:center; margin-bottom: 12px; }
                    .pdf-brand { font-size: 18px; font-weight: 800; color: #ea580c; }
                    .pdf-title { font-size: 14px; font-weight: 700; color:#334155; }
                    .pdf-subtle { color:#475569; font-size:12px; }
                    .pdf-box { border:1px solid #e2e8f0; border-radius:12px; padding:12px; margin-bottom:12px; }
                    .pdf-table { width:100%; border-collapse: collapse; font-size:12px; }
                    .pdf-table th, .pdf-table td { border:1px solid #e2e8f0; padding:8px; text-align:left; }
                    .pdf-footer { display:flex; justify-content: space-between; margin-top: 18px; font-size:12px; color:#334155; }
                    .h-sep { height:8px; }
                    `}</style>

                    {["Factura original", "Copia"].map((etiqueta, idx) => (
                        <div className="pdf-wrap pdf-page" key={idx}>
                            {/* Banner superior */}
                            <div className="pdf-banner">
                                <img
                                    src="/img/ON-NET-BANNER.png"
                                    alt="ON-NET"
                                    crossOrigin="anonymous"
                                    className="h-48 w-auto"
                                />
                            </div>

                            {/* Encabezado con título y número */}
                            <div className="pdf-header">
                                <div className="pdf-brand">ONNET Gestión de Cobros</div>
                                <div>
                                    <div className="pdf-title">{etiqueta}</div>
                                    <div className="pdf-subtle">N.º {factura.numero || "—"}</div>
                                </div>
                            </div>

                            <div className="pdf-box">
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div className="pdf-title" style={{ marginBottom: 6 }}>Datos del cliente</div>
                                        <div className="pdf-subtle"><b>Nombre:</b> {factura.cliente.nombre || "—"}</div>
                                        <div className="pdf-subtle"><b>Teléfono:</b> {factura.cliente.telefono || "—"}</div>
                                        <div className="pdf-subtle"><b>Dirección:</b> {factura.cliente.direccion || "—"}</div>
                                    </div>
                                    <div style={{ width: 260 }}>
                                        <div className="pdf-title" style={{ marginBottom: 6 }}>Datos del cobro</div>
                                        <div className="pdf-subtle"><b>Fecha:</b> {factura.fechaEmision}</div>
                                        <div className="pdf-subtle"><b>Método:</b> {factura.metodoPago}</div>
                                        {factura.referencia && <div className="pdf-subtle"><b>Referencia:</b> {factura.referencia}</div>}
                                        {factura.plan?.nombre && (
                                            <div className="pdf-subtle">
                                                <b>Plan:</b> {factura.plan.nombre} {factura.plan?.precio_mensual ? `(L.${fmt(factura.plan.precio_mensual)}/mes)` : ""}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pdf-box">
                                <div className="pdf-title" style={{ marginBottom: 6 }}>Detalle del pago</div>
                                {factura.tipo === "multiple" ? (
                                    <table className="pdf-table">
                                        <thead>
                                            <tr><th>Mes</th><th>Año</th></tr>
                                        </thead>
                                        <tbody>
                                            {(factura.meses || []).map((m, i) => (
                                                <tr key={`${m.mes}-${m.anio}-${i}`}>
                                                    <td>{monthNames[m.mes - 1]}</td>
                                                    <td>{m.anio}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="pdf-table">
                                        <thead>
                                            <tr><th>Mes aplicado</th><th>Año</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>{monthNames[(factura.mes_aplicado || 1) - 1]}</td>
                                                <td>{factura.anio_aplicado}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                )}

                                <div className="h-sep" />
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 24 }}>
                                    <div className="pdf-subtle"><b>Total:</b> L.{fmt(factura.total)}</div>
                                    <div className="pdf-subtle"><b>Recibido:</b> L.{fmt(factura.recibido)}</div>
                                    <div className="pdf-subtle"><b>{factura.cambio < 0 ? "Falta" : "Cambio"}:</b> L.{fmt(Math.abs(factura.cambio))}</div>
                                </div>
                            </div>

                            {factura.observacion && (
                                <div className="pdf-box">
                                    <div className="pdf-title" style={{ marginBottom: 6 }}>Observaciones</div>
                                    <div className="pdf-subtle">{factura.observacion}</div>
                                </div>
                            )}

                            <div className="pdf-footer">
                                <div>Gracias por su pago.</div>
                                <div>Generado por ONNET · {new Date().toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}
