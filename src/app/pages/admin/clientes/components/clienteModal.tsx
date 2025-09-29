"use client";

import { useEffect, useRef, useState } from "react";

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
  pass_onu: string;
  coordenadas: string;
  plan_id: number;
  dia_pago: number;
  estado_id?: number;
  estados: Estado[];
  fecha_instalacion: string;
}

interface ClienteModalProps {
  cliente: Cliente;
  onClose: () => void;
  onClienteUpdated: () => void;
  apiHost: string;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const ClienteModal = ({
  cliente,
  onClose,
  onClienteUpdated,
  apiHost,
}: ClienteModalProps) => {
  const [form, setForm] = useState<Cliente>(cliente);
  const [editando, setEditando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [planes, setPlanes] = useState<{ id: number; nombre: string }[]>([]);
  const [guardando, setGuardando] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  const toInputDate = (value?: string | null) => {
    if (!value) return "";
    // ya viene correcto
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    // viene como DD/MM/YYYY
    const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;

    // viene como ISO (evitar desfases por zona horaria)
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 10);
  };

  // Bloquear scroll del body mientras el modal está abierto
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

  // Cerrar al hacer click fuera del modal
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // plan_id debe mantenerse como número
    if (name === "plan_id") {
      setForm((prev) => ({
        ...prev,
        plan_id: value ? Number(value) : ("" as unknown as number),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje("");
    try {
      // Asegurarse de que la fecha esté en formato YYYY-MM-DD
      const datosParaEnviar = {
        ...form,
        fecha_instalacion: form.fecha_instalacion.split('T')[0] // Solo la parte de la fecha
      };

      const res = await fetch(`${apiHost}/api/clientes/${cliente.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosParaEnviar),
      });

      if (!res.ok) throw new Error("Error al actualizar cliente");

      setMensaje("✅ Cliente actualizado");
      setEditando(false);
      onClienteUpdated();
    } catch (error) {
      console.error(error);
      setMensaje("❌ No se pudo actualizar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
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
        {/* Header sticky */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2 id="cliente-modal-title" className="text-lg sm:text-xl font-bold text-orange-600">
            Detalles del Cliente
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800"
            aria-label="Cerrar"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto grow">
          {/* Datos del cliente */}
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100" : ""
                  }`}
              />
            </div>

            {/* telefono */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={form.telefono ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100" : ""
                  }`}
              />
            </div>

            {/* Fecha de instalación - NUEVO CAMPO */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">
                Fecha de instalación
              </label>
              <input
                type="date"
                name="fecha_instalacion"
                value={toInputDate(form.fecha_instalacion)}
                onChange={handleChange}
                readOnly={!editando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100" : ""}`}
              />
            </div>

            {/* ip */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">IP</label>
              <input
                type="text"
                name="ip"
                value={form.ip ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100" : ""
                  }`}
              />
            </div>

            {/* coordenadas */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Coordenadas</label>
              <input
                type="text"
                name="coordenadas"
                value={form.coordenadas ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100" : ""
                  }`}
              />
            </div>

            {/* estado cliente */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Estado Cliente</label>
              <select
                name="estado_id"
                value={form.estado_id ?? ""}
                onChange={handleChange}
                disabled={!editando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
              >
                <option value="">Seleccionar estado</option>
                <option value="1">Activo</option>
                <option value="2">Inactivo</option>
                <option value="3">Suspendido</option>
              </select>
            </div>

            {/* direccion (ocupa 2 columnas en md) */}
            <div className="flex flex-col md:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1">Dirección</label>
              <textarea
                name="direccion"
                value={form.direccion ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                className={`w-full px-3 py-2 border rounded-md min-h-[72px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100" : ""
                  }`}
              />
            </div>

            {/* Password ONU */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Contraseña ONU</label>
              <input
                type="text"
                name="pass_onu"
                value={form.pass_onu ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100" : ""
                  }`}
              />
            </div>

            {/* plan */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-700 mb-1">Plan</label>
              <select
                name="plan_id"
                value={form.plan_id ?? ""}
                onChange={handleChange}
                disabled={!editando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100 text-gray-500" : ""
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

            {/* Fecha Pago */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600 mb-1">Dia de Pago</label>
              <input
                type="text"
                name="dia_pago"
                value={form.dia_pago ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${!editando ? "bg-gray-100" : ""
                  }`}
              />
            </div>
          </div>


          {/* Estados de pago */}
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-slate-700 mb-2">Estados de Pago</h3>
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
                    <span
                      className={
                        e.estado === "Pagado"
                          ? "text-green-600 font-semibold"
                          : e.estado === "Pagado Parcial"
                            ? "text-yellow-600 font-semibold"
                            : e.estado === "Suspendido"
                              ? "text-gray-800 font-semibold"
                              : "text-red-600 font-semibold"
                      }
                    >
                      {e.estado}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-sm">Sin historial</p>
            )}
          </div>

          {/* Mensaje */}
          {mensaje && (
            <p className="mt-4 text-center text-sm font-semibold text-orange-600">{mensaje}</p>
          )}
        </div>

        {/* Footer sticky */}
        <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setEditando((v) => !v)}
                className="flex-1 sm:flex-none bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
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
              onClick={onClose}
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

export default ClienteModal;
