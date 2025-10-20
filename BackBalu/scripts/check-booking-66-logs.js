require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway', {
  dialect: 'postgres',
  logging: false
});

async function checkBooking66History() {
  try {
    console.log('🔍 Conectando a Railway...');
    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    // Ver booking completo
    console.log('📋 INFORMACIÓN COMPLETA DE BOOKING #66:');
    console.log('================================');
    
    const [booking] = await sequelize.query(`
      SELECT *
      FROM "Bookings" 
      WHERE "bookingId" = 66
    `);
    
    if (booking.length > 0) {
      console.log(JSON.stringify(booking[0], null, 2));
    }

    // Ver pagos
    console.log('\n\n💰 PAGOS DE BOOKING #66:');
    console.log('================================');
    
    const [payments] = await sequelize.query(`
      SELECT 
        "paymentId",
        "amount",
        "paymentMethod",
        "paymentStatus",
        "paymentType",
        "processedBy",
        "createdAt",
        "updatedAt"
      FROM "Payments" 
      WHERE "bookingId" = 66 
      ORDER BY "createdAt" ASC
    `);
    
    payments.forEach((payment, index) => {
      console.log(`\n🔹 Pago #${index + 1}:`);
      console.log(JSON.stringify(payment, null, 2));
    });

    console.log('\n\n⏱️ LÍNEA DE TIEMPO:');
    console.log('================================');
    if (booking.length > 0) {
      const b = booking[0];
      console.log(`📅 Reserva creada: ${b.createdAt}`);
      if (payments.length > 0) {
        payments.forEach((p, i) => {
          console.log(`💳 Pago #${i + 1}: ${p.createdAt} - $${p.amount} (${p.paymentMethod})`);
        });
      }
      if (b.statusUpdatedAt) {
        console.log(`🔄 Status actualizado: ${b.statusUpdatedAt}`);
        console.log(`   Por: ${b.statusUpdatedBy || 'N/A'}`);
        console.log(`   Razón: ${b.statusReason || 'N/A'}`);
      }
      if (b.cancelledAt) {
        console.log(`❌ Cancelada: ${b.cancelledAt}`);
        console.log(`   Por: ${b.cancelledBy || 'N/A'}`);
        console.log(`   Razón: ${b.cancellationReason || 'N/A'}`);
        console.log(`   Notas: ${b.cancellationNotes || 'N/A'}`);
      }
      console.log(`📝 Última actualización: ${b.updatedAt}`);
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBooking66History();
