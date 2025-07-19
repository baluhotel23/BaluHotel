/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 [MIGRATION] Agregando campos de descuento a tabla Bookings...');

    try {
      // ✅ AGREGAR CAMPOS DE DESCUENTO
      await queryInterface.addColumn('Bookings', 'discountAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Monto del descuento aplicado'
      });

      await queryInterface.addColumn('Bookings', 'discountReason', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Razón del descuento aplicado'
      });

      await queryInterface.addColumn('Bookings', 'discountAppliedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha y hora cuando se aplicó el descuento'
      });

      await queryInterface.addColumn('Bookings', 'discountAppliedBy', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Usuario que aplicó el descuento'
      });

      await queryInterface.addColumn('Bookings', 'originalAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Monto original antes del descuento'
      });

      console.log('✅ [MIGRATION] Campos de descuento agregados exitosamente');

      // ✅ OPCIONAL: MIGRAR DATOS EXISTENTES
      // Establecer originalAmount = totalAmount para registros existentes
      await queryInterface.sequelize.query(`
        UPDATE "Bookings" 
        SET "originalAmount" = "totalAmount" 
        WHERE "originalAmount" IS NULL 
        AND "totalAmount" IS NOT NULL;
      `);

      console.log('✅ [MIGRATION] Datos existentes migrados (originalAmount establecido)');

    } catch (error) {
      console.error('❌ [MIGRATION] Error al agregar campos de descuento:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 [MIGRATION] Revirtiendo campos de descuento de tabla Bookings...');

    try {
      await queryInterface.removeColumn('Bookings', 'discountAmount');
      await queryInterface.removeColumn('Bookings', 'discountReason');
      await queryInterface.removeColumn('Bookings', 'discountAppliedAt');
      await queryInterface.removeColumn('Bookings', 'discountAppliedBy');
      await queryInterface.removeColumn('Bookings', 'originalAmount');

      console.log('✅ [MIGRATION] Campos de descuento removidos exitosamente');
    } catch (error) {
      console.error('❌ [MIGRATION] Error al remover campos de descuento:', error);
      throw error;
    }
  }
};