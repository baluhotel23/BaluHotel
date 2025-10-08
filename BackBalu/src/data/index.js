require('dotenv').config();

const { Sequelize } = require('sequelize');

const fs = require('fs');
const path = require('path');
const {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_DEPLOY
} = require('../config/envs');

//-------------------------------- CONFIGURACION PARA TRABAJAR LOCALMENTE-----------------------------------

// const sequelize = new Sequelize(
//   `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
//   {
//     logging: false, // set to console.log to see the raw SQL queries
//     native: false, // lets Sequelize know we can use pg-native for ~30% more speed
//   }
// );
//-------------------------------------CONFIGURACION PARA EL DEPLOY---------------------------------------------------------------------
const sequelize = new Sequelize(DB_DEPLOY , {
      logging: false, // set to console.log to see the raw SQL queries
      native: false, // lets Sequelize know we can use pg-native for ~30% more speed
    }
  );


const basename = path.basename(__filename);
const modelDefiners = [];

// Leemos todos los archivos de la carpeta Models, los requerimos y agregamos al arreglo modelDefiners
fs.readdirSync(path.join(__dirname, '/models'))
  .filter(
    (file) =>
      file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
  )
  .forEach((file) => {
    modelDefiners.push(require(path.join(__dirname, '/models', file)));
  });

// Injectamos la conexion (sequelize) a todos los modelos
modelDefiners.forEach((model) => model(sequelize));

// Capitalizamos los nombres de los modelos ie: product => Product
let entries = Object.entries(sequelize.models);
let capsEntries = entries.map((entry) => [
  entry[0][0].toUpperCase() + entry[0].slice(1),
  entry[1],
]);
sequelize.models = Object.fromEntries(capsEntries);

// ⭐ VERIFICAR QUE TODOS LOS MODELOS EXISTEN ANTES DE CREAR ASOCIACIONES
console.log('🔍 Modelos disponibles:', Object.keys(sequelize.models));

// ⭐ DESTRUCTURING CON VALIDACIÓN
const { 
  BasicInventory, 
  ExtraCharge, 
  Token, 
  Buyer, 
  Booking, 
  Bill, 
  Room, 
  SellerData, 
  Invoice, 
  RoomBasics, 
  BookingInventoryUsage, 
  User, 
  Purchase, 
  PurchaseItem, 
  RoomCheckIn, 
  Service, 
  Payment, 
  RegistrationPass,
  RoomCategory,
  LaundryMovement,
  CreditNote,
  Voucher,
  RoomService, // ⭐ CORREGIDO: RoomService en lugar de RoomServices
  Expense,
  ReceptionShift // ⭐ NUEVO: Modelo de turnos de recepción
} = sequelize.models;

// ⭐ FUNCIÓN HELPER PARA VERIFICAR SI EL MODELO EXISTE
function hasModel(modelName) {
  return sequelize.models[modelName] !== undefined;
}

// ⭐ FUNCIÓN HELPER PARA OBTENER PRIMARY KEY DINÁMICAMENTE
function getPrimaryKey(model) {
  if (!model) return 'id';
  
  const pkAttribute = model.primaryKeyAttribute;
  if (pkAttribute) {
    console.log(`🔍 Primary key detectada para ${model.name}: ${pkAttribute}`);
    return pkAttribute;
  }
  
  console.log(`⚠️ Primary key no encontrada para ${model.name}, usando 'id'`);
  return 'id';
}

// ⭐ CONFIGURACIÓN DE ASOCIACIONES

