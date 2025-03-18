const { Room, Booking, ExtraCharge, Bill,  Service, Buyer} = require('../data');
const { CustomError } = require('../middleware/error');
const { Op } = require('sequelize');
const jwt = require("jsonwebtoken");
const PDFDocument = require('pdfkit');


// Public endpoints
const checkAvailability = async (req, res) => {
  try {
      const { checkIn, checkOut, roomType } = req.query;
      
      const where = {};
      if (roomType) where.type = roomType;

      // Get all rooms with their bookings
      const rooms = await Room.findAll({
          where,
          include: [{
              model: Booking,
              attributes: ['bookingId', 'checkIn', 'checkOut', 'status'],
              // Remove the where clause to get ALL bookings
              required: false
          },
          {
              model: Service,
              through: { attributes: [] }
          }]
      });

      // Process rooms to include availability info
      const roomsWithAvailability = rooms.map(room => {
          // Filter active bookings (not cancelled)
          const activeBookings = room.Bookings.filter(
              booking => booking.status !== 'cancelled'
          );

          // Check if room is available for requested dates
          const isAvailable = !activeBookings.some(booking => {
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
          const bookedDates = activeBookings.map(booking => ({
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              bookingId: booking.bookingId
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
              currentBookings: activeBookings.length
          };
      });

      res.json({
          error: false,
          message: 'Disponibilidad consultada exitosamente',
          data: roomsWithAvailability
      });
  } catch (error) {
      res.status(500).json({
          error: true,
          message: 'Error al consultar disponibilidad',
          details: error.message
      });
  }
};

const getRoomTypes = async (req, res) => {
    const types = await Room.findAll({
        attributes: ['type', 'price', 'maxGuests'],
        group: ['type', 'price', 'maxGuests']
    });

    res.json({
        error: false,
        data: types
    });
};

// Client and staff endpoints
const createBooking = async (req, res) => {
  const { roomNumber, checkIn, checkOut, guestCount, totalAmount } = req.body;
  // Extraer guestId del token o body
  const guestId = req.buyer?.sdocno || req.body.guestId;

  // Buscar la habitación
  const room = await Room.findByPk(roomNumber);
  if (!room) {
    throw new CustomError('Habitación no encontrada', 404);
  }
  
  // Verificar disponibilidad
  const existingBooking = await Booking.findOne({
    where: {
      roomNumber,
      [Op.or]: [
        { checkIn: { [Op.between]: [checkIn, checkOut] } },
        { checkOut: { [Op.between]: [checkIn, checkOut] } }
      ]
    }
  });
  
  if (existingBooking) {
    throw new CustomError('Habitación no disponible para las fechas seleccionadas', 400);
  }
  
  // Calcular número de noches (puedes usar calculateNights)
  const nights = calculateNights(checkIn, checkOut);
  
  // Crear la reserva
  const booking = await Booking.create({
    guestId,
    roomNumber,
    checkIn,
    checkOut,
    totalAmount,
    guestCount,
    status: 'pending',
  });
  
  // Generar trackingToken usando jwt
  // Asegúrate de definir process.env.BOOKING_SECRET y process.env.FRONT_URL
  const token = jwt.sign({ bookingId: booking.bookingId }, process.env.BOOKING_SECRET, { expiresIn: "7d" });
  
  // Actualizar el registro con el trackingToken
  await booking.update({ trackingToken: token });

  // Retornar un enlace para consultar la reserva en el front
  const trackingLink = `${process.env.FRONT_URL}/booking-status/${token}`;
  
  res.status(201).json({
    error: false,
    message: 'Reserva creada exitosamente',
    data: {
      booking,
      trackingLink,
    }
  });
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
      ]
    });
    
    if (!booking) {
      throw new CustomError('Reserva no encontrada', 404);
    }
    
    // Generar PDF (puedes personalizar la lógica)
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment;filename=booking_'+bookingId+'.pdf',
        'Content-Length': pdfData.length
      });
      res.end(pdfData);
    });
    
    // Escribe contenido del PDF
    doc.fontSize(18).text('Detalle de Reserva', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Booking ID: ${booking.bookingId}`);
    doc.text(`Estado: ${booking.status}`);
    doc.text(`Fecha de check-in: ${booking.checkIn}`);
    doc.text(`Fecha de check-out: ${booking.checkOut}`);
    doc.text(`Monto Total: ${booking.totalAmount}`);
    // Agrega más detalles según sea necesario
    
    // Incluir enlace de seguimiento en el PDF
    doc.moveDown();
    doc.text(`Revisa el estado de tu reserva aquí: ${process.env.FRONT_URL}/booking-status/${trackingToken}`);
    
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
      ]
    });
    
    if (!booking) {
      throw new CustomError('Reserva no encontrada', 404);
    }
    
    res.json({
      error: false,
      data: booking
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
          message: 'Identificador de usuario no encontrado en el token'
        });
      }
      const bookings = await Booking.findAll({
        where: { guestId: userId },
        include: [{ model: Room }]
      });
      res.json({
        error: false,
        data: bookings
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
        // Si necesitas incluir la información del comprador:
        { model: Buyer, as: 'guest', attributes: ['sdocno', 'scostumername'] }
      ]
    });
  
    if (!booking) {
      throw new CustomError('Reserva no encontrada', 404);
    }
    res.json({
      error: false,
      data: booking
    });
  };

// Staff only endpoints
const getAllBookings = async (req, res) => {
    const { status, fromDate, toDate } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (fromDate && toDate) {
        where.checkIn = {
            [Op.between]: [fromDate, toDate]
        };
    }

    const bookings = await Booking.findAll({
        where,
        include: [
          { model: Room },
          { model: Buyer, as: 'guest', attributes: ['sdocno'] }
        ],
        order: [['checkIn', 'ASC']]
      });

    res.json({
        error: false,
        data: bookings
    });
};

const checkIn = async (req, res, next) => {
    try {
      const { bookingId } = req.params;
      const booking = await Booking.findByPk(bookingId);
  
      if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
      }
  
      // Comparación insensible a mayúsculas
      const currentStatus = booking.status.toLowerCase();
  
      if (currentStatus !== 'pending') {
        let errorMessage = 'Estado de reserva inválido para check-in';
        if (currentStatus === 'cancelled') {
          errorMessage = 'Esta reserva fue cancelada y no se puede realizar el check-in';
        } else {
          errorMessage = `No se puede realizar el check-in porque el estado de la reserva es "${booking.status}"`;
        }
        throw new CustomError(errorMessage, 400);
      }
  
      await booking.update({
        status: 'checked-in',
        checkInTime: new Date(),
        checkedInBy: req.buyer.sdocno
      });
  
      res.json({
        error: false,
        message: 'Check-in realizado exitosamente',
        data: booking
      });
    } catch (error) {
      next(error);
    }
  };

const checkOut = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: ExtraCharge }]
    });

    if (!booking) {
      throw new CustomError('Reserva no encontrada', 404);
    }

    const currentStatus = booking.status.toLowerCase();
    if (currentStatus !== 'checked-in') {
      let errorMessage = 'Estado de reserva inválido para check-out';
      if (currentStatus === 'pending') {
        errorMessage = 'La reserva aún no ha realizado el check-in';
      } else if (currentStatus === 'cancelled') {
        errorMessage = 'La reserva fue cancelada y no se puede proceder al check-out';
      } else if (currentStatus === 'completed') {
        errorMessage = 'El check-out ya fue realizado';
      }
      throw new CustomError(errorMessage, 400);
    }

    // Suponiendo que calculateTotalAmount es una función que calcula el total a pagar
    const bill = await Bill.create({
      bookingId: bookingId,
      totalAmount: calculateTotalAmount(booking),
      generatedBy: req.buyer.sdocno
    });

    await booking.update({
      status: 'completed',
      checkOutTime: new Date(),
      checkedOutBy: req.buyer.sdocno
    });

    res.json({
      error: false,
      message: 'Check-out realizado exitosamente',
      data: { booking, bill }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const calculateTotalAmount = (booking) => {
    const roomCharge = calculateRoomCharge(booking);
    const extraCharges = booking.ExtraCharges.reduce((total, charge) => 
        total + charge.amount, 0
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
        throw new CustomError('Reserva no encontrada', 404);
      }
  
      // Solo se permiten cargos si el estado de la reserva es "checked-in"
      if (booking.status.toLowerCase() !== 'checked-in') {
        throw new CustomError('Solo se pueden agregar cargos a reservas con check-in', 400);
      }
  
      // Crear el cargo extra
      const extraCharge = await ExtraCharge.create({
        bookingId, // bookingId proveniente de req.params
        description,
        price,
        quantity,
        amount: price * quantity,
        createdBy: req.buyer.sdocno
      });
  
      res.status(201).json({
        error: false,
        message: 'Cargo extra agregado exitosamente',
        data: extraCharge
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
            { model: Buyer, attributes: ['name', 'email', 'sdocno'] }
        ]
    });

    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
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
            guestDetails: booking.buyer
        }
    });

    res.json({
        error: false,
        message: 'Factura generada exitosamente',
        data: bill
    });
};

const updateBookingStatus = async (req, res) => {
    const { bookingId } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'checked-in', 'completed'];
    if (!validStatuses.includes(status)) {
        throw new CustomError('Estado de reserva inválido', 400);
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    await booking.update({
        status,
        statusReason: reason,
        statusUpdatedBy: req.buyer.sdocno,
        statusUpdatedAt: new Date()
    });

    res.json({
        error: false,
        message: 'Estado de reserva actualizado exitosamente',
        data: booking
    });
};

const cancelBooking = async (req, res) => {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    if (['checked-in', 'completed'].includes(booking.status)) {
        throw new CustomError('No se puede cancelar una reserva con check-in o completada', 400);
    }

    await booking.update({
        status: 'cancelled',
        statusReason: reason,
        cancelledBy: req.buyer.sdocno,
        cancelledAt: new Date()
    });

    res.json({
        error: false,
        message: 'Reserva cancelada exitosamente',
        data: booking
    });
};

const getOccupancyReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const bookings = await Booking.findAll({
        where: {
            checkIn: { [Op.between]: [startDate, endDate] },
            status: { [Op.in]: ['checked-in', 'completed'] }
        },
        include: [{ model: Room }]
    });

    const totalRooms = await Room.count();
    const occupiedRoomDays = calculateOccupiedRoomDays(bookings);
    const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const occupancyRate = (occupiedRoomDays / (totalRooms * totalDays)) * 100;

    res.json({
        error: false,
        data: {
            occupancyRate,
            totalRooms,
            occupiedRoomDays,
            periodDays: totalDays,
            bookings: bookings.length
        }
    });
};

const getRevenueReport = async (req, res) => {
    const { startDate, endDate } = req.query;

    const bookings = await Booking.findAll({
        where: {
            checkOut: { [Op.between]: [startDate, endDate] },
            status: 'completed'
        },
        include: [
            { model: Room },
            { model: ExtraCharge },
            { model: Bill }
        ]
    });

    const revenue = {
        total: 0,
        roomRevenue: 0,
        extraChargesRevenue: 0,
        bookingsCount: bookings.length,
        averagePerBooking: 0
    };

    bookings.forEach(booking => {
        const roomCharge = calculateRoomCharge(booking);
        const extraCharges = booking.ExtraCharges.reduce((total, charge) => 
            total + charge.amount, 0
        );
        
        revenue.roomRevenue += roomCharge;
        revenue.extraChargesRevenue += extraCharges;
        revenue.total += roomCharge + extraCharges;
    });

    revenue.averagePerBooking = revenue.bookingsCount ? 
        revenue.total / revenue.bookingsCount : 0;

    res.json({
        error: false,
        data: revenue
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
    getBookingByToken    
};