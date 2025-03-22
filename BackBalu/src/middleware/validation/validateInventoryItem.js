const { CustomError } = require('../error'); // Asegúrate de que esta ruta sea correcta

const validateInventoryItem = (req, res, next) => {
  const { name, description, category, currentStock, minStock, unitPrice } = req.body;

  // Convertir valores numéricos a números y actualizar req.body
  req.body.currentStock = currentStock !== undefined ? Number(currentStock) : undefined;
  req.body.minStock = minStock !== undefined ? Number(minStock) : undefined;
  req.body.unitPrice = unitPrice !== undefined ? Number(unitPrice) : undefined;

  // Validar que el nombre es requerido y debe ser una cadena
  if (!name || typeof name !== 'string') {
    return next(new CustomError('El campo "name" es requerido y debe ser una cadena de texto', 400));
  }

  // Validar que description es una cadena (si se envía)
  if (description && typeof description !== 'string') {
    return next(new CustomError('El campo "description" debe ser una cadena de texto', 400));
  }

  // Validar que category es requerida y válida
  const validCategories = ['Room', 'Bathroom', 'Kitchen', 'Other'];
  if (!category || !validCategories.includes(category)) {
    return next(new CustomError(`El campo "category" es requerido y debe ser uno de: ${validCategories.join(', ')}`, 400));
  }

  // Validar que currentStock es un número y mayor o igual a cero
  if (req.body.currentStock !== undefined && (isNaN(req.body.currentStock) || req.body.currentStock < 0)) {
    return next(new CustomError('El campo "currentStock" debe ser un número igual o mayor a 0', 400));
  }

  // Validar que minStock es un número y mayor o igual a cero
  if (req.body.minStock !== undefined && (isNaN(req.body.minStock) || req.body.minStock < 0)) {
    return next(new CustomError('El campo "minStock" debe ser un número igual o mayor a 0', 400));
  }

  // Validar que unitPrice es un número y mayor o igual a cero
  if (req.body.unitPrice !== undefined && (isNaN(req.body.unitPrice) || req.body.unitPrice < 0)) {
    return next(new CustomError('El campo "unitPrice" debe ser un número igual o mayor a 0', 400));
  }

  next();
};

module.exports = { validateInventoryItem };