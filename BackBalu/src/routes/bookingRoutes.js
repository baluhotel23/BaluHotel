const express = require('express');
const router = express.Router();
const pdf = require('pdfkit')
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
    downloadBookingPdf,
    getOccupancyReport,
    getRevenueReport,
    getBookingByToken
} = require('../controllers/bookingController');

// Rutas públicas (no requieren autenticación)
router.get('/availability', checkAvailability);
router.get('/room-types', getRoomTypes);
router.post('/create', createBooking);
router.get('/status/:trackingToken', getBookingByToken); 
router.get('/pdf/:trackingToken', downloadBookingPdf);

// Middleware de autenticación para todas las rutas siguientes


router.use(verifyToken);

router.get('/user/:sdocno', getUserBookings);
router.get('/:bookingId', getBookingById);
router.post('/:bookingId/cancel', cancelBooking);

// Rutas para clientes y staff
router.post('/', validateBooking, createBooking);
router.get('/user/my-bookings/:sdocno', getUserBookings);
router.get('/:bookingId', getBookingById);

// Middleware de staff para todas las rutas siguientes
router.use(isStaff);

// Rutas de gestión de reservas (solo staff)
router.get('/reservas/all', getAllBookings);
router.put('/:bookingId/check-in', checkIn);
router.put('/:bookingId/check-out', checkOut);
router.post('/:bookingId/extra-charges', validateExtraCharge, addExtraCharges);
router.get('/:bookingId/bill', generateBill);
router.put('/:bookingId/status', updateBookingStatus);

// Rutas que requieren permisos especiales
router.delete('/:bookingId', 
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