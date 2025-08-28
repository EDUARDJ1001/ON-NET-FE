import { useState, useRef, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';

interface SearchDropdownProps {
  items: string[];
  placeholder?: string;
  onSearch: (searchTerm: string) => void;
  className?: string;
}

const SearchDropdown = ({
  items = [],
  placeholder = "Buscar clientes...",
  onSearch,
  className = ""
}: SearchDropdownProps) => {
  const [search, setSearch] = useState<string>('');
  const [open, setOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtra los items que COMIENCEN con el texto de búsqueda (para el dropdown)
  const filteredItems = items.filter(item =>
    item.toLowerCase().startsWith(search.toLowerCase())
  );

  const handleSearch = () => {
    onSearch(search);
    setOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className={`relative ${className}`}
    >
      <div className="flex items-center">
        <input 
          type="search" 
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(e.target.value.length > 0);
          }}
          onKeyPress={handleKeyPress}
          placeholder={placeholder} 
          className="flex-1 py-2 px-4 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white p-2 rounded-r-md focus:outline-none"
          aria-label="Buscar"
        >
          <FiSearch size={24} />
        </button>
      </div>

      {open && (
        <ul 
          className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <li 
                key={item} 
                className="p-2 hover:bg-gray-100 cursor-pointer text-gray-800"
                onClick={() => {
                  setSearch(item);
                  onSearch(item);
                  setOpen(false);
                }}
              >
                {item}
              </li>
            ))
          ) : (
            <li className="p-2 text-gray-500">No hay coincidencias</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchDropdown;
