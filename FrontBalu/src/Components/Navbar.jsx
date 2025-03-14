import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Definir las rutas donde queremos mostrar el Navbar
  const publicRoutes = ["/", "/RoomsSection", "/login", "/register", "/unauthorized", "/booking"];
  const isRoomDetailRoute = location.pathname.startsWith("/room/");

  // Si la ruta actual no está en publicRoutes y no es una ruta de detalle de habitación, no mostrar Navbar
  if (!publicRoutes.includes(location.pathname) && !isRoomDetailRoute) {
    return null;
  }

  return (
    <nav className="bg-white shadow-md fixed top-0 w-full z-10">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <img src="/logo.jpeg" alt="Hotel Copahue" className="h-10" />
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-gray-800 focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}></path>
            </svg>
          </button>
        </div>
        <ul className="hidden md:flex space-x-6 text-gray-800">
          <li><Link to="/" className="hover:text-degrade">Inicio</Link></li>
          <li><Link to="/about" className="hover:text-degrade">Sobre nosotros</Link></li>
          <li><Link to="/RoomsSection" className="hover:text-degrade">Habitaciones</Link></li>
          <li><Link to="/booking" className="bg-degrade px-4 py-2 rounded-full text-white hover:bg-yellow-700 opacity-50">Reservar</Link></li>
        </ul>
      </div>
      {isOpen && (
        <div className="md:hidden">
          <ul className="flex flex-col items-center space-y-4 py-4">
            <li><Link to="/" className="hover:text-degrade" onClick={() => setIsOpen(false)}>Inicio</Link></li>
            <li><Link to="/about" className="hover:text-degrade" onClick={() => setIsOpen(false)}>Sobre nosotros</Link></li>
            <li><Link to="/RoomsSection" className="hover:text-degrade" onClick={() => setIsOpen(false)}>Habitaciones</Link></li>
            <li><Link to="/booking" className="bg-degrade px-4 py-2 rounded-full text-white hover:bg-yellow-700 opacity-50" onClick={() => setIsOpen(false)}>Reservar</Link></li>
          </ul>
        </div>
      )}
    </nav>
  );
}

export default Navbar;