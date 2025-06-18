require('dotenv').config();
const { Invoice } = require('../data');

async function testInvoiceCreation() {
  try {
    console.log('🔍 === PRUEBA DE CREACIÓN DE INVOICE ===');
    
    // 🔧 DATOS MÍNIMOS PARA PROBAR
    const minimalData = {
      billId: 'd855115b-4331-4232-b759-1b60df09967b',
      invoiceSequentialNumber: '1',
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
      orderReference: 'BOOKING-2-df09967b'
    };
    
    console.log('💾 Intentando crear con datos mínimos...');
    console.log('📋 Datos:', JSON.stringify(minimalData, null, 2));
    
    const invoice = await Invoice.create(minimalData);
    
    console.log('✅ ¡ÉXITO! Invoice creado:', invoice.id);
    
    // Limpiar el registro de prueba
    await invoice.destroy();
    console.log('🧹 Registro de prueba eliminado');
    
  } catch (error) {
    console.error('❌ Error en prueba:');
    console.error('- Message:', error.message);
    console.error('- SQL:', error.sql);
    console.error('- Parameters:', error.parameters);
    
    if (error.message.includes('invalid input syntax for type integer')) {
      const uuidMatch = error.message.match(/[0-9a-f-]{36}/);
      if (uuidMatch) {
        console.error('🎯 UUID problemático:', uuidMatch[0]);
      }
    }
  } finally {
    const { sequelize } = require('../data');
    await sequelize.close();
    process.exit(0);
  }
}

testInvoiceCreation();