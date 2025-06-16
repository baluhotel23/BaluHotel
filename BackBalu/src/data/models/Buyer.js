const { DataTypes } = require("sequelize");

const dianCatalogService = require("../../services/DianCatalogService");

module.exports = (sequelize) => {
  const Buyer = sequelize.define(
    "Buyer",
    {
      sdocno: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },

      wlegalorganizationtype: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "person",
        validate: {
          isIn: [["person", "company"]],
        },
      },

      scostumername: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [2, 255],
        },
      },

      stributaryidentificationkey: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "ZZ", // 🔧 CAMBIAR DEFAULT A ZZ (No aplica)
        validate: {
          isIn: [["O-1", "O-4", "ZZ", "ZA"]],
        },
      },

      sfiscalresponsibilities: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "R-99-PN",
        validate: {
          isIn: [["O-13", "O-15", "R-99-PN", "O-23", "O-47"]],
        },
      },

      sfiscalregime: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "49", // No responsable de IVA
        validate: {
          isIn: [["48", "49"]],
        },
      },

      // Código numérico para TAXXA
      wdoctype: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 13, // CC por defecto
        validate: {
          isIn: [[11, 12, 13, 21, 22, 31, 41, 42, 47, 48, 50, 91]],
        },
      },

      // 🔧 HACER CAMPOS DE UBICACIÓN OPCIONALES Y SIN VALIDACIÓN ESTRICTA
      wdepartmentcode: {
        type: DataTypes.STRING,
        allowNull: true, // 🆕 PERMITIR NULL
        validate: {
          len: [2, 2],
          isNumeric: true,
          // 🔧 VALIDACIÓN OPCIONAL Y NO BLOQUEANTE
          isValidDepartment(value) {
            if (value && value.trim() !== '') {
              try {
                if (!dianCatalogService.isValidDepartmentCode(value, this.wcountrycode || 'CO')) {
                  console.warn(`⚠️ [BUYER] Código de departamento inválido: ${value}`);
                  // No lanzar error, solo advertir
                }
              } catch (error) {
                console.warn(`⚠️ [BUYER] Error validando departamento: ${error.message}`);
              }
            }
          }
        },
        comment: 'Código del departamento según catálogos DIAN (opcional)'
      },

      wtowncode: {
        type: DataTypes.STRING,
        allowNull: true, // 🆕 PERMITIR NULL
        validate: {
          len: [5, 5],
          isNumeric: true,
          // 🔧 VALIDACIÓN OPCIONAL Y NO BLOQUEANTE
          isValidMunicipality(value) {
            if (value && value.trim() !== '' && this.wdepartmentcode) {
              try {
                if (!dianCatalogService.isValidMunicipalityCode(value, this.wdepartmentcode)) {
                  console.warn(`⚠️ [BUYER] Código de municipio inválido: ${value} para departamento: ${this.wdepartmentcode}`);
                  // No lanzar error, solo advertir
                }
              } catch (error) {
                console.warn(`⚠️ [BUYER] Error validando municipio: ${error.message}`);
              }
            }
          }
        },
        comment: 'Código del municipio según catálogos DIAN (opcional)'
      },

      wcountrycode: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "CO",
        validate: {
          len: [2, 2],
          // 🔧 VALIDACIÓN OPCIONAL Y NO BLOQUEANTE
          isValidCountry(value) {
            try {
              if (!dianCatalogService.getCountryByCode(value)) {
                console.warn(`⚠️ [BUYER] Código de país inválido: ${value}`);
                // No lanzar error, solo advertir
              }
            } catch (error) {
              console.warn(`⚠️ [BUYER] Error validando país: ${error.message}`);
            }
          },
        },
        comment: "Código del país según catálogos DIAN",
      },

      scorporateregistrationschemename: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Registro Mercantil", // 🔧 CAMBIAR DEFAULT
      },

      scontactperson: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [2, 100],
        },
      },

      selectronicmail: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
          len: [5, 100],
        },
      },

      stelephone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [7, 20],
        },
      },

      // 🆕 CAMPOS ADICIONALES PARA DIRECCIÓN
      saddressline1: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Dirección principal'
      },

      scityname: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Nombre de la ciudad (auto-completado desde catálogos DIAN)'
      },

      // 🆕 CAMPO PARA ALMACENAR ADVERTENCIAS DE VALIDACIÓN
      locationWarnings: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Advertencias de validación de ubicación DIAN'
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      // 🔧 HOOK MEJORADO: NO BLOQUEANTE Y CON MEJOR MANEJO DE ERRORES
      hooks: {
        beforeValidate: async (buyer, options) => {
          try {
            console.log('🔍 [BUYER] Hook beforeValidate ejecutándose...');
            
            // 🔧 CONVERTIR TIPO DE DOCUMENTO DE STRING A NÚMERO
            if (buyer.wdoctype && typeof buyer.wdoctype === 'string') {
              const docTypeMap = {
                'CC': 13,    // Cédula de Ciudadanía
                'NIT': 31,   // NIT
                'CE': 22,    // Cédula de Extranjería
                'PAS': 41,   // Pasaporte
                'RC': 11,    // Registro Civil
                'TI': 12,    // Tarjeta de Identidad
                'TE': 21,    // Tarjeta de Extranjería
                'DEX': 42,   // Documento Extranjero
                'PEP': 50,   // Permiso Especial de Permanencia
                'PPT': 47,   // Permiso Protección Temporal
                'FI': 91,    // NIT de Otro País
                'NUIP': 13   // Número Único de Identificación Personal
              };
              
              buyer.wdoctype = docTypeMap[buyer.wdoctype] || 13;
              console.log('🔧 [BUYER] wdoctype convertido a:', buyer.wdoctype);
            }
            
            // 🆕 VALIDACIÓN DE UBICACIÓN (NO BLOQUEANTE)
            let locationWarnings = [];
            
            if (buyer.wtowncode && buyer.wdepartmentcode) {
              try {
                console.log('🌍 [BUYER] Validando ubicación DIAN (no bloqueante)...');
                
                const validation = dianCatalogService.validateLocationConsistency(
                  buyer.wtowncode,
                  buyer.wdepartmentcode,
                  buyer.wcountrycode || 'CO'
                );
                
                console.log('📊 [BUYER] Resultado validación DIAN:', validation);
                
                if (!validation.isValid) {
                  locationWarnings = validation.errors;
                  console.warn('⚠️ [BUYER] Ubicación con advertencias:', locationWarnings);
                } else {
                  console.log('✅ [BUYER] Ubicación validada correctamente');
                }
                
                // 🏙️ AUTO-COMPLETAR NOMBRE DE CIUDAD
                if (!buyer.scityname && buyer.wtowncode) {
                  const municipality = dianCatalogService.getMunicipalityByCode(buyer.wtowncode);
                  if (municipality) {
                    buyer.scityname = municipality.name;
                    console.log('🏙️ [BUYER] Ciudad auto-completada:', buyer.scityname);
                  } else {
                    locationWarnings.push('No se pudo determinar el nombre de la ciudad');
                  }
                }
                
              } catch (dianError) {
                console.warn('⚠️ [BUYER] Error en validación DIAN (continuando):', dianError.message);
                locationWarnings.push(`Error de validación: ${dianError.message}`);
              }
            } else if (buyer.wtowncode || buyer.wdepartmentcode) {
              // Si solo tiene uno de los dos códigos
              locationWarnings.push('Información de ubicación incompleta');
              console.warn('⚠️ [BUYER] Información de ubicación incompleta');
            } else {
              console.log('ℹ️ [BUYER] Sin datos de ubicación para validar');
            }
            
            // 🆕 GUARDAR ADVERTENCIAS
            buyer.locationWarnings = locationWarnings.length > 0 ? locationWarnings.join('; ') : null;
            
            // 🔧 LIMPIAR CAMPOS VACÍOS
            if (buyer.wdepartmentcode === '') buyer.wdepartmentcode = null;
            if (buyer.wtowncode === '') buyer.wtowncode = null;
            if (buyer.saddressline1 === '') buyer.saddressline1 = null;
            if (buyer.scityname === '') buyer.scityname = null;
            
            console.log('✅ [BUYER] Hook beforeValidate completado exitosamente');
            
          } catch (error) {
            console.error('❌ [BUYER] Error en hook beforeValidate:', error);
            
            // 🚨 SOLO LANZAR ERRORES CRÍTICOS DEL SISTEMA, NO DE VALIDACIÓN DIAN
            if (error.message && 
                !error.message.includes('ubicación') && 
                !error.message.includes('DIAN') &&
                !error.message.includes('municipio') &&
                !error.message.includes('departamento')) {
              throw error; // Re-lanzar solo errores críticos
            } else {
              // Para errores de ubicación, solo advertir
              console.warn('⚠️ [BUYER] Error de ubicación convertido en advertencia:', error.message);
              buyer.locationWarnings = error.message;
            }
          }
        }
      }
    }
  );

  // 🆕 MÉTODOS MEJORADOS CON MANEJO DE ERRORES
  Buyer.prototype.getLocationNames = function() {
    try {
      return {
        country: dianCatalogService.getCountryByCode(this.wcountrycode)?.name || 'Desconocido',
        department: this.wdepartmentcode ? 
          (dianCatalogService.getDepartmentByCode(this.wdepartmentcode)?.name || 'Desconocido') : 
          'No especificado',
        municipality: this.wtowncode ? 
          (dianCatalogService.getMunicipalityByCode(this.wtowncode)?.name || this.scityname || 'Desconocido') : 
          'No especificado'
      };
    } catch (error) {
      console.warn('⚠️ [BUYER] Error obteniendo nombres de ubicación:', error.message);
      return {
        country: 'Error',
        department: 'Error',
        municipality: 'Error'
      };
    }
  };

  Buyer.prototype.getFullAddress = function() {
    try {
      const names = this.getLocationNames();
      const addressParts = [];
      
      if (this.saddressline1) addressParts.push(this.saddressline1);
      if (names.municipality !== 'No especificado') addressParts.push(names.municipality);
      if (names.department !== 'No especificado') addressParts.push(names.department);
      if (names.country !== 'Desconocido') addressParts.push(names.country);
      
      return addressParts.length > 0 ? addressParts.join(', ') : 'Dirección no especificada';
    } catch (error) {
      console.warn('⚠️ [BUYER] Error construyendo dirección completa:', error.message);
      return 'Error en dirección';
    }
  };

  // 🆕 MÉTODO PARA VERIFICAR SI LA UBICACIÓN ES VÁLIDA
  Buyer.prototype.hasValidLocation = function() {
    return !this.locationWarnings || this.locationWarnings.trim() === '';
  };

  // 🆕 MÉTODO PARA OBTENER ADVERTENCIAS DE UBICACIÓN
  Buyer.prototype.getLocationWarnings = function() {
    return this.locationWarnings ? this.locationWarnings.split('; ') : [];
  };

  return Buyer;
};