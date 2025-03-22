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
        createdBy: req.user.n_document,
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
        updatedBy: req.user.n_document
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

const getAllItems = async (req, res) => {
    const items = await BasicInventory.findAll({
      attributes: ['id', 'name', 'description', 'category', 'currentStock', 'minStock', 'unitPrice'],
      order: [['name', 'ASC']]
    });
    res.json({
      error: false,
      message: 'Items recuperados exitosamente',
      data: items
    });
  };
  
  // Obtiene un item por su id
  const getItemById = async (req, res) => {
    const { id } = req.params;
    const item = await BasicInventory.findByPk(id);
    if (!item) {
      throw new CustomError('Item no encontrado', 404);
    }
    res.json({
      error: false,
      message: 'Item recuperado exitosamente',
      data: item
    });
  };
  
  // Crea un nuevo item en el inventario
  const createItem = async (req, res) => {
    const { name, description, category, currentStock, minStock, unitPrice } = req.body;
    // Se asume que la validación previa se realiza con el middleware validateInventoryItem
    const newItem = await BasicInventory.create({
      name,
      description,
      category,
      currentStock,
      minStock,
      unitPrice,
      createdBy: req.user.n_document
    });
    res.status(201).json({
      error: false,
      message: 'Item creado exitosamente',
      data: newItem
    });
  };
  const updateItem = async (req, res) => {
    const { id } = req.params;
    const { name, description, category, currentStock, minStock, unitPrice } = req.body;

    // Log para verificar los datos recibidos
    console.log("Datos recibidos en el backend para actualizar:");
    console.log("ID:", id);
    console.log("Body:", req.body);

    try {
        const item = await BasicInventory.findByPk(id);
        if (!item) {
            throw new CustomError("Item no encontrado", 404);
        }

        // Log para verificar el estado actual del item antes de actualizar
        console.log("Estado actual del item antes de actualizar:", item.toJSON());

        await item.update({
            name,
            description,
            category,
            currentStock,
            minStock,
            unitPrice,
        });

        // Log para verificar el estado del item después de actualizar
        console.log("Estado del item después de actualizar:", item.toJSON());

        res.json({
            error: false,
            message: "Item actualizado exitosamente",
            data: item,
        });
    } catch (error) {
        console.error("Error al actualizar el item:", error);
        res.status(500).json({
            error: true,
            message: "Error al actualizar el item",
        });
    }
};
  // Elimina un item del inventario
  const deleteItem = async (req, res) => {
    const { id } = req.params;
    const item = await BasicInventory.findByPk(id);
    if (!item) {
      throw new CustomError('Item no encontrado', 404);
    }
    await item.destroy();
    res.json({
      error: false,
      message: 'Item eliminado exitosamente',
      
    });
  };

  const addStock = async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
  
    // Validación: quantity debe ser un número y mayor que cero
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new CustomError('La cantidad debe ser un número positivo', 400);
    }
  
    const item = await BasicInventory.findByPk(id);
    if (!item) {
      throw new CustomError('Item no encontrado', 404);
    }
  
    await item.increment('stock', { by: quantity });
    res.json({
      error: false,
      message: 'Stock añadido exitosamente',
      data: item
    });
  };

  const removeStock = async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
  
    // Validación: quantity debe ser un número y mayor que cero
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new CustomError('La cantidad debe ser un número positivo', 400);
    }
  
    const item = await BasicInventory.findByPk(id);
    if (!item) {
      throw new CustomError('Item no encontrado', 404);
    }
  
    if (item.stock < quantity) {
      throw new CustomError('No hay suficiente stock', 400);
    }
  
    await item.decrement('stock', { by: quantity });
    res.json({
      error: false,
      message: 'Stock removido exitosamente',
      data: item
    });
  };

  const getStockHistory = async (req, res) => {
    const { id } = req.params;
    const item = await BasicInventory.findByPk(id);
    if (!item) {
      throw new CustomError('Item no encontrado', 404);
    }
    const stockHistory = await item.getStockHistory();
    res.json({
      error: false,
      message: 'Historial de stock recuperado exitosamente',
      data: stockHistory
    });
  };

  const getAllPurchases = async (req, res) => {
    const purchases = await Purchase.findAll({
      include: {
        model: PurchaseItem,
        include: BasicInventory
      },
      order: [['date', 'DESC']]
    });
    res.json({
      error: false,
      message: 'Compras recuperadas exitosamente',
      data: purchases
    });
  };

  const getPurchaseDetails = async (req, res) => {
    const { id } = req.params;
    const purchase = await Purchase.findByPk(id, {
      include: {
        model: PurchaseItem,
        include: BasicInventory
      }
    });
    if (!purchase) {
      throw new CustomError('Compra no encontrada', 404);
    }
    res.json({
      error: false,
      message: 'Compra recuperada exitosamente',
      data: purchase
    });
  }

  const getAllSuppliers = async (req, res) => {
    const suppliers = await Purchase.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('supplier')), 'supplier']],
      order: [[sequelize.fn('DISTINCT', sequelize.col('supplier')), 'ASC']]
    });
    res.json({
      error: false,
      message: 'Proveedores recuperados exitosamente',
      data: suppliers
    });
  };

  const createSupplier = async (req, res) => {
    const { name, email, phone, address } = req.body;
    const newSupplier = await Purchase.create({
      name,
      email,
      phone,
      address
    });
    res.status(201).json({
      error: false,
      message: 'Proveedor creado exitosamente',
      data: newSupplier
    });

  };

  const getCategories = async (req, res) => {
    const categories = await BasicInventory.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      order: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'ASC']]
    });
    res.json({
      error: false,
      message: 'Categorías recuperadas exitosamente',
      data: categories
    });
  }

  const createCategory = async (req, res) => {
    const { name } = req.body;
    const newCategory = await BasicInventory.create({
      name
    });
    res.status(201).json({
      error: false,
      message: 'Categoría creada exitosamente',
      data: newCategory
    });
  }

  const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const category = await BasicInventory.findByPk(id);
    if (!category) {
      throw new CustomError('Categoría no encontrada', 404);
    }
    await category.update({
      name
    });
    res.json({
      error: false,
      message: 'Categoría actualizada exitosamente',
      data: category
    });
  }

  // Reporte de consumo: Este reporte podría mostrar, por ejemplo, el porcentaje de stock consumido o la diferencia entre el stock inicial y el actual.
