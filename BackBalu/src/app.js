const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const routes = require('./routes');
const cors = require('cors');
const path = require('path');
const { passport } = require('./passport');
const { JWT_SECRET_KEY } = require('./config/envs');
const authRoutes = require('./routes/authRoutes');
const { errorHandler, CustomError } = require('./middleware/error');

// ⭐ CONFIGURAR ZONA HORARIA DE COLOMBIA AL INICIO
process.env.TZ = 'America/Bogota';

const app = express();

// ⭐ OPCIONAL: Si tienes moment.js instalado
// const moment = require('moment-timezone');
// moment.tz.setDefault('America/Bogota');

// ⭐ LOG PARA CONFIRMAR ZONA HORARIA
console.log('🇨🇴 [SERVER] Zona horaria configurada:', process.env.TZ);
console.log('🕐 [SERVER] Hora actual Colombia:', new Date().toLocaleString('es-CO', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
}));

// Basic Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(morgan('dev'));
app.use(passport.initialize());

// CORS Configuration - Single configuration
app.use(cors({
   origin: 'https://balu-hotel.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

// Routes
app.use('/', routes);
app.use('/auth', authRoutes);

// 404 Handler - Keep this before error handlers
app.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: 'Route not found'
  });
});

// Error Handler - Keep this last
app.use(errorHandler);

module.exports = app;
