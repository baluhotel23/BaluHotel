const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const {
  getLaundryStatus,
  sendToLaundry,
  receiveFromLaundry,
  markAsDirty,
  getLaundryHistory,
  getPendingLaundry
} = require('../controllers/laundryController');

// ⭐ AGREGAR MIDDLEWARE DE AUTENTICACIÓN
router.use(verifyToken);
router.use(isStaff);

// Obtener estado general de lavandería
router.get('/status', getLaundryStatus);

// Obtener items pendientes en lavandería
router.get('/pending', getPendingLaundry);

// Obtener historial de movimientos
router.get('/history', allowRoles(['owner', 'admin']), getLaundryHistory);

// Enviar items a lavandería
router.post('/send', allowRoles(['owner', 'admin', 'receptionist', 'recept']), sendToLaundry);

// Recibir items de lavandería
router.post('/receive', allowRoles(['owner', 'admin', 'receptionist', 'recept']), receiveFromLaundry);

// Marcar items como sucios
router.post('/mark-dirty', allowRoles(['owner', 'admin', 'receptionist', 'recept']), markAsDirty);

module.exports = router;