const express = require('express');
const router = express.Router();
const { verifyToken } = require("../middleware/isAuth");
const { allowRoles } = require("../middleware/byRol");

const {
  createOrUpdateSellerData,
  getSellerDataByNIT,
  validateTaxxaConfig
} = require('../controllers/Taxxa/sellerDataControllers');

// 🔒 APLICAR MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN
router.use(verifyToken);
router.use(allowRoles(["owner"]));

// 🆕 RUTAS PARA GESTIÓN DE DATOS DEL HOTEL/SELLER
router.post('/', createOrUpdateSellerData);           // Crear o actualizar
router.put('/', createOrUpdateSellerData);            // Actualizar (mismo endpoint)
router.get('/:sdocno', getSellerDataByNIT);          // Obtener por NIT
router.get('/:sdocno/validate', validateTaxxaConfig); // Validar configuración

module.exports = router;


