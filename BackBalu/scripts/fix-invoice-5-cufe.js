// Script para arreglar el CUFE de la factura ID 5
const db = require('../src/data');
const { Invoice, Bill } = db;

async function fixInvoice5() {
  try {
    console.log('🔧 Iniciando corrección de factura ID 5...');

    // Buscar la factura (incluyendo soft-deleted)
    const invoice = await Invoice.findByPk(5, { paranoid: false });
    if (!invoice) {
      console.error('❌ Factura ID 5 no encontrada');
      return;
    }

    console.log('📄 Factura encontrada:', {
      id: invoice.id,
      number: invoice.getFullInvoiceNumber(),
      cufe: invoice.cufe,
      status: invoice.status,
      deletedAt: invoice.deletedAt
    });

    // Buscar el bill asociado (incluyendo soft-deleted)
    const bill = await Bill.findByPk(invoice.billId, { paranoid: false });
    if (!bill) {
      console.error('❌ Bill no encontrado');
      return;
    }

    console.log('📋 Bill encontrado:', {
      idBill: bill.idBill,
      cufe: bill.cufe
    });

    // Actualizar el CUFE en la factura
    if (bill.cufe && !invoice.cufe) {
      await invoice.update({
        cufe: bill.cufe
      });
      console.log('✅ CUFE actualizado en factura:', bill.cufe);
    } else if (invoice.cufe) {
      console.log('ℹ️ La factura ya tiene CUFE');
    } else {
      console.log('⚠️ El bill no tiene CUFE para copiar');
    }

    console.log('🎉 Corrección completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await db.sequelize.close();
  }
}

fixInvoice5();
