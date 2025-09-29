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
  descripcion: string;
}

const apiHost = process.env.NEXT_PUBLIC_API_HOST || "";

const RegistrarClienteTV = () => {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    plantv_id: "",
    estado_id: "",
  });

  const [planes, setPlanes] = useState<PlanTV[]>([]);
  const [estados, setEstados] = useState<EstadoTV[]>([]);
  const [mensaje, setMensaje] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [cargandoCat, setCargandoCat] = useState<boolean>(true);

  useEffect(() => {
    const fetchCatalogos = async () => {
      setCargandoCat(true);
      try {
        const [rPlanes, rEstados] = await Promise.all([
          fetch(`${apiHost}/api/tv/planes`),
          fetch(`${apiHost}/api/tv/estados`),
        ]);

        if (!rPlanes.ok) throw new Error("No se pudieron cargar los planes TV");
        const planesData = (await rPlanes.json()) as PlanTV[];
        setPlanes(planesData);

        if (!rEstados.ok) throw new Error("No se pudieron cargar los estados");
        const estadosData = (await rEstados.json()) as EstadoTV[];
        setEstados(estadosData);

        // Defaults: primer plan y estado "Activo" (o primero)
        const defPlan = planesData[0]?.id ? String(planesData[0].id) : "";
        const activo =
          estadosData.find((e) => e.descripcion?.toLowerCase() === "activo")?.id ??
          estadosData[0]?.id ??
          1;

        setForm((prev) => ({
          ...prev,
          plantv_id: defPlan,
          estado_id: String(activo),
        }));
      } catch (e) {
        console.error(e);
        // fallback: estado 1 (Activo) sin catálogos
        setForm((prev) => ({ ...prev, estado_id: prev.estado_id || "1" }));
      } finally {
        setCargandoCat(false);
      }
    };

    fetchCatalogos();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setLoading(true);

    try {
      if (!form.nombre.trim()) {
        throw new Error("El nombre es requerido");
      }
      if (!form.plantv_id) {
        throw new Error("Selecciona un plan de TV");
      }

      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        plantv_id: Number(form.plantv_id),
        estado_id: Number(form.estado_id) || 1, // Activo por defecto
      };

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
      // reset conservando defaults
      setForm({
        nombre: "",
        telefono: "",
        direccion: "",
        plantv_id: planes[0]?.id ? String(planes[0].id) : "",
        estado_id:
          String(
            estados.find((e) => e.descripcion?.toLowerCase() === "activo")?.id ??
              estados[0]?.id ??
              1
          ),
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
            href="/pages/admin/tv/clientes"
            className="inline-flex items-center px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm"
          >
            ← Volver a Clientes TV
          </Link>
        </div>

        <div className="w-full max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-orange-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del cliente *
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

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teléfono (opcional)
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
                  Dirección (opcional)
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
                  Se generarán automáticamente los estados del año en curso con base en la fecha de registro.
                </p>
              )}
            </div>
          )}

          {/* Información adicional */}
          <div className="mt-6 p-4 bg-slate-50 rounded-md">
            <h3 className="font-medium text-slate-700 mb-2">📋 Información importante</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Los campos marcados con * son obligatorios.</li>
              <li>• La <strong>fecha de registro</strong> se guarda automáticamente.</li>
              <li>• Los <strong>estados mensuales</strong> se crean automáticamente para el año actual.</li>
              <li>• El estado por defecto es <strong>Activo</strong> (puedes cambiarlo aquí).</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default RegistrarClienteTV;
