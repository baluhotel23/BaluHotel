const { Sequelize } = require('sequelize');

// Conexión directa a Railway
const sequelize = new Sequelize(
  'postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway',
  {
    dialect: 'postgres',
    logging: false,
  }
);

async function checkBooking66() {
  try {
    console.log('🔍 Conectando a Railway...');
    await sequelize.authenticate();
    console.log('✅ Conectado\n');

    // Consulta SQL directa sin usar modelos Sequelize
    const [booking] = await sequelize.query(`
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
        (SELECT COALESCE(SUM(e."amount"), 0) FROM "ExtraCharges" e WHERE e."bookingId" = b."bookingId") as "extraCharges",
        (SELECT string_agg(g."firstName" || ' ' || g."lastName", ', ') FROM "Guests" g WHERE g."bookingId" = b."bookingId") as "guests"
      FROM "Bookings" b
      WHERE b."bookingId" = 66
    `);

    if (!booking) {
      console.log('❌ Reserva #66 no encontrada en Railway');
      return;
    }

    console.log('📋 RESERVA #66 - DETALLES COMPLETOS:');
    console.log('================================================\n');

    // Datos básicos
    console.log('🏨 DATOS BÁSICOS:');
    console.log(`   ID: ${booking.bookingId}`);
    console.log(`   Estado: ${booking.status}`);
    console.log(`   Habitación: ${booking.roomNumber}`);
    console.log(`   Check-in programado: ${booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('es-ES') : 'NULL'}`);
    console.log(`   Check-out programado: ${booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('es-ES') : 'NULL'}`);
    console.log(`   Check-in real: ${booking.actualCheckIn || 'NULL'}`);
    console.log(`   Check-out real: ${booking.actualCheckOut || 'NULL'}`);

    // Huéspedes
    console.log('\n👥 HUÉSPEDES:');
    console.log(`   ${booking.guests || '(Sin huéspedes)'}`);

    // Financiero
    console.log('\n💰 FINANCIERO:');
    const totalAmount = parseFloat(booking.totalAmount || 0);
    const totalPaid = parseFloat(booking.totalPaid || 0);
    const extraCharges = parseFloat(booking.extraCharges || 0);
    const totalPendiente = totalAmount + extraCharges - totalPaid;

    console.log(`   Total reserva: $${totalAmount.toLocaleString('es-CL')}`);
    console.log(`   Cargos extra: $${extraCharges.toLocaleString('es-CL')}`);
    console.log(`   Total a pagar: $${(totalAmount + extraCharges).toLocaleString('es-CL')}`);
    console.log(`   Pagado: $${totalPaid.toLocaleString('es-CL')}`);
    console.log(`   Pendiente: $${totalPendiente.toLocaleString('es-CL')}`);
    console.log(`   ¿Pago completo?: ${totalPendiente <= 0 ? '✅ SÍ' : '❌ NO'}`);

    // Análisis de filtro CheckOut
    console.log('\n🔍 ANÁLISIS PARA FILTRO CHECKOUT:');
    console.log('================================================');
    
    const hasFinancialIssues = totalPendiente > 0;
    console.log(`   ¿Tiene saldo pendiente?: ${hasFinancialIssues ? '✅ SÍ ($' + totalPendiente.toLocaleString('es-CL') + ')' : '❌ NO'}`);
    
    const readyForCheckOut = booking.status === 'checked-in';
    console.log(`   ¿Status es "checked-in"?: ${readyForCheckOut ? '✅ SÍ' : '❌ NO (es "' + booking.status + '")'}`);
    
    const needsPaymentProcessing = ['confirmed', 'paid'].includes(booking.status);
    console.log(`   ¿Status es "confirmed" o "paid"?: ${needsPaymentProcessing ? '✅ SÍ' : '❌ NO'}`);
    
    const isCompletedWithPending = booking.status === 'completed' && hasFinancialIssues;
    console.log(`   ¿Es "completed" con pendiente?: ${isCompletedWithPending ? '✅ SÍ' : '❌ NO'}`);
    
    // Calcular días hasta check-out
    const checkOutDate = new Date(booking.checkOut);
    const today = new Date('2025-10-20'); // Fecha actual según contexto
    const daysUntil = Math.ceil((checkOutDate - today) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntil < 0;
    console.log(`   Días hasta check-out: ${daysUntil}`);
    console.log(`   ¿Está vencida?: ${isOverdue ? '✅ SÍ' : '❌ NO'}`);
    
    const shouldAppear = readyForCheckOut || needsPaymentProcessing || isCompletedWithPending || isOverdue;
    console.log(`\n   🎯 ¿DEBERÍA APARECER EN CHECKOUT?: ${shouldAppear ? '✅ SÍ' : '❌ NO'}`);
    
    if (!shouldAppear) {
      console.log('\n⚠️ RAZÓN POR LA QUE NO APARECE:');
      if (booking.status === 'completed' && !hasFinancialIssues && !isOverdue) {
        console.log('   ✋ Está "completed" sin saldo pendiente y no está vencida');
        console.log('   ✋ El filtro la excluye CORRECTAMENTE (ya hizo checkout)');
      } else if (booking.status === 'cancelled') {
        console.log('   ✋ Está cancelada');
      } else {
        console.log('   ⚠️ No cumple ninguna condición del filtro');
      }
    } else {
      console.log('\n✅ CUMPLE CONDICIONES PARA APARECER EN CHECKOUT');
      console.log('   Si no aparece en el frontend, revisar:');
      console.log('   1. ¿El backend la está enviando en la respuesta?');
      console.log('   2. ¿Hay filtros adicionales en el frontend?');
      console.log('   3. ¿Hay errores en consola del navegador?');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await sequelize.close();
  }
}

checkBooking66();
