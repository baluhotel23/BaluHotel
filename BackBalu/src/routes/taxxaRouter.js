const Router = require('express');
// ⭐ ACTUALIZAR IMPORTS PARA INCLUIR FUNCIONES DE FACTURACIÓN MANUAL
const { 
  createInvoice, 
  createCreditNote,
  createManualInvoice,      // ⭐ NUEVO
  getManualInvoiceData,     // ⭐ NUEVO
  searchBuyerForManual      // ⭐ NUEVO
} = require('../controllers/Taxxa/TaxxaService');

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

const {
  getAllInvoices,
  getInvoiceById,
  getNumberingStats,
  searchInvoices,
  resendInvoice
} = require('../controllers/Taxxa/invoiceController');

console.log('🔍 Router imports:', { 
  createInvoice: typeof createInvoice,
  createCreditNote: typeof createCreditNote,
  createManualInvoice: typeof createManualInvoice,        // ⭐ DEBUG NUEVO
  getManualInvoiceData: typeof getManualInvoiceData,      // ⭐ DEBUG NUEVO
  searchBuyerForManual: typeof searchBuyerForManual       // ⭐ DEBUG NUEVO
});

const router = Router();

// 🔧 DEBUG MIDDLEWARE SOLO PARA CREDIT-NOTE
router.use((req, res, next) => {
  if (req.path === '/credit-note' && req.method === 'POST') {
    console.log('\n🎯 [CREDIT-NOTE] Request detected!');
    console.log('  - Method:', req.method);
    console.log('  - Path:', req.path);
    console.log('  - Original URL:', req.originalUrl);
    console.log('  - Headers:', Object.keys(req.headers));
    console.log('  - Authorization:', req.headers.authorization ? 'PRESENTE' : 'AUSENTE');
    console.log('  - Body:', req.body);
  }
  // ⭐ AGREGAR DEBUG PARA RUTAS DE FACTURACIÓN MANUAL
  if (req.path.includes('/manual') && req.method === 'POST') {
    console.log('\n🎯 [MANUAL-INVOICE] Request detected!');
    console.log('  - Method:', req.method);
    console.log('  - Path:', req.path);
    console.log('  - Body keys:', Object.keys(req.body || {}));
  }
  next();
});

// 🆕 RUTAS PÚBLICAS DE CATÁLOGOS DIAN (no requieren autenticación)
router.get('/dian/countries', getCountries);
router.get('/dian/departments', getDepartments);
router.get('/dian/municipalities', getMunicipalities);
router.post('/dian/validate-location', validateLocation);
router.get('/dian/stats', getCatalogStats);

// RUTAS PÚBLICAS EXISTENTES
router.post('/buyer', createBuyer);
router.get('/buyer/:sdocno', getBuyerByDocument);

// 🔧 DEBUG ANTES DEL MIDDLEWARE DE AUTENTICACIÓN
router.use((req, res, next) => {
  if (req.path === '/credit-note' && req.method === 'POST') {
    console.log('🔐 [CREDIT-NOTE] About to apply verifyToken middleware');
  }
  next();
});

// 🔒 MIDDLEWARE DE AUTENTICACIÓN
router.use(verifyToken);

// 🔧 DEBUG DESPUÉS DEL MIDDLEWARE DE AUTENTICACIÓN
router.use((req, res, next) => {
  if (req.path === '/credit-note' && req.method === 'POST') {
    console.log('✅ [CREDIT-NOTE] Passed verifyToken middleware');
    console.log('  - User ID:', req.user?.id);
    console.log('  - User role:', req.user?.role);
  }
  next();
});

// RUTAS PROTEGIDAS EXISTENTES
router.post('/sendInvoice', allowRoles(["owner", "admin"]), createInvoice);
router.post('/sendCreditNote', allowRoles(["owner", "admin"]), createCreditNote);
router.post('/sellerData', allowRoles(["owner", "admin"]), getOrCreateSellerData);
router.put('/sellerData/:sdocno', allowRoles(["owner", "admin"]), updateSellerData);
router.get('/sellerData/:sdocno', allowRoles(["owner", "admin"]), getSellerDataBySdocno);