// ===== RELACIONES DE ROOM Y BASIC INVENTORY =====
if (hasModel('Room') && hasModel('BasicInventory') && hasModel('RoomBasics')) {
  Room.belongsToMany(BasicInventory, { 
    through: RoomBasics, 
    foreignKey: 'roomNumber',
    otherKey: 'basicId',
    as: 'BasicInventories' 
  });
  
  BasicInventory.belongsToMany(Room, { 
    through: RoomBasics, 
    foreignKey: 'basicId',
    otherKey: 'roomNumber',
    as: 'AssignedRooms' 
  });

  // ⭐ RELACIONES DIRECTAS CON ROOMBASICS
  RoomBasics.belongsTo(Room, { 
    foreignKey: 'roomNumber', 
    targetKey: 'roomNumber',
    as: 'room' 
  });
  
  RoomBasics.belongsTo(BasicInventory, { 
    foreignKey: 'basicId', 
    targetKey: 'id',
    as: 'inventory' 
  });

  Room.hasMany(RoomBasics, { 
    foreignKey: 'roomNumber', 
    sourceKey: 'roomNumber',
    as: 'inventoryConfig' 
  });
  
  BasicInventory.hasMany(RoomBasics, { 
    foreignKey: 'basicId', 
    sourceKey: 'id',
    as: 'roomAssignments' 
  });
}

// ===== RELACIONES DE BOOKING Y INVENTORY =====
if (hasModel('Booking') && hasModel('BasicInventory') && hasModel('BookingInventoryUsage')) {
  const bookingPK = getPrimaryKey(Booking); // Detectar si es 'id' o 'bookingId'
  
  Booking.belongsToMany(BasicInventory, {
    through: BookingInventoryUsage,
    foreignKey: 'bookingId',
    otherKey: 'basicInventoryId',
    as: 'UsedInventory'
  });
  
  BasicInventory.belongsToMany(Booking, {
    through: BookingInventoryUsage,
    foreignKey: 'basicInventoryId',
    otherKey: 'bookingId',
    as: 'BookingUsages' 
  });

  // ⭐ RELACIONES DIRECTAS CON PK CORRECTA
  BookingInventoryUsage.belongsTo(Booking, { 
    foreignKey: 'bookingId',
    targetKey: bookingPK,
    as: 'booking' 
  });
  
  BookingInventoryUsage.belongsTo(BasicInventory, { 
    foreignKey: 'basicInventoryId',
    targetKey: 'id',
    as: 'inventory' 
  });
  
  Booking.hasMany(BookingInventoryUsage, { 
    foreignKey: 'bookingId',
    sourceKey: bookingPK,
    as: 'inventoryUsages' 
  });
  
  BasicInventory.hasMany(BookingInventoryUsage, { 
    foreignKey: 'basicInventoryId',
    sourceKey: 'id',
    as: 'usageHistory' 
  });
}

// ===== RELACIONES DE LAUNDRY MOVEMENT =====
if (hasModel('LaundryMovement') && hasModel('BasicInventory')) {
  const bookingPK = hasModel('Booking') ? getPrimaryKey(Booking) : 'id';
  
  LaundryMovement.belongsTo(BasicInventory, {
    foreignKey: 'basicInventoryId',
    targetKey: 'id',
    as: 'inventory',
    constraints: false // ⭐ DESHABILITAR CONSTRAINTS TEMPORALMENTE
  });
  
  BasicInventory.hasMany(LaundryMovement, {
    foreignKey: 'basicInventoryId',
    sourceKey: 'id',
    as: 'laundryMovements',
    constraints: false
  });

  if (hasModel('Room')) {
    LaundryMovement.belongsTo(Room, {
      foreignKey: 'roomNumber',
      targetKey: 'roomNumber',
      as: 'room',
      constraints: false
    });
    
    Room.hasMany(LaundryMovement, {
      foreignKey: 'roomNumber',
      sourceKey: 'roomNumber',
      as: 'laundryMovements',
      constraints: false
    });
  }

  if (hasModel('Booking')) {
    LaundryMovement.belongsTo(Booking, {
      foreignKey: 'bookingId',
      targetKey: bookingPK, // ⭐ USAR LA PK CORRECTA
      as: 'booking',
      constraints: false
    });
    
    Booking.hasMany(LaundryMovement, {
      foreignKey: 'bookingId',
      sourceKey: bookingPK,
      as: 'laundryMovements',
      constraints: false
    });
  }
}

