require('dotenv').config();
const { Invoice } = require('../data');

async function cleanAndTestInvoices() {
  try {
    console.log('🔍 === VERIFICANDO FACTURAS EXISTENTES ===');
    
    // 1. Verificar facturas existentes
    const existingInvoices = await Invoice.findAll({
      attributes: ['id', 'invoiceSequentialNumber', 'prefix', 'status'],
      order: [['invoiceSequentialNumber', 'ASC']]
    });
    
    console.log(`📊 Facturas existentes: ${existingInvoices.length}`);
    existingInvoices.forEach(inv => {
      console.log(`- ID: ${inv.id}, Número: ${inv.prefix}${inv.invoiceSequentialNumber}, Status: ${inv.status}`);
    });
    
    // 2. Limpiar facturas de prueba (opcional)
    const testInvoices = await Invoice.findAll({
      where: {
        orderReference: {
          [require('sequelize').Op.like]: 'BOOKING-%'
        }
      }
    });
    
    if (testInvoices.length > 0) {
      console.log(`🧹 Encontradas ${testInvoices.length} facturas de prueba`);
      console.log('¿Eliminar facturas de prueba? (y/n)');
      
      // Para este script, vamos a eliminarlas automáticamente
      console.log('🗑️  Eliminando facturas de prueba...');
      await Invoice.destroy({
        where: {
          orderReference: {
            [require('sequelize').Op.like]: 'BOOKING-%'
          }
        },
        force: true // Eliminación permanente
      });
      console.log('✅ Facturas de prueba eliminadas');
    }
    
    // 3. Obtener siguiente número disponible
    const lastInvoice = await Invoice.findOne({
      where: {
        status: ['sent', 'completed']
      },
      order: [['invoiceSequentialNumber', 'DESC']]
    });
    
    const nextNumber = lastInvoice ? 
      parseInt(lastInvoice.invoiceSequentialNumber) + 1 : 1;
    
    console.log(`🔢 Siguiente número disponible: ${nextNumber}`);
    
    // 4. Probar creación con número disponible
    const testData = {
      billId: 'd855115b-4331-4232-b759-1b60df09967b',
      invoiceSequentialNumber: String(nextNumber),
      prefix: 'FVK',
      buyerId: '1127578894',
      buyerName: 'Diana Vargas',
      buyerEmail: 'dagtiso@gmail.com',
      sellerId: '1121881455',
      sellerName: 'CASTAÑEDA RIVAS MARIA CATERINE',
      totalAmount: 75000,
      taxAmount: 0,
      netAmount: 75000,
      status: 'pending',
      orderReference: 'BOOKING-2-TEST'
    };
    
    console.log('💾 Probando creación con número disponible...');
    const testInvoice = await Invoice.create(testData);
    console.log(`✅ ¡ÉXITO! Invoice creado: ${testInvoice.id}`);
    
    // Limpiar inmediatamente
    await testInvoice.destroy({ force: true });
    console.log('🧹 Factura de prueba eliminada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    const { sequelize } = require('../data');
    await sequelize.close();
    process.exit(0);
  }
}

cleanAndTestInvoices();