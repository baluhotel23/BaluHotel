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
const taxxaRouter = require('./taxxaRouter');
const webhookRouter = require('../controllers/webhook');
const voucherRoutes = require('./voucherRoutes'); // ⭐ AGREGAR ESTA LÍNEA
//const { registerLocalPayment } = require('../controllers/paymentController');
const registrationPassRoutes = require('./registrationPassRoutes');

// ⭐ NUEVAS RUTAS AGREGADAS
const laundryRoutes = require('./laundryRoutes');
const bookingInventoryRoutes = require('./bookingInventoryRoutes');

// Rutas públicas
router.use('/auth', authRoutes);
router.use('/client', clientRoutes);
router.use("/eventos", webhookRouter); 

// Rutas protegidas
router.use('/admin', adminRoutes);
router.use('/financial', financialRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reception', receptionRoutes);
router.use('/rooms', roomRoutes);
router.use('/bookings', bookingRoutes);
router.use('/taxxa', taxxaRouter);
//router.use('/payment',   registerLocalPayment);
router.use('/registrationPass', registrationPassRoutes);
router.use('/vouchers', voucherRoutes);

// ⭐ NUEVAS RUTAS DE INVENTARIO Y LAVANDERÍA
router.use('/laundry', laundryRoutes);
router.use('/booking-inventory', bookingInventoryRoutes);

module.exports = router;