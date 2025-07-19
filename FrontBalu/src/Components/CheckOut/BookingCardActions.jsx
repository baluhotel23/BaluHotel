import React, { useState } from 'react';
import { 
  getAvailableActions, 
  canCheckOut, 
  getPaymentStatus,
  getColorClasses 
} from '../../utils/checkOutUtils';
import { getRealPaymentSummary } from '../../utils/paymentUtils';

const BookingCardActions = ({ 
  booking,
  onCheckOut,
  onEarlyCheckOut,
  onAddPayment,
  onProcessPayment,
  onGenerateBill,
  onAddExtras,
  onViewDetails,
  onEditBooking,
  onCancelBooking,
  loading = {},
  disabled = false
}) => {
  const [showAllActions, setShowAllActions] = useState(false);

  // Obtener información financiera
  const financials = getRealPaymentSummary(booking);
  const paymentStatus = getPaymentStatus(financials);
  
  // Obtener acciones disponibles
  const availableActions = getAvailableActions(booking, financials);
  const checkOutValidation = canCheckOut(booking);

  // Separar acciones principales de secundarias
  const primaryActions = availableActions.slice(0, 3);
  const secondaryActions = availableActions.slice(3);

  // Función para manejar acciones
  const handleAction = (actionType, booking) => {
    if (disabled) return;

    switch (actionType) {
      case 'checkout':
        onCheckOut?.(booking);
        break;
      case 'checkout-pending':
        onCheckOut?.(booking, { allowPendingPayments: true });
        break;
      case 'early-checkout':
        onEarlyCheckOut?.(booking);
        break;
      case 'payment':
        onProcessPayment?.(booking);
        break;
      case 'bill':
        onGenerateBill?.(booking);
        break;
      case 'extras':
        onAddExtras?.(booking);
        break;
      default:
        console.warn(`Acción no implementada: ${actionType}`);
    }
  };

  // Componente para botón de acción
  const ActionButton = ({ action, isLoading = false, size = 'normal' }) => {
    const sizeClasses = {
      small: 'px-2 py-1 text-xs',
      normal: 'px-3 py-2 text-sm',
      large: 'px-4 py-3 text-base'
    };

    return (
      <button
        onClick={() => handleAction(action.type, booking)}
        disabled={disabled || isLoading}
        className={`
          ${sizeClasses[size]}
          ${getColorClasses(action.color, 'button')}
          font-medium rounded-lg transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center gap-2 justify-center
          hover:shadow-md transform hover:scale-105 transition-transform
        `}
        title={action.label}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Procesando...
          </>
        ) : (
          <>
            <span>{action.icon}</span>
            {action.label}
          </>
        )}
      </button>
    );
  };

  // Componente para información de validación
  const ValidationInfo = () => {
    if (checkOutValidation.can) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          <div>
            <div className="font-medium text-red-800">Check-out no disponible</div>
            <div className="text-sm text-red-700">{checkOutValidation.reason}</div>
          </div>
        </div>
      </div>
    );
  };

  // Componente para estado de pago
  const PaymentStatusInfo = () => {
    if (financials.isFullyPaid) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✅</span>
            <div>
              <div className="font-medium text-green-800">Pagos Completos</div>
              <div className="text-sm text-green-700">
                Total pagado: ${financials.totalPagado.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      );
    } else if (financials.totalPendiente > 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">💳</span>
              <div>
                <div className="font-medium text-yellow-800">Pagos Pendientes</div>
                <div className="text-sm text-yellow-700">
                  Pendiente: ${financials.totalPendiente.toLocaleString()} 
                  ({100 - financials.paymentPercentage}% restante)
                </div>
              </div>
            </div>
            {onAddPayment && (
              <button
                onClick={() => onAddPayment(booking)}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                disabled={disabled}
              >
                💳 Pagar
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Información de validación */}
      <ValidationInfo />

      {/* Estado de pago */}
      <PaymentStatusInfo />

      {/* Acciones principales */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h5 className="font-medium text-gray-800 flex items-center gap-2">
            🎯 Acciones Disponibles
          </h5>
          {secondaryActions.length > 0 && (
            <button
              onClick={() => setShowAllActions(!showAllActions)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showAllActions ? 'Menos opciones' : `+${secondaryActions.length} más`}
            </button>
          )}
        </div>

        {/* Botones de acciones principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {primaryActions.map((action, index) => (
            <ActionButton
              key={index}
              action={action}
              isLoading={loading[action.type]}
            />
          ))}
        </div>

        {/* Acciones secundarias (expandibles) */}
        {showAllActions && secondaryActions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-3 border-t border-gray-200">
            {secondaryActions.map((action, index) => (
              <ActionButton
                key={index}
                action={action}
                size="small"
                isLoading={loading[action.type]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Acciones de gestión adicionales */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h6 className="text-sm font-medium text-gray-600">Gestión de Reserva</h6>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Ver detalles */}
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(booking)}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
              disabled={disabled}
            >
              👁️ Ver Detalles
            </button>
          )}

          {/* Editar reserva */}
          {onEditBooking && booking.status !== 'completed' && (
            <button
              onClick={() => onEditBooking(booking)}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
              disabled={disabled}
            >
              ✏️ Editar
            </button>
          )}

          {/* Agregar consumos extra */}
          {onAddExtras && ['checked-in', 'confirmed', 'paid'].includes(booking.status) && (
            <button
              onClick={() => onAddExtras(booking)}
              className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors flex items-center gap-1"
              disabled={disabled || loading.extras}
            >
              {loading.extras ? (
                <div className="w-3 h-3 border border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '🍽️'
              )}
              Consumos
            </button>
          )}

          {/* Agregar pago manual */}
          {onAddPayment && !financials.isFullyPaid && (
            <button
              onClick={() => onAddPayment(booking)}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
              disabled={disabled || loading.payment}
            >
              {loading.payment ? (
                <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '💰'
              )}
              Agregar Pago
            </button>
          )}

          {/* Cancelar reserva */}
          {onCancelBooking && !['completed', 'cancelled'].includes(booking.status) && (
            <button
              onClick={() => {
                if (confirm(`¿Estás seguro de cancelar la reserva #${booking.bookingId}?`)) {
                  onCancelBooking(booking);
                }
              }}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
              disabled={disabled || loading.cancel}
            >
              {loading.cancel ? (
                <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '❌'
              )}
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Información de estado para desarrolladores (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-600">
          <details>
            <summary className="cursor-pointer hover:text-gray-800">
              🔧 Debug Info (Solo en desarrollo)
            </summary>
            <div className="mt-2 space-y-1">
              <div><strong>Estado:</strong> {booking.status}</div>
              <div><strong>Puede Check-out:</strong> {checkOutValidation.can ? '✅' : '❌'}</div>
              <div><strong>Pago Completo:</strong> {financials.isFullyPaid ? '✅' : '❌'}</div>
              <div><strong>Acciones Disponibles:</strong> {availableActions.length}</div>
              <div><strong>Loading Estados:</strong> {JSON.stringify(loading)}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

// Variante compacta para espacios reducidos
export const BookingCardActionsCompact = ({ 
  booking, 
  onCheckOut, 
  onEarlyCheckOut, 
  loading = {},
  disabled = false 
}) => {
  const financials = getRealPaymentSummary(booking);
  const availableActions = getAvailableActions(booking, financials);
  const topActions = availableActions.slice(0, 2);

  return (
    <div className="flex gap-2 justify-end">
      {topActions.map((action, index) => (
        <button
          key={index}
          onClick={() => {
            if (action.type === 'checkout') onCheckOut?.(booking);
            if (action.type === 'early-checkout') onEarlyCheckOut?.(booking);
          }}
          disabled={disabled || loading[action.type]}
          className={`
            px-2 py-1 text-xs font-medium rounded
            ${getColorClasses(action.color, 'button')}
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-1
          `}
        >
          {loading[action.type] ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            action.icon
          )}
          <span className="hidden sm:inline">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

// Variante solo para acciones de check-out
export const BookingCardCheckOutActions = ({ 
  booking, 
  onCheckOut, 
  onEarlyCheckOut,
  loading = {},
  disabled = false 
}) => {
  const financials = getRealPaymentSummary(booking);
  const checkOutValidation = canCheckOut(booking);

  if (!checkOutValidation.can) {
    return (
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-gray-500 text-sm">
          <span className="block">⚠️ Check-out no disponible</span>
          <span className="text-xs">{checkOutValidation.reason}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Check-out normal */}
      <button
        onClick={() => onCheckOut(booking)}
        disabled={disabled || loading.checkout}
        className={`
          px-4 py-3 rounded-lg font-medium transition-colors
          ${financials.isFullyPaid 
            ? 'bg-green-600 text-white hover:bg-green-700' 
            : 'bg-orange-600 text-white hover:bg-orange-700'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
        `}
      >
        {loading.checkout ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Procesando...
          </>
        ) : (
          <>
            <span>{financials.isFullyPaid ? '✅' : '⚠️'}</span>
            Check-out {financials.isFullyPaid ? 'Normal' : 'con Pendientes'}
          </>
        )}
      </button>

      {/* Check-out anticipado */}
      <button
        onClick={() => onEarlyCheckOut(booking)}
        disabled={disabled || loading.earlyCheckout}
        className="px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading.earlyCheckout ? (
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
  );
};

export default BookingCardActions;