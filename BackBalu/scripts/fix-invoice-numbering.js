/**
 * Script para corregir la numeración de facturas
 * Asegura que el último número usado sea 56 y el próximo sea 57
 */

const { Invoice, sequelize } = require('../src/data');
const { Op } = require('sequelize');

async function fixInvoiceNumbering() {
  try {
    console.log('🔍 === VERIFICACIÓN DE NUMERACIÓN DE FACTURAS ===\n');

    // 1. Ver todas las facturas y sus números
    const allInvoices = await Invoice.findAll({
      where: {
        invoiceSequentialNumber: { [Op.ne]: null }
      },
      order: [
        [sequelize.cast(sequelize.col('invoiceSequentialNumber'), 'INTEGER'), 'DESC']
      ],
      attributes: ['id', 'invoiceSequentialNumber', 'invoiceNumber', 'status', 'createdAt', 'billId']
    });

    console.log('📊 FACTURAS EXISTENTES:');
    console.log('════════════════════════════════════════════════════════════════');
    allInvoices.forEach((inv, index) => {
      console.log(`${index + 1}. Número secuencial: ${inv.invoiceSequentialNumber} | Número completo: ${inv.invoiceNumber} | Estado: ${inv.status} | Fecha: ${inv.createdAt.toISOString().split('T')[0]}`);
    });
    console.log('════════════════════════════════════════════════════════════════\n');

    if (allInvoices.length === 0) {
      console.log('✅ No hay facturas en el sistema. El próximo número será 56.\n');
      return;
    }

    // 2. Identificar números mayores a 56
    const numbersAbove56 = allInvoices.filter(inv => 
      parseInt(inv.invoiceSequentialNumber) > 56
    );

    if (numbersAbove56.length > 0) {
      console.log('⚠️  FACTURAS CON NÚMEROS MAYORES A 56 ENCONTRADAS:');
      console.log('════════════════════════════════════════════════════════════════');
      numbersAbove56.forEach(inv => {
        console.log(`   ID: ${inv.id}`);
        console.log(`   Número secuencial: ${inv.invoiceSequentialNumber}`);
        console.log(`   Número completo: ${inv.invoiceNumber}`);
        console.log(`   Estado: ${inv.status}`);
        console.log(`   BillId: ${inv.billId}`);
        console.log(`   Fecha: ${inv.createdAt.toISOString()}`);
        console.log('   ────────────────────────────────────────────────────────────');
      });
      console.log('════════════════════════════════════════════════════════════════\n');

      console.log('🔧 OPCIONES DE CORRECCIÓN:\n');
      console.log('1️⃣  OPCIÓN 1: Eliminar facturas con números > 56 (solo si son de prueba)');
      console.log('   → Esto dejará el número 56 como el último usado\n');
      
      console.log('2️⃣  OPCIÓN 2: Actualizar números > 56 para que sean <= 56');
      console.log('   → Renumerar estas facturas a números disponibles\n');
      
      console.log('3️⃣  OPCIÓN 3: Marcar facturas > 56 como canceladas/anuladas');
      console.log('   → Mantener el registro pero invalidar los números\n');

      console.log('⚠️  IMPORTANTE: Este script solo muestra información.');
      console.log('⚠️  Para aplicar correcciones, descomenta la función deseada abajo.\n');
    } else {
      const lastNumber = parseInt(allInvoices[0].invoiceSequentialNumber);
      console.log(`✅ El último número usado es: ${lastNumber}`);
      console.log(`✅ El próximo número será: ${lastNumber + 1}\n`);
      
      if (lastNumber === 56) {
        console.log('✅ ¡PERFECTO! El sistema está correctamente configurado.');
        console.log('✅ La próxima factura será la número 57.\n');
      } else if (lastNumber < 56) {
        console.log(`⚠️  El último número (${lastNumber}) es menor a 56.`);
        console.log(`⚠️  El próximo número será ${lastNumber + 1}, no 57.\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE CORRECCIÓN (DESCOMENTA LA QUE NECESITES)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OPCIÓN 1: Eliminar facturas con números > 56
 * ⚠️  CUIDADO: Esto elimina permanentemente los registros
 */
async function deleteInvoicesAbove56() {
  try {
    console.log('🗑️  Eliminando facturas con números > 56...\n');
    
    const deleted = await Invoice.destroy({
      where: {
        invoiceSequentialNumber: {
          [Op.gt]: '56'
        }
      }
    });
    
    console.log(`✅ ${deleted} factura(s) eliminada(s).\n`);
    
    // Verificar resultado
    const remaining = await Invoice.findOne({
      order: [
        [sequelize.cast(sequelize.col('invoiceSequentialNumber'), 'INTEGER'), 'DESC']
      ]
    });
    
    if (remaining) {
      console.log(`✅ Último número ahora: ${remaining.invoiceSequentialNumber}`);
    }
    
  } catch (error) {
    console.error('❌ Error eliminando:', error.message);
  }
}

/**
 * OPCIÓN 2: Marcar como canceladas las facturas > 56
 */
async function cancelInvoicesAbove56() {
  try {
    console.log('🚫 Marcando facturas > 56 como canceladas...\n');
    
    const updated = await Invoice.update(
      { status: 'cancelled' },
      {
        where: {
          invoiceSequentialNumber: {
            [Op.gt]: '56'
          }
        }
      }
    );
    
    console.log(`✅ ${updated[0]} factura(s) cancelada(s).\n`);
    
  } catch (error) {
    console.error('❌ Error cancelando:', error.message);
  }
}

/**
 * OPCIÓN 3: Actualizar manualmente un número específico
 * Ejemplo: cambiar el número 70 por 56
 */
async function updateSpecificInvoiceNumber(fromNumber, toNumber) {
  try {
    console.log(`🔄 Actualizando factura ${fromNumber} a ${toNumber}...\n`);
    
    const invoice = await Invoice.findOne({
      where: { invoiceSequentialNumber: fromNumber.toString() }
    });
    
    if (!invoice) {
      console.log(`❌ No se encontró factura con número ${fromNumber}`);
      return;
    }
    
    // Actualizar número secuencial y número completo
    await invoice.update({
      invoiceSequentialNumber: toNumber.toString(),
      invoiceNumber: `FVK${toNumber}` // Ajustar según tu formato
    });
    
    console.log(`✅ Factura actualizada de ${fromNumber} a ${toNumber}\n`);
    
  } catch (error) {
    console.error('❌ Error actualizando:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EJECUTAR SCRIPT
// ═══════════════════════════════════════════════════════════════════════════

// Por defecto solo muestra información
fixInvoiceNumbering();

// Para aplicar correcciones, descomenta UNA de estas líneas:

// deleteInvoicesAbove56();           // ⚠️ Elimina facturas > 56
// cancelInvoicesAbove56();           // 🚫 Cancela facturas > 56
// updateSpecificInvoiceNumber(70, 56); // 🔄 Cambia un número específico
