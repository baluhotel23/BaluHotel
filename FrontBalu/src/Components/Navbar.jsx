import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faFacebook, faWhatsapp } from '@fortawesome/free-brands-svg-icons';

function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const publicRoutes = [
    "/", "/RoomsSection", "/services", "/activities", 
    "/contact", "/booking", "/login", "/register", "/unauthorized"
  ];
  const isRoomDetailRoute = location.pathname.startsWith("/room/");

  const navLinks = [
    { to: "/", text: "Inicio" },
    { to: "/RoomsSection", text: "Habitaciones" },
    { to: "/#room-showcase", text: "Servicios" }, // Changed for section navigation
    { to: "/#activities-showcase", text: "Qué hacer en Restrepo" }, // Changed for section navigation
    { to: "/#contact-section", text: "Contacto / Reservas" }, // Changed for section navigation
  ];

  // Check if we're on the home page
  const isHomePage = location.pathname === "/";

  // Only add scroll effect - keep all original responsive styling
  useEffect(() => {
    if (!isHomePage) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const scrolled = window.scrollY;
      const triggerPoint = window.innerHeight * 0.4; // Changed from 0.7 to 0.4 to match sticky form
      
      setIsVisible(scrolled <= triggerPoint);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  if (!publicRoutes.includes(location.pathname) && !isRoomDetailRoute) {
    return null;
  }

  return (
    <div className={`fixed top-0 w-full z-50 transition-transform duration-300 ease-in-out ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      {/* Top Informational Bar */}
      <div className="bg-white bg-opacity-95 text-gray-700 text-xs py-2 px-6 backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <span className="font-medium">Web Oficial Hotel Balú</span>
          <div className="flex items-center space-x-4">
            {/* Social Media Icons */}
            <div className="flex space-x-3">
              <a href="https://www.instagram.com/baluhotel23?igsh=MWdjbTh4ZGcxc3ptaw==" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-yellow-600 transition-colors duration-300">
                <FontAwesomeIcon icon={faInstagram} size="sm" />
              </a>
              <a href="https://www.facebook.com/share/17SDSUw3Yv/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-yellow-600 transition-colors duration-300">
                <FontAwesomeIcon icon={faFacebook} size="sm" />
              </a>
              <a href="https://wa.me/573001234567" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-yellow-600 transition-colors duration-300">
                <FontAwesomeIcon icon={faWhatsapp} size="sm" />
              </a>
            </div>
            <span className="text-gray-500">|</span>
            <Link to="/login" className="hover:text-yellow-600 font-medium">Staff</Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar - RESTORED ORIGINAL RESPONSIVE STYLING */}
      <nav className={`backdrop-blur-sm ${
        isHomePage 
          ? 'bg-transparent'
          : 'bg-black bg-opacity-80'
      }`}>
        <div className={`container mx-auto flex justify-between items-center ${
          isHomePage 
            ? 'py-2 sm:py-4 md:py-6 lg:py-8 px-3 sm:px-6 md:px-10'
            : 'py-1 sm:py-2 md:py-3 lg:py-4 px-3 sm:px-4 md:px-6'
        }`}>
          <Link to="/">
            <img 
              src="/logo2.png" 
              alt="Hotel Balú" 
              className={isHomePage 
                ? 'h-6 sm:h-8 md:h-12 lg:h-16 xl:h-20' 
                : 'h-5 sm:h-6 md:h-10 lg:h-12 xl:h-14'
              }
            />
          </Link>
          
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white focus:outline-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}></path>
              </svg>
            </button>
          </div>
          
          <ul className={`hidden md:flex items-center ${
            isHomePage 
              ? 'space-x-3 lg:space-x-8 xl:space-x-12' // Restored original spacing
              : 'space-x-2 lg:space-x-4 xl:space-x-6'
          }`}>
            {navLinks.map(link => (
              <li key={link.to}>
                <Link 
                  to={link.to} 
                  className={`font-medium hover:text-yellow-400 border-b-2 border-transparent hover:border-yellow-400 transition-all duration-200 whitespace-nowrap ${
                    isHomePage 
                      ? 'text-sm lg:text-lg xl:text-xl py-1 lg:py-2 xl:py-4 text-white'     // Restored original large sizes
                      : 'text-xs lg:text-md xl:text-lg py-1 lg:py-1 xl:py-2 text-gray-100'  // Restored original sizes
                  }`}
                >
                  {link.text}
                </Link>
              </li>
            ))}
            <li>
              <Link 
                to="/booking" 
                className={`bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 whitespace-nowrap ${
                  isHomePage 
                    ? 'text-sm lg:text-lg xl:text-xl px-3 lg:px-8 xl:px-12 py-1 lg:py-3 xl:py-5'  // Restored original large button
                    : 'text-xs lg:text-md xl:text-lg px-2 lg:px-4 xl:px-8 py-1 lg:py-2 xl:py-3'   // Restored original button
                }`}
              >
                Reserva Ahora
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden bg-black bg-opacity-80 backdrop-blur-sm border-t">
            <ul className="flex flex-col items-center space-y-3 py-4">
              {navLinks.map(link => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-white font-medium hover:text-yellow-400 text-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
              <li>
                <Link 
                  to="/booking" 
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold px-6 py-2 rounded-full shadow-lg text-sm" 
                  onClick={() => setIsOpen(false)}
                >
                  Reserva Ahora
                </Link>
              </li>
              <li className="pt-2">
                <Link 
                  to="/login" 
                  className="text-gray-300 hover:text-yellow-400 text-sm"
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