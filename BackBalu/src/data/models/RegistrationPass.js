const { DataTypes } = require("sequelize");


module.exports = (sequelize) => {
    sequelize.define('RegistrationPass', {
        registrationNumber: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      // Elimina roomNumber como atributo independiente
      checkInDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nationality: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      maritalStatus: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      profession: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      stayDuration: {
        type: DataTypes.INTEGER, // Número de días de permanencia
        allowNull: false,
      },
      checkInTime: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      numberOfPeople: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      destination: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      idNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      idIssuingPlace: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      foreignIdOrPassport: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // Otros campos permanecen igual...
      bookingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Bookings', // Nombre de la tabla en la base de datos
          key: 'bookingId',
        },
      },
      roomNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Rooms', // Nombre de la tabla en la base de datos
          key: 'roomNumber',
        },
      },
    },
    {
   
      timestamps: true,
    }
  );
}