import AdminLayout from '@/app/components/adminLayout';
import React from 'react'
import Link from 'next/link';

const pagosTv = () => {
    return (
        <div>
            <AdminLayout>
                <div className="px-4 sm:px-6 lg:px-8 py-16">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-orange-600">Registro de Pagos IPTV</h1>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/pages/admin/iptv/historialtv"
                                className="inline-flex items-center px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
                            >
                                + Volver a Historial de Pagos IPTV
                            </Link>
                            <Link
                                href="/pages/admin/iptv/clientes"
                                className="inline-flex items-center px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-sm"
                            >
                                ← Volver a Clientes
                            </Link>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        </div>
    )
}

export default pagosTv;
