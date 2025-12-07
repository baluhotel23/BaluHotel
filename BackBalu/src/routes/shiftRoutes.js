const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const {
  openShift,
  getCurrentShift,
  closeShift,
  getShiftHistory,
  getShiftReport,
  generateShiftPDF
} = require('../controllers/shiftController');

// ⭐ TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
router.use(verifyToken);

// ⭐ TODAS LAS RUTAS REQUIEREN SER PERSONAL DEL HOTEL
router.use(isStaff);

// =====================================
// GESTIÓN DE TURNOS
// =====================================

// ABRIR TURNO - Solo recepcionistas y owner pueden abrir turno (no admin)
router.post('/open', allowRoles(['owner', 'recept', 'receptionist']), openShift);

// OBTENER TURNO ACTUAL DEL USUARIO LOGUEADO
router.get('/current', getCurrentShift);

// CERRAR TURNO - Solo recepcionistas y owner pueden cerrar turno (no admin)
router.post('/close', allowRoles(['owner', 'recept', 'receptionist']), closeShift);

// OBTENER HISTORIAL DE TURNOS (Solo owner y admin)
router.get('/history', allowRoles(['owner', 'admin']), getShiftHistory);

// OBTENER REPORTE DETALLADO DE UN TURNO ESPECÍFICO
router.get('/:shiftId/report', getShiftReport);

// GENERAR PDF DEL REPORTE DE TURNO
router.get('/:shiftId/pdf', generateShiftPDF);

module.exports = router;
