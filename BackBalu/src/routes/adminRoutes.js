const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/isAuth");
const { isAdmin, isOwner, allowRoles } = require("../middleware/byRol");
const {
  getAllUsers,
  createStaffUser,
  updateUser,
  deactivateUser,
} = require("../controllers/User/adminController");

const {
  getInventory,
  createPurchase,
  updateInventory,
  getLowStockItems,
} = require("../controllers/inventoryController");

const {
  getDashboard,
  getReports,
  getExpenses,
  createExpense,
} = require("../controllers/financialController");

const {
  getHotelSettings,
  updateHotelSettings,
  
} = require("../controllers/hotelController");

const {
    getOccupancyReport,
    getRevenueReport,
    getInventoryUsageReport,
    getCombinedReport,
} = require("../controllers/reportController");

const { createService, updateService, deleteService, getAllServices } = require("../controllers/serviceController");



router.use(verifyToken);

// Rutas de gestión de usuarios (solo owner)
router.get("/users", isOwner, getAllUsers);
router.post("/users", isOwner, createStaffUser);
router.put("/users/:id", isOwner, updateUser);
router.delete("/users/:id", isOwner, deactivateUser);

// Rutas de gestión de inventario (owner y admin)
router.get("/", allowRoles(["owner", "admin"]), getInventory);
router.post("/purchase", allowRoles(["owner", "admin"]), createPurchase);
router.put("/:id", allowRoles(["owner", "admin"]), updateInventory);
router.get("/low-stock", allowRoles(["owner", "admin"]), getLowStockItems);

//Rutas de gestión financiera (solo owner)

router.get("/expenses", isOwner, getExpenses);
router.post("/expenses", isOwner, createExpense);

// Rutas de configuración del hotel (owner y admin)
router.get("/settings/hotel-settings", allowRoles(["owner", "admin"]), getHotelSettings);
router.put("/settings/hotel-settings", allowRoles(["owner", "admin"]), updateHotelSettings);



// Rutas de reportes y análisis
router.get('/reports/occupancy', allowRoles(['owner', 'admin']), getOccupancyReport);
 router.get('/reports/revenue', isOwner, getRevenueReport);
 router.get('/reports/inventory-usage', allowRoles(['owner', 'admin']), getInventoryUsageReport);
router.get('/reports/combined', allowRoles(['owner', 'admin']),getCombinedReport);


// Rutas para la gestión de servicios (solo owner y admin)
router.post("/services", allowRoles(["owner", "admin"]), createService);
router.put("/services/:id", allowRoles(["owner", "admin"]), updateService);
router.get("/services", allowRoles(["owner", "admin"]), getAllServices);
router.delete("/services/:id", allowRoles(["owner", "admin"]), deleteService);


module.exports = router;
