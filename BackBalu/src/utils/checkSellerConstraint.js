require('dotenv').config();
const { sequelize } = require('../data');

async function checkSellerConstraint() {
  try {
    console.log('🔍 === VERIFICANDO RESTRICCIÓN DE SELLER ===');
    
    // 1. Verificar la restricción de clave foránea
    const [constraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'Invoices'
        AND kcu.column_name = 'sellerId';
    `);
    
    console.log('📊 Restricción de clave foránea:');
    constraints.forEach(c => {
      console.log(`- ${c.table_name}.${c.column_name} → ${c.foreign_table_name}.${c.foreign_column_name}`);
    });
    
    if (constraints.length > 0) {
      const foreignTable = constraints[0].foreign_table_name;
      const foreignColumn = constraints[0].foreign_column_name;
      
      console.log(`\n🔍 Verificando datos en tabla ${foreignTable}:`);
      
      // 2. Buscar sellers existentes
      const [sellers] = await sequelize.query(`
        SELECT ${foreignColumn}, scostumername 
        FROM "${foreignTable}" 
        ORDER BY "createdAt" DESC 
        LIMIT 10;
      `);
      
      console.log('📋 Sellers disponibles:');
      sellers.forEach(s => {
        console.log(`- ID: ${s[foreignColumn]}, Nombre: ${s.scostumername || 'N/A'}`);
      });
      
      // 3. Verificar si el seller problemático existe
      const problemSellerId = '1121881455';
      const [problemSeller] = await sequelize.query(`
        SELECT * FROM "${foreignTable}" 
        WHERE ${foreignColumn} = '${problemSellerId}';
      `);
      
      console.log(`\n🎯 Seller problemático (${problemSellerId}):`);
      if (problemSeller.length > 0) {
        console.log('✅ EXISTE en la tabla:', problemSeller[0]);
      } else {
        console.log('❌ NO EXISTE en la tabla');
        console.log('🔧 Necesitas usar un sellerId válido de la lista anterior');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkSellerConstraint();