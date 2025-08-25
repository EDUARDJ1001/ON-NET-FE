"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function SidebarAdmin({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void; // toggle global del layout
  onClose: () => void;  // cerrar al hacer click en un link
}) {
  const pathname = usePathname();

  const Item = ({ href, label }: { href: string; label: string }) => {
    const active = pathname?.startsWith(href);
    return (
      <li>
        <Link
          href={href}
          onClick={onClose}
          className={[
            "block rounded-xl px-3 py-2 text-sm transition",
            active
              ? "bg-white text-orange-900 shadow-inner"
              : "text-orange-800 hover:bg-orange-200/70 hover:text-orange-900",
          ].join(" ")}
        >
          {label}
        </Link>
      </li>
    );
  };

  return (
    <aside className="h-full w-full bg-orange-100 text-orange-900 shadow-xl border-r border-orange-200">
      {/* Top bar del sidebar con el botón de abrir/cerrar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-orange-200">
        <div className="text-base font-semibold">Panel Admin</div>
        <button
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={onToggle}
          className="inline-flex items-center justify-center rounded-lg border px-2 py-2 active:scale-[0.98] md:hidden"
        >
          {open ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
        </button>
      </div>

      {/* Menú */}
      <div className="h-[calc(100%-56px)] overflow-y-auto px-4 py-5 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-orange-500/80">Administración</p>
          <ul className="space-y-1">
            <Item href="/pages/admin/clientes" label="Gestión de Clientes" />
            <Item href="/pages/admin/empleados" label="Gestión de Empleados" />
            <Item href="/pages/admin/reportes" label="Reportes Generales" />
          </ul>
        </div>

        <hr className="border-orange-300/60" />

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-orange-500/80">Caja</p>
          <ul className="space-y-1">
            <Item href="/pages/admin/caja" label="Registrar Pago" />
            <Item href="/pages/admin/caja/historial" label="Historial de Pagos" />
          </ul>
        </div>

        <hr className="border-orange-300/60" />

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-orange-500/80">Técnico</p>
          <ul className="space-y-1">
            <Item href="/pages/tecnico/tareas" label="Tareas Asignadas" />
            <Item href="/pages/tecnico/instalacion" label="Registrar Instalación" />
            <Item href="/pages/tecnico/reportar" label="Reportar Problemas" />
          </ul>
        </div>
      </div>
    </aside>
  );
}
