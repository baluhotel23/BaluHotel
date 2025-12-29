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
 router.post('/expenses', allowRoles(['owner', 'recept', 'receptionist']), createExpense);
 router.put('/expenses/:id', allowRoles(['owner', 'recept', 'receptionist']), updateExpense);
 router.delete('/expenses/:id', isOwner, deleteExpense);
 router.get('/expenses/categories', allowRoles(['owner', 'admin']), getExpenseCategories);

// // Gestión de facturas (owner y admin)
 router.get('/bills', allowRoles(['owner', 'admin']), getAllBills);
 router.get('/bills/:idBill', allowRoles(['owner', 'admin']), getBillDetails);
 router.post('/bills/:idBill/void', isOwner, voidBill);

// // Reportes financieros (owner y admin)
 router.get('/reports/profit-loss', allowRoles(['owner', 'admin']), getProfitLossReport);
 router.get('/reports/cash-flow', allowRoles(['owner', 'admin']), getCashFlowReport);
 router.get('/reports/tax', allowRoles(['owner', 'admin']), getTaxReport);
 router.get('/reports/annual', allowRoles(['owner', 'admin']), getAnnualReport);

// // Análisis y proyecciones (owner y admin)
 router.get('/analytics/trends', allowRoles(['owner', 'admin']), getFinancialTrends);
 router.get('/analytics/forecasts', allowRoles(['owner', 'admin']), getFinancialForecasts);
 router.get('/analytics/comparisons', allowRoles(['owner', 'admin']), getPeriodComparisons);

// // Configuración financiera (solo owner)
 router.get('/settings', isOwner, getFinancialSettings);
 router.put('/settings', isOwner, updateFinancialSettings);

module.exports = router;