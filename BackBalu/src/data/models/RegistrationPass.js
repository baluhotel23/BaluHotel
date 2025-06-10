const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RegistrationPass = sequelize.define('RegistrationPass', {
    registrationNumber: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
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
      type: DataTypes.INTEGER,
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
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // ⭐ NO REFERENCES AQUÍ - SE MANEJA EN ASSOCIATIONS
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      // ⭐ NO REFERENCES AQUÍ - SE MANEJA EN ASSOCIATIONS
    },
  }, {
    timestamps: true,
    // ⭐ IMPORTANTE: NO INDEXES QUE CREEN FK AUTOMÁTICAMENTE
  });

  return RegistrationPass;
};