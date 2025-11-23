"use client";

import Link from "next/link";
import { useState } from "react";

const SidebarCajero = () => {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <>
      {/* Sidebar fijo en pantallas md+ */}
      <aside className="hidden md:flex md:flex-col w-64 bg-yellow-100 text-yellow-800 h-full p-6 space-y-4 shadow-md">
        <h2 className="text-xl font-bold mb-4">Panel Cajero</h2>
        <nav>
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
        </nav>
      </aside>

      {/* Botón flotante para abrir el menú en móvil */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-30 md:hidden rounded-full shadow-lg bg-yellow-400 text-yellow-900 px-4 py-3 text-sm font-semibold"
      >
        ☰ Menú
      </button>

      {/* Overlay en móvil */}
      <div
        onClick={closeMenu}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer lateral en móvil */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-yellow-100 text-yellow-800 
          p-6 space-y-4 shadow-xl md:hidden
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Panel Cajero</h2>
          <button
            onClick={closeMenu}
            className="text-lg font-bold px-2"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav>
          <ul className="space-y-3">
            <li>
              <Link
                href="#"
                className="block hover:text-yellow-600"
                onClick={closeMenu}
              >
                Registrar Pago
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="block hover:text-yellow-600"
                onClick={closeMenu}
              >
                Ver Historial de Pagos
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="block hover:text-yellow-600"
                onClick={closeMenu}
              >
                Buscar Cliente
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default SidebarCajero;
