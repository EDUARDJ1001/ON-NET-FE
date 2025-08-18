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
  "nombre",
  "ip",
  "direccion",
  "telefono",
  "coordenadas",
  "plan_id",
];

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
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [planes, setPlanes] = useState<{ id: number; nombre: string }[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [pago, setPago] = useState({
    monto: "",
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    observacion: "",
  });

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

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
      setForm((prev) => ({ ...prev, plan_id: value ? Number(value) : ("" as unknown as number) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje("");
    try {
      const res = await fetch(`${apiHost}/api/clientes/${cliente.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  const handlePagoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPago((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegistrarPago = async () => {
    setGuardandoPago(true);
    setMensaje("");
    try {
      const res = await fetch(`${apiHost}/api/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: cliente.id,
          monto: parseFloat(pago.monto || "0"),
          fecha_pago: `${pago.anio}-${String(pago.mes).padStart(2, "0")}-01`,
          observacion: pago.observacion,
        }),
      });

      if (!res.ok) throw new Error("Error al registrar el pago");

      setMensaje("✅ Pago registrado y estado actualizado");
      setPago({
        monto: "",
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
        observacion: "",
      });
      setRegistrandoPago(false);
      onClienteUpdated();
    } catch (error) {
      console.error(error);
      setMensaje("❌ No se pudo registrar el pago");
    } finally {
      setGuardandoPago(false);
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
        ref={dialogRef}
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100" : ""
                }`}
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100" : ""
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100" : ""
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100" : ""
                }`}
              />
            </div>

            {/* direccion (ocupa 2 columnas en md) */}
            <div className="flex flex-col md:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1">Dirección</label>
              <textarea
                name="direccion"
                value={form.direccion ?? ""}
                onChange={handleChange}
                readOnly={!editando}
                className={`w-full px-3 py-2 border rounded-md min-h-[72px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  !editando ? "bg-gray-100" : ""
                }`}
              />
            </div>

            {/* plan */}
            <div className="flex flex-col md:col-span-2">
              <label className="text-xs font-medium text-slate-700 mb-1">Plan</label>
              <select
                name="plan_id"
                value={form.plan_id ?? ""}
                onChange={handleChange}
                disabled={!editando}
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
          </div>

          {/* Estados de pago */}
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-slate-700 mb-2">Estados de Pago</h3>
            {cliente.estados?.length ? (
              <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-1">
                {cliente.estados.map((e, i) => (
                  <li key={`${e.anio}-${e.mes}-${i}`} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <span className="text-slate-600">
                      {MESES[e.mes - 1]} / {e.anio}
                    </span>
                    <span
                      className={
                        e.estado === "Pagado"
                          ? "text-green-600 font-semibold"
                          : e.estado === "Pagado Parcial"
                          ? "text-yellow-600 font-semibold"
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

          {/* Registrar pago */}
          <div className="mt-6">
            <button
              onClick={() => setRegistrandoPago((v) => !v)}
              className="w-full sm:w-auto bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition"
            >
              {registrandoPago ? "Cancelar Pago" : "Registrar Pago"}
            </button>

            {registrandoPago && (
              <div className="mt-4 border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Nuevo Pago</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Monto
                    </label>
                    <input
                      type="number"
                      name="monto"
                      value={pago.monto}
                      onChange={handlePagoChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Mes
                    </label>
                    <select
                      name="mes"
                      value={pago.mes}
                      onChange={(e) => setPago((prev) => ({ ...prev, mes: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {MESES.map((nombre, index) => (
                        <option key={index} value={index + 1}>
                          {nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Año
                    </label>
                    <select
                      name="anio"
                      value={pago.anio}
                      onChange={(e) => setPago((prev) => ({ ...prev, anio: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {Array.from({ length: 5 }).map((_, i) => {
                        const anio = new Date().getFullYear() - 2 + i; // 2 atrás, 2 adelante, actual al centro
                        return (
                          <option key={anio} value={anio}>
                            {anio}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    Observación
                  </label>
                  <textarea
                    name="observacion"
                    value={pago.observacion}
                    onChange={handlePagoChange}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border rounded-md min-h-[72px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <button
                  onClick={handleRegistrarPago}
                  disabled={guardandoPago}
                  className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-60"
                >
                  {guardandoPago ? "Guardando..." : "Guardar Pago"}
                </button>
              </div>
            )}
          </div>
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
