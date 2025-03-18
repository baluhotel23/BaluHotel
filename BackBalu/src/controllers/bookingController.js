const { Room, Booking, ExtraCharge, Bill,  Service, Buyer} = require('../data');
const { CustomError } = require('../middleware/error');
const { Op } = require('sequelize');

// Public endpoints
const checkAvailability = async (req, res) => {
    const { checkIn, checkOut, roomType } = req.query;
    
    const where = {};
    if (roomType) where.type = roomType;

    const rooms = await Room.findAll({
        where,
        include: [{
            model: Booking,
            where: {
                [Op.or]: [
                    {
                        checkIn: {
                            [Op.between]: [checkIn, checkOut]
                        }
                    },
                    {
                        checkOut: {
                            [Op.between]: [checkIn, checkOut]
                        }
                    }
                ]
            },
            required: false
        },
        {
          model: Service,
          through: { attributes: [] } // Include services without through table attributes
        }]
    });

    const availableRooms = rooms.filter(room => !room.Bookings.length);

    res.json({
        error: false,
        message: 'Disponibilidad consultada exitosamente',
        data: availableRooms
    });
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
    const { roomNumber, checkIn, checkOut,  guestCount, totalAmount } = req.body;
    // Usamos guestId a partir del usuario autenticado (n_document)
    const guestId = req.buyer?.sdocno || req.body.guestId;
  
    // Buscar la habitación
    const room = await Room.findByPk(roomNumber);
    if (!room) {
      throw new CustomError('Habitación no encontrada', 404);
    }
    
    // Verificar disponibilidad (lógica similar a la que ya tienes)
    const existingBooking = await Booking.findOne({
      where: {
        roomNumber,
        [Op.or]: [
          {
            checkIn: {
              [Op.between]: [checkIn, checkOut]
            }
          },
          {
            checkOut: {
              [Op.between]: [checkIn, checkOut]
            }
          }
        ]
      }
    });
    
    if (existingBooking) {
      throw new CustomError('Habitación no disponible para las fechas seleccionadas', 400);
    }
  
    // Calcular número de noches y totalAmount
    const nights = calculateNights(checkIn, checkOut);
    //const totalAmount = totalbooking * nights; // revisar esta logica
  
    const booking = await Booking.create({
      guestId,
      roomNumber,
      checkIn,
      checkOut,
      totalAmount,
      guestCount,
      status: 'pending',
      
    });
  
    res.status(201).json({
      error: false,
      message: 'Reserva creada exitosamente',
      data: booking
    });
  };

  const getUserBookings = async (req, res, next) => {
    try {
      const guestId = req.guestId;
      if (!guestId) {
        return res.status(400).json({
          error: true,
          message: 'Identificador de usuario no encontrado en el token'
        });
      }
      const bookings = await Booking.findAll({
        where: { guestId },
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
            { model: Bill }
        ]
    });

    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    // Si es cliente, verificar que sea su reserva
    

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
    generateBill,
    updateBookingStatus,
    cancelBooking,
    getOccupancyReport,
    getRevenueReport    
};