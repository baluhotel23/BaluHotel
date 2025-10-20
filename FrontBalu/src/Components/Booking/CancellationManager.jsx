import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import {
  getCancellationPolicies,
  cancelBooking,
  clearCancellationState,
  validateCancellation
} from '../../Redux/Actions/bookingActions';
import PropTypes from 'prop-types';

const CancellationManager = ({ 
  booking, 
  onCancel, 
  onClose, 
  trigger = null // Componente que activa la cancelación
}) => {
  const dispatch = useDispatch();
  const { 
    cancellation, 
    loading 
  } = useSelector(state => state.booking || {});

  // Estados locales
  const [showModal, setShowModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [step, setStep] = useState('confirm'); // 'confirm', 'policies', 'processing'
  const [validation, setValidation] = useState(null);

  // ⭐ RAZONES DE CANCELACIÓN PREDEFINIDAS
  const cancellationReasons = [
    'Overbooking - sin disponibilidad',
    'Problema técnico en habitación',
    'Solicitud del huésped',
    'Emergencia del hotel',
    'No show confirmado',
    'Problema de pago',
    'Cambio de fechas solicitado',
    'Otro'
  ];

  // ⭐ ABRIR MODAL Y OBTENER POLÍTICAS
  const handleOpenCancellation = async () => {
    setShowModal(true);
    setStep('confirm');
    setCancelReason('');
    
    // Obtener políticas de cancelación
    try {
      const result = await dispatch(getCancellationPolicies(booking.bookingId));
      if (result.success) {
        console.log('✅ Políticas obtenidas:', result.data);
      }
    } catch (error) {
      console.error('❌ Error al obtener políticas:', error);
    }
  };

  // ⭐ VALIDAR CANCELACIÓN ANTES DE PROCEDER
  const handleValidateCancellation = async () => {
    if (!cancelReason.trim()) {
      toast.error('Debe seleccionar una razón de cancelación');
      return;
    }

    setStep('policies');
    
    try {
      const result = await dispatch(validateCancellation(booking.bookingId, {
        reason: cancelReason,
        validateRefund: true
      }));
      
      setValidation(result);
      
      if (!result.success || !result.canCancel) {
        toast.warning('Esta reserva no puede ser cancelada según las políticas actuales');
      }
    } catch (error) {
      console.error('❌ Error en validación:', error);
      toast.error('Error al validar cancelación');
    }
  };

  // ⭐ EJECUTAR CANCELACIÓN
  const handleConfirmCancellation = async () => {
    setStep('processing');
    
    try {
      const cancelData = {
        reason: cancelReason,
        cancelledBy: 'staff', // O el usuario actual
        refundRequested: true,
        generateCreditVoucher: cancellation.policies?.refundType === 'credit_voucher',
        notes: `Cancelación desde check-in: ${cancelReason}`
      };

      const result = await dispatch(cancelBooking(booking.bookingId, cancelData));
      
      if (result.success) {
        toast.success('🚨 Reserva cancelada exitosamente');
        
        // Callback al componente padre
        if (onCancel) {
          onCancel(result.data);
        }
        
        handleCloseModal();
      } else {
        setStep('policies'); // Volver al paso anterior
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error en cancelación:', error);
      setStep('policies');
      toast.error('Error al procesar cancelación');
    }
  };

  // ⭐ CERRAR MODAL Y LIMPIAR ESTADO
  const handleCloseModal = () => {
    setShowModal(false);
    setStep('confirm');
    setCancelReason('');
    setValidation(null);
    dispatch(clearCancellationState());
    
    if (onClose) {
      onClose();
    }
  };

  // ⭐ VERIFICAR SI RESERVA YA ESTÁ CANCELADA
  const isCancelled = booking.status === 'cancelled';
  const isCheckedIn = ['checked-in', 'completed'].includes(booking.status);

  // ⭐ NUEVA VALIDACIÓN: Verificar si está completamente pagada
  const totalPaid = booking.payments?.reduce((sum, payment) => {
    if (payment.paymentStatus === 'authorized' || payment.paymentStatus === 'completed') {
      return sum + parseFloat(payment.amount || 0);
    }
    return sum;
  }, 0) || 0;
  
  const isFullyPaid = totalPaid >= parseFloat(booking.totalAmount || 0);

  // ⭐ CALCULAR DÍAS HASTA CHECK-IN
  const daysUntilCheckIn = dayjs(booking.checkIn).diff(dayjs(), 'days');
  
  // ⭐ NUEVA LÓGICA: No permitir cancelar si está completamente pagada
  const canCancel = !isCancelled && !isCheckedIn && daysUntilCheckIn >= 0 && !isFullyPaid;
  
  // ⭐ MENSAJE DE ERROR ESPECÍFICO
  const getCancelBlockReason = () => {
    if (isCancelled) return 'Ya cancelada';
    if (isCheckedIn) return 'Ya registrada entrada/salida';
    if (isFullyPaid) return 'Completamente pagada - debe hacer checkout';
    if (daysUntilCheckIn < 0) return 'No se puede cancelar';
    return '';
  };

  // ⭐ RENDERIZAR TRIGGER BUTTON SI NO SE PROPORCIONA
  const renderTrigger = () => {
    if (trigger) {
      return React.cloneElement(trigger, { onClick: handleOpenCancellation });
    }

    // Determinar mensaje de tooltip
    const tooltipMessage = !canCancel 
      ? (isCancelled 
          ? 'Ya cancelada' 
          : isCheckedIn 
            ? 'Ya registrada entrada/salida' 
            : isFullyPaid
              ? 'Completamente pagada - debe hacer checkout'
              : 'No se puede cancelar')
      : 'Cancelar reserva';

    return (
      <button
        onClick={handleOpenCancellation}
        disabled={!canCancel}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          canCancel
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title={tooltipMessage}
      >
        {isCancelled ? '🚫 Cancelada' : isFullyPaid ? '� Pagada' : '🚨 Cancelar'}
      </button>
    );
  };

  // ⭐ RENDERIZAR CONTENIDO DEL MODAL SEGÚN EL PASO
  const renderModalContent = () => {
    switch (step) {
      case 'confirm':
        return (
          <>
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              🚨 Cancelar Reserva #{booking.bookingId}
            </h3>
            
            {/* Información de la reserva */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Habitación:</strong> {booking.room?.roomNumber || booking.roomNumber}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Huésped:</strong> {booking.guest?.scostumername || 'Sin información'}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Check-in:</strong> {dayjs(booking.checkIn).format("DD/MM/YYYY")}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Total:</strong> ${parseFloat(booking.totalAmount || 0).toLocaleString()}
              </p>
            </div>

            {/* Selección de razón */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón de cancelación *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar razón...</option>
                {cancellationReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {cancelReason === 'Otro' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especificar razón
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describir la razón específica..."
                />
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleValidateCancellation}
                disabled={!cancelReason.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continuar
              </button>
            </div>
          </>
        );

      // En el caso 'policies', reemplaza todo el bloque con:

case 'policies':
  return (
    <>
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        📋 Políticas de Cancelación
      </h3>

      {/* Políticas aplicables - USAR VALIDATION EN LUGAR DE CANCELLATION.POLICIES */}
      {validation && validation.policies && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-yellow-800 mb-2">Políticas Aplicables:</h4>
          <div className="text-sm text-yellow-700">
            <p><strong>Días hasta check-in:</strong> {validation.policies.daysUntilCheckIn}</p>
            <p><strong>Puede cancelar:</strong> {validation.policies.cancellation?.canCancel ? '✅ Sí' : '❌ No'}</p>
            <p><strong>Puede modificar fechas:</strong> {validation.policies.cancellation?.canModifyDates ? '✅ Sí' : '❌ No'}</p>
            
            {/* MOSTRAR CRÉDITO SI APLICA */}
            {validation.financial?.estimatedCredit > 0 && (
              <p className="text-green-700">
                <strong>💳 Crédito a generar:</strong> {validation.financial.estimatedCreditFormatted}
              </p>
            )}
            
            {/* MOSTRAR MONTO PERDIDO SI APLICA */}
            {validation.policies.refund?.type === 'forfeit' && validation.financial?.totalPaid > 0 && (
              <p className="text-red-700">
                <strong>💸 Monto no reembolsable:</strong> {validation.financial.totalPaidFormatted}
              </p>
            )}

            {/* MOSTRAR REGLA APLICADA */}
            <p className="text-blue-700 mt-2">
              <strong>📋 Regla aplicada:</strong> {validation.policies.appliedRule}
            </p>
          </div>
        </div>
      )}

      {/* MOSTRAR ADVERTENCIAS SI EXISTEN */}
      {validation && validation.warnings && validation.warnings.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <h4 className="font-semibold text-orange-800 mb-2">⚠️ Advertencias:</h4>
          {validation.warnings.map((warning, index) => (
            <p key={index} className="text-orange-700 text-sm">• {warning}</p>
          ))}
        </div>
      )}

      {/* MOSTRAR ERRORES SI EXISTEN */}
      {validation && validation.errors && validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <h4 className="font-semibold text-red-800 mb-2">❌ Errores:</h4>
          {validation.errors.map((error, index) => (
            <p key={index} className="text-red-700 text-sm">• {error}</p>
          ))}
        </div>
      )}

      {/* Advertencia general */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <p className="text-red-800 text-sm font-medium">
          ⚠️ Esta acción no se puede deshacer
        </p>
        <p className="text-red-700 text-sm mt-1">
          La reserva será marcada como cancelada y se procesarán los vouchers correspondientes.
        </p>
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep('confirm')}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Atrás
        </button>
        <button
          onClick={handleConfirmCancellation}
          disabled={loading.cancellation || (validation && !validation.canCancel)}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          🚨 Confirmar Cancelación
        </button>
      </div>
    </>
  );
      case 'processing':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Procesando cancelación...
            </h3>
            <p className="text-gray-600">
              Por favor espere mientras se procesa la cancelación
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Trigger Button */}
      {renderTrigger()}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {renderModalContent()}
          </div>
        </div>
      )}
    </>
  );
};
CancellationManager.propTypes = {
  booking: PropTypes.shape({
    bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    status: PropTypes.string.isRequired,
    checkIn: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    totalAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    room: PropTypes.shape({
      roomNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    }),
    roomNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    guest: PropTypes.shape({
      scostumername: PropTypes.string
    })
  }).isRequired,
  onCancel: PropTypes.func,
  onClose: PropTypes.func,
  trigger: PropTypes.element
};

export default CancellationManager;
