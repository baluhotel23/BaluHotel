const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const {
    getAllVouchers,
    validateVoucher,
    useVoucher,
    getVoucherByCode,
    getVoucherStatistics
} = require('../controllers/voucherControllers');

// ═══════════════════════════════════════════════════════════════
// 🔐 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// 👤 RUTAS PARA USUARIOS AUTENTICADOS (pueden validar sus vouchers)
// ═══════════════════════════════════════════════════════════════
router.post('/validate', validateVoucher);
router.get('/by-code/:code', getVoucherByCode);

// ═══════════════════════════════════════════════════════════════
// 🏨 RUTAS PARA STAFF (gestión completa de vouchers)
// ═══════════════════════════════════════════════════════════════
router.use(isStaff);

router.get('/', getAllVouchers);
router.put('/:voucherId/use', useVoucher);
router.get('/statistics', getVoucherStatistics);

// ═══════════════════════════════════════════════════════════════
// 👑 RUTAS ADMINISTRATIVAS (solo owner y admin)
// ═══════════════════════════════════════════════════════════════
// Futuras rutas de administración como cancelar vouchers, etc.

module.exports = router;