const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isOwner, allowRoles } = require('../middleware/byRol');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Dashboard financiero (owner y admin)
// router.get('/dashboard', allowRoles(['owner', 'admin']), financialController.getDashboard);
// router.get('/summary', allowRoles(['owner', 'admin']), financialController.getSummary);

// // Gestión de ingresos (owner y admin)
// router.get('/revenue', allowRoles(['owner', 'admin']), financialController.getRevenue);
// router.get('/revenue/by-period', allowRoles(['owner', 'admin']), financialController.getRevenueByPeriod);
// router.get('/revenue/by-room-type', allowRoles(['owner', 'admin']), financialController.getRevenueByRoomType);

// // Gestión de gastos (owner y admin)
// router.get('/expenses', allowRoles(['owner', 'admin']), financialController.getAllExpenses);
// router.post('/expenses', allowRoles(['owner', 'admin']), financialController.createExpense);
// router.put('/expenses/:id', allowRoles(['owner', 'admin']), financialController.updateExpense);
// router.delete('/expenses/:id', isOwner, financialController.deleteExpense);
// router.get('/expenses/categories', allowRoles(['owner', 'admin']), financialController.getExpenseCategories);

// // Gestión de facturas (owner y admin)
// router.get('/bills', allowRoles(['owner', 'admin']), financialController.getAllBills);
// router.get('/bills/:id', allowRoles(['owner', 'admin']), financialController.getBillDetails);
// router.post('/bills/:id/void', isOwner, financialController.voidBill);

// // Reportes financieros (solo owner)
// router.get('/reports/profit-loss', isOwner, financialController.getProfitLossReport);
// router.get('/reports/cash-flow', isOwner, financialController.getCashFlowReport);
// router.get('/reports/tax', isOwner, financialController.getTaxReport);
// router.get('/reports/annual', isOwner, financialController.getAnnualReport);

// // Análisis y proyecciones (solo owner)
// router.get('/analytics/trends', isOwner, financialController.getFinancialTrends);
// router.get('/analytics/forecasts', isOwner, financialController.getFinancialForecasts);
// router.get('/analytics/comparisons', isOwner, financialController.getPeriodComparisons);

// // Configuración financiera (solo owner)
// router.get('/settings', isOwner, financialController.getFinancialSettings);
// router.put('/settings', isOwner, financialController.updateFinancialSettings);

module.exports = router;