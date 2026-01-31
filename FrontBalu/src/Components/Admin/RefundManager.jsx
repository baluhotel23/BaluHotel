/* eslint-disable react/prop-types */
/**
 * 💸 RefundManager Component
 * 
 * Componente para gestionar cancelaciones excepcionales con reembolso
 * Solo visible y ejecutable por usuarios con rol "owner"
 * 
 * Uso:
 *   import RefundManager from './RefundManager';
 *   <RefundManager booking={booking} onRefundComplete={handleComplete} />
 */

import  { useState } from 'react';
import axios from 'axios';

// eslint-disable-next-line react/prop-types
const RefundManager = ({ booking, onRefundComplete, userRole }) => {
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('transfer');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // ⭐ Solo mostrar si el usuario es owner
  if (userRole !== 'owner') {
    return null;
  }

  // ⭐ No mostrar si la reserva ya está cancelada
  if (booking.status === 'cancelled') {
    return (
      <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg">
        <p className="text-gray-600 text-sm">
          🚫 Esta reserva ya está cancelada
        </p>
      </div>
    );
  }

  // ⭐ No mostrar si ya está checked-in o completed
  if (booking.status === 'checked-in' || booking.status === 'completed') {
    return (
      <div className="bg-yellow-100 border border-yellow-400 p-4 rounded-lg">
        <p className="text-yellow-800 text-sm font-medium">
          ⚠️ No se puede reembolsar una reserva {booking.status === 'checked-in' ? 'hospedada' : 'completada'}
        </p>
        <p className="text-yellow-700 text-xs mt-1">
          {booking.status === 'checked-in' 
            ? 'Debe hacer checkout primero' 
            : 'Esta reserva ya finalizó su estadía'}
        </p>
      </div>
    );
  }

  // ⭐ Calcular total pagado
  const totalPaid = booking.payments?.reduce((sum, payment) => {
    if (payment.paymentStatus === 'authorized' || payment.paymentStatus === 'completed') {
      return sum + parseFloat(payment.amount || 0);
    }
    return sum;
  }, 0) || 0;

  // ⭐ No mostrar si no hay pagos
  if (totalPaid <= 0) {
    return (
      <div className="bg-blue-100 border border-blue-300 p-4 rounded-lg">
        <p className="text-blue-800 text-sm">
          ℹ️ Esta reserva no tiene pagos que reembolsar
        </p>
        <p className="text-blue-700 text-xs mt-1">
          Use la cancelación normal para reservas sin pago
        </p>
      </div>
    );
  }

  const handleRefund = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token'); // O tu método de obtener token

      const response = await axios.post(
        `/api/bookings/${booking.bookingId}/cancel-with-refund`,
        { refundReason, refundMethod, notes },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // ✅ Éxito
      alert('✅ Reembolso procesado exitosamente\n\nRecuerde realizar la devolución manual al cliente.');
      
      if (onRefundComplete) {
        onRefundComplete(response.data);
      }

      // Limpiar formulario
      setRefundReason('');
      setNotes('');
      setShowConfirm(false);

    } catch (error) {
      console.error('Error procesando reembolso:', error);
      
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Error desconocido al procesar el reembolso';

      setError(errorMessage);
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setError(null);
  };

  const isFormValid = refundReason.trim().length >= 10;

  return (
    <div className="refund-manager border-red-500 border-2 p-4 rounded-lg bg-red-50 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🚨</span>
        <h3 className="text-red-600 font-bold text-lg">
          CANCELACIÓN EXCEPCIONAL CON REEMBOLSO
        </h3>
      </div>

      <p className="text-sm text-gray-700 mb-4 bg-white p-2 rounded border border-red-200">
        ⚠️ <strong>Solo para casos de fuerza mayor.</strong> El dinero será devuelto al cliente.
        Esta operación quedará registrada en reportes financieros.
      </p>

      {/* Información de la reserva */}
      <div className="bg-white p-3 rounded border border-gray-300 mb-4">
        <h4 className="font-medium text-gray-800 mb-2">📋 Datos de la Reserva</h4>
        <div className="text-sm space-y-1">
          <p><strong>ID:</strong> {booking.bookingId}</p>
          <p><strong>Huésped:</strong> {booking.guest?.scostumername || 'N/A'}</p>
          <p><strong>Habitación:</strong> {booking.roomNumber}</p>
          <p><strong>Check-In:</strong> {new Date(booking.checkIn).toLocaleDateString('es-CO')}</p>
          <p><strong>Check-Out:</strong> {new Date(booking.checkOut).toLocaleDateString('es-CO')}</p>
          <p className="text-green-600 font-medium">
            <strong>💰 Total Pagado:</strong> ${totalPaid.toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="space-y-3">
        <div>
          <label className="block font-medium text-gray-800 mb-1">
            Razón del Reembolso <span className="text-red-600">*</span>
          </label>
          <textarea
            className={`w-full border p-2 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              refundReason && !isFormValid ? 'border-red-500' : 'border-gray-300'
            }`}
            rows="3"
            placeholder="Ejemplo: Emergencia médica familiar - hospitalización urgente. El cliente no puede viajar."
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            required
            disabled={isProcessing}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            Mínimo 10 caracteres. Describa claramente la situación de fuerza mayor.
            {refundReason && (
              <span className={refundReason.length >= 10 ? 'text-green-600' : 'text-red-600'}>
                {' '}({refundReason.length}/500)
              </span>
            )}
          </p>
        </div>

        <div>
          <label className="block font-medium text-gray-800 mb-1">
            Método de Devolución
          </label>
          <select
            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value)}
            disabled={isProcessing}
          >
            <option value="transfer">💳 Transferencia Bancaria</option>
            <option value="cash">💵 Efectivo</option>
            <option value="credit_card">💳 Devolución a Tarjeta</option>
          </select>
        </div>

        <div>
          <label className="block font-medium text-gray-800 mb-1">
            Notas Adicionales (Opcional)
          </label>
          <textarea
            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows="2"
            placeholder="Información adicional sobre el caso, acuerdos con el cliente, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isProcessing}
            maxLength={300}
          />
          {notes && (
            <p className="text-xs text-gray-500 mt-1">
              {notes.length}/300 caracteres
            </p>
          )}
        </div>

        {/* Advertencia importante */}
        <div className="bg-yellow-100 border border-yellow-400 p-3 rounded">
          <p className="text-sm font-medium text-yellow-800">
            ⚠️ IMPORTANTE - Lea antes de continuar:
          </p>
          <ul className="text-sm text-yellow-800 list-disc ml-5 mt-2 space-y-1">
            <li>Monto a reembolsar: <strong>${totalPaid.toLocaleString('es-CO')}</strong></li>
            <li>Esta operación <strong className="underline">NO se puede deshacer</strong></li>
            <li>La reserva se cancelará automáticamente</li>
            <li>La habitación será liberada</li>
            <li>Debe devolver el dinero <strong>manualmente</strong> al cliente</li>
            <li>Quedará registrado en reportes financieros como reembolso</li>
          </ul>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 border border-red-400 p-3 rounded">
            <p className="text-sm text-red-800">
              <strong>❌ Error:</strong> {error}
            </p>
          </div>
        )}

        {/* Botones */}
        {!showConfirm ? (
          <button
            className={`w-full py-3 rounded font-medium transition-colors ${
              isFormValid && !isProcessing
                ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={() => setShowConfirm(true)}
            disabled={!isFormValid || isProcessing}
          >
            💸 Procesar Reembolso Excepcional
          </button>
        ) : (
          <div className="space-y-2 bg-red-100 p-3 rounded border border-red-400">
            <p className="text-center text-red-700 font-bold text-sm">
              ⚠️⚠️⚠️ ¿ESTÁ COMPLETAMENTE SEGURO? ⚠️⚠️⚠️
            </p>
            <p className="text-center text-red-600 text-xs mb-2">
              Esta acción es IRREVERSIBLE. Se devolverá ${totalPaid.toLocaleString('es-CO')} al cliente.
            </p>
            <div className="flex gap-2">
              <button
                className={`flex-1 py-3 rounded font-medium transition-colors ${
                  isProcessing
                    ? 'bg-gray-400 text-gray-200 cursor-wait'
                    : 'bg-red-700 text-white hover:bg-red-800'
                }`}
                onClick={handleRefund}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Procesando...
                  </span>
                ) : (
                  '✅ SÍ, Confirmar Reembolso'
                )}
              </button>
              <button
                className="flex-1 bg-gray-500 text-white py-3 rounded font-medium hover:bg-gray-600 transition-colors"
                onClick={handleCancel}
                disabled={isProcessing}
              >
                ❌ NO, Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-red-300">
        <p className="text-xs text-gray-600 text-center">
          🔒 Esta operación requiere permisos de Owner y quedará registrada con su identificación.
        </p>
      </div>
    </div>
  );
};

export default RefundManager;
