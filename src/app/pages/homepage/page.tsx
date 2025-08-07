"use client";

import HeaderHomepage from "@/app/components/headerHome";

const Homepage = () => {
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
              Con el mejor internet, que te conecta con el mundo virtual.
            </p>
            <a
              href="/pages/login"
              className="w-full inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-full transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-300"
            >
              Iniciar Sesión
            </a>
          </div>
        </main>
      </div>
    </>
  );
};

export default Homepage;
