import React, { useState } from 'react';
import { formatDate } from '../../utils/checkOutUtils';

const BookingCardPassengers = ({ 
  booking, 
  onEditPassenger, 
  onAddPassenger, 
  onRemovePassenger,
  onViewPassengerDetails,
  showDetailed = true,
  loading = {},
  disabled = false 
}) => {
  const [showAllPassengers, setShowAllPassengers] = useState(false);
  const [showPassengerForm, setShowPassengerForm] = useState(false);

  if (!booking) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-center">No hay información de huéspedes disponible</p>
      </div>
    );
  }

  // Obtener información de pasajeros
  const mainGuest = booking.guest || {};
  const additionalPassengers = booking.passengers || booking.additionalGuests || [];
  const totalPassengers = 1 + additionalPassengers.length; // Principal + adicionales
  const maxOccupancy = booking.room?.maxOccupancy || booking.guestCount || 2;

  // Componente para avatar de huésped
  const GuestAvatar = ({ guest, size = 'normal', isMain = false }) => {
    const sizeClasses = {
      small: 'w-8 h-8 text-sm',
      normal: 'w-12 h-12 text-base',
      large: 'w-16 h-16 text-lg'
    };

    const name = guest.scostumername || guest.name || guest.firstName || 'Huésped';
    const initials = name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();

    return (
      <div className={`
        ${sizeClasses[size]}
        ${isMain ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-700'}
        rounded-full flex items-center justify-center font-semibold
        relative
      `}>
        {initials}
        {isMain && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">👑</span>
          </div>
        )}
      </div>
    );
  };

  // Componente para información de documento
  const DocumentBadge = ({ docType, docNumber, size = 'normal' }) => {
    const getDocTypeInfo = (type) => {
      const types = {
        'CC': { icon: '🆔', label: 'C.C.', color: 'blue' },
        'CE': { icon: '🆔', label: 'C.E.', color: 'green' },
        'TI': { icon: '🆔', label: 'T.I.', color: 'purple' },
        'PP': { icon: '📘', label: 'Pasaporte', color: 'red' },
        'passport': { icon: '📘', label: 'Pasaporte', color: 'red' },
        'NIT': { icon: '🏢', label: 'NIT', color: 'gray' }
      };
      return types[type?.toUpperCase()] || { icon: '📄', label: type || 'Doc', color: 'gray' };
    };

    const docInfo = getDocTypeInfo(docType);
    const sizeClasses = size === 'small' ? 'text-xs px-2 py-1' : 'text-sm px-2 py-1';

    return (
      <span className={`
        inline-flex items-center gap-1 rounded font-medium
        ${sizeClasses}
        ${docInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
        ${docInfo.color === 'green' ? 'bg-green-100 text-green-800' : ''}
        ${docInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' : ''}
        ${docInfo.color === 'red' ? 'bg-red-100 text-red-800' : ''}
        ${docInfo.color === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
      `}>
        <span>{docInfo.icon}</span>
        {docInfo.label} {docNumber}
      </span>
    );
  };

  // Componente para tarjeta de pasajero
  const PassengerCard = ({ passenger, isMain = false, index }) => (
    <div className={`
      p-4 rounded-lg border-2 transition-colors
      ${isMain 
        ? 'bg-blue-50 border-blue-200' 
        : 'bg-white border-gray-200 hover:border-gray-300'
      }
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <GuestAvatar guest={passenger} isMain={isMain} />
          <div>
            <div className="flex items-center gap-2">
              <h5 className="font-semibold text-gray-800">
                {passenger.scostumername || passenger.name || `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim() || 'Sin nombre'}
              </h5>
              {isMain && (
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                  👑 Principal
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {passenger.selectronicmail || passenger.email || 'Sin email'}
            </div>
          </div>
        </div>

        {/* Acciones del pasajero */}
        <div className="flex items-center gap-1">
          {onViewPassengerDetails && (
            <button
              onClick={() => onViewPassengerDetails(booking, passenger, isMain)}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
              disabled={disabled}
              title="Ver detalles"
            >
              👁️
            </button>
          )}
          {onEditPassenger && (
            <button
              onClick={() => onEditPassenger(booking, passenger, isMain)}
              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
              disabled={disabled || loading.editPassenger}
              title="Editar información"
            >
              {loading.editPassenger ? (
                <div className="w-4 h-4 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '✏️'
              )}
            </button>
          )}
          {onRemovePassenger && !isMain && (
            <button
              onClick={() => {
                if (confirm(`¿Estás seguro de eliminar a ${passenger.name || 'este huésped'}?`)) {
                  onRemovePassenger(booking, passenger, index);
                }
              }}
              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
              disabled={disabled || loading.removePassenger}
              title="Eliminar huésped"
            >
              {loading.removePassenger ? (
                <div className="w-4 h-4 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '🗑️'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Información del documento */}
      <div className="mb-3">
        <DocumentBadge 
          docType={passenger.documentType || passenger.sdoctype} 
          docNumber={passenger.sdocno || passenger.documentNumber || passenger.document}
        />
      </div>

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-medium text-gray-700">Teléfono:</span>
          <div className="text-gray-900">
            {passenger.stelephone || passenger.phone || 'No especificado'}
          </div>
        </div>
        <div>
          <span className="font-medium text-gray-700">Edad:</span>
          <div className="text-gray-900">
            {passenger.age || 'No especificada'}
          </div>
        </div>
        {passenger.nationality && (
          <div>
            <span className="font-medium text-gray-700">Nacionalidad:</span>
            <div className="text-gray-900">{passenger.nationality}</div>
          </div>
        )}
        {passenger.occupation && (
          <div>
            <span className="font-medium text-gray-700">Ocupación:</span>
            <div className="text-gray-900">{passenger.occupation}</div>
          </div>
        )}
      </div>

      {/* Notas especiales */}
      {passenger.notes && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <span className="font-medium text-yellow-800">Notas:</span>
          <div className="text-yellow-700">{passenger.notes}</div>
        </div>
      )}

      {/* Información de check-in */}
      {(passenger.checkInDate || isMain) && (
        <div className="mt-3 text-xs text-gray-500">
          {isMain ? 'Huésped principal' : `Agregado: ${formatDate(passenger.checkInDate || booking.checkIn)}`}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Resumen de ocupación */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            👥 Huéspedes y Ocupación
          </h4>
          <div className="flex gap-2">
            {additionalPassengers.length > 2 && (
              <button
                onClick={() => setShowAllPassengers(!showAllPassengers)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showAllPassengers ? 'Ver menos' : `Ver todos (${totalPassengers})`}
              </button>
            )}
            {onAddPassenger && totalPassengers < maxOccupancy && (
              <button
                onClick={() => onAddPassenger(booking)}
                className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
                disabled={disabled || loading.addPassenger}
              >
                {loading.addPassenger ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '➕ Agregar Huésped'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Estadísticas de ocupación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Ocupación Actual
            </div>
            <div className="text-xl font-bold text-gray-800">
              {totalPassengers} / {maxOccupancy}
            </div>
            <div className="text-sm text-gray-500">
              {totalPassengers === maxOccupancy ? 'Completa ✅' : `${maxOccupancy - totalPassengers} disponible${maxOccupancy - totalPassengers > 1 ? 's' : ''}`}
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Huésped Principal
            </div>
            <div className="text-lg font-bold text-blue-600">
              {mainGuest.scostumername || 'Sin nombre'}
            </div>
            <div className="text-sm text-gray-500">
              {mainGuest.sdocno || 'Sin documento'}
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Huéspedes Adicionales
            </div>
            <div className="text-xl font-bold text-purple-600">
              {additionalPassengers.length}
            </div>
            <div className="text-sm text-gray-500">
              {additionalPassengers.length === 0 ? 'Ninguno' : 'Registrados'}
            </div>
          </div>
        </div>

        {/* Barra de ocupación */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Ocupación de habitación</span>
            <span className="font-medium">{Math.round((totalPassengers / maxOccupancy) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                totalPassengers === maxOccupancy 
                  ? 'bg-red-500' 
                  : totalPassengers >= maxOccupancy * 0.8 
                    ? 'bg-orange-500' 
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((totalPassengers / maxOccupancy) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Listado de huéspedes */}
      <div className="space-y-4">
        <h5 className="font-medium text-gray-800 flex items-center gap-2">
          📋 Listado de Huéspedes
        </h5>

        {/* Huésped principal */}
        <PassengerCard passenger={mainGuest} isMain={true} index={0} />

        {/* Huéspedes adicionales */}
        {additionalPassengers.length > 0 && (
          <div className="space-y-3">
            <h6 className="text-sm font-medium text-gray-600 flex items-center gap-2">
              👥 Huéspedes Adicionales ({additionalPassengers.length})
            </h6>
            
            {(showAllPassengers ? additionalPassengers : additionalPassengers.slice(0, 2)).map((passenger, index) => (
              <PassengerCard 
                key={passenger.id || index} 
                passenger={passenger} 
                isMain={false} 
                index={index + 1}
              />
            ))}

            {/* Mostrar mensaje si hay más huéspedes ocultos */}
            {!showAllPassengers && additionalPassengers.length > 2 && (
              <div className="text-center py-4">
                <button
                  onClick={() => setShowAllPassengers(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ver {additionalPassengers.length - 2} huésped{additionalPassengers.length - 2 > 1 ? 'es' : ''} más...
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alertas de ocupación */}
      <div className="space-y-2">
        {/* Sobre-ocupación */}
        {totalPassengers > maxOccupancy && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              <div>
                <div className="font-medium text-red-800">Sobre-ocupación</div>
                <div className="text-sm text-red-700">
                  Hay {totalPassengers - maxOccupancy} huésped{totalPassengers - maxOccupancy > 1 ? 'es' : ''} más de la capacidad máxima
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Capacidad disponible */}
        {totalPassengers < maxOccupancy && onAddPassenger && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-500">ℹ️</span>
                <div>
                  <div className="font-medium text-green-800">Capacidad Disponible</div>
                  <div className="text-sm text-green-700">
                    Pueden agregarse {maxOccupancy - totalPassengers} huésped{maxOccupancy - totalPassengers > 1 ? 'es' : ''} más
                  </div>
                </div>
              </div>
              <button
                onClick={() => onAddPassenger(booking)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                disabled={disabled}
              >
                Agregar Huésped
              </button>
            </div>
          </div>
        )}

        {/* Sin huéspedes adicionales */}
        {additionalPassengers.length === 0 && maxOccupancy > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">👤</span>
              <div>
                <div className="font-medium text-blue-800">Solo Huésped Principal</div>
                <div className="text-sm text-blue-700">
                  La habitación está reservada para {maxOccupancy} personas pero solo hay 1 registrada
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Información adicional */}
      {showDetailed && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h6 className="font-medium text-gray-800 mb-3">📝 Información Adicional</h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Tipo de habitación:</span>
              <div className="text-gray-900">{booking.room?.roomType || 'Standard'}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Capacidad máxima:</span>
              <div className="text-gray-900">{maxOccupancy} personas</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Check-in realizado:</span>
              <div className="text-gray-900">{formatDate(booking.checkIn, { includeTime: true })}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Check-out programado:</span>
              <div className="text-gray-900">{formatDate(booking.checkOut, { includeTime: true })}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Variante compacta
export const BookingCardPassengersCompact = ({ booking }) => {
  const mainGuest = booking.guest || {};
  const additionalPassengers = booking.passengers || booking.additionalGuests || [];
  const totalPassengers = 1 + additionalPassengers.length;
  const maxOccupancy = booking.room?.maxOccupancy || booking.guestCount || 2;

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Huéspedes</span>
        <span className="text-sm font-bold text-gray-800">{totalPassengers}/{maxOccupancy}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
          {(mainGuest.scostumername || 'G').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 truncate">
            {mainGuest.scostumername || 'Sin nombre'}
          </div>
          <div className="text-xs text-gray-500">
            {additionalPassengers.length > 0 ? `+${additionalPassengers.length} más` : 'Solo principal'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCardPassengers;