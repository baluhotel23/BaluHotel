/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import { getRealPaymentSummary } from '../../utils/paymentUtils';
import { formatCurrency, formatDate } from '../../utils/checkOutUtils';

const BookingCard = ({
  booking,
  getDaysUntilCheckOut,
  getCheckOutBadge,
  onPaymentClick,
  onExtraChargesClick,
  onGenerateBill,
  onCheckOut,
  onEarlyCheckOut,
  isLoading,
  loadingBills
}) => {
  // 🔍 LOG: Booking completo
  console.log('🏨 [BOOKING-CARD] Booking recibido:', {
    bookingId: booking.bookingId,
    checkOut: booking.checkOut,
    guest: booking.guest,
    room: booking.room
  });

  // Memoizar cálculos pesados
  const financials = useMemo(() => getRealPaymentSummary(booking), [booking]);
  const daysUntilCheckOut = useMemo(() => {
    const days = getDaysUntilCheckOut(booking.checkOut);
    console.log('📅 [BOOKING-CARD] Días calculados:', {
      bookingId: booking.bookingId,
      checkOut: booking.checkOut,
      daysUntilCheckOut: days
    });
    return days;
  }, [booking.checkOut, booking.bookingId, getDaysUntilCheckOut]);
  
  // ✅ CORREGIDO: getCheckOutBadge espera el objeto booking completo, no los días
  const checkOutBadge = useMemo(() => getCheckOutBadge(booking), [booking, getCheckOutBadge]);

  // Handler unificado para el botón principal (pago o checkout)
  const handleMainActionClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (financials.isFullyPaid) {
      console.log("🚪 [BOOKING-CARD] handleCheckOutClick ejecutado para booking:", booking.bookingId);
      onCheckOut?.(booking);
    } else {
      console.log("🔘 [BOOKING-CARD] handlePaymentClick ejecutado para booking:", booking.bookingId);
      onPaymentClick?.(booking);
    }
  };

  const handleExtraChargesClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("📦 [BOOKING-CARD] handleExtraChargesClick ejecutado para booking:", booking.bookingId);
    onExtraChargesClick?.(booking);
  };

  const handleGenerateBillClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("📄 [BOOKING-CARD] handleGenerateBillClick ejecutado para booking:", booking.bookingId);
    onGenerateBill?.(booking);
  };

  const handleEarlyCheckOutClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🕐 [BOOKING-CARD] handleEarlyCheckOutClick ejecutado para booking:", booking.bookingId);
    onEarlyCheckOut?.(booking);
  };

  // Determinar estilo del borde según días hasta check-out
  const borderStyle = useMemo(() => {
    if (daysUntilCheckOut < 0) return "border-l-red-500";
    if (daysUntilCheckOut === 0) return "border-l-orange-500";
    if (daysUntilCheckOut === 1) return "border-l-yellow-500";
    return "border-l-blue-500";
  }, [daysUntilCheckOut]);

  return (
    <div 
      className={`bg-white rounded-xl shadow-lg border-l-4 hover:shadow-xl transition-shadow duration-300 ${borderStyle}`}
      data-booking-id={booking.bookingId}
    >
      {/* HEADER DE LA TARJETA */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-800">
                🏨 Habitación {booking.roomNumber}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${checkOutBadge.bgColor} ${checkOutBadge.textColor}`}>
                {checkOutBadge.text}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>Check-in: {formatDate(booking.checkIn)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>Check-out: {formatDate(booking.checkOut)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>👤</span>
                <span>{booking.guest?.scostumername || booking.guest?.name || 'Huésped no especificado'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-800">
              #{booking.bookingId}
            </div>
            <div className={`text-sm px-2 py-1 rounded ${
              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
              booking.status === 'checked-in' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {booking.status}
            </div>
          </div>
        </div>
      </div>

      {/* INFORMACIÓN FINANCIERA */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          💰 Resumen Financiero
        </h4>
        {/* Barra de progreso de pago */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progreso de pago</span>
            <span className="font-medium">{financials.paymentPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                financials.isFullyPaid 
                  ? 'bg-green-500' 
                  : financials.paymentPercentage > 50 
                    ? 'bg-blue-500' 
                    : 'bg-yellow-500'
              }`}
              style={{ width: `${financials.paymentPercentage}%` }}
            ></div>
          </div>
        </div>
        {/* Totales principales */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-lg font-bold text-gray-800">
              {formatCurrency(financials.totalFinal)}
            </div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className={`text-lg font-bold ${financials.isFullyPaid ? 'text-green-600' : 'text-blue-600'}`}>
              {formatCurrency(financials.totalPagado)}
            </div>
            <div className="text-xs text-gray-600">Pagado</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className={`text-lg font-bold ${financials.totalPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(financials.totalPendiente)}
            </div>
            <div className="text-xs text-gray-600">
              {financials.totalPendiente > 0 ? 'Pendiente' : 'Saldado'}
            </div>
          </div>
        </div>
        {/* Estado de pago */}
        <div className="mt-3 text-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            financials.isFullyPaid 
              ? 'bg-green-100 text-green-800' 
              : financials.paymentPercentage === 0
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}>
            {financials.isFullyPaid 
              ? '✅ Pagado Completo' 
              : financials.paymentPercentage === 0
                ? '❌ Sin Pagos'
                : `⏳ Pago Parcial (${financials.paymentPercentage}%)`
            }
          </span>
        </div>
      </div>

      {/* ALERTAS Y VALIDACIONES */}
      <div className="p-6 border-b border-gray-200">
        {/* Confirmación de pago completo */}
        {financials.isFullyPaid && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <div>
                <div className="font-medium text-green-800">Pago Completado</div>
                <div className="text-sm text-green-700">
                  La reserva está lista para check-out
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Alerta de check-out vencido */}
        {daysUntilCheckOut < 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-red-500">🚨</span>
              <div>
                <div className="font-medium text-red-800">Check-out Vencido</div>
                <div className="text-sm text-red-700">
                  {Math.abs(daysUntilCheckOut)} día(s) de retraso
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACCIONES PRINCIPALES */}
      <div className="p-6">
        <h5 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
          🎯 Acciones Disponibles
        </h5>
        {/* Botones secundarios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {/* Botón de Gastos Extras */}
          <button
            onClick={handleExtraChargesClick}
            disabled={isLoading}
            className="px-3 py-2 text-sm bg-orange-600 text-white hover:bg-orange-700 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center hover:shadow-md transform hover:scale-105 transition-transform"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : (
              <>
                <span>🍽️</span>
                Consumos Extra
              </>
            )}
          </button>
          {/* Botón de Generar Factura */}
          <button
            onClick={handleGenerateBillClick}
            disabled={isLoading || loadingBills}
            className="px-3 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center hover:shadow-md transform hover:scale-105 transition-transform"
          >
            {loadingBills ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generando...
              </>
            ) : (
              <>
                <span>📄</span>
                Generar Factura
              </>
            )}
          </button>
          {/* Botón de Check-out Anticipado */}
          <button
            onClick={handleEarlyCheckOutClick}
            disabled={isLoading}
            className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center hover:shadow-md transform hover:scale-105 transition-transform"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : (
              <>
                <span>⏩</span>
                Check-out Anticipado
              </>
            )}
          </button>
        </div>
        {/* Botón principal unificado */}
        <div className="w-full">
          <button
            onClick={handleMainActionClick}
            disabled={isLoading}
            className={`w-full px-4 py-3 text-base font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 justify-center hover:shadow-lg transform hover:scale-[1.02] transition-transform ${
              financials.isFullyPaid
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                : 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-yellow-200'
            } shadow-lg`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : financials.isFullyPaid ? (
              <>
                <span className="text-xl">✅</span>
                <div className="text-center">
                  <div className="font-bold">Realizar Check-out</div>
                  <div className="text-sm opacity-90">Reserva completamente pagada</div>
                </div>
              </>
            ) : (
              <>
                <span className="text-xl">💳</span>
                <div className="text-center">
                  <div className="font-bold">Completar Pago</div>
                  <div className="text-sm opacity-90">
                    Pendiente: {formatCurrency(financials.totalPendiente)}
                  </div>
                </div>
              </>
            )}
          </button>
        </div>
        {/* Información adicional debajo del botón principal */}
        <div className="mt-3 text-center">
          {financials.isFullyPaid ? (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg p-2">
              🎉 <strong>¡Listo para salida!</strong> - Todos los pagos están completados
            </div>
          ) : (
            <div className="text-sm text-yellow-700 bg-yellow-50 rounded-lg p-2">
              ⚠️ <strong>Acción requerida:</strong> Complete el pago para proceder con el check-out
            </div>
          )}
        </div>
        {/* Debug info en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
            <details>
              <summary className="cursor-pointer hover:text-gray-800 font-medium">
                🔧 Debug Info - Booking #{booking.bookingId}
              </summary>
              <div className="mt-2 space-y-1">
                <div><strong>Estado:</strong> {booking.status}</div>
                <div><strong>Días hasta checkout:</strong> {daysUntilCheckOut}</div>
                <div><strong>Pago completo:</strong> {financials.isFullyPaid ? '✅' : '❌'}</div>
                <div><strong>Total final:</strong> {formatCurrency(financials.totalFinal)}</div>
                <div><strong>Total pagado:</strong> {formatCurrency(financials.totalPagado)}</div>
                <div><strong>Pendiente:</strong> {formatCurrency(financials.totalPendiente)}</div>
                <div><strong>Acción principal:</strong> {financials.isFullyPaid ? 'CHECK-OUT' : 'PAGO'}</div>
                <div><strong>Handlers disponibles:</strong></div>
                <div className="ml-4">
                  <div>• onPaymentClick: {typeof onPaymentClick}</div>
                  <div>• onExtraChargesClick: {typeof onExtraChargesClick}</div>
                  <div>• onCheckOut: {typeof onCheckOut}</div>
                  <div>• onEarlyCheckOut: {typeof onEarlyCheckOut}</div>
                  <div>• onGenerateBill: {typeof onGenerateBill}</div>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(BookingCard);