const Router = require('express');
const { createInvoice } = require('../controllers/Taxxa/TaxxaService');
const { verifyToken } = require("../middleware/isAuth");
const { allowRoles } = require("../middleware/byRol");
const {getOrCreateSellerData, updateSellerData, getSellerDataBySdocno} = require('../controllers/Taxxa/sellerDataControllers');
const {createBuyer, getBuyerByDocument} = require('../controllers/Taxxa/buyerController');

const {
  getCountries,
  getDepartments,
  getMunicipalities,
  validateLocation,
  getCatalogStats
} = require('../controllers/Taxxa/dianCodeController');

const router = Router();

// 🆕 RUTAS PÚBLICAS DE CATÁLOGOS DIAN (no requieren autenticación)
router.get('/dian/countries', getCountries);
router.get('/dian/departments', getDepartments);
router.get('/dian/municipalities', getMunicipalities);
router.post('/dian/validate-location', validateLocation);
router.get('/dian/stats', getCatalogStats);

// RUTAS PÚBLICAS EXISTENTES
router.post('/buyer', createBuyer);
router.get('/buyer/:sdocno', getBuyerByDocument);

// 🔒 MIDDLEWARE DE AUTENTICACIÓN
router.use(verifyToken);

// RUTAS PROTEGIDAS EXISTENTES
router.post('/sendInvoice', allowRoles(["owner", "admin"]), createInvoice);

router.post('/sellerData', allowRoles(["owner", "admin"]), getOrCreateSellerData);
router.put('/sellerData/:sdocno', allowRoles(["owner", "admin"]), updateSellerData);
router.get('/sellerData/:sdocno', allowRoles(["owner", "admin"]), getSellerDataBySdocno);

module.exports = router;