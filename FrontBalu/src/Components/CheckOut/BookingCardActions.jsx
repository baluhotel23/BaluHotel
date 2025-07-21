import React, { useState } from 'react';
import { getRealPaymentSummary } from '../../utils/paymentUtils';
import { formatCurrency } from '../../utils/checkOutUtils';

const BookingCardActions = ({ 
  booking,
  financials,
  daysUntilCheckOut,
  onPaymentClick,
  onExtraChargesClick,
  onGenerateBill,
  onCheckOut,
  onEarlyCheckOut,
  isLoading,
  loadingBills
}) => {
  const [showAllActions, setShowAllActions] = useState(false);

  // ✅ Handlers con prevención de propagación
  const handlePaymentClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🔘 [BOOKING-CARD-ACTIONS] handlePaymentClick para booking:", booking.bookingId);
    onPaymentClick?.(booking);
  };

  const handleExtraChargesClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("📦 [BOOKING-CARD-ACTIONS] handleExtraChargesClick para booking:", booking.bookingId);
    onExtraChargesClick?.(booking);
  };

  const handleCheckOutClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🚪 [BOOKING-CARD-ACTIONS] handleCheckOutClick para booking:", booking.bookingId);
    onCheckOut?.(booking);
  };

  const handleEarlyCheckOutClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🕐 [BOOKING-CARD-ACTIONS] handleEarlyCheckOutClick para booking:", booking.bookingId);
    onEarlyCheckOut?.(booking);
  };

  const handleGenerateBillClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("📄 [BOOKING-CARD-ACTIONS] handleGenerateBillClick para booking:", booking.bookingId);
    onGenerateBill?.(booking);
  };

  // ✅ Componente de botón reutilizable
  const ActionButton = ({ 
    onClick, 
    disabled = false, 
    loading = false, 
    icon, 
    label, 
    color = 'blue',
    size = 'normal' 
  }) => {
    const colors = {
      blue: 'bg-blue-600 hover:bg-blue-700 text-white',
      green: 'bg-green-600 hover:bg-green-700 text-white',
      orange: 'bg-orange-600 hover:bg-orange-700 text-white',
      purple: 'bg-purple-600 hover:bg-purple-700 text-white',
      red: 'bg-red-600 hover:bg-red-700 text-white',
      yellow: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    };

    const sizes = {
      small: 'px-2 py-1 text-xs',
      normal: 'px-3 py-2 text-sm',
      large: 'px-4 py-3 text-base'
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled || loading || isLoading}
        className={`
          ${sizes[size]}
          ${colors[color]}
          font-medium rounded-lg transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2 justify-center
          hover:shadow-md transform hover:scale-105 transition-transform
        `}
        title={label}
      >
        {loading || isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Procesando...
          </>
        ) : (
          <>
            <span>{icon}</span>
            {label}
          </>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* ✅ Información de estado de pago */}
      <div className="space-y-3">
        {/* Alerta de pagos pendientes */}
        {financials.totalPendiente > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">💳</span>
                <div>
                  <div className="font-medium text-yellow-800">Pagos Pendientes</div>
                  <div className="text-sm text-yellow-700">
                    Restante: {formatCurrency(financials.totalPendiente)} 
                    ({100 - financials.paymentPercentage}% del total)
                  </div>
                </div>
              </div>
              <ActionButton
                onClick={handlePaymentClick}
                icon="💳"
                label="Pagar"
                color="yellow"
                size="small"
              />
            </div>
          </div>
        )}

        {/* Confirmación de pago completo */}
        {financials.isFullyPaid && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <div>
                <div className="font-medium text-green-800">Pagos Completos</div>
                <div className="text-sm text-green-700">
                  Total pagado: {formatCurrency(financials.totalPagado)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Acciones principales */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h5 className="font-medium text-gray-800 flex items-center gap-2">
            🎯 Acciones Disponibles
          </h5>
          <button
            onClick={() => setShowAllActions(!showAllActions)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAllActions ? 'Menos opciones' : 'Más opciones'}
          </button>
        </div>

        {/* Botones de acciones principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Procesar Pago - Solo si hay pendientes */}
          {!financials.isFullyPaid && (
            <ActionButton
              onClick={handlePaymentClick}
              icon="💳"
              label="Procesar Pago"
              color="blue"
            />
          )}

          {/* Consumos Extra - Siempre disponible durante la estadía */}
          <ActionButton
            onClick={handleExtraChargesClick}
            icon="🍽️"
            label="Consumos Extra"
            color="orange"
          />

          {/* Generar Factura */}
          <ActionButton
            onClick={handleGenerateBillClick}
            loading={loadingBills}
            icon="📄"
            label="Generar Factura"
            color="purple"
          />
        </div>

        {/* Acciones de check-out */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
          {/* Check-out Normal */}
          <ActionButton
            onClick={handleCheckOutClick}
            icon={financials.isFullyPaid ? '✅' : '⚠️'}
            label={financials.isFullyPaid ? 'Realizar Check-out' : 'Check-out (Pagos pendientes)'}
            color={financials.isFullyPaid ? 'green' : 'orange'}
          />

          {/* Check-out Anticipado */}
          <ActionButton
            onClick={handleEarlyCheckOutClick}
            icon="⏩"
            label="Check-out Anticipado"
            color="blue"
          />
        </div>

        {/* Acciones adicionales (expandibles) */}
        {showAllActions && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-3 border-t border-gray-200">
            {/* Ver detalles */}
            <button
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
              disabled={isLoading}
            >
              👁️ Ver Detalles
            </button>

            {/* Editar reserva */}
            {booking.status !== 'completed' && (
              <button
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                disabled={isLoading}
              >
                ✏️ Editar
              </button>
            )}

            {/* Agregar pago manual */}
            {!financials.isFullyPaid && (
              <button
                onClick={handlePaymentClick}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                disabled={isLoading}
              >
                💰 Agregar Pago
              </button>
            )}

            {/* Cancelar reserva */}
            {!['completed', 'cancelled'].includes(booking.status) && (
              <button
                onClick={() => {
                  if (confirm(`¿Estás seguro de cancelar la reserva #${booking.bookingId}?`)) {
                    // onCancelBooking?.(booking);
                    console.log("❌ Cancelar reserva:", booking.bookingId);
                  }
                }}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                disabled={isLoading}
              >
                ❌ Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ✅ Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-600">
          <details>
            <summary className="cursor-pointer hover:text-gray-800">
              🔧 Debug Info Actions - Booking #{booking.bookingId}
            </summary>
            <div className="mt-2 space-y-1">
              <div><strong>Estado:</strong> {booking.status}</div>
              <div><strong>Pago Completo:</strong> {financials.isFullyPaid ? '✅' : '❌'}</div>
              <div><strong>Días hasta checkout:</strong> {daysUntilCheckOut}</div>
              <div><strong>Loading:</strong> {isLoading ? '⏳' : '✅'}</div>
              <div><strong>Loading Bills:</strong> {loadingBills ? '⏳' : '✅'}</div>
              <div><strong>Handlers:</strong></div>
              <div className="ml-4 text-xs">
                <div>• Payment: {typeof onPaymentClick}</div>
                <div>• ExtraCharges: {typeof onExtraChargesClick}</div>
                <div>• CheckOut: {typeof onCheckOut}</div>
                <div>• EarlyCheckOut: {typeof onEarlyCheckOut}</div>
                <div>• GenerateBill: {typeof onGenerateBill}</div>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

// ✅ Variante compacta para espacios reducidos
export const BookingCardActionsCompact = ({ 
  booking, 
  financials,
  onCheckOut, 
  onEarlyCheckOut, 
  onExtraChargesClick,
  isLoading = false
}) => {
  return (
    <div className="flex gap-2 justify-end">
      {/* Gastos extras */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onExtraChargesClick?.(booking);
        }}
        disabled={isLoading}
        className="px-2 py-1 text-xs font-medium rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        🍽️ <span className="hidden sm:inline">Extras</span>
      </button>

      {/* Check-out */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCheckOut?.(booking);
        }}
        disabled={isLoading}
        className={`px-2 py-1 text-xs font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${
          financials.isFullyPaid
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-orange-600 text-white hover:bg-orange-700'
        }`}
      >
        {financials.isFullyPaid ? '✅' : '⚠️'} 
        <span className="hidden sm:inline">Check-out</span>
      </button>
    </div>
  );
};

export default BookingCardActions;