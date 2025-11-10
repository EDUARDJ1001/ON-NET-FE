"use client";

import { useEffect, useRef, useState } from "react";

interface DispositivoTV {
  id: number;
  cliente_id: number;
  descripcion: string | null;
  mac_address: string | null;
}

interface Props {
  apiHost: string;
  clienteId: number;
  clienteNombre: string;
  onClose: () => void;
  onChanged?: () => void; // se llama al crear/editar/eliminar
}

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${String(token)}` } : {};
};

const DispositivosClienteModal = ({
  apiHost,
  clienteId,
  clienteNombre,
  onClose,
  onChanged,
}: Props) => {
  const [items, setItems] = useState<DispositivoTV[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Nuevo dispositivo
  const [nuevoDesc, setNuevoDesc] = useState("");
  const [nuevoMac, setNuevoMac] = useState("");
  const [creando, setCreando] = useState(false);

  // Edición en fila
  const [editId, setEditId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editMac, setEditMac] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  // cerrar con ESC
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

  /** 🔸 Cargar dispositivos del cliente */
  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiHost}/api/tv/dispositivos/by-cliente/${clienteId}`, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error("No se pudieron cargar los dispositivos");
      const data = (await res.json()) as DispositivoTV[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar los dispositivos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const resetNew = () => {
    setNuevoDesc("");
    setNuevoMac("");
  };

  /** 🔸 Crear dispositivo */
  const handleCrear = async () => {
    setCreando(true);
    setErr(null);
    try {
      const body = {
        cliente_id: clienteId,
        descripcion: nuevoDesc || null,
        mac_address: nuevoMac || null,
      };
      const res = await fetch(`${apiHost}/api/tv/dispositivos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error al crear dispositivo");
      resetNew();
      await load();
      onChanged?.();
    } catch (e) {
      console.error(e);
      setErr("No se pudo crear el dispositivo");
    } finally {
      setCreando(false);
    }
  };

  /** 🔸 Edición */
  const startEdit = (d: DispositivoTV) => {
    setEditId(d.id);
    setEditDesc(d.descripcion || "");
    setEditMac(d.mac_address || "");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDesc("");
    setEditMac("");
  };

  const handleGuardarEdit = async () => {
    if (!editId) return;
    setGuardandoEdit(true);
    setErr(null);
    try {
      const body = {
        descripcion: editDesc || null,
        mac_address: editMac || null, // texto libre
      };
      const res = await fetch(`${apiHost}/api/tv/dispositivos/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Error al actualizar dispositivo");
      cancelEdit();
      await load();
      onChanged?.();
    } catch (e) {
      console.error(e);
      setErr("No se pudo actualizar el dispositivo");
    } finally {
      setGuardandoEdit(false);
    }
  };

  /** 🔸 Eliminar */
  const handleEliminar = async (id: number) => {
    if (!confirm("¿Eliminar este dispositivo?")) return;
    setErr(null);
    try {
      const res = await fetch(`${apiHost}/api/tv/dispositivos/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error("Error al eliminar dispositivo");
      await load();
      onChanged?.();
    } catch (e) {
      console.error(e);
      setErr("No se pudo eliminar el dispositivo");
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[1px]"
      aria-modal="true"
      role="dialog"
      aria-labelledby="dispositivos-modal-title"
    >
      <div className="w-full sm:max-w-2xl lg:max-w-3xl bg-white shadow-xl rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2 id="dispositivos-modal-title" className="text-lg sm:text-xl font-bold text-orange-600">
            Dispositivos — {clienteNombre}
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
          {/* Form nuevo */}
          <div className="mb-4 border rounded-lg p-3 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Agregar dispositivo</h3>
            {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-600 mb-1">Descripción</label>
                <input
                  type="text"
                  value={nuevoDesc}
                  onChange={(e) => setNuevoDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Sala, TV Samsung, etc."
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-600 mb-1">Direción MAC</label>
                <input
                  type="text"
                  value={nuevoMac}
                  onChange={(e) => setNuevoMac(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="00:1A:2B:3C:4D:5E"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCrear}
                  disabled={creando}
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60"
                >
                  {creando ? "Creando..." : "Agregar"}
                </button>
              </div>
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
              <p className="text-slate-600 mt-3">Cargando dispositivos...</p>
            </div>
          ) : items.length === 0 ? (
            <p className="text-slate-600">No hay dispositivos registrados para este cliente.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-left">MAC / Referencia</th>
                    <th className="px-3 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((d) => (
                    <tr key={d.id} className="hover:bg-orange-50">
                      <td className="px-3 py-2">{d.id}</td>
                      <td className="px-3 py-2">
                        {editId === d.id ? (
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="font-medium text-slate-700">{d.descripcion || "-"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editId === d.id ? (
                          <input
                            type="text"
                            value={editMac}
                            onChange={(e) => setEditMac(e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                            placeholder="Texto o referencia"
                          />
                        ) : (
                          <span className="text-slate-700">{d.mac_address || "-"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editId === d.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={handleGuardarEdit}
                              disabled={guardandoEdit}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                            >
                              {guardandoEdit ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(d)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleEliminar(d.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-3">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispositivosClienteModal;
