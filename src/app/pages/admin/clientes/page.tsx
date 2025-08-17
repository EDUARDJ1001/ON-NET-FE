"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import ClienteModal from "./components/clienteModal";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface EstadoMensual {
  mes: number;
  anio: number;
  estado: string;
}

type EstadoNombre = "Activo" | "Inactivo" | "Suspendido" | string;

interface Cliente {
  id: number;
  nombre: string;
  ip: string;
  direccion: string;
  telefono: string;
  coordenadas: string;
  plan_id: number;
  estado_id?: number;          
  descripcion: EstadoNombre;
  estados: EstadoMensual[];
}

const badgeEstado = (nombreEstado?: EstadoNombre, estado_id?: number) => {
  const label =
    nombreEstado ??
    (estado_id === 1 ? "Activo" : estado_id === 2 ? "Inactivo" : estado_id === 3 ? "Suspendido" : "Desconocido");

  let cls =
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border";
  switch (label) {
    case "Activo":
      cls += " bg-green-50 text-green-700 border-green-200";
      break;
    case "Inactivo":
      cls += " bg-gray-100 text-gray-700 border-gray-300";
      break;
    case "Suspendido":
      cls += " bg-yellow-50 text-yellow-700 border-yellow-200";
      break;
    default:
      cls += " bg-slate-100 text-slate-600 border-slate-200";
  }
  return <span className={cls}>{label}</span>;
};

const GestionClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalCliente, setModalCliente] = useState<Cliente | null>(null);
  const [anioActual] = useState(new Date().getFullYear());
  const [aniosCliente, setAniosCliente] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const obtenerOInicializarEstados = async (clienteId: number, anio: number): Promise<EstadoMensual[]> => {
    const response = await fetch(`${apiHost}/api/estado-mensual/cliente/${clienteId}/anio/${anio}`);
    const estados = await response.json();

    if (Array.isArray(estados) && estados.length > 0) return estados;

    // Inicialización de los 12 meses si no existen
    const nuevosEstados = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const mes = i + 1;
        const res = await fetch(`${apiHost}/api/estado-mensual`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cliente_id: clienteId, mes, anio, estado: "Pendiente" }),
        });
        return res.ok ? { mes, anio, estado: "Pendiente" } : null;
      })
    );

    return (nuevosEstados.filter(Boolean) as EstadoMensual[]) ?? [];
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${apiHost}/api/clientes`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Respuesta inesperada del servidor");

      const year = new Date().getFullYear();

      const clientesConEstados = await Promise.all(
        data.map(async (cliente: Cliente) => {
          const estados = await obtenerOInicializarEstados(cliente.id, year);
          return { ...cliente, estados };
        })
      );

      setClientes(clientesConEstados);
    } catch (err) {
      console.error("Error al obtener clientes o estados:", err);
      setError("No se pudo cargar la lista de clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminLayout>
      {/* ⚠️ Empuja el contenido bajo el header fijo SOLO en desktop */}
      <div className="px-4 sm:px-6 lg:px-8 md:mt-16">
        {/* Acciones top: apila en móvil, distribuye en md+ */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-orange-600">Gestión de Clientes</h1>
          <Link
            href="/pages/admin/clientes/registrar"
            className="inline-flex justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            + Registrar Cliente
          </Link>
        </div>

        <div className="w-full bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-xl border border-orange-300">
          <p className="text-sm sm:text-base lg:text-lg text-slate-700 mb-4 sm:mb-6 text-center">
            Consulta el estado de los clientes y gestiona sus pagos.
          </p>

          {loading ? (
            <p className="text-center text-slate-500">Cargando clientes...</p>
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : clientes.length === 0 ? (
            <p className="text-center text-slate-500">No hay clientes registrados.</p>
          ) : (
            <>
              {/* ===== Mobile / Tablets pequeñas: tarjetas ===== */}
              <div className="grid gap-3 sm:gap-4 md:hidden">
                {clientes.map((cliente) => {
                  const anio = aniosCliente[cliente.id] || anioActual;
                  return (
                    <section
                      key={cliente.id}
                      className="rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition"
                      aria-label={`Cliente ${cliente.nombre}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-orange-700 truncate">
                            {cliente.nombre}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 truncate">{cliente.telefono}</p>
                          <p className="text-xs sm:text-sm text-slate-500 break-words">
                            {cliente.direccion}
                          </p>
                        </div>
                        <div className="shrink-0">{badgeEstado(cliente.descripcion, cliente.estado_id)}</div>
                      </div>

                      {/* Controles de año */}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[11px] sm:text-xs font-medium text-slate-500">Año: {anio}</span>
                        <div className="flex gap-2 text-[11px] sm:text-xs">
                          <button
                            type="button"
                            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 active:scale-[0.98]"
                            onClick={() => setAniosCliente((prev) => ({ ...prev, [cliente.id]: anio - 1 }))}
                          >
                            ← Año anterior
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 active:scale-[0.98]"
                            onClick={() => setAniosCliente((prev) => ({ ...prev, [cliente.id]: anio + 1 }))}
                          >
                            Año siguiente →
                          </button>
                        </div>
                      </div>

                      {/* Estados mensuales */}
                      <div className="mt-3 -mx-1 overflow-x-auto">
                        <div className="flex items-center gap-2 px-1 py-1">
                          {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sept","Oct","Nov","Dic"].map((mesTxt, i) => {
                            const e = cliente.estados?.find((x) => x.mes === i + 1 && x.anio === anio);
                            let cls = "text-slate-400 border-slate-300";
                            if (e?.estado === "Pagado") cls = "text-green-700 border-green-300";
                            else if (e?.estado === "Pagado Parcial") cls = "text-yellow-600 border-yellow-300";
                            else if (e?.estado === "Pendiente") cls = "text-red-600 border-red-300";
                            return (
                              <div
                                key={i}
                                className={`min-w-[48px] sm:min-w-[56px] text-center border rounded-md px-2 py-1 text-[11px] sm:text-xs ${cls}`}
                                title={e?.estado || "Sin estado"}
                              >
                                <div className="font-medium">{mesTxt}</div>
                                <div className="leading-4">{(e?.estado && e.estado.split(" ")[0]) || "-"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Acción */}
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs sm:text-sm"
                          onClick={() => setModalCliente(cliente)}
                        >
                          VER MÁS
                        </button>
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* ===== md+ : tabla completa ===== */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-sm text-left border-collapse border border-gray-300">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="px-3 py-2 border">Nombre</th>
                        <th className="px-3 py-2 border">Teléfono</th>
                        <th className="px-3 py-2 border">Dirección</th>
                        <th className="px-3 py-2 border">Estado</th>
                        <th className="px-3 py-2 border">Estados de Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((cliente) => (
                        <tr key={cliente.id} className="hover:bg-orange-50">
                          <td className="px-3 py-2 border font-medium text-orange-700">{cliente.nombre}</td>
                          <td className="px-3 py-2 border">{cliente.telefono}</td>
                          <td className="px-3 py-2 border break-words">{cliente.direccion}</td>
                          <td className="px-3 py-2 border">{badgeEstado(cliente.descripcion, cliente.estado_id)}</td>

                          <td className="px-3 py-2 border">
                            {cliente.estados && cliente.estados.length > 0 ? (
                              <div className="overflow-x-auto">
                                <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-medium text-slate-500">
                                    Año: {aniosCliente[cliente.id] || anioActual}
                                  </span>
                                  <div className="flex gap-2 text-xs">
                                    <button
                                      type="button"
                                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                      onClick={() =>
                                        setAniosCliente((prev) => ({
                                          ...prev,
                                          [cliente.id]: (prev[cliente.id] || anioActual) - 1,
                                        }))
                                      }
                                    >
                                      ← Año anterior
                                    </button>
                                    <button
                                      type="button"
                                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                                      onClick={() =>
                                        setAniosCliente((prev) => ({
                                          ...prev,
                                          [cliente.id]: (prev[cliente.id] || anioActual) + 1,
                                        }))
                                      }
                                    >
                                      Año siguiente →
                                    </button>
                                  </div>
                                </div>

                                <table className="table-auto border border-collapse text-center text-xs w-full">
                                  <thead className="bg-slate-100">
                                    <tr>
                                      {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sept","Oct","Nov","Dic"].map((mes, idx) => (
                                        <th key={idx} className="px-1 py-1 border border-slate-300 min-w-[40px]">
                                          {mes}
                                        </th>
                                      ))}
                                      <th className="px-2 py-1 border border-slate-300">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      {Array.from({ length: 12 }, (_, i) => {
                                        const anio = aniosCliente[cliente.id] || anioActual;
                                        const estado = cliente.estados.find((e) => e.mes === i + 1 && e.anio === anio);
                                        let color = "text-gray-400";
                                        if (estado?.estado === "Pagado") color = "text-green-600 font-semibold";
                                        else if (estado?.estado === "Pagado Parcial") color = "text-yellow-500 font-semibold";
                                        else if (estado?.estado === "Pendiente") color = "text-red-500 font-semibold";
                                        return (
                                          <td key={i} className={`border px-1 py-1 ${color}`}>
                                            {estado?.estado?.split(" ")[0] || "-"}
                                          </td>
                                        );
                                      })}
                                      <td className="border px-2 py-1 text-center">
                                        <button
                                          type="button"
                                          className="text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
                                          onClick={() => setModalCliente(cliente)}
                                        >
                                          VER MÁS
                                        </button>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Sin historial</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalCliente && (
        <ClienteModal
          cliente={modalCliente}
          onClose={() => setModalCliente(null)}
          onClienteUpdated={() => {
            setModalCliente(null);
            fetchClientes();
          }}
          apiHost={apiHost}
        />
      )}
    </AdminLayout>
  );
};

export default GestionClientes;
