const { CustomError } = require('../../middleware/error');

const validateBooking = (req, res, next) => {
    try {
        const { checkIn, checkOut, roomType, guestCount } = req.body;

        // Validar fechas
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const today = new Date();

        if (isNaN(checkInDate) || isNaN(checkOutDate)) {
            throw new CustomError('Fechas inválidas', 400);
        }

        if (checkInDate < today) {
            throw new CustomError('La fecha de check-in no puede ser anterior a hoy', 400);
        }

        if (checkOutDate <= checkInDate) {
            throw new CustomError('La fecha de check-out debe ser posterior al check-in', 400);
        }

        // Validar tipo de habitación y número de huéspedes
        if (!roomType) {
            throw new CustomError('El tipo de habitación es requerido', 400);
        }

        if (!guestCount || guestCount < 1) {
            throw new CustomError('Número de huéspedes inválido', 400);
        }

        // Validar máximo de días de reserva (ejemplo: 30 días)
        const daysDifference = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (daysDifference > 30) {
            throw new CustomError('La reserva no puede exceder los 30 días', 400);
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = validateBooking;