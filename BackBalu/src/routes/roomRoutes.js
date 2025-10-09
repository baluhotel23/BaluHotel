const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { allowRoles } = require('../middleware/byRol');
const {
    getAllRooms,
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
    getRevenueByRoomType,
    getRoomBasics, 
    getRoomPreparationStatus,
    getActivePromotions,
    getSpecialOffers,
    calculateRoomPrice,
    calculateMultipleRoomPrices,
    checkInventoryAvailability, // ⭐ NUEVO
    getRoomInventoryHistory // ⭐ NUEVO
} = require('../controllers/roomController');

// RUTAS PÚBLICAS
router.get('/', getAllRooms);
router.get('/types', getRoomTypes);
router.get('/promotions', getActivePromotions);
router.get('/special-offers', getSpecialOffers);
router.get('/availability/:dates', checkAvailability);
router.get('/:roomNumber', getRoomById);

// RUTAS PÚBLICAS PARA CÁLCULO DE PRECIOS
router.post('/pricing/calculate', calculateRoomPrice);
router.post('/pricing/calculate-multiple', calculateMultipleRoomPrices);

// MIDDLEWARE DE AUTENTICACIÓN
router.use(verifyToken);

// GESTIÓN DE HABITACIONES
router.post('/create', allowRoles(['owner', 'admin']), createRoom);
router.put('/:roomNumber', allowRoles(['owner', 'admin']), updateRoom);
router.delete('/:roomNumber', allowRoles(['owner', 'admin']), deleteRoom);

// MANTENIMIENTO Y ESTADO
router.put('/status/:roomNumber', allowRoles(['owner', 'admin', 'receptionist', 'recept']), updateRoomStatus);

// AMENITIES Y SERVICIOS
router.get('/:roomNumber/amenities', allowRoles(['owner', 'admin', 'receptionist', 'recept']), getRoomAmenities);
router.put('/:roomNumber/amenities', allowRoles(['owner', 'admin']), updateRoomAmenities);
router.get('/:roomNumber/services', allowRoles(['owner', 'admin', 'receptionist', 'recept']), getRoomServices);
router.put('/:roomNumber/services', allowRoles(['owner', 'admin']), updateRoomServices);

// BÁSICOS DE HABITACIÓN E INVENTARIO
router.get('/basicos/:roomNumber', allowRoles(['owner', 'admin', 'receptionist', 'recept']), getRoomBasics);

// ⭐ NUEVAS RUTAS DE INVENTARIO
router.get('/:roomNumber/inventory/check', allowRoles(['owner', 'admin', 'receptionist', 'recept']), checkInventoryAvailability);
router.get('/:roomNumber/inventory/history', allowRoles(['owner', 'admin']), getRoomInventoryHistory);

// REPORTES Y ANÁLISIS
router.get('/reports/occupancy', allowRoles(['owner', 'admin']), getOccupancyReport);
router.get('/reports/revenue', allowRoles(['owner', 'admin']), getRevenueByRoomType);
router.get('/reports/preparation-status/:roomNumber', allowRoles(['owner', 'admin', 'receptionist', 'recept']), getRoomPreparationStatus);

module.exports = router;