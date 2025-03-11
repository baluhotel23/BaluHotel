const { CustomError } = require("../error");

const validateLogin = (req, res, next) => {
  const { email, password, phone } = req.body;

  if (!email) {
    throw new CustomError("El email es requerido", 400);
  }

  if (!password) {
    throw new CustomError("La contraseña es requerida", 400);
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new CustomError("Formato de email inválido", 400);
  }

  // Validar longitud de contraseña
  if (password.length < 6) {
    throw new CustomError(
      "La contraseña debe tener al menos 6 caracteres",
      400
    );
  }

  next();
};

const validateRegister = (req, res, next) => {
    const { email, password, phone, n_document, wdoctype } = req.body;

    // Validaciones requeridas
    if (!email || !password || !n_document || !phone) {
        throw new CustomError("Todos los campos obligatorios deben ser completados", 400);
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new CustomError("Formato de email inválido", 400);
    }

    // Validar contraseña
    if (password.length < 6) {
        throw new CustomError("La contraseña debe tener al menos 6 caracteres", 400);
    }

    // Validar teléfono si existe
    if (phone) {
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!phoneRegex.test(phone)) {
            throw new CustomError("Formato de teléfono inválido", 400);
        }
    }

    // Validar documento
    if (n_document.length < 4 || n_document.length > 20) {
        throw new CustomError("Número de documento inválido", 400);
    }

    // Validar tipo de documento
    const validDocTypes = [
        "RC",
        "TI",
        "CC",
        "TE",
        "CE",
        "NIT",
        "PAS",
        "DEX",
        "PEP",
        "PPT",
        "FI",
        "NUIP",
    ];
    if (!validDocTypes.includes(wdoctype)) {
        throw new CustomError("Tipo de documento inválido", 400);
    }

    next();
};

module.exports = {
  validateLogin,
  validateRegister,
};
