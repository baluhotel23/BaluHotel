const { CustomError } = require('../../middleware/error');

const validateExtraCharge = (req, res, next) => {
    const { description, amount } = req.body;

    // Validar que exista descripción
    if (!description || description.trim().length === 0) {
        throw new CustomError('La descripción del cargo es requerida', 400);
    }

    // Validar que la descripción no sea muy larga
    if (description.length > 255) {
        throw new CustomError('La descripción es demasiado larga', 400);
    }

    // Validar que el monto exista y sea número
    if (!amount || typeof amount !== 'number') {
        throw new CustomError('El monto debe ser un número válido', 400);
    }

    // Validar que el monto sea positivo
    if (amount <= 0) {
        throw new CustomError('El monto debe ser mayor a 0', 400);
    }

    // Validar que el monto no sea excesivamente alto (ejemplo: límite de 1,000,000)
    if (amount > 1000000) {
        throw new CustomError('El monto excede el límite permitido', 400);
    }

    next();
};

module.exports = validateExtraCharge;