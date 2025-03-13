import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faFacebook, faWhatsapp } from '@fortawesome/free-brands-svg-icons';

function Header() {
  return (
    <header className="bg-secondary text-white text-center py-16 relative">
      <div className="absolute top-4 right-4 flex space-x-4">
        <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400">
          <FontAwesomeIcon icon={faInstagram} size="1x" />
        </a>
        <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400">
          <FontAwesomeIcon icon={faFacebook} size="1x" />
        </a>
        <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400">
          <FontAwesomeIcon icon={faWhatsapp} size="1x" />
        </a>
      </div>
      <h1 className="text-3xl font-semibold">Nuestras Habitaciones</h1>
      <p className="mt-2 text-degrade hover:underline cursor-pointer">Pensadas para tu comodidad</p>
    </header>
  );
}

export default Header;