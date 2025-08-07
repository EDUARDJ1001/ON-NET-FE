"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

interface Plan {
    id: number;
    nombre: string;
    precio_mensual: number;
    descripcion: string;
}

const PlanesPage = () => {
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const apiHost = process.env.NEXT_PUBLIC_API_HOST;

    useEffect(() => {
        const fetchPlanes = async () => {
            try {
                const response = await fetch(`${apiHost}/api/planes`);
                const data = await response.json();
                setPlanes(data);
            } catch (error) {
                console.error("Error al obtener los planes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlanes();
    }, [apiHost]);

    return (
        <>
            <Head>
                <title>Planes de Internet | ON-NET WIRELESS</title>
            </Head>

            <div className="min-h-screen bg-white text-gray-800">
                {/* Banner */}
                <header className="relative bg-[#00AEEF] text-white py-6 px-4 shadow-md text-center">
                    {/* Botón en escritorio (esquina sup. derecha) */}
                    <div className="absolute top-4 right-4 hidden sm:block">
                        <Link
                            href="/info"
                            className="bg-white text-[#00AEEF] hover:bg-gray-100 font-semibold px-4 py-2 rounded-full shadow-md transition text-sm"
                        >
                            Regresar a Inicio
                        </Link>
                    </div>

                    <h1 className="text-3xl font-bold mt-2">Planes de Internet</h1>
                    <p className="text-lg mt-2">
                        Conoce nuestros planes disponibles y elige el que más se adapte a ti
                    </p>

                    {/* Botón en móviles (debajo del título) */}
                    <div className="mt-4 sm:hidden">
                        <Link
                            href="/info"
                            className="bg-white text-[#00AEEF] hover:bg-gray-100 font-semibold px-4 py-2 rounded-full shadow-md transition text-sm"
                        >
                            Regresar a Inicio
                        </Link>
                    </div>
                </header>
                {/* Planes */}
                <section className="bg-gray-100 py-12 px-6">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-semibold text-center mb-8">Nuestros Planes</h2>

                        {loading ? (
                            <p className="text-center text-gray-600">Cargando planes...</p>
                        ) : planes.length === 0 ? (
                            <p className="text-center text-gray-600">No hay planes disponibles en este momento.</p>
                        ) : (
                            <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
                                {planes.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 w-[280px] sm:w-[320px] hover:scale-105 transition-transform"
                                    >
                                        <h3 className="text-xl font-bold mb-2">{plan.nombre}</h3>
                                        <p className="text-blue-600 text-2xl font-semibold mb-2">
                                            L. {Number(plan.precio_mensual).toFixed(2)}
                                        </p>
                                        <p className="text-gray-700">{plan.descripcion}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-gray-200 text-center text-sm py-4">
                    <p>© {new Date().getFullYear()} ON-NET WIRELESS. Todos los derechos reservados.</p>
                    <p className="mt-1 text-gray-500 text-xs">
                        Desarrollado por{" "}
                        <a
                            href="https://wa.me/50497158345"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-500 transition-colors"
                        >
                            Ing. Eduard J. Diaz
                        </a>
                    </p>
                </footer>
            </div>
        </>
    );
};

export default PlanesPage;
