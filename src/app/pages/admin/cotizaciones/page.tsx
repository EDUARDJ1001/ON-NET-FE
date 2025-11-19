"use client"

import dynamic from 'next/dynamic';

const Cotizacion = dynamic(() => import('../../../components/cotizacion'), { ssr: false });

export default function Caja() {
  return <Cotizacion/>;
}