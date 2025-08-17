"use client";

import { ReactNode, useState } from "react";
import HeaderAdmin from "./headerAdmin";
import SidebarAdmin from "./sidebarAdmin";
import Footer from "./footer";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <div className="flex flex-col min-h-screen font-[Orbitron] text-[#1C1C1C] bg-[#F4F8FB]">
      {/* Header sticky: garantiza que el pt-16 tenga sentido */}
      <div className="sticky top-0 z-50">
        <HeaderAdmin onToggleSidebar={toggleSidebar} />
      </div>

      {/* Contenido */}
      <div className="flex flex-1 pt-16 md:pt-0">
        {/* Sidebar - visible en desktop, colapsable en móvil */}
        <div
          className={`fixed md:static top-16 md:top-0 z-50 md:z-auto
                      w-72 md:w-64 h-[calc(100dvh-4rem)] md:h-auto
                      transition-all duration-300 ease-in-out
                      ${sidebarOpen ? "left-0" : "-left-72"} md:left-0`}
        >
          <SidebarAdmin
            open={sidebarOpen}
            onToggle={toggleSidebar}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Overlay móviles */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main: ocupa el espacio restante y permite que el footer “baje” correctamente */}
        <main
          className="flex-1 p-4 sm:p-6"
          onClick={() => {
            if (window.innerWidth < 768 && sidebarOpen) setSidebarOpen(false);
          }}
        >
          {children}
        </main>
      </div>

      {/* Footer responsivo (con tu componente actual ya basta) */}
      <Footer />
    </div>
  );
};

export default AdminLayout;
