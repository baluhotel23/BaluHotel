const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
 const User = sequelize.define('User', {

    n_document: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    wdoctype: {
      type: DataTypes.ENUM('RC', 'TI', 'CC', 'TE', 'CE', 'NIT', 'PAS', 'DEX', 'PEP', 'PPT', 'FI', 'NUIP'),
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
    
    role: {
      type: DataTypes.ENUM( 'recept', 'admin', 'owner'),
      defaultValue: 'recept',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
    },
    lastLogout: {
      type: DataTypes.DATE,
    },
    // Tax and Payment fields
   
    passwordResetToken: {
  type: DataTypes.STRING,
  allowNull: true
},
passwordResetExpires: {
  type: DataTypes.DATE,
  allowNull: true
},
tokenCreatedAt: {
  type: DataTypes.DATE,
  allowNull: true
},
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    }
  });
  return User;
};
 
