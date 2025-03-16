const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  sequelize.define('Buyer', {
    
    sdocno: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    wlegalorganizationtype: {
      type: DataTypes.ENUM('person', 'company'),
      allowNull: false,
      defaultValue: 'person',
    },
    scostumername: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stributaryidentificationkey: {
      type: DataTypes.ENUM('O-1', 'O-4', 'ZZ', 'ZA'),
      allowNull: false,
      defaultValue: 'O-1',
    },
    sfiscalresponsibilities: {
      type: DataTypes.ENUM('R-99-PN', 'O-1', 'O-4', 'ZA'),
      allowNull: false,
      defaultValue: 'R-99-PN',
    },
    sfiscalregime: {
      type: DataTypes.ENUM('48', '49'),
      allowNull: false,
      defaultValue: '48',
    },
    wdoctype: {
      type: DataTypes.ENUM('RC', 'TI', 'CC', 'TE', 'CE', 'NIT', 'PAS', 'DEX', 'PEP', 'PPT', 'FI', 'NUIP'),
      allowNull: false,
    },
    scorporateregistrationschemename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scontactperson: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    selectronicmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
    },
    stelephone: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  }, {
    tableName: 'buyers',
    timestamps: true
  });

 
};
 