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

// ⭐ CORS Configuration - CONFIGURACIÓN ÚNICA Y CORREGIDA
const allowedOrigins = [
  'https://baluhotel-production.up.railway.app', // Backend Railway
  'https://balu-hotel.vercel.app',               // ⭐ Frontend Vercel
  'https://hotelbalu.com.co',                    // Dominio principal
  'https://www.hotelbalu.com.co',                // Dominio con www
  'http://localhost:3000',                       // Desarrollo local
  'http://localhost:5173'                        // Desarrollo Vite
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ [CORS] Origin permitido:', origin);
      callback(null, true);
    } else {
      console.log('🚫 [CORS] Origin bloqueado:', origin);
      callback(new Error('No permitido por CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ❌ ELIMINAR ESTE MIDDLEWARE CONFLICTIVO:
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*'); 
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
//   next();
// });

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