// ===== RELACIONES DE ROOM =====
if (hasModel('Room')) {
  // Room - RoomCheckIn
  if (hasModel('RoomCheckIn')) {
    Room.hasOne(RoomCheckIn, { 
      foreignKey: 'roomNumber', 
      sourceKey: 'roomNumber',
      as: 'preparation' 
    });
    RoomCheckIn.belongsTo(Room, { 
      foreignKey: 'roomNumber', 
      targetKey: 'roomNumber',
      as: 'room' 
    });
  }

  // ⭐ CORREGIR: Room - Service (a través de RoomService)
  if (hasModel('Service')) {
    Room.belongsToMany(Service, {
      through: 'RoomServices', // ⭐ Sequelize creará la tabla automáticamente
      foreignKey: 'roomNumber',
      otherKey: 'serviceId',
      as: 'Services' // ⭐ CAMBIAR ALIAS para que coincida con el controller
    });

    Service.belongsToMany(Room, {
      through: 'RoomServices', // ⭐ NOMBRE DE TABLA
      foreignKey: 'serviceId',
      otherKey: 'roomNumber',
      as: 'availableInRooms'
    });
  } // ⭐ FALTABA ESTA LLAVE DE CIERRE

  // Room - RegistrationPass
  if (hasModel('RegistrationPass')) {
    Room.hasMany(RegistrationPass, { 
      foreignKey: 'roomNumber', 
      sourceKey: 'roomNumber', 
      as: 'registrationPasses' 
    });
    RegistrationPass.belongsTo(Room, { 
      foreignKey: 'roomNumber', 
      targetKey: 'roomNumber', 
      as: 'room' 
    });
  }

  // Room - Booking
  if (hasModel('Booking')) {
    Room.hasMany(Booking, { 
      foreignKey: 'roomNumber',
      sourceKey: 'roomNumber',
      as: 'bookings'
    });
    Booking.belongsTo(Room, { 
      foreignKey: 'roomNumber',
      targetKey: 'roomNumber',
      as: 'room'
    });
  }

  // Room - RoomCategory
  if (hasModel('RoomCategory')) {
    Room.belongsTo(RoomCategory, {
      foreignKey: 'categoryId',
      as: 'category'
    });
    RoomCategory.hasMany(Room, {
      foreignKey: 'categoryId',
      as: 'rooms'
    });
  }
}

// ===== RELACIONES DE BOOKING =====
if (hasModel('Booking')) {
  const bookingPK = getPrimaryKey(Booking);
  
  // Booking - Buyer
  if (hasModel('Buyer')) {
    Booking.belongsTo(Buyer, { 
      as: 'guest', 
      foreignKey: 'guestId',
      targetKey: 'sdocno' // ⭐ SEGÚN EL MODELO BOOKING
    });
    Buyer.hasMany(Booking, {
      foreignKey: 'guestId',
      sourceKey: 'sdocno',
      as: 'bookings'
    });
  }

  // Booking - ExtraCharge
  if (hasModel('ExtraCharge')) {
    Booking.hasMany(ExtraCharge, { 
      foreignKey: 'bookingId',
      sourceKey: bookingPK,
      as: 'extraCharges'
    });
    ExtraCharge.belongsTo(Booking, { 
      foreignKey: 'bookingId',
      targetKey: bookingPK,
      as: 'booking'
    });
  }

  // Booking - Bill
  if (hasModel('Bill')) {
    Booking.hasOne(Bill, { 
      foreignKey: 'bookingId',
      sourceKey: bookingPK,
      as: 'bill'
    });
    Bill.belongsTo(Booking, { 
      foreignKey: 'bookingId',
      targetKey: bookingPK,
      as: 'booking'
    });
  }

  // Booking - Payment
  if (hasModel('Payment')) {
    Booking.hasMany(Payment, { 
      foreignKey: 'bookingId',
      sourceKey: bookingPK,
      as: 'payments'
    });
    Payment.belongsTo(Booking, { 
      foreignKey: 'bookingId',
      targetKey: bookingPK,
      as: 'booking'
    });
    
    // ⭐ NUEVO: Payment - ReceptionShift
    if (hasModel('ReceptionShift')) {
      Payment.belongsTo(ReceptionShift, {
        foreignKey: 'shiftId',
        targetKey: 'shiftId',
        as: 'shift'
      });
      ReceptionShift.hasMany(Payment, {
        foreignKey: 'shiftId',
        sourceKey: 'shiftId',
        as: 'payments'
      });
    }
  }

  // Booking - RegistrationPass
  if (hasModel('RegistrationPass')) {
    Booking.hasMany(RegistrationPass, { 
      foreignKey: 'bookingId', 
      sourceKey: bookingPK,
      as: 'registrationPasses' 
    });
    RegistrationPass.belongsTo(Booking, { 
      foreignKey: 'bookingId', 
      targetKey: bookingPK,
      as: 'booking' 
    });
  }
}

