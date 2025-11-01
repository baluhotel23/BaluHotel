import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faFacebook, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import image from '../assets/LogoBALUOk.png';
import BookingSearchForm from './Booking/BookingSearchForm';

function Header() {
  return (
    <div className="px-4 md:px-8 -mt-4">
      <header 
        className="text-white text-center py-20 md:py-32 lg:py-48 relative bg-cover bg-center rounded-[2.5rem] min-h-[80vh] md:min-h-[75vh] shadow-2xl" // Added shadow-2xl
        style={{ 
          backgroundImage: `url(${image})`,
          boxShadow: '0 0 0 8px rgba(255, 255, 255, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.25)' // Custom white transparent border + shadow
        }}
      >
        <div className="absolute inset-0 bg-black opacity-40 rounded-[2.5rem]"></div>
        
        {/* Main Content */}
        <div className="relative z-10 container mx-auto px-4 md:px-6 flex flex-col items-center justify-center h-full pt-20 md:pt-24"> {/* Responsive padding */}
          <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 md:mb-4 leading-tight shadow-sm"> {/* Responsive text size */}
            Hotel Balú: Tu descanso con elegancia en el corazón del Llano
          </h1>
          <p className="text-sm md:text-lg lg:text-xl xl:text-2xl max-w-3xl shadow-sm mb-6 md:mb-8 px-4"> {/* Responsive text and padding */}
            Ubicado en el centro de Restrepo, Meta – donde la hospitalidad se siente desde el primer momento.
          </p>
          
          {/* Booking Search Form */}
          <div className="w-full max-w-5xl mt-4 md:mt-8 px-2"> {/* Responsive spacing and padding */}
            <BookingSearchForm />
          </div>
        </div>
      </header>
    </div>
  );
}

export default Header;