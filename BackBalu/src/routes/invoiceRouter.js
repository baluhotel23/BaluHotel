const express = require('express');
const router = express.Router();
const controller  = require('../controller/invoiceControllers');


router.post('/', controller.postInvoice);
router.get('/:status', controller.getInvoicesByStatus);

module.exports = router;