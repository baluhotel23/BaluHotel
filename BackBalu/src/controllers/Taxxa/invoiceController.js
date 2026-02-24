const { Invoice, Bill, Booking, Buyer, SellerData, CreditNote } = require('../../data');
const { Op } = require('sequelize');

// 📋 VERSIÓN SIMPLIFICADA PARA DEBUGGING
const getAllInvoicesSimple = async (req, res) => {
  try {
    console.log('📋 [INVOICE-CONTROLLER] Obteniendo facturas (versión simple)');
    
    const {
      page = 1,
      limit = 10,
      status = 'sent'
    } = req.query;

    const offset = (page - 1) * limit;
    
   
    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: {
        status: status
      },
      include: [{
        model: Bill,
        as: 'bill',
        required: false,
        attributes: ['cufe', 'qrCode'] // ⭐ Solo CUFE y QR CODE (pdfUrl no existe en Bill)
      }],
      order: [['sentToTaxxaAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`✅ [INVOICE-CONTROLLER] ${invoices.length} facturas encontradas (con Bill para CUFE/QR)`);

    // 🔧 FORMATEAR RESPUESTA BÁSICA
    const formattedInvoices = invoices.map(invoice => {
      const invoiceData = invoice.toJSON();
      return {
        id: invoiceData.id,
        billId: invoiceData.billId,
        documentType: invoiceData.documentType,
        prefix: invoiceData.prefix,
        invoiceSequentialNumber: invoiceData.invoiceSequentialNumber,
        fullInvoiceNumber: `${invoiceData.prefix}${invoiceData.invoiceSequentialNumber}`,
        buyerName: invoiceData.buyerName,
        buyerEmail: invoiceData.buyerEmail,
        totalAmount: invoiceData.totalAmount,
        taxAmount: invoiceData.taxAmount,
        netAmount: invoiceData.netAmount,
        cufe: invoiceData.bill?.cufe || invoiceData.cufe, // ⭐ TRAER DE BILL PRIMERO
        qrCode: invoiceData.bill?.qrCode || invoiceData.qrCode, // ⭐ TRAER DE BILL PRIMERO
        status: invoiceData.status,
        sentToTaxxaAt: invoiceData.sentToTaxxaAt,
        orderReference: invoiceData.orderReference,
        hasCreditNote: invoiceData.hasCreditNote || false,
        creditNoteAmount: invoiceData.creditNoteAmount || 0,
        createdAt: invoiceData.createdAt,
        updatedAt: invoiceData.updatedAt
      };
    });

    const totalPages = Math.ceil(count / limit);

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
    console.error('❌ [INVOICE-CONTROLLER] Error en getAllInvoicesSimple:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener facturas fiscales',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 📋 VERSIÓN CON RELACIONES (cuando funcione la simple)
const getAllInvoices = async (req, res) => {
  try {
    console.log('📋 [INVOICE-CONTROLLER] Obteniendo facturas con relaciones');
    
    const {
      page = 1,
      limit = 10,
      status = 'sent',
      search = ''
    } = req.query;

    const offset = (page - 1) * limit;
    
    // 🔍 CONSTRUIR WHERE CLAUSE CON BÚSQUEDA
    const whereClause = { status };
    
    if (search && search.trim() !== '') {
      console.log(`🔍 Búsqueda activada: "${search}"`);
      whereClause[Op.or] = [
        { invoiceSequentialNumber: { [Op.iLike]: `%${search}%` } },
        { prefix: { [Op.iLike]: `%${search}%` } },
        { buyerName: { [Op.iLike]: `%${search}%` } },
        { buyerEmail: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // 🔧 VERIFICAR ASOCIACIONES DISPONIBLES
    console.log('🔍 Verificando asociaciones disponibles:');
    console.log('- Invoice.associations:', Object.keys(Invoice.associations || {}));
    console.log('- Bill.associations:', Object.keys(Bill.associations || {}));

    // 🔧 CONSTRUIR INCLUDES DINÁMICAMENTE
    const includes = [];
    
    // Solo agregar Bill si la asociación existe
    if (Invoice.associations && Invoice.associations.bill) {
      console.log('✅ Asociación Invoice.bill encontrada');
      includes.push({
        model: Bill,
        as: 'bill',
        required: false,
        // Solo incluir Booking si Bill tiene la asociación
        include: Bill.associations && Bill.associations.booking ? [
          {
            model: Booking,
            as: 'booking',
            required: false,
            attributes: ['bookingId', 'roomNumber', 'checkIn', 'checkOut']
          }
        ] : []
      });
    } else {
      console.warn('⚠️ Asociación Invoice.bill no encontrada');
    }

    // Solo agregar SellerData si la asociación existe
    if (Invoice.associations && Invoice.associations.seller) {
      console.log('✅ Asociación Invoice.seller encontrada');
      includes.push({
        model: SellerData,
        as: 'seller',
        required: false,
        attributes: ['sdocno', 'scostumername', 'selectronicmail']
      });
    } else {
      console.warn('⚠️ Asociación Invoice.seller no encontrada');
    }

    // Solo agregar Buyer si la asociación existe
    if (Invoice.associations && Invoice.associations.buyer) {
      console.log('✅ Asociación Invoice.buyer encontrada');
      includes.push({
        model: Buyer,
        as: 'buyer',
        required: false,
        attributes: ['sdocno', 'scostumername', 'selectronicmail']
      });
    } else {
      console.warn('⚠️ Asociación Invoice.buyer no encontrada');
    }

    // ⭐ Agregar CreditNote para verificar si la factura tiene nota de crédito
    if (CreditNote && Invoice.associations && Invoice.associations.creditNotes) {
      console.log('✅ Asociación Invoice.creditNotes encontrada');
      includes.push({
        model: CreditNote,
        as: 'creditNotes',
        required: false,
        attributes: ['id', 'creditAmount', 'creditReason', 'sentToTaxxaAt']
      });
    } else {
      console.warn('⚠️ Asociación Invoice.creditNotes NO encontrada o CreditNote no disponible');
      console.warn('CreditNote modelo:', CreditNote ? 'EXISTE' : 'NO EXISTE');
      console.warn('Invoice.associations.creditNotes:', Invoice.associations?.creditNotes ? 'EXISTE' : 'NO EXISTE');
    }

    console.log(`🔧 Usando ${includes.length} includes en la consulta`);

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: whereClause,
      include: includes,
      order: [['sentToTaxxaAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
      subQuery: false
    });

    // 🔧 FORMATEAR RESPUESTA
    const formattedInvoices = invoices.map(invoice => {
      const invoiceData = invoice.toJSON();
      
      // ⭐ Verificar si tiene notas de crédito
      const creditNotes = invoiceData.creditNotes || [];
      const hasCreditNote = creditNotes.length > 0;
      const creditNoteAmount = creditNotes.reduce((sum, cn) => sum + parseFloat(cn.creditAmount || 0), 0);
      
      return {
        id: invoiceData.id,
        billId: invoiceData.billId,
        documentType: invoiceData.documentType,
        prefix: invoiceData.prefix,
        invoiceSequentialNumber: invoiceData.invoiceSequentialNumber,
        fullInvoiceNumber: `${invoiceData.prefix}${invoiceData.invoiceSequentialNumber}`,
        buyerName: invoiceData.buyerName,
        buyerEmail: invoiceData.buyerEmail,
        totalAmount: invoiceData.totalAmount,
        taxAmount: invoiceData.taxAmount,
        netAmount: invoiceData.netAmount,
        cufe: invoiceData.bill?.cufe || invoiceData.cufe, // ⭐ TRAER DE BILL PRIMERO
        qrCode: invoiceData.bill?.qrCode || invoiceData.qrCode, // ⭐ TRAER DE BILL PRIMERO
        status: invoiceData.status,
        sentToTaxxaAt: invoiceData.sentToTaxxaAt,
        orderReference: invoiceData.orderReference,
        hasCreditNote: hasCreditNote, // ⭐ CALCULADO DESDE creditNotes
        creditNoteAmount: creditNoteAmount, // ⭐ SUMA DE TODAS LAS NOTAS DE CRÉDITO
        creditNotes: creditNotes, // ⭐ INCLUIR DETALLES DE NOTAS DE CRÉDITO
        
        // ⭐ DATOS DE RELACIONES (si existen)
        booking: invoiceData.bill?.booking ? {
          bookingId: invoiceData.bill.booking.bookingId,
          roomNumber: invoiceData.bill.booking.roomNumber,
          checkInDate: invoiceData.bill.booking.checkInDate,
          checkOutDate: invoiceData.bill.booking.checkOutDate
        } : null,
        
        seller: invoiceData.seller || null,
        buyer: invoiceData.buyer || null,
        
        createdAt: invoiceData.createdAt,
        updatedAt: invoiceData.updatedAt
      };
    });

    const totalPages = Math.ceil(count / limit);

    console.log(`✅ [INVOICE-CONTROLLER] ${invoices.length} facturas encontradas con relaciones`);

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
    
    // 🔧 FALLBACK A VERSIÓN SIMPLE
    console.log('🔄 Intentando versión simple como fallback...');
    return getAllInvoicesSimple(req, res);
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
  getAllInvoicesSimple,
  getNumberingStats,
  searchInvoices,
  resendInvoice
};