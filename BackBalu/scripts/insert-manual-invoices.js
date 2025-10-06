/**
 * Script para registrar las facturas manuales del 1 al 56
 * Esto permitirá que el sistema comience desde el 57
 */

const { Invoice, sequelize } = require('../src/data');

async function insertManualInvoices() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('📝 === REGISTRANDO FACTURAS MANUALES ===\n');
    console.log('🔄 Insertando facturas del 1 al 56...\n');

    const manualInvoices = [];
    
    // Crear registros para facturas manuales 1-56
    for (let i = 1; i <= 56; i++) {
      manualInvoices.push({
        invoiceSequentialNumber: i.toString(),
        invoiceNumber: `FVK${i}`,
        prefix: 'FVK',
        
        // Datos genéricos para facturas manuales
        buyerId: '000000000', // ID genérico para facturas manuales
        buyerName: 'FACTURA MANUAL',
        buyerEmail: 'manual@baluhotel.com',
        
        sellerId: '1121881455', // NIT de Balu Hotel
        sellerName: 'BALU HOTEL',
        
        totalAmount: 0,
        taxAmount: 0,
        netAmount: 0,
        
        // Resolución DIAN
        resolutionNumber: '18764093638527',
        resolutionFrom: 56,
        resolutionTo: 500,
        resolutionStartDate: '2025-05-23',
        resolutionEndDate: '2025-05-27',
        
        // Marcar como factura manual
        status: 'manual', // Estado especial para facturas manuales
        orderReference: `FACTURA_MANUAL_${i}`,
        
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Insertar todas las facturas
    await Invoice.bulkCreate(manualInvoices, { transaction });
    
    await transaction.commit();
    
    console.log('✅ Se insertaron 56 registros de facturas manuales\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ RESULTADO:');
    console.log('   • Facturas manuales: 1 - 56 registradas');
    console.log('   • Próxima factura automática: 57');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Verificar
    const lastInvoice = await Invoice.findOne({
      order: [
        [sequelize.cast(sequelize.col('invoiceSequentialNumber'), 'INTEGER'), 'DESC']
      ]
    });
    
    console.log(`📊 Última factura registrada: ${lastInvoice.invoiceSequentialNumber}`);
    console.log(`🔢 Próximo número a usar: ${parseInt(lastInvoice.invoiceSequentialNumber) + 1}\n`);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error insertando facturas manuales:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
insertManualInvoices();
