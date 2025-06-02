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
    calculateRoomPrice,           // ⭐ NUEVA FUNCIÓN
    calculateMultipleRoomPrices   // ⭐ NUEVA FUNCIÓN
} = require('../controllers/roomController');

// ⭐ RUTAS PÚBLICAS
router.get('/', getAllRooms);
router.get('/types', getRoomTypes);
router.get('/promotions', getActivePromotions);          // ⭐ NUEVA RUTA
router.get('/special-offers', getSpecialOffers);         // ⭐ NUEVA RUTA
router.get('/availability/:dates', checkAvailability);
router.get('/:roomNumber', getRoomById);

// ⭐ RUTAS PÚBLICAS PARA CÁLCULO DE PRECIOS (sin autenticación para cotizaciones)
router.post('/pricing/calculate', calculateRoomPrice);            // ⭐ NUEVA RUTA
router.post('/pricing/calculate-multiple', calculateMultipleRoomPrices); // ⭐ NUEVA RUTA

// ⭐ MIDDLEWARE DE AUTENTICACIÓN PARA RUTAS PROTEGIDAS
router.use(verifyToken);

// ⭐ GESTIÓN DE HABITACIONES (admin y owner)
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

// ⭐ MANTENIMIENTO Y ESTADO
router.put('/status/:roomNumber', 
    allowRoles(['owner', 'admin', 'receptionist']), 
    updateRoomStatus
);

// ⭐ AMENITIES Y SERVICIOS
router.get('/:roomNumber/amenities', 
    allowRoles(['owner', 'admin', 'receptionist']), 
    getRoomAmenities
);

router.put('/:roomNumber/amenities', 
    allowRoles(['owner', 'admin']), 
    updateRoomAmenities
);

router.get('/:roomNumber/services', 
    allowRoles(['owner', 'admin', 'receptionist']), 
    getRoomServices
);

router.put('/:roomNumber/services', 
    allowRoles(['owner', 'admin']), 
    updateRoomServices
);

// ⭐ BÁSICOS DE HABITACIÓN
router.get('/basicos/:roomNumber', 
    allowRoles(['owner', 'admin', 'receptionist']), 
    getRoomBasics
);

// ⭐ REPORTES Y ANÁLISIS
router.get('/reports/occupancy', 
    allowRoles(['owner', 'admin']), 
    getOccupancyReport
);

router.get('/reports/revenue', 
    allowRoles(['owner', 'admin']), 
    getRevenueByRoomType
);

router.get('/reports/preparation-status/:roomNumber', 
    allowRoles(['owner', 'admin', 'receptionist']), 
    getRoomPreparationStatus
);

module.exports = router;