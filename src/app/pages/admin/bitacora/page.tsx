"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import AdminLayout from "@/app/components/adminLayout";
import Pagination from "@/app/components/pagination";
import SearchDropdown from "@/app/components/searchBar";
import BitacoraFormModal from "./components/BitacoraFormModal";
import BitacoraDetailModal from "./components/BitacoraDetailModal";
import {
  CatalogItem,
  ESTADOS_BITACORA,
  EstadoBitacora,
  IntervencionPayload,
  IntervencionTecnica,
  anularIntervencion,
  createIntervencion,
  getClientesCatalogo,
  getIntervencionById,
  getIntervencionesTecnicas,
  getTiposServicioCatalogo,
  getUsuariosCatalogo,
  patchEstadoIntervencion,
  updateIntervencion,
} from "./services/intervencionesService";

type LoadErrors = {
  bitacoras?: string;
  clientes?: string;
  usuarios?: string;
  tipos?: string;
};

const CURRENCY = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const badgeEstado = (estado: EstadoBitacora): string => {
  if (estado === "Finalizada") return "bg-blue-50 text-blue-700 border-blue-200";
  if (estado === "Facturada") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (estado === "Anulada") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const canEditIntervencion = (estado: EstadoBitacora): boolean =>
  estado !== "Facturada" && estado !== "Anulada";

const sortByFechaDesc = (a: IntervencionTecnica, b: IntervencionTecnica): number => {
  if (a.fecha < b.fecha) return 1;
  if (a.fecha > b.fecha) return -1;
  return b.id - a.id;
};

const MANUAL_CLIENT_REGEX = /\[CLIENTE_MANUAL\]([\s\S]*?)\[\/CLIENTE_MANUAL\]/i;

const extractManualClientName = (observacion?: string): string => {
  if (!observacion) return "";
  const match = observacion.match(MANUAL_CLIENT_REGEX);
  if (!match) return "";

  const line = (match[1] || "")
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith("nombre:"));

  if (!line) return "";
  return line.split(":").slice(1).join(":").trim();
};

