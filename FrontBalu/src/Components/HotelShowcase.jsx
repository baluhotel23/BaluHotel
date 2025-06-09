import React, { useState, useEffect } from 'react';

const HotelShowcase = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('hotel-showcase');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return (
    <section 
      id="hotel-showcase" 
      className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white"
    >
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          
          {/* Images Grid - Left Side */}
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {/* Large image top left */}
            <div 
              className={`col-span-2 transform transition-all duration-1000 ease-out ${
                isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
              }`}
              style={{ transitionDelay: '0ms' }}
            >
              <div 
                className="h-64 md:h-80 rounded-2xl bg-cover bg-center shadow-lg hover:shadow-xl transition-shadow duration-300"
                style={{ 
                  backgroundImage: `url('/src/assets/hotel.jpg')`, // Cambia por tu imagen
                  boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.2), 0 15px 35px -10px rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>

            {/* Small image bottom left */}
            <div 
              className={`transform transition-all duration-1000 ease-out ${
                isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <div 
                className="h-32 md:h-40 rounded-2xl bg-cover bg-center shadow-lg hover:shadow-xl transition-shadow duration-300"
                style={{ 
                  backgroundImage: `url('/src/assets/recepcion.jpg')`, // Cambia por tu imagen
                  boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.2), 0 15px 35px -10px rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>

            {/* Small image bottom right */}
            <div 
              className={`transform transition-all duration-1000 ease-out ${
                isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              <div 
                className="h-32 md:h-40 rounded-2xl bg-cover bg-center shadow-lg hover:shadow-xl transition-shadow duration-300"
                style={{ 
                  backgroundImage: `url('/src/assets/hotel2.jpg')`, // Cambia por tu imagen
                  boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.2), 0 15px 35px -10px rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>

            {/* Floating badge */}
            <div 
              className={`absolute -top-4 -right-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2 rounded-full shadow-lg transform transition-all duration-1000 ease-out ${
                isVisible ? 'translate-x-0 opacity-100 rotate-0' : 'translate-x-full opacity-0 rotate-12'
              }`}
              style={{ transitionDelay: '600ms' }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">🐕</span>
                <span className="text-sm font-bold">Pet Friendly</span>
              </div>
            </div>
          </div>

          {/* Content - Right Side */}
          <div 
            className={`transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight mb-4">
                  HOTEL BALÚ
                  <br />
                  <span className="text-yellow-600">Tu descanso con elegancia</span>
                  <br />
                  <span className="text-gray-600 text-2xl md:text-3xl">en el corazón del Llano</span>
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full mb-6"></div>
              </div>

              {/* Subtitle */}
              <h3 className="text-xl md:text-2xl font-semibold text-yellow-600 mb-4">
                Un lujo de oportunidades
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-6">
                El Hotel Balú tendrá el placer de descubrir la comodidad con la atención cálida y 
                personalizada de nuestro personal. Nos encontramos en una de las zonas privilegiadas 
                de Restrepo, Meta. Contamos con espacios donde puede relajarse, descansar, celebrar y 
                organizar eventos. La experiencia Hotel Balú le espera para darle la satisfacción que merece.
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Ubicación privilegiada</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Atención personalizada</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Espacios para eventos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Pet Friendly</span>
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-4">
                <button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  Descubre más sobre nosotros
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HotelShowcase;
