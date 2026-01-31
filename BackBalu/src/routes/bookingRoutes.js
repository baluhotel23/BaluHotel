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
    addExtraCharge,
    generateBill,
    updateBookingStatus,
    cancelBooking,
    cancelBookingWithRefund, // ⭐ NUEVO: Cancelación con reembolso excepcional
    deleteBookingPermanently,
    getCancellationPolicies,
    validateCancellation,
    downloadBookingPdf,
    getOccupancyReport,
    getRevenueReport,
    getBookingByToken,
    updateOnlinePayment,
    getAllBills,
    getBookingInventoryStatus,
    getInventoryUsageReport,
    updateInventoryStatus,
    updatePassengersStatus,
    getCheckInStatus,
    updateCheckInProgress,
} = require('../controllers/bookingController');

// ═══════════════════════════════════════════════════════════════
// 📋 RUTAS PÚBLICAS (no requieren autenticación)
// ═══════════════════════════════════════════════════════════════
router.get('/availability', checkAvailability);
router.get('/room-types', getRoomTypes);
router.post('/create', createBooking);
router.get('/status/:trackingToken', getBookingByToken); 
router.get('/pdf/:trackingToken', downloadBookingPdf);
router.put('/online-payment', updateOnlinePayment);

// ═══════════════════════════════════════════════════════════════
// 🔐 MIDDLEWARE DE AUTENTICACIÓN (todas las rutas siguientes requieren login)
// ═══════════════════════════════════════════════════════════════
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// 👤 RUTAS DE USUARIOS AUTENTICADOS (clientes)
// ═══════════════════════════════════════════════════════════════
router.get('/user/:sdocno', getUserBookings);
router.get('/user/my-bookings/:sdocno', getUserBookings);

// ⭐ RUTAS DE CANCELACIÓN PARA USUARIOS
// Los usuarios pueden cancelar sus propias reservas
router.get('/:bookingId/cancellation-policies', getCancellationPolicies);
router.post('/:bookingId/validate-cancellation', validateCancellation); // ⭐ AGREGAR ESTA LÍNEA
router.put('/:bookingId/cancel', cancelBooking);
// ═══════════════════════════════════════════════════════════════
// 🏨 MIDDLEWARE DE STAFF (todas las rutas siguientes requieren ser staff)
// ═══════════════════════════════════════════════════════════════
router.use(isStaff);

// ═══════════════════════════════════════════════════════════════
// 📊 RUTAS DE GESTIÓN PARA STAFF
// ═══════════════════════════════════════════════════════════════
router.get('/facturas', getAllBills);
router.get('/reservas/all', getAllBookings);
router.get('/:bookingId', getBookingById);

// ⭐ CHECK-IN/CHECK-OUT
router.put('/:bookingId/check-in', allowRoles(['owner', 'recept', 'receptionist']), checkInGuest);
router.put('/:bookingId/check-out', allowRoles(['owner', 'recept', 'receptionist']), checkOut);
router.get('/:bookingId/checkin-status', getCheckInStatus);
router.put('/:bookingId/checkin-progress', allowRoles(['owner', 'recept', 'receptionist']), updateCheckInProgress);

// ⭐ GESTIÓN DE INVENTARIO
router.get('/:bookingId/inventory/status', getBookingInventoryStatus);
router.put('/:bookingId/inventory-status', allowRoles(['owner', 'recept', 'receptionist']), updateInventoryStatus);
router.put('/:bookingId/passengers-status', allowRoles(['owner', 'recept', 'receptionist']), updatePassengersStatus);

// ⭐ CARGOS ADICIONALES Y FACTURACIÓN
router.post('/:bookingId/extra-charges', allowRoles(['owner', 'recept', 'receptionist']), addExtraCharge);
router.get('/:bookingId/bill', generateBill);

// ⭐ ACTUALIZACIÓN DE ESTADO
router.put('/:bookingId/status', allowRoles(['owner', 'recept', 'receptionist']), updateBookingStatus);

// ═══════════════════════════════════════════════════════════════
// 👑 RUTAS ADMINISTRATIVAS (solo owner y admin)
// ═══════════════════════════════════════════════════════════════

// ⭐ CANCELACIONES ADMINISTRATIVAS
// Solo owner y recepcionistas pueden cancelar reservas (admin solo puede ver)
router.put('/:bookingId/cancel', allowRoles(['owner', 'recept', 'receptionist']), cancelBooking);

// ⭐ CANCELACIÓN CON REEMBOLSO - CASOS EXCEPCIONALES (Solo Owner)
// Esta ruta maneja situaciones de fuerza mayor donde se debe devolver el dinero
router.post('/:bookingId/cancel-with-refund', allowRoles(['owner']), cancelBookingWithRefund);

// ⭐ ELIMINACIÓN PERMANENTE (Solo Owner)
router.delete('/:bookingId/permanent', allowRoles(['owner']), deleteBookingPermanently);

// ⭐ REPORTES
router.get('/reports/occupancy', allowRoles(['owner', 'admin']), getOccupancyReport);
router.get('/reports/revenue', allowRoles(['owner', 'admin']), getRevenueReport);
router.get('/reports/inventory-usage', allowRoles(['owner', 'admin']), getInventoryUsageReport);

module.exports = router;