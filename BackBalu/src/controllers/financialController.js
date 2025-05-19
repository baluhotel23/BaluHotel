const { Expense, Payment, Booking, Bill} = require('../data');
const { Op } = require('sequelize');
const { CustomError } = require('../middleware/error');

// Dashboard financiero (owner y admin)
const getDashboard = async (req, res, next) => {
  try {
    // Obtener ingresos desde Payment en lugar de Bill
    const totalRevenue = await Payment.sum('amount', { 
      where: { paymentStatus: 'completed' } 
    }) || 0;
    
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
    const { period = 'month' } = req.query;
    let startDate, endDate;
    
    // Define date range based on period
    const now = new Date();
    switch(period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    // Agregar console.log para depuración
    console.log('Calculando ingresos para el período:', { startDate, endDate });
    
    // IMPORTANTE: Obtener ingresos desde Payment en lugar de Bill
    const totalRevenue = await Payment.sum('amount', { 
      where: { 
        paymentStatus: 'completed',
        paymentDate: { [Op.between]: [startDate, endDate] } 
      } 
    }) || 0;
    
    console.log('Total de ingresos encontrados:', totalRevenue);
    
    // Ingresos por método de pago desde Payment
    let paymentAttributes = [];
let paymentMethodsData = {};
let paymentMethods = [];
    
    try {
  // Verificar si paymentMethod existe en la tabla Payment
  paymentAttributes = Object.keys(Payment.rawAttributes);
  console.log('Atributos del modelo Payment:', paymentAttributes);
  
  if (paymentAttributes.includes('paymentMethod')) {
    paymentMethods = await Payment.findAll({
      attributes: [
        'paymentMethod',
        [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
      ],
      where: { 
        paymentStatus: 'completed',
        paymentDate: { [Op.between]: [startDate, endDate] } 
      },
      group: ['paymentMethod']
    });
    
    // Formatear métodos de pago
    paymentMethods.forEach(method => {
      if (method.paymentMethod) {
        paymentMethodsData[method.paymentMethod] = parseFloat(method.dataValues.total);
      }
    });
    console.log('Métodos de pago encontrados:', paymentMethodsData);
  }
} catch (err) {
  console.log('Error al obtener métodos de pago:', err.message);
}
    // Diferenciar entre pagos online y locales
    // Si tienes una columna source en Payment, úsala directamente
    let onlineRevenue = 0;
    let localRevenue = 0;
    
    try {
      if (paymentAttributes && paymentAttributes.includes('source')) {
        // Si existe la columna source en Payment
        onlineRevenue = await Payment.sum('amount', {
          where: {
            paymentStatus: 'completed',
            paymentDate: { [Op.between]: [startDate, endDate] },
            source: 'online'
          }
        }) || 0;
        
        localRevenue = await Payment.sum('amount', {
          where: {
            paymentStatus: 'completed',
            paymentDate: { [Op.between]: [startDate, endDate] },
            source: 'local'
          }
        }) || 0;
      } else {
        // Alternativa: Intentar relacionar Payment con Booking para obtener el origen
        try {
          // Si hay una relación entre Payment y Booking que contiene pointOfSale
          const onlinePayments = await Payment.sum('amount', {
            include: [{
              model: Booking,
              where: { pointOfSale: 'online' },
              required: true
            }],
            where: {
              paymentStatus: 'completed',
              paymentDate: { [Op.between]: [startDate, endDate] }
            }
          }) || 0;
          
          const localPayments = await Payment.sum('amount', {
            include: [{
              model: Booking,
              where: { pointOfSale: 'local' },
              required: true
            }],
            where: {
              paymentStatus: 'completed',
              paymentDate: { [Op.between]: [startDate, endDate] }
            }
          }) || 0;
          
          onlineRevenue = onlinePayments;
          localRevenue = localPayments;
        } catch (err) {
          console.log('Error al relacionar Payment con Booking:', err.message);
          // Si no podemos relacionarlos, asumimos todo como local por ahora
          localRevenue = totalRevenue;
        }
      }
      
      console.log('Distribución de ingresos:', { online: onlineRevenue, local: localRevenue });
    } catch (err) {
      console.log('Error al calcular distribución online/local:', err.message);
      // Si hay error, asumimos todo como local para no mostrar error al usuario
      localRevenue = totalRevenue;
    }
    
    // El resto del código para gastos permanece igual
    const totalExpenses = await Expense.sum('amount', {
      where: { 
        expenseDate: { [Op.between]: [startDate, endDate] } 
      }
    }) || 0;
    
    // Get expense categories if available
    let expensesByCategory = [];
    try {
      expensesByCategory = await Expense.findAll({
        attributes: ['category', [Expense.sequelize.fn('SUM', Expense.sequelize.col('amount')), 'total']],
        where: {
          expenseDate: { [Op.between]: [startDate, endDate] }
        },
        group: ['category']
      });
    } catch (err) {
      console.log('Error getting expense categories:', err.message);
    }
    
    // Format expense categories
    const expensesByCategoryData = {};
    expensesByCategory.forEach(category => {
      if (category.category) {
        expensesByCategoryData[category.category] = parseFloat(category.dataValues.total);
      }
    });
    
    // Get purchase information if available
    let purchaseTotal = 0;
    try {
      const { Purchase } = require('../data');
      purchaseTotal = await Purchase.sum('totalAmount', {
        where: {
          purchaseDate: { [Op.between]: [startDate, endDate] }
        }
      }) || 0;
    } catch (err) {
      console.log('Purchase model not available or error occurred:', err.message);
    }
    
    res.status(200).json({
      error: false,
      data: {
        period,
        dateRange: { startDate, endDate },
        revenue: {
          total: totalRevenue,
          online: onlineRevenue,
          local: localRevenue
        },
        paymentMethods: paymentMethodsData,
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategoryData
        },
        purchases: {
          total: purchaseTotal
        }
      },
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
    
    // Validación de fechas
    if (!startDate || !endDate) {
      throw new CustomError('Las fechas de inicio y fin son requeridas', 400);
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new CustomError('Formato de fecha inválido', 400);
    }
    
    if (start > end) {
      throw new CustomError('La fecha de inicio debe ser anterior a la fecha de fin', 400);
    }
    
    console.log('Calculando ingresos para el período:', { startDate: start, endDate: end });
    
    // Obtener ingresos totales del período usando Payment
    const totalRevenue = await Payment.sum('amount', {
      where: {
        paymentStatus: 'completed',
        paymentDate: { [Op.between]: [start, end] }
      }
    }) || 0;
    
    console.log('Total de ingresos encontrados:', totalRevenue);
    
    // Generar array de meses entre las fechas
    const months = [];
    const currentDate = new Date(start);
    currentDate.setDate(1); // Comenzar el primer día del mes
    
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Primer día del mes
      const firstDay = new Date(year, month, 1);
      // Último día del mes
      const lastDay = new Date(year, month + 1, 0);
      lastDay.setHours(23, 59, 59, 999);
      
      console.log(`Procesando mes ${month + 1}/${year}:`, { firstDay, lastDay });
      
      // Obtener ingresos del mes usando Payment
      const monthRevenue = await Payment.sum('amount', {
        where: {
          paymentStatus: 'completed',
          paymentDate: { [Op.between]: [firstDay, lastDay] }
        }
      }) || 0;
      
      console.log(`Ingresos del mes ${month + 1}/${year}:`, monthRevenue);
      
      // Obtener gastos del mes (gastos + compras)
      const monthExpenses = await Expense.sum('amount', {
        where: {
          expenseDate: { [Op.between]: [firstDay, lastDay] }
        }
      }) || 0;
      
      // Intentar obtener compras si existe el modelo
      let monthPurchases = 0;
      try {
        const { Purchase } = require('../data');
        monthPurchases = await Purchase.sum('totalAmount', {
          where: {
            purchaseDate: { [Op.between]: [firstDay, lastDay] }
          }
        }) || 0;
      } catch (err) {
        console.log('Modelo de compras no disponible:', err.message);
      }
      
      // Obtener pagos por método de pago para este mes
      let paymentMethods = {};
      try {
        // Verificar si existe la columna paymentMethod en Payment
        const paymentAttributes = Object.keys(Payment.rawAttributes);
        
        if (paymentAttributes.includes('paymentMethod')) {
          const methodStats = await Payment.findAll({
            attributes: [
              'paymentMethod',
              [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
            ],
            where: { 
              paymentStatus: 'completed',
              paymentDate: { [Op.between]: [firstDay, lastDay] } 
            },
            group: ['paymentMethod']
          });
          
          // Formatear métodos de pago
          methodStats.forEach(method => {
            if (method.paymentMethod) {
              paymentMethods[method.paymentMethod] = parseFloat(method.dataValues.total);
            }
          });
        }
      } catch (err) {
        console.log('Error al obtener métodos de pago:', err.message);
      }
      
      // Calcular balance del mes
      const totalMonthExpenses = monthExpenses + monthPurchases;
      const monthBalance = monthRevenue - totalMonthExpenses;
      
      // Obtener número de facturas/pagos procesados
      // Aquí usamos Payment en lugar de Bill para ser consistentes
      const paymentCount = await Payment.count({
        where: {
          paymentDate: { [Op.between]: [firstDay, lastDay] }
        }
      });
      
      // Obtener número de pagos completados
      const completedPaymentCount = await Payment.count({
        where: {
          paymentStatus: 'completed',
          paymentDate: { [Op.between]: [firstDay, lastDay] }
        }
      });
      
      months.push({
        date: firstDay,
        year,
        month,
        name: new Intl.DateTimeFormat('es', { month: 'long' }).format(firstDay),
        revenue: monthRevenue,
        expenses: totalMonthExpenses,
        expensesDetail: {
          operationalExpenses: monthExpenses,
          purchases: monthPurchases
        },
        balance: monthBalance,
        paymentMethods,
        stats: {
          paymentCount,
          completedPaymentCount,
          completionRate: paymentCount > 0 ? (completedPaymentCount / paymentCount) * 100 : 0
        }
      });
      
      // Avanzar al siguiente mes
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    console.log(`Procesados ${months.length} meses de datos`);
    
    // Calcular tasas de crecimiento mes a mes
    for (let i = 1; i < months.length; i++) {
      const prevRevenue = months[i-1].revenue;
      const currentRevenue = months[i].revenue;
      
      months[i].growth = {
        revenue: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : null,
        absolute: currentRevenue - prevRevenue
      };
    }
    
    // Calcular totales y promedios
    const totalExpenses = months.reduce((sum, m) => sum + m.expenses, 0);
    const balance = totalRevenue - totalExpenses;
    const averageMonthlyRevenue = months.length > 0 ? totalRevenue / months.length : 0;
    const averageMonthlyExpenses = months.length > 0 ? totalExpenses / months.length : 0;
    
    res.status(200).json({
      error: false,
      data: {
        months,
        summary: {
          totalRevenue,
          totalExpenses,
          balance,
          averageMonthlyRevenue,
          averageMonthlyExpenses,
          periodStart: start,
          periodEnd: end,
          monthCount: months.length
        }
      },
      message: 'Ingresos por periodo obtenidos correctamente'
    });
  } catch (error) {
    console.error('Error en getRevenueByPeriod:', error);
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