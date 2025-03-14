import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  // Definir las rutas donde queremos mostrar el Navbar
  const publicRoutes = ["/", "/RoomsSection", "/login", "/register", "/unauthorized"];
  const isRoomDetailRoute = location.pathname.startsWith("/room/");

  // Si la ruta actual no está en publicRoutes y no es una ruta de detalle de habitación, no mostrar Navbar
  if (!publicRoutes.includes(location.pathname) && !isRoomDetailRoute) {
    return null;
  }

  return (
    <nav className="bg-white shadow-md fixed top-0 w-full z-10">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <img src="/logo.jpeg" alt="Hotel Copahue" className="h-10" />
        <ul className="hidden md:flex space-x-6 text-gray-800">
          <li><Link to="/" className="hover:text-degrade">Inicio</Link></li>
          <li><Link to="/about" className="hover:text-degrade">Sobre nosotros</Link></li>
          <li><Link to="/RoomsSection" className="hover:text-degrade">Habitaciones</Link></li>
          <li><Link to="/reserve" className="bg-degrade px-4 py-2 rounded-full text-white hover:bg-yellow-700 opacity-50">Reservar</Link></li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;