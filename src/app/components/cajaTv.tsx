"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import html2pdf from "html2pdf.js";

const apiHost = process.env.NEXT_PUBLIC_API_HOST || "";

/* ========== Tipos ========== */

type Moneda = "HNL" | "USD";

interface ClienteOption {
    id: number;
    nombre: string;
}

interface ClienteTv {
    id: number;
    nombre: string;
    usuario: string;
    telefono: string | null;
    direccion: string | null;
    plantv_id: number;
    plan_nombre?: string;
    plan_precio_mensual?: number | null;
    fecha_inicio: string;
    fecha_expiracion: string;
    moneda: Moneda;
}

interface MetodoPago {
    id: number;
    descripcion: string;
}

interface PagoFormState {
    fecha_pago: string;
    nueva_fecha_expiracion: string;
    monto: string;
    recibido: string;
    referencia: string;
    observacion: string;
    metodo_id: string;
}

interface ReciboData {
    cliente: ClienteTv;
    fecha_pago: string;
    fecha_expiracion_anterior: string;
    nueva_fecha_expiracion: string;
    monto: number;
    recibido: number;
    cambio: number;
    referencia?: string;
    observacion?: string;
    metodo_nombre?: string;
}

interface EstadoMensualTv {
    id?: number;
    mes: number;
    anio: number;
    estado: string;
}

/* ========== Utilidades ========== */

const getFechaLocal = (): string => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
};

/**
 * No tocar la fecha, mandarla tal cual "YYYY-MM-DD"
 */
const formatFechaParaBackend = (fecha: string): string => {
    return fecha;
};

const formatMoney = (val: number): string =>
    new Intl.NumberFormat("es-HN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(val);

/**
 * Compara fechas "YYYY-MM-DD" sin usar objetos Date.
 * Devuelve true si nueva > anterior.
 */
const esFechaMayor = (nueva: string, anterior: string): boolean => {
    if (!nueva || !anterior) return false;
    return nueva > anterior;
};

/**
 * Calcula los meses (mes, anio) entre la fecha de expiración anterior y la nueva.
 * SERVICIO POR ADELANTADO: Incluye desde el mes de la fecha de expiración anterior 
 * hasta el mes ANTERIOR a la nueva fecha de expiración.
 */
const calcularMesesEntreFechas = (
    fechaExpAnterior: string,
    nuevaFechaExp: string
): { mes: number; anio: number }[] => {
    const res: { mes: number; anio: number }[] = [];

    const [y1, m1] = fechaExpAnterior.split("-").map((p) => parseInt(p, 10));
    const [y2, m2] = nuevaFechaExp.split("-").map((p) => parseInt(p, 10));

    if (!y1 || !m1 || !y2 || !m2) return res;

    // Empezar en el mes de la fecha de expiración anterior
    const start = new Date(y1, m1 - 1, 1);

    // Terminar en el mes ANTERIOR a la nueva fecha de expiración (servicio por adelantado)
    const end = new Date(y2, m2 - 1, 1);
    end.setMonth(end.getMonth() - 1);

    const current = new Date(start);
    while (current <= end) {
        res.push({
            mes: current.getMonth() + 1,
            anio: current.getFullYear(),
        });
        current.setMonth(current.getMonth() + 1);
    }

    return res;
};

/**
 * Actualiza los estados mensuales después del pago
 */
const actualizarEstadosMensuales = async (
    clientetv_id: number,
    mesesPagados: { mes: number; anio: number }[]
): Promise<void> => {
    try {
        const aniosUnicos = [...new Set(mesesPagados.map((m) => m.anio))];

        for (const anio of aniosUnicos) {
            const res = await fetch(
                `${apiHost}/api/estado-mensual-tv/cliente/${clientetv_id}/anio/${anio}`
            );

            if (!res.ok) {
                console.warn(
                    `No se pudieron obtener los estados mensuales para el año ${anio}`
                );
                continue;
            }

            const estadosActuales = (await res.json()) as EstadoMensualTv[];
            const mesesDeEsteAnio = mesesPagados.filter((m) => m.anio === anio);

            for (const mesPagado of mesesDeEsteAnio) {
                const estadoExistente = estadosActuales.find(
                    (e) => e.mes === mesPagado.mes && e.anio === mesPagado.anio
                );

                if (estadoExistente && estadoExistente.id) {
                    await fetch(
                        `${apiHost}/api/estado-mensual-tv/${estadoExistente.id}`,
                        {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ estado: "Pagado" }),
                        }
                    );
                }
            }
        }
    } catch (error) {
        console.error("Error actualizando estados mensuales:", error);
    }
};