const BitacoraPage = () => {
  const [intervenciones, setIntervenciones] = useState<IntervencionTecnica[]>([]);
  const [clientes, setClientes] = useState<CatalogItem[]>([]);
  const [usuarios, setUsuarios] = useState<CatalogItem[]>([]);
  const [tiposServicio, setTiposServicio] = useState<CatalogItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadErrors, setLoadErrors] = useState<LoadErrors>({});

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [activeRecord, setActiveRecord] = useState<IntervencionTecnica | null>(null);
  const [detailRecord, setDetailRecord] = useState<IntervencionTecnica | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<number | null>(null);

  const clienteMap = useMemo(() => {
    return new Map<number, string>(clientes.map((cliente) => [cliente.id, cliente.nombre]));
  }, [clientes]);

  const usuarioMap = useMemo(() => {
    return new Map<number, string>(usuarios.map((usuario) => [usuario.id, usuario.nombre]));
  }, [usuarios]);

  const tipoServicioMap = useMemo(() => {
    return new Map<number, string>(tiposServicio.map((tipo) => [tipo.id, tipo.nombre]));
  }, [tiposServicio]);

  const catalogosListos = useMemo(() => {
    return usuarios.length > 0 && tiposServicio.length > 0;
  }, [usuarios.length, tiposServicio.length]);

  const getClienteNombre = useCallback(
    (item: IntervencionTecnica): string => {
      if (item.cliente_nombre?.trim()) return item.cliente_nombre;
      if (item.cliente_id) return clienteMap.get(item.cliente_id) || `Cliente #${item.cliente_id}`;

      const manualName = extractManualClientName(item.observacion);
      if (manualName) return `Cliente manual: ${manualName}`;
      return "Cliente manual";
    },
    [clienteMap]
  );

  const getTecnicoNombre = useCallback(
    (item: IntervencionTecnica): string =>
      item.tecnico_nombre || usuarioMap.get(item.usuario_id) || `Usuario #${item.usuario_id}`,
    [usuarioMap]
  );

  const getTipoServicioNombre = useCallback(
    (item: IntervencionTecnica): string =>
      item.tipo_servicio_nombre ||
      tipoServicioMap.get(item.tipo_servicio_id) ||
      `Tipo #${item.tipo_servicio_id}`,
    [tipoServicioMap]
  );

  const cargarBitacoras = async (): Promise<void> => {
    const list = await getIntervencionesTecnicas();
    setIntervenciones([...list].sort(sortByFechaDesc));
  };

  const cargarTodo = async (): Promise<void> => {
    setLoading(true);
    setLoadErrors({});

    const [rBitacoras, rClientes, rUsuarios, rTipos] = await Promise.allSettled([
      getIntervencionesTecnicas(),
      getClientesCatalogo(),
      getUsuariosCatalogo(),
      getTiposServicioCatalogo(),
    ]);

    const errors: LoadErrors = {};

    if (rBitacoras.status === "fulfilled") {
      setIntervenciones([...rBitacoras.value].sort(sortByFechaDesc));
    } else {
      setIntervenciones([]);
      errors.bitacoras = rBitacoras.reason instanceof Error
        ? rBitacoras.reason.message
        : "No se pudieron cargar las bitacoras.";
    }

    if (rClientes.status === "fulfilled") {
      setClientes(rClientes.value);
    } else {
      setClientes([]);
      errors.clientes = "No se pudieron cargar los clientes.";
    }

    if (rUsuarios.status === "fulfilled") {
      setUsuarios(rUsuarios.value);
    } else {
      setUsuarios([]);
      errors.usuarios = "No se pudieron cargar los tecnicos.";
    }

    if (rTipos.status === "fulfilled") {
      setTiposServicio(rTipos.value);
    } else {
      setTiposServicio([]);
      errors.tipos = "No se pudieron cargar los tipos de servicio.";
    }

    setLoadErrors(errors);
    setLoading(false);
  };

  useEffect(() => {
    void cargarTodo();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    let base = [...intervenciones];
    if (q) {
      base = base.filter((item) => {
        const cliente = getClienteNombre(item).toLowerCase();
        const tecnico = getTecnicoNombre(item).toLowerCase();
        const tipo = getTipoServicioNombre(item).toLowerCase();
        const desc = item.descripcion.toLowerCase();
        const estado = item.estado.toLowerCase();

        return (
          cliente.includes(q) ||
          tecnico.includes(q) ||
          tipo.includes(q) ||
          desc.includes(q) ||
          estado.includes(q)
        );
      });
    }

    if (estadoFilter) {
      base = base.filter((item) => item.estado === estadoFilter);
    }

    return base;
  }, [
    intervenciones,
    searchTerm,
    estadoFilter,
    getClienteNombre,
    getTecnicoNombre,
    getTipoServicioNombre,
  ]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirst, indexOfLast);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter]);

  const openCreate = () => {
    setFormMode("create");
    setActiveRecord(null);
    setFormOpen(true);
  };

  const openEdit = async (item: IntervencionTecnica) => {
    if (!canEditIntervencion(item.estado)) return;
    if (!catalogosListos) return;

    try {
      setLoadingActionId(item.id);
      const full = await getIntervencionById(item.id);
      setFormMode("edit");
      setActiveRecord(full);
      setFormOpen(true);
    } catch {
      await Swal.fire("Error", "No se pudo cargar la bitacora para editar.", "error");
    } finally {
      setLoadingActionId(null);
    }
  };

  const openDetail = async (item: IntervencionTecnica) => {
    try {
      setLoadingActionId(item.id);
      const full = await getIntervencionById(item.id);
      setDetailRecord(full);
    } catch {
      await Swal.fire("Error", "No se pudo cargar el detalle de la bitacora.", "error");
    } finally {
      setLoadingActionId(null);
    }
  };

  const refreshDetailIfNeeded = async (id: number): Promise<void> => {
    if (!detailRecord || detailRecord.id !== id) return;
    try {
      const updated = await getIntervencionById(id);
      setDetailRecord(updated);
    } catch {
      setDetailRecord(null);
    }
  };

  const handleSaveForm = async (
    payload: IntervencionPayload,
    action: "save" | "finalizar"
  ): Promise<void> => {
    if (formMode === "create") {
      await createIntervencion(payload);
      await cargarBitacoras();
      await Swal.fire(
        "Exito",
        action === "finalizar"
          ? "Bitacora creada y finalizada correctamente."
          : "Bitacora creada correctamente.",
        "success"
      );
      return;
    }

    if (!activeRecord) return;

    await updateIntervencion(activeRecord.id, payload);
    await cargarBitacoras();
    await refreshDetailIfNeeded(activeRecord.id);
    await Swal.fire(
      "Exito",
      action === "finalizar"
        ? "Bitacora actualizada y finalizada correctamente."
        : "Bitacora actualizada correctamente.",
      "success"
    );
  };

  const executeChangeEstado = async (
    item: IntervencionTecnica,
    estado: EstadoBitacora
  ): Promise<void> => {
    await patchEstadoIntervencion(item.id, estado);
    await cargarBitacoras();
    await refreshDetailIfNeeded(item.id);
  };

  const promptChangeEstado = async (item: IntervencionTecnica) => {
    const inputOptions = ESTADOS_BITACORA.reduce<Record<string, string>>((acc, estado) => {
      acc[estado] = estado;
      return acc;
    }, {});

    const result = await Swal.fire({
      title: "Cambiar estado",
      input: "select",
      inputOptions,
      inputValue: item.estado,
      showCancelButton: true,
      confirmButtonText: "Actualizar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed || !result.value) return;

    const nuevoEstado = result.value as EstadoBitacora;
    if (nuevoEstado === item.estado) return;

    try {
      setLoadingActionId(item.id);
      await executeChangeEstado(item, nuevoEstado);
      await Swal.fire("Exito", `Estado actualizado a ${nuevoEstado}.`, "success");
    } catch (e) {
      await Swal.fire(
        "Error",
        e instanceof Error ? e.message : "No se pudo actualizar el estado.",
        "error"
      );
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAnular = async (item: IntervencionTecnica) => {
    const result = await Swal.fire({
      title: "Anular bitacora",
      html: `Se anulara la bitacora #<strong>${item.id}</strong>.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, anular",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      setLoadingActionId(item.id);
      await anularIntervencion(item.id);
      await cargarBitacoras();
      if (detailRecord?.id === item.id) setDetailRecord(null);
      await Swal.fire("Exito", "Bitacora anulada correctamente.", "success");
    } catch (e) {
      await Swal.fire(
        "Error",
        e instanceof Error ? e.message : "No se pudo anular la bitacora.",
        "error"
      );
    } finally {
      setLoadingActionId(null);
    }
  };

  const searchItems = useMemo(() => {
    return intervenciones.map((item) => getClienteNombre(item));
  }, [intervenciones, getClienteNombre]);

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">
              Bitacora Tecnica
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              Registre y gestione intervenciones tecnicas con detalle por lineas.
            </p>
          </div>

          <button
            onClick={openCreate}
            disabled={!catalogosListos}
            className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-60"
            title={!catalogosListos ? "Debe cargar catalogos para crear." : "Nueva bitacora"}
          >
            + Nueva bitacora
          </button>
        </div>

        <div className="mb-4">
          <SearchDropdown
            items={searchItems}
            placeholder="Buscar por cliente, tecnico, servicio, descripcion o estado..."
            onSearch={(value) => setSearchTerm(value)}
            className="w-full max-w-md"
          />
        </div>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_BITACORA.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setEstadoFilter("");
                setSearchTerm("");
              }}
              className="text-xs px-3 py-2 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          </div>

          <p className="text-sm text-slate-600">
            Mostrando <span className="font-semibold">{filtered.length}</span> de{" "}
            <span className="font-semibold">{intervenciones.length}</span> bitacoras
          </p>
        </div>

        {(loadErrors.clientes || loadErrors.usuarios || loadErrors.tipos) && (
          <div className="mb-6 p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm space-y-1">
            <p className="font-semibold">Catalogos pendientes:</p>
            {loadErrors.clientes && <p>- {loadErrors.clientes}</p>}
            {loadErrors.usuarios && <p>- {loadErrors.usuarios}</p>}
            {loadErrors.tipos && <p>- {loadErrors.tipos}</p>}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto" />
              <p className="text-slate-600 mt-4">Cargando bitacoras...</p>
            </div>
          ) : loadErrors.bitacoras ? (
            <div className="text-center py-12">
              <p className="text-red-600 text-lg mb-4">{loadErrors.bitacoras}</p>
              <button
                onClick={() => void cargarTodo()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Reintentar
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 text-lg mb-4">
                No hay bitacoras registradas con los filtros actuales.
              </p>
              <button
                onClick={openCreate}
                disabled={!catalogosListos}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
              >
                Crear primera bitacora
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:hidden">
                {currentItems.map((item) => {
                  const disableEdit = !canEditIntervencion(item.estado) || !catalogosListos;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-base font-semibold text-orange-700">
                            #{item.id} - {getClienteNombre(item)}
                          </h3>
                          <p className="text-xs text-slate-500">{item.fecha}</p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeEstado(
                            item.estado
                          )}`}
                        >
                          {item.estado}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        Tecnico: <span className="font-medium">{getTecnicoNombre(item)}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Tipo: <span className="font-medium">{getTipoServicioNombre(item)}</span>
                      </p>
                      <p className="text-sm text-slate-700 mt-2 truncate">{item.descripcion}</p>
                      <p className="text-sm font-semibold text-orange-700 mt-2">
                        {CURRENCY.format(item.total_estimado)}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => void openDetail(item)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          Ver detalle
                        </button>
                        <button
                          onClick={() => void openEdit(item)}
                          disabled={disableEdit || loadingActionId === item.id}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs disabled:opacity-60"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => void promptChangeEstado(item)}
                          disabled={loadingActionId === item.id}
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs disabled:opacity-60"
                        >
                          Estado
                        </button>
                        <button
                          onClick={() => void handleAnular(item)}
                          disabled={item.estado === "Anulada" || loadingActionId === item.id}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs disabled:opacity-60"
                        >
                          Anular
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto rounded-lg">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                        <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                        <th className="px-4 py-3 text-left font-semibold">Tecnico</th>
                        <th className="px-4 py-3 text-left font-semibold">Tipo servicio</th>
                        <th className="px-4 py-3 text-left font-semibold">Descripcion</th>
                        <th className="px-4 py-3 text-left font-semibold">Estado</th>
                        <th className="px-4 py-3 text-left font-semibold">Total estimado</th>
                        <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentItems.map((item) => {
                        const disableEdit = !canEditIntervencion(item.estado) || !catalogosListos;
                        return (
                          <tr key={item.id} className="hover:bg-orange-50">
                            <td className="px-4 py-3">{item.fecha}</td>
                            <td className="px-4 py-3 font-medium text-orange-700">
                              {getClienteNombre(item)}
                            </td>
                            <td className="px-4 py-3">{getTecnicoNombre(item)}</td>
                            <td className="px-4 py-3">{getTipoServicioNombre(item)}</td>
                            <td className="px-4 py-3 max-w-sm truncate">{item.descripcion}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeEstado(
                                  item.estado
                                )}`}
                              >
                                {item.estado}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-orange-700">
                              {CURRENCY.format(item.total_estimado)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => void openDetail(item)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                >
                                  Ver detalle
                                </button>
                                <button
                                  onClick={() => void openEdit(item)}
                                  disabled={disableEdit || loadingActionId === item.id}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs disabled:opacity-60"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => void promptChangeEstado(item)}
                                  disabled={loadingActionId === item.id}
                                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs disabled:opacity-60"
                                >
                                  Estado
                                </button>
                                <button
                                  onClick={() => void handleAnular(item)}
                                  disabled={item.estado === "Anulada" || loadingActionId === item.id}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs disabled:opacity-60"
                                >
                                  Anular
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {filtered.length > itemsPerPage && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={filtered.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {formOpen && (
        <BitacoraFormModal
          mode={formMode}
          initialData={activeRecord}
          clientes={clientes}
          usuarios={usuarios}
          tiposServicio={tiposServicio}
          onClose={() => setFormOpen(false)}
          onSave={handleSaveForm}
        />
      )}

      {detailRecord && (
        <BitacoraDetailModal
          data={detailRecord}
          clienteNombre={getClienteNombre(detailRecord)}
          tecnicoNombre={getTecnicoNombre(detailRecord)}
          tipoServicioNombre={getTipoServicioNombre(detailRecord)}
          canEdit={canEditIntervencion(detailRecord.estado) && catalogosListos}
          onClose={() => setDetailRecord(null)}
          onEdit={() => {
            setDetailRecord(null);
            void openEdit(detailRecord);
          }}
          onChangeEstado={async (estado) => {
            await executeChangeEstado(detailRecord, estado);
          }}
          onAnular={async () => {
            await handleAnular(detailRecord);
          }}
        />
      )}
    </AdminLayout>
  );
};

export default BitacoraPage;
