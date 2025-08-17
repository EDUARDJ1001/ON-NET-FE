"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/adminLayout";

interface Cargo {
    id: number;
    nombreCargo: string;
}

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

const RegistrarUsuario = () => {
    const [form, setForm] = useState({
        nombre: "",
        apellido: "",
        cargo_id: "",
        username: "",
        password: "",
    });

    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [mensaje, setMensaje] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [showPass, setShowPass] = useState<boolean>(false);

    // Cargar cargos
    useEffect(() => {
        const fetchCargos = async () => {
            try {
                const res = await fetch(`${apiHost}/api/cargos`);
                const data = await res.json();
                setCargos(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error al obtener cargos:", err);
                setError("No se pudieron cargar los cargos. Intenta de nuevo.");
            }
        };
        fetchCargos();
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensaje("");
        setError("");

        // Validaciones mínimas en frontend
        if (!form.nombre.trim() || !form.apellido.trim() || !form.username.trim()) {
            setError("Completa nombre, apellido y username.");
            return;
        }
        if (!form.cargo_id) {
            setError("Selecciona un cargo.");
            return;
        }
        if (form.password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${apiHost}/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: form.nombre.trim(),
                    apellido: form.apellido.trim(),
                    cargo_id: Number(form.cargo_id),
                    username: form.username.trim(),
                    password: form.password,
                }),
            });

            if (!res.ok) {
                // Manejo común: 409 por username duplicado, 400 por validación
                if (res.status === 409) {
                    setError("El nombre de usuario ya existe. Elige otro.");
                } else {
                    const msg = await res.text();
                    setError(msg || "Error al crear usuario.");
                }
                return;
            }

            setMensaje("✅ Usuario creado con éxito.");
            setForm({
                nombre: "",
                apellido: "",
                cargo_id: "",
                username: "",
                password: "",
            });
        } catch (err) {
            console.error(err);
            setError("❌ Error de red al registrar el usuario.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8 md:mt-16">
                <div className="w-full max-w-3xl mx-auto bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-xl border border-orange-300">
                    <h1 className="text-2xl sm:text-3xl font-bold text-orange-500 mb-4 sm:mb-6 text-center">
                        Registrar Usuario
                    </h1>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                            <input
                                type="text"
                                name="nombre"
                                placeholder="Nombre"
                                value={form.nombre}
                                onChange={handleChange}
                                required
                                autoComplete="given-name"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                            <input
                                type="text"
                                name="apellido"
                                placeholder="Apellido"
                                value={form.apellido}
                                onChange={handleChange}
                                required
                                autoComplete="family-name"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                            <input
                                type="text"
                                name="username"
                                placeholder="Usuario"
                                value={form.username}
                                onChange={handleChange}
                                required
                                autoComplete="username"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                            <select
                                name="cargo_id"
                                value={form.cargo_id}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                            >
                                <option value="">Selecciona un cargo</option>
                                {cargos.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombreCargo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                            <div className="flex gap-2">
                                <input
                                    type={showPass ? "text" : "password"}
                                    name="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-300"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass((v) => !v)}
                                    className="px-3 py-2 border rounded-md text-xs hover:bg-slate-50"
                                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPass ? "Ocultar" : "Ver"}
                                </button>
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
                            >
                                {loading ? "Registrando..." : "Registrar Usuario"}
                            </button>
                        </div>
                    </form>

                    {(mensaje || error) && (
                        <div className="mt-4 text-center">
                            {mensaje && <p className="text-sm font-semibold text-green-600">{mensaje}</p>}
                            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default RegistrarUsuario;
