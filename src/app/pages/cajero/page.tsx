"use client";

import HeaderCajero from "@/app/components/headerCajero";



const HomeCajero = () => {
    return (
        <>
            <div className="font-[Orbitron] min-h-screen bg-gradient-to-br from-orange-400 to-sky-500 text-[#1C1C1C]">
                <HeaderCajero />

                <main className="flex flex-col items-center justify-center text-center px-4 py-20 min-h-screen bg-[#F4F8FB]">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-10 border border-orange-300">
                        <h1 className="text-4xl font-extrabold text-orange-500 mb-4">
                            Bienvenido, Cajero
                        </h1>
                        <p className="text-lg text-slate-700 mb-8">
                            Registra pagos y consulta el historial de los clientes.
                        </p>

                        <div className="flex flex-col gap-4">
                            <button className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-full font-semibold">
                                Registrar Pago
                            </button>
                            <button className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-full font-semibold">
                                Ver Historial de Pagos
                            </button>
                            <button className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-full font-semibold">
                                Buscar Cliente
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default HomeCajero;
