'use client';

import { useEffect } from 'react';
import { redirect, useRouter } from 'next/navigation';

const Page = () => {
  const router = useRouter();

  useEffect(() => {
    redirect('/pages/homepage');
  }, [router]);

  return <div>Redirigiendo...</div>;
};

export default Page;
