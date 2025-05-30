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
            <p className="text-sm">Precio: ${room.price}</p>
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

            {/* Información adicional */}
            <div className="mt-2 text-xs text-gray-600">
              <p>Total reservas: {room.currentBookings || 0}</p>
              {room.isPromo && (
                <p className="text-green-600 font-semibold">
                  🏷️ Promoción: ${room.promotionPrice}
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
