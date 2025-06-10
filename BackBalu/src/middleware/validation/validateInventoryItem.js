const { CustomError } = require('../error');

const validateInventoryItem = (req, res, next) => {
    const { 
        name, 
        description, 
        category, 
        inventoryType,
        currentStock,
        cleanStock,
        dirtyStock,
        minStock,
        minCleanStock,
        unitPrice,
        salePrice,
        washingTime
    } = req.body;

    // ⭐ VALIDAR NOMBRE
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new CustomError('El campo "name" es requerido y debe ser una cadena válida', 400);
    }

    // ⭐ VALIDAR DESCRIPCIÓN
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
        throw new CustomError('El campo "description" es requerido y debe ser una cadena válida', 400);
    }

    // ⭐ VALIDAR CATEGORÍA - ACTUALIZADA CON TODAS LAS CATEGORÍAS
    const validCategories = ['Room', 'Bathroom', 'Kitchen', 'Cafeteria', 'Laundry', 'Other'];
    if (!category || !validCategories.includes(category)) {
        throw new CustomError(
            `El campo "category" es requerido y debe ser uno de: ${validCategories.join(', ')}`, 
            400
        );
    }

    // ⭐ VALIDAR TIPO DE INVENTARIO
    const validInventoryTypes = ['consumable', 'reusable', 'sellable'];
    if (!inventoryType || !validInventoryTypes.includes(inventoryType)) {
        throw new CustomError(
            `El campo "inventoryType" es requerido y debe ser uno de: ${validInventoryTypes.join(', ')}`, 
            400
        );
    }

    // ⭐ VALIDAR PRECIO UNITARIO
    if (unitPrice !== undefined && (typeof unitPrice !== 'number' || unitPrice < 0)) {
        throw new CustomError('El campo "unitPrice" debe ser un número positivo', 400);
    }

    // ⭐ VALIDACIONES ESPECÍFICAS POR TIPO DE INVENTARIO
    if (inventoryType === 'reusable') {
        // Para items reutilizables
        if (cleanStock !== undefined && (typeof cleanStock !== 'number' || cleanStock < 0)) {
            throw new CustomError('El campo "cleanStock" debe ser un número positivo', 400);
        }
        
        if (dirtyStock !== undefined && (typeof dirtyStock !== 'number' || dirtyStock < 0)) {
            throw new CustomError('El campo "dirtyStock" debe ser un número positivo', 400);
        }
        
        if (minCleanStock !== undefined && (typeof minCleanStock !== 'number' || minCleanStock < 0)) {
            throw new CustomError('El campo "minCleanStock" debe ser un número positivo', 400);
        }
        
        if (washingTime !== undefined && (typeof washingTime !== 'number' || washingTime <= 0)) {
            throw new CustomError('El campo "washingTime" debe ser un número positivo', 400);
        }
    } else {
        // Para items consumibles y vendibles
        if (currentStock !== undefined && (typeof currentStock !== 'number' || currentStock < 0)) {
            throw new CustomError('El campo "currentStock" debe ser un número positivo', 400);
        }
    }

    // ⭐ VALIDACIONES PARA ITEMS VENDIBLES
    if (inventoryType === 'sellable') {
        if (!salePrice || typeof salePrice !== 'number' || salePrice <= 0) {
            throw new CustomError('Los items vendibles deben tener un "salePrice" válido y mayor a 0', 400);
        }
    }

    // ⭐ VALIDAR STOCK MÍNIMO
    if (minStock !== undefined && (typeof minStock !== 'number' || minStock < 0)) {
        throw new CustomError('El campo "minStock" debe ser un número positivo', 400);
    }

    // ⭐ VALIDACIONES ADICIONALES DE LÓGICA DE NEGOCIO
    if (inventoryType === 'reusable') {
        const totalStock = (cleanStock || 0) + (dirtyStock || 0);
        const minimumTotal = minStock || 0;
        
        if (totalStock < minimumTotal) {
            console.warn(`Stock total (${totalStock}) es menor al mínimo requerido (${minimumTotal})`);
        }
        
        if (minCleanStock && minStock && minCleanStock > minStock) {
            throw new CustomError('El stock mínimo limpio no puede ser mayor al stock mínimo total', 400);
        }
    }

    next();
};

module.exports = { validateInventoryItem };