// ===== RELACIONES DE USER =====
if (hasModel('User')) {
  // User - Payment
  if (hasModel('Payment')) {
    Payment.belongsTo(User, {
      foreignKey: 'processedBy',
      targetKey: 'n_document',
      as: 'processor'
    });
    User.hasMany(Payment, {
      foreignKey: 'processedBy',
      sourceKey: 'n_document',
      as: 'processedPayments'
    });
  }

  // ⭐ NUEVO: User - ReceptionShift
  if (hasModel('ReceptionShift')) {
    User.hasMany(ReceptionShift, {
      foreignKey: 'userId',
      sourceKey: 'n_document', // ⭐ PK de User es n_document
      as: 'shifts'
    });
    ReceptionShift.belongsTo(User, {
      foreignKey: 'userId',
      targetKey: 'n_document', // ⭐ PK de User es n_document
      as: 'user'
    });
  }

  // User - Booking (createdBy)
  if (hasModel('Booking')) {
    const bookingPK = getPrimaryKey(Booking);
    User.hasMany(Booking, {
      foreignKey: 'createdBy',
      sourceKey: 'n_document',
      as: 'createdBookings'
    });
    Booking.belongsTo(User, {
      foreignKey: 'createdBy',
      targetKey: 'n_document',
      as: 'creator'
    });
  }
}

// ===== RELACIONES DE INVENTORY CON EXTRACHARGE =====
if (hasModel('ExtraCharge') && hasModel('BasicInventory')) {
  ExtraCharge.belongsTo(BasicInventory, { 
    foreignKey: 'basicId', 
    as: 'inventoryItem' 
  });
  BasicInventory.hasMany(ExtraCharge, { 
    foreignKey: 'basicId', 
    as: 'extraCharges' 
  });
}

// ===== RELACIONES DE PURCHASE =====
if (hasModel('Purchase') && hasModel('PurchaseItem')) {
  Purchase.hasMany(PurchaseItem, { 
    foreignKey: 'purchaseId',
    as: 'items'
  });
  PurchaseItem.belongsTo(Purchase, { 
    foreignKey: 'purchaseId',
    as: 'purchase'
  });

  if (hasModel('BasicInventory')) {
    PurchaseItem.belongsTo(BasicInventory, { 
      foreignKey: 'basicId',
      as: 'inventoryItem'
    });
    BasicInventory.hasMany(PurchaseItem, { 
      foreignKey: 'basicId',
      as: 'purchaseHistory'
    });
  }

  if (hasModel('User')) {
    Purchase.belongsTo(User, {
      foreignKey: 'createdBy',
      targetKey: 'n_document',
      as: 'creator'
    });
    User.hasMany(Purchase, {
      foreignKey: 'createdBy',
      sourceKey: 'n_document',
      as: 'purchases'
    });
  }
}


// ===== RELACIONES DE EXPENSE =====
if (hasModel('Expense')) {
  if (hasModel('User')) {
    Expense.belongsTo(User, {
      foreignKey: 'createdBy',
      targetKey: 'n_document',
      as: 'creator'
    });
    User.hasMany(Expense, {
      foreignKey: 'createdBy',
      sourceKey: 'n_document',
      as: 'expenses'
    });
  }

  if (hasModel('BasicInventory')) {
    Expense.belongsTo(BasicInventory, {
      foreignKey: 'inventoryId',
      as: 'inventoryItem'
    });
    BasicInventory.hasMany(Expense, {
      foreignKey: 'inventoryId',
      as: 'expenses'
    });
  }
}

// ===== RELACIONES DE TOKEN =====
if (hasModel('Token') && hasModel('User')) {
  Token.belongsTo(User, {
    foreignKey: 'userId',
    targetKey: 'n_document',
    as: 'user'
  });
  User.hasMany(Token, {
    foreignKey: 'userId',
    sourceKey: 'n_document',
    as: 'tokens'
  });
}

