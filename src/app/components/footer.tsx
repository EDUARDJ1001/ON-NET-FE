"use client";

const Footer = () => {
  return (
    <footer className="bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-300 mt-auto w-full">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 py-4">
          <p className="text-xs sm:text-sm text-center sm:text-left leading-relaxed">
            © {new Date().getFullYear()} <span className="font-semibold">ON-NET WIRELESS</span>. Todos los derechos reservados.
          </p>

          <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 text-center sm:text-right">
            Desarrollado por{" "}
            <a
              href="https://wa.me/50497158345"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Ing. Eduard J. Diaz
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
