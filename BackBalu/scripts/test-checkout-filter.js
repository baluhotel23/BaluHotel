require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway', {
  dialect: 'postgres',
  logging: false
});

async function testCheckOutFilter() {
  try {
    console.log('🔍 Conectando a Railway...');
    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    console.log('📊 SIMULANDO FILTRO DE CHECKOUT:');
    console.log('================================================\n');
    
    // Obtener todas las reservas con información de pagos
    const [bookings] = await sequelize.query(`
      SELECT 
        b."bookingId",
        b."roomNumber",
        b."status",
        b."checkIn",
        b."checkOut",
        b."totalAmount",
        b."guestId",
        g."scostumername" as "guestName",
        COALESCE(SUM(p."amount"), 0) as "totalPaid",
        COALESCE(SUM(e."amount" * e."quantity"), 0) as "totalExtras"
      FROM "Bookings" b
      LEFT JOIN "Buyers" g ON b."guestId" = g."sdocno"
      LEFT JOIN "Payments" p ON b."bookingId" = p."bookingId" 
        AND p."paymentStatus" IN ('authorized', 'completed')
      LEFT JOIN "ExtraCharges" e ON b."bookingId" = e."bookingId"
      GROUP BY b."bookingId", g."scostumername"
      ORDER BY b."checkOut" ASC
    `);

    console.log(`Total de reservas en DB: ${bookings.length}\n`);

    // Aplicar el filtro como lo hace useCheckOutLogic.js
    const filteredBookings = bookings.filter((booking) => {
      const totalAmount = parseFloat(booking.totalAmount) + parseFloat(booking.totalExtras);
      const totalPaid = parseFloat(booking.totalPaid);
      const hasFinancialIssues = totalPaid < totalAmount;
      
      // Excluir "completed" solo si NO tiene pagos pendientes
      if (booking.status === "completed" && !hasFinancialIssues) return false;

      // Incluir si:
      const readyForCheckOut = booking.status === "checked-in";
      const needsPaymentProcessing = ["confirmed", "paid"].includes(booking.status);
      const isCompletedWithPending = booking.status === "completed" && hasFinancialIssues;
      
      const now = new Date();
      const checkOutDate = new Date(booking.checkOut);
      const isOverdue = checkOutDate < now;

      const shouldInclude = readyForCheckOut || needsPaymentProcessing || isCompletedWithPending || isOverdue;
      
      if (shouldInclude) {
        console.log(`✅ INCLUIR - Reserva #${booking.bookingId}:`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Habitación: ${booking.roomNumber}`);
        console.log(`   Huésped: ${booking.guestName || 'N/A'}`);
        console.log(`   Total: $${totalAmount.toLocaleString()}`);
        console.log(`   Pagado: $${totalPaid.toLocaleString()}`);
        console.log(`   Pendiente: $${(totalAmount - totalPaid).toLocaleString()}`);
        console.log(`   Razón: ${
          readyForCheckOut ? 'Ready for checkout (checked-in)' :
          needsPaymentProcessing ? `Needs processing (${booking.status})` :
          isCompletedWithPending ? 'Completed with pending' :
          isOverdue ? 'Overdue' : 'Unknown'
        }`);
        console.log(`   Check-out: ${new Date(booking.checkOut).toLocaleDateString()} ${isOverdue ? '🔴 VENCIDA' : ''}`);
        console.log('');
      }

      return shouldInclude;
    });

    console.log('\n📊 RESUMEN DEL FILTRO:');
    console.log('================================================');
    console.log(`Total en DB: ${bookings.length}`);
    console.log(`Después del filtro: ${filteredBookings.length}`);
    console.log('');

    console.log('🔍 ESTADOS INCLUIDOS:');
    const statusCounts = {};
    filteredBookings.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n🔍 ESTADOS EXCLUIDOS:');
    const excludedBookings = bookings.filter(b => 
      !filteredBookings.find(fb => fb.bookingId === b.bookingId)
    );
    console.log(`Total excluidas: ${excludedBookings.length}`);
    
    const excludedStatus = {};
    excludedBookings.forEach(b => {
      excludedStatus[b.status] = (excludedStatus[b.status] || 0) + 1;
    });
    Object.entries(excludedStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCheckOutFilter();
