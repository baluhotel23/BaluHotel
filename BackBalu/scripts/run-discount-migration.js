const { sequelize } = require('../src/data');

async function runDiscountMigration() {
  try {
    console.log('🔄 Ejecutando migración de campos de descuento...');

    await sequelize.query(`
      ALTER TABLE "Bookings" 
      ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) DEFAULT 0;
    `);

    await sequelize.query(`
      ALTER TABLE "Bookings" 
      ADD COLUMN IF NOT EXISTS "discountReason" VARCHAR(255);
    `);

    await sequelize.query(`
      ALTER TABLE "Bookings" 
      ADD COLUMN IF NOT EXISTS "discountAppliedAt" TIMESTAMP;
    `);

    await sequelize.query(`
      ALTER TABLE "Bookings" 
      ADD COLUMN IF NOT EXISTS "discountAppliedBy" VARCHAR(50);
    `);

    await sequelize.query(`
      ALTER TABLE "Bookings" 
      ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(10,2);
    `);

    // Migrar datos existentes
    await sequelize.query(`
      UPDATE "Bookings" 
      SET "originalAmount" = "totalAmount" 
      WHERE "originalAmount" IS NULL 
      AND "totalAmount" IS NOT NULL;
    `);

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await sequelize.close();
  }
}

runDiscountMigration();