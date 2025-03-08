const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const { validateInventoryItem } = require('../middleware/validation');
const { getInventory ,
    createPurchase ,
    updateInventory,
    getLowStockItems } = require('../controllers/inventoryController');
// Todas las rutas requieren autenticación


router.use(verifyToken);
router.use(isStaff);

// Gestión de inventario básico
//router.get('/', inventoryController.getAllItems);
//router.get('/:id', inventoryController.getItemById);
// router.post('/', validateInventoryItem, inventoryController.createItem);
// router.put('/:id', validateInventoryItem, inventoryController.updateItem);
// router.delete('/:id', allowRoles(['owner', 'admin']), inventoryController.deleteItem);

// Control de stock
router.get('/low-stock', getLowStockItems);
//router.post('/:id/stock/add', inventoryController.addStock);
//router.post('/:id/stock/remove', inventoryController.removeStock);
//router.get('/:id/stock/history', inventoryController.getStockHistory);

// Compras y proveedores
// router.get('/purchases', inventoryController.getAllPurchases);
// router.post('/purchases', allowRoles(['owner', 'admin']), inventoryController.createPurchase);
// router.get('/purchases/:id', inventoryController.getPurchaseDetails);
// router.get('/suppliers', inventoryController.getAllSuppliers);
// router.post('/suppliers', allowRoles(['owner', 'admin']), inventoryController.createSupplier);

// // Categorías y tipos
// router.get('/categories', inventoryController.getCategories);
// router.post('/categories', allowRoles(['owner', 'admin']), inventoryController.createCategory);
// router.put('/categories/:id', allowRoles(['owner', 'admin']), inventoryController.updateCategory);

// // Reportes de inventario
// router.get('/reports/consumption', allowRoles(['owner', 'admin']), inventoryController.getConsumptionReport);
// router.get('/reports/valuation', allowRoles(['owner', 'admin']), inventoryController.getInventoryValuation);
// router.get('/reports/movements', allowRoles(['owner', 'admin']), inventoryController.getInventoryMovements);

// // Asignación a habitaciones
// router.get('/room-assignments', inventoryController.getRoomAssignments);
// router.post('/room-assignments', inventoryController.createRoomAssignment);
// router.get('/room-assignments/:roomId', inventoryController.getRoomAssignmentDetails);

module.exports = router;