"use client";
import { ReactNode } from "react";
import Footer from "./footer";
import HeaderCajero from "./headerCajero";
import SidebarCajero from "./sidebarCajero";

interface AdminLayoutProps {
  children: ReactNode;
}

const CajeroLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen font-[Orbitron] text-[#1C1C1C] bg-[#F4F8FB]">
      {/* Header fijo superior */}
      <HeaderCajero />

      {/* Contenido dividido en Sidebar y Main */}
      <div className="flex flex-1">
        <SidebarCajero />
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Footer fijo inferior */}
      <Footer />
    </div>
  );
};

export default CajeroLayout;
