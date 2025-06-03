import React from 'react';
import PropTypes from 'prop-types';

const RoomStatusGrid = ({ rooms }) => {
  console.log('rooms recibidas en RoomStatusGrid:', rooms); // Depuración

  const getRoomStatusColor = (status) => {
    switch (status) {
      case 'Limpia':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'Ocupada':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'Mantenimiento':
        return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'Reservada':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  // ⭐ NUEVA FUNCIÓN PARA MOSTRAR PRECIOS DE FORMA INTELIGENTE
  const displayRoomPrices = (room) => {
    // Si tiene promoción activa, mostrar precio promocional
    if (room.isPromo && room.promotionPrice) {
      return (
        <div className="text-sm">
          <p className="text-green-600 font-bold">
            🏷️ Oferta: ${room.promotionPrice.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 line-through">
            Desde: ${(room.priceSingle || room.price || 0).toLocaleString()}
          </p>
        </div>
      );
    }
    
    // Si tiene los nuevos campos de precio específicos
    if (room.priceSingle && room.priceDouble && room.priceMultiple) {
      return (
        <div className="text-xs">
          <p>1p: ${room.priceSingle.toLocaleString()}</p>
          <p>2p: ${room.priceDouble.toLocaleString()}</p>
          <p>3+p: ${room.priceMultiple.toLocaleString()}</p>
        </div>
      );
    }
    
    // Compatibilidad con precio legacy
    if (room.price) {
      return <p className="text-sm">Precio: ${room.price.toLocaleString()}</p>;
    }
    
    return <p className="text-xs text-gray-500">Precio no configurado</p>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCurrentBooking = (bookedDates) => {
    const now = new Date();
    return bookedDates.find(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      return now >= checkIn && now < checkOut;
    });
  };

  const getUpcomingBookings = (bookedDates) => {
    const now = new Date();
    return bookedDates
      .filter(booking => new Date(booking.checkIn) > now)
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
      .slice(0, 3); // Mostrar máximo 3 próximas reservas
  };

  if (!Array.isArray(rooms)) {
    console.error('El prop rooms no es un arreglo:', rooms);
    return <p>No hay habitaciones disponibles.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
      {rooms.map((room) => {
        const currentBooking = getCurrentBooking(room.bookedDates || []);
        const upcomingBookings = getUpcomingBookings(room.bookedDates || []);

        return (
          <div
            key={room.roomNumber}
            className={`border-2 rounded-lg p-4 text-center ${getRoomStatusColor(room.status)} transition-all hover:shadow-lg`}
          >
            {/* Información básica de la habitación */}
            <h4 className="font-bold text-lg mb-2">Habitación {room.roomNumber}</h4>
            <p className="text-sm">Tipo: {room.type}</p>
            
            {/* ⭐ USAR LA NUEVA FUNCIÓN PARA MOSTRAR PRECIOS */}
            <div className="mb-2">
              {displayRoomPrices(room)}
            </div>
            
            <p className="text-sm">Capacidad: {room.maxGuests} personas</p>
            
            {/* Estado actual */}
            <div className="mt-3 mb-3">
              <p className="font-semibold text-base">{room.status}</p>
            </div>

            {/* Información de ocupación actual */}
            {currentBooking && (
              <div className="bg-white bg-opacity-50 rounded-md p-2 mb-2 text-xs">
                <p className="font-semibold">Ocupación Actual:</p>
                <p>Check-out: {formatDate(currentBooking.checkOut)}</p>
                <p>Reserva ID: {currentBooking.bookingId}</p>
                {currentBooking.status && (
                  <p className="text-gray-600">Estado: {currentBooking.status}</p>
                )}
                {/* ⭐ MOSTRAR TOTAL DE LA RESERVA ACTUAL SI ESTÁ DISPONIBLE */}
                {currentBooking.totalAmount && (
                  <p className="text-green-600 font-medium">
                    Total: ${parseFloat(currentBooking.totalAmount).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Próximas reservas */}
            {upcomingBookings.length > 0 && (
              <div className="bg-white bg-opacity-50 rounded-md p-2 mb-2 text-xs">
                <p className="font-semibold mb-1">Próximas Reservas:</p>
                {upcomingBookings.map((booking, index) => (
                  <div key={`${booking.bookingId}-${index}`} className="border-b border-gray-300 pb-1 mb-1 last:border-b-0 last:mb-0">
                    <p>{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</p>
                    <p className="text-gray-600">ID: {booking.bookingId}</p>
                    {/* ⭐ MOSTRAR TOTAL DE PRÓXIMAS RESERVAS SI ESTÁ DISPONIBLE */}
                    {booking.totalAmount && (
                      <p className="text-blue-600 font-medium">
                        ${parseFloat(booking.totalAmount).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
                {room.bookedDates.filter(booking => new Date(booking.checkIn) > new Date()).length > 3 && (
                  <p className="text-gray-500 mt-1">
                    +{room.bookedDates.filter(booking => new Date(booking.checkIn) > new Date()).length - 3} más...
                  </p>
                )}
              </div>
            )}

            {/* Disponibilidad para fechas seleccionadas */}
            <div className="mt-3">
              <p className="text-xs">
                {room.isAvailable ? '✅ Disponible para fechas seleccionadas' : '❌ No disponible para fechas seleccionadas'}
              </p>
            </div>

            {/* ⭐ INFORMACIÓN ADICIONAL MEJORADA */}
            <div className="mt-2 text-xs text-gray-600">
              <p>Total reservas: {room.currentBookings || 0}</p>
              {/* ⭐ INFORMACIÓN DE PROMOCIONES MEJORADA */}
              {room.isPromo && room.promotionPrice && (
                <p className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded mt-1">
                  🏷️ Precio promocional activo
                </p>
              )}
              {/* ⭐ MOSTRAR INFORMACIÓN DE PRECIO POR HUÉSPED EXTRA SI EXISTE */}
              {room.pricePerExtraGuest > 0 && (
                <p className="text-blue-600">
                  Extra: +${room.pricePerExtraGuest.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

RoomStatusGrid.propTypes = {
  rooms: PropTypes.array.isRequired
};

export default RoomStatusGrid;