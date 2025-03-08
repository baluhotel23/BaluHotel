const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const financialRoutes = require('./financialRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const receptionRoutes = require('./receptionRoutes');
const roomRoutes = require('./roomRoutes');
const bookingRoutes = require('./bookingRoutes');
const clientRoutes = require('./clientRoutes');

// Rutas públicas
router.use('/auth', authRoutes);
router.use('/client', clientRoutes);

// Rutas protegidas
router.use('/admin', adminRoutes);
router.use('/financial', financialRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reception', receptionRoutes);
router.use('/rooms', roomRoutes);
router.use('/bookings', bookingRoutes);

module.exports = router;