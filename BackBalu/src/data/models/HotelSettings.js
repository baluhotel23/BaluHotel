const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  sequelize.define('HotelSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,  // Nombre del hotel, obligatorio
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,  // Dirección del hotel, obligatorio
    },
    contactInfo: {
  type: DataTypes.JSON,
  allowNull: true,
  defaultValue: []
},
    // Nuevos campos para facturación con la API de Taxxa
    wlegalorganizationtype: {
      type: DataTypes.ENUM('person', 'company'),
      allowNull: true,
      defaultValue: 'person',
    },
    sfiscalresponsibilities: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sdocno: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sdoctype: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ssellername: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ssellerbrand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scontactperson: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    saddresszip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    wdepartmentcode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    wtowncode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scityname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Datos anidados de "jcontact"
    contact_selectronicmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registration_wdepartmentcode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registration_scityname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registration_saddressline1: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registration_scountrycode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registration_wprovincecode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registration_szip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    registration_sdepartmentname: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    timestamps: true,
    paranoid: true,
    tableName: 'HotelSettings'
  });
};