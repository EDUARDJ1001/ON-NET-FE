"use client";

import Link from "next/link";
import { useState } from "react";

const SidebarCajero = () => {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);
  const toggleMenu = () => setOpen(prev => !prev);

  // Datos de navegación para evitar repetición
  const menuItems = [
    { href: "/pages/cajero/pago", label: "Registrar Pago" },
    { href: "/pages/cajero/pendientes", label: "Ver Clientes Pendientes" },
    { href: "/pages/cajero/clientes", label: "Buscar Cliente" },
  ];

  return (
    <>
      {/* Sidebar fijo en pantallas md+ */}
      <aside className="hidden md:flex md:flex-col w-64 bg-yellow-100 text-yellow-800 h-full p-6 space-y-4 shadow-md">
        <h2 className="text-xl font-bold mb-4">Panel Cajero</h2>
        <nav aria-label="Navegación principal">
          <ul className="space-y-3">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  className="block hover:text-yellow-600 transition-colors duration-200"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Botón flotante para abrir el menú en móvil */}
      <button
        onClick={toggleMenu}
        className="fixed bottom-4 left-4 z-30 md:hidden rounded-full shadow-lg bg-yellow-400 text-yellow-900 px-4 py-3 text-sm font-semibold hover:bg-yellow-500 transition-colors duration-200"
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
        aria-controls="mobile-sidebar"
      >
        ☰ Menú
      </button>

      {/* Overlay en móvil */}
      <div
        onClick={closeMenu}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Drawer lateral en móvil */}
      <aside
        id="mobile-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-yellow-100 text-yellow-800 
          p-6 space-y-4 shadow-xl md:hidden
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Panel de cajero"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Panel Cajero</h2>
          <button
            onClick={closeMenu}
            className="text-lg font-bold px-2 hover:text-yellow-600 transition-colors duration-200"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav aria-label="Navegación móvil">
          <ul className="space-y-3">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block hover:text-yellow-600 transition-colors duration-200 py-2"
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default SidebarCajero;