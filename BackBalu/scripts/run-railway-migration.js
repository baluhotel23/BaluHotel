const { Sequelize } = require('sequelize');
const Umzug = require('umzug');
const path = require('path');

// Credenciales de Railway
const DATABASE_URL = 'postgresql://postgres:QSwYCDumogbbHCXfMKQIyCXOlKuljZSM@yamabiko.proxy.rlwy.net:35806/railway';

console.log('🚀 Conectando a la base de datos de Railway...');

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

const umzug = new Umzug({
  migrations: {
    path: path.join(__dirname, '..', 'migrations'),
    params: [
      sequelize.getQueryInterface(),
      Sequelize
    ]
  },
  storage: 'sequelize',
  storageOptions: {
    sequelize: sequelize,
    tableName: 'SequelizeMeta'
  }
});

async function runMigration() {
  try {
    // Probar conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a Railway establecida correctamente');

    // Verificar tabla Expenses
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Expenses';
    `);
    
    console.log('\n📋 Columnas actuales en tabla Expenses:');
    results.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Ver migraciones pendientes
    const pending = await umzug.pending();
    console.log('\n📝 Migraciones pendientes:', pending.map(m => m.file));

    // Ejecutar solo la migración de expenses
    console.log('\n🔄 Ejecutando migración: 20251228-add-receipt-notes-to-expenses.js');
    
    await umzug.up({
      migrations: ['20251228-add-receipt-notes-to-expenses.js']
    });

    console.log('\n✅ Migración ejecutada exitosamente');

    // Verificar que las columnas se agregaron
    const [updatedResults] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Expenses';
    `);
    
    console.log('\n📋 Columnas después de la migración:');
    updatedResults.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
