const express = require('express');
const router = express.Router();
const controller = require('../controllers/Taxxa/invoiceController');
//const taxxaController = require('../controller/Taxxa/TaxxaService');

// Ruta para obtener todas las facturas
router.get('/all', controller.getAllInvoices);

// Ruta para obtener el último número de factura
router.get('/lastNumber', controller.getLastInvoiceNumber);
router.get('/allInvoices', controller.getAllInvoices);
// Rutas dinámicas al final
router.get('/:status', controller.getInvoicesByStatus);
//router.post('/', controller.postInvoice);

module.exports = router;