// ===== NUEVAS RELACIONES DE INVOICE Y BILL =====
if (hasModel('Invoice') && hasModel('Bill')) {
  // 🔗 Invoice pertenece a un Bill
  Invoice.belongsTo(Bill, {
    foreignKey: 'billId',
    targetKey: 'idBill', // ⭐ La primary key de Bill es idBill
    as: 'bill'
  });

  // 🔗 Bill puede tener múltiples facturas (Invoice + CreditNotes)
  Bill.hasMany(Invoice, {
    foreignKey: 'billId',
    sourceKey: 'idBill',
    as: 'invoices'
  });

  console.log('✅ Asociaciones Invoice <-> Bill creadas');
}

// ===== RELACIONES DE INVOICE ACTUALIZADAS =====
if (hasModel('Invoice')) {
  // 🔧 CORREGIR: Invoice NO se relaciona directamente con Booking
  // La relación es: Invoice -> Bill -> Booking
  
  // Invoice - SellerData
  if (hasModel('SellerData')) {
    Invoice.belongsTo(SellerData, {
      foreignKey: 'sellerId',
      targetKey: 'sdocno', // ⭐ La PK de SellerData es sdocno
      as: 'seller'
    });
    SellerData.hasMany(Invoice, {
      foreignKey: 'sellerId',
      sourceKey: 'sdocno',
      as: 'invoices'
    });
  }

  // Invoice - Buyer
  if (hasModel('Buyer')) {
    Invoice.belongsTo(Buyer, {
      foreignKey: 'buyerId',
      targetKey: 'sdocno', // ⭐ La PK de Buyer es sdocno
      as: 'buyer'
    });
    Buyer.hasMany(Invoice, {
      foreignKey: 'buyerId',
      sourceKey: 'sdocno',
      as: 'invoices'
    });
  }

  console.log('✅ Asociaciones de Invoice actualizadas');
}

// ===== RELACIONES DE CREDIT NOTES (SI TIENES EL MODELO) =====
if (hasModel('CreditNote')) {
  // CreditNote - Invoice (factura original)
  if (hasModel('Invoice')) {
    CreditNote.belongsTo(Invoice, {
      foreignKey: 'originalInvoiceId',
      targetKey: 'id',
      as: 'originalInvoice'
    });
    Invoice.hasMany(CreditNote, {
      foreignKey: 'originalInvoiceId',
      sourceKey: 'id',
      as: 'creditNotes'
    });
  }

  Voucher.belongsTo(Buyer, { 
  foreignKey: 'guestId', 
  as: 'guest' 
});

Voucher.belongsTo(Booking, { 
  foreignKey: 'originalBookingId', 
  as: 'originalBooking' 
});

Voucher.belongsTo(Booking, { 
  foreignKey: 'usedBookingId', 
  as: 'usedBooking' 
});

// También agregar las asociaciones inversas:
Buyer.hasMany(Voucher, { 
  foreignKey: 'guestId', 
  as: 'vouchers' 
});

Booking.hasMany(Voucher, { 
  foreignKey: 'originalBookingId', 
  as: 'generatedVouchers' 
});

Booking.hasMany(Voucher, { 
  foreignKey: 'usedBookingId', 
  as: 'appliedVouchers' 
});

  // CreditNote - Bill
  if (hasModel('Bill')) {
    CreditNote.belongsTo(Bill, {
      foreignKey: 'billId',
      targetKey: 'idBill',
      as: 'bill'
    });
    Bill.hasMany(CreditNote, {
      foreignKey: 'billId',
      sourceKey: 'idBill',
      as: 'creditNotes'
    });
  }

  // CreditNote - SellerData
  if (hasModel('SellerData')) {
    CreditNote.belongsTo(SellerData, {
      foreignKey: 'sellerId',
      targetKey: 'sdocno',
      as: 'seller'
    });
    SellerData.hasMany(CreditNote, {
      foreignKey: 'sellerId',
      sourceKey: 'sdocno',
      as: 'creditNotes'
    });
  }

  // CreditNote - Buyer
  if (hasModel('Buyer')) {
    CreditNote.belongsTo(Buyer, {
      foreignKey: 'buyerId',
      targetKey: 'sdocno',
      as: 'buyer'
    });
    Buyer.hasMany(CreditNote, {
      foreignKey: 'buyerId',
      sourceKey: 'sdocno',
      as: 'creditNotes'
    });
  }

  console.log('✅ Asociaciones de CreditNote creadas');
}

