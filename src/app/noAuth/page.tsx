import Link from "next/link";

const NotFoundPage = () => {
  return (
    <div className="h-screen w-screen bg-gray-50 flex items-center justify-center">
      <div className="container flex flex-col md:flex-row items-center justify-between px-5 text-gray-800">
        {/* Texto */}
        <div className="w-full lg:w-1/2 mx-8 text-center lg:text-left">
          <div className="text-7xl text-[#00AEEF] font-extrabold mb-6">404</div>
          <p className="text-2xl md:text-3xl font-light leading-snug mb-6">
            Lo sentimos, acceso inválido o la página no existe.
          </p>
          <p className="text-md text-gray-600 mb-8">
            Asegúrate de haber escrito la dirección correctamente o regresa a la página principal.
          </p>
          <Link
            href="/"
            className="bg-[#00AEEF] hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full transition"
          >
            Ir al Inicio
          </Link>
        </div>

        {/* Imagen */}
        <div className="w-full lg:w-1/2 mx-5 mt-10 lg:mt-0 flex justify-center">
          <img
            src="https://user-images.githubusercontent.com/43953425/166269493-acd08ccb-4df3-4474-95c7-ad1034d3c070.svg"
            alt="Página no encontrada"
            className="max-w-md"
          />
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
