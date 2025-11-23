"use client"

import dynamic from 'next/dynamic';

const RegistrarPago = dynamic(() => import('../../../components/cajeroView'), { ssr: false });

export default function Caja() {
  return <RegistrarPago/>;
}