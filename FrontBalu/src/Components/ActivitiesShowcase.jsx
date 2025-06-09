import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ActivitiesShowcase = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target); // Optional: stop observing after it's visible
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('activities-showcase-section');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  const activities = [
    {
      id: 1,
      icon: "🌿",
      title: "Aventura y Naturaleza",
      description: "Explora la belleza indómita del llano. Siente la adrenalina en emocionantes cabalgatas, descubre senderos ecológicos y refréscate en cascadas escondidas y ríos cristalinos.",
      image: "/src/assets/actividad.jpeg", // Asegúrate que esta imagen exista
      colorTheme: "yellow",
      features: ["Cabalgatas y caminatas por ríos y caños", "Senderismo", "Cascadas escondidas", "Rutas ecológicas"]
    },
    {
      id: 2,
      icon: "⛪",
      title: "Turismo Religioso",
      description: "Conéctate con la profunda fe y las tradiciones ancestrales de nuestra región. Visita el emblemático Santuario y participa en celebraciones llenas de devoción.",
      image: "/src/assets/actividad.jpeg", // Asegúrate que esta imagen exista
      colorTheme: "yellow",
      features: ["Visita al emblematico Santuario La Inmaculada Concepción", "Peregrinaciones y celebraciones tradicionales, semana santa, viacrusis a Miralindo"]
    },
    {
      id: 3,
      icon: "🦅",
      title: "Avistamiento de Aves",
      description: "Un paraíso para los amantes de la ornitología y la fotografía. Observa especies únicas en su hábitat natural, entre humedales y reservas llenas de vida.",
      image: "/src/assets/actividad.jpeg", // Asegúrate que esta imagen exista
      colorTheme: "yellow",
      features: ["Observa especies únicas en humedales y reservas naturales", "Ideal para amantes de la fotografía y la naturaleza"]
    },
    {
      id: 4,
      icon: "🍖",
      title: "Gastronomía Llanera",
      description: "Deléitate con los sabores auténticos de la cocina llanera. Prueba la tradicional mamona, hayacas caseras y tungos, en un ambiente festivo con música en vivo.",
      image: "/src/assets/actividad.jpeg", // Asegúrate que esta imagen exista
      colorTheme: "yellow",
      features: ["Mamona hayacas, tungos y más", "Restaurantes con música  en vivo", "Ambiente 100% llanero"]
    }
  ];

  const colorClasses = {

    blue: {
      bg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      border: 'border-blue-500',
      text: 'text-blue-600',
      hoverRing: 'hover:ring-blue-400',
      bullet: 'bg-blue-500'
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
      border: 'border-yellow-500',
      text: 'text-yellow-600',
      hoverRing: 'hover:ring-yellow-400',
      bullet: 'bg-yellow-500'
    },
  
  };


  return (
    <section 
      id="activities-showcase-section" 
      className="py-16 md:py-24 bg-gradient-to-b from-gray-100 to-white"
    >
      <div className="container mx-auto px-4 md:px-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div 
            className={`transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/logo2.png" 
                alt="Hotel Balú" 
                className="h-12 md:h-16 lg:h-20 mr-4"
              />
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800">
                Qué hacer en <span className="text-yellow-600">Restrepo, Meta</span>
              </h2>
            </div>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mx-auto mb-6"></div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-700 mb-4">
              Vive la experiencia auténtica del llano
            </h3>
            <p className="text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Restrepo es mucho más que un destino: es una invitación a explorar, saborear y vivir 
              la cultura llanera en su máxima expresión.
            </p>
          </div>
        </div>

        {/* Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-12 max-w-7xl mx-auto">
          {activities.map((activity, index) => {
            const theme = colorClasses[activity.colorTheme] || colorClasses.blue;
            return (
              <div
                key={activity.id}
                className={`transform transition-all duration-1000 ease-out ${
                  isVisible 
                    ? 'translate-y-0 opacity-100' 
                    : 'translate-y-12 opacity-0'
                } rounded-2xl overflow-hidden group border-2 ${theme.border} relative`}
                style={{ 
                  transitionDelay: `${index * 150}ms`,
                  // Enhanced shadow for the entire card
                  boxShadow: `0 20px 40px -8px rgba(0,0,0,0.25), 0 8px 16px -8px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05)`
                }}
              >
                {/* Image Container - Enhanced Shadow */}
                <div className="relative h-80 md:h-96 w-full overflow-hidden rounded-2xl"
                     style={{
                       // Enhanced shadow around the image
                       boxShadow: `
                         0 25px 50px -12px rgba(0, 0, 0, 0.4),
                         0 10px 20px -8px rgba(0, 0, 0, 0.3),
                         0 4px 8px -4px rgba(0, 0, 0, 0.2),
                         inset 0 0 0 1px rgba(255, 255, 255, 0.1)
                       `,
                       filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.35))'
                     }}>
                  <img
                    src={activity.image}
                    alt={activity.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 rounded-2xl"
                    style={{
                      // Additional inner shadow for depth
                      boxShadow: 'inset 0 0 60px rgba(0,0,0,0.25)'
                    }}
                  />
                  {/* Overlay for Title and Icon */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${activity.colorTheme === 'yellow' ? 'from-black/70 via-black/40' : 'from-black/60 via-black/30'} to-transparent flex flex-col justify-between p-6`}>
                    <div>
                      {/* Icon Badge with enhanced shadow */}
                      <div className="bg-white/90 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center border-2 border-white mb-3"
                           style={{
                             boxShadow: '0 8px 25px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.2)'
                           }}>
                        <span className="text-3xl">{activity.icon}</span>
                      </div>
                    </div>
                    {/* Title on Image with text shadow */}
                    <h3 className={`text-3xl font-bold text-white leading-tight`}
                        style={{
                          textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)'
                        }}>
                      {activity.title}
                    </h3>
                  </div>
                </div>

                {/* Content Overlay - Enhanced and More Eye-catching */}
                <div className={`absolute inset-0 backdrop-blur-lg p-8 flex flex-col justify-center
                                 transform transition-all duration-500 ease-in-out
                                 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100`}
                     style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 50%, rgba(255,255,255,0.95) 100%)',
                       boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2), 0 20px 40px rgba(0,0,0,0.15)'
                     }}>
                  <div className="text-center">
                    {/* Enhanced title with gradient text - Fixed syntax */}
                    <h3 className="text-3xl md:text-4xl font-extrabold mb-6 bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent"
                        style={{
                          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                      {activity.title}
                    </h3>
                    
                    {/* Enhanced description */}
                   

                    {/* Enhanced Features with better styling */}
                    <div className="space-y-3 mb-6 max-w-sm mx-auto">
                     
                      {activity.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center space-x-3 justify-center p-2 rounded-lg bg-white/60 backdrop-blur-sm"
                             style={{
                               boxShadow: '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)'
                             }}>
                          <div className={`w-3 h-3 ${theme.bullet} rounded-full flex-shrink-0`}
                               style={{
                                 boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                               }}></div>
                          <span className="text-sm md:text-base text-gray-700 font-semibold">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Decorative element instead of button */}
                    <div className="mt-6 flex justify-center">
                      <div className={`px-6 py-3 ${theme.bg} text-white rounded-full font-bold text-sm md:text-base`}
                           style={{
                             boxShadow: '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
                           }}>
                        🌟 Experiencia Única
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ActivitiesShowcase;
