const {
  Room,
  Booking,
  ExtraCharge,
  Bill,
  Service,
  Buyer,
  Payment,
  RegistrationPass, 
  conn, 
} = require("../data");

const { CustomError } = require("../middleware/error");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

// Public endpoints
const checkAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut, roomType } = req.query;

    const where = {};
    if (roomType) where.type = roomType;

    // Get all rooms with their bookings
    const rooms = await Room.findAll({
      where,
      include: [
        {
          model: Booking,
          attributes: ["bookingId", "checkIn", "checkOut", "status"],
          // Remove the where clause to get ALL bookings
          required: false,
        },
        {
          model: Service,
          through: { attributes: [] },
        },
      ],
    });

    // Process rooms to include availability info
    const roomsWithAvailability = rooms.map((room) => {
      // Filter active bookings (not cancelled)
      const activeBookings = room.Bookings.filter(
        (booking) => booking.status !== "cancelled"
      );

      // Check if room is available for requested dates
      const isAvailable = !activeBookings.some((booking) => {
        const bookingStart = new Date(booking.checkIn);
        const bookingEnd = new Date(booking.checkOut);
        const requestStart = new Date(checkIn);
        const requestEnd = new Date(checkOut);

        return (
          (bookingStart <= requestEnd && bookingEnd >= requestStart) ||
          (requestStart <= bookingEnd && requestEnd >= bookingStart)
        );
      });

      // Get all booked dates
      const bookedDates = activeBookings.map((booking) => ({
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        bookingId: booking.bookingId,
      }));

      return {
        roomNumber: room.roomNumber,
        type: room.type,
        price: room.price,
        maxGuests: room.maxGuests,
        description: room.description,
        image_url: room.image_url,
        Services: room.Services,
        isAvailable,
        bookedDates,
        currentBookings: activeBookings.length,
      };
    });

    res.json({
      error: false,
      message: "Disponibilidad consultada exitosamente",
      data: roomsWithAvailability,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: "Error al consultar disponibilidad",
      details: error.message,
    });
  }
};

const getRoomTypes = async (req, res) => {
  const types = await Room.findAll({
    attributes: ["type", "price", "maxGuests"],
    group: ["type", "price", "maxGuests"],
  });

  res.json({
    error: false,
    data: types,
  });
};

