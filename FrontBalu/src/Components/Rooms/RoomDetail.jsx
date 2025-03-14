import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoomById } from '../../Redux/Actions/roomActions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faParking, faTv, faFan, faUtensils, faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/autoplay';
import { Autoplay } from 'swiper/modules';

const RoomDetail = () => {
  const { roomNumber } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedRoom: room, loading, error } = useSelector(state => state.room);

  useEffect(() => {
    dispatch(getRoomById(roomNumber));
  }, [dispatch, roomNumber]);

  if (loading) return <p>Cargando habitación...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!room) return <p>Habitación no encontrada</p>;

  return (
    <div className="container mx-auto p-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative w-full h-96"> {/* Contenedor con tamaño fijo */}
          <Swiper
            modules={[Autoplay]}
            slidesPerView={1}
            spaceBetween={0}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            className="w-full h-full"
          >
            {room.image_url && room.image_url.map((url, index) => (
              <SwiperSlide key={index}>
                <img src={url} alt={`Imagen ${index + 1}`} className="object-contain w-full h-full" />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">{room.type}</h2>
          <h2 className="text-xl font-bold mt-4 text-secondary">Habitación N°{room.roomNumber}</h2>
          <p className="mb-4">Capacidad máxima: {room.maxGuests} {room.maxGuests > 1 ? 'personas' : 'persona'}</p>
          <p className="mb-4">Detalle  {room.description}</p>
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">Servicios</h3>
            <ul className="space-y-2">
              {room.Services && room.Services.map((service, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={getServiceIcon(service.name)} />
                  <span>{service.name}</span>
                </li>
              ))}
            </ul>
            <h3 className="text-xl font-bold mt-2 text-secondary flex items-center">
              ${parseFloat(room.price).toLocaleString('es-ES')} X
              <FontAwesomeIcon icon={faUser} className="ml-2" />
            </h3>
          </div>
          <button
            onClick={() => navigate('/booking')}
            className="bg-degrade px-4 py-2 rounded-full text-white hover:bg-yellow-700 opacity-50"
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
};

const getServiceIcon = (serviceName) => {
  switch (serviceName.toLowerCase()) {
    case 'wifi':
      return faWifi;
    case 'parking':
      return faParking;
    case 'tv':
      return faTv;
    case 'aire acondicionado':
      return faFan;
    case 'ventilador':
      return faFan;
    case 'desayuno':
      return faUtensils;
    case '1 persona':
      return faUser;
    case '2 personas':
    case '3 personas':
    case '4 personas':
    case 'muchas personas':
      return faUsers;
    default:
      return faUser;
  }
};

export default RoomDetail;