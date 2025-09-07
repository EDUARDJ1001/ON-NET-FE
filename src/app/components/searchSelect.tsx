"use client";

import { useMemo, useState } from 'react';

interface Cliente {
    id: number;
    nombre: string;
}

interface SearchSelectProps {
  clientes: Cliente[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchSelect = ({ 
  clientes, 
  value, 
  onChange, 
  placeholder = "Buscar cliente..." 
}: SearchSelectProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const clientesFiltrados = useMemo(() => {
    if (!inputValue) return clientes;
    
    const queryLower = inputValue.toLowerCase();
    return clientes.filter(cliente =>
      `${cliente.nombre}`.toLowerCase().includes(queryLower) ||
      cliente.id.toString().includes(inputValue)
    );
  }, [clientes, inputValue]);

  const clienteSeleccionado = clientes.find(c => c.id.toString() === value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowOptions(true);
  };

  const handleSelectCliente = (clienteId: string) => {
    onChange(clienteId);
    setInputValue('');
    setShowOptions(false);
  };

  const handleInputFocus = () => {
    setShowOptions(true);
  };

  const handleInputBlur = () => {
    // Pequeño delay para permitir hacer clic en las opciones
    setTimeout(() => setShowOptions(false), 200);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={value && clienteSeleccionado 
          ? `${clienteSeleccionado.nombre}` 
          : placeholder
        }
        className="w-full px-3 py-2 border rounded-md"
      />
      
      {showOptions && clientesFiltrados.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 border border-gray-200">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              onClick={() => handleSelectCliente(cliente.id.toString())}
              className="cursor-pointer px-3 py-2 hover:bg-blue-100 transition-colors"
            >
              <div className="font-medium">{cliente.nombre}</div>
              <div className="text-sm text-gray-600">ID: {cliente.id}</div>
            </div>
          ))}
        </div>
      )}

      {value && (
        <input
          type="hidden"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
};

export default SearchSelect;
