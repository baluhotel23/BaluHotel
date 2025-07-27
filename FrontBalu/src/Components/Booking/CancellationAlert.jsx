import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';

const CancellationAlert = ({ booking, onNavigateToVouchers, onDismiss }) => {
  
  // ⭐ VERIFICAR SI ESTÁ CANCELADA
  if (booking.status !== 'cancelled') return null;

  // ⭐ CALCULAR TIEMPO DESDE CANCELACIÓN
  const cancelledAt = booking.cancelledAt || booking.updatedAt;
  const hoursSince = dayjs().diff(dayjs(cancelledAt), 'hours');
  const isRecent = hoursSince <= 24;

  // ⭐ INFORMACIÓN DE CRÉDITO
  const hasCredit = booking.creditVoucher || booking.financialSummary?.totalPagado > 0;
  const creditAmount = booking.creditVoucher?.amount || booking.financialSummary?.totalPagado || 0;

  // ⭐ DETERMINAR TIPO DE ALERTA
  const alertClass = isRecent 
    ? 'bg-red-50 border-red-200 text-red-800' 
    : 'bg-orange-50 border-orange-200 text-orange-800';

  return (
    <div className={`border rounded-lg p-4 mb-4 ${alertClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            {isRecent ? '🚨 Cancelación Reciente' : '📋 Reserva Cancelada'}
            <span className="text-sm font-normal">
              (Hace {hoursSince}h)
            </span>
          </h3>
          
          <div className="text-sm space-y-1">
            <p>
              <strong>Habitación:</strong> {booking.room?.roomNumber || booking.roomNumber}
            </p>
            <p>
              <strong>Huésped:</strong> {booking.guest?.scostumername || 'Sin información'}
            </p>
            <p>
              <strong>Motivo:</strong> {booking.cancellationReason || 'Sin especificar'}
            </p>
            
            {hasCredit && (
              <p className="text-green-700 font-medium">
                💳 Crédito generado: ${creditAmount.toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="mt-3 flex gap-2">
            {hasCredit && onNavigateToVouchers && (
              <button
                onClick={onNavigateToVouchers}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                💳 Ver Vouchers
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={() => onDismiss(booking.bookingId)}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                ✕ Ocultar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
CancellationAlert.propTypes = {
  booking: PropTypes.shape({
    status: PropTypes.string.isRequired,
    cancelledAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    updatedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    creditVoucher: PropTypes.shape({
      amount: PropTypes.number,
    }),
    financialSummary: PropTypes.shape({
      totalPagado: PropTypes.number,
    }),
    room: PropTypes.shape({
      roomNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    roomNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    guest: PropTypes.shape({
      scostumername: PropTypes.string,
    }),
    cancellationReason: PropTypes.string,
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onNavigateToVouchers: PropTypes.func,
  onDismiss: PropTypes.func,
};

export default CancellationAlert;
// CancellationAlert.jsx