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
const sequelize = new Sequelize(
  `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  {
    logging: false, // set to console.log to see the raw SQL queries
    native: false, // lets Sequelize know we can use pg-native for ~30% more speed
  }
);
//-------------------------------------CONFIGURACION PARA EL DEPLOY---------------------------------------------------------------------
// const sequelize = new Sequelize(DB_DEPLOY , {
//       logging: false, // set to console.log to see the raw SQL queries
//       native: false, // lets Sequelize know we can use pg-native for ~30% more speed
//     }
//   );

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

// ===== RELACIONES DE ROOM =====

const { BasicInventory, ExtraCharge, Token, Buyer, Booking, Bill, Room, SellerData, Invoice, RoomBasics, User, Purchase, PurchaseItem, RoomCheckIn, Service, Payment, RegistrationPass } = sequelize.models;
// Con BasicInventory (muchos a muchos)
Room.belongsToMany(BasicInventory, { through: RoomBasics, foreignKey: 'roomNumber' });
BasicInventory.belongsToMany(Room, { through: RoomBasics, foreignKey: 'basicId' });

// Con RoomCheckIn (uno a uno)
Room.hasOne(RoomCheckIn, { foreignKey: 'roomNumber', as: 'preparation' });
RoomCheckIn.belongsTo(Room, { foreignKey: 'roomNumber', as: 'room' });

// Con Service (muchos a muchos)
Room.belongsToMany(Service, { through: "RoomServices", foreignKey: "roomNumber" });
Service.belongsToMany(Room, { through: "RoomServices", foreignKey: "serviceId" });

// Con RegistrationPass (uno a muchos)
Room.hasMany(RegistrationPass, { foreignKey: 'roomNumber', sourceKey: 'roomNumber', as: 'registrationPasses' });
RegistrationPass.belongsTo(Room, { foreignKey: 'roomNumber', targetKey: 'roomNumber', as: 'room' });

// ===== RELACIONES DE BOOKING =====
// Con Room (muchos a uno)
Room.hasMany(Booking, { foreignKey: 'roomNumber' });
Booking.belongsTo(Room, { foreignKey: 'roomNumber' });

// Con Buyer (muchos a uno)
Booking.belongsTo(Buyer, { as: 'guest', foreignKey: 'guestId' });

// Con ExtraCharge (uno a muchos)
Booking.hasMany(ExtraCharge, { foreignKey: 'bookingId' });
ExtraCharge.belongsTo(Booking, { foreignKey: 'bookingId' });

// Con Bill (uno a uno)
Booking.hasOne(Bill, { foreignKey: 'bookingId' });
Bill.belongsTo(Booking, { foreignKey: 'bookingId' });

// Con Payment (uno a muchos)
Booking.hasMany(Payment, { foreignKey: 'bookingId' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId' });

// Con RegistrationPass (uno a muchos)
Booking.hasMany(RegistrationPass, { foreignKey: 'bookingId', sourceKey: 'bookingId', as: 'registrationPasses' });
RegistrationPass.belongsTo(Booking, { foreignKey: 'bookingId', targetKey: 'bookingId', as: 'booking' });

// ===== RELACIONES DE PAYMENT =====
// Con User
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

// ===== RELACIONES DE EXTRACHARGE =====
// Con BasicInventory
ExtraCharge.belongsTo(BasicInventory, { foreignKey: 'basicId' });
BasicInventory.hasMany(ExtraCharge, { foreignKey: 'basicId' });

// ===== RELACIONES DE PURCHASE =====
// Con PurchaseItem
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchaseId' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchaseId' });

// Con BasicInventory
PurchaseItem.belongsTo(BasicInventory, { foreignKey: 'basicId' });
BasicInventory.hasMany(PurchaseItem, { foreignKey: 'basicId' });



//---------------------------------------------------------------------------------//
module.exports = {
  ...sequelize.models, // para poder importar los modelos así: const { Product, User } = require('./db.js');
  conn: sequelize, // para importart la conexión { conn } = require('./db.js');
};