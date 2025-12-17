const { Booking, Payment, Room } = require("../data");
const crypto = require('crypto');
const { getColombiaTime, formatForLogs } = require('../utils/dateUtils');
require('dotenv').config();

const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;

// ⭐ WEBHOOK MEJORADO PARA WOMPI - INTEGRADO CON FLUJO ACTUAL
module.exports = async (req, res) => {
  try {
    console.log("🔔 [WOMPI-WEBHOOK] Evento recibido:", formatForLogs(getColombiaTime()));
    console.log("📥 [WOMPI-WEBHOOK] Body:", JSON.stringify(req.body, null, 2));

    const { event, data } = req.body;

    if (event === 'transaction.updated') {
      const transaction = data.transaction;

      console.log("💳 [WOMPI-WEBHOOK] Transacción actualizada:", {
        id: transaction.id,
        reference: transaction.reference,
        status: transaction.status,
        amount: transaction.amount_in_cents / 100,
      });

      // ⭐ VERIFICAR FIRMA DE INTEGRIDAD
      const integrityString = `${transaction.reference}${transaction.status}${transaction.amount_in_cents}${transaction.currency}${WOMPI_INTEGRITY_SECRET}`;
      const calculatedSignature = crypto
        .createHash('sha256')
        .update(integrityString)
        .digest('hex');

      console.log("🔐 [WOMPI-WEBHOOK] Verificando firma:", {
        received: transaction.signature,
        calculated: calculatedSignature,
        match: calculatedSignature === transaction.signature
      });

      // ⭐ EXTRAER BOOKING ID DE LA REFERENCIA
      // Formato esperado: BALU-{bookingId}-{timestamp}
      const referenceMatch = transaction.reference.match(/BALU-(\d+)-/);
      if (!referenceMatch) {
        console.error("❌ [WOMPI-WEBHOOK] Referencia inválida:", transaction.reference);
        return res.status(400).json({ error: 'Invalid reference format' });
      }

      const bookingId = parseInt(referenceMatch[1]);
      console.log("🔍 [WOMPI-WEBHOOK] Booking ID extraído:", bookingId);

      // ⭐ BUSCAR RESERVA
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Room, as: 'room', attributes: ['roomNumber', 'status'] },
          { model: Payment, as: 'payments' }
        ]
      });

      if (!booking) {
        console.error("❌ [WOMPI-WEBHOOK] Reserva no encontrada:", bookingId);
        return res.status(404).json({ error: 'Booking not found' });
      }

      console.log("✅ [WOMPI-WEBHOOK] Reserva encontrada:", {
        bookingId: booking.bookingId,
        currentStatus: booking.status,
        pointOfSale: booking.pointOfSale
      });

      // ⭐ PROCESAR SEGÚN ESTADO DE LA TRANSACCIÓN
      if (transaction.status === 'APPROVED') {
        console.log("✅ [WOMPI-WEBHOOK] Transacción APROBADA");

        // ⭐ BUSCAR O CREAR PAGO
        let payment = await Payment.findOne({
          where: {
            bookingId,
            transactionId: transaction.id
          }
        });

        const amountInPesos = transaction.amount_in_cents / 100;

        if (!payment) {
          console.log("📝 [WOMPI-WEBHOOK] Creando nuevo registro de pago");
          payment = await Payment.create({
            bookingId,
            amount: amountInPesos,
            paymentMethod: 'wompi',
            paymentType: 'online',
            paymentStatus: 'completed',
            paymentDate: getColombiaTime().toJSDate(),
            transactionId: transaction.id,
            paymentReference: transaction.reference,
            processedBy: 'wompi_webhook',
            includesExtras: false,
            isReservationPayment: true,
            isCheckoutPayment: false,
            wompiTransactionId: transaction.id,
            wompiStatus: transaction.status
          });
        } else {
          console.log("📝 [WOMPI-WEBHOOK] Actualizando pago existente");
          await payment.update({
            paymentStatus: 'completed',
            wompiStatus: transaction.status,
            amount: amountInPesos
          });
        }

        // ⭐ ACTUALIZAR ESTADO DE RESERVA A 'paid'
        const reservationAmount = parseFloat(booking.totalAmount);
        const totalPaid = amountInPesos;
        
        let newStatus = booking.status;
        if (totalPaid >= reservationAmount) {
          newStatus = 'paid'; // ⭐ Pago completo
          console.log("💰 [WOMPI-WEBHOOK] Pago completo - Cambiando status a 'paid'");
        } else {
          newStatus = 'confirmed'; // ⭐ Pago parcial
          console.log("💰 [WOMPI-WEBHOOK] Pago parcial - Cambiando status a 'confirmed'");
        }

        await booking.update({ 
          status: newStatus,
          paymentCompletedAt: getColombiaTime().toJSDate()
        });

        // ⭐ ACTUALIZAR HABITACIÓN A 'Reservada'
        if (booking.room) {
          await booking.room.update({
            status: 'Reservada',
            available: false
          });
          console.log("🏨 [WOMPI-WEBHOOK] Habitación marcada como 'Reservada'");
        }

        console.log("✅ [WOMPI-WEBHOOK] Proceso completado exitosamente");
        return res.status(200).json({ 
          message: 'Payment processed successfully',
          bookingId,
          newStatus
        });

      } else if (transaction.status === 'DECLINED') {
        console.log("❌ [WOMPI-WEBHOOK] Transacción RECHAZADA");
        
        // ⭐ REGISTRAR PAGO FALLIDO
        await Payment.create({
          bookingId,
          amount: transaction.amount_in_cents / 100,
          paymentMethod: 'wompi',
          paymentType: 'online',
          paymentStatus: 'failed',
          paymentDate: getColombiaTime().toJSDate(),
          transactionId: transaction.id,
          paymentReference: transaction.reference,
          processedBy: 'wompi_webhook',
          notes: 'Pago rechazado por Wompi',
          wompiTransactionId: transaction.id,
          wompiStatus: transaction.status
        });

        return res.status(200).json({ 
          message: 'Payment declined',
          bookingId
        });

      } else if (transaction.status === 'PENDING') {
        console.log("⏳ [WOMPI-WEBHOOK] Transacción PENDIENTE");
        return res.status(200).json({ 
          message: 'Payment pending',
          bookingId
        });
      }

      return res.status(200).json({ message: 'Event processed' });

    } else {
      console.log("⚠️ [WOMPI-WEBHOOK] Evento desconocido:", event);
      return res.status(400).json({ error: 'Unknown event' });
    }

  } catch (error) {
    console.error("❌ [WOMPI-WEBHOOK] Error:", error);
    return res.status(500).json({ error: error.message });
  }
};



