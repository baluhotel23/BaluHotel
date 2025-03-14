const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isOwner, allowRoles } = require('../middleware/byRol');
const {
    getDashboard,
  getSummary,
  getRevenue,
  getRevenueByPeriod,
  getRevenueByRoomType,
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  getAllBills,
  getBillDetails,
  voidBill,
  getProfitLossReport,
  getCashFlowReport,
  getTaxReport,
  getAnnualReport,
  getFinancialTrends,
  getFinancialForecasts,
  getPeriodComparisons,
  getFinancialSettings,
  updateFinancialSettings
  } = require("../controllers/financialController");
// Todas las rutas requieren autenticación
router.use(verifyToken);

// Dashboard financiero (owner y admin)
 router.get('/dashboard', allowRoles(['owner', 'admin']), getDashboard);
 router.get('/summary', allowRoles(['owner', 'admin']), getSummary);

// // Gestión de ingresos (owner y admin)
 router.get('/revenue', allowRoles(['owner', 'admin']), getRevenue);
 router.get('/revenue/by-period', allowRoles(['owner', 'admin']), getRevenueByPeriod);
 router.get('/revenue/by-room-type', allowRoles(['owner', 'admin']), getRevenueByRoomType);

// // Gestión de gastos (owner y admin)
 router.get('/expenses', allowRoles(['owner', 'admin']), getAllExpenses);
 router.post('/expenses', allowRoles(['owner', 'admin']), createExpense);
 router.put('/expenses/:id', allowRoles(['owner', 'admin']), updateExpense);
 router.delete('/expenses/:id', isOwner, deleteExpense);
 router.get('/expenses/categories', allowRoles(['owner', 'admin']), getExpenseCategories);

// // Gestión de facturas (owner y admin)
 router.get('/bills', allowRoles(['owner', 'admin']), getAllBills);
 router.get('/bills/:idBill', allowRoles(['owner', 'admin']), getBillDetails);
 router.post('/bills/:idBill/void', isOwner, voidBill);

// // Reportes financieros (solo owner)
 router.get('/reports/profit-loss', isOwner, getProfitLossReport);
 router.get('/reports/cash-flow', isOwner, getCashFlowReport);
 router.get('/reports/tax', isOwner, getTaxReport);
 router.get('/reports/annual', isOwner, getAnnualReport);

// // Análisis y proyecciones (solo owner)
 router.get('/analytics/trends', isOwner, getFinancialTrends);
 router.get('/analytics/forecasts', isOwner, getFinancialForecasts);
 router.get('/analytics/comparisons', isOwner, getPeriodComparisons);

// // Configuración financiera (solo owner)
 router.get('/settings', isOwner, getFinancialSettings);
 router.put('/settings', isOwner, updateFinancialSettings);

module.exports = router;