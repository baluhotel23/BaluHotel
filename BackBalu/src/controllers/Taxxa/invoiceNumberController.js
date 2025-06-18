const { Invoice } = require('../../data');
const { Op } = require('sequelize');

// 🔧 CONFIGURACIÓN DE RESOLUCIÓN
const RESOLUTION_CONFIG = {
  from: 1,
  to: 500,
  prefix: "FVK",
  resolutionNumber: "18764001234567",
  startDate: "2024-01-01",
  endDate: "2024-12-31"
};

/**
 * Obtiene el siguiente número secuencial disponible
 */
const getNextInvoiceNumber = async () => {
  try {
    console.log('🔢 Obteniendo siguiente número de Invoice...');

    // Buscar el último número usado exitosamente
    const lastInvoice = await Invoice.findOne({
      where: {
        invoiceSequentialNumber: { [Op.ne]: null },
        status: 'sent'
      },
      order: [['invoiceSequentialNumber', 'DESC']],
      attributes: ['invoiceSequentialNumber', 'sentToTaxxaAt']
    });

    let nextNumber = RESOLUTION_CONFIG.from; // ✅ SIEMPRE EMPEZAR DESDE 1

    if (lastInvoice && lastInvoice.invoiceSequentialNumber) {
      const lastNumber = parseInt(lastInvoice.invoiceSequentialNumber);
      nextNumber = lastNumber + 1;
      
      console.log(`📊 Último número usado: ${lastNumber}`);
      console.log(`🔢 Siguiente número calculado: ${nextNumber}`);
    } else {
      console.log('📊 No hay invoices previos enviados exitosamente');
      console.log(`🔢 Comenzando desde el número inicial: ${nextNumber}`);
    }

    // Verificar que no exceda la resolución
    if (nextNumber > RESOLUTION_CONFIG.to) {
      throw new Error(`❌ Se ha alcanzado el límite de la resolución. Número ${nextNumber} excede el máximo ${RESOLUTION_CONFIG.to}`);
    }

    // ✅ VERIFICAR DISPONIBILIDAD CONSIDERANDO TODOS LOS ESTADOS
    // Buscar cualquier factura (pendiente, enviada, fallida) con ese número
    const existingInvoice = await Invoice.findOne({
      where: { 
        invoiceSequentialNumber: nextNumber.toString(),
        status: { [Op.in]: ['pending', 'sent'] } // Solo considerar activas
      }
    });

    if (existingInvoice) {
      console.warn(`⚠️ Número ${nextNumber} ya está en uso (estado: ${existingInvoice.status})`);
      console.log('🔍 Buscando siguiente número disponible...');
      return await findNextAvailableNumber(nextNumber + 1);
    }

    console.log(`✅ Número ${nextNumber} disponible para usar`);
    return nextNumber.toString();

  } catch (error) {
    console.error('❌ Error obteniendo siguiente número:', error.message);
    throw error;
  }
};

/**
 * Busca el siguiente número disponible en caso de conflicto
 */
const findNextAvailableNumber = async (startFrom) => {
  console.log(`🔍 Buscando número disponible desde: ${startFrom}`);
  
  for (let number = startFrom; number <= RESOLUTION_CONFIG.to; number++) {
    const existing = await Invoice.findOne({
      where: { 
        invoiceSequentialNumber: number.toString(),
        status: { [Op.in]: ['pending', 'sent'] } // Solo considerar activas
      }
    });

    if (!existing) {
      console.log(`✅ Número disponible encontrado: ${number}`);
      return number.toString();
    } else {
      console.log(`❌ Número ${number} ya en uso (estado: ${existing.status})`);
    }
  }

  throw new Error(`❌ No hay números disponibles en la resolución (${RESOLUTION_CONFIG.from}-${RESOLUTION_CONFIG.to})`);
};

/**
 * Crear una nueva factura fiscal (Invoice) con numeración secuencial
 */
