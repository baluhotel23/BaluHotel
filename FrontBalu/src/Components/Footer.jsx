import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faEnvelope, faPhone, faHeart } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faFacebook, faWhatsapp } from '@fortawesome/free-brands-svg-icons';

const Footer = () => {
    return (
        <footer className="bg-gradient-to-b from-gray-800 to-gray-900 text-white">
            {/* Main Footer Content */}
            <div className="container mx-auto px-4 md:px-8 py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">

                    {/* Hotel Information */}
                    <div className="space-y-6">
                        <div>
                            <img
                                src="/logo2.png"
                                alt="Hotel Balú"
                                className="h-16 md:h-20 mb-4"
                            />
                            <h3 className="text-xl font-bold text-yellow-400 mb-3">Hotel Balú</h3>
                            <p className="text-gray-300 leading-relaxed">
                                Tu descanso con elegancia en el corazón del Llano.
                                Hospitalidad, comodidad y experiencias inolvidables en Restrepo, Meta.
                            </p>
                        </div>

                        {/* Social Media */}
                        <div>

                            <div className="flex space-x-4">
                                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer"
                                    className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-full hover:shadow-lg transform hover:scale-110 transition-all duration-300">
                                    <FontAwesomeIcon icon={faInstagram} />
                                </a>
                                <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer"
                                    className="bg-blue-600 p-3 rounded-full hover:shadow-lg transform hover:scale-110 transition-all duration-300">
                                    <FontAwesomeIcon icon={faFacebook} />
                                </a>
                                <a href="https://wa.me/573001234567" target="_blank" rel="noopener noreferrer"
                                    className="bg-green-500 p-3 rounded-full hover:shadow-lg transform hover:scale-110 transition-all duration-300">
                                    <FontAwesomeIcon icon={faWhatsapp} />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-semibold mb-6 text-yellow-400">Enlaces Rápidos</h4>
                        <ul className="space-y-3">
                            <li>
                                <Link to="/" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 flex items-center">
                                    <span className="mr-2">🏠</span>Inicio
                                </Link>
                            </li>
                            <li>
                                <Link to="/RoomsSection" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 flex items-center">
                                    <span className="mr-2">🛏️</span>Habitaciones
                                </Link>
                            </li>
                          
                           
                            <li>
                                <Link to="/booking" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 flex items-center">
                                    <span className="mr-2">📅</span>Reservas
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h4 className="text-lg font-semibold mb-6 text-yellow-400">Contacto</h4>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-yellow-400 mt-1" />
                                <div>
                                    <a
                                        href="https://www.google.com/maps/place/HOTEL+BAL%C3%9A+-RESTREPO+META+-+ALOJAMIENTO-+HOSPEDAJE-+HABITACIONES/@4.2639367,-73.5849442,15z/data=!3m1!4b1!4m6!3m5!1s0x8e3fd313e38f15b3:0xe10ead26a24ea580!8m2!3d4.2639155!4d-73.5664901!16s%2Fg%2F11qmrlh82k?entry=ttu&g_ep=EgoyMDI1MDYwNC4wIKXMDSoASAFQAw%3D%3D"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <p className="text-gray-300">Cl. 8 #8-57, Centro</p>
                                        <p className="text-gray-300">Restrepo, Meta</p>
                                    </a>
                                </div>

                            </div>

                            <div className="flex items-center space-x-3">
                                <FontAwesomeIcon icon={faEnvelope} className="text-yellow-400" />
                                <a href="mailto:servicioalcliente@hotelbalu.com.co"
                                    className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">
                                    servicioalcliente@hotelbalu.com.co
                                </a>
                            </div>

                            <div className="flex items-center space-x-3">
                                <FontAwesomeIcon icon={faPhone} className="text-yellow-400" />
                                <a href="tel:+573112061010"
                                    className="text-gray-300 hover:text-yellow-400 transition-colors duration-300">
                                    +57 311 206 1010
                                </a>
                            </div>

                            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                                <h5 className="font-semibold text-yellow-400 mb-2">Horarios</h5>
                                <p className="text-gray-300 text-sm">Check-in: 3:00 p.m.</p>
                                <p className="text-gray-300 text-sm">Check-out: 12:00 m.</p>
                            </div>
                        </div>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="text-lg font-semibold mb-6 text-yellow-400">Información Legal</h4>
                        <ul className="space-y-3">
                            <li>
                                <Link to="/privacy-policy" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 flex items-center">
                                    <span className="mr-2">🔒</span>Políticas de Privacidad
                                </Link>
                            </li>
                            <li>
                                <Link to="/data-treatment" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 flex items-center">
                                    <span className="mr-2">📊</span>Tratamiento de Datos
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms-conditions" className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 flex items-center">
                                    <span className="mr-2">📝</span>Términos y Condiciones
                                </Link>
                            </li>

                        </ul>


                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-700">
                <div className="container mx-auto px-4 md:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <div className="text-gray-400 text-sm">
                            <p>&copy; 2024 Hotel Balú. Todos los derechos reservados.</p>
                        </div>

                        <div className="flex items-center space-x-2 text-gray-400 text-sm">
                            <span>Hecho con</span>
                            <FontAwesomeIcon icon={faHeart} className="text-red-500" />
                            <span>en Restrepo, Meta</span>
                        </div>

                        <div className="text-gray-400 text-sm">
                            <p> Experiencia auténtica del llano</p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
