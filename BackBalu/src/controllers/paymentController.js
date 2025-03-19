const { Booking, Payment } = require('../data');
const { CustomError } = require('../middleware/error');

const registerLocalPayment = async (req, res, next) => {
  try {
    const { bookingId, amount, paymentMethod } = req.body;

    // Validar que el monto del pago sea positivo
    if (amount <= 0) {
      throw new CustomError('El monto del pago debe ser un número positivo', 400);
    }

    // Buscar la reserva
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new CustomError('Reserva no encontrada', 404);
    }

    // Validar que el punto de venta sea "Local"
    if (booking.pointOfSale !== 'Local') {
      throw new CustomError('Esta reserva no puede ser pagada localmente', 400);
    }

    // Validar que el monto del pago no sea mayor al monto restante
    const totalPaid = await Payment.sum('amount', { where: { bookingId } }) || 0; // Manejar el caso en que no hay pagos previos
    const remainingAmount = booking.totalAmount - totalPaid;
    if (amount > remainingAmount) {
      throw new CustomError('El monto del pago excede el monto restante', 400);
    }

    // Crear el registro de pago
    const payment = await Payment.create({
      bookingId,
      amount,
      paymentMethod,
      paymentStatus: 'completed', // El pago local se registra como completado
      paymentType: 'full' // El pago local siempre es completo
    });

    // Actualizar el estado de la reserva si el pago es completo
    if (amount >= remainingAmount) {
      booking.status = 'completed';
      await booking.save();
    }

    res.status(201).json({
      error: false,
      message: 'Pago local registrado exitosamente',
      data: payment
    });
  } catch (error) {
    console.error("Error al registrar el pago local:", error);
    next(error); 
  }
};

module.exports = {
  registerLocalPayment
};