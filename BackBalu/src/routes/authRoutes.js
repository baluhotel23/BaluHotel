const express = require('express');

const { register, login } = require('../controllers/User/authController');

const router = express.Router();

// Ruta para registro
router.post('/register', register);

// Ruta para login
router.post('/login', login);

// Ruta para verificación de rol
//router.get('/verify-role', checkPermissions(['admin', 'user']), verifyRole);

module.exports = router;
