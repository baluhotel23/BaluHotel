const { Expense, Bill } = require('../data');
const { Op } = require('sequelize');
const { CustomError } = require('../middleware/error');

// Dashboard financiero (owner y admin)
const getDashboard = async (req, res, next) => {
  try {
    // Ejemplo: sumar ingresos y gastos para calcular utilidad
    const totalRevenue = await Bill.sum('totalAmount', { where: { status: 'paid' } });
    const totalExpenses = await Expense.sum('amount');
    const profit = totalRevenue - totalExpenses;
    res.status(200).json({
      error: false,
      data: { totalRevenue, totalExpenses, profit },
      message: 'Dashboard financiero obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    // Ejemplo: resumen de gastos por categoría
    const expenseSummary = await Expense.findAll({
      attributes: ['category', [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount')), 'total']],
      group: ['category']
    });
    res.status(200).json({
      error: false,
      data: { expenseSummary },
      message: 'Resumen financiero obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Gestión de ingresos (owner y admin)
const getRevenue = async (req, res, next) => {
  try {
    // Ejemplo: listado de todas las facturas pagadas
    const bills = await Bill.findAll({ where: { status: 'paid' } });
    res.status(200).json({
      error: false,
      data: bills,
      message: 'Ingresos obtenidos correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getRevenueByPeriod = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const revenue = await Bill.sum('totalAmount', {
      where: {
        status: 'paid',
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      }
    });
    res.status(200).json({
      error: false,
      data: { revenue },
      message: 'Ingresos por periodo obtenidos correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getRevenueByRoomType = async (req, res, next) => {
  try {
    // Ejemplo dummy: se retorna un arreglo con totales por tipo de habitación
    const revenueByRoomType = [
      { roomType: 'Suite', totalRevenue: 20000 },
      { roomType: 'Doble', totalRevenue: 15000 },
      { roomType: 'Individual', totalRevenue: 10000 }
    ];
    res.status(200).json({
      error: false,
      data: revenueByRoomType,
      message: 'Ingresos por tipo de habitación obtenidos correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Gestión de gastos (owner y admin)
const getAllExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.findAll();
    res.status(200).json({
      error: false,
      data: expenses,
      message: 'Gastos obtenidos correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const expenseData = req.body;
    const expense = await Expense.create(expenseData);
    res.status(201).json({
      error: false,
      data: expense,
      message: 'Gasto creado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const expenseData = req.body;
    const expense = await Expense.findByPk(id);
    if (!expense) {
      throw new CustomError('Gasto no encontrado', 404);
    }
    const updatedExpense = await expense.update(expenseData);
    res.status(200).json({
      error: false,
      data: updatedExpense,
      message: 'Gasto actualizado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    if (!expense) {
      throw new CustomError('Gasto no encontrado', 404);
    }
    await expense.destroy();
    res.status(200).json({
      error: false,
      message: 'Gasto eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getExpenseCategories = async (req, res, next) => {
  try {
    const categories = await Expense.findAll({
      attributes: ['category'],
      group: ['category']
    });
    const uniqueCategories = categories.map(item => item.category);
    res.status(200).json({
      error: false,
      data: uniqueCategories,
      message: 'Categorías de gastos obtenidas correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Gestión de facturas (owner y admin)
const getAllBills = async (req, res, next) => {
  try {
    const bills = await Bill.findAll();
    res.status(200).json({
      error: false,
      data: bills,
      message: 'Facturas obtenidas correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getBillDetails = async (req, res, next) => {
  try {
    const { idBill } = req.params;
    const bill = await Bill.findByPk(idBill);
    if (!bill) {
      throw new CustomError('Factura no encontrada', 404);
    }
    res.status(200).json({
      error: false,
      data: bill,
      message: 'Detalles de la factura obtenidos correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const voidBill = async (req, res, next) => {
  try {
    const { idBill } = req.params;
    const bill = await Bill.findByPk(idBill);
    if (!bill) {
      throw new CustomError('Factura no encontrada', 404);
    }
    // Marcar la factura como anulada
    const updatedBill = await bill.update({ status: 'void' });
    res.status(200).json({
      error: false,
      data: updatedBill,
      message: 'Factura anulada correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Reportes financieros (solo owner)
const getProfitLossReport = async (req, res, next) => {
  try {
    const totalRevenue = await Bill.sum('totalAmount', { where: { status: 'paid' } });
    const totalExpenses = await Expense.sum('amount');
    const profitLoss = totalRevenue - totalExpenses;
    res.status(200).json({
      error: false,
      data: { totalRevenue, totalExpenses, profitLoss },
      message: 'Reporte de pérdidas y ganancias obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getCashFlowReport = async (req, res, next) => {
  try {
    const inflow = await Bill.sum('totalAmount', { where: { status: 'paid' } });
    const outflow = await Expense.sum('amount');
    res.status(200).json({
      error: false,
      data: { inflow, outflow },
      message: 'Reporte de flujo de caja obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getTaxReport = async (req, res, next) => {
  try {
    const totalRevenue = await Bill.sum('totalAmount', { where: { status: 'paid' } });
    const tax = totalRevenue * 0.10; // Ejemplo: 10% de impuesto
    res.status(200).json({
      error: false,
      data: { totalRevenue, tax },
      message: 'Reporte de impuestos obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getAnnualReport = async (req, res, next) => {
  try {
    const { year } = req.query;
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);
    const annualRevenue = await Bill.sum('totalAmount', {
      where: {
        status: 'paid',
        createdAt: { [Op.between]: [startDate, endDate] }
      }
    });
    const annualExpenses = await Expense.sum('amount', {
      where: { createdAt: { [Op.between]: [startDate, endDate] } }
    });
    res.status(200).json({
      error: false,
      data: { annualRevenue, annualExpenses },
      message: 'Reporte anual obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Análisis y proyecciones (solo owner)
const getFinancialTrends = async (req, res, next) => {
  try {
    // Ejemplo dummy: tendencias de ingresos y gastos de los últimos 6 meses
    const trends = {
      revenue: [10000, 15000, 12000, 18000, 20000, 19000],
      expenses: [5000, 7000, 6000, 8000, 9000, 8500]
    };
    res.status(200).json({
      error: false,
      data: trends,
      message: 'Tendencias financieras obtenidas correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getFinancialForecasts = async (req, res, next) => {
  try {
    // Ejemplo dummy: proyecciones para los próximos 3 meses
    const forecasts = {
      nextMonth: 22000,
      monthAfter: 23000,
      twoMonthsAfter: 24000
    };
    res.status(200).json({
      error: false,
      data: forecasts,
      message: 'Proyecciones financieras obtenidas correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getPeriodComparisons = async (req, res, next) => {
  try {
    // Ejemplo dummy: comparación de ingresos entre dos periodos
    const { startPeriod, endPeriod } = req.query;
    const comparison = {
      period1: 20000,
      period2: 25000
    };
    res.status(200).json({
      error: false,
      data: comparison,
      message: 'Comparación por periodos obtenida correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Configuración financiera (solo owner)
const getFinancialSettings = async (req, res, next) => {
  try {
    // Ejemplo dummy: configuración financiera almacenada
    const settings = {
      taxRate: 0.10,
      currency: 'USD'
    };
    res.status(200).json({
      error: false,
      data: settings,
      message: 'Configuración financiera obtenida correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const updateFinancialSettings = async (req, res, next) => {
  try {
    // Ejemplo dummy: actualizar configuración financiera
    const updatedSettings = req.body;
    res.status(200).json({
      error: false,
      data: updatedSettings,
      message: 'Configuración financiera actualizada correctamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};