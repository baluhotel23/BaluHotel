import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faFacebook, faWhatsapp } from '@fortawesome/free-brands-svg-icons';

function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const publicRoutes = [
    "/", "/RoomsSection", "/services", "/activities", 
    "/contact", "/booking", "/login", "/register", "/unauthorized"
  ];
  const isRoomDetailRoute = location.pathname.startsWith("/room/");

  if (!publicRoutes.includes(location.pathname) && !isRoomDetailRoute) {
    return null;
  }

  const navLinks = [
    { to: "/", text: "Inicio" },
    { to: "/RoomsSection", text: "Habitaciones" },
    { to: "/services", text: "Servicios" },
    { to: "/activities", text: "Qué hacer en Restrepo" },
    { to: "/contact", text: "Contacto / Reservas" },
  ];

  // Check if we're on the home page
  const isHomePage = location.pathname === "/";

  return (
    <div className="fixed top-0 w-full z-50">
      {/* Top Informational Bar */}
      <div className="bg-white bg-opacity-95 text-gray-700 text-xs py-2 px-6 backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <span className="font-medium">Web Oficial Hotel Balú</span>
          <div className="flex items-center space-x-4">
            {/* Social Media Icons */}
            <div className="flex space-x-3">
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-yellow-600 transition-colors duration-300">
                <FontAwesomeIcon icon={faInstagram} size="sm" />
              </a>
              <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-yellow-600 transition-colors duration-300">
                <FontAwesomeIcon icon={faFacebook} size="sm" />
              </a>
              <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-yellow-600 transition-colors duration-300">
                <FontAwesomeIcon icon={faWhatsapp} size="sm" />
              </a>
            </div>
            <span className="text-gray-500">|</span>
            <Link to="/login" className="hover:text-yellow-600 font-medium">Staff</Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className={`backdrop-blur-sm ${
        isHomePage 
          ? 'bg-transparent'                    // Transparent for home page
          : 'bg-black bg-opacity-80'            // Dark opaque for other pages
      }`}>
        <div className={`container mx-auto flex justify-between items-center ${
          isHomePage 
            ? 'py-4 sm:py-6 md:py-8 px-3 sm:px-6 md:px-10' // Better mobile progression for home page
            : 'py-2 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6'  // Better mobile progression for other pages
        }`}>
          <Link to="/">
            <img 
              src="/logo2.png" 
              alt="Hotel Balú" 
              className={isHomePage ? 'h-8 sm:h-12 md:h-16 lg:h-18 xl:h-22' : 'h-6 sm:h-10 md:h-12 lg:h-14'} // Much smaller on mobile
            />
          </Link>
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white focus:outline-none">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> {/* Smaller hamburger on mobile */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}></path>
              </svg>
            </button>
          </div>
          <ul className={`hidden md:flex items-center ${
            isHomePage 
              ? 'space-x-3 lg:space-x-8 xl:space-x-12' // Reduced spacing for better fit
              : 'space-x-2 lg:space-x-4 xl:space-x-6'   // Reduced spacing for other pages
          }`}>
            {navLinks.map(link => (
              <li key={link.to}>
                <Link 
                  to={link.to} 
                  className={`font-medium hover:text-yellow-400 border-b-2 border-transparent hover:border-yellow-400 transition-all duration-200 ${
                    isHomePage 
                      ? 'text-sm lg:text-lg xl:text-xl py-1 lg:py-2 xl:py-4 text-white'     // Smaller base text for home
                      : 'text-xs lg:text-md xl:text-lg py-1 lg:py-1 xl:py-2 text-gray-100'  // Smaller base text for other pages
                  }`}
                >
                  {link.text}
                </Link>
              </li>
            ))}
            <li>
              <Link 
                to="/booking" 
                className={`bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${
                  isHomePage 
                    ? 'text-sm lg:text-lg xl:text-xl px-3 lg:px-8 xl:px-12 py-1 lg:py-3 xl:py-5'  // Smaller base button for home
                    : 'text-xs lg:text-md xl:text-lg px-2 lg:px-4 xl:px-8 py-1 lg:py-2 xl:py-3'   // Smaller base button for other pages
                }`}
              >
                Reserva Ahora
              </Link>
            </li>
          </ul>
        </div>
        {isOpen && (
          <div className="md:hidden bg-black bg-opacity-80 backdrop-blur-sm border-t">
            <ul className="flex flex-col items-center space-y-4 py-6">
              {navLinks.map(link => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-white font-medium hover:text-yellow-400" // Changed to white text
                    onClick={() => setIsOpen(false)}
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
              <li>
                <Link 
                  to="/booking" 
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold px-8 py-3 rounded-full shadow-lg mt-4" 
                  onClick={() => setIsOpen(false)}
                >
                  Reserva Ahora
                </Link>
              </li>
              <li className="mt-2">
                <Link 
                  to="/login" 
                  className="text-gray-300 hover:text-yellow-400" // Adjusted for visibility
                  onClick={() => setIsOpen(false)}
                >
                  Staff
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </div>
  );
}

export default Navbar;