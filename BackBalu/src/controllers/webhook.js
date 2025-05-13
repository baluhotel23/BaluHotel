const { Booking, Payment } = require("../data");
const crypto = require('crypto');

module.exports = async (req, res) => {
  try {
    const { event, data } = req.body;

    // Verifica si el evento es una actualización de la transacción
    if (event === 'transaction.updated') {
      const transaction = data.transaction;

      // Recalcular la firma basada en los campos que usaste al crear la firma
      // Por ejemplo, suponiendo que usaste el id de la orden:
      const calculatedSignature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(transaction.bookingId.toString())
        .digest('hex');

      // Compara la firma recibida (asegúrate de que en el payload venga 'signature') con la calculada
      if (calculatedSignature !== transaction.signature) {
        return res.status(400).json({ error: 'Integrity signature mismatch' });
      }

      // Ahora, busca la orden basándote en el id de la orden (o en otro campo que hayas definido)
      const booking = await Booking.findOne({ where: { bookingId: transaction.bookingId } });

      if (!booking) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Actualiza el estado de la orden según el estado de la transacción
      if (transaction.status === 'APPROVED') {
        booking.transaction_status = 'Aprobado';
      } else if (transaction.status === 'DECLINED') {
        booking.transaction_status = 'Rechazado';
      } else if (transaction.status === 'PENDING') {
        booking.transaction_status = 'Pendiente';
      }

      await booking.save();

      return res.status(200).json({ message: 'Order updated' });
    } else {
      return res.status(400).json({ error: 'Unknown event' });
    }
  } catch (error) {
    console.error("Error handling webhook:", error);
    return res.status(500).json({ error: error.message });
  }
};



