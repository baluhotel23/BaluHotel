require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway', {
  dialect: 'postgres',
  logging: false
});

async function checkCurrentBookings() {
  try {
    console.log('🔍 Conectando a Railway...');
    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    // Ver distribución de estados
    console.log('📊 DISTRIBUCIÓN DE ESTADOS DE RESERVAS:');
    console.log('================================================\n');
    
    const [statusDistribution] = await sequelize.query(`
      SELECT 
        "status",
        COUNT(*) as "count",
        SUM(CASE WHEN "checkOut" >= CURRENT_DATE THEN 1 ELSE 0 END) as "activas",
        SUM(CASE WHEN "checkOut" < CURRENT_DATE THEN 1 ELSE 0 END) as "vencidas"
      FROM "Bookings"
      GROUP BY "status"
      ORDER BY "count" DESC
    `);
    
    console.log('Estado          | Total | Activas | Vencidas');
    console.log('----------------|-------|---------|----------');
    statusDistribution.forEach(row => {
      console.log(`${row.status.padEnd(15)} | ${row.count.toString().padStart(5)} | ${row.activas.toString().padStart(7)} | ${row.vencidas.toString().padStart(8)}`);
    });

    // Reservas en estado "paid" (completamente pagadas, listas para check-in)
    console.log('\n\n💰 RESERVAS EN ESTADO "PAID" (Listas para Check-in):');
    console.log('================================================\n');
    
    const [paidBookings] = await sequelize.query(`
      SELECT 
        b."bookingId",
        b."roomNumber",
        b."status",
        b."checkIn",
        b."checkOut",
        b."totalAmount",
        b."paymentCompletedAt",
        g."scostumername" as "guestName",
        COALESCE(SUM(p."amount"), 0) as "totalPaid"
      FROM "Bookings" b
      LEFT JOIN "Buyers" g ON b."guestId" = g."sdocno"
      LEFT JOIN "Payments" p ON b."bookingId" = p."bookingId" 
        AND p."paymentStatus" IN ('authorized', 'completed')
      WHERE b."status" = 'paid'
      GROUP BY b."bookingId", g."scostumername"
      ORDER BY b."checkIn" ASC
    `);
    
    if (paidBookings.length === 0) {
      console.log('✅ No hay reservas en estado "paid" actualmente');
    } else {
      console.log(`📋 ${paidBookings.length} reserva(s) encontrada(s):\n`);
      paidBookings.forEach(booking => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const now = new Date();
        const isToday = checkIn.toDateString() === now.toDateString();
        const isPast = checkIn < now;
        
        console.log(`🏨 Reserva #${booking.bookingId}:`);
        console.log(`   Habitación: ${booking.roomNumber}`);
        console.log(`   Huésped: ${booking.guestName || 'N/A'}`);
        console.log(`   Check-in: ${checkIn.toLocaleDateString()} ${isPast ? '(🔴 Pasado)' : isToday ? '(🟢 HOY)' : ''}`);
        console.log(`   Check-out: ${checkOut.toLocaleDateString()}`);
        console.log(`   Total: $${parseFloat(booking.totalAmount).toLocaleString()}`);
        console.log(`   Pagado: $${parseFloat(booking.totalPaid).toLocaleString()}`);
        console.log(`   Pago completo: ${booking.paymentCompletedAt ? new Date(booking.paymentCompletedAt).toLocaleString() : 'N/A'}`);
        console.log('');
      });
    }

    // Reservas en estado "checked-in"
    console.log('\n\n🏨 RESERVAS EN ESTADO "CHECKED-IN" (Hospedadas):');
    console.log('================================================\n');
    
    const [checkedInBookings] = await sequelize.query(`
      SELECT 
        b."bookingId",
        b."roomNumber",
        b."checkOut",
        b."totalAmount",
        g."scostumername" as "guestName",
        COALESCE(SUM(p."amount"), 0) as "totalPaid",
        COALESCE(SUM(e."amount" * e."quantity"), 0) as "totalExtras"
      FROM "Bookings" b
      LEFT JOIN "Buyers" g ON b."guestId" = g."sdocno"
      LEFT JOIN "Payments" p ON b."bookingId" = p."bookingId" 
        AND p."paymentStatus" IN ('authorized', 'completed')
      LEFT JOIN "ExtraCharges" e ON b."bookingId" = e."bookingId"
      WHERE b."status" = 'checked-in'
      GROUP BY b."bookingId", g."scostumername"
      ORDER BY b."checkOut" ASC
    `);
    
    if (checkedInBookings.length === 0) {
      console.log('✅ No hay reservas en estado "checked-in" actualmente');
    } else {
      console.log(`📋 ${checkedInBookings.length} reserva(s) encontrada(s):\n`);
      checkedInBookings.forEach(booking => {
        const checkOut = new Date(booking.checkOut);
        const total = parseFloat(booking.totalAmount) + parseFloat(booking.totalExtras);
        const paid = parseFloat(booking.totalPaid);
        const pending = total - paid;
        
        console.log(`🏨 Reserva #${booking.bookingId}:`);
        console.log(`   Habitación: ${booking.roomNumber}`);
        console.log(`   Huésped: ${booking.guestName || 'N/A'}`);
        console.log(`   Check-out: ${checkOut.toLocaleDateString()}`);
        console.log(`   Reserva: $${parseFloat(booking.totalAmount).toLocaleString()}`);
        console.log(`   Extras: $${parseFloat(booking.totalExtras).toLocaleString()}`);
        console.log(`   Total: $${total.toLocaleString()}`);
        console.log(`   Pagado: $${paid.toLocaleString()}`);
        console.log(`   Pendiente: $${pending.toLocaleString()} ${pending > 0 ? '⚠️' : '✅'}`);
        console.log('');
      });
    }

    // Reservas problemáticas (cancelled con pagos)
    console.log('\n\n⚠️ VERIFICACIÓN: Reservas "cancelled" con pagos:');
    console.log('================================================\n');
    
    const [problematicBookings] = await sequelize.query(`
      SELECT 
        b."bookingId",
        b."roomNumber",
        b."status",
        b."totalAmount",
        COALESCE(SUM(p."amount"), 0) as "totalPaid"
      FROM "Bookings" b
      LEFT JOIN "Payments" p ON b."bookingId" = p."bookingId" 
        AND p."paymentStatus" IN ('authorized', 'completed')
      WHERE b."status" = 'cancelled'
      GROUP BY b."bookingId"
      HAVING COALESCE(SUM(p."amount"), 0) > 0
      ORDER BY b."bookingId" DESC
    `);
    
    if (problematicBookings.length === 0) {
      console.log('✅ No hay reservas "cancelled" con pagos registrados');
    } else {
      console.log(`⚠️ ${problematicBookings.length} reserva(s) problemática(s) encontrada(s):\n`);
      problematicBookings.forEach(booking => {
        console.log(`🚫 Reserva #${booking.bookingId}: Hab ${booking.roomNumber} - $${parseFloat(booking.totalPaid).toLocaleString()} pagados`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkCurrentBookings();