// Client and staff endpoints
const createBooking = async (req, res, next) => {
  const t = await conn.transaction();  // <--- INICIAR TRANSACCIÓN
  console.log('[BookingController] === Iniciando Proceso: createBooking ===');
  console.log('[BookingController] [Paso 1/X] Timestamp de inicio:', new Date().toISOString());
  console.log('[BookingController] [Paso 1/X] Request Body recibido:', JSON.stringify(req.body, null, 2));

  try {
    const {
      roomNumber,
      checkIn,
      checkOut,
      guestCount,
      totalAmount,
      guestId,
      paymentMethodLocal, // Para pagos locales hechos al momento de la reserva
      paymentAmountLocal, // Monto del pago local si se hace al momento
      paymentTypeLocal,   // 'full' o 'partial' para el pago local
      notes,
      adults,
      children,
    } = req.body;

    const pointOfSale = req.body.pointOfSale || "Online";
    console.log(`[BookingController] [Paso 2/X] Punto de Venta: ${pointOfSale}`);

    const bookingGuestId = guestId;
    console.log(`[BookingController] [Paso 3/X] Guest ID para la reserva: ${bookingGuestId}`);

    if (!bookingGuestId) {
      console.error('[BookingController] [ERROR Validación] Falta guestId.');
      throw new CustomError("Se requiere el ID del huésped para la reserva.", 400);
    }

    const room = await Room.findByPk(roomNumber, { transaction: t }); // <--- USAR TRANSACCIÓN
    if (!room) {
      console.error(`[BookingController] [ERROR DB] Habitación no encontrada: ${roomNumber}`);
      throw new CustomError("Habitación no encontrada", 404);
    }
    console.log(`[BookingController] [Paso 4/X] Habitación encontrada: ${room.roomNumber}`);

    console.log(`[BookingController] [Paso 5/X] Verificando disponibilidad para habitación ${roomNumber} entre ${checkIn} y ${checkOut}`);
    const existingBooking = await Booking.findOne({
      where: {
        roomNumber,
        status: { [Op.notIn]: ["cancelled", "no_show_cancelled"] },
        [Op.or]: [
          { checkIn: { [Op.lt]: checkOut }, checkOut: { [Op.gt]: checkIn } },
        ],
      },
      transaction: t, // <--- USAR TRANSACCIÓN
    });

    if (existingBooking) {
      console.error(`[BookingController] [ERROR Lógica] Habitación ${roomNumber} no disponible. Reserva conflictiva: ${existingBooking.bookingId}`);
      throw new CustomError("Habitación no disponible para las fechas seleccionadas", 400);
    }
    console.log(`[BookingController] [Paso 5/X] Habitación ${roomNumber} disponible.`);

    // const nights = calculateNights(checkIn, checkOut); // Si lo necesitas para calcular totalAmount aquí

    let initialStatus = "pending_payment"; // Default para online o local sin pago inmediato
    if (pointOfSale === "Local") {
      // Si es local y se proveen detalles de pago, podría ser 'confirmed'
      // Esto se ajustará más adelante si se registra un pago local.
      initialStatus = req.body.status || "confirmed"; // O 'pending_payment' si no se paga al instante
    }
    console.log(`[BookingController] [Paso 6/X] Estado inicial determinado para la reserva: ${initialStatus}`);

    const bookingData = {
      guestId: bookingGuestId,
      roomNumber,
      checkIn,
      checkOut,
      totalAmount, // Asegúrate que este sea el monto correcto de la reserva
      guestCount,
      status: initialStatus,
      pointOfSale,
      adults,
      children,
      notes,
    };
    console.log('[BookingController] [Paso 7/X] Datos para crear Booking:', JSON.stringify(bookingData, null, 2));
    const newBooking = await Booking.create(bookingData, { transaction: t }); // <--- USAR TRANSACCIÓN
    console.log('[BookingController] [Paso 7/X] Booking creado en DB (dentro de transacción):', JSON.stringify(newBooking.toJSON(), null, 2));

    let trackingLink = null;
    let paymentRecord = null;

    if (pointOfSale === "Online") {
      console.log('[BookingController] [Paso 8/X - Online] Creando tracking token y pago pendiente.');
      const token = jwt.sign(
        { bookingId: newBooking.bookingId },
        process.env.BOOKING_SECRET,
        { expiresIn: "7d" }
      );
      await newBooking.update({ trackingToken: token }, { transaction: t }); // <--- USAR TRANSACCIÓN
      trackingLink = `${process.env.FRONT_URL}/booking-status/${token}`;
      console.log(`[BookingController] [Paso 8/X - Online] Tracking token generado: ${token}`);

      const onlinePaymentData = {
        bookingId: newBooking.bookingId,
        amount: newBooking.totalAmount, // Usar el totalAmount de la reserva
        paymentMethod: req.body.paymentMethodOnline || "wompi_checkout", // Ej: 'wompi_checkout'
        paymentType: "online",
        paymentStatus: "pending", // Siempre pendiente hasta confirmación del gateway
        paymentDate: new Date(),
        // processedBy no aplica para pagos online iniciados por el cliente
      };
      console.log('[BookingController] [Paso 8/X - Online] Datos para crear Payment (online pendiente):', JSON.stringify(onlinePaymentData, null, 2));
      paymentRecord = await Payment.create(onlinePaymentData, { transaction: t }); // <--- USAR TRANSACCIÓN
      console.log('[BookingController] [Paso 8/X - Online] Payment (online pendiente) creado en DB:', JSON.stringify(paymentRecord.toJSON(), null, 2));
      
      // El estado de la reserva online sigue siendo 'pending_payment' hasta que el webhook confirme.
      if (newBooking.status !== 'pending_payment') {
        newBooking.status = 'pending_payment'; // Asegurar estado correcto para online
        await newBooking.save({ transaction: t });
        console.log('[BookingController] [Paso 8/X - Online] Estado de Booking actualizado a pending_payment.');
      }

    } else if (pointOfSale === "Local") {
      console.log('[BookingController] [Paso 8/X - Local] Procesando posible pago local inmediato.');
      // Para reservas locales, el pago puede registrarse aquí si se proporcionan los detalles,
      // o más tarde a través del endpoint /admin/paymentLocal.
      if (paymentMethodLocal && paymentAmountLocal > 0) {
        const localPaymentAmountFloat = parseFloat(paymentAmountLocal);
        const localPaymentData = {
          bookingId: newBooking.bookingId,
          amount: localPaymentAmountFloat,
          paymentMethod: paymentMethodLocal,
          paymentType: paymentTypeLocal || (localPaymentAmountFloat >= parseFloat(newBooking.totalAmount) ? 'full' : 'partial'),
          paymentStatus: 'completed', // Pagos locales en recepción se asumen completados
          paymentDate: new Date(),
          processedBy: req.user?.n_document, // Empleado que registra
        };
        console.log('[BookingController] [Paso 8/X - Local] Datos para crear Payment (local inmediato):', JSON.stringify(localPaymentData, null, 2));
        paymentRecord = await Payment.create(localPaymentData, { transaction: t }); // <--- USAR TRANSACCIÓN
        console.log('[BookingController] [Paso 8/X - Local] Payment (local inmediato) creado en DB:', JSON.stringify(paymentRecord.toJSON(), null, 2));

        // Si se hizo un pago local, la reserva debe estar 'confirmed'.
        if (newBooking.status !== "confirmed") {
          newBooking.status = "confirmed";
          await newBooking.save({ transaction: t }); // <--- USAR TRANSACCIÓN
          console.log('[BookingController] [Paso 8/X - Local] Estado de Booking actualizado a confirmed debido a pago local.');
        }
      } else {
        // Si es local pero no se pagan en el momento de crear la reserva,
        // el estado podría ser 'confirmed' (si se confía en el cliente) o 'pending_payment'.
        // Por ahora, si se envió 'confirmed' como status inicial y no hay pago, se mantiene.
        // Si se envió 'pending_payment' o nada, y no hay pago, se mantiene/establece 'pending_payment'.
        if (newBooking.status !== 'confirmed') { // Si no se pagó y no es 'confirmed'
             newBooking.status = 'pending_payment'; // Dejarlo como pendiente de pago
             await newBooking.save({ transaction: t });
             console.log('[BookingController] [Paso 8/X - Local] Reserva local sin pago inmediato, estado establecido a pending_payment.');
        } else {
            console.log(`[BookingController] [Paso 8/X - Local] Reserva local sin pago inmediato, estado se mantiene como: ${newBooking.status}`);
        }
      }
    }

    await t.commit(); // <--- CONFIRMAR LA TRANSACCIÓN (HACER TODO PERMANENTE)
    console.log('[BookingController] [Paso 9/X] Transacción completada (commit).');
    console.log('[BookingController] === Proceso createBooking Finalizado Exitosamente ===');

    res.status(201).json({
      error: false,
      message: `Reserva ${pointOfSale} creada exitosamente`,
      data: {
        booking: newBooking.toJSON(), // Enviar como JSON plano
        trackingLink,
        payment: paymentRecord ? paymentRecord.toJSON() : null,
      },
    });

  } catch (error) {
    if (t) await t.rollback(); // <--- REVERTIR LA TRANSACCIÓN SI HAY ERROR
    console.error("[BookingController] [ERROR GLOBAL] Error capturado en createBooking. Nombre:", error.name, "Mensaje:", error.message);
    if (error.original) {
        console.error("[BookingController] [ERROR GLOBAL] Error Original (Sequelize/DB):", JSON.stringify(error.original, null, 2));
    }
    // console.error("[BookingController] [ERROR GLOBAL] Stack:", error.stack); // Útil en desarrollo

    // Pasar el error al middleware de manejo de errores de Express
    // Asegúrate de que tu middleware de errores esté configurado en app.js
    // Si no es un CustomError, créalo para que el middleware lo maneje consistentemente.
    if (!(error instanceof CustomError)) {
        const statusCode = error.statusCode || 500;
        // Intenta ser más específico si es un error de Sequelize
        let message = "Error interno al crear la reserva.";
        if (error.name === 'SequelizeValidationError' && error.errors && error.errors.length > 0) {
            message = error.errors.map(e => e.message).join(', ');
        } else if (error.message) {
            message = error.message;
        }
        next(new CustomError(message, statusCode, error.name));
    } else {
        next(error); // Pasar el CustomError existente
    }
  }
};

