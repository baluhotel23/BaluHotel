const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SellerData = sequelize.define('SellerData', {
    
    // ID único del vendedor/empresa
    sellerId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    
    // 🔧 USAR STRING CON VALIDACIÓN EN LUGAR DE ENUM
    wlegalorganizationtype: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'company',
      validate: {
        isIn: {
          args: [['person', 'company']],
          msg: 'Debe ser person o company'
        }
      }
    },
    
    // Nombre de la empresa/vendedor
    scostumername: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 255]
      }
    },
    
    // 🔧 RESPONSABILIDADES FISCALES - STRING CON VALIDACIÓN
    sfiscalresponsibilities: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'R-99-PN',
      validate: {
        isIn: {
          args: [['O-13', 'O-15', 'O-23', 'O-47', 'R-99-PN']],
          msg: 'Responsabilidad fiscal inválida'
        }
      }
    },
    
    // 🔧 CLAVE DE IDENTIFICACIÓN TRIBUTARIA
    stributaryidentificationkey: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ZZ',
      validate: {
        isIn: {
          args: [['01', '04', 'ZA', 'ZZ']],
          msg: 'Clave de identificación tributaria inválida'
        }
      }
    },
    
    // 🔧 DESCRIPCIÓN DE IDENTIFICACIÓN TRIBUTARIA
    stributaryidentificationname: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'No aplica',
      validate: {
        isIn: {
          args: [['IVA', 'INC', 'IVA e INC', 'No aplica']],
          msg: 'Descripción de identificación tributaria inválida'
        }
      }
    },
    
    // 🔧 RÉGIMEN FISCAL
    sfiscalregime: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '48',
      validate: {
        isIn: {
          args: [['48', '49']],
          msg: 'Régimen fiscal debe ser 48 o 49'
        }
      }
    },
    
    // 🔧 TIPO DE DOCUMENTO (CÓDIGOS NUMÉRICOS)
    sdoctype: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 31, // NIT por defecto para empresas
      validate: {
        isIn: {
          args: [[11, 12, 13, 21, 22, 31, 41, 42, 47, 48, 50, 91]],
          msg: 'Tipo de documento inválido'
        }
      }
    },
    
    // 🔧 NÚMERO DE DOCUMENTO - SIN UNIQUE EN LA DEFINICIÓN
    sdocno: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [5, 20]
      }
    },
    
    // Esquema de registro corporativo
    scorporateregistrationschemename: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'DIAN'
    },
    
    // Persona de contacto
    scontactperson: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    
    // Email de contacto
    selectronicmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { 
        isEmail: true,
        len: [5, 100]
      }
    },
    
    // Teléfono de contacto
    stelephone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [7, 20]
      }
    },
    
    // Dirección física
    saddress: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [5, 255]
      }
    },
    
    // Ciudad
    scity: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [2, 100]
      }
    },
    
    // Código postal
    spostalcode: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [5, 10]
      }
    },
    
    // País
    scountry: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Colombia'
    },
    
    // Estado activo
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // Configuración para TAXXA
    taxxaConfig: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    
    // Notas adicionales
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
    
  }, {
    timestamps: true,
    // 🔧 DEFINIR ÍNDICES Y CONSTRAINTS EN LA CONFIGURACIÓN DEL MODELO
    indexes: [
      {
        fields: ['sellerId']
      },
      {
        unique: true,
        fields: ['sdocno'],
        name: 'seller_sdocno_unique'
      },
      {
        fields: ['selectronicmail']
      },
      {
        fields: ['sdoctype']
      },
      {
        fields: ['wlegalorganizationtype']
      }
    ]
  });

  // 🆕 MÉTODOS DE INSTANCIA
  SellerData.prototype.getDocumentTypeText = function() {
    const docTypeMap = {
      11: 'RC',   12: 'TI',   13: 'CC',   21: 'TE',   22: 'CE',
      31: 'NIT',  41: 'PAS',  42: 'DEX',  47: 'PEP',  48: 'PPT',
      50: 'FI',   91: 'NUIP'
    };
    return docTypeMap[this.sdoctype] || 'NIT';
  };

  // 🆕 SINCRONIZAR CAMPOS TRIBUTARIOS
  SellerData.prototype.syncTributaryFields = function() {
    const keyToNameMap = {
      '01': 'IVA',
      '04': 'INC',
      'ZA': 'IVA e INC',
      'ZZ': 'No aplica'
    };
    
    if (this.stributaryidentificationkey) {
      this.stributaryidentificationname = keyToNameMap[this.stributaryidentificationkey] || 'No aplica';
    }
  };

  // 🆕 VALIDAR CONSISTENCIA DE DATOS
  SellerData.prototype.validateConsistency = function() {
    const errors = [];
    
    // Validar coherencia entre tipo de organización y régimen fiscal
    if (this.wlegalorganizationtype === 'company' && this.sfiscalregime !== '48') {
      errors.push('Persona jurídica debe tener régimen fiscal 48');
    }
    
    if (this.wlegalorganizationtype === 'person' && this.sfiscalregime !== '49') {
      errors.push('Persona natural debe tener régimen fiscal 49');
    }
    
    // Validar coherencia entre tipo de documento y organización
    if (this.wlegalorganizationtype === 'company' && this.sdoctype !== 31) {
      errors.push('Persona jurídica generalmente debe usar NIT (31)');
    }
    
    return errors;
  };

  // 🆕 HOOK ANTES DE GUARDAR
  SellerData.beforeSave(async (seller, options) => {
    // Sincronizar campos tributarios automáticamente
    seller.syncTributaryFields();
  });

  return SellerData;
};