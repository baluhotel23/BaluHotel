import  { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import sha256 from "crypto-js/sha256";

const WompiPayment = ({ booking, onPaymentComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const baseAmount = parseFloat(booking.totalAmount);
      if (isNaN(baseAmount) || baseAmount <= 0) {
        toast.error('El monto total de la reserva es inválido.');
        console.error('Invalid booking.totalAmount:', booking.totalAmount);
        return;
      }

      // ⭐ YA NO CALCULAMOS NADA, USAMOS EL MONTO QUE VIENE
      const amountToPay = baseAmount;
      const amountInCents = Math.round(amountToPay * 100);
      
      console.log('💳 [WOMPI] Procesando pago:', {
        originalAmount: baseAmount,
        amountToPay,
        amountInCents
      });

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
      console.log("redirectUrl:", redirectUrl);
      
      try {
        new URL(redirectUrl);
      } catch (e) {
        toast.error('La URL de redirección es inválida.');
        console.error('Invalid redirectUrl:', redirectUrl, e);
        return;
      }

      const reference = `BALU-${booking.bookingId.replace(/[^a-zA-Z0-9-_]/g, '')}-${Date.now()}`;
      console.log("Wompi reference:", reference);

      const currencyForSignature = booking.currency || 'COP';
      const integrityString = `${reference}${amountInCents}${currencyForSignature}${integritySecret}`;

      console.log("String para firmar (integrityString):", integrityString); 
      
      const integrity = sha256(integrityString).toString();
      console.log("Datos para la firma y checkout:", {
        reference,
        amountInCents,
        currency: currencyForSignature,
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
        },
        signature: {
          integrity: integrity,
        }
      };
      
      console.log("Wompi Checkout Data:", checkoutData);
      const checkout = new WidgetCheckout(checkoutData);

      checkout.open((result) => {
        const { transaction, error } = result;
        if (transaction) {
          console.log('Wompi Transaction successful:', transaction);
          onPaymentComplete(transaction);
        } else {
          console.warn('Wompi widget closed or error occurred:', result);
          if (error) {
            toast.error(`Error en el widget de Wompi: ${error.reason || error.type || 'Error desconocido'}`);
            console.error('Wompi widget error:', error);
          }
        }
        setLoading(false);
      });

    } catch (error) {
      toast.error('Error al iniciar el proceso de pago con Wompi.');
      console.error('Wompi Payment initialization error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-lg"
         style={{ 
           boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.1), 0 10px 25px -5px rgba(0, 0, 0, 0.1)' 
         }}>
      <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">
        💳 Proceder al Pago
      </h3>
      
      {/* ⭐ MOSTRAR SOLO EL MONTO A PAGAR */}
      <div className="text-center mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <p className="text-lg font-bold text-gray-800">
          💸 Monto a pagar: <span className="text-green-600">${booking.totalAmount.toLocaleString()}</span>
        </p>
      </div>

      {/* ⭐ UN SOLO BOTÓN DE PAGO */}
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`w-full p-4 rounded-xl font-bold text-white transition-all duration-200 transform hover:scale-105 ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Procesando...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-3">
            <span className="text-2xl">💳</span>
            <span>Pagar ${booking.totalAmount.toLocaleString()}</span>
          </div>
        )}
      </button>

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
    customer_email: PropTypes.string.isRequired,
  }).isRequired,
  onPaymentComplete: PropTypes.func.isRequired,
};

export default WompiPayment;