const updateOnlinePayment = async (req, res, next) => {
  try {
    console.log("updateOnlinePayment - req.body:", req.body);
    const {
      bookingId,
      amount,
      transactionId,
      paymentReference,
      paymentMethod,
    } = req.body;

    // Buscar la reserva
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    // Verificar que la reserva sea de pago online
    if (booking.pointOfSale !== "Online") {
      throw new CustomError("Esta reserva no es de pago online", 400);
    }

    // Buscar el pago pendiente de tipo online asociado a la reserva
    let payment = await Payment.findOne({
      where: { bookingId, paymentType: "online", paymentStatus: "pending" },
      order: [["createdAt", "DESC"]],
    });

    // Si no existe, crearlo (opción 2)
    if (!payment) {
      payment = await Payment.create({
        bookingId,
        amount,
        paymentMethod,
        paymentType: "online",
        paymentStatus: "pending", // se actualizará a 'completed' a continuación
        paymentDate: new Date(),
      });
    }

    // Actualizar el registro de pago
    payment.amount = amount; // Monto confirmado por Wompi
    payment.paymentMethod = paymentMethod; // Método específico usado en Wompi
    payment.transactionId = transactionId;
    payment.paymentReference = paymentReference;
    payment.paymentStatus = "completed";
    await payment.save();

    // Actualizar el estado de la reserva según el monto pagado
    const totalAmount = Number(booking.totalAmount);
    const paidAmount = Number(amount);

    if (paidAmount < totalAmount) {
      booking.status = "advanced";
    } else {
      booking.status = "confirmed";
    }
    await booking.save();

    res.status(200).json({
      error: false,
      message: "Pago online registrado y reserva actualizada exitosamente",
      data: payment,
    });
  } catch (error) {
    console.error("Error al actualizar el pago online:", error);
    next(error);
  }
};

