const { Invoice, CreditNote, sequelize } = require('../../data'); // ✅ Importar sequelize y CreditNote desde data
const { Op } = require('sequelize');


const RESOLUTION_CONFIG = {
  from: 57, // ⚠️ AJUSTADO: Facturas 1-56 fueron manuales, comenzamos desde 57
  to: 500,
  prefix: "FVK",
  resolutionNumber: "18764093638527",
  startDate: "2025-05-23",
  endDate: "2025-05-27"
};
const logResolutionConfig = () => {
  console.log('🏛️ === CONFIGURACIÓN DE RESOLUCIÓN DIAN ===');
  console.log(`📋 Número de resolución: "${RESOLUTION_CONFIG.resolutionNumber}"`);
  console.log(`📊 Rango autorizado: ${RESOLUTION_CONFIG.from} - ${RESOLUTION_CONFIG.to}`);
  console.log(`📅 Vigencia: ${RESOLUTION_CONFIG.startDate} a ${RESOLUTION_CONFIG.endDate}`);
  console.log(`🏷️ Prefijo: "${RESOLUTION_CONFIG.prefix}"`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'no definido'}`);
  console.log(`🔗 Taxxa URL: ${process.env.TAXXA_API_URL || 'no definida'}`);
  console.log('===============================================');
};
/**
 * Obtiene el siguiente número secuencial disponible
 */
const getNextInvoiceNumber = async () => {
  try {
    console.log('🔢 Obteniendo siguiente número (Invoices + CreditNotes)...');

    // 🔧 BUSCAR EL ÚLTIMO NÚMERO USADO EN INVOICES
    const lastInvoice = await Invoice.findOne({
      where: {
        invoiceSequentialNumber: { [Op.ne]: null }
      },
      order: [
        [sequelize.cast(sequelize.col('invoiceSequentialNumber'), 'INTEGER'), 'DESC']
      ],
      attributes: ['invoiceSequentialNumber', 'status', 'createdAt']
    });

    // 🔧 BUSCAR EL ÚLTIMO NÚMERO USADO EN CREDITNOTES
    const lastCreditNote = await CreditNote.findOne({
      where: {
        creditNoteSequentialNumber: { [Op.ne]: null }
      },
      order: [
        [sequelize.cast(sequelize.col('creditNoteSequentialNumber'), 'INTEGER'), 'DESC']
      ],
      attributes: ['creditNoteSequentialNumber', 'status', 'createdAt']
    });

    let nextNumber;
    
    // Obtener el mayor número entre Invoices y CreditNotes
    const lastInvoiceNumber = lastInvoice ? parseInt(lastInvoice.invoiceSequentialNumber) : 0;
    const lastCreditNoteNumber = lastCreditNote ? parseInt(lastCreditNote.creditNoteSequentialNumber) : 0;
    const lastNumber = Math.max(lastInvoiceNumber, lastCreditNoteNumber);

    if (lastNumber > 0) {
      nextNumber = lastNumber + 1;
      
      console.log(`📊 Último número en Invoices: ${lastInvoiceNumber} (estado: ${lastInvoice?.status || 'N/A'})`);
      console.log(`� Último número en CreditNotes: ${lastCreditNoteNumber} (estado: ${lastCreditNote?.status || 'N/A'})`);
      console.log(`📊 Último número usado (mayor): ${lastNumber}`);
      console.log(`�🔢 Siguiente número calculado: ${nextNumber}`);
    } else {
      nextNumber = RESOLUTION_CONFIG.from;
      console.log('📊 No hay documentos previos');
      console.log(`🔢 Comenzando desde el número inicial: ${nextNumber}`);
    }

    // ✅ VERIFICAR QUE NO EXCEDA LA RESOLUCIÓN
    if (nextNumber > RESOLUTION_CONFIG.to) {
      throw new Error(`❌ Se ha alcanzado el límite de la resolución. Número ${nextNumber} excede el máximo ${RESOLUTION_CONFIG.to}`);
    }

    // 🔧 VERIFICAR DISPONIBILIDAD REAL EN AMBAS TABLAS
    const existingInvoice = await Invoice.findOne({
      where: { 
        invoiceSequentialNumber: nextNumber.toString()
      }
    });

    const existingCreditNote = await CreditNote.findOne({
      where: { 
        creditNoteSequentialNumber: nextNumber.toString()
      }
    });

    if (existingInvoice || existingCreditNote) {
      console.warn(`⚠️ Número ${nextNumber} ya está en uso`);
      if (existingInvoice) console.warn(`  - Encontrado en Invoices (estado: ${existingInvoice.status})`);
      if (existingCreditNote) console.warn(`  - Encontrado en CreditNotes (estado: ${existingCreditNote.status})`);
      console.log('🔍 Buscando siguiente número disponible...');
      return await findNextAvailableNumber(nextNumber);
    }

    console.log(`✅ Número ${nextNumber} disponible para usar`);
    return nextNumber.toString(); // ✅ Retornar como string

  } catch (error) {
    console.error('❌ Error obteniendo siguiente número:', error.message);
    throw error;
  }
};

// 🔧 FUNCIÓN AUXILIAR PARA ENCONTRAR SIGUIENTE NÚMERO DISPONIBLE
const findNextAvailableNumber = async (startFrom) => {
  try {
    console.log(`🔍 Buscando número disponible desde: ${startFrom}`);
    
    // ✅ OBTENER TODOS LOS NÚMEROS USADOS DE INVOICES
    const usedInvoiceNumbers = await Invoice.findAll({
      attributes: ['invoiceSequentialNumber'],
      where: {
        invoiceSequentialNumber: { [Op.ne]: null }
      },
      raw: true
    });

    // ✅ OBTENER TODOS LOS NÚMEROS USADOS DE CREDITNOTES
    const usedCreditNoteNumbers = await CreditNote.findAll({
      attributes: ['creditNoteSequentialNumber'],
      where: {
        creditNoteSequentialNumber: { [Op.ne]: null }
      },
      raw: true
    });

    // Combinar ambos conjuntos
    const usedSet = new Set([
      ...usedInvoiceNumbers.map(inv => parseInt(inv.invoiceSequentialNumber)),
      ...usedCreditNoteNumbers.map(cn => parseInt(cn.creditNoteSequentialNumber))
    ]);

    // ✅ BUSCAR PRIMER NÚMERO DISPONIBLE EN EL RANGO
    for (let i = startFrom; i <= RESOLUTION_CONFIG.to; i++) {
      if (!usedSet.has(i)) {
        console.log(`✅ Número ${i} disponible encontrado`);
        return i.toString();
      }
    }

    throw new Error(`❌ No hay números disponibles en el rango ${startFrom}-${RESOLUTION_CONFIG.to}`);
    
  } catch (error) {
    console.error('❌ Error buscando número disponible:', error.message);
    throw error;
  }
};

/**
 * Busca el siguiente número disponible en caso de conflicto
 */


/**
 * Crear una nueva factura fiscal (Invoice) con numeración secuencial
 */
const createInvoiceWithNumber = async (billData) => {
  try {
    console.log('🔍 === DEBUGGING INVOICE CREATION ===');
    console.log('📋 Datos recibidos:', JSON.stringify(billData, null, 2));
    
    // 🔧 VALIDAR TIPOS DE DATOS ANTES DE PROCESAR
    console.log('🔍 Validando tipos de datos recibidos:');
    console.log('- billId:', typeof billData.billId, '→', billData.billId);
    console.log('- buyerId:', typeof billData.buyerId, '→', billData.buyerId);
    console.log('- sellerId:', typeof billData.sellerId, '→', billData.sellerId);
    console.log('- totalAmount:', typeof billData.totalAmount, '→', billData.totalAmount);

    // ✅ OBTENER NÚMERO SECUENCIAL CON DEBUGGING DETALLADO
    console.log('🔢 === OBTENIENDO NÚMERO SECUENCIAL ===');
    console.log('🔄 Llamando a getNextInvoiceNumber()...');
    
    const nextNumber = await getNextInvoiceNumber();
    
    // 🔧 ANALIZAR EL RESULTADO DE getNextInvoiceNumber
    console.log('🔍 Análisis del número obtenido:');
    console.log('- Valor:', nextNumber);
    console.log('- Tipo:', typeof nextNumber);
    console.log('- Es null:', nextNumber === null);
    console.log('- Es undefined:', nextNumber === undefined);
    console.log('- Es NaN:', Number.isNaN(nextNumber));
    console.log('- Es número:', typeof nextNumber === 'number');
    console.log('- Es string:', typeof nextNumber === 'string');
    console.log('- String length:', nextNumber?.length);
    console.log('- Convertido a string:', String(nextNumber));
    console.log('- Convertido a número:', Number(nextNumber));
    
    // 🔧 VERIFICAR SI ES UN UUID POR ERROR
    if (typeof nextNumber === 'string' && /^[0-9a-f-]{36}$/i.test(nextNumber)) {
      console.error('🚨 ERROR: getNextInvoiceNumber() devolvió un UUID en lugar de un número!');
      console.error('🔍 UUID devuelto:', nextNumber);
      console.error('❌ Esto podría ser la causa del error "invalid input syntax for type integer"');
    }
    
    console.log(`🔢 Número final asignado: ${nextNumber} (tipo: ${typeof nextNumber})`);
    
    // 🔧 PREPARAR DATOS CON VALIDACIÓN EXHAUSTIVA
    console.log('🔧 === PREPARANDO DATOS PARA INVOICE ===');
    
    // Asegurar que nextNumber sea un string válido
    const safeNextNumber = String(nextNumber);
    console.log('🔧 Número convertido a string:', safeNextNumber);
    
    const invoiceData = {
      billId: billData.billId,
      invoiceSequentialNumber: safeNextNumber, // String del número
      prefix: RESOLUTION_CONFIG.prefix,
      
      // Datos del comprador
      buyerId: String(billData.buyerId).replace(/\s+/g, ''), // Limpiar espacios
      buyerName: billData.buyerName,
      buyerEmail: billData.buyerEmail,
      
      // Datos del vendedor - LIMPIAR ESPACIOS
      sellerId: String(billData.sellerId).replace(/\s+/g, ''), // Quitar espacios
      sellerName: billData.sellerName,
      
      // Montos - CONVERTIR A NÚMEROS
      totalAmount: parseFloat(billData.totalAmount),
      taxAmount: parseFloat(billData.taxAmount || 0),
      netAmount: parseFloat(billData.netAmount || billData.totalAmount),
      
      // Resolución - ASEGURAR TIPOS CORRECTOS
      resolutionNumber: RESOLUTION_CONFIG.resolutionNumber,
      resolutionFrom: parseInt(RESOLUTION_CONFIG.from),
      resolutionTo: parseInt(RESOLUTION_CONFIG.to),
      resolutionStartDate: RESOLUTION_CONFIG.startDate,
      resolutionEndDate: RESOLUTION_CONFIG.endDate,
      
      // Referencia
      orderReference: billData.orderReference,
      
      status: 'pending'
    };

    console.log('🔍 === VALIDACIÓN FINAL DE DATOS ===');
    console.log('📋 Datos preparados para Invoice:');
    Object.entries(invoiceData).forEach(([key, value]) => {
      console.log(`- ${key}: ${typeof value} → ${value}`);
      
      // 🔧 DETECTAR PROBLEMAS POTENCIALES
      if (typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)) {
        console.log(`  📋 ${key} contiene UUID: ${value}`);
        if (!['id', 'billId'].includes(key)) {
          console.warn(`  ⚠️  POSIBLE PROBLEMA: ${key} no debería contener UUID!`);
        }
      }
      
      if (typeof value === 'string' && value.includes(' ')) {
        console.warn(`  ⚠️  ${key} contiene espacios: "${value}"`);
      }
      
      if (value === null || value === undefined) {
        console.warn(`  ⚠️  ${key} es null/undefined`);
      }
    });

    console.log('💾 === CREANDO INVOICE EN BASE DE DATOS ===');
    
    const invoice = await Invoice.create(invoiceData);
    
    console.log(`✅ Factura fiscal creada exitosamente`);
    console.log(`📄 Invoice ID: ${invoice.id}`);
    console.log(`🔢 Número completo: ${invoice.getFullInvoiceNumber()}`);
    
    return invoice;

  } catch (error) {
    console.error('❌ === ERROR CREANDO FACTURA FISCAL ===');
    console.error('- Message:', error.message);
    console.error('- Name:', error.name);
    console.error('- Code:', error.code);
    console.error('- SQL:', error.sql);
    console.error('- Parameters:', error.parameters);
    console.error('- Parent:', error.parent?.message);
    console.error('- Original:', error.original?.message);
    console.error('- Stack:', error.stack);
    
    // 🔧 ANÁLISIS ESPECÍFICO PARA ERRORES DE TIPO
    if (error.message.includes('invalid input syntax for type integer')) {
      console.error('🚨 === ANÁLISIS DE ERROR DE TIPO INTEGER ===');
      
      const uuidMatch = error.message.match(/[0-9a-f-]{36}/);
      if (uuidMatch) {
        const problemUUID = uuidMatch[0];
        console.error('🎯 UUID problemático encontrado:', problemUUID);
        
        // Verificar si este UUID vino de getNextInvoiceNumber
        if (problemUUID === nextNumber) {
          console.error('💥 EL PROBLEMA ES QUE getNextInvoiceNumber() DEVOLVIÓ UN UUID!');
          console.error('🔧 getNextInvoiceNumber() debería devolver un número entero, no un UUID');
        }
        
        // Buscar en qué campo está
        console.error('🔍 Buscando el campo que contiene este UUID:');
        if (typeof billData === 'object') {
          Object.entries(billData).forEach(([key, value]) => {
            if (value === problemUUID) {
              console.error(`📍 Campo problemático: ${key} = ${value}`);
            }
          });
        }
      }
    }
    
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