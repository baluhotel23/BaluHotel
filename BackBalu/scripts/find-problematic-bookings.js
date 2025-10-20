require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway', {
  dialect: 'postgres',
  logging: false
});

async function findProblematicBookings() {
  try {
    console.log('🔍 Conectando a Railway...');
    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    // Buscar reservas "cancelled" que tienen pagos completos
    console.log('🔍 BUSCANDO RESERVAS PROBLEMÁTICAS:');
    console.log('(Status "cancelled" pero con pagos completos)');
    console.log('================================================\n');
    
    const [problematicBookings] = await sequelize.query(`
      SELECT 
        b."bookingId",
        b."roomNumber",
        b."status",
        b."totalAmount",
        b."checkIn",
        b."checkOut",
        b."paymentCompletedAt",
        b."createdAt",
        b."updatedAt",
        COALESCE(SUM(p."amount"), 0) as "totalPaid",
        COUNT(p."paymentId") as "paymentCount"
      FROM "Bookings" b
      LEFT JOIN "Payments" p ON b."bookingId" = p."bookingId" 
        AND p."paymentStatus" IN ('authorized', 'completed')
      WHERE b."status" = 'cancelled'
      GROUP BY b."bookingId"
      HAVING COALESCE(SUM(p."amount"), 0) >= b."totalAmount"
      ORDER BY b."updatedAt" DESC
    `);

    if (problematicBookings.length === 0) {
      console.log('✅ No se encontraron reservas problemáticas');
      await sequelize.close();
      return;
    }

    console.log(`⚠️ ENCONTRADAS ${problematicBookings.length} RESERVAS PROBLEMÁTICAS:\n`);

    problematicBookings.forEach((booking, index) => {
      console.log(`📋 RESERVA #${booking.bookingId}:`);
      console.log(`   Habitación: ${booking.roomNumber}`);
      console.log(`   Check-in: ${new Date(booking.checkIn).toLocaleDateString()}`);
      console.log(`   Check-out: ${new Date(booking.checkOut).toLocaleDateString()}`);
      console.log(`   Monto Total: $${parseFloat(booking.totalAmount).toLocaleString()}`);
      console.log(`   Total Pagado: $${parseFloat(booking.totalPaid).toLocaleString()}`);
      console.log(`   Pagos: ${booking.paymentCount}`);
      console.log(`   Pago Completado: ${booking.paymentCompletedAt ? new Date(booking.paymentCompletedAt).toLocaleString() : 'N/A'}`);
      console.log(`   Última actualización: ${new Date(booking.updatedAt).toLocaleString()}`);
      console.log('');
    });

    // Ahora buscar si tienen extras pendientes
    console.log('\n💰 VERIFICANDO GASTOS EXTRAS:\n');
    console.log('================================================\n');

    for (const booking of problematicBookings) {
      const [extras] = await sequelize.query(`
        SELECT 
          "id",
          "description",
          "amount",
          "quantity",
          "createdAt"
        FROM "ExtraCharges"
        WHERE "bookingId" = ${booking.bookingId}
        ORDER BY "createdAt" DESC
      `);

      if (extras.length > 0) {
        const totalExtras = extras.reduce((sum, extra) => sum + (parseFloat(extra.amount) * extra.quantity), 0);
        console.log(`📋 RESERVA #${booking.bookingId} - Extras: $${totalExtras.toLocaleString()}`);
        extras.forEach(extra => {
          console.log(`   - ${extra.description}: $${parseFloat(extra.amount).toLocaleString()} x ${extra.quantity} = $${(parseFloat(extra.amount) * extra.quantity).toLocaleString()}`);
        });
        console.log('');
      }
    }

    // Resumen
    console.log('\n📊 RESUMEN:');
    console.log('================================================');
    console.log(`Total de reservas afectadas: ${problematicBookings.length}`);
    console.log('\n🔧 ACCIÓN REQUERIDA:');
    console.log('Estas reservas deberían estar en estado "paid" o "checked-in"');
    console.log('para permitir el checkout y cobro de extras.');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

findProblematicBookings();
