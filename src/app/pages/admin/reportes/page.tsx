"use client";

import AdminLayout from "@/app/components/adminLayout";

const Historial = () => {
    return (
    <AdminLayout>
      <div className="font-[Orbitron] min-h-screen bg-gradient-to-br from-orange-400 to-sky-500 text-[#1C1C1C]">

        <main className="flex flex-col items-center justify-center text-center px-4 py-20">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-10 border border-orange-300">
            <h1 className="text-4xl md:text-5xl font-bold text-orange-500 mb-4">
              ON-Net Wireless.
            </h1>
            <p className="text-lg md:text-xl text-slate-700 mb-8">
                Esta sección está en desarrollo y pronto estará disponible para su uso, aqui se podrá ver el historial de pagos de los clientes.
            </p>
          </div>
        </main>
      </div>
    </AdminLayout>
    );
};

export default Historial;
