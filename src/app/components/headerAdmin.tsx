"use client";

const HeaderAdmin = () => {
  return (
    <header className="w-full bg-[#00AEEF] py-3 px-4 shadow-md flex items-center justify-between">
      {/* Banner ON-Net */}
      <div className="flex items-center">
        <img
          src="/img/ON-NET-BANNER.png"
          alt="ON-Net Wireless Banner"
          className="h-12 w-auto object-contain sm:h-16"
        />
      </div>

      {/* Botón cerrar sesión */}
      <div>
        <button
          onClick={() => {
            // Aquí puedes agregar la lógica real de logout
            window.location.href = "/pages/login";
          }}
          className="bg-white text-[#00AEEF] font-semibold px-4 py-2 rounded-full shadow hover:bg-gray-100 transition text-sm"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
};

export default HeaderAdmin;
