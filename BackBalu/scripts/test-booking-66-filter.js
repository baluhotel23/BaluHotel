const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway',
  { dialect: 'postgres', logging: false }
);

// Simular la función getDaysUntilCheckOut
function getDaysUntilCheckOut(checkOutDate) {
  if (!checkOutDate) return null;
  const today = new Date('2025-10-20T00:00:00.000Z'); // Fecha actual
  const checkOut = new Date(checkOutDate);
  const diffTime = checkOut - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Simular getRealPaymentSummary
function getRealPaymentSummary(booking) {
  const totalAmount = parseFloat(booking.totalAmount || 0);
  const extraCharges = parseFloat(booking.extraCharges || 0);
  const totalPaid = parseFloat(booking.totalPaid || 0);
  const totalPendiente = totalAmount + extraCharges - totalPaid;
  
  return {
    totalAmount,
    extraCharges,
    totalAPagar: totalAmount + extraCharges,
    totalPaid,
    totalPendiente
  };
}

async function testBooking66Filter() {
  try {
    console.log('🔍 Conectando a Railway...\n');
    await sequelize.authenticate();

    // Obtener la reserva #66 con sus relaciones
    const [results] = await sequelize.query(`
      SELECT 
        b."bookingId",
        b."status",
        b."roomNumber",
        b."checkIn",
        b."checkOut",
        b."actualCheckIn",
        b."actualCheckOut",
        b."totalAmount",
        (SELECT COALESCE(SUM(p."amount"), 0) FROM "Payments" p WHERE p."bookingId" = b."bookingId") as "totalPaid",
        (SELECT COALESCE(SUM(e."amount"), 0) FROM "ExtraCharges" e WHERE e."bookingId" = b."bookingId") as "extraCharges"
      FROM "Bookings" b
      WHERE b."bookingId" = 66
    `);

    if (!results || results.length === 0) {
      console.log('❌ Reserva #66 no encontrada');
      return;
    }

    const booking = results[0];

    console.log('📋 RESERVA #66 - DATOS:');
    console.log('================================================\n');
    console.log(`   ID: ${booking.bookingId}`);
    console.log(`   Status: "${booking.status}"`);
    console.log(`   Habitación: ${booking.roomNumber}`);
    console.log(`   Check-in: ${new Date(booking.checkIn).toLocaleDateString('es-ES')}`);
    console.log(`   Check-out: ${new Date(booking.checkOut).toLocaleDateString('es-ES')}`);
    console.log(`   Total: $${parseFloat(booking.totalAmount).toLocaleString('es-CL')}`);
    console.log(`   Pagado: $${parseFloat(booking.totalPaid).toLocaleString('es-CL')}`);
    console.log(`   Cargos extra: $${parseFloat(booking.extraCharges).toLocaleString('es-CL')}`);

    console.log('\n\n🧪 SIMULANDO FILTRO DE CHECKOUT:');
    console.log('================================================\n');

    // PASO 1: Calcular financials
    const financials = getRealPaymentSummary(booking);
    console.log('1️⃣ FINANCIALS:');
    console.log(`   Total a pagar: $${financials.totalAPagar.toLocaleString('es-CL')}`);
    console.log(`   Total pagado: $${financials.totalPaid.toLocaleString('es-CL')}`);
    console.log(`   Pendiente: $${financials.totalPendiente.toLocaleString('es-CL')}`);
    const hasFinancialIssues = financials.totalPendiente > 0;
    console.log(`   ✅ hasFinancialIssues = ${hasFinancialIssues}\n`);

    // PASO 2: Verificar si es "completed" sin pendientes
    console.log('2️⃣ VERIFICAR EXCLUSIÓN POR "COMPLETED":');
    const isCompletedWithoutPending = booking.status === "completed" && !hasFinancialIssues;
    console.log(`   status === "completed": ${booking.status === "completed"}`);
    console.log(`   !hasFinancialIssues: ${!hasFinancialIssues}`);
    console.log(`   ❌ ¿Se EXCLUYE? ${isCompletedWithoutPending ? 'SÍ (return false)' : 'NO (continúa)'}\n`);

    if (isCompletedWithoutPending) {
      console.log('   🛑 La reserva sería EXCLUIDA aquí (return false)');
      console.log('   ❌ NO APARECERÍA en CheckOut\n');
      await sequelize.close();
      return;
    }

    // PASO 3: Verificar condiciones de inclusión
    console.log('3️⃣ VERIFICAR CONDICIONES DE INCLUSIÓN:\n');

    const readyForCheckOut = booking.status === "checked-in";
    console.log(`   readyForCheckOut (status === "checked-in"): ${readyForCheckOut}`);
    console.log(`     → ${booking.status} === "checked-in" = ${readyForCheckOut}\n`);

    const needsPaymentProcessing = ["confirmed", "paid"].includes(booking.status);
    console.log(`   needsPaymentProcessing (["confirmed", "paid"].includes(status)): ${needsPaymentProcessing}`);
    console.log(`     → ["confirmed", "paid"].includes("${booking.status}") = ${needsPaymentProcessing}\n`);

    const isCompletedWithPending = booking.status === "completed" && hasFinancialIssues;
    console.log(`   isCompletedWithPending (completed && hasFinancialIssues): ${isCompletedWithPending}`);
    console.log(`     → "${booking.status}" === "completed" && ${hasFinancialIssues} = ${isCompletedWithPending}\n`);

    // PASO 4: Verificar si está vencida
    console.log('4️⃣ VERIFICAR SI ESTÁ VENCIDA:\n');
    const daysUntil = getDaysUntilCheckOut(booking.checkOut);
    console.log(`   getDaysUntilCheckOut("${booking.checkOut}"):`);
    console.log(`     Hoy: 2025-10-20`);
    console.log(`     Check-out: ${new Date(booking.checkOut).toLocaleDateString('es-ES')}`);
    console.log(`     Días hasta checkout: ${daysUntil}`);
    console.log(`     daysUntil < 0: ${daysUntil < 0}\n`);

    console.log(`   booking.bookingStatus?.isOverdue: ${booking.bookingStatus?.isOverdue || 'undefined'}\n`);

    const isOverdue = (booking.bookingStatus?.isOverdue) || (daysUntil < 0);
    console.log(`   isOverdue = bookingStatus.isOverdue || (daysUntil < 0)`);
    console.log(`   isOverdue = ${booking.bookingStatus?.isOverdue} || ${daysUntil < 0}`);
    console.log(`   ✅ isOverdue = ${isOverdue}\n`);

    // PASO 5: Decisión final
    console.log('\n5️⃣ DECISIÓN FINAL:\n');
    const shouldInclude = readyForCheckOut || needsPaymentProcessing || isCompletedWithPending || isOverdue;
    
    console.log('   shouldInclude = readyForCheckOut || needsPaymentProcessing || isCompletedWithPending || isOverdue');
    console.log(`   shouldInclude = ${readyForCheckOut} || ${needsPaymentProcessing} || ${isCompletedWithPending} || ${isOverdue}`);
    console.log(`   ✅ shouldInclude = ${shouldInclude}\n`);

    console.log('================================================');
    if (shouldInclude) {
      console.log('✅ LA RESERVA #66 DEBERÍA APARECER EN CHECKOUT');
      console.log(`   Razón: ${
        readyForCheckOut ? 'readyForCheckOut' :
        needsPaymentProcessing ? 'needsPaymentProcessing' :
        isCompletedWithPending ? 'isCompletedWithPending' :
        isOverdue ? 'isOverdue' : 'unknown'
      }`);
    } else {
      console.log('❌ LA RESERVA #66 NO DEBERÍA APARECER EN CHECKOUT');
      console.log('   No cumple ninguna condición');
    }
    console.log('================================================\n');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

testBooking66Filter();
