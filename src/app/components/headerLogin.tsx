"use client";

import Link from "next/link";

const HeaderLogin = () => {
  return (
    <header className="w-full bg-[#00AEEF] text-white py-4 px-6 shadow-md flex justify-between items-center">
      <div className="text-xl font-bold">ON-NET WIRELESS</div>
      <Link
        href="/"
        className="text-sm bg-white text-[#00AEEF] font-semibold px-4 py-1 rounded-full shadow hover:bg-gray-100 transition"
      >
        Página Principal
      </Link>
    </header>
  );
};

export default HeaderLogin;
