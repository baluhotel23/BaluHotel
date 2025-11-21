const express = require('express');
const router = express.Router();
const { verifyToken, verifyRefreshToken } = require('../middleware/isAuth');
const { validateRegister, validateLogin } = require('../middleware/validation/validateUser');
const {
    login,
    register,
    logout,
    refreshAccessToken, // ⭐ NUEVO
    changePassword
} = require('../controllers/User/authController');
const nodemailerController = require('../controllers/nodemailerController');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', nodemailerController.forgotPassword);
router.post('/reset-password', nodemailerController.resetPassword);

// ⭐ NUEVO: Ruta para renovar token con refresh token
router.post('/refresh-token', verifyRefreshToken, refreshAccessToken);

// Protected routes
router.use(verifyToken);

router.post('/logout', logout);
router.put('/change-password', changePassword);

module.exports = router;
