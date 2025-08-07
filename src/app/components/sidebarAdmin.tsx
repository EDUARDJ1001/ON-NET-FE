"use client";

import Link from "next/link";

const SidebarAdmin = () => {
  return (
    <aside className="w-full sm:w-64 bg-orange-100 text-orange-800 h-full p-6 space-y-4">
      <h2 className="text-xl font-bold mb-4">Panel Admin</h2>
      <ul className="space-y-3">
        <li>
          <Link href="/pages/admin/clientes" className="block hover:text-orange-600">
            Gestión de Clientes
          </Link>
        </li>
        <li>
          <Link href="/pages/admin/empleados" className="block hover:text-orange-600">
            Gestión de Empleados
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-orange-600">
            Reportes Generales
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-orange-600">
            Configuración del Sistema
          </Link>
        </li>
        <hr className="border-orange-300 my-3" />
        <li>
          <Link href="#" className="block hover:text-orange-600">
            Registrar Pago (Cajero)
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-orange-600">
            Ver Historial de Pagos (Cajero)
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-orange-600">
            Buscar Cliente
          </Link>
        </li>
        <hr className="border-orange-300 my-3" />
        <li>
          <Link href="#" className="block hover:text-orange-600">
            Ver Tareas Asignadas (Técnico)
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-orange-600">
            Registrar Instalación
          </Link>
        </li>
        <li>
          <Link href="#" className="block hover:text-orange-600">
            Reportar Problemas
          </Link>
        </li>
      </ul>
    </aside>
  );
};

export default SidebarAdmin;