// ===== MEJORAR RELACIONES EXISTENTES DE BILL =====
if (hasModel('Bill')) {
  // Bill - Booking (verificar que existe)
  if (hasModel('Booking')) {
    const bookingPK = getPrimaryKey(Booking);
    
    // ⭐ VERIFICAR QUE LA ASOCIACIÓN NO EXISTA YA
    if (!Bill.associations.booking) {
      Bill.belongsTo(Booking, { 
        foreignKey: 'bookingId',
        targetKey: bookingPK,
        as: 'booking'
      });
      console.log('✅ Asociación Bill -> Booking creada');
    }
    
    if (!Booking.associations.bill) {
      Booking.hasOne(Bill, { 
        foreignKey: 'bookingId',
        sourceKey: bookingPK,
        as: 'bill'
      });
      console.log('✅ Asociación Booking -> Bill creada');
    }
  }

  console.log('✅ Asociaciones de Bill verificadas');
}

// ===== FUNCIONES HELPER ADICIONALES =====

// ⭐ FUNCIÓN PARA VERIFICAR ASOCIACIONES ESPECÍFICAS
function checkAssociation(modelName, associationName) {
  try {
    const model = sequelize.models[modelName];
    if (!model) {
      console.log(`⚠️ Modelo ${modelName} no encontrado`);
      return false;
    }
    
    const hasAssociation = model.associations && model.associations[associationName];
    console.log(`🔍 ${modelName}.${associationName}: ${hasAssociation ? '✅' : '❌'}`);
    return !!hasAssociation;
  } catch (error) {
    console.error(`❌ Error verificando asociación ${modelName}.${associationName}:`, error.message);
    return false;
  }
}

// ⭐ FUNCIÓN PARA VERIFICAR TODAS LAS ASOCIACIONES CRÍTICAS
function validateCriticalAssociations() {
  console.log('\n🔍 Verificando asociaciones críticas para Taxxa:');
  
  const criticalAssociations = [
    // ⭐ ASOCIACIONES CRÍTICAS PARA TAXXA
    ['Invoice', 'bill'],
    ['Bill', 'invoices'],
    ['Bill', 'booking'],
    ['Booking', 'bill'],
    ['Invoice', 'seller'],
    ['Invoice', 'buyer'],
    ['Booking', 'guest'],
    
    // ⭐ ASOCIACIONES PARA NOTAS DE CRÉDITO
    ['CreditNote', 'originalInvoice'],
    ['CreditNote', 'bill'],
    ['Invoice', 'creditNotes'],
    
    // ⭐ ASOCIACIONES EXISTENTES IMPORTANTES
    ['Booking', 'room'],
    ['Room', 'bookings'],
    ['Booking', 'extraCharges'],
    ['User', 'createdBookings']
  ];

  let allValid = true;
  let validCount = 0;
  let totalCount = criticalAssociations.length;
  
  criticalAssociations.forEach(([model, association]) => {
    const isValid = checkAssociation(model, association);
    if (isValid) {
      validCount++;
    } else {
      allValid = false;
    }
  });

  console.log(`\n📊 Resultado: ${validCount}/${totalCount} asociaciones críticas válidas`);
  
  if (allValid) {
    console.log('✅ Todas las asociaciones críticas están configuradas correctamente');
  } else {
    console.log(`⚠️ ${totalCount - validCount} asociaciones críticas faltan o tienen problemas`);
  }

  return { allValid, validCount, totalCount };
}

