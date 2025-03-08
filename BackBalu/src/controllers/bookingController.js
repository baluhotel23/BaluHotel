const { Room, Booking, ExtraCharge, Bill, User } = require('../data');
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
        attributes: ['type', 'price', 'capacity'],
        group: ['type', 'price', 'capacity']
    });

    res.json({
        error: false,
        data: types
    });
};

// Client and staff endpoints
const createBooking = async (req, res) => {
    const { roomId, checkIn, checkOut, guestDetails } = req.body;
    const userId = req.user.id;

    const room = await Room.findByPk(roomId);
    if (!room) {
        throw new CustomError('Habitación no encontrada', 404);
    }

    // Verificar disponibilidad
    const existingBooking = await Booking.findOne({
        where: {
            roomId,
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

    const booking = await Booking.create({
        userId,
        roomId,
        checkIn,
        checkOut,
        guestDetails,
        status: 'pending'
    });

    res.status(201).json({
        error: false,
        message: 'Reserva creada exitosamente',
        data: booking
    });
};

const getUserBookings = async (req, res) => {
    const bookings = await Booking.findAll({
        where: { userId: req.user.id },
        include: [{ model: Room }]
    });

    res.json({
        error: false,
        data: bookings
    });
};

const getBookingById = async (req, res) => {
    const { id } = req.params;

    const booking = await Booking.findOne({
        where: { id },
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
    if (req.user.role === 'client' && booking.userId !== req.user.id) {
        throw new CustomError('No autorizado', 403);
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
            { model: User, attributes: ['id', 'email', 'name'] }
        ],
        order: [['checkIn', 'ASC']]
    });

    res.json({
        error: false,
        data: bookings
    });
};

const checkIn = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findByPk(id);

    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    if (booking.status !== 'pending') {
        throw new CustomError('Estado de reserva inválido para check-in', 400);
    }

    await booking.update({
        status: 'checked-in',
        checkInTime: new Date(),
        checkedInBy: req.user.id
    });

    res.json({
        error: false,
        message: 'Check-in realizado exitosamente',
        data: booking
    });
};

const checkOut = async (req, res) => {
    const { id } = req.params;
    const booking = await Booking.findByPk(id, {
        include: [{ model: ExtraCharge }]
    });

    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    if (booking.status !== 'checked-in') {
        throw new CustomError('Estado de reserva inválido para check-out', 400);
    }

    const bill = await Bill.create({
        bookingId: id,
        totalAmount: calculateTotalAmount(booking),
        generatedBy: req.user.id
    });

    await booking.update({
        status: 'completed',
        checkOutTime: new Date(),
        checkedOutBy: req.user.id
    });

    res.json({
        error: false,
        message: 'Check-out realizado exitosamente',
        data: { booking, bill }
    });
};

// Helper functions
const calculateTotalAmount = (booking) => {
    const roomCharge = calculateRoomCharge(booking);
    const extraCharges = booking.ExtraCharges.reduce((total, charge) => 
        total + charge.amount, 0
    );
    return roomCharge + extraCharges;
};

const addExtraCharges = async (req, res) => {
    const { id } = req.params;
    const { description, amount } = req.body;

    const booking = await Booking.findByPk(id);
    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    if (booking.status !== 'checked-in') {
        throw new CustomError('Solo se pueden agregar cargos a reservas con check-in', 400);
    }

    const extraCharge = await ExtraCharge.create({
        bookingId: id,
        description,
        amount,
        createdBy: req.user.id
    });

    res.status(201).json({
        error: false,
        message: 'Cargo extra agregado exitosamente',
        data: extraCharge
    });
};

const generateBill = async (req, res) => {
    const { id } = req.params;
    
    const booking = await Booking.findByPk(id, {
        include: [
            { model: Room },
            { model: ExtraCharge },
            { model: User, attributes: ['name', 'email', 'document'] }
        ]
    });

    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    const totalAmount = calculateTotalAmount(booking);
    const bill = await Bill.create({
        bookingId: id,
        totalAmount,
        generatedBy: req.user.id,
        details: {
            roomCharge: calculateRoomCharge(booking),
            extraCharges: booking.ExtraCharges,
            nights: calculateNights(booking.checkIn, booking.checkOut),
            roomDetails: booking.Room,
            guestDetails: booking.User
        }
    });

    res.json({
        error: false,
        message: 'Factura generada exitosamente',
        data: bill
    });
};

const updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'checked-in', 'completed'];
    if (!validStatuses.includes(status)) {
        throw new CustomError('Estado de reserva inválido', 400);
    }

    const booking = await Booking.findByPk(id);
    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    await booking.update({
        status,
        statusReason: reason,
        statusUpdatedBy: req.user.id,
        statusUpdatedAt: new Date()
    });

    res.json({
        error: false,
        message: 'Estado de reserva actualizado exitosamente',
        data: booking
    });
};

const cancelBooking = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findByPk(id);
    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    if (['checked-in', 'completed'].includes(booking.status)) {
        throw new CustomError('No se puede cancelar una reserva con check-in o completada', 400);
    }

    await booking.update({
        status: 'cancelled',
        statusReason: reason,
        cancelledBy: req.user.id,
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