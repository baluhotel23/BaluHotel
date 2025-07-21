import React, { useState, useEffect } from 'react';
import { getRealPaymentSummary } from '../../utils/paymentUtils';
import { formatCurrency, formatDate } from '../../utils/checkOutUtils';

const BookingCardPayments = ({ 
  booking, 
  onAddPayment, 
  onEditPayment, 
  onDeletePayment,
  onProcessRefund,
  showDetailed = true,
  loading = {},
  disabled = false 
}) => {
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showRefundOptions, setShowRefundOptions] = useState(false);

  // ✅ DEBUG: Log para verificar datos
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('💳 [BOOKING-CARD-PAYMENTS] Debug');
      console.log('📊 Booking recibido:', {
        id: booking?.bookingId,
        room: booking?.roomNumber,
        status: booking?.status,
        hasFinancialSummary: !!booking?.financialSummary,
        hasPayments: !!booking?.payments?.length,
        paymentsCount: booking?.payments?.length || 0
      });
      
      const financials = getRealPaymentSummary(booking);
      console.log('💰 Financials calculados:', {
        totalFinal: financials?.totalFinal,
        totalPagado: financials?.totalPagado,
        totalPendiente: financials?.totalPendiente,
        isFullyPaid: financials?.isFullyPaid,
        hasPayments: financials?.hasPayments,
        paymentPercentage: financials?.paymentPercentage,
        breakdownPagos: financials?.breakdown?.pagos?.length || 0
      });
      console.groupEnd();
    }
  }, [booking]);

  // Obtener información financiera
  const financials = getRealPaymentSummary(booking);

  if (!booking) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-center">No hay información de pagos disponible</p>
      </div>
    );
  }

  // ✅ VERIFICAR SI HAY DATOS FINANCIEROS VÁLIDOS
  if (!financials || (typeof financials.totalFinal === 'undefined')) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-yellow-500">⚠️</span>
          <div>
            <div className="font-medium text-yellow-800">Datos Financieros No Disponibles</div>
            <div className="text-sm text-yellow-700">
              No se pudieron calcular los datos de pago para esta reserva
            </div>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => console.log('🔍 Raw booking data:', booking)}
              className="ml-auto bg-yellow-600 text-white px-2 py-1 rounded text-xs"
            >
              Debug
            </button>
          )}
        </div>
      </div>
    );
  }

  // Componente para método de pago con icono
  const PaymentMethodBadge = ({ method, size = 'normal' }) => {
    const getMethodInfo = (method) => {
      const methods = {
        'cash': { icon: '💵', label: 'Efectivo', color: 'green' },
        'efectivo': { icon: '💵', label: 'Efectivo', color: 'green' },
        'card': { icon: '💳', label: 'Tarjeta', color: 'blue' },
        'tarjeta': { icon: '💳', label: 'Tarjeta', color: 'blue' },
        'credit_card': { icon: '💳', label: 'T. Crédito', color: 'blue' },
        'debit_card': { icon: '💳', label: 'T. Débito', color: 'purple' },
        'transfer': { icon: '🏦', label: 'Transferencia', color: 'indigo' },
        'transferencia': { icon: '🏦', label: 'Transferencia', color: 'indigo' },
        'nequi': { icon: '📱', label: 'Nequi', color: 'purple' },
        'daviplata': { icon: '📱', label: 'Daviplata', color: 'red' },
        'pse': { icon: '💻', label: 'PSE', color: 'blue' },
        'wompi': { icon: '🌐', label: 'Wompi', color: 'blue' },
        'wompi_checkout': { icon: '🌐', label: 'Online', color: 'blue' },
        'mixed': { icon: '🔄', label: 'Mixto', color: 'gray' },
        'other': { icon: '❓', label: 'Otro', color: 'gray' }
      };
      return methods[method?.toLowerCase()] || methods['other'];
    };

    const methodInfo = getMethodInfo(method);
    const sizeClasses = size === 'small' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1';

    return (
      <span className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses}
        ${methodInfo.color === 'green' ? 'bg-green-100 text-green-800' : ''}
        ${methodInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
        ${methodInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' : ''}
        ${methodInfo.color === 'red' ? 'bg-red-100 text-red-800' : ''}
        ${methodInfo.color === 'indigo' ? 'bg-indigo-100 text-indigo-800' : ''}
        ${methodInfo.color === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
      `}>
        <span>{methodInfo.icon}</span>
        {methodInfo.label}
      </span>
    );
  };

  // Componente para estado de pago
  const PaymentStatusBadge = ({ status, size = 'normal' }) => {
    const getStatusInfo = (status) => {
      const statuses = {
        'completed': { icon: '✅', label: 'Completado', color: 'green' },
        'success': { icon: '✅', label: 'Exitoso', color: 'green' },
        'authorized': { icon: '✅', label: 'Autorizado', color: 'green' },
        'paid': { icon: '✅', label: 'Pagado', color: 'green' },
        'pending': { icon: '⏳', label: 'Pendiente', color: 'yellow' },
        'processing': { icon: '🔄', label: 'Procesando', color: 'blue' },
        'failed': { icon: '❌', label: 'Fallido', color: 'red' },
        'cancelled': { icon: '🚫', label: 'Cancelado', color: 'gray' },
        'refunded': { icon: '↩️', label: 'Reembolsado', color: 'purple' }
      };
      return statuses[status?.toLowerCase()] || { icon: '❓', label: status || 'Desconocido', color: 'gray' };
    };

    const statusInfo = getStatusInfo(status);
    const sizeClasses = size === 'small' ? 'text-xs px-2 py-1' : 'text-sm px-2 py-1';

    return (
      <span className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses}
        ${statusInfo.color === 'green' ? 'bg-green-100 text-green-800' : ''}
        ${statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
        ${statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
        ${statusInfo.color === 'red' ? 'bg-red-100 text-red-800' : ''}
        ${statusInfo.color === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
        ${statusInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' : ''}
      `}>
        <span>{statusInfo.icon}</span>
        {statusInfo.label}
      </span>
    );
  };

  // ✅ COMPONENTE MEJORADO PARA LÍNEA DE PAGO
  const PaymentLine = ({ payment, index }) => {
    // ✅ MANEJAR DIFERENTES FORMATOS DE DATOS DE PAGO
    const paymentData = {
      amount: payment.amount || payment.paymentAmount || 0,
      method: payment.method || payment.paymentMethod || 'unknown',
      status: payment.status || payment.paymentStatus || 'unknown',
      date: payment.date || payment.paymentDate || payment.createdAt || new Date(),
      reference: payment.reference || payment.paymentReference || payment.transactionId || null,
      description: payment.description || payment.notes || null,
      id: payment.id || payment.paymentId || index
    };

    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-gray-800">
                {formatCurrency(paymentData.amount)}
              </span>
              <PaymentMethodBadge method={paymentData.method} />
              <PaymentStatusBadge status={paymentData.status} />
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <span className="font-medium">Fecha:</span> {formatDate(paymentData.date, { includeTime: true })}
              </div>
              {paymentData.reference && (
                <div>
                  <span className="font-medium">Referencia:</span> {paymentData.reference}
                </div>
              )}
              {paymentData.description && (
                <div>
                  <span className="font-medium">Descripción:</span> {paymentData.description}
                </div>
              )}
            </div>
          </div>

          {/* Acciones del pago */}
          <div className="flex items-center gap-2 ml-4">
            {onEditPayment && paymentData.status !== 'refunded' && (
              <button
                onClick={() => onEditPayment(booking, paymentData)}
                className="text-blue-600 hover:text-blue-800 text-sm p-1 rounded hover:bg-blue-50 transition-colors"
                disabled={disabled || loading.editPayment}
                title="Editar pago"
              >
                {loading.editPayment ? (
                  <div className="w-4 h-4 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '✏️'
                )}
              </button>
            )}

            {onProcessRefund && ['completed', 'authorized'].includes(paymentData.status) && (
              <button
                onClick={() => onProcessRefund(booking, paymentData)}
                className="text-purple-600 hover:text-purple-800 text-sm p-1 rounded hover:bg-purple-50 transition-colors"
                disabled={disabled || loading.refund}
                title="Procesar reembolso"
              >
                {loading.refund ? (
                  <div className="w-4 h-4 border border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '↩️'
                )}
              </button>
            )}

            {onDeletePayment && ['pending', 'failed', 'cancelled'].includes(paymentData.status) && (
              <button
                onClick={() => {
                  if (confirm(`¿Estás seguro de eliminar este pago de ${formatCurrency(paymentData.amount)}?`)) {
                    onDeletePayment(booking, paymentData);
                  }
                }}
                className="text-red-600 hover:text-red-800 text-sm p-1 rounded hover:bg-red-50 transition-colors"
                disabled={disabled || loading.deletePayment}
                title="Eliminar pago"
              >
                {loading.deletePayment ? (
                  <div className="w-4 h-4 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '🗑️'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Información adicional expandible */}
        {paymentData.details && (
          <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
            <div className="font-medium text-gray-700 mb-1">Detalles adicionales:</div>
            <div className="text-gray-600">{paymentData.details}</div>
          </div>
        )}
      </div>
    );
  };

  // ✅ OBTENER LISTA DE PAGOS DESDE DIFERENTES FUENTES
  const getPaymentsList = () => {
    // Priorizar datos del breakdown si están disponibles
    if (financials?.breakdown?.pagos?.length > 0) {
      return financials.breakdown.pagos;
    }
    
    // Fallback a datos directos del booking
    if (booking?.payments?.length > 0) {
      return booking.payments.map(payment => ({
        id: payment.paymentId || payment.id,
        amount: payment.amount,
        method: payment.paymentMethod || payment.method,
        status: payment.paymentStatus || payment.status,
        date: payment.paymentDate || payment.createdAt,
        reference: payment.paymentReference || payment.transactionId,
        description: payment.notes || payment.description
      }));
    }
    
    return [];
  };

  const paymentsList = getPaymentsList();

  return (
    <div className="space-y-4">
      {/* Resumen de pagos */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            💳 Estado de Pagos
          </h4>
          <div className="flex gap-2">
            {paymentsList.length > 0 && (
              <button
                onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showPaymentHistory ? '👁️ Ocultar historial' : '📋 Ver historial'} ({paymentsList.length})
              </button>
            )}
            {onAddPayment && !financials.isFullyPaid && (
              <button
                onClick={() => onAddPayment(booking)}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                disabled={disabled || loading.addPayment}
              >
                {loading.addPayment ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '💰 Agregar Pago'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Estadísticas de pago */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Total a Pagar
            </div>
            <div className="text-xl font-bold text-gray-800">
              {formatCurrency(financials.totalFinal)}
            </div>
            {financials.hasDiscounts && (
              <div className="text-xs text-gray-500">
                Incluye descuentos aplicados
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Total Pagado
            </div>
            <div className={`text-xl font-bold ${financials.isFullyPaid ? 'text-green-600' : 'text-blue-600'}`}>
              {formatCurrency(financials.totalPagado)}
            </div>
            <div className="text-sm text-gray-500">
              {financials.paymentPercentage}% completado
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Pendiente
            </div>
            <div className={`text-xl font-bold ${financials.totalPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(financials.totalPendiente)}
            </div>
            <div className="text-sm text-gray-500">
              {financials.totalPendiente > 0 ? `${100 - financials.paymentPercentage}% restante` : 'Saldado ✅'}
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progreso de pago</span>
            <span className="font-medium">{financials.paymentPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                financials.isFullyPaid 
                  ? 'bg-green-500' 
                  : financials.paymentPercentage > 50 
                    ? 'bg-blue-500' 
                    : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(financials.paymentPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Historial de pagos */}
      {showPaymentHistory && paymentsList.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="font-medium text-gray-800 flex items-center gap-2">
              📋 Historial de Pagos
            </h5>
            {onProcessRefund && (
              <button
                onClick={() => setShowRefundOptions(!showRefundOptions)}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                {showRefundOptions ? 'Ocultar' : 'Mostrar'} opciones de reembolso
              </button>
            )}
          </div>

          {paymentsList.map((payment, index) => (
            <PaymentLine key={payment.id || index} payment={payment} index={index} />
          ))}

          {/* Resumen del historial */}
          <div className="bg-gray-50 rounded-lg p-3 border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Total transacciones:</span>
                <div className="text-gray-900">{paymentsList.length}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Exitosas:</span>
                <div className="text-green-600">
                  {paymentsList.filter(p => ['completed', 'success', 'paid', 'authorized'].includes(p.status)).length}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Pendientes:</span>
                <div className="text-yellow-600">
                  {paymentsList.filter(p => ['pending', 'processing'].includes(p.status)).length}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Fallidas:</span>
                <div className="text-red-600">
                  {paymentsList.filter(p => ['failed', 'cancelled'].includes(p.status)).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opciones de reembolso */}
      {showRefundOptions && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h6 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
            ↩️ Opciones de Reembolso
          </h6>
          <div className="space-y-2 text-sm">
            <div className="text-purple-700">
              • Los reembolsos están disponibles solo para pagos completados
            </div>
            <div className="text-purple-700">
              • El proceso puede tomar 3-5 días hábiles según el método de pago
            </div>
            <div className="text-purple-700">
              • Se generará un comprobante de reembolso automáticamente
            </div>
          </div>
        </div>
      )}

      {/* Alertas de pago */}
      <div className="space-y-2">
        {/* Sin pagos */}
        {!financials.hasPayments && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">⚠️</span>
              <div>
                <div className="font-medium text-yellow-800">Sin Pagos Registrados</div>
                <div className="text-sm text-yellow-700">
                  No se han registrado pagos para esta reserva
                </div>
              </div>
              {onAddPayment && (
                <button
                  onClick={() => onAddPayment(booking)}
                  className="ml-auto bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                  disabled={disabled}
                >
                  Agregar Primer Pago
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pagos pendientes */}
        {financials.totalPendiente > 0 && financials.hasPayments && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-orange-500">💳</span>
                <div>
                  <div className="font-medium text-orange-800">
                    Pago Incompleto - {formatCurrency(financials.totalPendiente)} pendiente
                  </div>
                  <div className="text-sm text-orange-700">
                    Faltan {100 - financials.paymentPercentage}% para completar el pago
                  </div>
                </div>
              </div>
              {onAddPayment && (
                <button
                  onClick={() => onAddPayment(booking)}
                  className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition-colors"
                  disabled={disabled}
                >
                  Completar Pago
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sobrepago */}
        {financials.totalPagado > financials.totalFinal && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">ℹ️</span>
              <div>
                <div className="font-medium text-blue-800">
                  Sobrepago: {formatCurrency(financials.totalPagado - financials.totalFinal)}
                </div>
                <div className="text-sm text-blue-700">
                  El cliente ha pagado más del total requerido. Considerar reembolso.
                </div>
              </div>
              {onProcessRefund && (
                <button
                  onClick={() => onProcessRefund(booking, { 
                    amount: financials.totalPagado - financials.totalFinal,
                    reason: 'Sobrepago' 
                  })}
                  className="ml-auto bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                  disabled={disabled}
                >
                  Procesar Reembolso
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <details className="bg-gray-50 border border-gray-200 rounded p-2 text-xs">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
            🔧 Debug Info - Pagos
          </summary>
          <div className="mt-2 space-y-1 text-gray-700">
            <div><strong>Booking ID:</strong> {booking?.bookingId}</div>
            <div><strong>Total Final:</strong> {financials?.totalFinal}</div>
            <div><strong>Total Pagado:</strong> {financials?.totalPagado}</div>
            <div><strong>Pendiente:</strong> {financials?.totalPendiente}</div>
            <div><strong>Pagos en breakdown:</strong> {financials?.breakdown?.pagos?.length || 0}</div>
            <div><strong>Pagos directos:</strong> {booking?.payments?.length || 0}</div>
            <div><strong>Has Financial Summary:</strong> {!!booking?.financialSummary}</div>
          </div>
        </details>
      )}
    </div>
  );
};

// Variante compacta
export const BookingCardPaymentsCompact = ({ booking, onAddPayment }) => {
  const financials = getRealPaymentSummary(booking);

  if (!financials) {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-sm text-gray-500 text-center">
          Datos de pago no disponibles
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Estado de Pagos</span>
        <span className={`text-sm font-bold ${
          financials.isFullyPaid ? 'text-green-600' : 'text-orange-600'
        }`}>
          {financials.paymentPercentage}%
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full ${
            financials.isFullyPaid ? 'bg-green-500' : 'bg-orange-500'
          }`}
          style={{ width: `${Math.min(financials.paymentPercentage, 100)}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-600">
        <span>Pagado: {formatCurrency(financials.totalPagado)}</span>
        <span>Pendiente: {formatCurrency(financials.totalPendiente)}</span>
      </div>
    </div>
  );
};

export default BookingCardPayments;