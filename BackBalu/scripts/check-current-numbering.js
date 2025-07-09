const { sequelize, Invoice, HotelSettings } = require('../src/data');

async function checkCurrentNumbering() {
  try {
    console.log('🔍 Verificando numeración actual...');
    
    // Facturas enviadas
    const invoices = await Invoice.findAll({
      where: {
        status: 'sent',
        documentType: 'Invoice'
      },
      order: [['invoiceSequentialNumber', 'ASC']],
      attributes: ['invoiceSequentialNumber', 'prefix', 'sentToTaxxaAt']
    });

    console.log('\n📋 Facturas enviadas:');
    invoices.forEach((invoice, index) => {
      console.log(`${index + 1}. ${invoice.prefix}${invoice.invoiceSequentialNumber} - ${invoice.sentToTaxxaAt}`);
    });

    // Configuración actual
    const currentYear = new Date().getFullYear();
    const setting = await HotelSettings.findOne({
      where: { key: `invoice_sequential_number_${currentYear}` }
    });

    console.log('\n⚙️ Configuración actual:');
    if (setting) {
      console.log(`   Próximo número configurado: ${setting.value}`);
    } else {
      console.log('   No hay configuración de numeración');
    }

    // Próximo número que debería ser
    const lastInvoice = invoices[invoices.length - 1];
    if (lastInvoice) {
      const shouldBeNext = parseInt(lastInvoice.invoiceSequentialNumber) + 1;
      console.log(`   Próximo número debería ser: ${shouldBeNext}`);
      
      if (setting && parseInt(setting.value) !== shouldBeNext) {
        console.log('⚠️  HAY DESINCRONIZACIÓN EN LA NUMERACIÓN');
      }
    }
    
  } catch (error) {
    console.error('❌ Error verificando numeración:', error);
  } finally {
    await sequelize.close();
  }
}

checkCurrentNumbering();