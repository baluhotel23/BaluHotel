const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { validateBooking } = require('../middleware/validation/validateBooking');

// Rutas públicas
// Búsqueda y visualización de habitaciones
// router.get('/rooms', clientController.getAllRooms);
// router.get('/rooms/:id', clientController.getRoomDetails);
// router.get('/room-types', clientController.getRoomTypes);
// router.get('/availability', clientController.checkAvailability);

// Promociones y ofertas
// router.get('/promotions', clientController.getActivePromotions);
// router.get('/special-offers', clientController.getSpecialOffers);

// Rutas que requieren autenticación
router.use(verifyToken);

// Gestión de reservas
// router.post('/bookings', validateBooking, clientController.createBooking);
// router.get('/my-bookings', clientController.getUserBookings);
// router.get('/bookings/:id', clientController.getBookingDetails);
// router.put('/bookings/:id/cancel', clientController.cancelBooking);

// Perfil de usuario
// router.get('/profile', clientController.getUserProfile);
// router.put('/profile', clientController.updateProfile);
// router.put('/change-password', clientController.changePassword);

// Opiniones y calificaciones
// router.post('/reviews', clientController.createReview);
// router.get('/my-reviews', clientController.getUserReviews);

// Preferencias y configuración
// router.get('/preferences', clientController.getUserPreferences);
// router.put('/preferences', clientController.updatePreferences);

module.exports = router;