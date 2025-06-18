

require('dotenv').config();
const { sequelize } = require('../data');

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estructura real de la tabla Invoices...');
    
    const [columns] = await sequelize.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable, 
        column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Invoices' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Estructura de la tabla Invoices:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      
      if (col.column_name === 'id' && col.data_type !== 'uuid') {
        console.error(`🚨 PROBLEMA: El campo 'id' es ${col.data_type}, debería ser UUID`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTableStructure();