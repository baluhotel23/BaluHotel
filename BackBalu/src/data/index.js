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

// En sequelize.models están todos los modelos importados como propiedades
// Para relacionarlos hacemos un destructuring
const { BasicInventory, ExtraCharge, Token, Buyer, Booking, Bill, Room, SellerData, Invoice, RoomBasics, User, Purchase, PurchaseItem, RoomCheckIn, Service, Payment, RegistrationPass } = sequelize.models;

Room.belongsToMany(BasicInventory, { through: RoomBasics, foreignKey: 'roomNumber' });
BasicInventory.belongsToMany(Room, { through: RoomBasics, foreignKey: 'basicId' });

Room.hasOne(RoomCheckIn, { foreignKey: 'roomNumber', as: 'preparation' });
RoomCheckIn.belongsTo(Room, { foreignKey: 'roomNumber', as: 'room' });


Booking.belongsTo(Room);
Room.hasMany(Booking, { foreignKey: 'roomNumber' })
Booking.belongsTo(Room, { foreignKey: 'roomNumber' });
    
Booking.belongsTo(Buyer, { as: 'guest', foreignKey: 'guestId' });
   
Booking.hasMany(ExtraCharge, { foreignKey: 'bookingId' });
Booking.hasOne(Bill, { foreignKey: 'bookingId' });

Booking.hasMany(ExtraCharge);
ExtraCharge.belongsTo(Booking);
ExtraCharge.belongsTo(BasicInventory);
BasicInventory.hasMany(ExtraCharge);

Booking.hasOne(Bill);
Bill.belongsTo(Booking);

Purchase.hasMany(PurchaseItem, { foreignKey: 'purchaseId' }); // Asumiendo FK es purchaseId
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchaseId' });
PurchaseItem.belongsTo(BasicInventory, { foreignKey: 'basicId' }); // Asumiendo FK es basicId
BasicInventory.hasMany(PurchaseItem, { foreignKey: 'basicId' });

Room.belongsToMany(Service, { through: "RoomServices", foreignKey: "roomNumber" });
Service.belongsToMany(Room, { through: "RoomServices", foreignKey: "serviceId" });

Booking.hasMany(Payment, { foreignKey: 'bookingId' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId' });

// --- NUEVA ASOCIACIÓN para Payment y User ---
// Un Pago pertenece a un Usuario (el que lo procesó)
Payment.belongsTo(User, {
  foreignKey: 'processedBy', // La clave foránea en el modelo Payment
  targetKey: 'n_document',   // La clave en el modelo User a la que processedBy hace referencia
  as: 'processor'            // Alias para esta relación (opcional pero útil)
});

// Un Usuario puede haber procesado muchos Pagos
User.hasMany(Payment, {
  foreignKey: 'processedBy', // La clave foránea en el modelo Payment
  sourceKey: 'n_document',   // La clave en el modelo User que se usa para la relación
  as: 'processedPayments'    // Alias para esta relación (opcional pero útil)
});
// --- FIN DE NUEVA ASOCIACIÓN ---

// Relación entre Room y RegistrationPass
Room.hasMany(RegistrationPass, { foreignKey: 'roomNumber', sourceKey: 'roomNumber', as: 'registrationPasses' });
RegistrationPass.belongsTo(Room, { foreignKey: 'roomNumber', targetKey: 'roomNumber', as: 'room' });

// Relación entre Booking y RegistrationPass
Booking.hasMany(RegistrationPass, { foreignKey: 'bookingId', sourceKey: 'bookingId', as: 'registrationPasses' });
RegistrationPass.belongsTo(Booking, { foreignKey: 'bookingId', targetKey: 'bookingId', as: 'booking' });



//---------------------------------------------------------------------------------//
module.exports = {
  ...sequelize.models, // para poder importar los modelos así: const { Product, User } = require('./db.js');
  conn: sequelize, // para importart la conexión { conn } = require('./db.js');
}; //  // para importart la conexión { conn } = require('./db.js');