const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
 sequelize.define('RoomCheckIn', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Foreign key para relacionar con la habitación
    RoomId: {
      type: DataTypes.UUID,
      allowNull: false,
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