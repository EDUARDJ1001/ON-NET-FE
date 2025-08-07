"use client";
import { ReactNode } from "react";
import HeaderAdmin from "./headerAdmin";
import SidebarAdmin from "./sidebarAdmin";
import Footer from "./footer";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen font-[Orbitron] text-[#1C1C1C] bg-[#F4F8FB]">
      {/* Header fijo superior */}
      <HeaderAdmin />

      {/* Contenido dividido en Sidebar y Main */}
      <div className="flex flex-1">
        <SidebarAdmin />
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Footer fijo inferior */}
      <Footer />
    </div>
  );
};

export default AdminLayout;
