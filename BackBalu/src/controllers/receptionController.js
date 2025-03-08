const { Booking, Room, Guest, Payment, ExtraCharge, Service } = require('../data');
const { CustomError } = require('../middleware/error');
const { Op } = require('sequelize');

// Dashboard Controllers
const getDashboard = async (req, res) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
        todayCheckIns,
        todayCheckOuts,
        occupiedRooms,
        pendingPayments
    ] = await Promise.all([
        Booking.count({ where: { checkIn: today, status: 'pending' } }),
        Booking.count({ where: { checkOut: today, status: 'checked-in' } }),
        Room.count({ where: { status: 'occupied' } }),
        Payment.count({ where: { status: 'pending' } })
    ]);

    res.json({
        error: false,
        data: {
            todayCheckIns,
            todayCheckOuts,
            occupiedRooms,
            pendingPayments
        }
    });
};

const getTodayCheckIns = async (req, res) => {
    const today = new Date();
    const bookings = await Booking.findAll({
        where: {
            checkIn: {
                [Op.gte]: today,
                [Op.lt]: new Date(today.setDate(today.getDate() + 1))
            },
            status: 'pending'
        },
        include: [
            { model: Guest },
            { model: Room }
        ]
    });

    res.json({
        error: false,
        data: bookings
    });
};

const getTodayCheckOuts = async (req, res) => {
    const today = new Date();
    const bookings = await Booking.findAll({
        where: {
            checkOut: {
                [Op.gte]: today,
                [Op.lt]: new Date(today.setDate(today.getDate() + 1))
            },
            status: 'checked-in'
        },
        include: [
            { model: Guest },
            { model: Room },
            { model: ExtraCharge }
        ]
    });

    res.json({
        error: false,
        data: bookings
    });
};

// Check-in/Check-out Controllers
const processCheckIn = async (req, res) => {
    const { bookingId } = req.params;
    const { guestDetails } = req.body;

    const booking = await Booking.findByPk(bookingId, {
        include: [{ model: Room }]
    });

    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    if (booking.status !== 'pending') {
        throw new CustomError('La reserva no está pendiente de check-in', 400);
    }

    await Promise.all([
        booking.update({
            status: 'checked-in',
            checkInTime: new Date(),
            checkedInBy: req.user.id
        }),
        booking.Room.update({ status: 'occupied' }),
        Guest.update(guestDetails, { where: { id: booking.guestId } })
    ]);

    res.json({
        error: false,
        message: 'Check-in procesado exitosamente',
        data: booking
    });
};

const processCheckOut = async (req, res) => {
    const { bookingId } = req.params;
    const booking = await Booking.findByPk(bookingId, {
        include: [
            { model: Room },
            { model: ExtraCharge },
            { model: Payment }
        ]
    });

    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    if (booking.status !== 'checked-in') {
        throw new CustomError('La reserva no está en check-in', 400);
    }

    // Verificar pagos pendientes
    const pendingAmount = calculatePendingAmount(booking);
    if (pendingAmount > 0) {
        throw new CustomError('Hay pagos pendientes', 400, 'PENDING_PAYMENT', {
            pendingAmount
        });
    }

    await Promise.all([
        booking.update({
            status: 'completed',
            checkOutTime: new Date(),
            checkedOutBy: req.user.id
        }),
        booking.Room.update({ status: 'dirty' })
    ]);

    res.json({
        error: false,
        message: 'Check-out procesado exitosamente',
        data: booking
    });
};

// Room Management Controllers
const getRoomsStatus = async (req, res) => {
    const rooms = await Room.findAll({
        attributes: ['id', 'number', 'type', 'status', 'floor'],
        order: [['floor', 'ASC'], ['number', 'ASC']]
    });

    res.json({
        error: false,
        data: rooms
    });
};

const markRoomAsClean = async (req, res) => {
    const { roomId } = req.params;
    const room = await Room.findByPk(roomId);

    if (!room) {
        throw new CustomError('Habitación no encontrada', 404);
    }

    await room.update({
        status: 'available',
        lastCleaned: new Date(),
        cleanedBy: req.user.id
    });

    res.json({
        error: false,
        message: 'Habitación marcada como limpia',
        data: room
    });
};

// Helper Functions
const calculatePendingAmount = (booking) => {
    const totalCharges = booking.ExtraCharges.reduce(
        (sum, charge) => sum + charge.amount, 
        booking.baseRate
    );
    
    const totalPaid = booking.Payments.reduce(
        (sum, payment) => sum + payment.amount, 
        0
    );

    return totalCharges - totalPaid;
};

const getPendingArrivals = async (req, res) => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const arrivals = await Booking.findAll({
        where: {
            checkIn: {
                [Op.between]: [today, nextWeek]
            },
            status: 'pending'
        },
        include: [
            { model: Guest },
            { model: Room }
        ],
        order: [['checkIn', 'ASC']]
    });

    res.json({
        error: false,
        data: arrivals
    });
};

const getPendingDepartures = async (req, res) => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const departures = await Booking.findAll({
        where: {
            checkOut: {
                [Op.between]: [today, nextWeek]
            },
            status: 'checked-in'
        },
        include: [
            { model: Guest },
            { model: Room },
            { model: ExtraCharge }
        ],
        order: [['checkOut', 'ASC']]
    });

    res.json({
        error: false,
        data: departures
    });
};

