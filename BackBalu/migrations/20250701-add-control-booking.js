'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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

    console.log('✅ Campos de tracking de check-in agregados a la tabla Bookings');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Bookings', 'inventoryVerified');
    await queryInterface.removeColumn('Bookings', 'inventoryVerifiedAt');
    await queryInterface.removeColumn('Bookings', 'inventoryDelivered');
    await queryInterface.removeColumn('Bookings', 'inventoryDeliveredAt');
    await queryInterface.removeColumn('Bookings', 'inventoryDeliveredBy');
    await queryInterface.removeColumn('Bookings', 'passengersCompleted');
    await queryInterface.removeColumn('Bookings', 'passengersCompletedAt');
    await queryInterface.removeColumn('Bookings', 'checkInReadyAt');
    await queryInterface.removeColumn('Bookings', 'checkInProgress');

    console.log('✅ Campos de tracking de check-in eliminados de la tabla Bookings');
  }
};