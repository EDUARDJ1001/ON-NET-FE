"use client";

import { useEffect, useMemo, useState } from "react";
import SearchSelect from "@/app/components/searchSelect";
import {
  CatalogItem,
  DetalleBitacoraLinea,
  ESTADOS_BITACORA,
  EstadoBitacora,
  IntervencionPayload,
  IntervencionTecnica,
} from "../services/intervencionesService";

interface EditableLine {
  id: string;
  descripcion: string;
  cantidad: string;
  unidad: string;
  precioUnitario: string;
  nota: string;
}

interface BitacoraFormModalProps {
  mode: "create" | "edit";
  initialData: IntervencionTecnica | null;
  clientes: CatalogItem[];
  usuarios: CatalogItem[];
  tiposServicio: CatalogItem[];
  onClose: () => void;
  onSave: (payload: IntervencionPayload, action: "save" | "finalizar") => Promise<void>;
}

interface FormState {
  cliente_id: string;
  ingreso_manual_cliente: boolean;
  cliente_manual_nombre: string;
  cliente_manual_telefono: string;
  cliente_manual_direccion: string;
  usuario_id: string;
  tipo_servicio_id: string;
  descripcion: string;
  fecha: string;
  observacion: string;
  estado: EstadoBitacora;
}

const CURRENCY = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const todayInput = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const lineId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const MANUAL_CLIENT_START = "[CLIENTE_MANUAL]";
const MANUAL_CLIENT_END = "[/CLIENTE_MANUAL]";
const MANUAL_CLIENT_REGEX = /\[CLIENTE_MANUAL\]([\s\S]*?)\[\/CLIENTE_MANUAL\]/i;

