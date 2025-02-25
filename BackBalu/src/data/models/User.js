const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  sequelize.define(
    'User',
    {
      n_document: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      wdoctype: {
        type: DataTypes.ENUM('RC', 'TI', 'CC','TE', 'CE', 'NIT','PAS', 'DEX', 'PEP','PPT', 'FI', 'NUIP'),
        allowNull: true,
      },
      first_name: {
        type: DataTypes.STRING,
      },
      last_name: {
        type: DataTypes.STRING,
      },
     
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
      },
      city: {
        type: DataTypes.STRING,
      },
      role: {
        type: DataTypes.ENUM('Customer', 'Recept', 'Admin', 'Owner'),
        defaultValue: 'Customer',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      wlegalorganizationtype: {
        type: DataTypes.ENUM('person', 'company'),
        allowNull: true,
        defaultValue: 'person',
      },
      scostumername: {
        type: DataTypes.STRING,
        allowNull: true,
        
      },
      stributaryidentificationkey: {
        type: DataTypes.ENUM('O-1', 'O-4', 'ZZ', 'ZA'),
        allowNull: true,
        defaultValue: 'O-1',
        
      },
      sfiscalresponsibilities: {
        type: DataTypes.ENUM('O-13', 'O-15', 'O-23', 'O-47', 'R-99-PN'),
        allowNull: true,
        defaultValue: 'R-99-PN',
      },
      sfiscalregime: {
        type: DataTypes.ENUM('48', "49"),
        allowNull: true,
        defaultValue: '48',
      },
      

      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      paranoid: true,
    }
  );
};