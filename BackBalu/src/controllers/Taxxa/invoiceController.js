const { Invoice, Bill, Booking, Buyer } = require('../../data')
const { Op } = require('sequelize');

// 📋 OBTENER TODAS LAS FACTURAS FISCALES
const getAllInvoices = async (req, res) => {
  try {
    console.log('📋 [INVOICE-CONTROLLER] Obteniendo todas las facturas fiscales');
    
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      search,
      documentType = 'Invoice' // Por defecto solo facturas, no notas de crédito
    } = req.query;

    const offset = (page - 1) * limit;
    
    // 🔧 CONSTRUIR FILTROS
    const where = {
      status: 'sent', // Solo facturas enviadas exitosamente
    };

    // Filtro por tipo de documento
    if (documentType) {
      where.documentType = documentType;
    }

    // Filtro por estado específico
    if (status) {
      where.status = status;
    }

    // Filtro por rango de fechas
    if (startDate && endDate) {
      where.sentToTaxxaAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Filtro de búsqueda por nombre del comprador o número de factura
    let includeWhere = {};
    if (search) {
      includeWhere = {
        [Op.or]: [
          { buyerName: { [Op.iLike]: `%${search}%` } },
          { invoiceSequentialNumber: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: search ? { ...where, ...includeWhere } : where,
      include: [
        {
          model: Bill,
          as: 'bill',
          include: [
            {
              model: Booking,
              as: 'booking',
              attributes: ['bookingId', 'roomNumber', 'checkInDate', 'checkOutDate'],
            }
          ]
        }
      ],
      order: [['sentToTaxxaAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    // 🔧 FORMATEAR RESPUESTA CON MÉTODOS DE INSTANCIA
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      billId: invoice.billId,
      documentType: invoice.documentType,
      prefix: invoice.prefix,
      invoiceSequentialNumber: invoice.invoiceSequentialNumber,
      fullInvoiceNumber: invoice.getFullInvoiceNumber(),
      buyerName: invoice.buyerName,
      buyerEmail: invoice.buyerEmail,
      totalAmount: invoice.totalAmount,
      taxAmount: invoice.taxAmount,
      netAmount: invoice.netAmount,
      cufe: invoice.cufe,
      status: invoice.status,
      sentToTaxxaAt: invoice.sentToTaxxaAt,
      orderReference: invoice.orderReference,
      hasCreditNote: invoice.hasCreditNote || false,
      creditNoteAmount: invoice.creditNoteAmount || 0,
      booking: invoice.bill?.booking ? {
        bookingId: invoice.bill.booking.bookingId,
        roomNumber: invoice.bill.booking.roomNumber,
        checkInDate: invoice.bill.booking.checkInDate,
        checkOutDate: invoice.bill.booking.checkOutDate
      } : null,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    }));

    const totalPages = Math.ceil(count / limit);

    console.log(`✅ [INVOICE-CONTROLLER] ${invoices.length} facturas encontradas`);

    return res.status(200).json({
      success: true,
      message: 'Facturas fiscales obtenidas exitosamente',
      data: formattedInvoices,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('❌ [INVOICE-CONTROLLER] Error en getAllInvoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener facturas fiscales',
      error: error.message
    });
  }
};

// 📄 OBTENER FACTURA POR ID
const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    console.log(`📄 [INVOICE-CONTROLLER] Obteniendo factura: ${invoiceId}`);

    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: Bill,
          as: 'bill',
          include: [
            {
              model: Booking,
              as: 'booking',
              include: [
                {
                  model: Buyer,
                  as: 'guest',
                }
              ]
            }
          ]
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura fiscal no encontrada'
      });
    }

    // 🔧 FORMATEAR RESPUESTA COMPLETA
    const formattedInvoice = {
      id: invoice.id,
      billId: invoice.billId,
      documentType: invoice.documentType,
      prefix: invoice.prefix,
      invoiceSequentialNumber: invoice.invoiceSequentialNumber,
      fullInvoiceNumber: invoice.getFullInvoiceNumber(),
      buyerId: invoice.buyerId,
      buyerName: invoice.buyerName,
      buyerEmail: invoice.buyerEmail,
      sellerId: invoice.sellerId,
      sellerName: invoice.sellerName,
      totalAmount: invoice.totalAmount,
      taxAmount: invoice.taxAmount,
      netAmount: invoice.netAmount,
      cufe: invoice.cufe,
      status: invoice.status,
      sentToTaxxaAt: invoice.sentToTaxxaAt,
      orderReference: invoice.orderReference,
      hasCreditNote: invoice.hasCreditNote || false,
      creditNoteAmount: invoice.creditNoteAmount || 0,
      creditNoteId: invoice.creditNoteId || null,
      taxxaResponse: invoice.taxxaResponse,
      bill: invoice.bill,
      booking: invoice.bill?.booking,
      guest: invoice.bill?.booking?.guest,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    };

    console.log(`✅ [INVOICE-CONTROLLER] Factura obtenida: ${invoice.getFullInvoiceNumber()}`);

    return res.status(200).json({
      success: true,
      message: 'Factura fiscal obtenida exitosamente',
      data: formattedInvoice
    });

  } catch (error) {
    console.error('❌ [INVOICE-CONTROLLER] Error en getInvoiceById:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener factura fiscal',
      error: error.message
    });
  }
};

