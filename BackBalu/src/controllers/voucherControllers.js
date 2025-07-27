const {Booking, Buyer, Voucher} = require('../data');
const { getColombiaTime, formatForLogs, formatColombiaDate } = require('../utils/dateUtils');
const { Op } = require('sequelize');

// GET ALL VOUCHERS (GET /vouchers)
const getAllVouchers = async (req, res) => {
  try {
    console.log("📋 [GET-ALL-VOUCHERS] Iniciando obtención de vouchers");
    console.log("🕐 [GET-ALL-VOUCHERS] Hora Colombia:", formatForLogs(getColombiaTime()));
    console.log("📥 [GET-ALL-VOUCHERS] Query params:", req.query);

    const {
      status = 'all',
      guestId = null,
      dateFrom = null,
      dateTo = null,
      includeExpired = 'false',
      page = 1,
      limit = 50
    } = req.query;

    // ⭐ CONSTRUIR FILTROS
    const whereClause = {};
    const now = getColombiaTime();

    // Filtro por estado
    if (status !== 'all') {
      if (status === 'available') {
        whereClause.status = 'active';
        whereClause.validUntil = { [Op.gt]: now };
      } else {
        whereClause.status = status;
      }
    }

    // Filtro por huésped
    if (guestId) {
      whereClause.guestId = guestId;
    }

    // Filtro por fechas de creación
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
    }

    // Excluir expirados si no se solicitan explícitamente
    if (includeExpired === 'false') {
      whereClause.validUntil = { [Op.gt]: now };
    }

    console.log("🔍 [GET-ALL-VOUCHERS] Filtros aplicados:", whereClause);

    // ⭐ OBTENER VOUCHERS CON PAGINACIÓN
    const offset = (page - 1) * limit;
    
    const { count, rows: vouchers } = await Voucher.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Buyer,
          as: 'guest',
          attributes: ['sdocno', 'scostumername', 'selectronicmail'],
          required: false
        },
        {
          model: Booking,
          as: 'originalBooking',
          attributes: ['bookingId', 'checkIn', 'checkOut', 'totalAmount', 'status'],
          required: false
        },
        {
          model: Booking,
          as: 'usedBooking',
          attributes: ['bookingId', 'checkIn', 'checkOut', 'totalAmount', 'status'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    console.log(`✅ [GET-ALL-VOUCHERS] Encontrados ${vouchers.length} vouchers de ${count} totales`);

    // ⭐ PROCESAR Y CATEGORIZAR VOUCHERS
    const processedVouchers = vouchers.map(voucher => {
      const isExpired = new Date(voucher.validUntil) < now;
      const isUsed = voucher.status === 'used';
      
      return {
        voucherId: voucher.voucherId,
        voucherCode: voucher.voucherCode,
        amount: parseFloat(voucher.amount),
        status: isExpired && voucher.status === 'active' ? 'expired' : voucher.status,
        validUntil: voucher.validUntil,
        createdAt: voucher.createdAt,
        usedAt: voucher.usedAt,
        usedBy: voucher.usedBy,
        notes: voucher.notes,
        guest: voucher.guest ? {
          id: voucher.guest.sdocno,
          name: voucher.guest.scostumername,
          email: voucher.guest.selectronicmail
        } : null,
        originalBooking: voucher.originalBooking ? {
          bookingId: voucher.originalBooking.bookingId,
          checkIn: formatColombiaDate(voucher.originalBooking.checkIn),
          totalAmount: parseFloat(voucher.originalBooking.totalAmount)
        } : null,
        usedBooking: voucher.usedBooking ? {
          bookingId: voucher.usedBooking.bookingId,
          checkIn: formatColombiaDate(voucher.usedBooking.checkIn),
          totalAmount: parseFloat(voucher.usedBooking.totalAmount)
        } : null,
        isExpired,
        isUsed,
        daysUntilExpiry: Math.ceil((new Date(voucher.validUntil) - now) / (1000 * 60 * 60 * 24))
      };
    });

    // ⭐ CATEGORIZAR VOUCHERS
    const available = processedVouchers.filter(v => v.status === 'active' && !v.isExpired);
    const used = processedVouchers.filter(v => v.isUsed);
    const expired = processedVouchers.filter(v => v.isExpired);

    // ⭐ CALCULAR ESTADÍSTICAS
    const statistics = {
      totalGenerated: count,
      totalUsed: used.length,
      totalExpired: expired.length,
      totalActive: available.length,
      totalValue: processedVouchers.reduce((sum, v) => sum + v.amount, 0),
      usedValue: used.reduce((sum, v) => sum + v.amount, 0),
      pendingValue: available.reduce((sum, v) => sum + v.amount, 0),
      expiredValue: expired.reduce((sum, v) => sum + v.amount, 0)
    };

    console.log("📊 [GET-ALL-VOUCHERS] Estadísticas:", statistics);

    res.json({
      error: false,
      message: `${count} voucher(s) obtenido(s) exitosamente`,
      data: {
        vouchers: processedVouchers,
        available,
        used,
        expired,
        statistics,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      },
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ [GET-ALL-VOUCHERS] Error general:", error);
    console.error("🕐 [GET-ALL-VOUCHERS] Hora del error:", formatForLogs(getColombiaTime()));

    res.status(500).json({
      error: true,
      message: "Error interno al obtener vouchers",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// VALIDATE VOUCHER (POST /vouchers/validate)
const validateVoucher = async (req, res) => {
  try {
    console.log("💳 [VALIDATE-VOUCHER] Iniciando validación de voucher");
    console.log("🕐 [VALIDATE-VOUCHER] Hora Colombia:", formatForLogs(getColombiaTime()));
    console.log("📥 [VALIDATE-VOUCHER] Body:", req.body);

    const {
      voucherCode,
      bookingId = null,
      validateAmount = false,
      requiredAmount = 0
    } = req.body;

    if (!voucherCode?.trim()) {
      return res.status(400).json({
        error: true,
        message: "Código de voucher es requerido"
      });
    }

    const now = getColombiaTime();
    
    // ⭐ BUSCAR VOUCHER
    const voucher = await Voucher.findOne({
      where: {
        voucherCode: voucherCode.trim().toUpperCase()
      },
      include: [
        {
          model: Buyer,
          as: 'guest',
          attributes: ['sdocno', 'scostumername', 'selectronicmail']
        },
        {
          model: Booking,
          as: 'originalBooking',
          attributes: ['bookingId', 'checkIn', 'totalAmount']
        }
      ]
    });

    if (!voucher) {
      return res.json({
        error: false,
        message: "Voucher no encontrado",
        data: {
          isValid: false,
          reason: "Código de voucher no existe",
          voucher: null
        }
      });
    }

    console.log("📋 [VALIDATE-VOUCHER] Voucher encontrado:", {
      voucherId: voucher.voucherId,
      status: voucher.status,
      amount: voucher.amount,
      validUntil: formatForLogs(voucher.validUntil)
    });

    // ⭐ VALIDACIONES
    let isValid = true;
    let reason = null;

    // Verificar si ya fue usado
    if (voucher.status === 'used') {
      isValid = false;
      reason = "Este voucher ya fue utilizado";
    }
    // Verificar si está cancelado
    else if (voucher.status === 'cancelled') {
      isValid = false;
      reason = "Este voucher fue cancelado";
    }
    // Verificar si está expirado
    else if (new Date(voucher.validUntil) < now) {
      isValid = false;
      reason = `Voucher expirado el ${formatColombiaDate(voucher.validUntil)}`;
    }
    // Verificar monto si se solicita
    else if (validateAmount && requiredAmount > 0) {
      if (parseFloat(voucher.amount) < requiredAmount) {
        isValid = false;
        reason = `Monto insuficiente. Voucher: $${parseFloat(voucher.amount).toLocaleString()}, Requerido: $${requiredAmount.toLocaleString()}`;
      }
    }

    const validationResult = {
      isValid,
      reason,
      voucher: isValid ? {
        voucherId: voucher.voucherId,
        voucherCode: voucher.voucherCode,
        amount: parseFloat(voucher.amount),
        validUntil: voucher.validUntil,
        status: voucher.status,
        guest: voucher.guest ? {
          id: voucher.guest.sdocno,
          name: voucher.guest.scostumername,
          email: voucher.guest.selectronicmail
        } : null,
        originalBooking: voucher.originalBooking ? {
          bookingId: voucher.originalBooking.bookingId,
          checkIn: formatColombiaDate(voucher.originalBooking.checkIn),
          totalAmount: parseFloat(voucher.originalBooking.totalAmount)
        } : null,
        daysUntilExpiry: Math.ceil((new Date(voucher.validUntil) - now) / (1000 * 60 * 60 * 24))
      } : null
    };

    console.log("✅ [VALIDATE-VOUCHER] Validación completada:", {
      isValid,
      reason: reason || "Voucher válido",
      amount: parseFloat(voucher.amount)
    });

    res.json({
      error: false,
      message: isValid ? "Voucher válido" : "Voucher no válido",
      data: validationResult,
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ [VALIDATE-VOUCHER] Error general:", error);
    res.status(500).json({
      error: true,
      message: "Error interno al validar voucher",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// USE VOUCHER (PUT /vouchers/:id/use)
const useVoucher = async (req, res) => {
  try {
    console.log("🎫 [USE-VOUCHER] Iniciando uso de voucher");
    console.log("🕐 [USE-VOUCHER] Hora Colombia:", formatForLogs(getColombiaTime()));
    console.log("📥 [USE-VOUCHER] Params:", req.params);
    console.log("📥 [USE-VOUCHER] Body:", req.body);

    const { voucherId } = req.params;
    const {
      bookingId,
      usedBy = 'staff',
      notes = '',
      appliedAmount = null
    } = req.body;

    if (!voucherId) {
      return res.status(400).json({
        error: true,
        message: "ID de voucher es requerido"
      });
    }

    if (!bookingId) {
      return res.status(400).json({
        error: true,
        message: "ID de reserva es requerido"
      });
    }

    const now = getColombiaTime();

    // ⭐ BUSCAR VOUCHER
    const voucher = await Voucher.findByPk(voucherId, {
      include: [
        {
          model: Buyer,
          as: 'guest',
          attributes: ['sdocno', 'scostumername', 'selectronicmail']
        }
      ]
    });

    if (!voucher) {
      return res.status(404).json({
        error: true,
        message: "Voucher no encontrado"
      });
    }

    // ⭐ VALIDAR VOUCHER
    if (voucher.status !== 'active') {
      return res.status(400).json({
        error: true,
        message: `Voucher no está disponible. Estado actual: ${voucher.status}`
      });
    }

    if (new Date(voucher.validUntil) < now) {
      return res.status(400).json({
        error: true,
        message: "Voucher expirado"
      });
    }

    // ⭐ BUSCAR RESERVA DE DESTINO
    const targetBooking = await Booking.findByPk(bookingId);
    if (!targetBooking) {
      return res.status(404).json({
        error: true,
        message: "Reserva de destino no encontrada"
      });
    }

    console.log("✅ [USE-VOUCHER] Voucher y reserva válidos:", {
      voucherId: voucher.voucherId,
      voucherAmount: voucher.amount,
      targetBookingId: targetBooking.bookingId,
      targetAmount: targetBooking.totalAmount
    });

    // ⭐ MARCAR VOUCHER COMO USADO
    const updatedVoucher = await voucher.update({
      status: 'used',
      usedBookingId: bookingId,
      usedAt: now,
      usedBy: usedBy,
      notes: notes || `Aplicado a reserva #${bookingId}`,
      metadata: {
        ...voucher.metadata,
        appliedAmount: appliedAmount || parseFloat(voucher.amount),
        appliedAt: formatForLogs(now),
        appliedToBooking: bookingId
      }
    });

    console.log("✅ [USE-VOUCHER] Voucher marcado como usado:", {
      voucherId: updatedVoucher.voucherId,
      usedAt: formatForLogs(updatedVoucher.usedAt),
      appliedAmount: appliedAmount || parseFloat(voucher.amount)
    });

    res.json({
      error: false,
      message: "Voucher aplicado exitosamente",
      data: {
        voucher: {
          voucherId: updatedVoucher.voucherId,
          voucherCode: updatedVoucher.voucherCode,
          amount: parseFloat(updatedVoucher.amount),
          status: updatedVoucher.status,
          usedAt: updatedVoucher.usedAt,
          usedBy: updatedVoucher.usedBy,
          appliedAmount: appliedAmount || parseFloat(voucher.amount)
        },
        booking: {
          bookingId: targetBooking.bookingId,
          totalAmount: parseFloat(targetBooking.totalAmount)
        },
        usedAt: formatForLogs(now)
      },
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ [USE-VOUCHER] Error general:", error);
    res.status(500).json({
      error: true,
      message: "Error interno al usar voucher",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// GET VOUCHER BY CODE (GET /vouchers/by-code/:code)
const getVoucherByCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code?.trim()) {
      return res.status(400).json({
        error: true,
        message: "Código de voucher es requerido"
      });
    }

    const voucher = await Voucher.findOne({
      where: {
        voucherCode: code.trim().toUpperCase()
      },
      include: [
        {
          model: Buyer,
          as: 'guest',
          attributes: ['sdocno', 'scostumername', 'selectronicmail']
        },
        {
          model: Booking,
          as: 'originalBooking',
          attributes: ['bookingId', 'checkIn', 'totalAmount']
        },
        {
          model: Booking,
          as: 'usedBooking',
          attributes: ['bookingId', 'checkIn', 'totalAmount']
        }
      ]
    });

    if (!voucher) {
      return res.status(404).json({
        error: true,
        message: "Voucher no encontrado"
      });
    }

    const now = getColombiaTime();
    const isExpired = new Date(voucher.validUntil) < now;

    res.json({
      error: false,
      message: "Voucher encontrado",
      data: {
        voucherId: voucher.voucherId,
        voucherCode: voucher.voucherCode,
        amount: parseFloat(voucher.amount),
        status: isExpired && voucher.status === 'active' ? 'expired' : voucher.status,
        validUntil: voucher.validUntil,
        createdAt: voucher.createdAt,
        usedAt: voucher.usedAt,
        guest: voucher.guest,
        originalBooking: voucher.originalBooking,
        usedBooking: voucher.usedBooking,
        isExpired,
        daysUntilExpiry: Math.ceil((new Date(voucher.validUntil) - now) / (1000 * 60 * 60 * 24))
      },
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ [GET-VOUCHER-BY-CODE] Error:", error);
    res.status(500).json({
      error: true,
      message: "Error interno al buscar voucher",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// GET VOUCHER STATISTICS (GET /vouchers/statistics)
const getVoucherStatistics = async (req, res) => {
  try {
    console.log("📊 [GET-VOUCHER-STATISTICS] Obteniendo estadísticas");

    const now = getColombiaTime();
    const {
      dateFrom = null,
      dateTo = null,
      guestId = null
    } = req.query;

    // ⭐ CONSTRUIR FILTROS
    const whereClause = {};
    if (guestId) whereClause.guestId = guestId;
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
    }

    // ⭐ OBTENER TODOS LOS VOUCHERS
    const allVouchers = await Voucher.findAll({
      where: whereClause,
      attributes: ['voucherId', 'amount', 'status', 'validUntil', 'usedAt', 'createdAt']
    });

    // ⭐ CALCULAR ESTADÍSTICAS
    const statistics = {
      totalGenerated: allVouchers.length,
      totalUsed: allVouchers.filter(v => v.status === 'used').length,
      totalExpired: allVouchers.filter(v => new Date(v.validUntil) < now && v.status === 'active').length,
      totalActive: allVouchers.filter(v => v.status === 'active' && new Date(v.validUntil) >= now).length,
      totalCancelled: allVouchers.filter(v => v.status === 'cancelled').length,
      
      totalValue: allVouchers.reduce((sum, v) => sum + parseFloat(v.amount), 0),
      usedValue: allVouchers.filter(v => v.status === 'used').reduce((sum, v) => sum + parseFloat(v.amount), 0),
      pendingValue: allVouchers.filter(v => v.status === 'active' && new Date(v.validUntil) >= now).reduce((sum, v) => sum + parseFloat(v.amount), 0),
      expiredValue: allVouchers.filter(v => new Date(v.validUntil) < now && v.status === 'active').reduce((sum, v) => sum + parseFloat(v.amount), 0),
      
      averageAmount: allVouchers.length > 0 ? allVouchers.reduce((sum, v) => sum + parseFloat(v.amount), 0) / allVouchers.length : 0,
      usageRate: allVouchers.length > 0 ? (allVouchers.filter(v => v.status === 'used').length / allVouchers.length) * 100 : 0
    };

    console.log("📊 [GET-VOUCHER-STATISTICS] Estadísticas calculadas:", statistics);

    res.json({
      error: false,
      message: "Estadísticas de vouchers obtenidas",
      data: statistics,
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ [GET-VOUCHER-STATISTICS] Error:", error);
    res.status(500).json({
      error: true,
      message: "Error interno al obtener estadísticas",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

module.exports = {
  getAllVouchers,
  validateVoucher,
  useVoucher,
  getVoucherByCode,
  getVoucherStatistics
}; 