"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";
import Link from "next/link";

interface PlanTV {
  id: number;
  nombre: string;
  precio_mensual: number;
}

interface EstadoTV {
  id: number;
  nombre: string;
  descripcion: string;
}

type Moneda = "HNL" | "USD";

const apiHost = process.env.NEXT_PUBLIC_API_HOST || "";

const RegistrarClienteTV = () => {
  const [form, setForm] = useState({
    nombre: "",
    usuario: "",
    telefono: "",
    direccion: "",
    plantv_id: "",
    estado_id: "",
    fecha_inicio: "",
    fecha_expiracion: "",
    monto_cancelado: "0.00",
    moneda: "HNL" as Moneda,
    creditos_otorgados: "0.00",
    notas: "",
  });

  const [planes, setPlanes] = useState<PlanTV[]>([]);
  const [estados, setEstados] = useState<EstadoTV[]>([]);
  const [mensaje, setMensaje] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [cargandoCat, setCargandoCat] = useState<boolean>(true);

  // Función para obtener la fecha local sin problemas de zona horaria
  const getFechaLocal = (): string => {
    const now = new Date();
    // Ajustar a la zona horaria local
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  // Función para formatear fechas al formato YYYY-MM-DD sin problemas de zona horaria
  const formatFechaParaBackend = (fecha: string): string => {
    if (!fecha) return fecha;
    
    const date = new Date(fecha);
    // Ajustar para evitar el desplazamiento de zona horaria
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    const fetchCatalogos = async () => {
      setCargandoCat(true);
      try {
        const [rPlanes, rEstados] = await Promise.all([
          fetch(`${apiHost}/api/tv/planes`),
          fetch(`${apiHost}/api/tv/estados`),
        ]);

        if (!rPlanes.ok) throw new Error("No se pudieron cargar los planes TV");
        const planesData = await rPlanes.json() as PlanTV[];
        setPlanes(planesData);

        if (!rEstados.ok) throw new Error("No se pudieron cargar los estados");
        const estadosData = await rEstados.json() as EstadoTV[];
        setEstados(estadosData);

        // Defaults: primer plan y estado "Activo"
        const defPlan = planesData[0]?.id ? String(planesData[0].id) : "";
        const activo = estadosData.find((e) => e.nombre?.toLowerCase() === "activo")?.id ?? estadosData[0]?.id ?? 1;

        // Usar fecha local sin problemas de zona horaria
        const hoy = getFechaLocal();

        setForm((prev) => ({
          ...prev,
          plantv_id: defPlan,
          estado_id: String(activo),
          fecha_inicio: hoy,
          fecha_expiracion: hoy
        }));
      } catch (e) {
        console.error(e);
        // fallback: estado 1 (Activo) sin catálogos
        const hoy = getFechaLocal();
        setForm((prev) => ({ 
          ...prev, 
          estado_id: prev.estado_id || "1",
          fecha_inicio: hoy,
          fecha_expiracion: hoy
        }));
      } finally {
        setCargandoCat(false);
      }
    };

    fetchCatalogos();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setLoading(true);

    try {
      if (!form.nombre.trim()) {
        throw new Error("El nombre es requerido");
      }
      if (!form.usuario.trim()) {
        throw new Error("El nombre de usuario es requerido");
      }
      if (!form.plantv_id) {
        throw new Error("Selecciona un plan de TV");
      }
      if (!form.fecha_inicio) {
        throw new Error("La fecha de inicio es requerida");
      }
      if (!form.fecha_expiracion) {
        throw new Error("La fecha de expiración es requerida");
      }

      // Validar que la fecha de expiración no sea menor que la de inicio
      const fechaInicio = new Date(form.fecha_inicio);
      const fechaExpiracion = new Date(form.fecha_expiracion);
      if (fechaExpiracion < fechaInicio) {
        throw new Error("La fecha de expiración no puede ser menor que la fecha de inicio");
      }

      // Formatear fechas para evitar problemas de zona horaria
      const fechaInicioAjustada = formatFechaParaBackend(form.fecha_inicio);
      const fechaExpiracionAjustada = formatFechaParaBackend(form.fecha_expiracion);

      const payload = {
        nombre: form.nombre.trim(),
        usuario: form.usuario.trim(),
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        plantv_id: Number(form.plantv_id),
        estado_id: Number(form.estado_id) || 1,
        fecha_inicio: fechaInicioAjustada,
        fecha_expiracion: fechaExpiracionAjustada,
        monto_cancelado: Number(form.monto_cancelado),
        moneda: form.moneda,
        creditos_otorgados: Number(form.creditos_otorgados),
        notas: form.notas.trim() || null,
      };

      console.log("Enviando fechas:", {
        original: { inicio: form.fecha_inicio, expiracion: form.fecha_expiracion },
        ajustado: { inicio: fechaInicioAjustada, expiracion: fechaExpiracionAjustada }
      });

      const res = await fetch(`${apiHost}/api/tv/clientes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || err?.error || "Error al registrar cliente");
      }

      setMensaje("✅ Cliente TV registrado con éxito.");
      
      // Reset form con valores por defecto
      const hoy = getFechaLocal();
      const defPlan = planes[0]?.id ? String(planes[0].id) : "";
      
      setForm({
        nombre: "",
        usuario: "",
        telefono: "",
        direccion: "",
        plantv_id: defPlan,
        estado_id: String(
          estados.find((e) => e.nombre?.toLowerCase() === "activo")?.id ??
            estados[0]?.id ??
            1
        ),
        fecha_inicio: hoy,
        fecha_expiracion: hoy,
        monto_cancelado: "0.00",
        moneda: "HNL",
        creditos_otorgados: "0.00",
        notas: "",
      });
    } catch (error) {
      console.error(error);
      setMensaje(error instanceof Error ? `❌ ${error.message}` : "❌ Error al registrar el cliente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-600">Registrar Cliente TV</h1>
            <p className="text-slate-600 mt-1">Complete la información del nuevo cliente de TV</p>
          </div>
          <Link
            href="/pages/admin/iptv/clientes"
            className="inline-flex items-center px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm"
          >
            ← Volver a Clientes TV
          </Link>
        </div>

        <div className="w-full max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-orange-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Ej: Juan Pérez"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Usuario */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre de usuario *
                  </label>
                  <input
                    type="text"
                    name="usuario"
                    placeholder="Ej: juan.perez"
                    value={form.usuario}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Este nombre será único para el cliente</p>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    placeholder="Ej: 1234-5678"
                    value={form.telefono}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    placeholder="Ej: Colonia, calle, número de casa"
                    value={form.direccion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Información del Servicio */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Información del Servicio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plan TV */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plan de TV *
                  </label>
                  <select
                    name="plantv_id"
                    value={form.plantv_id}
                    onChange={handleChange}
                    required
                    disabled={cargandoCat || planes.length === 0}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">{cargandoCat ? "Cargando planes..." : "Selecciona un plan"}</option>
                    {planes.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} — L.{Number(plan.precio_mensual).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estado *
                  </label>
                  <select
                    name="estado_id"
                    value={form.estado_id}
                    onChange={handleChange}
                    required
                    disabled={cargandoCat || estados.length === 0}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">{cargandoCat ? "Cargando estados..." : "Selecciona un estado"}</option>
                    {estados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha Inicio */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha de inicio *
                  </label>
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={form.fecha_inicio}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Fecha Expiración */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha de expiración *
                  </label>
                  <input
                    type="date"
                    name="fecha_expiracion"
                    value={form.fecha_expiracion}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-slate-500 mt-1">Seleccione manualmente la fecha de expiración del servicio</p>
                </div>
              </div>
            </div>

            {/* Información de Pago */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Información de Pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Monto Cancelado */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monto cancelado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="monto_cancelado"
                    value={form.monto_cancelado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Moneda */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Moneda
                  </label>
                  <select
                    name="moneda"
                    value={form.moneda}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="HNL">Lempiras (HNL)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                {/* Créditos Otorgados */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Créditos otorgados
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="creditos_otorgados"
                    value={form.creditos_otorgados}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notas adicionales
              </label>
              <textarea
                name="notas"
                placeholder="Observaciones, comentarios o información adicional..."
                value={form.notas}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-md resize-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || cargandoCat}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Registrando..." : "Registrar Cliente TV"}
              </button>
            </div>
          </form>

          {mensaje && (
            <div
              className={`mt-4 p-3 rounded-md text-center ${
                mensaje.startsWith("✅")
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              <p className="font-medium">{mensaje}</p>
              {mensaje.startsWith("✅") && (
                <p className="text-sm mt-1">
                  Se generarán automáticamente los estados mensuales según las fechas de inicio y expiración.
                </p>
              )}
            </div>
          )}

          {/* Información adicional */}
          <div className="mt-6 p-4 bg-slate-50 rounded-md">
            <h3 className="font-medium text-slate-700 mb-2">📋 Información importante</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Los campos marcados con * son obligatorios.</li>
              <li>• El <strong>nombre de usuario</strong> debe ser único para cada cliente.</li>
              <li>• La <strong>fecha de expiración</strong> debe ser seleccionada manualmente.</li>
              <li>• Asegúrese que la fecha de expiración sea mayor o igual a la fecha de inicio.</li>
              <li>• Los <strong>estados mensuales</strong> se crean automáticamente según el período del servicio.</li>
              <li>• El estado por defecto es <strong>Activo</strong>.</li>
              <li className="text-blue-600 font-medium">• Las fechas se ajustan automáticamente para evitar problemas de zona horaria.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default RegistrarClienteTV;