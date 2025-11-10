import AdminLayout from '@/app/components/adminLayout';
import Link from 'next/link';
import React from 'react';

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

interface Pago {
  id: number;
  cliente_id: number;
  monto: number;
  fecha_pago: string;
  metodo_id: number;
  metodo_pago_desc: string;
  referencia: string;
  observacion: string;
  mes_aplicado: number;
  anio_aplicado: number;
  created_at: string;
  updated_at: string;
  cliente_nombre?: string;
}

const historialtv = () => {
    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8 py-16">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-orange-600">Historial de Pagos IPTV</h1>
                        {/* <p className="text-slate-600 mt-1">
                            Pagos del mes {getNombreMes(parseInt(filtros.mes || mesActual, 10))} {filtros.anio || anioActual}
                        </p> */}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/pages/admin/iptv/registrarPago"
                            className="inline-flex items-center px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
                        >
                            + Nuevo Pago
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

    )
}

export default historialtv;
