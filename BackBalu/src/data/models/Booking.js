const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
    bookingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    checkIn: {
      type: DataTypes.DATEONLY, // ⭐ CAMBIADO: Solo fecha, sin hora (YYYY-MM-DD)
      allowNull: false,
      comment: 'Fecha de check-in (solo fecha, sin hora específica)'
    },
    checkOut: {
      type: DataTypes.DATEONLY, // ⭐ CAMBIADO: Solo fecha, sin hora (YYYY-MM-DD)
      allowNull: false,
      comment: 'Fecha de check-out (solo fecha, sin hora específica)'
    },
    nights: {
      type: DataTypes.INTEGER, // ⭐ AGREGADO: Número de noches calculadas
      allowNull: true,
      validate: {
        min: 0
      },
      comment: 'Número de noches de la reserva (calculado automáticamente)'
    },
    status: {
      type: DataTypes.ENUM,
      values: ['pending', 'confirmed', 'paid', 'checked-in', 'completed', 'advanced', 'cancelled', 'no_show_cancelled'],
      defaultValue: 'pending'
    },
    pointOfSale: {
      type: DataTypes.ENUM,
      values: ["Online", "Local"],
      allowNull: false,
      defaultValue: "Online",
    },
    guestCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    guestId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    trackingToken: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ⭐ CAMPOS EXISTENTES PARA DISTINGUIR PROCESOS
    paymentCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp cuando se completó el pago total'
    },
    actualCheckIn: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp real cuando se completó el check-in físico'
    },
    actualCheckOut: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp real cuando se completó el check-out físico'
    },
    
    // ⭐ NUEVOS CAMPOS PARA TRACKING DE ESTADOS DE CHECK-IN
    inventoryVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el inventario básico fue verificado y cargado'
    },
    
    inventoryVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se verificó el inventario'
    },
    
    inventoryDelivered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si el inventario básico fue entregado al huésped'
    },
    
    inventoryDeliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se entregó el inventario'
    },
    
    inventoryDeliveredBy: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Usuario que entregó el inventario básico'
    },
    
    passengersCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si todos los pasajeros requeridos están registrados'
    },
    
    passengersCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se completó el registro de todos los pasajeros'
    },
    
    checkInReadyAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando la reserva cumplió todos los requisitos para check-in'
    },
    
    checkInProgress: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si la reserva está en proceso de check-in'
    },

    // ✅ NUEVOS CAMPOS PARA DESCUENTOS
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        isDecimal: true
      },
      comment: 'Monto del descuento aplicado'
    },
    
    discountReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [0, 255]
      },
      comment: 'Razón del descuento aplicado'
    },
    
    discountAppliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se aplicó el descuento'
    },
    
    discountAppliedBy: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Usuario que aplicó el descuento'
    },
    
    originalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
        isDecimal: true
      },
      comment: 'Monto original antes del descuento'
    }
  }, {
    timestamps: true,
    tableName: 'Bookings'
  });

  // ✅ MÉTODOS DE INSTANCIA PARA MANEJAR DESCUENTOS
  Booking.prototype.applyDiscount = function(discountAmount, reason, appliedBy) {
    // Guardar el monto original si no existe
    if (!this.originalAmount) {
      this.originalAmount = this.totalAmount;
    }
    
    this.discountAmount = discountAmount;
    this.discountReason = reason;
    this.discountAppliedAt = new Date();
    this.discountAppliedBy = appliedBy;
    
    // Calcular nuevo total
    const adjustedAmount = Math.max(0, parseFloat(this.originalAmount) - parseFloat(discountAmount));
    this.totalAmount = adjustedAmount;
    
    return this;
  };

  // ✅ MÉTODO PARA OBTENER MONTO EFECTIVO
  Booking.prototype.getEffectiveAmount = function() {
    const original = parseFloat(this.originalAmount || this.totalAmount);
    const discount = parseFloat(this.discountAmount || 0);
    return Math.max(0, original - discount);
  };

  // ✅ MÉTODO PARA VERIFICAR SI TIENE DESCUENTO
  Booking.prototype.hasDiscount = function() {
    return this.discountAmount && parseFloat(this.discountAmount) > 0;
  };

  // ✅ MÉTODO PARA OBTENER INFO FORMATEADA DEL DESCUENTO
  Booking.prototype.getDiscountInfo = function() {
    if (!this.hasDiscount()) return null;

    return {
      discountAmount: parseFloat(this.discountAmount),
      discountReason: this.discountReason,
      discountAppliedAt: this.discountAppliedAt,
      discountAppliedBy: this.discountAppliedBy,
      originalAmount: parseFloat(this.originalAmount || this.totalAmount),
      adjustedAmount: this.getEffectiveAmount(),
      discountPercentage: this.originalAmount ? 
        Math.round((parseFloat(this.discountAmount) / parseFloat(this.originalAmount)) * 100) : 0,
      // Formateos
      discountAmountFormatted: `$${parseFloat(this.discountAmount).toLocaleString()}`,
      originalAmountFormatted: `$${parseFloat(this.originalAmount || this.totalAmount).toLocaleString()}`,
      adjustedAmountFormatted: `$${this.getEffectiveAmount().toLocaleString()}`,
      savingsMessage: `Ahorro de $${parseFloat(this.discountAmount).toLocaleString()} aplicado por ${this.discountReason || 'descuento'}`
    };
  };

  return Booking;
};