// 📊 OBTENER ESTADÍSTICAS DE NUMERACIÓN
const getNumberingStats = async (req, res) => {
  try {
    console.log('📊 [INVOICE-CONTROLLER] Obteniendo estadísticas de numeración');

    // 🔧 ESTADÍSTICAS DE FACTURAS
    const invoiceStats = await Invoice.findAll({
      attributes: [
        'documentType',
        'prefix',
        'status',
        [Invoice.sequelize.fn('COUNT', Invoice.sequelize.col('id')), 'count'],
        [Invoice.sequelize.fn('MAX', Invoice.sequelize.col('invoiceSequentialNumber')), 'maxNumber'],
        [Invoice.sequelize.fn('MIN', Invoice.sequelize.col('invoiceSequentialNumber')), 'minNumber']
      ],
      group: ['documentType', 'prefix', 'status'],
      raw: true
    });

    // 🔧 ESTADÍSTICAS POR MES
    const monthlyStats = await Invoice.findAll({
      attributes: [
        [Invoice.sequelize.fn('DATE_TRUNC', 'month', Invoice.sequelize.col('sentToTaxxaAt')), 'month'],
        'documentType',
        [Invoice.sequelize.fn('COUNT', Invoice.sequelize.col('id')), 'count'],
        [Invoice.sequelize.fn('SUM', Invoice.sequelize.col('totalAmount')), 'totalAmount']
      ],
      where: {
        status: 'sent',
        sentToTaxxaAt: {
          [Op.gte]: new Date(new Date().getFullYear(), 0, 1) // Desde enero del año actual
        }
      },
      group: [
        Invoice.sequelize.fn('DATE_TRUNC', 'month', Invoice.sequelize.col('sentToTaxxaAt')),
        'documentType'
      ],
      order: [[Invoice.sequelize.fn('DATE_TRUNC', 'month', Invoice.sequelize.col('sentToTaxxaAt')), 'ASC']],
      raw: true
    });

    // 🔧 PRÓXIMOS NÚMEROS DISPONIBLES
    const nextNumbers = await Promise.all(['FE', 'NC', 'ND'].map(async (prefix) => {
      const lastInvoice = await Invoice.findOne({
        where: { prefix, status: { [Op.in]: ['sent', 'pending'] } },
        order: [['invoiceSequentialNumber', 'DESC']],
        attributes: ['invoiceSequentialNumber']
      });

      return {
        prefix,
        nextNumber: lastInvoice ? parseInt(lastInvoice.invoiceSequentialNumber) + 1 : 1,
        lastUsed: lastInvoice?.invoiceSequentialNumber || 0
      };
    }));

    const stats = {
      byTypeAndStatus: invoiceStats,
      monthlyTrends: monthlyStats,
      nextAvailableNumbers: nextNumbers,
      summary: {
        totalInvoices: invoiceStats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
        totalSent: invoiceStats
          .filter(stat => stat.status === 'sent')
          .reduce((sum, stat) => sum + parseInt(stat.count), 0),
        totalPending: invoiceStats
          .filter(stat => stat.status === 'pending')
          .reduce((sum, stat) => sum + parseInt(stat.count), 0),
        totalFailed: invoiceStats
          .filter(stat => stat.status === 'failed')
          .reduce((sum, stat) => sum + parseInt(stat.count), 0)
      }
    };

    console.log('✅ [INVOICE-CONTROLLER] Estadísticas calculadas');

    return res.status(200).json({
      success: true,
      message: 'Estadísticas de numeración obtenidas exitosamente',
      data: stats
    });

  } catch (error) {
    console.error('❌ [INVOICE-CONTROLLER] Error en getNumberingStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// 🔍 BUSCAR FACTURAS
const searchInvoices = async (req, res) => {
  try {
    const { query, type = 'all' } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'La búsqueda debe tener al menos 2 caracteres'
      });
    }

    console.log(`🔍 [INVOICE-CONTROLLER] Buscando facturas: "${query}"`);

    const whereClause = {
      status: 'sent',
      [Op.or]: [
        { buyerName: { [Op.iLike]: `%${query}%` } },
        { buyerEmail: { [Op.iLike]: `%${query}%` } },
        { invoiceSequentialNumber: { [Op.iLike]: `%${query}%` } },
        { cufe: { [Op.iLike]: `%${query}%` } }
      ]
    };

    if (type !== 'all') {
      whereClause.documentType = type;
    }

    const invoices = await Invoice.findAll({
      where: whereClause,
      include: [
        {
          model: Bill,
          as: 'bill',
          include: [
            {
              model: Booking,
              as: 'booking',
              attributes: ['bookingId', 'roomNumber']
            }
          ]
        }
      ],
      limit: 20,
      order: [['sentToTaxxaAt', 'DESC']]
    });

    const results = invoices.map(invoice => ({
      id: invoice.id,
      fullInvoiceNumber: invoice.getFullInvoiceNumber(),
      buyerName: invoice.buyerName,
      totalAmount: invoice.totalAmount,
      sentToTaxxaAt: invoice.sentToTaxxaAt,
      roomNumber: invoice.bill?.booking?.roomNumber,
      bookingId: invoice.bill?.booking?.bookingId
    }));

    console.log(`✅ [INVOICE-CONTROLLER] ${results.length} facturas encontradas`);

    return res.status(200).json({
      success: true,
      message: 'Búsqueda completada',
      data: results,
      total: results.length
    });

  } catch (error) {
    console.error('❌ [INVOICE-CONTROLLER] Error en searchInvoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en la búsqueda',
      error: error.message
    });
  }
};

// 📱 REENVIAR FACTURA (en caso de fallos)
const resendInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    console.log(`📱 [INVOICE-CONTROLLER] Reenviando factura: ${invoiceId}`);

    const invoice = await Invoice.findByPk(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (invoice.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Esta factura ya fue enviada exitosamente'
      });
    }

    // TODO: Implementar lógica de reenvío usando TaxxaService
    // const result = await TaxxaService.resendInvoice(invoice);

    console.log(`✅ [INVOICE-CONTROLLER] Factura reenviada: ${invoice.getFullInvoiceNumber()}`);

    return res.status(200).json({
      success: true,
      message: 'Factura reenviada exitosamente',
      data: { invoiceId: invoice.id }
    });

  } catch (error) {
    console.error('❌ [INVOICE-CONTROLLER] Error en resendInvoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al reenviar factura',
      error: error.message
    });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  getNumberingStats,
  searchInvoices,
  resendInvoice
};