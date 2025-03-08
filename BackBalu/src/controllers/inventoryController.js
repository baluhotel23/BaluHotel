const { BasicInventory, Purchase, PurchaseItem } = require('../data');
const { CustomError } = require('../middleware/error');
const { catchedAsync } = require('../utils/catchedAsync');

const getInventory = async (req, res) => {
    const { category, search } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
    }

    const inventory = await BasicInventory.findAll({
        where,
        attributes: [
            'id', 'name', 'description', 'category', 
            'currentStock', 'minStock', 'unitPrice'
        ],
        order: [['category', 'ASC'], ['name', 'ASC']]
    });

    res.json({
        error: false,
        message: 'Inventario recuperado exitosamente',
        data: inventory
    });
};

const createPurchase = async (req, res) => {
    const { supplier, items, totalAmount } = req.body;

    // Validar items
    if (!items || !items.length) {
        throw new CustomError('Debe incluir al menos un item', 400);
    }

    // Crear compra y sus items en una transacción
    const purchase = await Purchase.create({
        supplier,
        totalAmount,
        createdBy: req.user.id,
        date: new Date()
    });

    // Crear items y actualizar stock
    for (const item of items) {
        const inventoryItem = await BasicInventory.findByPk(item.itemId);
        if (!inventoryItem) {
            throw new CustomError(`Item ${item.itemId} no encontrado`, 404);
        }

        await PurchaseItem.create({
            purchaseId: purchase.id,
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice
        });

        // Actualizar stock
        await inventoryItem.increment('currentStock', { by: item.quantity });
    }

    res.status(201).json({
        error: false,
        message: 'Compra registrada exitosamente',
        data: purchase
    });
};

const updateInventory = async (req, res) => {
    const { id } = req.params;
    const { name, description, minStock, unitPrice } = req.body;

    const item = await BasicInventory.findByPk(id);
    if (!item) {
        throw new CustomError('Item no encontrado', 404);
    }

    await item.update({
        name,
        description,
        minStock,
        unitPrice,
        updatedBy: req.user.id
    });

    res.json({
        error: false,
        message: 'Item actualizado exitosamente',
        data: item
    });
};

const getLowStockItems = async (req, res) => {
    const lowStockItems = await BasicInventory.findAll({
        where: {
            currentStock: {
                [Op.lte]: sequelize.col('minStock')
            }
        },
        attributes: [
            'id', 'name', 'category', 
            'currentStock', 'minStock', 'unitPrice'
        ],
        order: [['currentStock', 'ASC']]
    });

    res.json({
        error: false,
        message: 'Items con bajo stock recuperados exitosamente',
        data: lowStockItems
    });
};

module.exports = {
    getInventory ,
    createPurchase ,
    updateInventory,
    getLowStockItems
};