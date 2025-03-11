const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const validateBooking = require('../middleware/validation/validateBooking');
const validateExtraCharge = require('../middleware/validation/validateExtraCharge');
const {
    checkAvailability,
    getRoomTypes,
    createBooking,
    getUserBookings,
    getBookingById,
    getAllBookings,
    checkIn,
    checkOut,
    addExtraCharges,
    generateBill,
    updateBookingStatus,
    cancelBooking,
    getOccupancyReport,
    getRevenueReport
} = require('../controllers/bookingController');

// Rutas públicas (no requieren autenticación)
router.get('/availability', checkAvailability);
router.get('/room-types', getRoomTypes);

// Middleware de autenticación para todas las rutas siguientes
router.use(verifyToken);
router.post('/create', createBooking);
router.get('/user', getUserBookings);
router.get('/:id', getBookingById);
router.post('/:id/cancel', cancelBooking);

// Rutas para clientes y staff
router.post('/', validateBooking, createBooking);
router.get('/my-bookings', getUserBookings);
router.get('/:id', getBookingById);

// Middleware de staff para todas las rutas siguientes
router.use(isStaff);

// Rutas de gestión de reservas (solo staff)
router.get('/all', getAllBookings);
router.put('/:id/check-in', checkIn);
router.put('/:id/check-out', checkOut);
router.post('/:id/extra-charges', validateExtraCharge, addExtraCharges);
router.get('/:id/bill', generateBill);
router.put('/:id/status', updateBookingStatus);

// Rutas que requieren permisos especiales
router.delete('/:id', 
    allowRoles(['owner', 'admin']), 
    cancelBooking
);

// Rutas de reportes (solo owner y admin)
router.get('/reports/occupancy', 
    allowRoles(['owner', 'admin']), 
    getOccupancyReport
);
router.get('/reports/revenue', 
    allowRoles(['owner', 'admin']), 
    getRevenueReport
);

module.exports = router;