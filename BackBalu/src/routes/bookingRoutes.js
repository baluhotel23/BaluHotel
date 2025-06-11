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
    checkInGuest, // ⭐ CAMBIAR DE checkIn A checkInGuest
    checkOut,
    addExtraCharges,
    generateBill,
    updateBookingStatus,
    cancelBooking,
    downloadBookingPdf,
    getOccupancyReport,
    getRevenueReport,
    getBookingByToken,
    updateOnlinePayment,
    getAllBills,
    getBookingInventoryStatus,
    getInventoryUsageReport
} = require('../controllers/bookingController');

// Rutas públicas (no requieren autenticación)
router.get('/availability', checkAvailability);
router.get('/room-types', getRoomTypes);
router.post('/create', createBooking);
router.get('/status/:trackingToken', getBookingByToken); 
router.get('/pdf/:trackingToken', downloadBookingPdf);
router.put('/online-payment', updateOnlinePayment);

// Middleware de autenticación
router.use(verifyToken);

router.get('/user/:sdocno', getUserBookings);
router.post('/:bookingId/cancel', cancelBooking);

// Rutas para clientes y staff
router.post('/', validateBooking, createBooking);
router.get('/user/my-bookings/:sdocno', getUserBookings);

// Middleware de staff
router.use(isStaff);

// Rutas de gestión de reservas (solo staff)
router.get('/facturas', getAllBills)
router.get('/reservas/all', getAllBookings);
router.get('/:bookingId', getBookingById);

// ⭐ CHECK-IN/CHECK-OUT ACTUALIZADOS
router.put('/:bookingId/check-in', checkInGuest); // ⭐ USAR checkInGuest
router.put('/:bookingId/check-out', checkOut);

// ⭐ NUEVAS RUTAS DE INVENTARIO
router.get('/:bookingId/inventory/status', getBookingInventoryStatus);

router.post('/:bookingId/extra-charges', addExtraCharges);
router.get('/:bookingId/bill', generateBill);
router.put('/:bookingId/status', updateBookingStatus);

// Rutas que requieren permisos especiales
router.delete('/:bookingId', allowRoles(['owner', 'admin']), cancelBooking);

// Rutas de reportes (solo owner y admin)
router.get('/reports/occupancy', allowRoles(['owner', 'admin']), getOccupancyReport);
router.get('/reports/revenue', allowRoles(['owner', 'admin']), getRevenueReport);
router.get('/reports/inventory-usage', allowRoles(['owner', 'admin']), getInventoryUsageReport);

module.exports = router;