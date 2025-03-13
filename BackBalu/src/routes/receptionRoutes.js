const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff } = require('../middleware/byRol');
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
router.post('/checkin/:bookingId', validateCheckIn,   processCheckIn);
router.post('/checkout/:bookingId', validateCheckOut, processCheckOut);
router.get('/pending-arrivals', getPendingArrivals);
router.get('/pending-departures', getPendingDepartures);

// Gestión de habitaciones
router.get('/rooms/status', getRoomsStatus);
router.post('/rooms/:roomId/clean', markRoomAsClean);
router.post('/rooms/:roomId/maintenance', markRoomForMaintenance);
router.get('/rooms/occupied', getOccupiedRooms);

// Gestión de huéspedes
router.get('/guests/current', getCurrentGuests);
router.get('/guests/:id/details', getGuestDetails);
router.put('/guests/:id/update', updateGuestInfo);

// Cargos extras y servicios
router.post('/charges/:bookingId', addExtraCharge);
router.get('/charges/:bookingId', getBookingCharges);
router.post('/services/:bookingId', requestService);

// Gestión de pagos
router.get('/payments/:bookingId', getPaymentDetails);
router.post('/payments/:bookingId', processPayment);
router.get('/payments/daily-report', getDailyPaymentReport);

module.exports = router;