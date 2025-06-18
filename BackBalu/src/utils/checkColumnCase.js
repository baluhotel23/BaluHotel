require('dotenv').config();
const { sequelize } = require('../data');

async function checkColumnCase() {
  try {
    console.log('🔍 === VERIFICANDO CASE DE COLUMNAS ===');
    
    // 1. Verificar columnas exactas en SellerData
    const [sellerColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'SellerData'
      ORDER BY column_name;
    `);
    
    console.log('📊 Columnas en SellerData (case exacto):');
    sellerColumns.forEach(col => {
      console.log(`- "${col.column_name}"`);
    });
    
    // 2. Verificar restricciones FK exactas
    const [constraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name as local_column,
        ccu.column_name as foreign_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'Invoices'
        AND kcu.column_name = 'sellerId';
    `);
    
    console.log('\n🔗 Restricciones FK para sellerId:');
    constraints.forEach(c => {
      console.log(`- Invoices."${c.local_column}" → SellerData."${c.foreign_column}"`);
    });
    
    // 3. Verificar si hay datos con diferentes variaciones de case
    console.log('\n🔍 Probando diferentes variaciones de columna:');
    
    const variations = ['sellerId', 'sellerid', 'sellerId', 'SELLERID'];
    
    for (const variation of variations) {
      try {
        const [result] = await sequelize.query(`
          SELECT "${variation}", "scostumername" 
          FROM "SellerData" 
          WHERE "isActive" = true 
          LIMIT 1;
        `);
        
        if (result.length > 0) {
          console.log(`✅ "${variation}" EXISTE:`, result[0]);
        }
      } catch (error) {
        console.log(`❌ "${variation}" NO EXISTE:`, error.message.includes('does not exist'));
      }
    }
    
    // 4. Verificar estructura real del modelo vs tabla
    console.log('\n🔍 === VERIFICANDO MODELO VS TABLA ===');
    
    const { SellerData } = require('../src/data');
    const modelAttributes = Object.keys(SellerData.rawAttributes);
    
    console.log('📋 Atributos del modelo SellerData:');
    modelAttributes.forEach(attr => {
      console.log(`- Modelo: "${attr}"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkColumnCase();