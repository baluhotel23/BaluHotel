import React, { useState, useEffect, useMemo } from 'react';
import { getRealPaymentSummary } from '../../utils/paymentUtils';
import { calculateRoomCharge } from '../../hooks/calculateRoomCharge';

const EarlyCheckOutModal = ({
  booking,
  earlyCheckOutDate,
  setEarlyCheckOutDate,
  onConfirm,
  onClose,
  isLoading
}) => {
  const [showCalculations, setShowCalculations] = useState(false);
  const [notes, setNotes] = useState("");

  // Validar que tenemos los datos necesarios
  if (!booking) {
    return null;
  }

  // Calcular fechas y noches
  const checkIn = new Date(booking.checkIn);
  const originalCheckOut = new Date(booking.checkOut);
  const earlyOut = earlyCheckOutDate ? new Date(earlyCheckOutDate) : null;

  const originalNights = Math.ceil(
    (originalCheckOut - checkIn) / (1000 * 60 * 60 * 24)
  );

  const actualNights = earlyOut ? Math.max(
    1,
    Math.ceil((earlyOut - checkIn) / (1000 * 60 * 60 * 24))
  ) : originalNights;

  const nightsSaved = originalNights - actualNights;

  // Calcular información financiera
  const financials = useMemo(() => getRealPaymentSummary(booking), [booking]);

  // Calcular descuento y nuevo costo
  const calculations = useMemo(() => {
    if (!earlyOut || earlyOut >= originalCheckOut) {
      return {
        newRoomCost: 0,
        potentialDiscount: 0,
        savingsPercentage: 0,
        newTotalWithExtras: 0,
        newBalance: 0
      };
    }

    const originalAmount = parseFloat(booking.originalAmount || booking.totalAmount || 0);
    
    let newRoomCost;
    try {
      newRoomCost = calculateRoomCharge(
        booking.room,
        booking.guestCount,
        actualNights
      );
    } catch (error) {
      // Fallback: cálculo proporcional
      newRoomCost = (originalAmount / originalNights) * actualNights;
    }

    const potentialDiscount = Math.max(0, originalAmount - newRoomCost);
    const savingsPercentage = originalAmount > 0 
      ? Math.round((potentialDiscount / originalAmount) * 100) 
      : 0;

    const newTotalWithExtras = newRoomCost + financials.totalExtras;
    const newBalance = Math.max(0, newTotalWithExtras - financials.totalPagado);

    return {
      newRoomCost,
      potentialDiscount,
      savingsPercentage,
      newTotalWithExtras,
      newBalance,
      originalAmount
    };
  }, [earlyOut, originalCheckOut, actualNights, originalNights, booking, financials]);

  // Validaciones de fecha
  const dateValidation = useMemo(() => {
    if (!earlyOut) {
      return { isValid: false, message: "Seleccione una fecha de salida" };
    }

    if (earlyOut <= checkIn) {
      return { isValid: false, message: "La fecha debe ser posterior al check-in" };
    }

    if (earlyOut >= originalCheckOut) {
      return { isValid: false, message: "La fecha debe ser anterior a la salida original" };
    }

    return { isValid: true, message: "" };
  }, [earlyOut, checkIn, originalCheckOut]);

  // Manejar confirmación
  const handleConfirm = () => {
    if (!dateValidation.isValid) {
      return;
    }

    const reason = notes.trim() || `Retiro anticipado: ${nightsSaved} día${nightsSaved > 1 ? 's' : ''} menos`;
    onConfirm(booking, earlyCheckOutDate, reason);
  };

  // Formatear fechas para mostrar
  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('es-CO', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                ⏩ Check-Out Anticipado
              </h2>
              <p className="text-orange-100 mt-1">
                Reserva #{booking.bookingId} - Habitación {booking.room?.roomNumber || booking.roomNumber}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-orange-200 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          
          {/* Información actual de la reserva */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              📋 Información Actual
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-blue-700">
                  <strong>Huésped:</strong> {booking.guest?.scostumername || 'N/A'}
                </div>
                <div className="text-blue-700">
                  <strong>Check-in:</strong> {formatDateTime(booking.checkIn)}
                </div>
                <div className="text-blue-700">
                  <strong>Check-out original:</strong> {formatDateTime(booking.checkOut)}
                </div>
              </div>
              <div>
                <div className="text-blue-700">
                  <strong>Noches originales:</strong> {originalNights}
                </div>
                <div className="text-blue-700">
                  <strong>Costo actual:</strong> ${parseFloat(booking.totalAmount || 0).toLocaleString()}
                </div>
                {financials.totalExtras > 0 && (
                  <div className="text-blue-700">
                    <strong>Consumos extras:</strong> ${financials.totalExtras.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Advertencia si tiene descuento existente */}
            {parseFloat(booking.discountAmount || 0) > 0 && (
              <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm">
                <div className="flex items-center gap-2 text-yellow-800">
                  <span>⚠️</span>
                  <strong>Descuento existente:</strong> ${parseFloat(booking.discountAmount).toLocaleString()}
                </div>
                <div className="text-yellow-700 text-xs mt-1">
                  Razón: {booking.discountReason || 'Sin especificar'}
                </div>
              </div>
            )}
          </div>

          {/* Selector de nueva fecha */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Nueva fecha y hora de salida:
            </label>
            <input
              type="datetime-local"
              className={`w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 ${
                dateValidation.isValid 
                  ? 'border-gray-300 focus:ring-blue-500' 
                  : 'border-red-300 focus:ring-red-500'
              }`}
              value={earlyCheckOutDate}
              onChange={(e) => setEarlyCheckOutDate(e.target.value)}
              min={new Date(checkIn.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
              max={new Date(originalCheckOut.getTime() - 60 * 60 * 1000).toISOString().slice(0, 16)}
              disabled={isLoading}
            />
            <div className="mt-1 text-xs text-gray-500">
              Entre {formatDateTime(new Date(checkIn.getTime() + 24 * 60 * 60 * 1000))} y {formatDateTime(new Date(originalCheckOut.getTime() - 60 * 60 * 1000))}
            </div>
            {!dateValidation.isValid && dateValidation.message && (
              <div className="mt-1 text-sm text-red-600">
                {dateValidation.message}
              </div>
            )}
          </div>

          {/* Preview de cálculos */}
          {earlyOut && dateValidation.isValid && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                  💰 Preview del Descuento
                </h3>
                <button
                  onClick={() => setShowCalculations(!showCalculations)}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  {showCalculations ? 'Ocultar' : 'Ver'} detalles
                </button>
              </div>

              {/* Resumen rápido */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-2 bg-green-100 rounded">
                  <div className="font-bold text-green-800">{nightsSaved}</div>
                  <div className="text-green-600 text-xs">Día{nightsSaved > 1 ? 's' : ''} ahorrado{nightsSaved > 1 ? 's' : ''}</div>
                </div>
                <div className="text-center p-2 bg-green-100 rounded">
                  <div className="font-bold text-green-800">{actualNights}</div>
                  <div className="text-green-600 text-xs">Noches reales</div>
                </div>
                <div className="text-center p-2 bg-green-100 rounded">
                  <div className="font-bold text-green-800">${calculations.potentialDiscount.toLocaleString()}</div>
                  <div className="text-green-600 text-xs">Descuento</div>
                </div>
                <div className="text-center p-2 bg-green-100 rounded">
                  <div className="font-bold text-green-800">{calculations.savingsPercentage}%</div>
                  <div className="text-green-600 text-xs">Ahorro</div>
                </div>
              </div>

              {/* Detalles expandibles */}
              {showCalculations && (
                <div className="mt-4 p-3 bg-white rounded border border-green-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Costo original habitación:</span>
                      <span className="font-medium">${calculations.originalAmount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nuevo costo habitación ({actualNights} noches):</span>
                      <span className="font-medium">${calculations.newRoomCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Descuento por noches no usadas:</span>
                      <span className="font-medium">-${calculations.potentialDiscount.toLocaleString()}</span>
                    </div>
                    {financials.totalExtras > 0 && (
                      <div className="flex justify-between">
                        <span>Consumos extras (se mantienen):</span>
                        <span className="font-medium">+${financials.totalExtras.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Nuevo total:</span>
                      <span>${calculations.newTotalWithExtras.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>Ya pagado:</span>
                      <span className="font-medium">${financials.totalPagado.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Balance final:</span>
                      <span className={calculations.newBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                        {calculations.newBalance > 0 
                          ? `$${calculations.newBalance.toLocaleString()} pendiente`
                          : 'Cuenta saldada ✅'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notas adicionales */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Notas adicionales (opcional):
            </label>
            <textarea
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo del check-out anticipado, observaciones, etc."
              disabled={isLoading}
            />
          </div>

          {/* Información importante */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
              ℹ️ Información Importante
            </h4>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• El descuento se calculará automáticamente basado en las noches no utilizadas</li>
              <li>• Los consumos extras se mantendrán en su totalidad</li>
              <li>• Esta acción no se puede deshacer una vez confirmada</li>
              <li>• Se generará un registro de auditoría del check-out anticipado</li>
            </ul>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="bg-gray-50 p-6 border-t border-gray-200">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              🚫 Cancelar
            </button>
            
            <button
              onClick={handleConfirm}
              disabled={!dateValidation.isValid || isLoading}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : (
                <>
                  ✅ Confirmar Check-Out Anticipado
                  {calculations.potentialDiscount > 0 && (
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-sm">
                      Descuento: ${calculations.potentialDiscount.toLocaleString()}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarlyCheckOutModal;