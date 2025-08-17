"use client";

import { useAuth } from "@/app/auth/useAuth";
import Footer from "@/app/components/footer";
import HeaderAdmin from "@/app/components/headerAdmin";
import Link from "next/link";
import { useEffect } from "react";


const HomeAdmin = () => {
    const { isAuthenticated, loading } = useAuth();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            window.location.href = "/noAuth";
        }
    }, [isAuthenticated, loading]);

    return (
        <>
            <div className="font-[Orbitron] min-h-screen bg-gradient-to-br from-orange-400 to-sky-500 text-[#1C1C1C]">
                <HeaderAdmin />
                <main className="flex flex-col items-center justify-center text-center px-4 py-20 min-h-screen bg-[#F4F8FB]">
                    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-10 border border-orange-300">
                        <h1 className="text-4xl font-extrabold text-orange-500 mb-2">
                            Bienvenido, Administrador
                        </h1>
                        <p className="text-md text-slate-700 mb-8">
                            Accede a todas las funcionalidades del sistema ON-Net Wireless.
                        </p>

                        {/* 🔧 Sección: Funciones Administrativas */}
                        <section className="mb-8 text-left">
                            <h2 className="text-2xl font-semibold text-orange-600 mb-4">
                                Funciones Administrativas
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link
                                    href="/pages/admin/clientes"
                                    className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-full font-semibold"
                                >
                                    Gestion de Clientes
                                </Link>
                                <button className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-full font-semibold">
                                    Gestión de Empleados
                                </button>
                                <button className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-full font-semibold">
                                    Reportes Generales
                                </button>
                                <button className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-full font-semibold">
                                    Configuración del Sistema
                                </button>
                            </div>
                        </section>

                        {/* 💰 Sección: Funciones de Cajero */}
                        <section className="mb-8 text-left">
                            <h2 className="text-2xl font-semibold text-orange-600 mb-4">
                                Funciones de Cajero
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-6 rounded-full font-semibold">
                                    Registrar Pago
                                </button>
                                <button className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-6 rounded-full font-semibold">
                                    Ver Historial de Pagos
                                </button>
                                <button className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-6 rounded-full font-semibold">
                                    Buscar Cliente
                                </button>
                            </div>
                        </section>

                        {/* 🛠️ Sección: Funciones de Técnico */}
                        <section className="text-left">
                            <h2 className="text-2xl font-semibold text-orange-600 mb-4">
                                Funciones de Técnico
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-full font-semibold">
                                    Ver Tareas Asignadas
                                </button>
                                <button className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-full font-semibold">
                                    Registrar Instalación
                                </button>
                                <button className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-full font-semibold">
                                    Reportar Problemas
                                </button>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
            <Footer />
        </>
    );
};

export default HomeAdmin;