// Room Management Additional Controllers
const markRoomForMaintenance = async (req, res) => {
    const { roomId } = req.params;
    const { issue, expectedDuration } = req.body;

    const room = await Room.findByPk(roomId);
    if (!room) {
        throw new CustomError('Habitación no encontrada', 404);
    }

    await room.update({
        status: 'maintenance',
        maintenanceIssue: issue,
        maintenanceStart: new Date(),
        expectedMaintenanceEnd: expectedDuration ? 
            new Date(Date.now() + expectedDuration * 60 * 60 * 1000) : null,
        reportedBy: req.user.id
    });

    res.json({
        error: false,
        message: 'Habitación marcada para mantenimiento',
        data: room
    });
};

const getOccupiedRooms = async (req, res) => {
    const rooms = await Room.findAll({
        where: { status: 'occupied' },
        include: [{
            model: Booking,
            where: { status: 'checked-in' },
            include: [{ model: Guest }]
        }]
    });

    res.json({
        error: false,
        data: rooms
    });
};

// Guest Management Controllers
const getCurrentGuests = async (req, res) => {
    const guests = await Guest.findAll({
        include: [{
            model: Booking,
            where: { status: 'checked-in' },
            include: [{ model: Room }]
        }]
    });

    res.json({
        error: false,
        data: guests
    });
};

const getGuestDetails = async (req, res) => {
    const { id } = req.params;
    const guest = await Guest.findByPk(id, {
        include: [{
            model: Booking,
            include: [
                { model: Room },
                { model: ExtraCharge },
                { model: Payment }
            ]
        }]
    });

    if (!guest) {
        throw new CustomError('Huésped no encontrado', 404);
    }

    res.json({
        error: false,
        data: guest
    });
};

const updateGuestInfo = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const guest = await Guest.findByPk(id);
    if (!guest) {
        throw new CustomError('Huésped no encontrado', 404);
    }

    await guest.update(updateData);

    res.json({
        error: false,
        message: 'Información del huésped actualizada',
        data: guest
    });
};

// Extra Charges and Services Controllers
const addExtraCharge = async (req, res) => {
    const { bookingId } = req.params;
    const { description, amount } = req.body;

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    if (booking.status !== 'checked-in') {
        throw new CustomError('Solo se pueden agregar cargos a reservas activas', 400);
    }

    const charge = await ExtraCharge.create({
        bookingId,
        description,
        amount,
        createdBy: req.user.id
    });

    res.status(201).json({
        error: false,
        message: 'Cargo extra agregado',
        data: charge
    });
};

const getBookingCharges = async (req, res) => {
    const { bookingId } = req.params;
    
    const charges = await ExtraCharge.findAll({
        where: { bookingId },
        order: [['createdAt', 'DESC']]
    });

    res.json({
        error: false,
        data: charges
    });
};

const requestService = async (req, res) => {
    const { bookingId } = req.params;
    const { serviceType, notes } = req.body;

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    const service = await Service.create({
        bookingId,
        serviceType,
        notes,
        status: 'pending',
        requestedBy: req.user.id
    });

    res.status(201).json({
        error: false,
        message: 'Servicio solicitado',
        data: service
    });
};

// Payment Management Controllers
const getPaymentDetails = async (req, res) => {
    const { bookingId } = req.params;
    
    const booking = await Booking.findByPk(bookingId, {
        include: [
            { model: ExtraCharge },
            { model: Payment }
        ]
    });

    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    const paymentSummary = {
        totalCharges: calculateTotalCharges(booking),
        totalPaid: calculateTotalPaid(booking),
        pendingAmount: calculatePendingAmount(booking),
        payments: booking.Payments,
        charges: booking.ExtraCharges
    };

    res.json({
        error: false,
        data: paymentSummary
    });
};

const processPayment = async (req, res) => {
    const { bookingId } = req.params;
    const { amount, method } = req.body;

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
        throw new CustomError('Reserva no encontrada', 404);
    }

    const payment = await Payment.create({
        bookingId,
        amount,
        method,
        processedBy: req.user.id,
        status: 'completed'
    });

    res.status(201).json({
        error: false,
        message: 'Pago procesado exitosamente',
        data: payment
    });
};

const getDailyPaymentReport = async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const payments = await Payment.findAll({
        where: {
            createdAt: {
                [Op.between]: [today, tomorrow]
            },
            status: 'completed'
        },
        include: [{
            model: Booking,
            include: [{ model: Guest }]
        }]
    });

    const summary = {
        totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
        paymentCount: payments.length,
        byMethod: payments.reduce((acc, payment) => {
            acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
            return acc;
        }, {}),
        payments
    };

    res.json({
        error: false,
        data: summary
    });
};

// Helper Functions
const calculateTotalCharges = (booking) => {
    const extraCharges = booking.ExtraCharges.reduce(
        (sum, charge) => sum + charge.amount, 
        0
    );
    return booking.baseRate + extraCharges;
};

const calculateTotalPaid = (booking) => {
    return booking.Payments.reduce(
        (sum, payment) => sum + payment.amount, 
        0
    );
};

module.exports = {
    getDashboard,
    getTodayCheckIns,
    getTodayCheckOuts,
    processCheckIn,
    processCheckOut,
    getRoomsStatus,
    markRoomAsClean,
    getPendingArrivals,
    getPendingDepartures,
    markRoomForMaintenance,
    getOccupiedRooms,
    getCurrentGuests,
    getGuestDetails,
    updateGuestInfo,
    addExtraCharge,
    getBookingCharges,
    requestService,
    getPaymentDetails,
    processPayment,
    getDailyPaymentReport
};