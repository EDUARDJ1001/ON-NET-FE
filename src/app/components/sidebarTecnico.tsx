"use client";

import Link from "next/link";

const SidebarTecnico = () => {
  return (
    <aside className="w-full sm:w-64 bg-blue-100 text-blue-800 h-full p-6 space-y-4">
      <h2 className="text-xl font-bold mb-4">Panel Técnico</h2>
      <ul className="space-y-3">
        <li>
          <Link href="#" className="block hover:text-blue-600">
            Ver Tareas Asignadas
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-blue-600">
            Registrar Instalación
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-blue-600">
            Reportar Problemas
          </Link>
        </li>
      </ul>
    </aside>
  );
};

export default SidebarTecnico;
