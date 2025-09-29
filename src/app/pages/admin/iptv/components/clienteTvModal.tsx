"use client";

import { useEffect, useRef, useState } from "react";

interface PlanTV {
  id: number;
  nombre: string;
}

interface EstadoTV {
  id: number;
  descripcion: string;
}

interface ClienteTVForm {
  nombre: string;
  telefono: string;
  direccion: string;
  plantv_id: string; // select en string; lo convertimos al enviar
  estado_id: string; // select en string; lo convertimos al enviar
}

interface ClienteTVCreateModalProps {
  onClose: () => void;
  onClienteCreated: () => void;
  apiHost?: string;
}

type EmptyObject = Record<string, never>;
type APIErrorPayload = { message?: string; error?: string };

// ------- Type guards & helpers sin any -------
function hasStringProp<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, string> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    key in obj &&
    typeof (obj as Record<string, unknown>)[key] === "string"
  );
}

function parseApiError(payload: unknown): string | null {
  if (hasStringProp(payload, "message")) return payload.message;
  if (hasStringProp(payload, "error")) return payload.error;
  return null;
}

async function safeJson<T = unknown>(
  resp: Response
): Promise<T | EmptyObject> {
  try {
    return (await resp.json()) as T;
  } catch {
    return {};
  }
}

const ClienteTVCreateModal = ({
  onClose,
  onClienteCreated,
  apiHost,
}: ClienteTVCreateModalProps) => {
  const [form, setForm] = useState<ClienteTVForm>({
    nombre: "",
    telefono: "",
    direccion: "",
    plantv_id: "",
    estado_id: "",
  });

  const [planes, setPlanes] = useState<PlanTV[]>([]);
  const [estados, setEstados] = useState<EstadoTV[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const baseUrl = apiHost || "";
  const overlayRef = useRef<HTMLDivElement>(null);

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

  // Cerrar al hacer click fuera del modal (usa currentTarget, no target)
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Cargar planes y estados
  useEffect(() => {
    const load = async () => {
      setCargando(true);
      setErrorMsg(null);
      try {
        const [rPlanes, rEstados] = await Promise.all([
          fetch(`${baseUrl}/api/tv/planes`),
          fetch(`${baseUrl}/api/tv/estados`),
        ]);

        if (!rPlanes.ok) throw new Error("No se pudieron cargar los planes");
        if (!rEstados.ok) throw new Error("No se pudieron cargar los estados");

        const planesData = (await rPlanes.json()) as PlanTV[];
        const estadosData = (await rEstados.json()) as EstadoTV[];

        setPlanes(planesData);
        setEstados(estadosData);

        // Defaults
        const defaultPlan = planesData[0]?.id?.toString() ?? "";
        const estadoActivo =
          estadosData.find(
            (e) => e.descripcion?.toLowerCase() === "activo"
          )?.id ?? estadosData[0]?.id;

        setForm((prev) => ({
          ...prev,
          plantv_id: defaultPlan,
          estado_id: estadoActivo ? String(estadoActivo) : "",
        }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error al cargar datos";
        setErrorMsg(msg);
      } finally {
        setCargando(false);
      }
    };
    load();
  }, [baseUrl]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validar = (): string | null => {
    if (!form.nombre.trim()) return "El nombre es requerido.";
    if (!form.plantv_id) return "Selecciona un plan.";
    if (!form.estado_id) return "Selecciona un estado.";
    if (form.telefono && !/^[0-9+\-\s()]{7,20}$/.test(form.telefono.trim())) {
      return "Teléfono no válido.";
    }
    return null;
  };

  const handleGuardar = async () => {
    setMensaje(null);
    setErrorMsg(null);
    const v = validar();
    if (v) {
      setErrorMsg(v);
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        plantv_id: Number(form.plantv_id),
        estado_id: Number(form.estado_id) || 1,
      };

      const resp = await fetch(`${baseUrl}/api/tv/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await safeJson<APIErrorPayload>(resp);
      if (!resp.ok) {
        const parsed = parseApiError(body);
        throw new Error(parsed ?? "No se pudo crear el cliente");
      }

      setMensaje("✅ Cliente creado correctamente");
      onClienteCreated();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error de conexión";
      setErrorMsg(msg);
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
      aria-labelledby="cliente-tv-modal-title"
    >
      <div
        className="
          w-full sm:max-w-xl 
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
          <h2 id="cliente-tv-modal-title" className="text-lg sm:text-xl font-bold text-orange-600">
            Agregar Cliente TV
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

        {/* Contenido */}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto grow">
          {cargando ? (
            <p className="text-gray-600">Cargando datos...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Nombre */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Nombre*</label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                    required
                  />
                </div>

                {/* Teléfono */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                  />
                </div>

                {/* Dirección (full width) */}
                <div className="flex flex-col md:col-span-2">
                  <label className="text-xs font-medium text-slate-600 mb-1">Dirección</label>
                  <textarea
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                  />
                </div>

                {/* Plan */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-700 mb-1">Plan*</label>
                  <select
                    name="plantv_id"
                    value={form.plantv_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                    required
                  >
                    <option value="">Selecciona un plan</option>
                    {planes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Estado*</label>
                  <select
                    name="estado_id"
                    value={form.estado_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                    required
                  >
                    <option value="">Seleccionar estado</option>
                    {estados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mensajes */}
              {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
              {mensaje && <p className="mt-3 text-sm text-green-700">{mensaje}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando || cargando}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar Cliente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteTVCreateModal;
