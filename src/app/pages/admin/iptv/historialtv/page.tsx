"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";
import SearchSelect from "@/app/components/searchSelect";

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

// =======================
// Interfaces
// =======================
interface PagoTv {
  id: number;
  clientetv_id: number;
  monto: number;
  fecha_pago: string;
  observacion: string | null;
}

interface ClienteTv {
  id: number;
  nombre: string;
}

interface Filtros {
  cliente: string;
  mes: string;
  anio: string;
}

// =======================
// Valores por defecto
// =======================
const hoy = new Date();
const mesActual = String(hoy.getMonth() + 1);
const anioActual = String(hoy.getFullYear());

// =======================
// Rutas API reales
// =======================
const API_PAGOS_TV = `${apiHost}/api/pagos-tv/pagos-tv`;
// 🔁 Ajustado: coincide con tu comentario "POST /api/tv/clientes"
const API_CLIENTES_TV = `${apiHost}/api/tv/clientes`;

// =======================
// Componente principal
// =======================
const VerPagosTv = () => {
  const [pagos, setPagos] = useState<PagoTv[]>([]);
  const [clientes, setClientes] = useState<ClienteTv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [filtros, setFiltros] = useState<Filtros>({
    cliente: "",
    mes: mesActual,
    anio: anioActual,
  });

  // Load inicial
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([cargarClientesTv(), cargarPagosTv()]);
    } catch (e) {
      console.error(e);
      setError("Error cargando datos iniciales");
    } finally {
      setLoading(false);
    }
  };

  // ================
  // API Calls
  // ================
  const cargarPagosTv = async () => {
    const res = await fetch(API_PAGOS_TV);
    if (!res.ok) throw new Error("Error al obtener pagos TV");
    setPagos(await res.json());
  };

  const cargarClientesTv = async () => {
    const res = await fetch(API_CLIENTES_TV);
    if (!res.ok) throw new Error("Error al obtener clientes TV");
    setClientes(await res.json());
  };

  const limpiarFiltros = () => {
    setFiltros({
      cliente: "",
      mes: mesActual,
      anio: anioActual,
    });
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return "";

    // Caso simple YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [y, m, d] = fecha.split("-");
      return `${d}/${m}/${y}`; // dd/mm/yyyy
    }

    // ISO u otros formatos: 2025-11-16T06:00:00.000Z
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha; // por si llega algo raro

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const formatMonto = (monto: number) =>
    new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: "HNL",
    }).format(monto);

  const getNombreClienteTv = (id: number) => {
    return clientes.find((c) => c.id === id)?.nombre || `Cliente TV #${id}`;
  };

  const getNombreMes = (mes: number) => {
    const meses = [
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
    return meses[mes - 1] || mes;
  };

  const pagosFiltrados = pagos.filter((pago) => {
    const { cliente, mes, anio } = filtros;

    // filtro cliente
    if (cliente && pago.clientetv_id !== parseInt(cliente)) return false;

    // la API está devolviendo ISO, pero el split por "-" sigue sirviendo para año/mes
    const [y, m] = pago.fecha_pago.split("-").map((part) => parseInt(part, 10));

    if (mes && Number(mes) !== m) return false;
    if (anio && Number(anio) !== y) return false;

    return true;
  });

  const totalMonto = pagosFiltrados.reduce((sum, p) => sum + Number(p.monto), 0);

  const nombreClienteFiltro =
    filtros.cliente && !isNaN(parseInt(filtros.cliente))
      ? getNombreClienteTv(parseInt(filtros.cliente))
      : "";

  // Loading
  if (loading)
    return (
      <AdminLayout>
        <div className="p-10 text-center">Cargando pagos TV...</div>
      </AdminLayout>
    );

  // =======================
  // Render
  // =======================
  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-orange-600">Pagos TV</h1>
            <p className="text-slate-600">
              Mes {getNombreMes(Number(filtros.mes))} {filtros.anio}
            </p>
            {nombreClienteFiltro && (
              <p className="text-slate-600 text-sm">
                Cliente: <span className="font-semibold">{nombreClienteFiltro}</span>
              </p>
            )}
          </div>

          <Link
            href="/pages/admin/iptv/caja"
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
          >
            + Registrar Pago TV
          </Link>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cliente */}
            <div>
              <label className="text-sm font-medium">Cliente TV</label>
              <SearchSelect
                clientes={clientes}
                value={filtros.cliente}
                onChange={(clienteId) =>
                  setFiltros({ ...filtros, cliente: clienteId })
                }
                placeholder="Buscar cliente TV..."
              />
            </div>
            {/* Mes */}
            <div>
              <label className="text-sm font-medium">Mes</label>
              <select
                value={filtros.mes}
                onChange={(e) =>
                  setFiltros({ ...filtros, mes: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {getNombreMes(m)}
                  </option>
                ))}
              </select>
            </div>
            {/* Año */}
            <div>
              <label className="text-sm font-medium">Año</label>
              <input
                type="number"
                value={filtros.anio}
                min="2000"
                max="2100"
                className="w-full px-3 py-2 border rounded"
                onChange={(e) =>
                  setFiltros({ ...filtros, anio: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setFiltros({ ...filtros })}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Aplicar Filtros
            </button>

            <button
              onClick={limpiarFiltros}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 shadow-md rounded-lg">
            <p className="text-sm text-slate-600">Pagos TV</p>
            <p className="text-2xl font-bold text-orange-600">
              {pagosFiltrados.length}
            </p>
          </div>

          <div className="bg-white p-4 shadow-md rounded-lg">
            <p className="text-sm text-slate-600">Monto total</p>
            <p className="text-2xl font-bold text-green-600">
              {formatMonto(totalMonto)}
            </p>
          </div>

          <div className="bg-white p-4 shadow-md rounded-lg">
            <p className="text-sm text-slate-600">Clientes Únicos</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(pagosFiltrados.map((p) => p.clientetv_id)).size}
            </p>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">
                    Cliente TV
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">
                    Fecha Pago
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold">
                    Observación
                  </th>
                </tr>
              </thead>

              <tbody>
                {pagosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-4 text-center text-gray-600"
                    >
                      No se encontraron pagos TV
                    </td>
                  </tr>
                ) : (
                  pagosFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{p.id}</td>
                      <td className="px-4 py-3">
                        {getNombreClienteTv(p.clientetv_id)}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-600">
                        {formatMonto(p.monto)}
                      </td>
                      <td className="px-4 py-3">
                        {formatFecha(p.fecha_pago)}
                      </td>
                      <td className="px-4 py-3">{p.observacion || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default VerPagosTv;
