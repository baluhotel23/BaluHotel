const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const { validateInventoryItem } = require('../middleware/validation/validateInventoryItem');
const { upload } = require('../middleware/multer');
const { 
    getInventory,
    getInventoryByType, // ⭐ NUEVO
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
    transferDirtyToClean, // ⭐ NUEVO
    markAsDirty, // ⭐ NUEVO
    getInventorySummary, // ⭐ NUEVO
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

// === RUTAS ESPECÍFICAS ===

// Gestión de inventario básico
router.get('/', getInventory);
router.get('/items', getAllItems);
router.post('/', validateInventoryItem, createItem);

// ⭐ NUEVAS RUTAS POR TIPO DE INVENTARIO
router.get('/type/:type', getInventoryByType); // consumable, reusable, sellable
router.get('/summary', getInventorySummary); // Resumen general

// Control de stock específico
router.get('/low-stock', getLowStockItems);

// Compras y proveedores
router.get('/purchases', getAllPurchases);
router.post('/purchase', upload.single('file'), allowRoles(['owner', 'admin']), createPurchase);
router.get('/purchases/:id', getPurchaseDetails);
router.get('/suppliers', getAllSuppliers);
router.post('/suppliers', allowRoles(['owner', 'admin']), createSupplier);

// Categorías y tipos
router.get('/categories', getCategories);
router.post('/categories', allowRoles(['owner', 'admin']), createCategory);
router.put('/categories/:id', allowRoles(['owner', 'admin']), updateCategory);

// Reportes de inventario
router.get('/reports/consumption', allowRoles(['owner', 'admin']), getConsumptionReport);
router.get('/reports/valuation', allowRoles(['owner', 'admin']), getInventoryValuation);
router.get('/reports/movements', allowRoles(['owner', 'admin']), getInventoryMovements);

// Asignación a habitaciones
router.get('/room-assignments/:roomId', getRoomAssignments);
router.post('/room-assignments', createRoomAssignment);
//router.get('/room-assignments/:roomId', getRoomAssignmentDetails);

// === RUTAS CON PARÁMETROS ===

// Rutas específicas para un ítem de inventario
router.get('/:id', getItemById);
router.put('/:id/general', updateInventory);
router.put('/:id', validateInventoryItem, updateItem);
router.delete('/:id', allowRoles(['owner', 'admin']), deleteItem);

// Control de stock para un ítem específico
router.post('/:id/stock/add', addStock);
router.post('/:id/stock/remove', removeStock);
router.get('/:id/stock/history', getStockHistory);

// ⭐ NUEVAS RUTAS PARA REUTILIZABLES
router.post('/:id/transfer-clean', transferDirtyToClean); // Transferir sucio → limpio
router.post('/:id/mark-dirty', markAsDirty); // Marcar como sucio

module.exports = router;