import React from 'react';
import { 
  getCheckOutBadge, 
  getBookingStatusBadge, 
  getPaymentStatusBadge,
  formatDate,
  formatCurrency,
  getColorClasses 
} from '../../utils/checkOutUtils';
import { getRealPaymentSummary } from '../../utils/paymentUtils';

const BookingCardHeader = ({ booking, onViewDetails }) => {
  // Calcular información financiera
  const financials = getRealPaymentSummary(booking);
  
  // Obtener badges y estados
  const checkOutBadge = getCheckOutBadge(booking);
  const statusBadge = getBookingStatusBadge(booking.status);
  const paymentBadge = getPaymentStatusBadge(financials);

  // Información del huésped
  const guestInfo = booking.guest || {};
  const roomInfo = booking.room || {};

  // Calcular días hasta check-out
  const today = new Date();
  const checkOutDate = new Date(booking.checkOut);
  const daysUntil = Math.ceil((checkOutDate - today) / (1000 * 60 * 60 * 24));

  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      {/* Fila superior: ID, habitación y badges principales */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-4">
          {/* ID de la reserva */}
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800">
              #{booking.bookingId}
            </h3>
            <span className="text-sm text-gray-500">
              Habitación {roomInfo.roomNumber || booking.roomNumber || 'N/A'}
            </span>
          </div>

          {/* Badge de urgencia de check-out */}
          <div className={`
            inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border
            ${getColorClasses(checkOutBadge.color, 'badge')}
          `}>
            <span className="mr-1">{checkOutBadge.icon}</span>
            {checkOutBadge.text}
          </div>
        </div>

        {/* Badges de estado y pago */}
        <div className="flex items-center gap-2">
          {/* Estado de la reserva */}
          <div className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${statusBadge.bgColor}
          `}>
            <span className="mr-1">{statusBadge.icon}</span>
            {statusBadge.text}
          </div>

          {/* Estado de pago */}
          <div className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${paymentBadge.bgColor}
          `}>
            <span className="mr-1">{paymentBadge.icon}</span>
            {paymentBadge.text}
          </div>

          {/* Botón ver detalles */}
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(booking)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              👁️ Ver detalles
            </button>
          )}
        </div>
      </div>

      {/* Fila media: Información del huésped */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-lg">
              {(guestInfo.scostumername || 'G').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {guestInfo.scostumername || 'Huésped sin nombre'}
            </div>
            <div className="text-sm text-gray-500">
              {guestInfo.selectronicmail || 'Sin email'}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium text-gray-700">Documento:</span>
            <span className="ml-2 text-gray-900">
              {guestInfo.sdocno || 'No especificado'}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-gray-700">Teléfono:</span>
            <span className="ml-2 text-gray-900">
              {guestInfo.stelephone || booking.phoneNumber || 'No especificado'}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium text-gray-700">Huéspedes:</span>
            <span className="ml-2 text-gray-900">
              {booking.guestCount || 1} persona{(booking.guestCount || 1) > 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-gray-700">Tipo habitación:</span>
            <span className="ml-2 text-gray-900">
              {roomInfo.roomType || 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Fila inferior: Fechas y resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fechas de estadía */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Estadía
          </div>
          <div className="space-y-1">
            <div className="text-sm">
              <span className="font-medium">Check-in:</span>
              <div className="text-gray-900">
                {formatDate(booking.checkIn, { includeTime: true, relative: false })}
              </div>
            </div>
            <div className="text-sm">
              <span className="font-medium">Check-out:</span>
              <div className={`${daysUntil <= 0 ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                {formatDate(booking.checkOut, { includeTime: true, relative: false })}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen financiero */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
            💰 Financiero
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-medium">
                {formatCurrency(financials.totalFinal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pagado:</span>
              <span className={`font-medium ${financials.isFullyPaid ? 'text-green-600' : 'text-blue-600'}`}>
                {formatCurrency(financials.totalPagado)}
              </span>
            </div>
            {financials.totalPendiente > 0 && (
              <div className="flex justify-between">
                <span>Pendiente:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(financials.totalPendiente)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Consumos extras (si los hay) */}
        {financials.hasExtras && (
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
              🍽️ Extras
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Consumos:</span>
                <span className="font-medium text-purple-700">
                  {formatCurrency(financials.totalExtras)}
                </span>
              </div>
              <div className="text-xs text-purple-600">
                {financials.breakdown.extras?.length || 0} artículo{(financials.breakdown.extras?.length || 0) !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Descuentos (si los hay) */}
        {financials.hasDiscounts && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">
              💸 Descuentos
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Aplicados:</span>
                <span className="font-medium text-green-700">
                  -{formatCurrency(financials.totalDescuentos)}
                </span>
              </div>
              {booking.discountReason && (
                <div className="text-xs text-green-600 truncate" title={booking.discountReason}>
                  {booking.discountReason}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alertas especiales */}
      <div className="mt-3 space-y-2">
        {/* Alerta de check-out vencido */}
        {daysUntil < 0 && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-500">🚨</span>
            <span className="text-red-700 text-sm font-medium">
              Check-out vencido hace {Math.abs(daysUntil)} día{Math.abs(daysUntil) > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Alerta de check-out hoy */}
        {daysUntil === 0 && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="text-orange-500">⏰</span>
            <span className="text-orange-700 text-sm font-medium">
              Check-out programado para HOY - {formatDate(booking.checkOut, { includeTime: true })}
            </span>
          </div>
        )}

        {/* Alerta de pagos pendientes */}
        {financials.totalPendiente > 0 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-yellow-500">💳</span>
            <span className="text-yellow-700 text-sm">
              Pendiente por pagar: {formatCurrency(financials.totalPendiente)} 
              <span className="ml-1 text-xs">
                ({100 - financials.paymentPercentage}% restante)
              </span>
            </span>
          </div>
        )}

        {/* Información de estadía extendida */}
        {daysUntil > 7 && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-blue-500">📅</span>
            <span className="text-blue-700 text-sm">
              Estadía larga: Check-out en {daysUntil} días
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Variante compacta para listas densas
export const BookingCardHeaderCompact = ({ booking, onViewDetails }) => {
  const financials = getRealPaymentSummary(booking);
  const checkOutBadge = getCheckOutBadge(booking);
  const guestInfo = booking.guest || {};

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-semibold text-sm">
            {(guestInfo.scostumername || 'G').charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="font-medium text-gray-900 text-sm">
            #{booking.bookingId} - {guestInfo.scostumername || 'Sin nombre'}
          </div>
          <div className="text-xs text-gray-500">
            Hab. {booking.roomNumber} • {formatCurrency(financials.totalFinal)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className={`
          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
          ${getColorClasses(checkOutBadge.color, 'badge')}
        `}>
          {checkOutBadge.icon} {checkOutBadge.text}
        </div>
        
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(booking)}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            Ver
          </button>
        )}
      </div>
    </div>
  );
};

export default BookingCardHeader;