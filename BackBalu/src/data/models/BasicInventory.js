const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BasicInventory = sequelize.define("BasicInventory", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    inventoryType: {
  type: DataTypes.ENUM,
  values: ['consumable', 'reusable', 'sellable'],
  allowNull: false,
  defaultValue: 'consumable'
},
    currentStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    cleanStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    dirtyStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    // ⭐ AGREGAR CAMPO FALTANTE PARA REUSABLES
    minCleanStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Stock mínimo que debe mantenerse limpio'
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    salePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    // ⭐ AGREGAR TIEMPO DE LAVADO PARA REUSABLES
    washingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60, // minutos
      comment: 'Tiempo de lavado en minutos para items reutilizables'
    },
    category: {
  type: DataTypes.ENUM,
  values: ['Room', 'Bathroom', 'Kitchen', 'Cafeteria', 'Laundry', 'Other'],
  allowNull: false,
  defaultValue: 'Other'
},
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // ⭐ CAMPO VIRTUAL CALCULADO - ESTO RESUELVE EL ERROR
    totalReusableStock: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.inventoryType === 'reusable') {
          return (this.cleanStock || 0) + (this.dirtyStock || 0);
        }
        return this.currentStock || 0;
      }
    }
  }, {
    timestamps: true,
    paranoid: false,
    // ⭐ HOOKS PARA MANTENER CONSISTENCIA EN STOCK REUTILIZABLE
    hooks: {
      beforeSave: (instance, options) => {
        // Para items reutilizables, currentStock debe ser la suma de clean + dirty
        if (instance.inventoryType === 'reusable') {
          const cleanStock = instance.cleanStock || 0;
          const dirtyStock = instance.dirtyStock || 0;
          instance.currentStock = cleanStock + dirtyStock;
          
          // Calcular minCleanStock si no está definido (70% del mínimo)
          if (!instance.minCleanStock && instance.minStock > 0) {
            instance.minCleanStock = Math.ceil(instance.minStock * 0.7);
          }
        }
      }
    },
    // ⭐ SCOPES ÚTILES
    scopes: {
      active: {
        where: { isActive: true }
      },
      lowStock: {
        where: sequelize.literal(`
          CASE 
            WHEN "inventoryType" = 'reusable' THEN 
              COALESCE("cleanStock", 0) < COALESCE("minCleanStock", "minStock")
            ELSE 
              "currentStock" < "minStock"
          END
        `)
      },
      reusable: {
        where: { inventoryType: 'reusable' }
      },
      consumable: {
        where: { inventoryType: 'consumable' }
      },
      sellable: {
        where: { inventoryType: 'sellable' }
      }
    }
  });

  return BasicInventory;
};