const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const routes = require('./routes');
const cors = require('cors');
const path = require('path');
const { passport } = require('./passport');
const { JWT_SECRET_KEY } = require('./config/envs');
const authRoutes = require('./routes/authRoutes');
const { errorHandler, CustomError } = require('./middleware/error'); // Fixed path

const app = express();

// Basic Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(morgan('dev'));
app.use(passport.initialize());

// CORS Configuration - Single configuration
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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
