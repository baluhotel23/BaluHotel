/**
 * Script para verificar los campos del pago wompi de la reserva 189
 */

const { Payment } = require('../src/data');

async function checkWompiPayment() {
  try {
    console.log('🔍 Verificando pago wompi de reserva 189...\n');

    const payment = await Payment.findOne({
      where: { 
        bookingId: 189,
        paymentMethod: 'wompi'
      }
    });

    if (!payment) {
      console.error('❌ Pago wompi no encontrado');
      process.exit(1);
    }

    console.log('✅ PAGO ENCONTRADO:');
    console.log(JSON.stringify(payment.toJSON(), null, 2));

    console.log('\n📋 CAMPOS CLAVE:');
    console.log(`  paymentId: ${payment.paymentId}`);
    console.log(`  bookingId: ${payment.bookingId}`);
    console.log(`  amount: ${payment.amount}`);
    console.log(`  paymentMethod: ${payment.paymentMethod}`);
    console.log(`  paymentType: ${payment.paymentType}`);
    console.log(`  paymentStatus: ${payment.paymentStatus}`);
    console.log(`  paymentDate: ${payment.paymentDate}`);
    console.log(`  processedBy: ${payment.processedBy}`);
    
    console.log('\n💡 Para que aparezca en "Online" debe tener:');
    console.log('   paymentType: "online"');
    console.log('   paymentStatus: "completed"');
    
    if (payment.paymentType === 'online') {
      console.log('\n✅ El pago tiene paymentType="online" correcto');
    } else {
      console.log(`\n❌ El pago tiene paymentType="${payment.paymentType}" (debería ser "online")`);
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkWompiPayment();
