const { Booking, Payment } = require("../data");
const crypto = require('crypto');
require('dotenv').config();

const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;

module.exports = async (req, res) => {
  try {
    const { event, data } = req.body;

    if (event === 'transaction.updated') {
      const transaction = data.transaction;

      // Calcula la firma de integridad según la documentación de Wompi
      const integrityString = `${transaction.amount_in_cents}${transaction.currency}${transaction.reference}${WOMPI_INTEGRITY_SECRET}`;
      const calculatedSignature = crypto
        .createHash('sha256')
        .update(integrityString)
        .digest('hex');

      // Compara la firma recibida con la calculada
      if (calculatedSignature !== transaction.signature) {
        return res.status(400).json({ error: 'Integrity signature mismatch' });
      }

      // Busca la reserva por referencia (ajusta si usas otro campo)
      const booking = await Booking.findOne({ where: { reference: transaction.reference } });

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



