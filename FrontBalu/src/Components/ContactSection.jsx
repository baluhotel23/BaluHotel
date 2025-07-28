import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faEnvelope, faPhone, faClock, faDirections } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faFacebook, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import image from '../../public/hotel.jpg'; // Import your main image


const ContactSection = () => {
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

    const element = document.getElementById('contact-section');
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
      id="contact-section" 
      className="py-16 md:py-24 bg-gradient-to-b from-white to-gray-50"
    >
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
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
                Ubicación y <span className="text-yellow-600">Contacto</span>
              </h2>
            </div>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mx-auto mb-6"></div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-700 mb-4">
               Estamos ubicados en el centro de Restrepo, Meta 
            </h3>
            <p className="text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Fácil acceso, ubicación privilegiada y todo lo que necesitas para una experiencia inolvidable.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
          
          {/* Contact Information - Left Side */}
          <div 
            className={`transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <div className="space-y-8">
              {/* Address */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-yellow-600 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                   style={{ 
                     boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.2), 0 15px 35px -10px rgba(0, 0, 0, 0.15)',
                     backgroundImage: `url(${image})`,
                     backgroundSize: 'cover',
                     backgroundPosition: 'right center'
                   }}>
                <div className="absolute inset-0 bg-white bg-opacity-85 backdrop-blur-sm"></div>
                <div className="relative z-10 flex items-start space-x-4">
                  <div className="bg-yellow-100 p-3 rounded-full shadow-lg">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-yellow-600 text-xl" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800 mb-2">Dirección</h4>
                    <p className="text-gray-700 text-lg font-medium">Cl. 8 #8-57, Centro</p>
                    <p className="text-gray-700 text-lg font-medium">Restrepo, Meta</p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-yellow-600 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                   style={{ 
                     boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.6), 0 15px 35px -10px rgba(0, 0, 0, 0.15)',
                     backgroundImage: `url('/recepcion.jpg')`,
                     backgroundSize: 'cover',
                     backgroundPosition: 'right center'
                   }}>
                <div className="absolute inset-0 bg-white bg-opacity-85 backdrop-blur-sm"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-full shadow-lg">
                      <FontAwesomeIcon icon={faEnvelope} className="text-blue-600 text-xl" />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-800">Correo Electrónico</h5>
                      <a href="mailto:servicioalcliente@hotelbalu.com.co" 
                         className="text-blue-600 hover:text-blue-800 transition-colors font-medium">
                        servicioalcliente@hotelbalu.com.co
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 p-3 rounded-full shadow-lg">
                      <FontAwesomeIcon icon={faPhone} className="text-green-600 text-xl" />
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-800">Teléfono</h5>
                      <a href="tel:+573001234567" 
                         className="text-green-600 hover:text-green-800 transition-colors font-medium">
                        +57 311 206 1010
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Check-in/Check-out */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-yellow-600 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                   style={{ 
                     boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.2), 0 15px 35px -10px rgba(0, 0, 0, 0.15)',
                     backgroundImage: `url('/hotel2.jpg')`,
                     backgroundSize: 'cover',
                     backgroundPosition: 'right center'
                   }}>
                <div className="absolute inset-0 bg-white bg-opacity-85 backdrop-blur-sm"></div>
                <div className="relative z-10 flex items-start space-x-4">
                  <div className="bg-purple-100 p-3 rounded-full shadow-lg">
                    <FontAwesomeIcon icon={faClock} className="text-yellow-600 text-xl" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800 mb-3">Horarios</h4>
                    <div className="space-y-2">
                      <p className="text-gray-700 font-medium"><span className="font-semibold">Check-in:</span> 3:00 p.m.</p>
                      <p className="text-gray-700 font-medium"><span className="font-semibold">Check-out:</span> 12:00 m.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="p-6 rounded-2xl shadow-lg border-2 border-yellow-600 hover:shadow-xl transition-all duration-300">
                <h4 className="text-xl font-bold text-gray-800 mb-4 text-center">🌟 Síguenos en redes sociales</h4>
                <div className="flex justify-center space-x-6">
                  <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" 
                     className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-full text-white hover:shadow-lg transform hover:scale-110 transition-all duration-300">
                    <FontAwesomeIcon icon={faInstagram} size="lg" />
                  </a>
                  <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" 
                     className="bg-blue-600 p-4 rounded-full text-white hover:shadow-lg transform hover:scale-110 transition-all duration-300">
                    <FontAwesomeIcon icon={faFacebook} size="lg" />
                  </a>
                  <a href="https://wa.me/573001234567" target="_blank" rel="noopener noreferrer" 
                     className="bg-green-500 p-4 rounded-full text-white hover:shadow-lg transform hover:scale-110 transition-all duration-300">
                    <FontAwesomeIcon icon={faWhatsapp} size="lg" />
                  </a>
                </div>
              </div>

              {/* How to get there button */}
              <div className="text-center">
                <a href="https://www.google.com/maps/place/HOTEL+BAL%C3%9A+-RESTREPO+META+-+ALOJAMIENTO-+HOSPEDAJE-+HABITACIONES/@4.2639367,-73.5849442,15z/data=!3m1!4b1!4m6!3m5!1s0x8e3fd313e38f15b3:0xe10ead26a24ea580!8m2!3d4.2639155!4d-73.5664901!16s%2Fg%2F11qmrlh82k?entry=ttu&g_ep=EgoyMDI1MDYwNC4wIKXMDSoASAFQAw%3D%3D" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <FontAwesomeIcon icon={faDirections} className="mr-3" />
                  Cómo llegar
                </a>
              </div>
            </div>
          </div>

          {/* Interactive Map/Image - Right Side */}
          <div 
            className={`transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <div className="relative">
              {/* Main location image */}
              <div 
                className="h-96 md:h-[500px] rounded-2xl bg-cover bg-center shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative"
                style={{ 
                  backgroundImage: `url('/hotel.jpg')`, // Imagen del exterior del hotel
                  boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.2), 0 20px 40px -15px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
                
                {/* Floating location badge */}
                <div className="absolute top-6 left-6">
                <div className="bg-white bg-opacity-80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white border-opacity-50"
                     style={{
                       background: 'rgba(255, 255, 255, 0.8)',
                       backdropFilter: 'blur(12px)'
                     }}>
                  <div className="flex items-center space-x-3">
                    <div className="bg-red-500 p-2 rounded-full shadow-md">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Hotel Balú</p>
                      <p className="text-sm text-gray-600">Centro de Restrepo</p>
                    </div>
                  </div>
                </div>
              </div>

                {/* Interactive overlay with more transparency */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-white bg-opacity-75 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white border-opacity-50"
                       style={{
                         background: 'rgba(255, 255, 255, 0.75)',
                         backdropFilter: 'blur(12px)'
                       }}>
                    <h4 className="text-xl font-bold text-gray-800 mb-3">🌟 Ubicación Privilegiada</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                      <div className="font-medium">✅ Centro de Restrepo</div>
                      <div className="font-medium">✅ Fácil acceso</div>
                      <div className="font-medium">✅ Cerca de todo</div>
                      <div className="font-medium">✅ Transporte público</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini images/features below */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div 
                  className="h-32 rounded-xl bg-cover bg-center shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                  style={{ 
                    backgroundImage: `url('/religioso.jpeg')`, // Imagen del centro de Restrepo
                    boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.2), 0 10px 25px -8px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <span className="text-white font-bold text-center">Centro<br/>Histórico</span>
                  </div>
                </div>
                
                <div 
                  className="h-32 rounded-xl bg-cover bg-center shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                  style={{ 
                    backgroundImage: `url('/actividad.jpeg')`, // Imagen de los llanos
                    boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.2), 0 10px 25px -8px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <span className="text-white font-bold text-center">Paisajes<br/>del Llano</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
