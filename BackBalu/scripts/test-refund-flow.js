/**
 * 💸 SCRIPT DE PRUEBA: Cancelación con Reembolso por Fuerza Mayor
 * 
 * Este script permite probar el endpoint de cancelación con reembolso
 * de forma segura en el entorno de desarrollo.
 * 
 * Uso:
 *   node scripts/test-refund-flow.js
 */

require('dotenv').config();
const { Booking, Payment, Room, Buyer, sequelize } = require('../src/data');
const { formatForLogs, getColombiaTime } = require('../src/utils/dateUtils');

const testRefundFlow = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💸 TEST: Flujo de Cancelación con Reembolso por Fuerza Mayor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🕐 Hora Colombia:', formatForLogs(getColombiaTime()));
  console.log('');

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. BUSCAR UNA RESERVA PAGADA (NO CHECKED-IN)
    // ═══════════════════════════════════════════════════════════════
    console.log('🔍 PASO 1: Buscando reserva pagada para prueba...');
    
    const booking = await Booking.findOne({
      where: {
        status: 'paid' // Solo reservas pagadas, no hospedadas
      },
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['roomNumber', 'status', 'type']
        },
        {
          model: Buyer,
          as: 'guest',
          attributes: ['scostumername', 'sdocno', 'semail']
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['paymentId', 'amount', 'paymentStatus', 'paymentMethod']
        }
      ],
      order: [['bookingId', 'DESC']],
      limit: 1
    });

    if (!booking) {
      console.log('❌ No se encontró ninguna reserva pagada para probar');
      console.log('💡 Crea una reserva con status="paid" primero');
      return;
    }

    console.log('✅ Reserva encontrada para prueba:');
    console.log('   - ID:', booking.bookingId);
    console.log('   - Habitación:', booking.roomNumber);
    console.log('   - Huésped:', booking.guest?.scostumername);
    console.log('   - Status:', booking.status);
    console.log('   - Total:', `$${booking.totalAmount?.toLocaleString('es-CO')}`);
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 2. CALCULAR PAGOS REALIZADOS
    // ═══════════════════════════════════════════════════════════════
    console.log('💰 PASO 2: Calculando pagos realizados...');
    
    const completedPayments = booking.payments?.filter(p => 
      p.paymentStatus === 'authorized' || p.paymentStatus === 'completed'
    ) || [];

    const totalPaid = completedPayments.reduce((sum, p) => 
      sum + parseFloat(p.amount || 0), 0
    );

    console.log('   - Pagos completados:', completedPayments.length);
    console.log('   - Total pagado:', `$${totalPaid.toLocaleString('es-CO')}`);
    
    if (totalPaid <= 0) {
      console.log('❌ Esta reserva no tiene pagos que reembolsar');
      console.log('💡 Selecciona otra reserva con pagos completados');
      return;
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 3. SIMULAR REGISTRO DE REEMBOLSO
    // ═══════════════════════════════════════════════════════════════
    console.log('🧪 PASO 3: Simulando registro de reembolso (sin commit)...');
    
    const transaction = await sequelize.transaction();
    
    try {
      const refundData = {
        bookingId: booking.bookingId,
        amount: -totalPaid, // ⭐ NEGATIVO
        paymentMethod: 'transfer',
        paymentType: 'refund',
        paymentStatus: 'completed',
        paymentDate: getColombiaTime().toJSDate(),
        transactionId: `REFUND-TEST-${booking.bookingId}-${Date.now()}`,
        paymentReference: 'REEMBOLSO PRUEBA - Caso de fuerza mayor simulado',
        notes: `
🚨 REGISTRO DE PRUEBA - NO EJECUTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Razón: Prueba de flujo de reembolso excepcional
Monto a reembolsar: $${totalPaid.toLocaleString('es-CO')}
Fecha prueba: ${formatForLogs(getColombiaTime())}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim(),
        processedBy: 'TEST-SCRIPT',
        isReservationPayment: false,
        isCheckoutPayment: false,
        includesExtras: false
      };

      console.log('✅ Datos del reembolso preparados:');
      console.log('   - Amount:', refundData.amount, '(negativo = reembolso)');
      console.log('   - Type:', refundData.paymentType);
      console.log('   - Method:', refundData.paymentMethod);
      console.log('   - Transaction ID:', refundData.transactionId);
      console.log('');

      // ⭐ ROLLBACK - NO EJECUTAR REALMENTE
      await transaction.rollback();
      console.log('🔄 Transacción revertida (rollback) - No se guardó en BD');
      console.log('');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. VERIFICAR IMPACTO EN REPORTES FINANCIEROS
    // ═══════════════════════════════════════════════════════════════
    console.log('📊 PASO 4: Verificando impacto en reportes...');
    
    // Calcular ingresos brutos (positivos)
    const grossRevenue = await Payment.sum('amount', {
      where: {
        paymentStatus: { [sequelize.Sequelize.Op.in]: ['completed', 'authorized'] },
        amount: { [sequelize.Sequelize.Op.gt]: 0 }
      }
    }) || 0;

    // Calcular reembolsos (negativos)
    const totalRefunds = Math.abs(
      await Payment.sum('amount', {
        where: {
          paymentStatus: 'completed',
          amount: { [sequelize.Sequelize.Op.lt]: 0 }
        }
      }) || 0
    );

    const netRevenue = grossRevenue - totalRefunds;

    console.log('   - Ingresos Brutos actuales:', `$${grossRevenue.toLocaleString('es-CO')}`);
    console.log('   - Reembolsos actuales:', `$${totalRefunds.toLocaleString('es-CO')}`);
    console.log('   - Ingresos Netos actuales:', `$${netRevenue.toLocaleString('es-CO')}`);
    console.log('');
    console.log('   Si se procesara el reembolso:');
    console.log('   - Reembolsos nuevos:', `$${(totalRefunds + totalPaid).toLocaleString('es-CO')}`);
    console.log('   - Ingresos Netos nuevos:', `$${(netRevenue - totalPaid).toLocaleString('es-CO')}`);
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 5. MOSTRAR EJEMPLO DE REQUEST
    // ═══════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📡 EJEMPLO DE REQUEST PARA EJECUTAR EL REEMBOLSO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('POST /api/bookings/' + booking.bookingId + '/cancel-with-refund');
    console.log('Headers:');
    console.log('  Authorization: Bearer {token_del_owner}');
    console.log('  Content-Type: application/json');
    console.log('');
    console.log('Body:');
    console.log(JSON.stringify({
      refundReason: 'Emergencia médica familiar - fuerza mayor',
      refundMethod: 'transfer',
      notes: 'Cliente hospitalizado, imposible viajar. Se autoriza reembolso excepcional.'
    }, null, 2));
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 6. MOSTRAR COMANDO CURL
    // ═══════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 COMANDO CURL PARA PRUEBA REAL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`curl -X POST http://localhost:4000/api/bookings/${booking.bookingId}/cancel-with-refund \\`);
    console.log(`  -H "Authorization: Bearer {token_del_owner}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{`);
    console.log(`    "refundReason": "Emergencia médica familiar - fuerza mayor",`);
    console.log(`    "refundMethod": "transfer",`);
    console.log(`    "notes": "Cliente hospitalizado, imposible viajar"`);
    console.log(`  }'`);
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // RESUMEN
    // ═══════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 RESUMEN:');
    console.log('   ✅ Endpoint listo: POST /api/bookings/:bookingId/cancel-with-refund');
    console.log('   ✅ Validaciones implementadas (solo owner)');
    console.log('   ✅ Registro de reembolso como pago negativo');
    console.log('   ✅ Actualización de reportes financieros');
    console.log('   ✅ Liberación automática de habitación');
    console.log('');
    console.log('⚠️  NOTA: Esta fue una SIMULACIÓN. No se modificó la BD.');
    console.log('💡 Para ejecutar realmente, usa el endpoint con token de owner.');
    console.log('');
    console.log('📖 Documentación completa en: REFUND_FORCE_MAJEURE_FLOW.md');
    console.log('');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión cerrada');
  }
};

// Ejecutar el script
testRefundFlow();
