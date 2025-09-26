"use client";

import { useAuth } from "@/app/auth/useAuth";
import AdminLayout from "@/app/components/adminLayout";
import { useEffect } from "react";
import { Construction } from "lucide-react";

const Iptv = () => {
    const { isAuthenticated, loading } = useAuth();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            window.location.href = "/noAuth";
        }
    }, [isAuthenticated, loading]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">Gestión de IPTV</h1>
                    <Construction className="h-24 w-24 text-orange-400 mx-auto mb-6" />
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">En Desarrollo</h1>
                    <p className="text-lg text-gray-600 max-w-md">
                        Próximamente estará disponible.
                    </p>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Iptv;