const createInvoiceWithNumber = async (billData) => {
  try {
    console.log('📄 Iniciando creación de factura fiscal...');
    console.log('📋 Datos recibidos:', JSON.stringify(billData, null, 2));

    // ✅ OBTENER NÚMERO SECUENCIAL
    const nextNumber = await getNextInvoiceNumber();
    console.log(`🔢 Número asignado: ${nextNumber}`);
    
    const invoiceData = {
      billId: billData.billId,
      invoiceSequentialNumber: nextNumber,
      prefix: RESOLUTION_CONFIG.prefix,
      
      // Datos del comprador
      buyerId: billData.buyerId,
      buyerName: billData.buyerName,
      buyerEmail: billData.buyerEmail,
      
      // Datos del vendedor
      sellerId: billData.sellerId,
      sellerName: billData.sellerName,
      
      // Montos
      totalAmount: billData.totalAmount,
      taxAmount: billData.taxAmount || 0,
      netAmount: billData.netAmount || billData.totalAmount,
      
      // Resolución
      resolutionNumber: RESOLUTION_CONFIG.resolutionNumber,
      resolutionFrom: RESOLUTION_CONFIG.from,
      resolutionTo: RESOLUTION_CONFIG.to,
      resolutionStartDate: RESOLUTION_CONFIG.startDate,
      resolutionEndDate: RESOLUTION_CONFIG.endDate,
      
      // Referencia
      orderReference: billData.orderReference,
      
      status: 'pending'
    };

    console.log('📄 Datos de la factura a crear:', JSON.stringify(invoiceData, null, 2));

    const invoice = await Invoice.create(invoiceData);
    
    console.log(`✅ Factura fiscal creada exitosamente`);
    console.log(`📄 Invoice ID: ${invoice.id}`);
    console.log(`🔢 Número completo: ${invoice.getFullInvoiceNumber()}`);
    
    return invoice;

  } catch (error) {
    console.error('❌ Error creando factura fiscal:', error.message);
    console.error('📊 Stack trace:', error.stack);
    throw error;
  }
};

/**
 * Cancelar una factura fiscal y liberar su número
 */
const cancelInvoice = async (invoiceId) => {
  try {
    console.log(`🗑️ Cancelando factura fiscal: ${invoiceId}`);
    
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      throw new Error('Factura fiscal no encontrada');
    }

    if (invoice.status === 'sent') {
      throw new Error('No se puede cancelar una factura ya enviada exitosamente');
    }

    await invoice.update({ status: 'cancelled' });
    console.log(`✅ Factura fiscal cancelada. Número ${invoice.invoiceSequentialNumber} liberado.`);
    
    return invoice;

  } catch (error) {
    console.error('❌ Error cancelando factura fiscal:', error.message);
    throw error;
  }
};

/**
 * Obtener estadísticas de numeración
 */
const getNumberingStats = async () => {
  try {
    console.log('📊 Calculando estadísticas de numeración...');
    
    const totalSent = await Invoice.count({
      where: { status: 'sent' }
    });

    const totalPending = await Invoice.count({
      where: { status: 'pending' }
    });

    const totalCancelled = await Invoice.count({
      where: { status: 'cancelled' }
    });

    const totalFailed = await Invoice.count({
      where: { status: 'failed' }
    });

    // ✅ CALCULAR DISPONIBLES CORRECTAMENTE
    const used = totalSent + totalPending; // Enviadas + Pendientes = En uso
    const available = RESOLUTION_CONFIG.to - used;

    const lastUsed = await Invoice.findOne({
      where: { status: 'sent' },
      order: [['invoiceSequentialNumber', 'DESC']],
      attributes: ['invoiceSequentialNumber', 'sentToTaxxaAt']
    });

    // ✅ OBTENER SIGUIENTE NÚMERO SIN CREAR FACTURA
    let nextAvailable = null;
    try {
      nextAvailable = await getNextInvoiceNumber();
    } catch (error) {
      console.warn('⚠️ No se pudo calcular siguiente número:', error.message);
    }

    const stats = {
      resolution: RESOLUTION_CONFIG,
      counters: {
        sent: totalSent,
        pending: totalPending,
        cancelled: totalCancelled,
        failed: totalFailed,
        used: used,
        available: available
      },
      lastUsedNumber: lastUsed?.invoiceSequentialNumber || '0',
      nextAvailable: nextAvailable,
      percentage: Math.round((totalSent / RESOLUTION_CONFIG.to) * 100),
      isResolutionFull: available <= 0
    };

    console.log('📊 Estadísticas calculadas:', JSON.stringify(stats, null, 2));
    return stats;

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.message);
    throw error;
  }
};

module.exports = {
  getNextInvoiceNumber,
  createInvoiceWithNumber,
  cancelInvoice,
  getNumberingStats,
  RESOLUTION_CONFIG
};