"use client";

import { useEffect, useRef, useState } from "react";

interface EstadoMensualTV {
  mes: number;
  anio: number;
  estado: string;
}

export interface ClienteTvEntity {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  plantv_id: number;
  estado_id?: number;
  estados?: EstadoMensualTV[];
  plan_nombre?: string | null;
  plan_precio_mensual?: number | null;
  estado_descripcion?: string | null;
}

interface PlanTV {
  id: number;
  nombre: string;
  precio_mensual: number;
  descripcion?: string | null;
}

interface EstadoClienteTV {
  id: number;
  descripcion: string;
}

interface ClienteTvModalProps {
  cliente: ClienteTvEntity;
  onClose: () => void;
  onClienteUpdated: () => void;
  apiHost: string;
}

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${String(token)}` } : {};
};

const ClienteTvModal = ({
  cliente,
  onClose,
  onClienteUpdated,
  apiHost,
}: ClienteTvModalProps) => {
  const [form, setForm] = useState<ClienteTvEntity>(cliente);
  const [editando, setEditando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [planes, setPlanes] = useState<PlanTV[]>([]);
  const [estadosCatalogo, setEstadosCatalogo] = useState<EstadoClienteTV[]>([]);
  const [guardando, setGuardando] = useState(false);

  // ▼▼▼ NUEVO: estado mensual por año ▼▼▼
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear());
  const [estadosMensuales, setEstadosMensuales] = useState<EstadoMensualTV[] | null>(null);
  const [loadingMensual, setLoadingMensual] = useState<boolean>(false);
  const [errorMensual, setErrorMensual] = useState<string | null>(null);
  // ▲▲▲ NUEVO ▲▲▲

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setForm(cliente);
    setMensaje("");
    setEditando(false);
  }, [cliente]);

  // Bloquear scroll
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Carga catálogos (planes y estados)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [resPlanes, resEstados] = await Promise.all([
          fetch(`${apiHost}/api/tv/planes`, {
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            signal: ac.signal,
          }),
          fetch(`${apiHost}/api/tv/estados`, {
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            signal: ac.signal,
          }),
        ]);

        const planesData = await resPlanes.json();
        const estadosData = await resEstados.json();

        setPlanes(Array.isArray(planesData) ? planesData : []);
        setEstadosCatalogo(Array.isArray(estadosData) ? estadosData : []);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error cargando catálogos TV:", error);
      }
    })();
    return () => ac.abort();
  }, [apiHost]);

  // ▼▼▼ NUEVO: cargar estados mensuales por año ▼▼▼
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoadingMensual(true);
      setErrorMensual(null);
      try {
        // GET /api/estado-mensual-tv/cliente/:clienteId/anio/:anio
        const url = `${apiHost}/api/estado-mensual-tv/cliente/${cliente.id}/anio/${anioSeleccionado}`;
        const res = await fetch(url, {
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("No se pudo cargar el estado mensual");
        const data = (await res.json()) as EstadoMensualTV[];
        // Se espera siempre 12 meses; si backend cumple eso, set tal cual:
        setEstadosMensuales(Array.isArray(data) ? data : null);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error cargando estados mensuales:", error);
        setErrorMensual("No se pudo cargar el estado mensual");
        setEstadosMensuales(null);
      } finally {
        setLoadingMensual(false);
      }
    })();
    return () => ac.abort();
  }, [apiHost, cliente.id, anioSeleccionado]);
  // ▲▲▲ NUEVO ▲▲▲

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "plantv_id" || name === "estado_id") {
      const num = Number(value);
      setForm((prev) => ({
        ...prev,
        [name]: value === "" ? undefined : (Number.isNaN(num) ? undefined : num),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje("");
    try {
      const payload: Record<string, unknown> = {};
      if (typeof form.nombre !== "undefined") payload.nombre = form.nombre ?? null;
      if (typeof form.direccion !== "undefined") payload.direccion = form.direccion ?? null;
      if (typeof form.telefono !== "undefined") payload.telefono = form.telefono ?? null;
      if (typeof form.plantv_id === "number" && !Number.isNaN(form.plantv_id)) {
        payload.plantv_id = form.plantv_id;
      }
      if (typeof form.estado_id === "number" && !Number.isNaN(form.estado_id)) {
        payload.estado_id = form.estado_id;
      }

      const res = await fetch(`${apiHost}/api/tv/clientes/${cliente.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error al actualizar cliente TV");

      setMensaje("✅ Cliente actualizado");
      setEditando(false);
      onClienteUpdated();
    } catch (error: unknown) {
      console.error(error);
      setMensaje("❌ No se pudo actualizar");
    } finally {
      setGuardando(false);
    }
  };

  // Helper UI para color del estado
  const estadoClase = (estado: string) => {
    const e = (estado || "").toLowerCase();
    if (e === "pagado") return "text-green-600 font-semibold";
    if (e === "pagado parcial") return "text-yellow-600 font-semibold";
    if (e === "suspendido") return "text-gray-800 font-semibold";
    if (e === "sin dato") return "text-gray-800 font-semibold";
    return "text-red-600 font-semibold"; // pendiente u otro
    // Ajusta si tienes más estados
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[1px]"
      aria-modal="true"
      role="dialog"
      aria-labelledby="cliente-modal-title"
    >
      <div
        className="
          w-full sm:max-w-2xl lg:max-w-3xl 
          bg-white shadow-xl
          rounded-t-2xl sm:rounded-2xl
          overflow-hidden
          animate-in fade-in zoom-in-95 duration-150
          h-[92vh] sm:h-auto sm:max-h-[90vh]
          flex flex-col
        "
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2 id="cliente-modal-title" className="text-lg sm:text-xl font-bold text-orange-600">
            Detalles del Cliente TV
          </h2>
          <button
            onClick={() => {
              setMensaje("");
              onClose();
            }}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800"
            aria-label="Cerrar"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto grow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* nombre */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Nombre</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                disabled={guardando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100" : ""
                }`}
              />
            </div>

            {/* teléfono */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={form.telefono ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                disabled={guardando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100" : ""
                }`}
              />
            </div>

            {/* estado cliente */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Estado del Cliente</label>
              <select
                name="estado_id"
                value={form.estado_id ?? ""}
                onChange={handleChange}
                disabled={!editando || guardando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              >
                <option value="">Seleccionar estado</option>
                {estadosCatalogo.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.descripcion}
                  </option>
                ))}
              </select>
            </div>

            {/* plan TV */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-700 mb-1">Plan de TV</label>
              <select
                name="plantv_id"
                value={form.plantv_id ?? ""}
                onChange={handleChange}
                disabled={!editando || guardando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100 text-gray-500" : ""
                }`}
              >
                <option value="">Selecciona un plan</option>
                {planes.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* dirección */}
            <div className="flex flex-col md:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1">Dirección</label>
              <textarea
                name="direccion"
                value={form.direccion ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                disabled={guardando}
                className={`w-full px-3 py-2 border rounded-md min-h-[72px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100" : ""
                }`}
              />
            </div>
          </div>

          {/* ▼▼▼ NUEVO: Estados mensuales (con selector de año) ▼▼▼ */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-slate-700">Estados de Pago</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnioSeleccionado((y) => y - 1)}
                  className="px-2 py-1 text-xs border rounded hover:bg-slate-50"
                >
                  « Anterior
                </button>
                <input
                  type="number"
                  className="w-24 px-2 py-1 text-sm border rounded"
                  value={anioSeleccionado}
                  onChange={(e) => setAnioSeleccionado(Number(e.target.value) || new Date().getFullYear())}
                />
                <button
                  onClick={() => setAnioSeleccionado((y) => y + 1)}
                  className="px-2 py-1 text-xs border rounded hover:bg-slate-50"
                >
                  Siguiente »
                </button>
              </div>
            </div>

            {loadingMensual ? (
              <div className="text-sm text-slate-600">Cargando estados del {anioSeleccionado}…</div>
            ) : errorMensual ? (
              <div className="text-sm text-red-600">{errorMensual}</div>
            ) : estadosMensuales && estadosMensuales.length > 0 ? (
              <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-1">
                {estadosMensuales.map((e, i) => (
                  <li
                    key={`${e.anio}-${e.mes}-${i}`}
                    className="flex items-center justify-between border rounded-md px-3 py-2"
                  >
                    <span className="text-slate-600">
                      {MESES[e.mes - 1]} / {e.anio}
                    </span>
                    <span className={estadoClase(e.estado)}>{e.estado}</span>
                  </li>
                ))}
              </ul>
            ) : (
              // Fallback: si algo falla, muestra lo que venía dentro del cliente
              <>
                {cliente.estados?.length ? (
                  <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {cliente.estados.map((e, i) => (
                      <li
                        key={`${e.anio}-${e.mes}-${i}`}
                        className="flex items-center justify-between border rounded-md px-3 py-2"
                      >
                        <span className="text-slate-600">
                          {MESES[e.mes - 1]} / {e.anio}
                        </span>
                        <span className={estadoClase(e.estado)}>{e.estado}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-sm">Sin historial</p>
                )}
              </>
            )}
          </div>
          {/* ▲▲▲ NUEVO ▲▲▲ */}

          {/* Mensaje */}
          {mensaje && (
            <p className="mt-4 text-center text-sm font-semibold text-orange-600">{mensaje}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (editando) {
                    setForm(cliente);
                    setMensaje("");
                  }
                  setEditando((v) => !v);
                }}
                disabled={guardando}
                className="flex-1 sm:flex-none bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition disabled:opacity-60"
              >
                {editando ? "Cancelar Edición" : "Editar Cliente"}
              </button>

              {editando && (
                <button
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-60"
                >
                  {guardando ? "Guardando..." : "Guardar Cambios"}
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setMensaje("");
                onClose();
              }}
              className="flex-1 sm:flex-none bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteTvModal;
