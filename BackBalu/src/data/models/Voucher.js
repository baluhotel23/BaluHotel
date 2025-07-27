const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
 const Voucher = sequelize.define('Voucher', {
  voucherId: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  voucherCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    index: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'used', 'expired', 'cancelled'),
    allowNull: false,
    defaultValue: 'active'
  },
  guestId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Buyers',
      key: 'sdocno'
    }
  },
  originalBookingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Bookings',
      key: 'bookingId'
    }
  },
  usedBookingId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Bookings',
      key: 'bookingId'
    }
  },
  validUntil: {
    type: DataTypes.DATE,
    allowNull: false
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  usedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'vouchers',
  timestamps: true,
  indexes: [
    {
      fields: ['voucherCode']
    },
    {
      fields: ['guestId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['validUntil']
    },
    {
      fields: ['originalBookingId']
    },
    {
      fields: ['usedBookingId']
    }
  ]
});
  return Voucher;
};

