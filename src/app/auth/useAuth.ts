'use client';

import { useEffect, useState } from 'react';

const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000; // `exp` está en segundos
    return payload.exp && payload.exp > now;
  } catch (e) {
    return false;
  }
};

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(isTokenValid(token));
    setLoading(false);
  }, []);

  return { isAuthenticated, loading };
};