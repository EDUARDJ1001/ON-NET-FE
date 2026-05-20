"use client";

import { useEffect, useMemo, useState } from "react";
import { EstadoBitacora, IntervencionTecnica } from "../services/intervencionesService";

interface BitacoraDetailModalProps {
  data: IntervencionTecnica;
  clienteNombre: string;
  tecnicoNombre: string;
  tipoServicioNombre: string;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onChangeEstado: (estado: EstadoBitacora) => Promise<void>;
  onAnular: () => Promise<void>;
}

const CURRENCY = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const estadoBadge = (estado: string): string => {
  if (estado === "Finalizada") return "bg-blue-100 text-blue-800 border-blue-200";
  if (estado === "Facturada") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (estado === "Anulada") return "bg-red-100 text-red-800 border-red-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
};

const BitacoraDetailModal = ({
  data,
  clienteNombre,
  tecnicoNombre,
  tipoServicioNombre,
  canEdit,
  onClose,
  onEdit,
  onChangeEstado,
  onAnular,
}: BitacoraDetailModalProps) => {
  const [estadoDraft, setEstadoDraft] = useState<EstadoBitacora>(data.estado);
  const [actionError, setActionError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setEstadoDraft(data.estado);
    setActionError("");
  }, [data]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const totalDetalle = useMemo<number>(() => {
    return data.detalle_bitacora.reduce((sum, line) => sum + (line.total || 0), 0);
  }, [data.detalle_bitacora]);

  const isAnulada = data.estado === "Anulada";

  const applyEstado = async (estado: EstadoBitacora) => {
    try {
      setLoading(true);
      setActionError("");
      await onChangeEstado(estado);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnular = async () => {
    try {
      setLoading(true);
      setActionError("");
      await onAnular();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo anular la bitacora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-orange-200 w-full max-w-6xl max-h-[92vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-orange-600">Detalle de Bitacora Tecnica</h2>
            <p className="text-sm text-slate-600">Intervencion #{data.id}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase">Cliente</p>
                <p className="text-sm font-medium text-slate-800">{clienteNombre}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Tecnico</p>
                <p className="text-sm font-medium text-slate-800">{tecnicoNombre}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Tipo de servicio</p>
                <p className="text-sm font-medium text-slate-800">{tipoServicioNombre}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Fecha</p>
                <p className="text-sm font-medium text-slate-800">{data.fecha}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Estado</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${estadoBadge(
                    data.estado
                  )}`}
                >
                  {data.estado}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Total estimado</p>
                <p className="text-sm font-bold text-orange-700">{CURRENCY.format(data.total_estimado)}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-xs text-slate-500 uppercase">Descripcion</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                  {data.descripcion || "Sin descripcion"}
                </p>
              </div>
              <div className="md:col-span-3">
                <p className="text-xs text-slate-500 uppercase">Observacion</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                  {data.observacion || "Sin observacion"}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-orange-200 rounded-xl p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Detalle de trabajo</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-orange-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Descripcion</th>
                    <th className="px-3 py-2 text-left font-semibold w-24">Cantidad</th>
                    <th className="px-3 py-2 text-left font-semibold w-28">Unidad</th>
                    <th className="px-3 py-2 text-left font-semibold w-40">Precio unitario</th>
                    <th className="px-3 py-2 text-left font-semibold w-40">Total</th>
                    <th className="px-3 py-2 text-left font-semibold">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.detalle_bitacora.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                        Sin lineas en esta bitacora.
                      </td>
                    </tr>
                  ) : (
                    data.detalle_bitacora.map((line, idx) => (
                      <tr key={`${idx}-${line.descripcion}`}>
                        <td className="px-3 py-2 align-top">
                          {line.descripcion || "Sin descripcion"}
                        </td>
                        <td className="px-3 py-2 align-top">{line.cantidad}</td>
                        <td className="px-3 py-2 align-top">{line.unidad || "-"}</td>
                        <td className="px-3 py-2 align-top">
                          {CURRENCY.format(line.precioUnitario || 0)}
                        </td>
                        <td className="px-3 py-2 align-top font-medium">
                          {CURRENCY.format(line.total || 0)}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-pre-wrap">{line.nota || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-300">
                    <td colSpan={4} className="px-3 py-3 text-right font-semibold text-slate-700">
                      Total detalle
                    </td>
                    <td className="px-3 py-3 font-bold text-orange-700">
                      {CURRENCY.format(totalDetalle)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {actionError && (
            <div className="p-3 rounded-md bg-red-100 border border-red-300 text-red-700 text-sm">
              {actionError}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 rounded-b-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={estadoDraft}
                onChange={(e) => setEstadoDraft(e.target.value as EstadoBitacora)}
                className="px-3 py-2 border rounded-md text-sm"
                disabled={loading}
              >
                <option value="Borrador">Borrador</option>
                <option value="Finalizada">Finalizada</option>
                <option value="Facturada">Facturada</option>
                <option value="Anulada">Anulada</option>
              </select>
              <button
                onClick={() => void applyEstado(estadoDraft)}
                disabled={loading || estadoDraft === data.estado}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-sm"
              >
                Cambiar estado
              </button>
              {data.estado === "Borrador" && (
                <button
                  onClick={() => void applyEstado("Finalizada")}
                  disabled={loading}
                  className="px-4 py-2 rounded-md bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60 text-sm"
                >
                  Finalizar
                </button>
              )}
              {data.estado === "Finalizada" && (
                <button
                  onClick={() => void applyEstado("Facturada")}
                  disabled={loading}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-sm"
                >
                  Facturar
                </button>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={onEdit}
                disabled={!canEdit || loading}
                className="px-4 py-2 rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60 text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => void handleAnular()}
                disabled={isAnulada || loading}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 text-sm"
              >
                Anular
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitacoraDetailModal;

