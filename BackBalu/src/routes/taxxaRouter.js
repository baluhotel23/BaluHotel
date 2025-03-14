const Router = require('express');
const { createInvoice } = require('../controllers/Taxxa/TaxxaService');
const { verifyToken } = require("../middleware/isAuth");
const { allowRoles } = require("../middleware/byRol");

const router = Router();
router.use(verifyToken);

router.post('/sendInvoice', allowRoles(["owner", "admin"]), createInvoice);

module.exports = router;