"use client";

const Footer = () => {
  return (
    <footer className="bg-gray-200 text-center text-sm py-4 mt-auto">
      <p>© {new Date().getFullYear()} ON-NET WIRELESS. Todos los derechos reservados.</p>
      <p className="mt-1 text-gray-500 text-xs">
        Desarrollado por{" "}
        <a
          href="https://wa.me/50497158345"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-500 transition-colors"
        >
          Ing. Eduard J. Diaz
        </a>
      </p>
    </footer>
  );
};

export default Footer;
