const { Expense, Payment, Booking, Bill, Buyer, Room } = require("../data");
const { Op } = require("sequelize");
const { CustomError } = require("../middleware/error");
const { 
  parseDate, 
  toJSDate, 
  formatColombiaDate,
  getColombiaDate,
  formatForLogs,
  getColombiaTime
} = require('../utils/dateUtils');

// Dashboard financiero (owner y admin)
const getDashboard = async (req, res, next) => {
  try {
    // Obtener ingresos desde Payment en lugar de Bill
    const totalRevenue =
      (await Payment.sum("amount", {
        paymentStatus: { [Op.in]: ['completed', 'authorized', 'partial'] },
      })) || 0;

    const totalExpenses = await Expense.sum("amount");
    const profit = totalRevenue - totalExpenses;

    res.status(200).json({
      error: false,
      data: { totalRevenue, totalExpenses, profit },
      message: "Dashboard financiero obtenido correctamente",
    });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const { period = "month" } = req.query;
    let startDate, endDate;

    // Define date range based on period
    const now = new Date();
    switch (period) {
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case "custom":
        startDate = req.query.startDate
          ? new Date(req.query.startDate)
          : new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    console.log("Calculando ingresos para el período:", { startDate, endDate });

    // ⭐ CALCULAR INGRESOS BRUTOS (solo pagos positivos - excluir reembolsos)
    const totalRevenue =
      (await Payment.sum("amount", {
        where: {
          paymentStatus: { [Op.in]: ["completed", "authorized", "partial"] },
          paymentDate: { [Op.between]: [startDate, endDate] },
          amount: { [Op.gt]: 0 } // ⭐ Solo pagos positivos
        },
      })) || 0;

    // ⭐ CALCULAR REEMBOLSOS TOTALES (pagos negativos por fuerza mayor)
    const totalRefunds = Math.abs(
      (await Payment.sum("amount", {
        where: {
          paymentStatus: 'completed',
          paymentDate: { [Op.between]: [startDate, endDate] },
          amount: { [Op.lt]: 0 } // ⭐ Solo reembolsos (negativos)
        },
      })) || 0
    );

    // ⭐ INGRESOS NETOS = Ingresos brutos - Reembolsos
    const netRevenue = totalRevenue - totalRefunds;

    console.log("📊 Resumen de ingresos:", { 
      totalRevenue, 
      totalRefunds,
      netRevenue 
    });

    // Métodos de pago
    let paymentMethodsData = {};
    try {
      const paymentAttributes = Object.keys(Payment.rawAttributes);
      console.log("Atributos del modelo Payment:", paymentAttributes);

      if (paymentAttributes.includes("paymentMethod")) {
        const methodStats = await Payment.findAll({
          attributes: [
            "paymentMethod",
            [Payment.sequelize.fn("SUM", Payment.sequelize.col("amount")), "total"],
          ],
          where: {
            paymentStatus: { [Op.in]: ["completed", "authorized", "partial"] },
            paymentDate: { [Op.between]: [startDate, endDate] },
            amount: { [Op.gt]: 0 } // ⭐ Excluir reembolsos del desglose por método
          },
          group: ["paymentMethod"],
        });
        methodStats.forEach((method) => {
          if (method.paymentMethod) {
            paymentMethodsData[method.paymentMethod] = parseFloat(method.dataValues.total);
          }
        });
      }
      console.log("Métodos de pago encontrados:", paymentMethodsData);
    } catch (err) {
      console.log("Error al obtener métodos de pago:", err.message);
    }

    // Diferenciar entre pagos online y locales
    // ⭐ ESTRATEGIA: Usar paymentMethod="wompi" como indicador de pago online
    let onlineRevenue = 0;
    let localRevenue = 0;
    
    try {
      console.log("🔍 [FINANCIAL] Clasificando ingresos por paymentMethod...");
      
      // ⭐ USAR paymentMethod="wompi" para identificar pagos online
      onlineRevenue =
        (await Payment.sum("amount", {
          where: {
            paymentStatus: { [Op.in]: ["completed", "authorized", "partial"] },
            paymentDate: { [Op.between]: [startDate, endDate] },
            paymentMethod: "wompi", // ⭐ Wompi es exclusivo de pagos online
            amount: { [Op.gt]: 0 } // ⭐ Excluir reembolsos
          },
        })) || 0;

      // También intentar con paymentType="online" por si existen
      const onlineByType =
        (await Payment.sum("amount", {
          where: {
            paymentStatus: { [Op.in]: ["completed", "authorized", "partial"] },
            paymentDate: { [Op.between]: [startDate, endDate] },
            paymentType: "online",
            paymentMethod: { [Op.ne]: "wompi" }, // Excluir wompi para no duplicar
            amount: { [Op.gt]: 0 } // ⭐ Excluir reembolsos
          },
        })) || 0;

      onlineRevenue += onlineByType;

      // Calcular local como la diferencia del total
      localRevenue = totalRevenue - onlineRevenue;

      console.log("✅ [FINANCIAL] Distribución de ingresos:", {
        total: totalRevenue,
        onlineWompi: onlineRevenue - onlineByType,
        onlineOtros: onlineByType,
        onlineTotal: onlineRevenue,
        local: localRevenue,
        porcentajeOnline: totalRevenue > 0 ? ((onlineRevenue / totalRevenue) * 100).toFixed(2) + '%' : '0%'
      });
    } catch (err) {
      console.error("❌ [FINANCIAL] Error al calcular distribución online/local:", err.message);
      console.error(err);
      // En caso de error, asumir todo como local
      localRevenue = totalRevenue;
      onlineRevenue = 0;
    }

    // Gastos totales
    const totalExpenses =
      (await Expense.sum("amount", {
        where: {
          expenseDate: { [Op.between]: [startDate, endDate] },
        },
      })) || 0;

    // Gastos por categoría
    let expensesByCategory = [];
    try {
      expensesByCategory = await Expense.findAll({
        attributes: [
          "category",
          [Expense.sequelize.fn("SUM", Expense.sequelize.col("amount")), "total"],
        ],
        where: {
          expenseDate: { [Op.between]: [startDate, endDate] },
        },
        group: ["category"],
      });
    } catch (err) {
      console.log("Error getting expense categories:", err.message);
    }

    const expensesByCategoryData = {};
    expensesByCategory.forEach((category) => {
      if (category.category) {
        expensesByCategoryData[category.category] = parseFloat(category.dataValues.total);
      }
    });

    // Compras totales
    let purchaseTotal = 0;
    try {
      const { Purchase } = require("../data");
      purchaseTotal =
        (await Purchase.sum("totalAmount", {
          where: {
            purchaseDate: { [Op.between]: [startDate, endDate] },
          },
        })) || 0;
    } catch (err) {
      console.log("Purchase model not available or error occurred:", err.message);
    }

    res.status(200).json({
      error: false,
      data: {
        period,
        dateRange: { startDate, endDate },
        revenue: {
          gross: totalRevenue, // ⭐ Ingresos brutos
          refunds: totalRefunds, // ⭐ Reembolsos realizados
          net: netRevenue, // ⭐ Ingresos netos (bruto - reembolsos)
          online: onlineRevenue,
          local: localRevenue,
        },
        paymentMethods: paymentMethodsData,
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategoryData,
        },
        purchases: {
          total: purchaseTotal,
        },
      },
      message: "Resumen financiero obtenido correctamente",
    });
  } catch (error) {
    next(error);
  }
};

