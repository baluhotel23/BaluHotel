import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const RoomStatusGrid = ({ rooms = [], checkIn, checkOut, onRoomSelect, selectedRoom }) => {
  console.log('🏨 rooms recibidas en RoomStatusGrid:', rooms);
  console.log('📊 Cantidad de rooms en Grid:', rooms?.length || 0);

  // Si no hay habitaciones, mostrar mensaje
  if (!rooms || rooms.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-200 rounded-2xl shadow-xl p-8">
        <div className="text-center py-16">
          <div className="text-6xl mb-6">🏨</div>
          <h3 className="text-2xl font-bold text-slate-700 mb-3">No hay habitaciones disponibles</h3>
          <p className="text-slate-500 text-lg">Por favor, seleccione fechas y tipo de habitación para ver la disponibilidad</p>
        </div>
      </div>
    );
  }

  // Función para obtener el estado visual de la habitación
  const getRoomStatusConfig = (room) => {
    if (!room.isAvailable) {
      return {
        status: 'occupied',
        label: 'Ocupada',
        className: 'border-red-400 hover:shadow-red-200',
        statusBadge: 'bg-red-100 text-red-800',
        topBorderColor: 'bg-gradient-to-r from-red-400 to-red-500',
        icon: '🚫',
        disabled: true
      };
    }

    switch (room.status?.toLowerCase()) {
      case 'available':
        return {
          status: 'available',
          label: 'Disponible',
          className: 'border-green-400 hover:shadow-green-200',
          statusBadge: 'bg-green-100 text-green-800',
          topBorderColor: 'bg-gradient-to-r from-green-400 to-green-500',
          icon: '✅',
          disabled: false
        };
      case 'maintenance':
        return {
          status: 'maintenance',
          label: 'Mantenimiento',
          className: 'border-orange-400 hover:shadow-orange-200',
          statusBadge: 'bg-orange-100 text-orange-800',
          topBorderColor: 'bg-gradient-to-r from-orange-400 to-orange-500',
          icon: '🔧',
          disabled: true
        };
      case 'cleaning':
        return {
          status: 'cleaning',
          label: 'Limpieza',
          className: 'border-blue-400 hover:shadow-blue-200',
          statusBadge: 'bg-blue-100 text-blue-800',
          topBorderColor: 'bg-gradient-to-r from-blue-400 to-blue-500',
          icon: '🧹',
          disabled: true
        };
      case 'out_of_order':
        return {
          status: 'out_of_order',
          label: 'Fuera de Servicio',
          className: 'border-gray-400 hover:shadow-gray-200',
          statusBadge: 'bg-gray-100 text-gray-800',
          topBorderColor: 'bg-gradient-to-r from-gray-400 to-gray-500',
          icon: '⚠️',
          disabled: true
        };
      default:
        return {
          status: 'unknown',
          label: room.status || 'Sin Estado',
          className: 'border-gray-300 hover:shadow-gray-200',
          statusBadge: 'bg-gray-100 text-gray-600',
          topBorderColor: 'bg-gradient-to-r from-gray-300 to-gray-400',
          icon: '❓',
          disabled: false
        };
    }
  };

  // Función para calcular el precio según huéspedes
  const calculateRoomPrice = (room, guestCount = 2, usePromo = true) => {
    if (!room) return 0;

    let price = 0;
    
    if (guestCount === 1 && room.priceSingle) {
      price = parseFloat(room.priceSingle);
    } else if (guestCount === 2 && room.priceDouble) {
      price = parseFloat(room.priceDouble);
    } else if (guestCount >= 3 && room.priceMultiple) {
      price = parseFloat(room.priceMultiple);
    } else if (room.price) {
      // Compatibilidad con precio legacy
      price = parseFloat(room.price);
    }

    // Si es promocional y se debe usar promo, usar precio promocional
    if (usePromo && room.isPromo && room.promotionPrice) {
      price = parseFloat(room.promotionPrice);
    }

    return price;
  };

  // Función para formatear precio
  const formatPrice = (price) => {
    if (!price || price === 0) return 'No disponible';
    return `$${price.toLocaleString('es-CO')} COP`;
  };

  // Función para manejar selección de habitación
  const handleRoomClick = (room) => {
    const statusConfig = getRoomStatusConfig(room);
    if (!statusConfig.disabled && onRoomSelect) {
      onRoomSelect(room);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 rounded-2xl shadow-xl p-6">
      {/* Header */}
      <div className="text-center mb-8 pb-6 border-b-2 border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3 mb-3">
          🏨 Estado de Habitaciones
        </h2>
        {checkIn && checkOut && (
          <p className="text-slate-600 text-lg">
            {format(new Date(checkIn), 'dd MMM yyyy', { locale: es })} - {format(new Date(checkOut), 'dd MMM yyyy', { locale: es })}
          </p>
        )}
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100">
        {rooms.map((room) => {
          const statusConfig = getRoomStatusConfig(room);
          const price = calculateRoomPrice(room);
          const originalPrice = calculateRoomPrice(room, 2, false);
          const isSelected = selectedRoom?.roomNumber === room.roomNumber;

          return (
            <div
              key={room.roomNumber}
              className={`
                relative bg-white rounded-xl shadow-lg border-2 transition-all duration-300 
                ${statusConfig.className}
                ${statusConfig.disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}
                ${isSelected ? 'border-purple-500 shadow-purple-200 shadow-xl -translate-y-1' : ''}
                hover:shadow-xl group overflow-hidden
              `}
              onClick={() => handleRoomClick(room)}
            >
              {/* Top Border Gradient */}
              <div className={`h-1 w-full ${statusConfig.topBorderColor}`}></div>

              {/* Promotion Badge */}
              {room.isPromo && (
                <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-2 py-1 rounded-lg text-xs font-bold uppercase shadow-md">
                  🏷️ Promo
                </div>
              )}

              <div className="p-5">
                {/* Room Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xl font-bold text-slate-800">Habitación {room.roomNumber}</div>
                    <div className="text-sm text-slate-500 font-medium">{room.type || 'Estándar'}</div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${statusConfig.statusBadge}`}>
                    <span>{statusConfig.icon}</span>
                    <span>{statusConfig.label}</span>
                  </div>
                </div>

                {/* Room Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">Capacidad</span>
                    <span className="text-sm font-semibold text-slate-700">{room.maxGuests || room.capacity || 'N/A'} personas</span>
                  </div>
                  
                  {room.Services && room.Services.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 font-medium">Servicios</span>
                      <span className="text-sm font-semibold text-slate-700">{room.Services.length} incluidos</span>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                {price > 0 && (
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      {room.isPromo && room.promotionPrice && originalPrice !== price ? (
                        <>
                          <span className="text-sm text-red-500 line-through">{formatPrice(originalPrice)}</span>
                          <span className="text-lg font-bold text-green-600">{formatPrice(price)}</span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-slate-800">{formatPrice(price)}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">Por noche (2 huéspedes)</div>
                  </div>
                )}

                {/* Services Tags */}
                {room.Services && room.Services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {room.Services.slice(0, 3).map((service) => (
                      <span 
                        key={service.serviceId || service.id} 
                        className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-medium"
                      >
                        {service.name}
                      </span>
                    ))}
                    {room.Services.length > 3 && (
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-medium">
                        +{room.Services.length - 3} más
                      </span>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <div className="flex gap-2">
                  {!statusConfig.disabled ? (
                    <button 
                      className={`
                        w-full py-2 px-4 rounded-lg font-semibold text-sm uppercase tracking-wide transition-all duration-200
                        ${isSelected 
                          ? 'bg-purple-500 text-white shadow-md' 
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:-translate-y-0.5 shadow-md hover:shadow-lg'
                        }
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoomClick(room);
                      }}
                    >
                      {isSelected ? '✓ Seleccionada' : 'Seleccionar'}
                    </button>
                  ) : (
                    <button 
                      className="w-full py-2 px-4 rounded-lg font-semibold text-sm uppercase tracking-wide bg-slate-200 text-slate-400 cursor-not-allowed"
                      disabled
                    >
                      No Disponible
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import PropTypes from 'prop-types';

RoomStatusGrid.propTypes = {
  rooms: PropTypes.array,
  checkIn: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  checkOut: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  onRoomSelect: PropTypes.func,
  selectedRoom: PropTypes.object
};

export default RoomStatusGrid;