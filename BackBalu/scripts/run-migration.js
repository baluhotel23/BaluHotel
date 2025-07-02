const { conn } = require('../src/data');

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración de campos de check-in...');
    
    const queryInterface = conn.getQueryInterface();
    const Sequelize = conn.Sequelize;

    // Ejecutar las mismas operaciones de la migración
    await queryInterface.addColumn('Bookings', 'inventoryVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica si el inventario básico fue verificado y cargado'
    });

    await queryInterface.addColumn('Bookings', 'inventoryVerifiedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se verificó el inventario'
    });

    await queryInterface.addColumn('Bookings', 'inventoryDelivered', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica si el inventario básico fue entregado al huésped'
    });

    await queryInterface.addColumn('Bookings', 'inventoryDeliveredAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se entregó el inventario'
    });

    await queryInterface.addColumn('Bookings', 'inventoryDeliveredBy', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Usuario que entregó el inventario básico'
    });

    await queryInterface.addColumn('Bookings', 'passengersCompleted', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica si todos los pasajeros requeridos están registrados'
    });

    await queryInterface.addColumn('Bookings', 'passengersCompletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se completó el registro de todos los pasajeros'
    });

    await queryInterface.addColumn('Bookings', 'checkInReadyAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando la reserva cumplió todos los requisitos para check-in'
    });

    await queryInterface.addColumn('Bookings', 'checkInProgress', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indica si la reserva está en proceso de check-in'
    });

    console.log('✅ Migración completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();