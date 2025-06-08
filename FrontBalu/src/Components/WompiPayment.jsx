import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import sha256 from "crypto-js/sha256";

const WompiPayment = ({ booking, onPaymentComplete }) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(0);

  const handlePaymentOption = async (percentage) => {
  try {
    const baseAmount = parseFloat(booking.totalAmount);
    if (isNaN(baseAmount) || baseAmount <= 0) {
      toast.error('El monto total de la reserva es inválido.');
      console.error('Invalid booking.totalAmount:', booking.totalAmount);
      return;
    }

    const amountToPay = percentage === 100 
      ? baseAmount 
      : (baseAmount * 0.5);

    const amountInCents = Math.round(amountToPay * 100);
    if (amountInCents <= 0) {
      toast.error('El monto a pagar debe ser positivo.');
      console.error('Invalid amountInCents calculated:', amountInCents);
      return;
    }

    if (!booking.customer_email || !/\S+@\S+\.\S+/.test(booking.customer_email)) {
      toast.error('El email del cliente es inválido o está ausente.');
      console.error('Invalid or missing booking.customer_email:', booking.customer_email);
      return;
    }

    if (!booking.bookingId || typeof booking.bookingId !== 'string' || booking.bookingId.trim() === '') {
      toast.error('El ID de la reserva es inválido.');
      console.error('Invalid or missing booking.bookingId:', booking.bookingId);
      return;
    }
    
    const publicKey = import.meta.env.VITE_WOMPI_PUBLIC_KEY;
    if (!publicKey) {
      toast.error('La llave pública de Wompi no está configurada.');
      console.error('Missing VITE_WOMPI_PUBLIC_KEY from .env');
      return;
    }
    const integritySecret = import.meta.env.VITE_WOMPI_INTEGRITY_SECRET;
    if (!integritySecret) {
      toast.error('El secret de integridad de Wompi no está configurado.');
      console.error('Missing VITE_WOMPI_INTEGRITY_SECRET from .env');
      return;
    }
    const redirectUrl = `${import.meta.env.VITE_FRONTEND_URL}/thankyou`;
console.log("redirectUrl:", redirectUrl); // <-- Agrega este log
try {
  new URL(redirectUrl); // Validate if the URL is well-formed
} catch (e) {
  toast.error('La URL de redirección es inválida.');
  console.error('Invalid redirectUrl:', redirectUrl, e);
  return;
}

    const reference = `BALU-${booking.bookingId.replace(/[^a-zA-Z0-9-_]/g, '')}-${Date.now()}`;
    console.log("Wompi reference:", reference);

    // Calcula la firma de integridad correctamente
    const currencyForSignature = booking.currency || 'COP';
    const integrityString = `${reference}${amountInCents}${currencyForSignature}${integritySecret}`;

    console.log("String para firmar (integrityString):", integrityString); 
    
    const integrity = sha256(integrityString).toString(); // crypto-js/sha256 por defecto devuelve Hex
console.log("Datos para la firma y checkout (Valores individuales):", {
      reference,
      amountInCents,
      currency: currencyForSignature,
      integritySecret, // Considera no loguear el secreto en producción por seguridad
      publicKey,
      calculatedIntegritySignature: integrity
    });

    const checkoutData = {
      currency: currencyForSignature,
      amountInCents: amountInCents,
      reference: reference,
      publicKey: publicKey,
      redirectUrl: redirectUrl,
      customerData: {
        email: booking.customer_email,
        // otros campos...
      },
      signature: {
        integrity: integrity, // <--- ¡Esto es lo que pide Wompi!
      }
    };
    
    console.log("Wompi Checkout Data:", checkoutData); // Log the data being sent
    console.log({ amountInCents, currency: booking.currency || 'COP', reference, integritySecret, publicKey });
    const checkout = new WidgetCheckout(checkoutData);

    checkout.open((result) => {
      const { transaction, error } = result;
      if (transaction) {
        console.log('Wompi Transaction successful (from widget):', transaction);
        onPaymentComplete(transaction);
      } else {
        console.warn('Wompi widget closed or an error occurred.', result);
        if (error) {
          toast.error(`Error en el widget de Wompi: ${error.reason || error.type || 'Error desconocido'}`);
          console.error('Wompi widget error:', error);
        }
      }
    });

  } catch (error) {
    toast.error('Error al iniciar el proceso de pago con Wompi.');
    console.error('Wompi Payment initialization error:', error);
  }
};

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-lg"
         style={{ 
           boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.1), 0 10px 25px -5px rgba(0, 0, 0, 0.1)' 
         }}>
      <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">
        💳 Seleccione forma de pago
      </h3>
      
      <div className="space-y-3 mb-6">
        <button
          onClick={() => { handlePaymentOption(100); setSelectedMethod('card'); setSelectedAmount(booking.totalAmount); }}
          className={`w-full p-4 rounded-xl border-2 font-medium transition-all duration-200 transform hover:scale-105 ${
            selectedMethod === 'card'
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <span className="text-2xl">💳</span>
            <span>Pagar 100% (${(booking.totalAmount).toLocaleString()})</span>
          </div>
        </button>
        
        <button
          onClick={() => { handlePaymentOption(50); setSelectedMethod('partial'); setSelectedAmount(booking.totalAmount * 0.5); }}
          className={`w-full p-4 rounded-xl border-2 font-medium transition-all duration-200 transform hover:scale-105 ${
            selectedMethod === 'partial'
              ? 'border-yellow-500 bg-yellow-50 text-yellow-700 shadow-md'
              : 'border-gray-200 bg-white text-gray-700 hover:border-yellow-300 hover:bg-yellow-50'
          }`}
        >
          <div className="flex items-center justify-center space-x-3">
            <span className="text-2xl">💰</span>
            <span>Pagar 50% (${(booking.totalAmount * 0.5).toLocaleString()})</span>
          </div>
        </button>
      </div>

      {selectedAmount > 0 && (
        <div className="text-center mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-lg font-bold text-gray-800">
            💸 Monto a pagar: <span className="text-green-600">${selectedAmount.toLocaleString()}</span>
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-center">❌ {error}</p>
        </div>
      )}
    </div>
  );
};

WompiPayment.propTypes = {
  booking: PropTypes.shape({
    totalAmount: PropTypes.number.isRequired,
    bookingId: PropTypes.string.isRequired,
    currency: PropTypes.string,
    customer_email: PropTypes.string,
    // Add other customer fields if you plan to use them:
    // customer_name: PropTypes.string,
    // customer_phone: PropTypes.string,
    // customer_document_number: PropTypes.string,
    // customer_document_type: PropTypes.string,
  }).isRequired,
  onPaymentComplete: PropTypes.func.isRequired,
};

export default WompiPayment;