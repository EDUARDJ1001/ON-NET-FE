"use client"

import dynamic from 'next/dynamic';

const RegistrarPagoTv = dynamic(() => import('../../../../components/cajaTv'), { ssr: false });

export default function Caja() {
  return <RegistrarPagoTv/>;
}