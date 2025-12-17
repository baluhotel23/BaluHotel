/**
 * Script para verificar clasificación de pagos online vs local
 */

const { Payment, Booking } = require('../src/data');
const { Op } = require('sequelize');

async function testPaymentClassification() {
  try {
    console.log('🔍 Verificando clasificación de pagos...\n');

    // Rango de fechas del mes actual
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log('📅 Rango de fechas:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Total de pagos completados
    const totalRevenue = await Payment.sum('amount', {
      where: {
        paymentStatus: { [Op.in]: ['completed', 'authorized', 'partial'] },
        paymentDate: { [Op.between]: [startDate, endDate] }
      }
    }) || 0;

    console.log('\n💰 Total ingresos:', totalRevenue);

    // Pagos ONLINE usando paymentType
    const onlineRevenue = await Payment.sum('amount', {
      where: {
        paymentStatus: { [Op.in]: ['completed', 'authorized', 'partial'] },
        paymentDate: { [Op.between]: [startDate, endDate] },
        paymentType: 'online'
      }
    }) || 0;

    console.log('🌐 Ingresos ONLINE (paymentType="online"):', onlineRevenue);

    // Pagos LOCAL (todos los que NO son online)
    const localRevenue = await Payment.sum('amount', {
      where: {
        paymentStatus: { [Op.in]: ['completed', 'authorized', 'partial'] },
        paymentDate: { [Op.between]: [startDate, endDate] },
        paymentType: { [Op.in]: ['cash', 'card', 'reservation', 'checkout'] }
      }
    }) || 0;

    console.log('🏪 Ingresos LOCAL (otros paymentType):', localRevenue);

    // Verificar el pago específico de la reserva 189
    console.log('\n🔍 Verificando pago de reserva 189:');
    const payment189 = await Payment.findOne({
      where: { bookingId: 189 }
    });

    if (payment189) {
      console.log({
        bookingId: payment189.bookingId,
        amount: payment189.amount,
        paymentType: payment189.paymentType,
        paymentStatus: payment189.paymentStatus,
        paymentDate: payment189.paymentDate,
        estaEnRango: payment189.paymentDate >= startDate && payment189.paymentDate <= endDate
      });
    }

    // Listar TODOS los pagos online del mes
    console.log('\n📋 Pagos ONLINE del mes:');
    const onlinePayments = await Payment.findAll({
      where: {
        paymentStatus: { [Op.in]: ['completed', 'authorized', 'partial'] },
        paymentDate: { [Op.between]: [startDate, endDate] },
        paymentType: 'online'
      },
      attributes: ['paymentId', 'bookingId', 'amount', 'paymentType', 'paymentDate']
    });

    onlinePayments.forEach((p, i) => {
      console.log(`  ${i + 1}. Booking ${p.bookingId}: $${p.amount} - ${p.paymentDate}`);
    });

    console.log(`\nTotal pagos online encontrados: ${onlinePayments.length}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPaymentClassification();
