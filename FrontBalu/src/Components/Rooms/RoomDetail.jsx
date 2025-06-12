import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoomById } from '../../Redux/Actions/roomActions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faParking, faTv, faFan, faUtensils, faUser, faUsers, faArrowLeft, faChevronLeft, faChevronRight, faBed } from '@fortawesome/free-solid-svg-icons';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/autoplay';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import BookingSearchForm from '../Booking/BookingSearchForm'; // Import BookingSearchForm

const RoomDetail = () => {
  const { roomNumber } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedRoom, loading, errors } = useSelector(state => ({
    selectedRoom: state.room?.selectedRoom,
    loading: state.room?.loading?.general || false,
    errors: state.room?.errors?.general || null
  }));

const room = selectedRoom && selectedRoom.roomNumber === roomNumber ? selectedRoom : null;
  useEffect(() => {
    // Scroll to top when component mounts or roomNumber changes
    window.scrollTo(0, 0);
    dispatch(getRoomById(roomNumber));
  }, [dispatch, roomNumber]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[calc(100vh-150px)] bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent border-solid rounded-full animate-spin mb-3"></div>
        <p className="text-lg text-gray-600">Cargando detalles de la habitación...</p>
      </div>
    </div>
  );

  if (errors) return (
    <div className="flex justify-center items-center min-h-[calc(100vh-150px)] px-4 bg-gray-50">
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-lg text-center max-w-md">
        <p className="font-bold text-xl mb-2">Error al cargar la habitación</p>
        <p className="mb-4">{errors}. Por favor, intente más tarde o contacte soporte.</p>
        <button
          onClick={() => navigate('/RoomsSection')}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow hover:shadow-md"
        >
          Volver a Habitaciones
        </button>
      </div>
    </div>
  );
  
  if (!room) return (
    <div className="flex justify-center items-center min-h-[calc(100vh-150px)] px-4 bg-gray-50">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-6 rounded-md shadow-lg text-center max-w-md">
        <p className="font-bold text-xl mb-2">Habitación no encontrada</p>
        <p className="mb-4">La habitación que busca no existe o no está disponible.</p>
        <button
          onClick={() => navigate('/RoomsSection')}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow hover:shadow-md"
        >
          Ver todas las Habitaciones
        </button>
      </div>
    </div>
  );

  const heroImage = room.image_url && room.image_url.length > 0 ? room.image_url[0] : 'https://via.placeholder.com/1200x600.png?text=Hotel+Balú';
  const galleryImages = room.image_url && room.image_url.length > 1 ? room.image_url.slice(0) : []; // Use all images for gallery

  return (
    <div className="bg-gray-100">
      {/* Hero Image Section */}
      <div 
        className="h-[50vh] md:h-[60vh] bg-cover bg-center relative flex items-center justify-center text-white" // Adjusted height, items-center, justify-center
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-black opacity-40"></div> {/* Overlay */}
        
        {/* Room Type Text - Centered */}
        <div className="relative z-10 text-center p-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight shadow-text">
            {room.type}
          </h1>
          <p className="text-lg md:text-xl mt-2 shadow-text">Hotel Balú - Confort y Naturaleza</p>
        </div>
        {/* BookingSearchForm removed from here */}
      </div>

      {/* BookingSearchForm Section - Positioned between Hero and Main Content */}
      <div className="bg-gray-50 py-8 md:py-12"> {/* New section for the form */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* isCompact can be false or omitted for the standard version */}
          <BookingSearchForm isCompact={false} /> 
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <button
          onClick={() => navigate('/RoomsSection')}
          className="mb-6 md:mb-8 inline-flex items-center text-yellow-600 hover:text-yellow-700 font-medium transition-colors duration-200 group text-sm"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform duration-200" />
          Volver a todas las habitaciones
        </button>

        <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
            {/* Left Column: Description, Services, Gallery */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-1">{room.type}</h2>
                <p className="text-md text-gray-500">Habitación N° {room.roomNumber} &bull; Capacidad: {room.maxGuests} {room.maxGuests > 1 ? 'personas' : 'persona'}</p>
              </div>

              <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Descripción</h3>
                <p>{room.description || "Descripción detallada no disponible."}</p>
              </div>

              {room.Services && room.Services.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Servicios Incluidos</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-gray-600">
                    {room.Services.map((service) => (
                      <li key={service.id || service.name} className="flex items-center">
                        <FontAwesomeIcon icon={getServiceIcon(service.name)} className="text-yellow-500 w-5 mr-3 flex-shrink-0" />
                        <span>{service.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {galleryImages.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Galería de la Habitación</h3>
                  <div className="relative group rounded-lg overflow-hidden shadow">
                    <Swiper
                      modules={[Autoplay, Navigation, Pagination]}
                      slidesPerView={1}
                      spaceBetween={10}
                      autoplay={{ delay: 5000, disableOnInteraction: false }}
                      navigation={{
                        nextEl: '.swiper-button-next-gallery',
                        prevEl: '.swiper-button-prev-gallery',
                      }}
                      pagination={{ clickable: true, dynamicBullets: true }}
                      className="w-full h-[250px] sm:h-[350px]"
                    >
                      {galleryImages.map((url, index) => (
                        <SwiperSlide key={index}>
                          <img src={url} alt={`Galería ${index + 1} de ${room.type}`} className="object-cover w-full h-full" />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                    <div className="swiper-button-prev-gallery absolute top-1/2 left-2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full cursor-pointer transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </div>
                    <div className="swiper-button-next-gallery absolute top-1/2 right-2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full cursor-pointer transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                      <FontAwesomeIcon icon={faChevronRight} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Price, Booking Button */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 bg-gray-50 p-6 rounded-lg shadow-md"> {/* Sticky for booking details */}
                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Reserva tu estadía</h3>
                
                {/* New Swiper for room images in booking section */}
                {galleryImages.length > 0 ? (
                  <div className="relative group rounded-lg overflow-hidden shadow mb-4">
                    <Swiper
                      modules={[Navigation, Pagination, Autoplay]} // Added Autoplay here as well
                      slidesPerView={1}
                      spaceBetween={0} // No space between slides for a single image view
                      autoplay={{ delay: 3500, disableOnInteraction: false }} // Slightly different delay
                      navigation={{
                        nextEl: '.swiper-button-next-booking',
                        prevEl: '.swiper-button-prev-booking',
                      }}
                      pagination={{ clickable: true }} // Simpler pagination
                      className="w-full h-[180px] sm:h-[220px]" // Adjusted height for this smaller gallery
                    >
                      {galleryImages.map((url, index) => (
                        <SwiperSlide key={`booking-gallery-${index}`}>
                          <img src={url} alt={`Imagen ${index + 1} de ${room.type}`} className="object-cover w-full h-full" />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                    <div className="swiper-button-prev-booking absolute top-1/2 left-1 transform -translate-y-1/2 z-10 p-1.5 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full cursor-pointer transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                      <FontAwesomeIcon icon={faChevronLeft} size="sm"/>
                    </div>
                    <div className="swiper-button-next-booking absolute top-1/2 right-1 transform -translate-y-1/2 z-10 p-1.5 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full cursor-pointer transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                      <FontAwesomeIcon icon={faChevronRight} size="sm"/>
                    </div>
                  </div>
                ) : heroImage && (
                  <div className="mb-4 rounded-lg overflow-hidden shadow">
                    <img src={heroImage} alt={`Imagen principal de ${room.type}`} className="object-cover w-full h-[180px] sm:h-[220px]" />
                  </div>
                )}

               

                <button
                  onClick={() => navigate('/booking', { state: { roomNumber: room.roomNumber, roomType: room.type, roomPrice: room.price } })}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 text-lg"
                >
                  Reservar Ahora
                </button>
                <p className="text-xs text-gray-500 mt-3 text-center">¡Asegura tu habitación hoy mismo!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
     

    </div>
  );
};

const getServiceIcon = (serviceName) => {
  if (!serviceName) return faBed; // Default icon
  switch (serviceName.toLowerCase().trim()) {
    case 'wifi':
    case 'wi-fi':
    case 'internet inalámbrico':
      return faWifi;
    case 'parking':
    case 'parqueadero':
    case 'estacionamiento':
      return faParking;
    case 'tv':
    case 'televisión':
    case 'tv por cable':
      return faTv;
    case 'aire acondicionado':
      return faFan; // Using faFan, consider a specific AC icon if you have one
    case 'ventilador':
      return faFan;
    case 'desayuno':
    case 'desayuno incluido':
      return faUtensils;
    case '1 persona':
      return faUser;
    case '2 personas':
    case '3 personas':
    case '4 personas':
    case 'hasta 4 personas':
    case 'capacidad para 2': // Example variations
    case 'capacidad para 3':
    case 'capacidad para 4':
      return faUsers;
    default:
      return faBed; // A generic icon for unmapped services like "Cama doble"
  }
};

export default RoomDetail;