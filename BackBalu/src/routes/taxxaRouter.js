const Router = require('express');
const { createInvoice } = require('../controller/Taxxa/TaxxaService');

const router = Router();

router.post('/sendInvoice', createInvoice);

module.exports = router;