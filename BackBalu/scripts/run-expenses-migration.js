const { Sequelize } = require('sequelize');
const Umzug = require('umzug');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
  }
);

const umzug = new Umzug({
  migrations: {
    path: './migrations',
    params: [
      sequelize.getQueryInterface(),
      Sequelize
    ]
  },
  storage: 'sequelize',
  storageOptions: {
    sequelize: sequelize,
  }
});

(async () => {
  try {
    console.log('🚀 Iniciando migración de expenses...');
    
    // Ejecutar la migración específica
    await umzug.up({ to: '20251228-add-receipt-notes-to-expenses.js' });
    
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando la migración:', error);
    process.exit(1);
  }
})();
