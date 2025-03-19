import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

const WompiPayment = ({ booking, onPaymentComplete }) => {
  const handlePaymentOption = async (percentage) => {
    try {
      const amount = percentage === 100 
        ? booking.totalAmount 
        : (booking.totalAmount * 0.5);

      const checkout = new WidgetCheckout({
        currency: 'COP',
        amountInCents: Math.round(amount * 100),
        reference: `BALU-${booking.bookingId}-${Date.now()}`,
        publicKey: import.meta.env.VITE_WOMPI_PUBLIC_KEY,
        redirectUrl: `${import.meta.env.VITE_FRONTEND_URL}/payment-status`,
      });

      checkout.open((result) => {
        const { transaction } = result;
        // Handle the transaction result
        onPaymentComplete(transaction);
      });

    } catch (error) {
      toast.error('Error al iniciar el pago');
      console.error('Payment error:', error);
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-xl">
      <h2 className="text-xl font-bold mb-4">Seleccione forma de pago</h2>
      <div className="space-y-4">
        <button
          onClick={() => handlePaymentOption(100)}
          className="w-full p-3 bg-green-600 hover:bg-green-700 rounded-full"
        >
          Pagar 100% (${booking.totalAmount})
        </button>
        <button
          onClick={() => handlePaymentOption(50)}
          className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-full"
        >
          Pagar 50% (${booking.totalAmount * 0.5})
        </button>
      </div>
    </div>
  );
};
WompiPayment.propTypes = {
  booking: PropTypes.shape({
    totalAmount: PropTypes.number.isRequired,
    bookingId: PropTypes.string.isRequired,
  }).isRequired,
  onPaymentComplete: PropTypes.func.isRequired,
};

export default WompiPayment;
