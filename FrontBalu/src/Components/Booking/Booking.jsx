import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAvailability, getRoomTypes, createBooking } from '../../Redux/Actions/bookingActions';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faParking, faTv, faFan, faUtensils, faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const Booking = () => {
  const dispatch = useDispatch();
  const { availability, roomTypes, loading, error } = useSelector(state => state.booking);

  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date());
  const [roomType, setRoomType] = useState('');
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    dispatch(getRoomTypes());
    dispatch(checkAvailability({ checkIn, checkOut, roomType: '' })); // Cargar todas las habitaciones por defecto
  }, [dispatch]);

  const handleSearch = () => {
    dispatch(checkAvailability({ checkIn, checkOut, roomType }));
  };

  const handleReserve = (room) => {
    const totalGuests = adults + children;
    let maxGuests = 0;

    switch (room.type.toLowerCase()) {
      case 'pareja':
      case 'sencilla':
        maxGuests = 2;
        break;
      case 'triple':
        maxGuests = 3;
        break;
      case 'cuadruple':
        maxGuests = 8;
        break;
      default:
        maxGuests = room.maxGuests;
    }

    if (totalGuests > maxGuests) {
      alert('La cantidad de personas supera el máximo permitido para esta habitación.');
      return;
    }
    setSelectedRoom(room);
  };

  const handleBooking = () => {
    const totalGuests = adults + children;
    let pricePerPerson = selectedRoom.price;

    if (totalGuests === 2) {
      pricePerPerson = 60000;
    } else if (totalGuests > 4) {
      pricePerPerson = 50000;
    }

    const nights = differenceInDays(checkOut, checkIn);
    const totalAmount = pricePerPerson * totalGuests * nights;

    const bookingData = {
      checkIn,
      checkOut,
      pointOfSale: 'Online',
      status: 'pending',
      guestCount: totalGuests,
      totalAmount,
    };

    dispatch(createBooking(bookingData));
  };

  const getServiceIcon = (serviceName) => {
    switch (serviceName.toLowerCase()) {
      case 'wifi': return faWifi;
      case 'parking': return faParking;
      case 'tv': return faTv;
      case 'aire acondicionado': return faFan;
      case 'ventilador': return faFan;
      case 'desayuno': return faUtensils;
      default: return faUser;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
  };

  const formatDate = (date) => {
    return format(date, 'dd-MM-yyyy', { locale: es });
  };

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-6 bg-stone-500 text-white min-h-screen">
      {/* Formulario de Búsqueda */}
      <div className="col-span-1 bg-gray-800 p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Buscar Habitaciones</h1>
        <label className="block mb-2">Desde</label>
        <DatePicker
          selected={checkIn}
          onChange={date => setCheckIn(date)}
          className="w-full p-2 rounded-lg bg-gray-700"
          dateFormat="dd-MM-yyyy"
          locale={es}
        />
        <label className="block mt-4 mb-2">Hasta</label>
        <DatePicker
          selected={checkOut}
          onChange={date => setCheckOut(date)}
          className="w-full p-2 rounded-lg bg-gray-700"
          dateFormat="dd-MM-yyyy"
          locale={es}
        />
        <label className="block mt-4 mb-2">Tipo de Habitación</label>
        <select value={roomType} onChange={e => setRoomType(e.target.value)} className="w-full p-2 rounded-lg bg-gray-700">
          <option value="">Selecciona un tipo</option>
          {roomTypes?.map(type => (
            <option key={type.type} value={type.type}>{type.type}</option>
          ))}
        </select>
        <button onClick={handleSearch} className="mt-4 w-full p-3 bg-stone-500 hover:bg-Hover rounded-full font-bold">Buscar</button>
      </div>

      {/* Habitaciones Disponibles */}
      <div className="col-span-3">
        {loading && <p>Cargando habitaciones...</p>}
        {error && <p>Error: {error}</p>}
        {availability?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Habitaciones Disponibles</h2>
            <div className="space-y-6">
              {availability.map(room => (
                <div key={room.roomNumber} className="bg-gray-800 p-6 rounded-xl flex flex-col md:flex-row items-center shadow-lg">
                  <img src={room.image_url[0]} alt={`Habitación ${room.roomNumber}`} className="w-32 h-32 object-cover rounded-lg mb-4 md:mb-0 md:mr-6" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{room.type}</h3>
                    <p className="text-gray-400 mb-2">{room.description}</p>
                    <ul className="space-y-2">
                      {room.Services && room.Services.map((service, index) => (
                        <li key={index} className="flex text-white items-center space-x-2">
                          <FontAwesomeIcon icon={getServiceIcon(service.name)} />
                          <span>{service.name}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-2xl font-bold text-yellow-400">{formatPrice(room.price)}</p>
                  </div>
                  <div className="mt-4 md:mt-0 md:ml-6 flex space-x-4">
                    <div>
                      <label className="block text-sm">Habitaciones</label>
                      <select value={rooms} onChange={e => setRooms(e.target.value)} className="w-16 p-2 rounded-lg bg-gray-700">
                        {[...Array(10).keys()].map(num => (
                          <option key={num + 1} value={num + 1}>{num + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm">Adultos</label>
                      <select value={adults} onChange={e => setAdults(e.target.value)} className="w-16 p-2 rounded-lg bg-gray-700">
                        {[...Array(10).keys()].map(num => (
                          <option key={num + 1} value={num + 1}>{num + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm">Niños</label>
                      <select value={children} onChange={e => setChildren(e.target.value)} className="w-16 p-2 rounded-lg bg-gray-700">
                        {[...Array(10).keys()].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={() => handleReserve(room)} className="mt-4 w-full p-3 bg-stone-500 hover:bg-Hover rounded-full font-bold">Reservar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedRoom && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg mt-6">
            <h2 className="text-xl font-bold mb-4">Confirmar Reserva</h2>
            <p className="mb-2">Habitación: {selectedRoom.type}</p>
            <p className="mb-2">Desde: {formatDate(checkIn)}</p>
            <p className="mb-2">Hasta: {formatDate(checkOut)}</p>
            <p className="mb-2">Adultos: {adults}</p>
            <p className="mb-2">Niños: {children}</p>
            <p className="mb-2">Total: {formatPrice(selectedRoom.price * (adults + children))}</p>
            <button onClick={handleBooking} className="mt-4 w-full p-3 bg-stone-500 hover:bg-Hover rounded-full font-bold">Confirmar Reserva</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;