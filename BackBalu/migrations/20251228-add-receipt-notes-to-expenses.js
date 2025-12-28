'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Expenses');
    
    // Agregar columna receiptUrl solo si no existe
    if (!tableInfo.receiptUrl) {
      await queryInterface.addColumn('Expenses', 'receiptUrl', {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL del comprobante del gasto en Cloudinary'
      });
      console.log('✅ Columna receiptUrl agregada a tabla Expenses');
    } else {
      console.log('⚠️ Columna receiptUrl ya existe en tabla Expenses');
    }

    // Agregar columna notes solo si no existe
    if (!tableInfo.notes) {
      await queryInterface.addColumn('Expenses', 'notes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notas adicionales sobre el gasto'
      });
      console.log('✅ Columna notes agregada a tabla Expenses');
    } else {
      console.log('⚠️ Columna notes ya existe en tabla Expenses');
    }

    // Agregar columna createdBy solo si no existe
    if (!tableInfo.createdBy) {
      await queryInterface.addColumn('Expenses', 'createdBy', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Documento del usuario que creó el gasto'
      });
      console.log('✅ Columna createdBy agregada a tabla Expenses');
    } else {
      console.log('⚠️ Columna createdBy ya existe en tabla Expenses');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar columnas en caso de rollback
    await queryInterface.removeColumn('Expenses', 'receiptUrl');
    await queryInterface.removeColumn('Expenses', 'notes');
    await queryInterface.removeColumn('Expenses', 'createdBy');
    
    console.log('✅ Columnas receiptUrl, notes y createdBy eliminadas de tabla Expenses');
  }
};
