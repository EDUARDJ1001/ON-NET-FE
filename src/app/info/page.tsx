"use client";

import Head from "next/head";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>ON-NET WIRELESS | Conectamos tu mundo</title>
      </Head>
      <main className="min-h-screen bg-white text-gray-800 flex flex-col">
        {/* Hero / Landing principal */}
        <section className="bg-gradient-to-br from-[#00AEEF] to-blue-600 text-white py-24 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Internet rápido, estable y sin complicaciones
            </h1>
            <p className="text-lg sm:text-xl mb-8">
              En ON-NET WIRELESS conectamos hogares, empresas y sueños con tecnología de confianza.
            </p>
            <Link
              href="/info/planes"
              className="bg-white text-[#00AEEF] hover:bg-gray-100 font-semibold px-6 py-3 rounded-full shadow-lg transition"
            >
              Ver planes disponibles
            </Link>
          </div>
        </section>

        {/* Sección adicional opcional */}
        <section className="py-16 px-6 max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">¿Por qué elegirnos?</h2>
          <p className="text-lg text-gray-700">
            ✅ Soporte personalizado <br />
            ✅ Planes accesibles <br />
            ✅ Cobertura en zonas urbanas y rurales <br />
            ✅ Sin contratos complicados
          </p>
        </section>

        {/* Footer discreto */}
        <footer className="bg-gray-200 text-center text-sm py-4 mt-auto">
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
      </main>
    </>
  );
}
