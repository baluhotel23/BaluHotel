const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const { validateInventoryItem } = require('../middleware/validation/validateInventoryItem');
const { 
    getInventory,
    createPurchase,
    updateInventory,
    getPurchaseDetails,
    getLowStockItems,
    createCategory,
    updateCategory,
    getCategories,
    createSupplier,
    getAllSuppliers,
    getAllItems,
    getAllPurchases,
    getStockHistory,
    addStock,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    removeStock,
    getConsumptionReport,
    getInventoryValuation,
    getInventoryMovements,
    getRoomAssignments,
    createRoomAssignment,
    getRoomAssignmentDetails
} = require('../controllers/inventoryController');

// Todas las rutas requieren autenticación
router.use(verifyToken);
router.use(isStaff);

// IMPORTANTE: Rutas específicas primero, rutas con parámetros después

// === RUTAS ESPECÍFICAS ===

// Gestión de inventario básico - rutas base
router.get('/', getInventory);
router.get('/items', getAllItems); // Cambiado a /items para evitar conflicto
router.post('/', validateInventoryItem, createItem);

// Control de stock específico
router.get('/low-stock', getLowStockItems);

// Compras y proveedores - Rutas específicas
router.get('/purchases', getAllPurchases);
router.post('/purchase', allowRoles(['owner', 'admin']), createPurchase);
router.get('/purchases/:id', getPurchaseDetails);
router.get('/suppliers', getAllSuppliers);
router.post('/suppliers', allowRoles(['owner', 'admin']), createSupplier);

// Categorías y tipos - Rutas específicas
router.get('/categories', getCategories);
router.post('/categories', allowRoles(['owner', 'admin']), createCategory);
router.put('/categories/:id', allowRoles(['owner', 'admin']), updateCategory);

// Reportes de inventario - Rutas específicas
router.get('/reports/consumption', allowRoles(['owner', 'admin']), getConsumptionReport);
router.get('/reports/valuation', allowRoles(['owner', 'admin']), getInventoryValuation);
router.get('/reports/movements', allowRoles(['owner', 'admin']), getInventoryMovements);

// Asignación a habitaciones - Rutas específicas
router.get('/room-assignments', getRoomAssignments);
router.post('/room-assignments', createRoomAssignment);
router.get('/room-assignments/:roomId', getRoomAssignmentDetails);

// === RUTAS CON PARÁMETROS (deben ir al final) ===

// Rutas específicas para un ítem de inventario (con ID)
router.get('/:id', getItemById);
router.put('/:id/general', updateInventory);
router.put('/:id', validateInventoryItem, updateItem);
router.delete('/:id', allowRoles(['owner', 'admin']), deleteItem);

// Control de stock para un ítem específico
router.post('/:id/stock/add', addStock);
router.post('/:id/stock/remove', removeStock);
router.get('/:id/stock/history', getStockHistory);

module.exports = router;