import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faStarHalfAlt, faQuoteLeft, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const ReviewsShowcase = () => {
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

    const element = document.getElementById('reviews-showcase-section');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  // Datos de ejemplo - puedes reemplazar con datos reales de Google Maps API
  const reviews = [
    {
      id: 1,
      name: "Carolina F.",
      rating: 5,
      date: "hace 2 semanas",
      comment: "Un lugar acogedor, tranquilo y con excelente atención. Ideal para descansar después de explorar el llano",
      avatar: "CF",
      platform: "Google"
    },
    {
      id: 2,
      name: "José M.",
      rating: 5,
      date: "hace 1 mes",
      comment: "Hotel Balú es el equilibrio perfecto entre comodidad y cercanía a todo lo bueno de Restrepo.",
      avatar: "JM",
      platform: "Google"
    },
   
  ];

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prevSlide) => 
        prevSlide === reviews.length - 1 ? 0 : prevSlide + 1
      );
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, [reviews.length]);

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <FontAwesomeIcon key={i} icon={faStar} className="text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <FontAwesomeIcon key="half" icon={faStarHalfAlt} className="text-yellow-400" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <FontAwesomeIcon key={`empty-${i}`} icon={faStar} className="text-gray-300" />
      );
    }

    return stars;
  };

  const nextSlide = () => {
    setCurrentSlide(currentSlide === reviews.length - 1 ? 0 : currentSlide + 1);
  };

  const prevSlide = () => {
    setCurrentSlide(currentSlide === 0 ? reviews.length - 1 : currentSlide - 1);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <section 
      id="reviews-showcase-section" 
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
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/logo2.png" 
                alt="Hotel Balú" 
                className="h-12 md:h-16 lg:h-20 mr-4"
              />
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800">
                Lo que dicen nuestros <span className="text-yellow-600">huéspedes</span>
              </h2>
            </div>
            <div className="w-32 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mx-auto mb-6"></div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-700 mb-4">
              ⭐ Experiencias reales
            </h3>
            <p className="text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              La satisfacción de nuestros huéspedes es nuestra mayor recompensa. 
              Lee lo que opinan quienes ya vivieron la experiencia Hotel Balú.
            </p>
          </div>
        </div>

        {/* Reviews Carousel */}
        <div className="max-w-6xl mx-auto relative">
          <div 
            className={`transform transition-all duration-1000 ease-out ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            {/* Main Review Display */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4  relative"
                 style={{ 
                   boxShadow: `
                     0 0 0 2px rgba(251, 191, 36, 0.3),
                     0 20px 40px -8px rgba(251, 191, 36, 0.2),
                     0 8px 16px -8px rgba(0, 0, 0, 0.15),
                     0 0 20px rgba(251, 191, 36, 0.1)
                   `
                 }}>
              
              {/* Google Reviews Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 text-center">
                <div className="flex items-center justify-center space-x-4">
                  <div className="bg-white rounded-full p-3">
                    <span className="text-2xl">📍</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Hotel Balú - Restrepo</h3>
                    <div className="flex items-center justify-center mt-2">
                      <div className="flex mr-2">
                        {renderStars(4.8)}
                      </div>
                      <span className="text-yellow-100">4.8 • 156 reseñas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="p-8 md:p-12 min-h-[400px] flex items-center">
                <div className="w-full text-center">
                  {/* Quote Icon */}
                  <div className="mb-6">
                   
                  </div>

                  {/* Review Text */}
                  <p className="text-xl md:text-2xl text-gray-700 leading-relaxed mb-8 max-w-4xl mx-auto font-light italic">
                    "{reviews[currentSlide].comment}"
                  </p>

                  {/* Reviewer Info */}
                  <div className="flex items-center justify-center space-x-4">
                    {/* Avatar */}
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-xl border-3 border-white shadow-lg">
                      {reviews[currentSlide].avatar}
                    </div>
                    
                    <div className="text-left">
                      <h4 className="text-xl font-bold text-gray-800">
                        {reviews[currentSlide].name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex">
                          {renderStars(reviews[currentSlide].rating)}
                        </div>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500">{reviews[currentSlide].date}</span>
                      </div>
                      <div className="flex items-center mt-1">
                       
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-xl text-gray-600 hover:text-yellow-600 hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 hover:border-yellow-400"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-xl text-gray-600 hover:text-yellow-600 hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 hover:border-yellow-400"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center mt-8 space-x-3">
              {reviews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-yellow-500 shadow-lg' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

          
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewsShowcase;
