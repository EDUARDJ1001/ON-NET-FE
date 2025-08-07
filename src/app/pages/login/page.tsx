"use client";

import HeaderLogin from '@/app/components/headerLogin';
import React, { useState } from 'react';

interface User {
  username: string;
}

const Login: React.FC = () => {
  const apiHost = process.env.NEXT_PUBLIC_API_HOST;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${apiHost}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      setUser(data.user);

      localStorage.setItem('token', data.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...data.user,
          loginTime: new Date().toISOString(),
        })
      );

      window.location.href = data.dashboardRoute;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al iniciar sesión');
      }
    }
  };

  return (
    <div>
      <HeaderLogin />
      <div className="min-h-screen bg-gradient-to-br from-orange-400 to-sky-500 flex flex-col items-center justify-center text-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 border border-orange-300">
          <h2 className="text-2xl font-bold mb-2 text-orange-500">Inicio de Sesión</h2>
          <p className="text-sm text-slate-600 mb-6">Colaboradores ON-NET WIRELESS</p>

          {error && (
            <div className="mb-4 text-red-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label htmlFor="username" className="block text-slate-700 mb-1 font-medium">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-slate-700 mb-1 font-medium">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-300"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