// Gestión de ingresos (owner y admin)
const getRevenue = async (req, res, next) => {
  try {
    // Ejemplo: listado de todas las facturas pagadas
    const bills = await Bill.findAll({ where: { status: "paid" } });
    res.status(200).json({
      error: false,
      data: bills,
      message: "Ingresos obtenidos correctamente",
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
      throw new CustomError("Las fechas de inicio y fin son requeridas", 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new CustomError("Formato de fecha inválido", 400);
    }

    if (start > end) {
      throw new CustomError(
        "La fecha de inicio debe ser anterior a la fecha de fin",
        400
      );
    }

    // ⭐ CALCULAR INGRESOS BRUTOS (excluir reembolsos)
    const totalRevenue =
      (await Payment.sum("amount", {
        where: {
          paymentStatus: { [Op.in]: ['completed', 'authorized', 'partial'] },
          paymentDate: { [Op.between]: [start, end] },
          amount: { [Op.gt]: 0 } // ⭐ Solo pagos positivos
        },
      })) || 0;

    // ⭐ CALCULAR REEMBOLSOS DEL PERÍODO
    const totalRefunds = Math.abs(
      (await Payment.sum("amount", {
        where: {
          paymentStatus: 'completed',
          paymentDate: { [Op.between]: [start, end] },
          amount: { [Op.lt]: 0 } // ⭐ Solo reembolsos
        },
      })) || 0
    );

    const netRevenue = totalRevenue - totalRefunds;

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

      // ⭐ OBTENER INGRESOS DEL MES (excluir reembolsos)
      const monthRevenue =
        (await Payment.sum("amount", {
          where: {
            paymentStatus: { [Op.in]: ["completed", "authorized", "partial"] },
            paymentDate: { [Op.between]: [firstDay, lastDay] },
            amount: { [Op.gt]: 0 } // ⭐ Solo pagos positivos
          },
        })) || 0;

      // ⭐ OBTENER REEMBOLSOS DEL MES
      const monthRefunds = Math.abs(
        (await Payment.sum("amount", {
          where: {
            paymentStatus: 'completed',
            paymentDate: { [Op.between]: [firstDay, lastDay] },
            amount: { [Op.lt]: 0 } // ⭐ Solo reembolsos
          },
        })) || 0
      );

      const monthNetRevenue = monthRevenue - monthRefunds;

      // Obtener gastos del mes (gastos + compras)
      const monthExpenses =
        (await Expense.sum("amount", {
          where: {
            expenseDate: { [Op.between]: [firstDay, lastDay] },
          },
        })) || 0;

      // Gastos por categoría para el mes
      let monthExpensesByCategory = {};
      try {
        const expensesByCategory = await Expense.findAll({
          attributes: [
            "category",
            [Expense.sequelize.fn("SUM", Expense.sequelize.col("amount")), "total"],
          ],
          where: {
            expenseDate: { [Op.between]: [firstDay, lastDay] },
          },
          group: ["category"],
        });
        expensesByCategory.forEach((category) => {
          if (category.category) {
            monthExpensesByCategory[category.category] = parseFloat(category.dataValues.total);
          }
        });
      } catch (err) {
        console.log("Error obteniendo gastos por categoría:", err.message);
      }

      // Intentar obtener compras si existe el modelo
      let monthPurchases = 0;
      try {
        const { Purchase } = require("../data");
        monthPurchases =
          (await Purchase.sum("totalAmount", {
            where: {
              purchaseDate: { [Op.between]: [firstDay, lastDay] },
            },
          })) || 0;
      } catch (err) {
        console.log("Modelo de compras no disponible:", err.message);
      }

      // Obtener pagos por método de pago para este mes
      let paymentMethods = {};
      try {
        const paymentAttributes = Object.keys(Payment.rawAttributes);
        let methodStats = [];
        if (paymentAttributes.includes("paymentMethod")) {
          methodStats = await Payment.findAll({
            attributes: [
              "paymentMethod",
              [Payment.sequelize.fn("SUM", Payment.sequelize.col("amount")), "total"],
            ],
            where: {
              paymentStatus: { [Op.in]: ["completed", "authorized", "partial"] },
              paymentDate: { [Op.between]: [firstDay, lastDay] },
            },
            group: ["paymentMethod"],
          });
        }
        methodStats.forEach((method) => {
          if (method.paymentMethod) {
            paymentMethods[method.paymentMethod] = parseFloat(method.dataValues.total);
          }
        });
      } catch (err) {
        console.log("Error al obtener métodos de pago:", err.message);
      }

      // Calcular balance del mes
      const totalMonthExpenses = monthExpenses + monthPurchases;
      const monthBalance = monthNetRevenue - totalMonthExpenses; // ⭐ Usar ingresos netos

      // Obtener número de facturas/pagos procesados
      const paymentCount = await Payment.count({
        where: {
          paymentDate: { [Op.between]: [firstDay, lastDay] },
          amount: { [Op.gt]: 0 } // ⭐ Excluir reembolsos del conteo
        },
      });

      // Obtener número de pagos completados
      const completedPaymentCount = await Payment.count({
        where: {
          paymentStatus: { [Op.in]: ["completed", "authorized", "partial"] },
          paymentDate: { [Op.between]: [firstDay, lastDay] },
          amount: { [Op.gt]: 0 } // ⭐ Excluir reembolsos del conteo
        },
      });

      // ⭐ Conteo de reembolsos del mes
      const refundCount = await Payment.count({
        where: {
          paymentStatus: 'completed',
          paymentDate: { [Op.between]: [firstDay, lastDay] },
          amount: { [Op.lt]: 0 }
        },
      });

      months.push({
        date: firstDay,
        year,
        month,
        name: new Intl.DateTimeFormat("es", { month: "long" }).format(firstDay),
        revenue: monthRevenue, // ⭐ Ingresos brutos
        refunds: monthRefunds, // ⭐ Reembolsos del mes
        netRevenue: monthNetRevenue, // ⭐ Ingresos netos
        expenses: totalMonthExpenses,
        expensesDetail: {
          operationalExpenses: monthExpenses,
          purchases: monthPurchases,
          categories: monthExpensesByCategory // <-- aquí agregas las categorías
        },
        balance: monthBalance,
        paymentMethods,
        stats: {
          paymentCount,
          completedPaymentCount,
          refundCount, // ⭐ Número de reembolsos
          completionRate:
            paymentCount > 0 ? (completedPaymentCount / paymentCount) * 100 : 0,
        },
      });

      // Avanzar al siguiente mes
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Calcular tasas de crecimiento mes a mes
    for (let i = 1; i < months.length; i++) {
      const prevRevenue = months[i - 1].revenue;
      const currentRevenue = months[i].revenue;

      months[i].growth = {
        revenue:
          prevRevenue > 0
            ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
            : null,
        absolute: currentRevenue - prevRevenue,
      };
    }

    // ⭐ NUEVO: Obtener facturas individuales del período para el gráfico de tendencias
    let bills = [];
    try {
      bills = await Bill.findAll({
        where: {
          createdAt: { [Op.between]: [start, end] }
        },
        attributes: [
          'idBill',
          'reservationAmount', 
          'extraChargesAmount',
          'createdAt'
        ],
        order: [['createdAt', 'ASC']]
      });
    } catch (billError) {
      console.error("Error al obtener facturas para el gráfico:", billError.message);
      // Si falla, usamos los datos agregados de months
      bills = [];
    }

    // Calcular totales y promedios
    const totalExpenses = months.reduce((sum, m) => sum + m.expenses, 0);
    const balance = netRevenue - totalExpenses; // ⭐ Usar ingresos netos
    const averageMonthlyRevenue =
      months.length > 0 ? totalRevenue / months.length : 0;
    const averageMonthlyNetRevenue =
      months.length > 0 ? netRevenue / months.length : 0;
    const averageMonthlyExpenses =
      months.length > 0 ? totalExpenses / months.length : 0;

    res.status(200).json({
      error: false,
      data: bills.length > 0 ? bills : months, // ⭐ Si hay facturas, retornarlas; si no, retornar months
      months, // ⭐ Mantener months por si se necesita
      summary: {
        totalRevenue, // ⭐ Ingresos brutos
        totalRefunds, // ⭐ Total de reembolsos
        netRevenue, // ⭐ Ingresos netos (bruto - reembolsos)
        totalExpenses,
        balance,
        averageMonthlyRevenue,
        averageMonthlyNetRevenue, // ⭐ Promedio neto mensual
        averageMonthlyExpenses,
        periodStart: start,
        periodEnd: end,
        monthCount: months.length,
        paymentMethods: months.reduce((acc, m) => {
          Object.entries(m.paymentMethods).forEach(([method, amount]) => {
            acc[method] = (acc[method] || 0) + amount;
          });
          return acc;
        }, {}),
        expensesByCategory: months.reduce((acc, m) => {
          if (m.expensesDetail && m.expensesDetail.categories) {
            Object.entries(m.expensesDetail.categories).forEach(([cat, amount]) => {
              acc[cat] = (acc[cat] || 0) + amount;
            });
          }
          return acc;
        }, {})
      },
      message: "Ingresos por periodo obtenidos correctamente",
    });
  } catch (error) {
    console.error("Error en getRevenueByPeriod:", error);
    next(error);
  }
};
const getRevenueByRoomType = async (req, res, next) => {
  try {
    // Ejemplo dummy: se retorna un arreglo con totales por tipo de habitación
    const revenueByRoomType = [
      { roomType: "Suite", totalRevenue: 20000 },
      { roomType: "Doble", totalRevenue: 15000 },
      { roomType: "Individual", totalRevenue: 10000 },
    ];
    res.status(200).json({
      error: false,
      data: revenueByRoomType,
      message: "Ingresos por tipo de habitación obtenidos correctamente",
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
      message: "Gastos obtenidos correctamente",
    });
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    // Bloquear admins de crear gastos
    if (req.user && req.user.role === 'admin') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para crear gastos' });
    }
    const expenseData = req.body;
    
    // Validar campos obligatorios
    if (!expenseData.destinatario || !expenseData.destinatario.trim()) {
      return res.status(400).json({ error: true, message: 'El destinatario es obligatorio' });
    }
    
    if (!expenseData.amount || isNaN(expenseData.amount) || parseFloat(expenseData.amount) <= 0) {
      return res.status(400).json({ error: true, message: 'El monto debe ser un número positivo' });
    }
    
    // Validar categoría
    const validCategories = ['maintenance', 'utilities', 'salaries', 'marketing', 'supplies', 'other'];
    if (!expenseData.category || !validCategories.includes(expenseData.category)) {
      return res.status(400).json({ 
        error: true, 
        message: 'Debe seleccionar una categoría válida' 
      });
    }
    
    // Validar método de pago
    const validPaymentMethods = ['cash', 'credit_card', 'transfer', 'credit'];
    if (!expenseData.paymentMethod || !validPaymentMethods.includes(expenseData.paymentMethod)) {
      return res.status(400).json({ 
        error: true, 
        message: 'Debe seleccionar un método de pago válido' 
      });
    }
    
    // Asignar el usuario autenticado como creador
    expenseData.createdBy = req.user.n_document;
    
    // ⭐ MANEJO CORRECTO DE LA FECHA DEL GASTO
    if (expenseData.expenseDate) {
      // Si viene una fecha del frontend, parserarla en zona horaria de Colombia
      const parsedDate = parseDate(expenseData.expenseDate);
      if (parsedDate && parsedDate.isValid) {
        expenseData.expenseDate = toJSDate(parsedDate);
        console.log('📅 Fecha de gasto parseada:', {
          original: req.body.expenseDate,
          parsed: formatColombiaDate(parsedDate),
          jsDate: expenseData.expenseDate
        });
      } else {
        console.log('⚠️ Fecha inválida recibida, usando fecha actual');
        expenseData.expenseDate = toJSDate(getColombiaDate());
      }
    } else {
      // Si no viene fecha, usar la fecha actual de Colombia
      expenseData.expenseDate = toJSDate(getColombiaDate());
      console.log('📅 Usando fecha actual de Colombia para gasto');
    }
    
    console.log('🔍 Datos del gasto a crear:', {
      destinatario: expenseData.destinatario,
      amount: expenseData.amount,
      expenseDate: expenseData.expenseDate,
      createdBy: expenseData.createdBy
    });
    
    const expense = await Expense.create(expenseData);
    res.status(201).json({
      error: false,
      data: expense,
      message: "Gasto creado correctamente",
    });
  } catch (error) {
    console.error('❌ Error creando gasto:', error);
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    // Bloquear admins de actualizar gastos
    if (req.user && req.user.role === 'admin') {
      return res.status(403).json({ error: true, message: 'No tienes permisos para actualizar gastos' });
    }
    const { id } = req.params;
    const expenseData = req.body;
    
    // ⭐ MANEJO CORRECTO DE LA FECHA SI SE ESTÁ ACTUALIZANDO
    if (expenseData.expenseDate) {
      const parsedDate = parseDate(expenseData.expenseDate);
      if (parsedDate && parsedDate.isValid) {
        expenseData.expenseDate = toJSDate(parsedDate);
        console.log('📅 Fecha de gasto actualizada:', {
          original: req.body.expenseDate,
          parsed: formatColombiaDate(parsedDate),
          jsDate: expenseData.expenseDate
        });
      }
    }
    
    const expense = await Expense.findByPk(id);
    if (!expense) {
      throw new CustomError("Gasto no encontrado", 404);
    }
    
    const updatedExpense = await expense.update(expenseData);
    res.status(200).json({
      error: false,
      data: updatedExpense,
      message: "Gasto actualizado correctamente",
    });
  } catch (error) {
    console.error('❌ Error actualizando gasto:', error);
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    if (!expense) {
      throw new CustomError("Gasto no encontrado", 404);
    }
    await expense.destroy();
    res.status(200).json({
      error: false,
      message: "Gasto eliminado correctamente",
    });
  } catch (error) {
    next(error);
  }
};

const getExpenseCategories = async (req, res, next) => {
  try {
    const categories = await Expense.findAll({
      attributes: ["category"],
      group: ["category"],
    });
    const uniqueCategories = categories.map((item) => item.category);
    res.status(200).json({
      error: false,
      data: uniqueCategories,
      message: "Categorías de gastos obtenidas correctamente",
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
      message: "Facturas obtenidas correctamente",
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
      throw new CustomError("Factura no encontrada", 404);
    }
    res.status(200).json({
      error: false,
      data: bill,
      message: "Detalles de la factura obtenidos correctamente",
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
      throw new CustomError("Factura no encontrada", 404);
    }
    // Marcar la factura como anulada
    const updatedBill = await bill.update({ status: "void" });
    res.status(200).json({
      error: false,
      data: updatedBill,
      message: "Factura anulada correctamente",
    });
  } catch (error) {
    next(error);
  }
};

// Reportes financieros (solo owner)
const getProfitLossReport = async (req, res, next) => {
  try {
    const totalRevenue = await Bill.sum("totalAmount", {
      where: { status: "paid" },
    });
    const totalExpenses = await Expense.sum("amount");
    const profitLoss = totalRevenue - totalExpenses;
    res.status(200).json({
      error: false,
      data: { totalRevenue, totalExpenses, profitLoss },
      message: "Reporte de pérdidas y ganancias obtenido correctamente",
    });
  } catch (error) {
    next(error);
  }
};

const getCashFlowReport = async (req, res, next) => {
  try {
    const inflow = await Bill.sum("totalAmount", { where: { status: "paid" } });
    const outflow = await Expense.sum("amount");
    res.status(200).json({
      error: false,
      data: { inflow, outflow },
      message: "Reporte de flujo de caja obtenido correctamente",
    });
  } catch (error) {
    next(error);
  }
};

const getTaxReport = async (req, res, next) => {
  try {
    const totalRevenue = await Bill.sum("totalAmount", {
      where: { status: "paid" },
    });
    const tax = totalRevenue * 0.1; // Ejemplo: 10% de impuesto
    res.status(200).json({
      error: false,
      data: { totalRevenue, tax },
      message: "Reporte de impuestos obtenido correctamente",
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
    const annualRevenue = await Bill.sum("totalAmount", {
      where: {
        status: "paid",
        createdAt: { [Op.between]: [startDate, endDate] },
      },
    });
    const annualExpenses = await Expense.sum("amount", {
      where: { createdAt: { [Op.between]: [startDate, endDate] } },
    });
    res.status(200).json({
      error: false,
      data: { annualRevenue, annualExpenses },
      message: "Reporte anual obtenido correctamente",
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
      expenses: [5000, 7000, 6000, 8000, 9000, 8500],
    };
    res.status(200).json({
      error: false,
      data: trends,
      message: "Tendencias financieras obtenidas correctamente",
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
      twoMonthsAfter: 24000,
    };
    res.status(200).json({
      error: false,
      data: forecasts,
      message: "Proyecciones financieras obtenidas correctamente",
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
      period2: 25000,
    };
    res.status(200).json({
      error: false,
      data: comparison,
      message: "Comparación por periodos obtenida correctamente",
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
      taxRate: 0.1,
      currency: "USD",
    };
    res.status(200).json({
      error: false,
      data: settings,
      message: "Configuración financiera obtenida correctamente",
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
      message: "Configuración financiera actualizada correctamente",
    });
  } catch (error) {
    next(error);
  }
};

// ⭐ OBTENER TODOS LOS PAGOS CON FILTROS
const getAllPayments = async (req, res, next) => {
  try {
    console.log('💰 [GET-ALL-PAYMENTS] Iniciando consulta');
    console.log('🕐 [GET-ALL-PAYMENTS] Hora Colombia:', formatForLogs(getColombiaTime()));
    console.log('📥 [GET-ALL-PAYMENTS] Query params:', req.query);

    const { 
      startDate, 
      endDate, 
      paymentMethod,
      paymentStatus,
      paymentType,
      bookingId,
      page = 1,
      limit = 50
    } = req.query;

    // Construir filtros
    const whereConditions = {};

    // Filtro por rango de fechas
    if (startDate && endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      
      if (start && end) {
        whereConditions.paymentDate = {
          [Op.between]: [toJSDate(start), toJSDate(end)]
        };
      }
    } else if (startDate) {
      const start = parseDate(startDate);
      if (start) {
        whereConditions.paymentDate = {
          [Op.gte]: toJSDate(start)
        };
      }
    } else if (endDate) {
      const end = parseDate(endDate);
      if (end) {
        whereConditions.paymentDate = {
          [Op.lte]: toJSDate(end)
        };
      }
    }

    // Filtro por método de pago
    if (paymentMethod) {
      whereConditions.paymentMethod = paymentMethod;
    }

    // Filtro por estado de pago
    if (paymentStatus) {
      whereConditions.paymentStatus = paymentStatus;
    } else {
      // Por defecto, solo mostrar pagos completados y autorizados
      whereConditions.paymentStatus = {
        [Op.in]: ['completed', 'authorized']
      };
    }

    // Filtro por tipo de pago
    if (paymentType) {
      whereConditions.paymentType = paymentType;
    }

    // Filtro por reserva específica
    if (bookingId) {
      whereConditions.bookingId = bookingId;
    }

    // Solo pagos positivos (excluir reembolsos negativos)
    whereConditions.amount = { [Op.gt]: 0 };

    console.log('🔍 [GET-ALL-PAYMENTS] Filtros aplicados:', whereConditions);

    // Calcular offset para paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Obtener pagos con información relacionada
    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['bookingId', 'status', 'roomNumber', 'checkIn', 'checkOut'],
          include: [
            {
              model: Room,
              as: 'room',
              attributes: ['roomNumber', 'type']
            },
            {
              model: Buyer,
              as: 'guest',
              attributes: ['scostumername', 'sdocno', 'selectronicmail']
            }
          ]
        }
      ],
      order: [['paymentDate', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    console.log(`✅ [GET-ALL-PAYMENTS] Encontrados ${count} pagos, mostrando ${payments.length}`);

    // Calcular totales
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Formatear datos para el frontend
    const formattedPayments = payments.map(payment => ({
      paymentId: payment.paymentId,
      amount: parseFloat(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentStatus: payment.paymentStatus,
      paymentType: payment.paymentType,
      paymentDate: payment.paymentDate,
      transactionId: payment.transactionId,
      paymentReference: payment.paymentReference,
      processedBy: payment.processedBy,
      includesExtras: payment.includesExtras,
      isReservationPayment: payment.isReservationPayment,
      isCheckoutPayment: payment.isCheckoutPayment,
      notes: payment.notes,
      booking: payment.booking ? {
        bookingId: payment.booking.bookingId,
        status: payment.booking.status,
        roomNumber: payment.booking.roomNumber,
        checkIn: payment.booking.checkIn,
        checkOut: payment.booking.checkOut,
        roomType: payment.booking.room?.type,
        guestName: payment.booking.guest?.scostumername,
        guestDocument: payment.booking.guest?.sdocno
      } : null
    }));

    // Calcular información de paginación
    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      error: false,
      success: true,
      message: 'Pagos obtenidos exitosamente',
      data: {
        payments: formattedPayments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: totalPages,
          hasMore: parseInt(page) < totalPages
        },
        summary: {
          totalAmount,
          count: payments.length,
          totalCount: count
        }
      },
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error('❌ [GET-ALL-PAYMENTS] Error:', error);
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
  updateFinancialSettings,
  getAllPayments,
};