// 🆕 NUEVAS RUTAS DE GESTIÓN DE FACTURAS EMITIDAS
router.get('/invoices', allowRoles(["owner", "admin", "staff"]), getAllInvoices);
router.get('/invoices/search', allowRoles(["owner", "admin", "staff"]), searchInvoices);
router.get('/invoices/stats', allowRoles(["owner", "admin"]), getNumberingStats);
router.get('/invoices/:invoiceId', allowRoles(["owner", "admin", "staff"]), getInvoiceById);
router.post('/invoices/:invoiceId/resend', allowRoles(["owner", "admin"]), resendInvoice);

// ⭐ NUEVAS RUTAS PARA FACTURACIÓN MANUAL
console.log('🔧 Registrando rutas de facturación manual...');

// Obtener datos para crear factura manual (próximo número + seller)
router.get('/manual-invoice-data', allowRoles(["owner", "admin"]), (req, res) => {
  console.log('📋 [MANUAL-DATA] Obteniendo datos para facturación manual');
  try {
    return getManualInvoiceData(req, res);
  } catch (error) {
    console.error('❌ [MANUAL-DATA] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo datos para facturación manual',
      error: error.message
    });
  }
});

// Buscar comprador para facturación manual
router.get('/manual-buyer/:document', allowRoles(["owner", "admin", "staff"]), (req, res) => {
  console.log('🔍 [MANUAL-BUYER] Buscando comprador:', req.params.document);
  try {
    return searchBuyerForManual(req, res);
  } catch (error) {
    console.error('❌ [MANUAL-BUYER] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error buscando comprador',
      error: error.message
    });
  }
});

// Crear factura manual
router.post('/manual-invoice', allowRoles(["owner", "admin"]), (req, res) => {
  console.log('\n🎯 === RUTA /manual-invoice EJECUTÁNDOSE ===');
  console.log('  - User ID:', req.user?.id);
  console.log('  - User role:', req.user?.role);
  console.log('  - Items count:', req.body?.items?.length || 0);
  console.log('  - Buyer document:', req.body?.buyer?.document);
  console.log('  - Function type:', typeof createManualInvoice);
  
  try {
    console.log('📞 [MANUAL-INVOICE] Calling createManualInvoice...');
    return createManualInvoice(req, res);
  } catch (error) {
    console.error('❌ [MANUAL-INVOICE] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno al procesar factura manual',
      error: error.message
    });
  }
});

console.log('✅ Rutas de facturación manual registradas exitosamente');

// 🆕 RUTA ALTERNATIVA PARA CREAR FACTURAS (manteniendo compatibilidad)
router.post('/invoice', allowRoles(["owner", "admin"]), createInvoice);

// 🔧 RUTA DE PRUEBA SIMPLE PRIMERO
router.post('/test-credit', allowRoles(["owner", "admin"]), (req, res) => {
  console.log('🧪 [TEST-CREDIT] Ruta de prueba funcionando!');
  res.json({ 
    success: true, 
    message: 'Test route working', 
    body: req.body,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });
});

// 🆕 RUTA PARA CREAR NOTAS DE CRÉDITO - VERSIÓN SIMPLIFICADA
console.log('🔧 Registrando ruta /credit-note...');
console.log('  - createCreditNote type:', typeof createCreditNote);

router.post('/credit-note', allowRoles(["owner", "admin"]), (req, res) => {
  console.log('\n🎯 === RUTA /credit-note EJECUTÁNDOSE ===');
  console.log('  - User ID:', req.user?.id);
  console.log('  - User role:', req.user?.role);
  console.log('  - Body:', req.body);
  console.log('  - Function type:', typeof createCreditNote);
  
  try {
    console.log('📞 [CREDIT-NOTE] Calling createCreditNote...');
    return createCreditNote(req, res);
  } catch (error) {
    console.error('❌ [CREDIT-NOTE] Error:', error.message);
    return res.status(500).json({
      message: 'Error interno al procesar nota de crédito',
      success: false,
      error: error.message
    });
  }
});

console.log('✅ Ruta /credit-note registrada exitosamente');
console.log('🎉 TaxxaRouter configuración completada');

module.exports = router;