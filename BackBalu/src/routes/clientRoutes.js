const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const  validateBooking  = require('../middleware/validation/validateBooking');
const { getAllRooms, getRoomById, getRoomTypes, checkAvailability,getActivePromotions,
  getSpecialOffers  } = require('../controllers/roomController');
const {
    createBooking,
    getUserBookings,
    getBookingDetails,
    cancelBooking,
    getUserProfile,
    updateProfile,
    createReview,
    getUserReviews,
    getUserPreferences,
    updatePreferences
  } = require("../controllers/clientController");

// Rutas públicas
// Búsqueda y visualización de habitaciones
router.get('/rooms', getAllRooms);
router.get('/rooms/:roomNumber', getRoomById);
router.get('/room-types', getRoomTypes);
router.get('/availability', checkAvailability);

// Promociones y ofertas
router.get('/promotions', getActivePromotions);
router.get('/special-offers', getSpecialOffers);

// Rutas que requieren autenticación
router.use(verifyToken);

// Gestión de reservas
router.post('/bookings', validateBooking, createBooking);
router.get('/my-bookings', getUserBookings);
router.get('/bookings/:id', getBookingDetails);
router.put('/bookings/:id/cancel', cancelBooking);

// Perfil de usuario
 router.get('/profile', getUserProfile);
 router.put('/profile', updateProfile);


// Opiniones y calificaciones
 router.post('/reviews', createReview);
 router.get('/my-reviews', getUserReviews);

// Preferencias y configuración
 router.get('/preferences', getUserPreferences);
 router.put('/preferences', updatePreferences);

module.exports = router;