const downloadBookingPdf = async (req, res, next) => {
  try {
    const { trackingToken } = req.params;

    // Verificar y decodificar el token
    const decoded = jwt.verify(trackingToken, process.env.BOOKING_SECRET);
    const bookingId = decoded.bookingId;

    const booking = await Booking.findOne({
      where: { bookingId },
      include: [
        { model: Room },
        // incluir demás relaciones si es necesario
      ],
    });

    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    // Generar PDF (puedes personalizar la lógica)
    const doc = new PDFDocument();
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          "attachment;filename=booking_" + bookingId + ".pdf",
        "Content-Length": pdfData.length,
      });
      res.end(pdfData);
    });

    // Escribe contenido del PDF
    doc.fontSize(18).text("Detalle de Reserva", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Booking ID: ${booking.bookingId}`);
    doc.text(`Estado: ${booking.status}`);
    doc.text(`Fecha de check-in: ${booking.checkIn}`);
    doc.text(`Fecha de check-out: ${booking.checkOut}`);
    doc.text(`Monto Total: ${booking.totalAmount}`);
    // Agrega más detalles según sea necesario

    // Incluir enlace de seguimiento en el PDF
    doc.moveDown();
    doc.text(
      `Revisa el estado de tu reserva aquí: ${process.env.FRONT_URL}/booking-status/${trackingToken}`
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};
const getBookingByToken = async (req, res, next) => {
  try {
    const { trackingToken } = req.params;

    // Verify and decode token
    const decoded = jwt.verify(trackingToken, process.env.BOOKING_SECRET);
    const bookingId = decoded.bookingId;

    const booking = await Booking.findOne({
      where: { bookingId },
      include: [
        { model: Room },
        // Include other relations if needed
      ],
    });

    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    res.json({
      error: false,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    // Se utiliza req.params.sdocno si está presente, sino se toma de req.buyer.sdocno
    const userId = req.params.sdocno || req.buyer?.sdocno;
    if (!userId) {
      return res.status(400).json({
        error: true,
        message: "Identificador de usuario no encontrado en el token",
      });
    }
    const bookings = await Booking.findAll({
      where: { guestId: userId },
      include: [{ model: Room }],
    });
    res.json({
      error: false,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res) => {
  const { bookingId } = req.params;

  const booking = await Booking.findOne({
    where: { bookingId },
  include: [
    { model: Room },
    { model: ExtraCharge },
    { model: Bill },
    { model: Buyer, as: "guest", attributes: ["sdocno", "scostumername"] },
    { model: Payment },
    { model: RegistrationPass, as: "registrationPasses" }, // <-- Usa el alias aquí
  ],
});

  if (!booking) {
    throw new CustomError("Reserva no encontrada", 404);
  }
  res.json({
    error: false,
    data: booking,
  });
};

// Staff only endpoints
const getAllBookings = async (req, res) => {
  const { status, roomStatus, fromDate, toDate } = req.query;

  const where = {};
  if (status) where.status = status;
  if (fromDate && toDate) {
    where.checkIn = {
      [Op.between]: [fromDate, toDate],
    };
  }

  // Prepara el include de Room con filtro dinámico
  const roomInclude = { model: Room };
  if (roomStatus) {
    roomInclude.where = { status: roomStatus };
  }

  const bookings = await Booking.findAll({
    where,
    include: [
      roomInclude,
      { model: Buyer, as: "guest", attributes: ["sdocno"] },
      { model: Payment },
    ],
    order: [["checkIn", "ASC"]],
  });

  res.json({
    error: false,
    data: bookings,
  });
};

const checkIn = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    // Comparación insensible a mayúsculas
    const currentStatus = booking.status.toLowerCase();

    if (currentStatus !== "pending") {
      let errorMessage = "Estado de reserva inválido para check-in";
      if (currentStatus === "cancelled") {
        errorMessage =
          "Esta reserva fue cancelada y no se puede realizar el check-in";
      } else {
        errorMessage = `No se puede realizar el check-in porque el estado de la reserva es "${booking.status}"`;
      }
      throw new CustomError(errorMessage, 400);
    }

    await booking.update({
      status: "checked-in",
      checkInTime: new Date(),
      checkedInBy: req.buyer.sdocno,
    });

    res.json({
      error: false,
      message: "Check-in realizado exitosamente",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: ExtraCharge }],
    });

    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    const currentStatus = booking.status.toLowerCase();
    if (currentStatus !== "checked-in") {
      let errorMessage = "Estado de reserva inválido para check-out";
      if (currentStatus === "pending") {
        errorMessage = "La reserva aún no ha realizado el check-in";
      } else if (currentStatus === "cancelled") {
        errorMessage =
          "La reserva fue cancelada y no se puede proceder al check-out";
      } else if (currentStatus === "completed") {
        errorMessage = "El check-out ya fue realizado";
      }
      throw new CustomError(errorMessage, 400);
    }

    // Suponiendo que calculateTotalAmount es una función que calcula el total a pagar
    const bill = await Bill.create({
      bookingId: bookingId,
      totalAmount: calculateTotalAmount(booking),
      generatedBy: req.buyer.sdocno,
    });

    await booking.update({
      status: "completed",
      checkOutTime: new Date(),
      checkedOutBy: req.buyer.sdocno,
    });

    res.json({
      error: false,
      message: "Check-out realizado exitosamente",
      data: { booking, bill },
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const calculateTotalAmount = (booking) => {
  const roomCharge = calculateRoomCharge(booking);
  const extraCharges = booking.ExtraCharges.reduce(
    (total, charge) => total + charge.amount,
    0
  );
  return roomCharge + extraCharges;
};

const addExtraCharges = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { price, quantity, description } = req.body;

    // Buscar la reserva usando el bookingId de los parámetros
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    // Solo se permiten cargos si el estado de la reserva es "checked-in"
    if (booking.status.toLowerCase() !== "checked-in") {
      throw new CustomError(
        "Solo se pueden agregar cargos a reservas con check-in",
        400
      );
    }

    // Crear el cargo extra
    const extraCharge = await ExtraCharge.create({
      bookingId, // bookingId proveniente de req.params
      description,
      price,
      quantity,
      amount: price * quantity,
      createdBy: req.buyer.sdocno,
    });

    res.status(201).json({
      error: false,
      message: "Cargo extra agregado exitosamente",
      data: extraCharge,
    });
  } catch (error) {
    next(error);
  }
};

const generateBill = async (req, res) => {
  const { bookingId } = req.params;

  const booking = await Booking.findByPk(bookingId, {
    include: [
      { model: Room },
      { model: ExtraCharge },
      { model: Buyer, attributes: ["name", "email", "sdocno"] },
    ],
  });

  if (!booking) {
    throw new CustomError("Reserva no encontrada", 404);
  }

  const totalAmount = calculateTotalAmount(booking);
  const bill = await Bill.create({
    bookingId: bookingId,
    totalAmount,
    generatedBy: req.buyer.sdocno,
    details: {
      roomCharge: calculateRoomCharge(booking),
      extraCharges: booking.ExtraCharges,
      nights: calculateNights(booking.checkIn, booking.checkOut),
      roomDetails: booking.Room,
      guestDetails: booking.buyer,
    },
  });

  res.json({
    error: false,
    message: "Factura generada exitosamente",
    data: bill,
  });
};

const updateBookingStatus = async (req, res) => {
  const { bookingId } = req.params;
  const { status, reason } = req.body;

  const validStatuses = [
    "pending",
    "confirmed",
    "cancelled",
    "checked-in",
    "completed",
  ];
  
  if (!validStatuses.includes(status)) {
    throw new CustomError("Estado de reserva inválido", 400);
  }

  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new CustomError("Reserva no encontrada", 404);
  }

  // Solución: Manejar caso donde req.buyer o req.user puede no existir
  const updatedBy = req.user?.n_document || req.buyer?.sdocno || "system";

  await booking.update({
    status,
    statusReason: reason,
    statusUpdatedBy: updatedBy,  // Usar el valor seguro
    statusUpdatedAt: new Date(),
  });

  res.json({
    error: false,
    message: "Estado de reserva actualizado exitosamente",
    data: booking,
  });
};

const cancelBooking = async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new CustomError("Reserva no encontrada", 404);
  }

  if (["checked-in", "completed"].includes(booking.status)) {
    throw new CustomError(
      "No se puede cancelar una reserva con check-in o completada",
      400
    );
  }

  await booking.update({
    status: "cancelled",
    statusReason: reason,
    cancelledBy: req.buyer.sdocno,
    cancelledAt: new Date(),
  });

  res.json({
    error: false,
    message: "Reserva cancelada exitosamente",
    data: booking,
  });
};

const getOccupancyReport = async (req, res) => {
  const { startDate, endDate } = req.query;

  const bookings = await Booking.findAll({
    where: {
      checkIn: { [Op.between]: [startDate, endDate] },
      status: { [Op.in]: ["checked-in", "completed"] },
    },
    include: [{ model: Room }],
  });

  const totalRooms = await Room.count();
  const occupiedRoomDays = calculateOccupiedRoomDays(bookings);
  const totalDays = Math.ceil(
    (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
  );
  const occupancyRate = (occupiedRoomDays / (totalRooms * totalDays)) * 100;

  res.json({
    error: false,
    data: {
      occupancyRate,
      totalRooms,
      occupiedRoomDays,
      periodDays: totalDays,
      bookings: bookings.length,
    },
  });
};

const getRevenueReport = async (req, res) => {
  const { startDate, endDate } = req.query;

  const bookings = await Booking.findAll({
    where: {
      checkOut: { [Op.between]: [startDate, endDate] },
      status: "completed",
    },
    include: [{ model: Room }, { model: ExtraCharge }, { model: Bill }],
  });

  const revenue = {
    total: 0,
    roomRevenue: 0,
    extraChargesRevenue: 0,
    bookingsCount: bookings.length,
    averagePerBooking: 0,
  };

  bookings.forEach((booking) => {
    const roomCharge = calculateRoomCharge(booking);
    const extraCharges = booking.ExtraCharges.reduce(
      (total, charge) => total + charge.amount,
      0
    );

    revenue.roomRevenue += roomCharge;
    revenue.extraChargesRevenue += extraCharges;
    revenue.total += roomCharge + extraCharges;
  });

  revenue.averagePerBooking = revenue.bookingsCount
    ? revenue.total / revenue.bookingsCount
    : 0;

  res.json({
    error: false,
    data: revenue,
  });
};

// Helper functions
const calculateRoomCharge = (booking) => {
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  return nights * booking.Room.price;
};

const calculateNights = (checkIn, checkOut) => {
  return Math.ceil(
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
  );
};

const calculateOccupiedRoomDays = (bookings) => {
  return bookings.reduce((total, booking) => {
    const nights = calculateNights(booking.checkIn, booking.checkOut);
    return total + nights;
  }, 0);
};

module.exports = {
  checkAvailability,
  getRoomTypes,
  createBooking,
  getUserBookings,
  getBookingById,
  getAllBookings,
  checkIn,
  checkOut,
  calculateTotalAmount,
  addExtraCharges,
  downloadBookingPdf,
  generateBill,
  updateBookingStatus,
  cancelBooking,
  getOccupancyReport,
  getRevenueReport,
  getBookingByToken,
  updateOnlinePayment,
};
