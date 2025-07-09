const { sequelize, Invoice, HotelSettings } = require('../src/data');

async function checkCurrentNumbering() {
  try {
    console.log('🔍 Verificando numeración actual...');
    
    // 🔧 CONSULTA BASADA EN TU MODELO REAL
    const invoices = await Invoice.findAll({
      where: {
        status: 'sent'
      },
      order: [['invoiceSequentialNumber', 'ASC']],
      attributes: [
        'id', 
        'invoiceSequentialNumber', 
        'prefix', 
        'sentToTaxxaAt', 
        'buyerName', 
        'totalAmount',
        'billId',
        'cufe',
        'status'
      ],
      raw: true
    });

    console.log(`\n📋 Facturas enviadas encontradas: ${invoices.length}`);
    
    if (invoices.length === 0) {
      console.log('   ❌ No se encontraron facturas enviadas');
    } else {
      console.log('\n📊 Lista de facturas enviadas:');
      invoices.forEach((invoice, index) => {
        const fullNumber = `${invoice.prefix}${invoice.invoiceSequentialNumber}`;
        const date = invoice.sentToTaxxaAt ? new Date(invoice.sentToTaxxaAt).toLocaleDateString() : 'Sin fecha';
        const buyer = invoice.buyerName || 'Sin comprador';
        const amount = parseFloat(invoice.totalAmount || 0).toLocaleString('es-CO', {
          style: 'currency',
          currency: 'COP'
        });
        
        console.log(`   ${(index + 1).toString().padStart(2, '0')}. ${fullNumber.padEnd(12)} | ${date.padEnd(10)} | ${buyer.substring(0, 25).padEnd(25)} | ${amount}`);
      });
    }

    // 🔧 VERIFICAR CONFIGURACIÓN ACTUAL
    const currentYear = new Date().getFullYear();
    const settingKey = `invoice_sequential_number_${currentYear}`;
    
    const setting = await HotelSettings.findOne({
      where: { key: settingKey }
    });

    console.log('\n⚙️ Configuración de numeración actual:');
    if (setting) {
      console.log(`   📝 Clave: ${setting.key}`);
      console.log(`   🔢 Próximo número configurado: ${setting.value}`);
      console.log(`   📄 Descripción: ${setting.description || 'Sin descripción'}`);
      console.log(`   🕒 Última actualización: ${new Date(setting.updatedAt).toLocaleString()}`);
    } else {
      console.log(`   ❌ No existe configuración para: ${settingKey}`);
    }

    // 🔧 ANÁLISIS DE NUMERACIÓN
    if (invoices.length > 0) {
      const numbers = invoices.map(inv => parseInt(inv.invoiceSequentialNumber)).sort((a, b) => a - b);
      const firstNumber = numbers[0];
      const lastNumber = numbers[numbers.length - 1];
      const shouldBeNext = lastNumber + 1;
      
      console.log('\n📊 Análisis de numeración:');
      console.log(`   🎯 Primera factura: ${invoices.find(inv => parseInt(inv.invoiceSequentialNumber) === firstNumber).prefix}${firstNumber}`);
      console.log(`   🏁 Última factura: ${invoices.find(inv => parseInt(inv.invoiceSequentialNumber) === lastNumber).prefix}${lastNumber}`);
      console.log(`   🔢 Total de facturas: ${invoices.length}`);
      console.log(`   ⏭️  Próximo número debería ser: ${shouldBeNext}`);
      
      // Verificar sincronización
      if (setting) {
        const configuredNext = parseInt(setting.value);
        if (configuredNext === shouldBeNext) {
          console.log(`   ✅ NUMERACIÓN SINCRONIZADA`);
        } else {
          console.log(`   ⚠️  DESINCRONIZACIÓN DETECTADA:`);
          console.log(`       🔧 Configurado: ${configuredNext}`);
          console.log(`       ✅ Debería ser: ${shouldBeNext}`);
          console.log(`       📏 Diferencia: ${configuredNext - shouldBeNext}`);
        }
      } else {
        console.log(`   ⚠️  FALTA CONFIGURACIÓN - Debe crearse con valor: ${shouldBeNext}`);
      }

      // 🔧 VERIFICAR CONTINUIDAD
      console.log('\n🔍 Verificando continuidad en la secuencia:');
      let hasGaps = false;
      const gaps = [];
      
      for (let i = 1; i < numbers.length; i++) {
        const expected = numbers[i-1] + 1;
        if (numbers[i] !== expected) {
          gaps.push(`${numbers[i-1]} → ${numbers[i]} (faltan: ${expected}-${numbers[i]-1})`);
          hasGaps = true;
        }
      }
      
      if (hasGaps) {
        console.log(`   ⚠️  Se detectaron ${gaps.length} saltos en la secuencia:`);
        gaps.forEach(gap => console.log(`       • ${gap}`));
      } else {
        console.log('   ✅ La secuencia es completamente continua');
      }

      // 🔧 VERIFICAR PREFIJOS
      const prefixes = [...new Set(invoices.map(inv => inv.prefix))];
      console.log(`\n🏷️  Prefijos utilizados: ${prefixes.join(', ')}`);
      
      prefixes.forEach(prefix => {
        const prefixInvoices = invoices.filter(inv => inv.prefix === prefix);
        const prefixNumbers = prefixInvoices.map(inv => parseInt(inv.invoiceSequentialNumber)).sort((a, b) => a - b);
        console.log(`   📌 ${prefix}: ${prefixNumbers.length} facturas (${prefixNumbers[0]} - ${prefixNumbers[prefixNumbers.length - 1]})`);
      });
    }

    // 🔧 VERIFICAR TODAS LAS CONFIGURACIONES DE NUMERACIÓN
    console.log('\n📋 Todas las configuraciones de numeración existentes:');
    const allNumberingSettings = await HotelSettings.findAll({
      where: {
        key: {
          [sequelize.Sequelize.Op.like]: '%sequential_number%'
        }
      },
      order: [['key', 'ASC']]
    });

    if (allNumberingSettings.length > 0) {
      allNumberingSettings.forEach(setting => {
        const isActive = setting.key === settingKey ? '🟢' : '⚪';
        console.log(`   ${isActive} ${setting.key}: ${setting.value} (${setting.description || 'Sin descripción'})`);
      });
    } else {
      console.log('   ❌ No se encontraron configuraciones de numeración');
    }

    // 🔧 GENERAR COMANDO DE CORRECCIÓN SI ES NECESARIO
    if (invoices.length > 0) {
      const lastNumber = Math.max(...invoices.map(inv => parseInt(inv.invoiceSequentialNumber)));
      const nextNumber = lastNumber + 1;
      
      if (!setting || parseInt(setting.value) !== nextNumber) {
        console.log('\n🔧 COMANDO PARA CORREGIR LA NUMERACIÓN:');
        
        if (!setting) {
          console.log(`\n   📝 Crear nueva configuración:`);
          console.log(`   INSERT INTO "HotelSettings" ("key", "value", "description", "category", "createdAt", "updatedAt")`);
          console.log(`   VALUES ('${settingKey}', '${nextNumber}', 'Número secuencial de facturas para ${currentYear}', 'invoicing', NOW(), NOW());`);
        } else {
          console.log(`\n   🔄 Actualizar configuración existente:`);
          console.log(`   UPDATE "HotelSettings" SET "value" = '${nextNumber}', "updatedAt" = NOW() WHERE "key" = '${settingKey}';`);
        }
        
        console.log(`\n   🎯 Después de ejecutar esto, el próximo número será: ${nextNumber}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error verificando numeración:', error.message);
    console.error('📍 Stack trace:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión a la base de datos cerrada');
  }
}

checkCurrentNumbering();