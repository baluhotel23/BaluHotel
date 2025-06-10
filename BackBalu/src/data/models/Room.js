const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Room = sequelize.define("Room", {
    roomNumber: {
      type: DataTypes.STRING, // ⭐ CAMBIAR DE INTEGER A STRING
      unique: true,
      allowNull: false,
      primaryKey: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
    
    // ⭐ MIGRAR TUS CAMPOS ACTUALES A NOMBRES MÁS CLAROS
    priceSingle: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Precio para 1 huésped por noche"
    },
    priceDouble: {
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
      comment: "Precio para 2 huéspedes por noche"
    },
    priceMultiple: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Precio para 3+ huéspedes por noche"
    },
    
    // ⭐ CAMPOS ADICIONALES PARA MAYOR FLEXIBILIDAD
    pricePerExtraGuest: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Costo adicional por huésped extra después del límite base"
    },

    available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isPromo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    promotionPrice: {
      type: DataTypes.DECIMAL(10, 2),
      comment: "Precio promocional que anula los precios regulares"
    },

    image_url: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },

    type: {
      type: DataTypes.ENUM,
      values: ["Doble", "Triple", "Cuadruple", "Pareja"],
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM,
      values: ["Limpia", "Ocupada", "Mantenimiento", "Reservada", "Para Limpiar"],
      defaultValue: "Para Limpiar"
    },

    maxGuests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    timestamps: true,
  });

  // ⭐ MÉTODO INSTANCE PARA CALCULAR PRECIOS DINÁMICAMENTE
  Room.prototype.calculatePrice = function(guestCount, nights = 1) {
    // Validaciones básicas
    if (guestCount <= 0 || nights <= 0) {
      throw new Error('Cantidad de huéspedes y noches deben ser positivos');
    }

    if (guestCount > this.maxGuests) {
      throw new Error(`Máximo ${this.maxGuests} huéspedes para esta habitación`);
    }

    let pricePerNight;

    // 1. Verificar si hay promoción activa
    if (this.isPromo && this.promotionPrice) {
      pricePerNight = parseFloat(this.promotionPrice);
      return {
        pricePerNight,
        totalAmount: pricePerNight * nights,
        isPromotion: true,
        breakdown: {
          basePrice: pricePerNight,
          nights,
          guestCount,
          extraGuestCharges: 0
        }
      };
    }

    // 2. Calcular precio base según cantidad de huéspedes
    if (guestCount === 1) {
      pricePerNight = parseFloat(this.priceSingle);
    } else if (guestCount === 2) {
      pricePerNight = parseFloat(this.priceDouble);
    } else {
      pricePerNight = parseFloat(this.priceMultiple);
    }

    // 3. Agregar cargos por huéspedes extra (si aplica)
    let extraGuestCharges = 0;
    const baseGuestLimit = 3; // Límite base antes de cobrar extra
    
    if (guestCount > baseGuestLimit && this.pricePerExtraGuest) {
      const extraGuests = guestCount - baseGuestLimit;
      extraGuestCharges = extraGuests * parseFloat(this.pricePerExtraGuest);
      pricePerNight += extraGuestCharges;
    }

    const totalAmount = pricePerNight * nights;

    return {
      pricePerNight,
      totalAmount,
      isPromotion: false,
      breakdown: {
        basePrice: pricePerNight - extraGuestCharges,
        extraGuestCharges,
        nights,
        guestCount,
        extraGuests: Math.max(0, guestCount - baseGuestLimit)
      }
    };
  };

  return Room;
};