/* ========== SearchSelect sencillo ========== */

interface ClienteSearchSelectProps {
    clientes: ClienteOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

const ClienteSearchSelect = ({
    clientes,
    value,
    onChange,
    disabled,
}: ClienteSearchSelectProps) => {
    const [query, setQuery] = useState<string>("");

    useEffect(() => {
        setQuery("");
    }, [value]);

    const filtrados = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return clientes.slice(0, 20);
        return clientes
            .filter((c) => {
                const idMatch = String(c.id).includes(q);
                const nameMatch = c.nombre.toLowerCase().includes(q);
                return idMatch || nameMatch;
            })
            .slice(0, 20);
    }, [clientes, query]);

    const selectedLabel =
        value && clientes.find((c) => c.id === Number(value))?.nombre;

    return (
        <div className="space-y-2">
            <input
                type="text"
                disabled={disabled}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escriba nombre o ID..."
                className="w-full px-3 py-2 border rounded-md text-sm"
            />
            {selectedLabel && (
                <p className="text-xs text-slate-600">
                    Cliente seleccionado:{" "}
                    <span className="font-semibold">{selectedLabel}</span> (ID {value})
                </p>
            )}
            {query && filtrados.length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded-md bg-white shadow-sm text-sm">
                    {filtrados.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 hover:bg-orange-50"
                            onClick={() => {
                                onChange(String(c.id));
                                setQuery("");
                            }}
                        >
                            <span className="font-medium">{c.nombre}</span>{" "}
                            <span className="text-xs text-slate-500">#{c.id}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ========== Componente principal ========== */

const RegistrarPagoTv = () => {
    const [clientesCatalogo, setClientesCatalogo] = useState<ClienteOption[]>([]);
    const [clienteSeleccionado, setClienteSeleccionado] =
        useState<ClienteTv | null>(null);
    const [clienteIdSeleccionado, setClienteIdSeleccionado] =
        useState<string>("");

    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
    const [loadingMetodos, setLoadingMetodos] = useState<boolean>(false);

    const [loadingCatalogo, setLoadingCatalogo] = useState<boolean>(false);
    const [loadingCliente, setLoadingCliente] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [generandoPdf, setGenerandoPdf] = useState<boolean>(false);

    const [mensajeOk, setMensajeOk] = useState<string>("");
    const [mensajeError, setMensajeError] = useState<string>("");

    const [formPago, setFormPago] = useState<PagoFormState>({
        fecha_pago: getFechaLocal(),
        nueva_fecha_expiracion: "",
        monto: "",
        recibido: "",
        referencia: "",
        observacion: "",
        metodo_id: "",
    });

    const [recibo, setRecibo] = useState<ReciboData | null>(null);

    /* ----- cargar catálogo de clientes y métodos de pago ----- */
    useEffect(() => {
        const cargar = async () => {
            setLoadingCatalogo(true);
            setLoadingMetodos(true);
            try {
                // Clientes TV
                const resClientes = await fetch(`${apiHost}/api/tv/clientes`);
                if (!resClientes.ok)
                    throw new Error("No se pudo cargar el catálogo de clientes");

                const dataClientes = (await resClientes.json()) as ClienteTv[];
                const opciones: ClienteOption[] = dataClientes.map((c) => ({
                    id: c.id,
                    nombre: c.nombre,
                }));
                setClientesCatalogo(opciones);

                // Métodos de pago
                const resMetodos = await fetch(`${apiHost}/api/metodos-pago`);
                if (resMetodos.ok) {
                    const dataMetodos = (await resMetodos.json()) as MetodoPago[];
                    setMetodosPago(dataMetodos);
                } else {
                    console.error("No se pudieron cargar los métodos de pago");
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingCatalogo(false);
                setLoadingMetodos(false);
            }
        };

        void cargar();
    }, []);

    /* ----- cargar un cliente específico ----- */
    const cargarCliente = async (id: number) => {
        setLoadingCliente(true);
        setMensajeError("");
        setMensajeOk("");
        try {
            const res = await fetch(`${apiHost}/api/tv/clientes/${id}`);
            if (!res.ok) throw new Error("No se pudo obtener el cliente");

            const data = (await res.json()) as ClienteTv;

            setClienteSeleccionado(data);
            setFormPago((prev) => ({
                ...prev,
                nueva_fecha_expiracion: data.fecha_expiracion,
            }));
            setRecibo(null);
        } catch (error) {
            console.error(error);
            setClienteSeleccionado(null);
            setMensajeError("No se pudo cargar la información del cliente.");
        } finally {
            setLoadingCliente(false);
        }
    };

    const handleSeleccionCliente = (value: string) => {
        setClienteIdSeleccionado(value);
        const id = Number(value);
        if (!Number.isNaN(id)) {
            void cargarCliente(id);
        } else {
            setClienteSeleccionado(null);
        }
    };

    /* ----- handlers formulario ----- */

    const handleChangePago = (
        e:
            | React.ChangeEvent<HTMLInputElement>
            | React.ChangeEvent<HTMLTextAreaElement>
            | React.ChangeEvent<HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormPago((prev) => ({ ...prev, [name]: value }));
    };

    const montoNumero = useMemo(
        () => (formPago.monto ? Number(formPago.monto) : 0),
        [formPago.monto]
    );
    const recibidoNumero = useMemo(
        () => (formPago.recibido ? Number(formPago.recibido) : 0),
        [formPago.recibido]
    );
    const cambio = useMemo(
        () => (recibidoNumero || 0) - (montoNumero || 0),
        [recibidoNumero, montoNumero]
    );

    /* ----- PDF ----- */

    const exportarPdf = async () => {
        if (!recibo) return;

        setGenerandoPdf(true);

        try {
            const contenidoHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {
                        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
                        color: #0f172a;
                        margin: 0;
                        padding: 0;
                    }
                    .pdf-page {
                        width: 190mm;
                        min-height: 277mm;
                        padding: 10mm;
                        margin: 0 auto;
                        box-sizing: border-box;
                    }
                    .pdf-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 12px;
                        border-bottom: 2px solid #ea580c;
                        padding-bottom: 10px;
                    }
                    .pdf-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: #ea580c;
                    }
                    .pdf-box {
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        padding: 10px;
                        margin-bottom: 10px;
                        font-size: 12px;
                    }
                    .pdf-label {
                        color: #64748b;
                        font-size: 11px;
                        text-transform: uppercase;
                        font-weight: 600;
                        margin-bottom: 5px;
                    }
                    .pdf-value {
                        font-weight: 600;
                        color: #0f172a;
                    }
                </style>
            </head>
            <body>
                <div class="pdf-page">
                    <div class="pdf-header">
                        <div>
                            <div class="pdf-title">ON-NET Gestión de Cobros · TV</div>
                            <div style="font-size: 12px; color: #64748b;">Recibo de pago / renovación</div>
                        </div>
                        <div style="text-align: right; font-size: 12px; color: #64748b;">
                            <div>Fecha de pago: ${recibo.fecha_pago}</div>
                        </div>
                    </div>

                    <div class="pdf-box">
                        <div class="pdf-label">Cliente</div>
                        <div class="pdf-value">${recibo.cliente.nombre}</div>
                        <div>Usuario: ${recibo.cliente.usuario}</div>
                        <div>Teléfono: ${recibo.cliente.telefono || "—"}</div>
                        <div>Dirección: ${recibo.cliente.direccion || "—"}</div>
                    </div>
                    
                   <div class="pdf-box">
                        <div class="pdf-label">Servicio TV</div>
                        <div>Plan: ${recibo.cliente.plan_nombre || "—"}</div>
                        <div>Expiración anterior: <span class="pdf-value">${recibo.fecha_expiracion_anterior.split('T')[0]}</span></div>
                        <div>Nueva expiración: <span class="pdf-value">${recibo.nueva_fecha_expiracion.split('T')[0]}</span></div>
                    </div>

                    <div class="pdf-box">
                        <div class="pdf-label">Detalle del pago</div>
                        <div>Método de pago: ${recibo.metodo_nombre || "—"}</div>
                        <div>Monto pagado: L.${formatMoney(recibo.monto)}</div>
                        <div>Recibido: L.${formatMoney(recibo.recibido)}</div>
                        <div>${recibo.cambio < 0 ? "Falta" : "Cambio"}: L.${formatMoney(Math.abs(recibo.cambio))}</div>
                        ${recibo.referencia ? `<div>Referencia: ${recibo.referencia}</div>` : ""}
                    </div>

                    ${recibo.observacion
                    ? `
                    <div class="pdf-box">
                        <div class="pdf-label">Observaciones</div>
                        <div>${recibo.observacion}</div>
                    </div>
                    `
                    : ""
                }

                    <div style="margin-top: 18px; font-size: 11px; color: #64748b; text-align: center;">
                        <div>Gracias por su pago.</div>
                        <div>Generado automáticamente por el sistema ON-NET.</div>
                    </div>
                </div>
            </body>
            </html>
        `;

            const nombre = recibo.cliente.nombre.replace(/\s+/g, "_");
            const filename = `recibo_tv_${nombre}_${recibo.fecha_pago}.pdf`;

            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = contenidoHtml;
            document.body.appendChild(tempDiv);

            await html2pdf()
                .set({
                    margin: 10,
                    filename,
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                    },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                })
                .from(tempDiv)
                .save();

            document.body.removeChild(tempDiv);
        } catch (error) {
            console.error("Error generando PDF:", error);
            setMensajeError("Error al generar el PDF. Intente nuevamente.");
        } finally {
            setGenerandoPdf(false);
        }
    };

    /* ----- submit ----- */

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensajeOk("");
        setMensajeError("");

        if (!clienteSeleccionado) {
            setMensajeError("Selecciona un cliente.");
            return;
        }

        if (!formPago.fecha_pago) {
            setMensajeError("La fecha de pago es requerida.");
            return;
        }

        if (!formPago.nueva_fecha_expiracion) {
            setMensajeError("La nueva fecha de expiración es requerida.");
            return;
        }

        if (!formPago.metodo_id) {
            setMensajeError("Seleccione un método de pago.");
            return;
        }

        const metodoIdNum = Number(formPago.metodo_id);
        if (!metodoIdNum || Number.isNaN(metodoIdNum)) {
            setMensajeError("Método de pago inválido.");
            return;
        }

        const fechaNuevaFront = formPago.nueva_fecha_expiracion;
        const fechaAnterior = clienteSeleccionado.fecha_expiracion;

        if (!esFechaMayor(fechaNuevaFront, fechaAnterior)) {
            setMensajeError(
                "La nueva fecha de expiración debe ser mayor a la fecha de expiración actual."
            );
            return;
        }

        if (!formPago.monto || montoNumero <= 0) {
            setMensajeError("El monto debe ser mayor que 0.");
            return;
        }

        if (!formPago.recibido || recibidoNumero < montoNumero) {
            setMensajeError("El recibido no puede ser menor que el monto.");
            return;
        }

        const fechaNuevaAjustada = formatFechaParaBackend(fechaNuevaFront);
        const fechaPagoAjustada = formatFechaParaBackend(formPago.fecha_pago);

        const meses = calcularMesesEntreFechas(fechaAnterior, fechaNuevaFront);
        if (meses.length === 0) {
            setMensajeError(
                "No se encontraron meses a pagar entre la fecha actual y la nueva fecha de expiración."
            );
            return;
        }

        setLoading(true);
        try {
            // 1) Registrar pagos múltiples
            const payloadPagos = {
                clienteTv_id: clienteSeleccionado.id,
                monto_total: montoNumero,
                fecha_pago: fechaPagoAjustada,
                observacion:
                    formPago.observacion ||
                    `Pago de renovación plan TV hasta ${fechaNuevaAjustada}.`,
                referencia: formPago.referencia || null,
                metodo_id: metodoIdNum,
                meses,
            };

            const resPagos = await fetch(
                `${apiHost}/api/pagos-tv/pagos-tv/multiples`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payloadPagos),
                }
            );

            if (!resPagos.ok) {
                const errorData = await resPagos.json();
                throw new Error(
                    errorData.message || "Error al registrar los pagos de TV."
                );
            }

            // 2) Actualizar fecha de expiración del cliente
            const payloadCliente = { fecha_expiracion: fechaNuevaAjustada };
            const resCliente = await fetch(
                `${apiHost}/api/tv/clientes/${clienteSeleccionado.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payloadCliente),
                }
            );

            if (!resCliente.ok) {
                const errorData = await resCliente.json();
                throw new Error(
                    errorData.message ||
                    "Error al actualizar la fecha de expiración del cliente."
                );
            }

            // 3) Actualizar estados mensuales
            await actualizarEstadosMensuales(clienteSeleccionado.id, meses);

            setMensajeOk(
                `✅ Pago registrado, fecha de expiración actualizada a ${fechaNuevaAjustada} y ${meses.length} meses marcados como Pagado.`
            );

            // Actualizar cliente en memoria y preparar recibo
            const clienteActualizado: ClienteTv = {
                ...clienteSeleccionado,
                fecha_expiracion: fechaNuevaAjustada,
            };
            setClienteSeleccionado(clienteActualizado);

            const metodoNombre =
                metodosPago.find((m) => m.id === metodoIdNum)?.descripcion ||
                undefined;

            const nuevoRecibo: ReciboData = {
                cliente: clienteActualizado,
                fecha_pago: formPago.fecha_pago,
                fecha_expiracion_anterior: fechaAnterior,
                nueva_fecha_expiracion: fechaNuevaAjustada,
                monto: montoNumero,
                recibido: recibidoNumero,
                cambio,
                referencia: formPago.referencia || undefined,
                observacion: formPago.observacion || undefined,
                metodo_nombre: metodoNombre,
            };
            setRecibo(nuevoRecibo);
        } catch (error) {
            console.error(error);
            setMensajeError(
                error instanceof Error
                    ? error.message
                    : "❌ Ocurrió un error al registrar el pago o actualizar el cliente."
            );
        } finally {
            setLoading(false);
        }
    };

    /* ========== Render ========== */

    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8 py-16">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-orange-600">
                            Registrar Pago / Renovar Plan TV
                        </h1>
                        <p className="text-slate-600 mt-1">
                            Selecciona un cliente, define la nueva fecha de expiración y
                            registra el pago. El sistema actualizará automáticamente los
                            estados mensuales.
                        </p>
                    </div>
                    <Link
                        href="/pages/admin/iptv/clientes"
                        className="inline-flex items-center px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm"
                    >
                        ← Volver a Clientes TV
                    </Link>
                </div>

                <div className="w-full max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-orange-300">
                    {/* Selector de cliente */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Buscar cliente que realizará el pago
                        </label>
                        <ClienteSearchSelect
                            clientes={clientesCatalogo}
                            value={clienteIdSeleccionado}
                            onChange={handleSeleccionCliente}
                            disabled={loadingCatalogo}
                        />
                        {loadingCatalogo && (
                            <p className="mt-1 text-xs text-slate-500">
                                Cargando clientes...
                            </p>
                        )}
                    </div>

                    {/* Info del cliente */}
                    {loadingCliente ? (
                        <p className="text-sm text-slate-600 mb-4">
                            Cargando datos del cliente...
                        </p>
                    ) : clienteSeleccionado ? (
                        <div className="mb-6 border border-slate-200 rounded-lg p-4 bg-slate-50 relative">
                            <button
                                type="button"
                                className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
                                title="Cambiar de cliente"
                                onClick={() => {
                                    setClienteSeleccionado(null);
                                    setClienteIdSeleccionado("");
                                    setRecibo(null);
                                    setMensajeOk("");
                                    setMensajeError("");
                                }}
                            >
                                ×
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase">
                                        Cliente
                                    </p>
                                    <p className="font-semibold text-slate-800">
                                        {clienteSeleccionado.nombre}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        {clienteSeleccionado.usuario}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        {clienteSeleccionado.telefono || "Sin teléfono"}
                                    </p>
                                    <p className="text-sm text-slate-600 break-words">
                                        {clienteSeleccionado.direccion || "Sin dirección registrada"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase">
                                        Plan TV
                                    </p>
                                    <p className="font-semibold text-slate-800">
                                        {clienteSeleccionado.plan_nombre || "Plan no especificado"}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                        Precio mensual:{" "}
                                        <span className="font-semibold">
                                            L.
                                            {formatMoney(
                                                clienteSeleccionado.plan_precio_mensual ?? 0
                                            )}
                                        </span>
                                    </p>
                                    <p className="text-sm text-slate-600 mt-1">
                                        Expiración actual:{" "}
                                        <span className="font-semibold">
                                            {new Date(clienteSeleccionado.fecha_expiracion).toISOString().split('T')[0]}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 mb-4">
                            Seleccione un cliente para ver su información y registrar el
                            pago.
                        </p>
                    )}

                    {/* Formulario de pago */}
                    {clienteSeleccionado && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Fechas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Fecha de pago
                                    </label>
                                    <input
                                        type="date"
                                        name="fecha_pago"
                                        value={formPago.fecha_pago}
                                        onChange={handleChangePago}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Nueva fecha de expiración
                                    </label>
                                    <input
                                        type="date"
                                        name="nueva_fecha_expiracion"
                                        value={formPago.nueva_fecha_expiracion}
                                        onChange={handleChangePago}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Debe ser mayor a {clienteSeleccionado.fecha_expiracion}. Se
                                        calcularán automáticamente los meses a pagar.
                                    </p>
                                </div>
                            </div>

                            {/* Método / monto / recibido */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Método de pago
                                    </label>
                                    <select
                                        name="metodo_id"
                                        value={formPago.metodo_id}
                                        onChange={handleChangePago}
                                        className="w-full px-3 py-2 border rounded-md"
                                        disabled={loadingMetodos || metodosPago.length === 0}
                                        required
                                    >
                                        <option value="">
                                            {loadingMetodos
                                                ? "Cargando métodos..."
                                                : "Seleccione un método"}
                                        </option>
                                        {metodosPago.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.descripcion}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Monto pagado
                                    </label>
                                    <input
                                        type="number"
                                        name="monto"
                                        step="0.01"
                                        min="0"
                                        value={formPago.monto}
                                        onChange={handleChangePago}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="Ej: 1400.00"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Recibido
                                    </label>
                                    <input
                                        type="number"
                                        name="recibido"
                                        step="0.01"
                                        min="0"
                                        value={formPago.recibido}
                                        onChange={handleChangePago}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="Ej: 1500.00"
                                        required
                                    />
                                    <p
                                        className={`text-xs mt-1 ${cambio < 0 ? "text-red-600" : "text-slate-700"
                                            }`}
                                    >
                                        {cambio < 0 ? "Falta" : "Cambio"}:{" "}
                                        <span className="font-semibold">
                                            L.{formatMoney(Math.abs(cambio))}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Referencia / observación */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Referencia (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        name="referencia"
                                        value={formPago.referencia}
                                        onChange={handleChangePago}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="N° transacción, voucher, etc."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Observaciones (opcional)
                                    </label>
                                    <textarea
                                        name="observacion"
                                        value={formPago.observacion}
                                        onChange={handleChangePago}
                                        rows={2}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="Notas adicionales sobre este pago..."
                                    />
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex flex-wrap gap-3 items-center mt-2">
                                <button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        montoNumero <= 0 ||
                                        recibidoNumero < montoNumero ||
                                        !formPago.fecha_pago ||
                                        !formPago.nueva_fecha_expiracion ||
                                        !formPago.metodo_id
                                    }
                                    className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? "Guardando..." : "Registrar pago y renovar plan"}
                                </button>

                                {recibo && (
                                    <button
                                        type="button"
                                        onClick={exportarPdf}
                                        disabled={generandoPdf}
                                        className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        {generandoPdf
                                            ? "Generando PDF..."
                                            : "Descargar recibo en PDF"}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    {/* Mensajes */}
                    {(mensajeOk || mensajeError) && (
                        <div className="mt-4 text-center">
                            {mensajeOk && (
                                <p className="text-green-600 font-semibold">{mensajeOk}</p>
                            )}
                            {mensajeError && (
                                <p className="text-red-600 font-semibold">{mensajeError}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default RegistrarPagoTv;
