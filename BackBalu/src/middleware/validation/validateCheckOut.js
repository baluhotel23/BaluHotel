const { param, validationResult } = require('express-validator');

const validateCheckOut = [
  // Validar que bookingId sea proporcionado y sea numérico
  param('bookingId')
    .exists().withMessage('El bookingId es obligatorio')
    .isInt().withMessage('El bookingId debe ser un número entero'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: true,
        message: 'Error de validación en check-out',
        data: errors.array()
      });
    }
    next();
  }
];

module.exports = validateCheckOut;