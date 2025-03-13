const { CustomError } = require('../error'); // Asegúrate de que esta ruta sea correcta

const validateInventoryItem = (req, res, next) => {
  const { name, description, category, currentStock, minimumStock, price } = req.body;

  // Validar que el nombre es requerido y debe ser una cadena
  if (!name || typeof name !== 'string') {
    return next(new CustomError('El campo "name" es requerido y debe ser una cadena de texto', 400));
  }

  // Si exists, description debe ser una cadena
  if (description && typeof description !== 'string') {
    return next(new CustomError('El campo "description" debe ser una cadena de texto', 400));
  }

  // Validar que category es requerida y se encuentra en un listado permitido  
  const validCategories = ['Room', 'Bathroom', 'Kitchen', 'Other'];
  if (!category || !validCategories.includes(category)) {
    return next(new CustomError(`El campo "category" es requerido y debe ser uno de: ${validCategories.join(', ')}`, 400));
  }

  // Validar que currentStock es un número y mayor o igual a cero (si se envía)
  if (currentStock !== undefined && (typeof currentStock !== 'number' || currentStock < 0)) {
    return next(new CustomError('El campo "currentStock" debe ser un número igual o mayor a 0', 400));
  }

  // Validar que minimumStock es un número y mayor o igual a cero (si se envía)
  if (minimumStock !== undefined && (typeof minimumStock !== 'number' || minimumStock < 0)) {
    return next(new CustomError('El campo "minimumStock" debe ser un número igual o mayor a 0', 400));
  }

  // Validar que price es un número y mayor o igual a 0 (si se envía)
  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    return next(new CustomError('El campo "price" debe ser un número igual o mayor a 0', 400));
  }

  next();
};

module.exports = { validateInventoryItem };