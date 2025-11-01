"use client";

import { useAuth } from "@/app/auth/useAuth";
import AdminLayout from "@/app/components/adminLayout";
import { useEffect, useState } from "react";

const HomeAdmin = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/noAuth";
    }
  }, [isAuthenticated, authLoading]);

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header con título y botón */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">Bienvenido Administrador</h1>
            <p className="text-sm text-slate-600 mt-2">
              Gestiona las operaciones administrativas desde este panel.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HomeAdmin;
