"use client";

import { useState } from "react";

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  cargo_id: number;
}

interface Cargo {
  id: number;
  nombreCargo: string;
}

interface Props {
  empleado: Empleado;
  cargos: Cargo[];
  apiHost: string;
  onClose: () => void;
  onEmpleadoUpdated: () => void;
}

const EmpleadoModal = ({ empleado, cargos, apiHost, onClose, onEmpleadoUpdated }: Props) => {
  const [form, setForm] = useState({ ...empleado, password: "" });
  const [mensaje, setMensaje] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const guardarCambios = async () => {
    try {
      const { password, ...datos } = form;
      const body = password ? form : datos;

      const res = await fetch(`${apiHost}/api/empleados/${empleado.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Error al actualizar");

      setMensaje("✅ Cambios guardados");
      onEmpleadoUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error al guardar");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg relative shadow-lg">
        <button onClick={onClose} className="absolute top-2 right-3 text-gray-500 text-xl">×</button>

        <h2 className="text-xl font-bold text-orange-600 mb-4">Editar Empleado</h2>

        <div className="space-y-3">
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Nombre"
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="text"
            name="apellido"
            value={form.apellido}
            onChange={handleChange}
            placeholder="Apellido"
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Usuario"
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Nueva contraseña (opcional)"
            className="w-full border px-3 py-2 rounded"
          />
          <select
            name="cargo_id"
            value={form.cargo_id}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            {cargos.map((cargo) => (
              <option key={cargo.id} value={cargo.id}>
                {cargo.nombreCargo}
              </option>
            ))}
          </select>
        </div>

        {mensaje && <p className="text-sm mt-3 text-center text-orange-600">{mensaje}</p>}

        <div className="mt-6 text-right">
          <button
            onClick={guardarCambios}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmpleadoModal;
