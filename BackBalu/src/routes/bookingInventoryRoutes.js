const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const {
  assignInventoryToBooking,
  processCheckoutInventory,
  getBookingInventoryUsage,
  getRoomInventoryUsage
} = require('../controllers/bookingInventoryController');

// ⭐ AGREGAR MIDDLEWARE DE AUTENTICACIÓN
router.use(verifyToken);
router.use(isStaff);

// Asignar inventario a reserva (check-in)
router.post('/booking/:bookingId/assign', 
  allowRoles(['owner', 'admin', 'receptionist']), 
  assignInventoryToBooking
);

// Procesar devolución de inventario (check-out)
router.post('/booking/:bookingId/checkout', 
  allowRoles(['owner', 'admin', 'receptionist']), 
  processCheckoutInventory
);

// Obtener uso de inventario por reserva
router.get('/booking/:bookingId', getBookingInventoryUsage);

// Obtener resumen de uso por habitación
router.get('/room/:roomNumber/usage', 
  allowRoles(['owner', 'admin']), 
  getRoomInventoryUsage
);

module.exports = router;