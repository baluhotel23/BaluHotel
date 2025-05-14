import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import sha256 from "crypto-js/sha256";

const WompiPayment = ({ booking, onPaymentComplete }) => {
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
    const integrityString = `${amountInCents}${booking.currency || 'COP'}${reference}${integritySecret}`;
    const integrity = sha256(integrityString).toString();
console.log({
  amountInCents,
  currency: booking.currency || 'COP',
  reference,
  integritySecret,
  publicKey
});
    const checkoutData = {
      currency: booking.currency || 'COP',
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
    <div className="p-4 bg-gray-800 rounded-xl">
      <h2 className="text-xl font-bold mb-4">Seleccione forma de pago</h2>
      <div className="space-y-4">
        <button
          onClick={() => handlePaymentOption(100)}
          className="w-full p-3 bg-gray-600 hover:bg-gray-700 rounded-full"
        >
          Pagar 100% (${booking.totalAmount ? parseFloat(booking.totalAmount).toFixed(2) : '0.00'})
        </button>
        <button
          onClick={() => handlePaymentOption(50)}
          className="w-full p-3 bg-stone-600 hover:bg-stone-700 rounded-full"
        >
          Pagar 50% (${booking.totalAmount ? (parseFloat(booking.totalAmount) * 0.5).toFixed(2) : '0.00'})
        </button>
      </div>
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