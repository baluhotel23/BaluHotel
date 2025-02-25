const express = require('express');

const { verifyToken } = require('../middleware/isAuth');
const { byRol } = require('../middleware/byRol');
const { checkPermissions } = require('../controllers/checkPermissions');

const router = express.Router();

router.get('/dashboard', 
  verifyToken,
  byRol,
  checkPermissions(['verEstadisticas']),
  
);

module.exports = router;