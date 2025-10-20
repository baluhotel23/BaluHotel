require('dotenv').config();
const { Sequelize } = require('sequelize');

// Conectar directamente a Railway
const DATABASE_URL = 'postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function checkBooking66() {
  try {
    console.log('🔍 Conectando a Railway...');
    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    console.log('🔍 Consultando Booking #66...\n');

    // Query directa a la base de datos
    const [bookingResults] = await sequelize.query(`
      SELECT 
        "bookingId", 
        status, 
        "pointOfSale",
        "roomNumber",
        "checkIn",
        "checkOut",
        "totalAmount",
        "guestId",
        "createdAt",
        "updatedAt"
      FROM "Bookings" 
      WHERE "bookingId" = 66
    `);

    if (bookingResults.length === 0) {
      console.log('❌ Booking #66 no encontrado');
      return;
    }

    const booking = bookingResults[0];

    console.log('📋 INFORMACIÓN DE LA RESERVA:');
    console.log('================================');
    console.log('ID:', booking.bookingId);
    console.log('Estado:', booking.status);
    console.log('Punto de Venta:', booking.pointOfSale);
    console.log('Habitación:', booking.roomNumber);
    console.log('Check-in:', booking.checkIn);
    console.log('Check-out:', booking.checkOut);
    console.log('Total Amount:', booking.totalAmount);
    console.log('Guest ID:', booking.guestId);
    console.log('Creada:', booking.createdAt);
    console.log('Actualizada:', booking.updatedAt);
    console.log('\n');

    // Buscar pagos
    console.log('💰 CONSULTANDO PAGOS...\n');
    const [paymentResults] = await sequelize.query(`
      SELECT 
        "paymentId",
        "bookingId",
        amount,
        "paymentMethod",
        "paymentStatus",
        "paymentType",
        "createdAt",
        "updatedAt"
      FROM "Payments"
      WHERE "bookingId" = 66
      ORDER BY "createdAt" DESC
    `);

    console.log('💰 PAGOS REGISTRADOS:');
    console.log('================================');
    if (paymentResults.length > 0) {
      paymentResults.forEach((payment, index) => {
        console.log(`\n Pago #${index + 1}:`);
        console.log('  - ID:', payment.paymentId);
        console.log('  - Monto:', payment.amount);
        console.log('  - Método:', payment.paymentMethod);
        console.log('  - Estado:', payment.paymentStatus);
        console.log('  - Tipo:', payment.paymentType);
        console.log('  - Creado:', payment.createdAt);
        console.log('  - Actualizado:', payment.updatedAt);
      });

      const totalPaid = paymentResults
        .filter(p => p.paymentStatus === 'completed' || p.paymentStatus === 'authorized')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      console.log('\n📊 RESUMEN:');
      console.log('================================');
      console.log('Total a pagar:', booking.totalAmount);
      console.log('Total pagado:', totalPaid);
      console.log('Saldo:', parseFloat(booking.totalAmount) - totalPaid);
      console.log('¿Pagado completamente?', totalPaid >= parseFloat(booking.totalAmount) ? 'SÍ' : 'NO');
      console.log('\n🔍 DIAGNÓSTICO:');
      if (booking.status === 'cancelled') {
        console.log('⚠️ LA RESERVA ESTÁ CANCELADA');
        console.log('   Esto impide hacer checkout');
        if (totalPaid >= parseFloat(booking.totalAmount)) {
          console.log('   ⚠️ INCONSISTENCIA: Está completamente pagada pero cancelada');
          console.log('   ✅ SOLUCIÓN: Cambiar status a "paid" o "checked-in"');
        }
      }
    } else {
      console.log('No hay pagos registrados');
    }

    console.log('\n');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkBooking66();
