const Router = require('express');
const { createInvoice, createCreditNote } = require('../controllers/Taxxa/TaxxaService');
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

// 🆕 IMPORTAR NUEVO CONTROLLER DE INVOICES
const {
  getAllInvoicesSimple,
  getInvoiceById,
  getNumberingStats,
  searchInvoices,
  resendInvoice
} = require('../controllers/Taxxa/invoiceController');

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
router.post('/sendCreditNote', allowRoles(["owner", "admin"]), createCreditNote);
router.post('/sellerData', allowRoles(["owner", "admin"]), getOrCreateSellerData);
router.put('/sellerData/:sdocno', allowRoles(["owner", "admin"]), updateSellerData);
router.get('/sellerData/:sdocno', allowRoles(["owner", "admin"]), getSellerDataBySdocno);

// 🆕 NUEVAS RUTAS DE GESTIÓN DE FACTURAS EMITIDAS
router.get('/invoices', allowRoles(["owner", "admin", "staff"]), getAllInvoicesSimple);          // Listar todas las facturas
router.get('/invoices/search', allowRoles(["owner", "admin", "staff"]), searchInvoices);    // Buscar facturas
router.get('/invoices/stats', allowRoles(["owner", "admin"]), getNumberingStats);           // Estadísticas
router.get('/invoices/:invoiceId', allowRoles(["owner", "admin", "staff"]), getInvoiceById); // Factura específica
router.post('/invoices/:invoiceId/resend', allowRoles(["owner", "admin"]), resendInvoice);   // Reenviar

// 🆕 RUTA ALTERNATIVA PARA CREAR FACTURAS (manteniendo compatibilidad)
router.post('/invoice', allowRoles(["owner", "admin"]), createInvoice);

// 🆕 RUTA ALTERNATIVA PARA CREAR NOTAS DE CRÉDITO (manteniendo compatibilidad)
router.post('/credit-note', allowRoles(["owner", "admin"]), createCreditNote); 

module.exports = router;