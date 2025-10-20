const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway',
  { dialect: 'postgres', logging: false }
);

async function testComponentFilters() {
  try {
    console.log('🔍 Conectando a Railway...\n');
    await sequelize.authenticate();

    // Obtener TODAS las reservas
    const [allBookings] = await sequelize.query(`
      SELECT 
        "bookingId",
        "status",
        "checkIn",
        "checkOut",
        "actualCheckIn",
        "actualCheckOut",
        "roomNumber",
        "inventoryVerified",
        "inventoryDelivered",
        "passengersCompleted",
        "totalAmount",
        (SELECT COALESCE(SUM(p."amount"), 0) FROM "Payments" p WHERE p."bookingId" = b."bookingId") as "totalPaid",
        (SELECT COALESCE(SUM(e."amount"), 0) FROM "ExtraCharges" e WHERE e."bookingId" = b."bookingId") as "extraCharges"
      FROM "Bookings" b
      ORDER BY "bookingId" DESC
    `);

    console.log(`📊 TOTAL EN BASE DE DATOS: ${allBookings.length} reservas\n`);
    console.log('═'.repeat(80));

    // CLASIFICAR RESERVAS
    const today = new Date('2025-10-20'); // Fecha actual
    
    const checkInBookings = [];
    const checkOutBookings = [];
    const completedBookings = [];
    const otherBookings = [];

    allBookings.forEach(booking => {
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);
      const isCheckInToday = checkInDate.toDateString() === today.toDateString();
      const isPastCheckIn = checkInDate < today;
      const isInStayPeriod = isPastCheckIn && checkOutDate >= today;
      const isPastCheckOut = checkOutDate < today;
      const totalPendiente = parseFloat(booking.totalAmount || 0) + parseFloat(booking.extraCharges || 0) - parseFloat(booking.totalPaid || 0);
      const hasFinancialIssues = totalPendiente > 0;

      // ===== FILTRO CHECK-IN =====
      // Solo: pending, confirmed, paid
      // Que NO hayan hecho check-in
      // Que NO estén completadas ni canceladas
      if (["pending", "confirmed", "paid"].includes(booking.status) && 
          booking.status !== "checked-in" && 
          booking.status !== "completed" && 
          booking.status !== "cancelled") {
        
        const needsPreparation = !booking.inventoryVerified || 
                                !booking.inventoryDelivered || 
                                !booking.passengersCompleted;
        
        if (needsPreparation) {
          checkInBookings.push({
            ...booking,
            reason: `${booking.status} - Pendiente de preparación`
          });
        }
      }

      // ===== FILTRO CHECK-OUT =====
      // 1. checked-in (siempre)
      // 2. completed con pendientes
      // 3. paid/confirmed SOLO si están VENCIDAS (pasó checkout sin hacer check-in)
      if (booking.status === "checked-in") {
        checkOutBookings.push({
          ...booking,
          reason: 'checked-in (huésped en habitación)'
        });
      } else if (booking.status === "completed" && hasFinancialIssues) {
        checkOutBookings.push({
          ...booking,
          reason: `completed con saldo pendiente: $${totalPendiente.toLocaleString()}`
        });
      } else if (["confirmed", "paid"].includes(booking.status) && isPastCheckOut) {
        // SOLO si ya pasó el checkout (vencida sin hacer check-in)
        checkOutBookings.push({
          ...booking,
          reason: `${booking.status} - VENCIDA (checkout era ${checkOutDate.toLocaleDateString()})`
        });
      }

      // ===== FILTRO COMPLETED =====
      // Solo completed (idealmente con actualCheckOut)
      if (booking.status === "completed" && !hasFinancialIssues) {
        completedBookings.push({
          ...booking,
          reason: booking.actualCheckOut ? 'Checkout completado' : 'Completada (sin actualCheckOut)'
        });
      }

      // ===== OTROS =====
      const isInCheckIn = checkInBookings.some(b => b.bookingId === booking.bookingId);
      const isInCheckOut = checkOutBookings.some(b => b.bookingId === booking.bookingId);
      const isInCompleted = completedBookings.some(b => b.bookingId === booking.bookingId);

      if (!isInCheckIn && !isInCheckOut && !isInCompleted) {
        otherBookings.push({
          ...booking,
          reason: booking.status === 'cancelled' ? 'Cancelada' : 
                  (booking.status === 'completed' && hasFinancialIssues) ? 'En CheckOut (con pendientes)' :
                  booking.status === 'checked-in' ? 'En CheckOut' :
                  checkInDate > today ? `Futura (check-in: ${checkInDate.toLocaleDateString()})` : 
                  'Sin categoría'
        });
      }
    });

    // MOSTRAR RESULTADOS
    console.log('\n📥 CHECK-IN (Preparación de habitaciones)');
    console.log('═'.repeat(80));
    console.log(`Total: ${checkInBookings.length} reservas\n`);
    if (checkInBookings.length > 0) {
      checkInBookings.forEach(b => {
        console.log(`  #${b.bookingId} | Hab ${b.roomNumber} | ${b.status} | ${b.reason}`);
        console.log(`    Check-in: ${new Date(b.checkIn).toLocaleDateString()}`);
        console.log(`    Requisitos: Inventario verificado: ${b.inventoryVerified ? '✅' : '❌'} | Entregado: ${b.inventoryDelivered ? '✅' : '❌'} | Pasajeros: ${b.passengersCompleted ? '✅' : '❌'}`);
        console.log();
      });
    } else {
      console.log('  (Sin reservas pendientes de preparación)\n');
    }

    console.log('\n🚪 CHECK-OUT (Cobros y salidas)');
    console.log('═'.repeat(80));
    console.log(`Total: ${checkOutBookings.length} reservas\n`);
    if (checkOutBookings.length > 0) {
      checkOutBookings.forEach(b => {
        const totalPendiente = parseFloat(b.totalAmount || 0) + parseFloat(b.extraCharges || 0) - parseFloat(b.totalPaid || 0);
        console.log(`  #${b.bookingId} | Hab ${b.roomNumber} | ${b.status} | ${b.reason}`);
        console.log(`    Check-out: ${new Date(b.checkOut).toLocaleDateString()}`);
        console.log(`    Financiero: Total: $${parseFloat(b.totalAmount).toLocaleString()} | Pagado: $${parseFloat(b.totalPaid).toLocaleString()} | Pendiente: $${totalPendiente.toLocaleString()}`);
        console.log();
      });
    } else {
      console.log('  (Sin reservas para checkout)\n');
    }

    console.log('\n✅ COMPLETED BOOKINGS (Historial)');
    console.log('═'.repeat(80));
    console.log(`Total: ${completedBookings.length} reservas\n`);
    if (completedBookings.length > 0) {
      completedBookings.slice(0, 10).forEach(b => {
        console.log(`  #${b.bookingId} | Hab ${b.roomNumber} | ${b.reason}`);
        console.log(`    Check-out: ${b.actualCheckOut ? new Date(b.actualCheckOut).toLocaleDateString() : 'Sin fecha'}`);
        console.log();
      });
      if (completedBookings.length > 10) {
        console.log(`  ... y ${completedBookings.length - 10} más\n`);
      }
    } else {
      console.log('  (Sin reservas completadas)\n');
    }

    console.log('\n📦 OTROS (No categorizados)');
    console.log('═'.repeat(80));
    console.log(`Total: ${otherBookings.length} reservas\n`);
    if (otherBookings.length > 0) {
      otherBookings.slice(0, 10).forEach(b => {
        console.log(`  #${b.bookingId} | Hab ${b.roomNumber} | ${b.status} | ${b.reason}`);
        console.log(`    Check-in: ${new Date(b.checkIn).toLocaleDateString()} | Check-out: ${new Date(b.checkOut).toLocaleDateString()}`);
        console.log();
      });
      if (otherBookings.length > 10) {
        console.log(`  ... y ${otherBookings.length - 10} más\n`);
      }
    } else {
      console.log('  (Todas las reservas están categorizadas correctamente)\n');
    }

    // RESUMEN
    console.log('\n📊 RESUMEN');
    console.log('═'.repeat(80));
    console.log(`  Total en BD: ${allBookings.length}`);
    console.log(`  Check-In: ${checkInBookings.length}`);
    console.log(`  Check-Out: ${checkOutBookings.length}`);
    console.log(`  Completed: ${completedBookings.length}`);
    console.log(`  Otros: ${otherBookings.length}`);
    console.log(`  Suma: ${checkInBookings.length + checkOutBookings.length + completedBookings.length + otherBookings.length}`);
    console.log();

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await sequelize.close();
  }
}

testComponentFilters();
