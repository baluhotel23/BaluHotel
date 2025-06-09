import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const RoomsShowcase = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('rooms-showcase');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  const rooms = [
    {
      id: 1,
      title: "Habitación Doble",
      description: "Ambiente íntimo, ideal para estar cómodo, de visita o viajes de trabajo.",
      features: ["Aire acondicionado/ventilador", "Televisión", "WiFi", "Baño privado", "Parqueadero privado"],
      image: "/src/assets/hab5.jpg",
      maxGuests: 2
    },
    {
      id: 2,
      title: "Habitación para Parejas",
      description: "Ambiente íntimo, ideal para parejas o viajes de trabajo.",
      features: ["Aire acondicionado/ventilador", "Televisión", "WiFi", "Baño privado", "Parqueadero privado"],
      image: "/src/assets/hab4.jpg",
      maxGuests: 3
    },
    {
      id: 3,
      title: "Habitación Familiar",
      description: "Perfecta para compartir en familia o con amigos, sin perder el confort.",
      features: ["Aire acondicionado/ventilador", "Televisión", "WiFi", "Baño privado", "Parqueadero privado"],
      image: "/src/assets/hab3.jpg",
      maxGuests: 8,
      
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % rooms.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + rooms.length) % rooms.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <section 
      id="rooms-showcase" 
      className="py-16 md:py-24 bg-gradient-to-b from-white to-gray-50"
    >
      <div className="container mx-auto px-4 md:px-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div 
            className={`transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/logo2.png" 
                alt="Hotel Balú" 
                className="h-12 md:h-16 lg:h-20 mr-4"
              />
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800">
                Nuestras <span className="text-yellow-600">Habitaciones</span>
              </h2>
            </div>
            <div className="w-24 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full mx-auto mb-4"></div>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Descubre el confort y la elegancia en cada una de nuestras habitaciones, 
              diseñadas para brindarte la mejor experiencia de descanso
            </p>
          </div>
        </div>

        {/* Slider Container */}
        <div className="relative max-w-7xl mx-auto">
          <div className="overflow-hidden rounded-2xl">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {rooms.map((room, index) => (
                <div
                  key={room.id}
                  className="w-full flex-shrink-0"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-4">
                    
                    {/* Image Section */}
                    <div className="lg:order-1">
                      <div 
                        className={`relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 ${
                          room.isSpecial ? 'ring-4 ring-yellow-400' : ''
                        }`}
                        style={{ 
                          boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.2), 0 15px 35px -10px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        {room.isSpecial && (
                          <div className="absolute top-4 right-4 z-10">
                            <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                              ⭐ Especial
                            </span>
                          </div>
                        )}

                        <div 
                          className="w-full h-80 md:h-96 bg-cover bg-center transition-transform duration-700 hover:scale-110"
                          style={{ 
                            backgroundImage: `url(${room.image})`,
                            backgroundPosition: 'center'
                          }}
                        />
                        
                        {/* Capacity Badge */}
                        <div className="absolute bottom-4 right-4">
                          <div className="bg-blue-600 text-white rounded-full px-4 py-2 text-sm font-semibold shadow-lg">
                            👥 {room.maxGuests === 1 ? '1 persona' : room.maxGuests === 8 ? 'Hasta 8 personas' : `${room.maxGuests} personas`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="lg:order-2 space-y-6">
                      <div>
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
                          {room.title}
                        </h3>
                        {room.subtitle && (
                          <p className="text-lg md:text-xl text-yellow-600 font-semibold mb-3">
                            {room.subtitle}
                          </p>
                        )}
                        <div className="w-16 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full mb-4"></div>
                      </div>
                      
                      <p className="text-gray-600 text-lg leading-relaxed">
                        {room.description}
                      </p>

                      {/* Features */}
                      <div className="space-y-3">
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">Nuestros Servicios:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {room.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                              <span className="text-gray-700">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Button - Matching navbar style */}
                      <div className="pt-4">
                        <Link 
                          to="/booking"
                          className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                          Reservar Ahora
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Slide Indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {rooms.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  currentSlide === index
                    ? 'bg-yellow-500 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div 
          className={`text-center mt-20 transform transition-all duration-1000 ease-out ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
          style={{ transitionDelay: '900ms' }}
        >
          <div className=" rounded-2xl p-8 max-w-4xl mx-auto border border-yellow-200 shadow-lg">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              ¿No encuentras lo que buscas?
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              Contáctanos y te ayudaremos a encontrar la habitación perfecta para tu estadía
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/contact"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                📞 Contactanos
              </Link>
              <Link 
                to="/RoomsSection"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                🏨 Ver Todas las Habitaciones
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoomsShowcase;