// ⭐ FUNCIÓN PARA LIMPIAR ASOCIACIONES DUPLICADAS
function cleanDuplicateAssociations() {
  try {
    console.log('🧹 Limpiando asociaciones duplicadas...');
    
    Object.keys(sequelize.models).forEach(modelName => {
      const model = sequelize.models[modelName];
      const associations = model.associations || {};
      
      // Verificar si hay asociaciones duplicadas por alias
      const aliasCount = {};
      Object.keys(associations).forEach(alias => {
        aliasCount[alias] = (aliasCount[alias] || 0) + 1;
      });
      
      const duplicates = Object.keys(aliasCount).filter(alias => aliasCount[alias] > 1);
      if (duplicates.length > 0) {
        console.warn(`⚠️ ${modelName} tiene asociaciones duplicadas:`, duplicates);
      }
    });
    
    console.log('✅ Limpieza de asociaciones completada');
  } catch (error) {
    console.error('❌ Error limpiando asociaciones:', error.message);
  }
}

// ⭐ FUNCIÓN PARA MOSTRAR RESUMEN DE ASOCIACIONES POR MODELO
function showAssociationsSummary() {
  console.log('\n📋 Resumen de asociaciones por modelo:');
  
  const models = Object.keys(sequelize.models).sort();
  
  models.forEach(modelName => {
    const model = sequelize.models[modelName];
    const associations = Object.keys(model.associations || {});
    
    if (associations.length > 0) {
      console.log(`📊 ${modelName} (${associations.length}):`, associations.join(', '));
    } else {
      console.log(`📊 ${modelName}: Sin asociaciones`);
    }
  });
}

// ⭐ ACTUALIZAR LA FUNCIÓN validateAssociations EXISTENTE
function validateAssociations() {
  try {
    const models = Object.keys(sequelize.models);
    const associationsCount = models.reduce((count, modelName) => {
      const model = sequelize.models[modelName];
      const modelAssociations = Object.keys(model.associations || {}).length;
      return count + modelAssociations;
    }, 0);

    console.log('\n✅ Asociaciones creadas exitosamente');
    console.log(`📋 Total de modelos: ${models.length}`);
    console.log(`🔗 Total de asociaciones: ${associationsCount}`);
    
    // ⭐ MOSTRAR RESUMEN DETALLADO
    showAssociationsSummary();

    // ⭐ VERIFICAR ASOCIACIONES CRÍTICAS
    const criticalResult = validateCriticalAssociations();
    
    // ⭐ LIMPIAR DUPLICADOS
    cleanDuplicateAssociations();

    return {
      success: true,
      totalModels: models.length,
      totalAssociations: associationsCount,
      criticalAssociations: criticalResult
    };
  } catch (error) {
    console.error('❌ Error validando asociaciones:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===== REMOVER ASOCIACIÓN DUPLICADA DE INVOICE =====
// ⭐ COMENTAR O REMOVER ESTA SECCIÓN QUE ESTÁ DUPLICADA
/*
// ===== RELACIONES DE INVOICE ===== (DUPLICADA - REMOVER)
if (hasModel('Invoice')) {
  if (hasModel('Booking')) {
    const bookingPK = getPrimaryKey(Booking);
    Invoice.belongsTo(Booking, {
      foreignKey: 'bookingId',
      targetKey: bookingPK,
      as: 'booking'
    });
    Booking.hasOne(Invoice, {
      foreignKey: 'bookingId',
      sourceKey: bookingPK,
      as: 'invoice'
    });
  }

  if (hasModel('SellerData')) {
    Invoice.belongsTo(SellerData, {
      foreignKey: 'sellerId',
      as: 'seller'
    });
    SellerData.hasMany(Invoice, {
      foreignKey: 'sellerId',
      as: 'invoices'
    });
  }
}
*/

//---------------------------------------------------------------------------------//
module.exports = {
  ...sequelize.models, // para poder importar los modelos así: const { Product, User } = require('./db.js');
  conn: sequelize, // para importart la conexión { conn } = require('./db.js');
  sequelize, // exportar sequelize directamente también
  
  // ⭐ FUNCIONES HELPER EXPORTADAS (ACTUALIZADA)
  hasModel,
  getPrimaryKey,
  validateAssociations,
  checkAssociation,
  validateCriticalAssociations,
  cleanDuplicateAssociations,
  showAssociationsSummary
};