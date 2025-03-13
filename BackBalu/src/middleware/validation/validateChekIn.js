const { param, validationResult } = require('express-validator');

const validateCheckIn = [
  // Validar que bookingId sea numérico o cumpla el formato deseado
  param('bookingId')
    .exists().withMessage('El bookingId es obligatorio')
    .isInt().withMessage('El bookingId debe ser un número entero'),
  // Middleware final para enviar errores si existen
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: true,
        message: 'Error de validación en check-in',
        data: errors.array()
      });
    }
    next();
  }
];

module.exports = validateCheckIn;