import React, { useState, useEffect } from 'react';
import BookingSearchForm from './Booking/BookingSearchForm';
import { useLocation } from 'react-router-dom';

const StickyBookingForm = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  
  // Only show on home page
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => {
      // Usar múltiples métodos para detectar el punto de activación
      const scrolled = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Punto de activación adaptativo basado en múltiples factores
      let triggerPoint = windowHeight * 0.4;
      
      // Ajustar según el tamaño de la ventana
      if (windowHeight < 600) {
        triggerPoint = windowHeight * 0.3; // Pantallas pequeñas
      } else if (windowHeight > 1000) {
        triggerPoint = windowHeight * 0.45; // Pantallas grandes
      }
      
      setIsVisible(scrolled > triggerPoint);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll); // También escuchar resize
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isHomePage]);

  if (!isHomePage) return null;

  return (
    <div 
      className={`fixed left-0 right-0 top-0 z-40 transform transition-all duration-500 ease-in-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div 
        className="bg-white bg-opacity-95 backdrop-blur-sm border-b border-gray-200"
        style={{ 
          boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.1), 0 15px 35px -5px rgba(0, 0, 0, 0.25)' 
        }}
      >
        <div 
          className="container mx-auto"
          style={{
            padding: 'clamp(8px, 2vw, 24px) clamp(8px, 2vw, 16px)' // Padding adaptativo con clamp
          }}
        >
          <div 
            className="mx-auto"
            style={{
              maxWidth: 'clamp(300px, 90vw, 1400px)' // Ancho máximo adaptativo
            }}
          >
            <BookingSearchForm isCompact={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyBookingForm;
