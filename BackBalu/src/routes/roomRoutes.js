const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');
const {getAllRooms,
    getRoomTypes,
    getRoomById,
    checkAvailability,
    createRoom,
    updateRoom,
    deleteRoom,
   updateRoomStatus,
    getRoomAmenities,
    updateRoomAmenities,
    getRoomServices,
    updateRoomServices,
    getOccupancyReport,
    getRevenueByRoomType} = require('../controllers/roomController');

// Rutas públicas
router.get('/', getAllRooms);
router.get('/types', getRoomTypes);
router.get('/:roomNumber', getRoomById);
router.get("/", getRoomById);
router.get('/availability/:dates', checkAvailability);

// Rutas protegidas
router.use(verifyToken);

// Gestión de habitaciones (admin y owner)
router.post('/create', 
    allowRoles(['owner', 'admin']), 
    
    createRoom
);
router.put('/:roomNumber', 
    allowRoles(['owner', 'admin']), 
    
    updateRoom
 );
router.delete('/:roomNumber', 
    allowRoles(['owner', 'admin']), 
    deleteRoom
);

 // Mantenimiento y estado
// router.get('/maintenance/history/:id', allowRoles(['owner', 'admin']), getMaintenanceHistory);
// router.post('/maintenance/:id', allowRoles(['owner', 'admin']), createMaintenanceRecord);
router.put('/status/:roomNumber', allowRoles(['owner', 'admin']), updateRoomStatus);

// Amenities y servicios
router.get('/:roomNumber/amenities', getRoomAmenities);
router.put('/:roomNumber/amenities', allowRoles(['owner', 'admin']), updateRoomAmenities);
router.get('/:roomNumber/services', getRoomServices);
router.put('/:roomNumber/services', allowRoles(['owner', 'admin']), updateRoomServices);

// // Reportes
 router.get('/reports/occupancy', allowRoles(['owner', 'admin']), getOccupancyReport);
 router.get('/reports/revenue', allowRoles(['owner', 'admin']), getRevenueByRoomType);

module.exports = router;