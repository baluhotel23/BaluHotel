const app = require('./src/app.js');
const { conn } = require('./src/data');
const { PORT } = require('./src/config/envs.js');
require('dotenv').config();
const loadRooms = require('./src/utils/scriptHabitaciones');
// Syncing all the models at once.
conn.sync({ alter : true }).then(async () => {
  await loadRooms();
  console.log('🚪 Habitaciones creadas exitosamente.');
  app.listen(PORT, () => {
    console.log(`🚀 listening on port: ${PORT} 🚀`);
  });
 
});

