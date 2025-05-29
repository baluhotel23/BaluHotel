const express = require('express');
const router = express.Router();
const controller  = require('../controller');





router.post('/', controller.getOrCreateSellerData);
router.put('/:sdocno', controller.updateSellerData);
router.get('/:sdocno', controller.getSellerDataBySdocno); 



module.exports = router;


