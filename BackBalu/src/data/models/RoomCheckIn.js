const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  sequelize.define('RoomCheckIn', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Foreign key para relacionar con la habitación
     roomNumber: {
      type: DataTypes.STRING, // ⭐ USAR STRING PARA COINCIDIR
      allowNull: false,
      // ⭐ NO REFERENCES - SE MANEJA EN ASSOCIATIONS
    },
    // Indicador si la habitación fue limpiada
    cleaningCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Indicador si se verificaron los amenities o básicos (roomBasics)
    amenitiesChecked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Otro campo opcional, por ejemplo, si se cambiaron las sábanas
    linensChanged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Campo para almacenar la asignación de inventario (puede ser un JSON)
    assignedInventory: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Almacena los items asignados a la habitación y sus cantidades'
    },
    // Fecha de última actualización o revisión
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  }, {
    timestamps: true,
    paranoid: true,
    tableName: 'RoomPreparations'
  });
};