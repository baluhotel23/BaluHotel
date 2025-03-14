const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isStaff, allowRoles } = require('../middleware/byRol');
const  {validateInventoryItem}  = require('../middleware/validation/validateInventoryItem');
const { getInventory ,
    createPurchase ,
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
        getInventoryMovements, getRoomAssignments,
        createRoomAssignment,
        getRoomAssignmentDetails} = require('../controllers/inventoryController');
        
    
// Todas las rutas requieren autenticación


router.use(verifyToken);
router.use(isStaff);

// Gestión de inventario básico
router.get('/', getInventory);
router.put('/:id', updateInventory);

router.get('/', getAllItems);
router.get('/:id', getItemById);
router.post('/', validateInventoryItem, createItem);
router.put('/:id', validateInventoryItem, updateItem);
router.delete('/:id', allowRoles(['owner', 'admin']), deleteItem);

// Control de stock
router.get('/low-stock', getLowStockItems);
router.post('/:id/stock/add', addStock);
router.post('/:id/stock/remove', removeStock);
router.get('/:id/stock/history', getStockHistory);

// Compras y proveedores
 router.get('/purchases', getAllPurchases);
 router.post('/purchases', allowRoles(['owner', 'admin']), createPurchase);
 router.get('/purchases/:id', getPurchaseDetails);
router.get('/suppliers', getAllSuppliers);
 router.post('/suppliers', allowRoles(['owner', 'admin']), createSupplier);

// // Categorías y tipos
 router.get('/categories', getCategories);
 router.post('/categories', allowRoles(['owner', 'admin']), createCategory);
 router.put('/categories/:id', allowRoles(['owner', 'admin']), updateCategory);

// // Reportes de inventario
router.get('/reports/consumption', allowRoles(['owner', 'admin']), getConsumptionReport);
router.get('/reports/valuation', allowRoles(['owner', 'admin']), getInventoryValuation);
router.get('/reports/movements', allowRoles(['owner', 'admin']), getInventoryMovements);

// // Asignación a habitaciones
router.get('/room-assignments', getRoomAssignments);
router.post('/room-assignments', createRoomAssignment);
router.get('/room-assignments/:roomId', getRoomAssignmentDetails);

module.exports = router;