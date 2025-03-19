const { Booking, Payment } = require("../data");
const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    const { event, data } = req.body;

    // Verifica si el evento es una actualización de la transacción
    if (event === 'transaction.updated') {
      const transaction = data.transaction;
      const paymentReference = transaction.reference;

      // Verificar la firma de integridad
      const isValidSignature = verifyIntegritySignature(transaction, process.env.WOMPI_PUBLIC_KEY);

      if (!isValidSignature) {
        console.error("Firma de integridad inválida");
        return res.status(400).json({ error: 'Invalid integrity signature' });
      }

      // Encuentra el pago en la base de datos usando el campo 'paymentReference'
      const payment = await Payment.findOne({ where: { paymentReference: paymentReference } });

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // Actualiza el estado del pago basado en el estado de la transacción
      if (transaction.status === 'APPROVED') {
        payment.paymentStatus = 'completed'; // Cambia el estado a 'completed'

        // Actualiza el estado de la reserva a "confirmed"
        const booking = await Booking.findByPk(payment.bookingId);
        if (booking) {
          booking.status = 'confirmed';
          await booking.save();
        } else {
          console.error("Reserva no encontrada al actualizar el estado");
        }
      } else if (transaction.status === 'DECLINED') {
        payment.paymentStatus = 'failed'; // Cambia el estado a 'failed'
      } else if (transaction.status === 'PENDING') {
        payment.paymentStatus = 'pending'; // Cambia el estado a 'pending'
      }

      // Guarda los cambios en la base de datos
      await payment.save();

      // Responde a Wompi indicando que la notificación fue recibida y procesada correctamente
      return res.status(200).json({ message: 'Payment updated' });
    } else {
      return res.status(400).json({ error: 'Unknown event' });
    }
  } catch (error) {
    console.error("Error handling webhook:", error);
    return res.status(500).json({ error: error.message });
  }
};

function verifyIntegritySignature(transaction, publicKey) {
  const message = transaction.status + transaction.amount_in_cents + transaction.reference;
  const signature = transaction.signature;

  const verifier = crypto.createVerify('SHA256');
  verifier.update(message);

  const isValid = verifier.verify(publicKey, signature, 'base64');
  return isValid;
}


