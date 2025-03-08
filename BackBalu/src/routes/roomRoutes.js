const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');
//const { validateRoom } = require('../middleware/validation');

// Rutas públicas
// router.get('/', roomController.getAllRooms);
// router.get('/types', roomController.getRoomTypes);
// router.get('/:id', roomController.getRoomById);
// router.get('/availability/:dates', roomController.checkAvailability);

// Rutas protegidas
router.use(verifyToken);

// Gestión de habitaciones (admin y owner)
// router.post('/', 
//     allowRoles(['owner', 'admin']), 
//     validateRoom, 
//     roomController.createRoom
// );
// router.put('/:id', 
//     allowRoles(['owner', 'admin']), 
//     validateRoom, 
//     roomController.updateRoom
// );
// router.delete('/:id', 
//     allowRoles(['owner', 'admin']), 
//     roomController.deleteRoom
// );

// Gestión de tipos de habitación
// router.get('/types/all', allowRoles(['owner', 'admin']), roomController.getAllRoomTypes);
// router.post('/types', allowRoles(['owner', 'admin']), roomController.createRoomType);
// router.put('/types/:id', allowRoles(['owner', 'admin']), roomController.updateRoomType);

// // Mantenimiento y estado
// router.get('/maintenance/history/:id', allowRoles(['owner', 'admin']), roomController.getMaintenanceHistory);
// router.post('/maintenance/:id', allowRoles(['owner', 'admin']), roomController.createMaintenanceRecord);
// router.put('/status/:id', allowRoles(['owner', 'admin']), roomController.updateRoomStatus);

// Amenities y servicios
// router.get('/:id/amenities', roomController.getRoomAmenities);
// router.put('/:id/amenities', allowRoles(['owner', 'admin']), roomController.updateRoomAmenities);
// router.get('/:id/services', roomController.getRoomServices);
// router.put('/:id/services', allowRoles(['owner', 'admin']), roomController.updateRoomServices);

// // Reportes
// router.get('/reports/occupancy', allowRoles(['owner', 'admin']), roomController.getOccupancyReport);
// router.get('/reports/revenue', allowRoles(['owner', 'admin']), roomController.getRevenueByRoomType);
// router.get('/reports/maintenance', allowRoles(['owner', 'admin']), roomController.getMaintenanceReport);

module.exports = router;