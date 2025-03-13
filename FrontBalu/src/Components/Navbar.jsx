import React from 'react'
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";


  

function Navbar() {
    const location = useLocation();
    // Definir las rutas donde queremos mostrar el Navbar
  const publicRoutes = ["/", "/RoomsSection", "/login", "/register", "/unauthorized"];
  // Si la ruta actual no está en publicRoutes, no mostrar Navbar
  if (!publicRoutes.includes(location.pathname)) {
    return null;
  }
    return (
        <nav className="bg-white shadow-md fixed top-0 w-full z-10">
          <div className="container mx-auto flex justify-between items-center py-4 px-6">
            <img src="/assets/logo.png" alt="Hotel Copahue" className="h-10" />
            <ul className="hidden md:flex space-x-6 text-gray-800">
              <li><Link to="/" className="hover:text-yellow-600">Inicio</Link></li>
              <li><Link to="/about" className="hover:text-yellow-600">Sobre nosotros</Link></li>
              <li><Link to="/RoomsSection" className="hover:text-yellow-600">Habitaciones</Link></li>
             
              <li><Link to="/reserve" className="bg-yellow-500 px-4 py-2 rounded text-white hover:bg-yellow-600">Reservar</Link></li>
            </ul>
          </div>
        </nav>
      );
}

export default Navbar