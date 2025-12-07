const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const validateCheckIn = require('../middleware/validation/validateChekIn');
const validateCheckOut = require('../middleware/validation/validateCheckOut');

const { getDashboard,
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
    getDailyPaymentReport} = require('../controllers/receptionController');


// Todas las rutas requieren autenticación y ser staff
router.use(verifyToken);
router.use(isStaff);

// Dashboard de recepción
router.get('/dashboard', getDashboard);
router.get('/today-checkins', getTodayCheckIns);
router.get('/today-checkouts', getTodayCheckOuts);

// Gestión de check-in/check-out
router.post('/checkin/:bookingId', allowRoles(['owner', 'recept', 'receptionist']), validateCheckIn, processCheckIn);
router.post('/checkout/:bookingId', allowRoles(['owner', 'recept', 'receptionist']), validateCheckOut, processCheckOut);
router.get('/pending-arrivals', getPendingArrivals);
router.get('/pending-departures', getPendingDepartures);

// Gestión de habitaciones
router.get('/rooms/status', getRoomsStatus);
router.post('/rooms/:roomId/clean', allowRoles(['owner', 'recept', 'receptionist']), markRoomAsClean);
router.post('/rooms/:roomId/maintenance', allowRoles(['owner', 'recept', 'receptionist']), markRoomForMaintenance);
router.get('/rooms/occupied', getOccupiedRooms);

// Gestión de huéspedes
router.get('/guests/current', getCurrentGuests);
router.get('/guests/:id/details', getGuestDetails);
router.put('/guests/:id/update', allowRoles(['owner', 'recept', 'receptionist']), updateGuestInfo);

// Cargos extras y servicios
router.post('/charges/:bookingId', allowRoles(['owner', 'recept', 'receptionist']), addExtraCharge);
router.get('/charges/:bookingId', allowRoles(['owner', 'recept', 'receptionist', 'admin']), getBookingCharges);
router.post('/services/:bookingId', allowRoles(['owner', 'recept', 'receptionist']), requestService);

// Gestión de pagos
// Ver detalles de pago: se permite ver a admin, owner y recepcionistas
router.get('/payments/:bookingId', allowRoles(['owner', 'admin', 'recept', 'receptionist']), getPaymentDetails);
// Procesar pagos: solo recepcionistas y owner - admin no puede procesar pagos
router.post('/payments/:bookingId', allowRoles(['owner', 'recept', 'receptionist']), processPayment);
router.get('/payments/daily-report', getDailyPaymentReport);

module.exports = router;