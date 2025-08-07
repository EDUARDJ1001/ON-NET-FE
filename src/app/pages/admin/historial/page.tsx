"use client";

import HeaderHomepage from "@/app/components/headerHome";

const Historial = () => {
  return (
    <>
      <div className="font-[Orbitron] min-h-screen bg-gradient-to-br from-orange-400 to-sky-500 text-[#1C1C1C]">
        <HeaderHomepage />

        <main className="flex flex-col items-center justify-center text-center px-4 py-20">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-10 border border-orange-300">
            <h1 className="text-4xl md:text-5xl font-bold text-orange-500 mb-4">
              ON-Net Wireless
            </h1>
            <p className="text-lg md:text-xl text-slate-700 mb-8">
              Trabajando en esta funcion
            </p>
          </div>
        </main>
      </div>
    </>
  );
};

export default Historial;
