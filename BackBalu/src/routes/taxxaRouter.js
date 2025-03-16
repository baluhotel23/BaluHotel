const Router = require('express');
const { createInvoice } = require('../controllers/Taxxa/TaxxaService');
const { verifyToken } = require("../middleware/isAuth");
const { allowRoles } = require("../middleware/byRol");
const {getOrCreateSellerData, updateSellerData, getSellerDataBySdocno} = require('../controllers/Taxxa/sellerDataControllers');
const {createBuyer, getBuyerByDocument} = require('../controllers/Taxxa/buyerController');

const router = Router();


router.post('/buyer', createBuyer);
router.get('/buyer/:sdocno', getBuyerByDocument);

router.use(verifyToken);

router.post('/sendInvoice', allowRoles(["owner", "admin"]), createInvoice);

router.post('/sellerData',  allowRoles(["owner", "admin"]), getOrCreateSellerData);
router.put('/sellerData/:sdocno', allowRoles(["owner", "admin"]), updateSellerData);
router.get('/sellerData/:sdocno', allowRoles(["owner", "admin"]), getSellerDataBySdocno);

module.exports = router;