// Aquí se presenta un ejemplo simple que lista cada ítem y su consumo basado en una cantidad fija (ajusta según tu lógica real).
const getConsumptionReport = async (req, res) => {
    // Ejemplo: calcular "consumo" como la diferencia entre un stock teórico y el stock actual.
    // En un escenario real, deberías tener un campo o una tabla que registre los consumos.
    const items = await BasicInventory.findAll({
      attributes: ['id', 'name', 'stock', 'minimumStock', 'price']
    });
  
    // Supongamos que el consumo se define (por ejemplificar) como: (stock inicial - stock actual).
    // Aquí asumimos que el stock inicial es (minimumStock + 50) de forma arbitraria.
    const report = items.map(item => {
      const stockInicial = item.minimumStock + 50;
      return {
        id: item.id,
        name: item.name,
        stockInicial,
        stockActual: item.stock,
        consumo: stockInicial - item.stock
      };
    });
  
    res.json({
      error: false,
      message: 'Reporte de consumo generado exitosamente',
      data: report
    });
  };
  
  // Reporte de valoración del inventario: Calcula el valor total de cada ítem (stock * price) y el valor global.
  const getInventoryValuation = async (req, res) => {
    const items = await BasicInventory.findAll({
      attributes: ['id', 'name', 'stock', 'price']
    });
  
    const report = items.map(item => ({
      id: item.id,
      name: item.name,
      stock: item.stock,
      price: item.price,
      totalValue: parseFloat(item.stock) * parseFloat(item.price)
    }));
  
    // Valor global del inventario
    const globalValuation = report.reduce((acc, cur) => acc + cur.totalValue, 0);
  
    res.json({
      error: false,
      message: 'Reporte de valoración del inventario generado exitosamente',
      data: {
        items: report,
        globalValuation
      }
    });
  };
  
  // Reporte de movimientos del inventario: Muestra los registros de movimientos (por ejemplo, compras, incrementos o decrementos)
  // Aquí se ejemplifica obteniendo la información de PurchaseItem si es que éste almacena movimientos.
  const getInventoryMovements = async (req, res) => {
    // Se asume que PurchaseItem registra movimientos de stock.
    // Si tienes fecha de creación, puedes ordenarlos cronológicamente.
    const movements = await PurchaseItem.findAll({
      include: [
        {
          model: BasicInventory,
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  
    res.json({
      error: false,
      message: 'Reporte de movimientos del inventario generado exitosamente',
      data: movements
    });
  };

  const getRoomAssignments = async (req, res) => {
    const assignments = await RoomCheckIn.findAll({
      include: [
        {
          model: BasicInventory,
          as: 'item', // Ajusta el alias según tu relación
          attributes: ['id', 'name']
        }
      ],
      order: [['roomId', 'ASC']]
    });
    
    res.json({
      error: false,
      message: 'Asignaciones de habitaciones recuperadas exitosamente',
      data: assignments
    });
  };
  
  // Crea una nueva asignación a una habitación
  const createRoomAssignment = async (req, res) => {
    const { roomId, inventoryId, quantity } = req.body;
    
    // Validar campos
    if (!roomId || !inventoryId || typeof quantity !== 'number' || quantity <= 0) {
      throw new CustomError('roomId, inventoryId y una cantidad positiva son requeridos', 400);
    }
    
    // Verificar que el item exista en el inventario
    const item = await BasicInventory.findByPk(inventoryId);
    if (!item) {
      throw new CustomError('Item de inventario no encontrado', 404);
    }
    
    // Opcional: podrías validar que la habitación exista si cuentas con un modelo Room
    
    // Crear la asignación
    const assignment = await RoomCheckIn.create({
      roomId,
      inventoryId,
      quantity,
      assignedBy: req.user.n_document // Se asume que req.user contiene el id del usuario autenticado
    });
    
    res.status(201).json({
      error: false,
      message: 'Asignación creada exitosamente',
      data: assignment
    });
  };
  
  // Obtiene detalles de asignación para una habitación específica
  const getRoomAssignmentDetails = async (req, res) => {
    const { roomId } = req.params;
    
    // Se pueden tener múltiples asignaciones para una habitación; aquí se obtienen todas
    const assignments = await RoomCheckIn.findAll({
      where: { roomId },
      include: [
        {
          model: BasicInventory,
          as: 'item',
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!assignments || assignments.length === 0) {
      throw new CustomError('No se encontraron asignaciones para esta habitación', 404);
    }
    
    res.json({
      error: false,
      message: 'Detalles de asignación recuperados exitosamente',
      data: assignments
    });
  };
  

module.exports = {
    getInventory ,
    createPurchase ,
    updateInventory,
    getLowStockItems,
    getAllItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    addStock,
    removeStock,
    getStockHistory,
    getAllPurchases,
    getPurchaseDetails,
    getAllSuppliers,
    createSupplier,
    getCategories,
    createCategory,
    updateCategory,
    getInventoryMovements,
    getInventoryValuation,
    getConsumptionReport,
    getRoomAssignments,
    createRoomAssignment,
    getRoomAssignmentDetails
};