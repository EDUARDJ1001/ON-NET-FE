"use client";
import { ReactNode } from "react";
import Footer from "./footer";
import HeaderTecnico from "./headerTecnico";
import SidebarTecnico from "./sidebarTecnico";

interface AdminLayoutProps {
  children: ReactNode;
}

const TecnicoLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen font-[Orbitron] text-[#1C1C1C] bg-[#F4F8FB]">
      {/* Header fijo superior */}
      <HeaderTecnico />

      {/* Contenido dividido en Sidebar y Main */}
      <div className="flex flex-1">
        <SidebarTecnico />
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Footer fijo inferior */}
      <Footer />
    </div>
  );
};

export default TecnicoLayout;
