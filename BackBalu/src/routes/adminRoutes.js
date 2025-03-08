const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/isAuth');
const { isAdmin, isOwner, allowRoles } = require('../middleware/byRol');
const {getAllUsers,
    createStaffUser,
    updateUser,
    deactivateUser} = require('../controllers/User/adminController');

 const{getInventory ,
     createPurchase ,
     updateInventory,
     getLowStockItems} = require('../controllers/inventoryController');
     
     const {getDashboard,
        getReports,
        getExpenses,
        createExpense} = require('../controllers/financialController');



// Middleware de autenticación para todas las rutas
router.use(verifyToken);

// Rutas de gestión de usuarios (solo owner)
router.get('/users', isOwner, getAllUsers);
router.post('/users', isOwner, createStaffUser);
router.put('/users/:id', isOwner, updateUser);
router.delete('/users/:id', isOwner, deactivateUser);

// Rutas de gestión de inventario (owner y admin)
router.get('/inventory', allowRoles(['owner', 'admin']), getInventory);
router.post('/inventory/purchase', allowRoles(['owner', 'admin']), createPurchase);
router.put('/inventory/:id', allowRoles(['owner', 'admin']), updateInventory);
router.get('/inventory/low-stock', allowRoles(['owner', 'admin']), getLowStockItems);

//Rutas de gestión financiera (solo owner)

router.get('/financial/expenses', isOwner, getExpenses);
router.post('/financial/expenses', isOwner, createExpense);

// Rutas de configuración del hotel (owner y admin)
// router.get('/settings', allowRoles(['owner', 'admin']), getHotelSettings);
// router.put('/settings', allowRoles(['owner', 'admin']), updateHotelSettings);
// router.post('/rooms/category', allowRoles(['owner', 'admin']), createRoomCategory);
// router.put('/rooms/category/:id', allowRoles(['owner', 'admin']), updateRoomCategory);

// Rutas de reportes y análisis
// router.get('/reports/occupancy', allowRoles(['owner', 'admin']), reportController.getOccupancyReport);
// router.get('/reports/revenue', isOwner, reportController.getRevenueReport);
// router.get('/reports/inventory-usage', allowRoles(['owner', 'admin']), reportController.getInventoryUsageReport);

module.exports = router;