const toNumber = (value: string): number => {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const lineTotal = (line: EditableLine): number => {
  const qty = toNumber(line.cantidad);
  const price = toNumber(line.precioUnitario);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return qty * price;
};

const fromDetalle = (line: DetalleBitacoraLinea): EditableLine => ({
  id: lineId(),
  descripcion: line.descripcion || "",
  cantidad: String(line.cantidad ?? 0),
  unidad: line.unidad || "",
  precioUnitario: String(line.precioUnitario ?? 0),
  nota: line.nota || "",
});

const createEmptyLine = (): EditableLine => ({
  id: lineId(),
  descripcion: "",
  cantidad: "0",
  unidad: "",
  precioUnitario: "0",
  nota: "",
});

const parseManualCliente = (observacion: string): {
  nombre: string;
  telefono: string;
  direccion: string;
} => {
  const match = observacion.match(MANUAL_CLIENT_REGEX);
  if (!match) {
    return { nombre: "", telefono: "", direccion: "" };
  }

  const block = match[1] || "";
  const getField = (label: string): string => {
    const line = block
      .split("\n")
      .map((item) => item.trim())
      .find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    if (!line) return "";
    return line.split(":").slice(1).join(":").trim();
  };

  return {
    nombre: getField("Nombre"),
    telefono: getField("Telefono"),
    direccion: getField("Direccion"),
  };
};

const stripManualCliente = (observacion: string): string => {
  return observacion.replace(MANUAL_CLIENT_REGEX, "").trim();
};

const initialFormState = (data: IntervencionTecnica | null): FormState => {
  if (!data) {
    return {
      cliente_id: "",
      ingreso_manual_cliente: false,
      cliente_manual_nombre: "",
      cliente_manual_telefono: "",
      cliente_manual_direccion: "",
      usuario_id: "",
      tipo_servicio_id: "",
      descripcion: "",
      fecha: todayInput(),
      observacion: "",
      estado: "Borrador",
    };
  }

  const observacionOriginal = data.observacion || "";
  const manualParsed = parseManualCliente(observacionOriginal);
  const isManual = !data.cliente_id || Boolean(manualParsed.nombre.trim());

  return {
    cliente_id: data.cliente_id ? String(data.cliente_id) : "",
    ingreso_manual_cliente: isManual,
    cliente_manual_nombre: manualParsed.nombre,
    cliente_manual_telefono: manualParsed.telefono,
    cliente_manual_direccion: manualParsed.direccion,
    usuario_id: String(data.usuario_id || ""),
    tipo_servicio_id: String(data.tipo_servicio_id || ""),
    descripcion: data.descripcion || "",
    fecha: data.fecha || todayInput(),
    observacion: stripManualCliente(observacionOriginal),
    estado: data.estado || "Borrador",
  };
};

const initialLines = (data: IntervencionTecnica | null): EditableLine[] => {
  if (!data || !Array.isArray(data.detalle_bitacora) || data.detalle_bitacora.length === 0) {
    return [createEmptyLine()];
  }
  return data.detalle_bitacora.map((line) => fromDetalle(line));
};

const BitacoraFormModal = ({
  mode,
  initialData,
  clientes,
  usuarios,
  tiposServicio,
  onClose,
  onSave,
}: BitacoraFormModalProps) => {
  const [form, setForm] = useState<FormState>(initialFormState(initialData));
  const [lineas, setLineas] = useState<EditableLine[]>(initialLines(initialData));
  const [formError, setFormError] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setForm(initialFormState(initialData));
    setLineas(initialLines(initialData));
    setFormError("");
  }, [initialData]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const totalEstimado = useMemo<number>(() => {
    return lineas.reduce((sum, line) => sum + lineTotal(line), 0);
  }, [lineas]);

  const updateLine = (id: string, field: keyof EditableLine, value: string) => {
    setLineas((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [field]: value } : line))
    );
  };

  const removeLine = (id: string) => {
    setLineas((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((line) => line.id !== id);
    });
  };

  const validateForm = (): string | null => {
    if (form.ingreso_manual_cliente) {
      if (!form.cliente_manual_nombre.trim()) {
        return "Debe ingresar el nombre del cliente manual.";
      }
    } else if (!form.cliente_id) {
      return "Debe seleccionar un cliente.";
    }

    if (!form.usuario_id) return "Debe seleccionar un tecnico responsable.";
    if (!form.tipo_servicio_id) return "Debe seleccionar un tipo de servicio.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)) return "Debe ingresar una fecha valida.";
    if (!form.descripcion.trim()) return "La descripcion general es obligatoria.";
    if (!ESTADOS_BITACORA.includes(form.estado)) return "Estado invalido.";

    for (let i = 0; i < lineas.length; i += 1) {
      const line = lineas[i];
      if (!line.descripcion.trim()) {
        return `La descripcion de la linea ${i + 1} es obligatoria.`;
      }
      const qty = toNumber(line.cantidad);
      if (!Number.isFinite(qty)) {
        return `Cantidad invalida en la linea ${i + 1}.`;
      }
      const price = toNumber(line.precioUnitario);
      if (!Number.isFinite(price)) {
        return `Precio unitario invalido en la linea ${i + 1}.`;
      }
    }

    return null;
  };

  const buildPayload = (estado: EstadoBitacora): IntervencionPayload => {
    const detalle: DetalleBitacoraLinea[] = lineas.map((line) => {
      const cantidad = Number.isFinite(toNumber(line.cantidad)) ? toNumber(line.cantidad) : 0;
      const precioUnitario = Number.isFinite(toNumber(line.precioUnitario))
        ? toNumber(line.precioUnitario)
        : 0;
      return {
        descripcion: line.descripcion.trim(),
        cantidad,
        unidad: line.unidad.trim(),
        precioUnitario,
        total: cantidad * precioUnitario,
        nota: line.nota.trim(),
      };
    });

    const total = detalle.reduce((sum, line) => sum + line.total, 0);

    const observacionBase = stripManualCliente(form.observacion.trim());
    const manualLines = [
      `Nombre: ${form.cliente_manual_nombre.trim()}`,
      form.cliente_manual_telefono.trim()
        ? `Telefono: ${form.cliente_manual_telefono.trim()}`
        : "",
      form.cliente_manual_direccion.trim()
        ? `Direccion: ${form.cliente_manual_direccion.trim()}`
        : "",
    ].filter((line) => line !== "");

    const observacionConClienteManual = form.ingreso_manual_cliente
      ? [
          observacionBase,
          `${MANUAL_CLIENT_START}\n${manualLines.join("\n")}\n${MANUAL_CLIENT_END}`,
        ]
          .filter((part) => part.trim() !== "")
          .join("\n\n")
      : observacionBase;

    return {
      cliente_id: form.ingreso_manual_cliente ? null : Number(form.cliente_id),
      usuario_id: Number(form.usuario_id),
      tipo_servicio_id: Number(form.tipo_servicio_id),
      descripcion: form.descripcion.trim(),
      fecha: form.fecha,
      observacion: observacionConClienteManual,
      detalle_bitacora: detalle,
      total_estimado: total,
      estado,
    };
  };

  const handleSave = async (action: "save" | "finalizar") => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      const estadoFinal = action === "finalizar" ? "Finalizada" : form.estado;
      await onSave(buildPayload(estadoFinal), action);
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo guardar la bitacora.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-orange-200 w-full max-w-6xl max-h-[92vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-orange-600">
              {mode === "create" ? "Nueva Bitacora Tecnica" : "Editar Bitacora Tecnica"}
            </h2>
            <p className="text-sm text-slate-600">
              Registre la intervencion con detalle linea por linea.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Datos generales</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                  <label className="block text-sm font-medium text-slate-700">Cliente *</label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.ingreso_manual_cliente}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          ingreso_manual_cliente: e.target.checked,
                          cliente_id: e.target.checked ? "" : prev.cliente_id,
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    Ingreso manual
                  </label>
                </div>

                {form.ingreso_manual_cliente ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={form.cliente_manual_nombre}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cliente_manual_nombre: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Nombre del cliente manual *"
                    />
                    <input
                      type="text"
                      value={form.cliente_manual_telefono}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cliente_manual_telefono: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Telefono (opcional)"
                    />
                    <input
                      type="text"
                      value={form.cliente_manual_direccion}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cliente_manual_direccion: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Direccion (opcional)"
                    />
                  </div>
                ) : (
                  <SearchSelect
                    clientes={clientes}
                    value={form.cliente_id}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        cliente_id: value,
                      }))
                    }
                    placeholder="Buscar cliente por nombre o ID..."
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tecnico responsable *
                </label>
                <select
                  value={form.usuario_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, usuario_id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccione tecnico</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de servicio *
                </label>
                <select
                  value={form.tipo_servicio_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tipo_servicio_id: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccione tipo de servicio</option>
                  {tiposServicio.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripcion general *
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md resize-y"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observacion general
                </label>
                <textarea
                  value={form.observacion}
                  onChange={(e) => setForm((prev) => ({ ...prev, observacion: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, estado: e.target.value as EstadoBitacora }))
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {ESTADOS_BITACORA.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="bg-white border border-orange-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">Detalle del trabajo</h3>
                <p className="text-sm text-slate-600">
                  Puede registrar lineas con costo o solo documentacion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLineas((prev) => [...prev, createEmptyLine()])}
                className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                + Agregar linea
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[920px]">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Descripcion</th>
                    <th className="px-3 py-2 text-left font-semibold w-24">Cantidad</th>
                    <th className="px-3 py-2 text-left font-semibold w-32">Unidad</th>
                    <th className="px-3 py-2 text-left font-semibold w-40">Precio unitario</th>
                    <th className="px-3 py-2 text-left font-semibold w-40">Total</th>
                    <th className="px-3 py-2 text-left font-semibold">Nota</th>
                    <th className="px-3 py-2 text-left font-semibold w-24">Accion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lineas.map((line) => {
                    const totalLinea = lineTotal(line);
                    return (
                      <tr key={line.id}>
                        <td className="px-3 py-2 align-top">
                          <textarea
                            value={line.descripcion}
                            onChange={(e) => updateLine(line.id, "descripcion", e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 border rounded resize-y"
                            placeholder="Descripcion del trabajo realizado"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={line.cantidad}
                            onChange={(e) => updateLine(line.id, "cantidad", e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            value={line.unidad}
                            onChange={(e) => updateLine(line.id, "unidad", e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                            placeholder="metros, unidad, etc."
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={line.precioUnitario}
                            onChange={(e) =>
                              updateLine(line.id, "precioUnitario", e.target.value)
                            }
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="px-2 py-1 rounded bg-slate-100 border text-slate-700 font-medium">
                            {CURRENCY.format(totalLinea || 0)}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <textarea
                            value={line.nota}
                            onChange={(e) => updateLine(line.id, "nota", e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 border rounded resize-y"
                            placeholder="Comentario opcional"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            disabled={lineas.length <= 1}
                            className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="bg-slate-100 border border-slate-300 rounded-lg px-4 py-2">
                <span className="text-sm text-slate-600 mr-2">Total estimado:</span>
                <span className="font-bold text-orange-700">{CURRENCY.format(totalEstimado)}</span>
              </div>
            </div>
          </section>

          {formError && (
            <div className="p-3 rounded-md bg-red-100 border border-red-300 text-red-700 text-sm">
              {formError}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 rounded-b-2xl">
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave("save")}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => void handleSave("finalizar")}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar y Finalizar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitacoraFormModal;
