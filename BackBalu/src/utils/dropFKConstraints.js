require('dotenv').config();
const { sequelize } = require('../data');

async function dropFKConstraints() {
  try {
    console.log('🔧 === ELIMINANDO RESTRICCIONES FK DE INVOICES ===');
    
    // 1. Verificar qué restricciones FK existen
    const [constraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'Invoices'
        AND kcu.column_name IN ('sellerId', 'buyerId');
    `);
    
    console.log('📊 Restricciones FK encontradas:');
    constraints.forEach(c => {
      console.log(`- ${c.constraint_name} (columna: ${c.column_name})`);
    });
    
    // 2. Eliminar cada restricción FK
    for (const constraint of constraints) {
      try {
        console.log(`🔧 Eliminando restricción: ${constraint.constraint_name}`);
        await sequelize.query(`
          ALTER TABLE "Invoices" 
          DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}";
        `);
        console.log(`✅ Restricción ${constraint.constraint_name} eliminada`);
      } catch (error) {
        console.error(`❌ Error eliminando ${constraint.constraint_name}:`, error.message);
      }
    }
    
    // 3. Verificar que se eliminaron
    const [remainingConstraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'Invoices'
        AND kcu.column_name IN ('sellerId', 'buyerId');
    `);
    
    if (remainingConstraints.length === 0) {
      console.log('\n✅ === TODAS LAS RESTRICCIONES FK ELIMINADAS ===');
      console.log('🎯 Ahora puedes crear facturas sin problemas de FK');
    } else {
      console.log('\n⚠️  Restricciones restantes:');
      remainingConstraints.forEach(c => {
        console.log(`- ${c.constraint_name} (${c.column_name})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

dropFKConstraints();