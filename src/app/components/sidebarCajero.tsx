"use client";

import Link from "next/link";

const SidebarCajero = () => {
  return (
    <aside className="w-full sm:w-64 bg-yellow-100 text-yellow-800 h-full p-6 space-y-4">
      <h2 className="text-xl font-bold mb-4">Panel Cajero</h2>
      <ul className="space-y-3">
        <li>
          <Link href="#" className="block hover:text-yellow-600">
            Registrar Pago
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-yellow-600">
            Ver Historial de Pagos
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-yellow-600">
            Buscar Cliente
          </Link>
        </li>
      </ul>
    </aside>
  );
};

export default SidebarCajero;
