const { BasicInventory, Purchase, PurchaseItem, RoomCheckIn, LaundryMovement } = require('../data');
const { CustomError } = require('../middleware/error');
const { catchedAsync } = require('../utils/catchedAsync');
const { upload } = require('../middleware/multer');
const { Op, sequelize } = require('sequelize');

const getInventory = async (req, res) => {
    const { category, search, inventoryType } = req.query;
    
    const where = { isActive: true };
    if (category) where.category = category;
    if (inventoryType) where.inventoryType = inventoryType;
    if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
    }

    const inventory = await BasicInventory.findAll({
        where,
        attributes: [
            'id', 'name', 'description', 'category', 'inventoryType',
            'currentStock', 'cleanStock', 'dirtyStock', 'totalReusableStock',
            'minStock', 'minCleanStock', 'unitPrice', 'salePrice',
            'washingTime', 'createdAt', 'updatedAt'
        ],
        order: [['category', 'ASC'], ['inventoryType', 'ASC'], ['name', 'ASC']]
    });

    const itemsWithAlerts = inventory.map(item => {
        const alerts = [];
        
        if (item.inventoryType === 'consumable' || item.inventoryType === 'sellable') {
            if (item.currentStock <= item.minStock) {
                alerts.push({
                    type: 'low_stock',
                    message: `Stock bajo: ${item.currentStock}/${item.minStock}`
                });
            }
        }
        
        if (item.inventoryType === 'reusable') {
            if (item.cleanStock <= (item.minCleanStock || 0)) {
                alerts.push({
                    type: 'low_clean_stock',
                    message: `Stock limpio bajo: ${item.cleanStock}/${item.minCleanStock || 0}`
                });
            }
            
            const dirtyPercentage = item.totalReusableStock > 0 
                ? (item.dirtyStock / item.totalReusableStock) * 100 
                : 0;
            
            if (dirtyPercentage > 70) {
                alerts.push({
                    type: 'high_dirty_stock',
                    message: `Mucho stock sucio: ${dirtyPercentage.toFixed(1)}%`
                });
            }
        }
        
        return {
            ...item.toJSON(),
            alerts,
            stockStatus: alerts.length > 0 ? 'warning' : 'ok'
        };
    });

    res.json({
        error: false,
        message: 'Inventario recuperado exitosamente',
        data: itemsWithAlerts,
        summary: {
            total: inventory.length,
            consumable: inventory.filter(i => i.inventoryType === 'consumable').length,
            reusable: inventory.filter(i => i.inventoryType === 'reusable').length,
            sellable: inventory.filter(i => i.inventoryType === 'sellable').length,
            withAlerts: itemsWithAlerts.filter(i => i.alerts.length > 0).length
        }
    });
};

// ⭐ NUEVO: Obtener inventario por tipo específico
const getInventoryByType = async (req, res) => {
    const { type } = req.params;
    
    const validTypes = ['consumable', 'reusable', 'sellable'];
    if (!validTypes.includes(type)) {
        throw new CustomError('Tipo de inventario inválido', 400);
    }

    const inventory = await BasicInventory.findAll({
        where: { 
            inventoryType: type,
            isActive: true 
        },
        attributes: type === 'reusable' 
            ? ['id', 'name', 'description', 'cleanStock', 'dirtyStock', 'totalReusableStock', 'minCleanStock', 'washingTime']
            : ['id', 'name', 'description', 'currentStock', 'minStock', 'unitPrice', 'salePrice'],
        order: [['name', 'ASC']]
    });

    res.json({
        error: false,
        message: `Inventario tipo ${type} recuperado exitosamente`,
        data: inventory
    });
};

const createPurchase = async (req, res) => {
  const { supplier, items, totalAmount, paymentMethod, paymentStatus, invoiceNumber, purchaseDate } = req.body;

  let receiptUrl = null;

  // Subir el comprobante si existe
  if (req.file) {
    const { mimetype, path } = req.file;

    if (mimetype !== 'application/pdf') {
      throw new Error('El archivo debe ser un PDF');
    }

    try {
      const uploadResult = await uploadToCloudinary(path, 'purchase_receipts');
      receiptUrl = uploadResult.secure_url;
    } catch (error) {
      console.error('Error al subir el comprobante a Cloudinary:', error);
      throw new Error('No se pudo subir el comprobante');
    }
  }

  // Crear la compra
  const purchase = await Purchase.create({
    supplier,
    totalAmount,
    paymentMethod,
    paymentStatus: paymentStatus || 'pending',
    invoiceNumber: invoiceNumber || null,
    purchaseDate: purchaseDate || new Date(),
    receiptUrl,
    createdBy: req.user.n_document,
  });

  // ⭐ CORREGIR: Crear items con el campo correcto
  for (const item of items) {
    const inventoryItem = await BasicInventory.findByPk(item.itemId);
    if (!inventoryItem) {
      throw new CustomError(`Item ${item.itemId} no encontrado`, 404);
    }

    const itemPrice = item.price || item.unitPrice;

    await PurchaseItem.create({
      purchaseId: purchase.id,
      basicId: item.itemId, // ⭐ USAR basicId en lugar de itemId
      quantity: item.quantity,
      price: parseFloat(itemPrice),
      total: parseFloat(item.quantity * itemPrice),
    });

    // ⭐ ACTUALIZAR STOCK CORRECTAMENTE SEGÚN TIPO
    if (inventoryItem.inventoryType === 'reusable') {
      // Para reutilizables, agregar al stock limpio
      await inventoryItem.increment('cleanStock', { by: item.quantity });
    } else {
      // Para consumibles/vendibles, agregar al stock actual
      await inventoryItem.increment('currentStock', { by: item.quantity });
    }
  }

  res.status(201).json({
    error: false,
    message: 'Compra registrada exitosamente',
    data: purchase,
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
    const consumableItems = await BasicInventory.findAll({
        where: {
            inventoryType: ['consumable', 'sellable'],
            currentStock: {
                [Op.lte]: sequelize.col('minStock')
            },
            isActive: true
        },
        attributes: [
            'id', 'name', 'category', 'inventoryType',
            'currentStock', 'minStock', 'unitPrice'
        ]
    });
    
    const reusableItems = await BasicInventory.findAll({
        where: {
            inventoryType: 'reusable',
            cleanStock: {
                [Op.lte]: sequelize.col('minCleanStock')
            },
            isActive: true
        },
        attributes: [
            'id', 'name', 'category', 'inventoryType',
            'cleanStock', 'minCleanStock', 'dirtyStock', 'totalReusableStock'
        ]
    });

    const allLowStockItems = [
        ...consumableItems.map(item => ({
            ...item.toJSON(),
            alertType: 'low_stock',
            alertMessage: `Stock: ${item.currentStock}/${item.minStock}`
        })),
        ...reusableItems.map(item => ({
            ...item.toJSON(),
            alertType: 'low_clean_stock',
            alertMessage: `Stock limpio: ${item.cleanStock}/${item.minCleanStock}`
        }))
    ];

    res.json({
        error: false,
        message: 'Items con bajo stock recuperados exitosamente',
        data: allLowStockItems,
        summary: {
            totalItems: allLowStockItems.length,
            consumableItems: consumableItems.length,
            reusableItems: reusableItems.length
        }
    });
};

const getAllItems = async (req, res) => {
    const items = await BasicInventory.findAll({
        where: { isActive: true },
        attributes: [
            'id', 'name', 'description', 'category', 'inventoryType',
            'currentStock', 'cleanStock', 'dirtyStock', 'totalReusableStock',
            'minStock', 'minCleanStock', 'unitPrice', 'salePrice'
        ],
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
    const { 
        name, description, category, inventoryType,
        currentStock, cleanStock, dirtyStock, totalReusableStock,
        minStock, minCleanStock, unitPrice, salePrice, washingTime
    } = req.body;
    
    // Validaciones específicas por tipo
    if (inventoryType === 'sellable' && (!salePrice || salePrice <= 0)) {
        throw new CustomError("Los items vendibles deben tener un precio de venta válido", 400);
    }
    
    if (inventoryType === 'reusable') {
        if (totalReusableStock && (cleanStock + dirtyStock) > totalReusableStock) {
            throw new CustomError("La suma de stock limpio y sucio no puede exceder el stock total", 400);
        }
    }
    
    const itemData = {
        name,
        description,
        category,
        inventoryType: inventoryType || 'consumable',
        unitPrice,
        createdBy: req.user?.n_document
    };
    
    // Campos específicos por tipo
    if (inventoryType === 'reusable') {
        itemData.cleanStock = cleanStock || 0;
        itemData.dirtyStock = dirtyStock || 0;
        itemData.totalReusableStock = totalReusableStock || (cleanStock + dirtyStock);
        itemData.minCleanStock = minCleanStock || 5;
        itemData.washingTime = washingTime || 24;
    } else {
        itemData.currentStock = currentStock || 0;
        itemData.minStock = minStock || 10;
    }
    
    if (inventoryType === 'sellable') {
        itemData.salePrice = salePrice;
    }
    
    const newItem = await BasicInventory.create(itemData);
    
    res.status(201).json({
        error: false,
        message: 'Item creado exitosamente',
        data: newItem
    });
};


const updateItem = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const item = await BasicInventory.findByPk(id);
    if (!item) {
        throw new CustomError("Item no encontrado", 404);
    }
    
    // Validaciones específicas por tipo
    if (updateData.inventoryType === 'sellable' && updateData.salePrice && updateData.salePrice <= 0) {
        throw new CustomError("Los items vendibles deben tener un precio de venta válido", 400);
    }
    
    if (item.inventoryType === 'reusable' && updateData.totalReusableStock) {
        const newCleanStock = updateData.cleanStock ?? item.cleanStock;
        const newDirtyStock = updateData.dirtyStock ?? item.dirtyStock;
        
        if ((newCleanStock + newDirtyStock) > updateData.totalReusableStock) {
            throw new CustomError("La suma de stock limpio y sucio no puede exceder el stock total", 400);
        }
    }

    await item.update(updateData);

    res.json({
        error: false,
        message: "Item actualizado exitosamente",
        data: item,
    });
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
    const { quantity, stockType = 'clean' } = req.body;

    if (typeof quantity !== 'number' || quantity <= 0) {
        throw new CustomError('La cantidad debe ser un número positivo', 400);
    }

    const item = await BasicInventory.findByPk(id);
    if (!item) {
        throw new CustomError('Item no encontrado', 404);
    }

    if (item.inventoryType === 'reusable') {
        // Para reutilizables, se puede especificar si agregar a stock limpio o total
        if (stockType === 'clean') {
            await item.increment('cleanStock', { by: quantity });
        } else if (stockType === 'total') {
            await item.increment(['totalReusableStock', 'cleanStock'], { by: quantity });
        }
    } else {
        // Para consumibles y vendibles
        await item.increment('currentStock', { by: quantity });
    }

    res.json({
        error: false,
        message: `Stock ${stockType} añadido exitosamente`,
        data: item,
    });
};



const getInventorySummary = async (req, res) => {
    const summary = await BasicInventory.findAll({
        where: { isActive: true },
        attributes: [
            'inventoryType',
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalItems'],
            [sequelize.fn('SUM', sequelize.col('currentStock')), 'totalCurrentStock'],
            [sequelize.fn('SUM', sequelize.col('cleanStock')), 'totalCleanStock'],
            [sequelize.fn('SUM', sequelize.col('dirtyStock')), 'totalDirtyStock'],
            [sequelize.fn('AVG', sequelize.col('unitPrice')), 'avgUnitPrice']
        ],
        group: ['inventoryType']
    });

    // Calcular valor total del inventario
    const valuationByType = await BasicInventory.findAll({
        where: { isActive: true },
        attributes: [
            'inventoryType',
            [sequelize.literal('SUM(COALESCE("currentStock", 0) * "unitPrice")'), 'consumableValue'],
            [sequelize.literal('SUM(COALESCE("totalReusableStock", 0) * "unitPrice")'), 'reusableValue']
        ],
        group: ['inventoryType']
    });

    res.json({
        error: false,
        message: 'Resumen de inventario obtenido exitosamente',
        data: {
            stockSummary: summary,
            valuationSummary: valuationByType
        }
    });
};

const removeStock = async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity <= 0) {
        throw new CustomError('La cantidad debe ser un número positivo', 400);
    }

    const item = await BasicInventory.findByPk(id);
    if (!item) {
        throw new CustomError('Item no encontrado', 404);
    }

    let availableStock = 0;
    let stockField = '';

    if (item.inventoryType === 'reusable') {
        availableStock = item.cleanStock;
        stockField = 'cleanStock';
    } else {
        availableStock = item.currentStock;
        stockField = 'currentStock';
    }

    if (availableStock < quantity) {
        throw new CustomError(`No hay suficiente stock disponible. Disponible: ${availableStock}`, 400);
    }

    await item.decrement(stockField, { by: quantity });

    res.json({
        error: false,
        message: 'Stock removido exitosamente',
        data: item,
    });
};

const transferDirtyToClean = async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity <= 0) {
        throw new CustomError('La cantidad debe ser un número positivo', 400);
    }

    const item = await BasicInventory.findByPk(id);
    if (!item) {
        throw new CustomError('Item no encontrado', 404);
    }

    if (item.inventoryType !== 'reusable') {
        throw new CustomError('Esta operación solo aplica para items reutilizables', 400);
    }

    if (item.dirtyStock < quantity) {
        throw new CustomError(`No hay suficiente stock sucio. Disponible: ${item.dirtyStock}`, 400);
    }

    // Transferir de sucio a limpio
    await item.update({
        dirtyStock: item.dirtyStock - quantity,
        cleanStock: item.cleanStock + quantity
    });

    // Registrar movimiento de lavandería
    await LaundryMovement.create({
        basicInventoryId: id,
        movementType: 'washing_to_clean',
        quantity,
        notes: 'Transferencia manual de stock sucio a limpio'
    });

    res.json({
        error: false,
        message: 'Stock transferido de sucio a limpio exitosamente',
        data: item,
    });
};

const markAsDirty = async (req, res) => {
    const { id } = req.params;
    const { quantity, roomNumber, bookingId } = req.body;

    if (typeof quantity !== 'number' || quantity <= 0) {
        throw new CustomError('La cantidad debe ser un número positivo', 400);
    }

    const item = await BasicInventory.findByPk(id);
    if (!item) {
        throw new CustomError('Item no encontrado', 404);
    }

    if (item.inventoryType !== 'reusable') {
        throw new CustomError('Esta operación solo aplica para items reutilizables', 400);
    }

    if (item.cleanStock < quantity) {
        throw new CustomError(`No hay suficiente stock limpio. Disponible: ${item.cleanStock}`, 400);
    }

    // Transferir de limpio a sucio
    await item.update({
        cleanStock: item.cleanStock - quantity,
        dirtyStock: item.dirtyStock + quantity
    });

    // Registrar movimiento de lavandería
    await LaundryMovement.create({
        basicInventoryId: id,
        movementType: 'clean_to_dirty',
        quantity,
        roomId: roomNumber,
        bookingId,
        notes: `Marcado como sucio desde habitación ${roomNumber}`
    });

    res.json({
        error: false,
        message: 'Items marcados como sucios exitosamente',
        data: item,
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
      order: [['purchaseDate', 'DESC']]
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
    // ❌ ANTES: Campos incorrectos
    // const items = await BasicInventory.findAll({
    //   attributes: ['id', 'name', 'stock', 'minimumStock', 'price']
    // });
    
    // ✅ DESPUÉS: Campos correctos
    const items = await BasicInventory.findAll({
      where: { isActive: true },
      attributes: [
        'id', 'name', 'inventoryType', 
        'currentStock', 'cleanStock', 'dirtyStock',
        'minStock', 'minCleanStock', 'unitPrice'
      ]
    });

    const report = items.map(item => {
      let stockInicial, stockActual, consumo;
      
      if (item.inventoryType === 'reusable') {
        stockInicial = item.minStock + 50; // Stock teórico inicial
        stockActual = (item.cleanStock || 0) + (item.dirtyStock || 0);
        consumo = stockInicial - stockActual;
      } else {
        stockInicial = item.minStock + 50;
        stockActual = item.currentStock;
        consumo = stockInicial - stockActual;
      }
      
      return {
        id: item.id,
        name: item.name,
        inventoryType: item.inventoryType,
        stockInicial,
        stockActual,
        consumo: Math.max(0, consumo) // No negativos
      };
    });

    res.json({
      error: false,
      message: 'Reporte de consumo generado exitosamente',
      data: report
    });
};
  const getInventoryValuation = async (req, res) => {
    // ❌ ANTES: Campos incorrectos
    // const items = await BasicInventory.findAll({
    //   attributes: ['id', 'name', 'stock', 'price']
    // });
    
    // ✅ DESPUÉS: Campos correctos
    const items = await BasicInventory.findAll({
      where: { isActive: true },
      attributes: [
        'id', 'name', 'inventoryType',
        'currentStock', 'cleanStock', 'dirtyStock', 
        'unitPrice', 'salePrice'
      ]
    });

    const report = items.map(item => {
      let effectiveStock = 0;
      let effectivePrice = item.unitPrice;
      
      if (item.inventoryType === 'reusable') {
        effectiveStock = (item.cleanStock || 0) + (item.dirtyStock || 0);
      } else {
        effectiveStock = item.currentStock || 0;
      }
      
      // Para items vendibles, usar precio de venta si existe
      if (item.inventoryType === 'sellable' && item.salePrice) {
        effectivePrice = item.salePrice;
      }
      
      return {
        id: item.id,
        name: item.name,
        inventoryType: item.inventoryType,
        stock: effectiveStock,
        unitPrice: parseFloat(item.unitPrice || 0),
        salePrice: parseFloat(item.salePrice || 0),
        effectivePrice: parseFloat(effectivePrice),
        totalValue: effectiveStock * parseFloat(effectivePrice)
      };
    });

    // Valor global del inventario
    const globalValuation = report.reduce((acc, cur) => acc + cur.totalValue, 0);

    res.json({
      error: false,
      message: 'Reporte de valoración del inventario generado exitosamente',
      data: {
        items: report,
        globalValuation: parseFloat(globalValuation.toFixed(2)),
        summary: {
          consumableValue: report
            .filter(i => i.inventoryType === 'consumable')
            .reduce((acc, cur) => acc + cur.totalValue, 0),
          reusableValue: report
            .filter(i => i.inventoryType === 'reusable')
            .reduce((acc, cur) => acc + cur.totalValue, 0),
          sellableValue: report
            .filter(i => i.inventoryType === 'sellable')
            .reduce((acc, cur) => acc + cur.totalValue, 0)
        }
      }
    });
};

  // Reporte de valoración del inventario: Calcula el valor total de cada ítem (stock * price) y el valor global.
  
  
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
    // ❌ PROBLEMA: RoomCheckIn no tiene relación directa con BasicInventory
    // ❌ RoomCheckIn es para preparación de habitaciones, no para asignación de inventario
    
    // ✅ SOLUCIÓN: Usar RoomBasics que SÍ relaciona Room con BasicInventory
    const { RoomBasics, Room, BasicInventory } = require('../data');
    
    const assignments = await RoomBasics.findAll({
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['roomNumber', 'type', 'status']
        },
        {
          model: BasicInventory,
          as: 'inventory',
          attributes: ['id', 'name', 'category', 'inventoryType']
        }
      ],
      order: [['roomNumber', 'ASC']]
    });
    
    res.json({
      error: false,
      message: 'Asignaciones de inventario por habitación recuperadas exitosamente',
      data: assignments
    });
};
  // Crea una nueva asignación a una habitación
  const createRoomAssignment = async (req, res) => {
    const { roomNumber, basicId, quantity, isRequired = true } = req.body;
    
    // Validar campos
    if (!roomNumber || !basicId || typeof quantity !== 'number' || quantity <= 0) {
      throw new CustomError('roomNumber, basicId y una cantidad positiva son requeridos', 400);
    }
    
    // Verificar que el item exista en el inventario
    const item = await BasicInventory.findByPk(basicId);
    if (!item) {
      throw new CustomError('Item de inventario no encontrado', 404);
    }
    
    // Verificar que la habitación exista
    const room = await Room.findOne({ where: { roomNumber } });
    if (!room) {
      throw new CustomError('Habitación no encontrada', 404);
    }
    
    // Crear la asignación usando RoomBasics
    const assignment = await RoomBasics.create({
      roomNumber,
      basicId,
      quantity,
      isRequired
    });
    
    res.status(201).json({
      error: false,
      message: 'Asignación de inventario creada exitosamente',
      data: assignment
    });
};

  
  // Obtiene detalles de asignación para una habitación específica
  const getRoomAssignmentDetails = async (req, res) => {
    const { roomNumber } = req.params;
    
    const assignments = await RoomBasics.findAll({
      where: { roomNumber },
      include: [
        {
          model: BasicInventory,
          as: 'inventory',
          attributes: [
            'id', 'name', 'description', 'category', 
            'inventoryType', 'currentStock', 'cleanStock', 
            'dirtyStock', 'unitPrice'
          ]
        }
      ]
    });
    
    if (!assignments || assignments.length === 0) {
      throw new CustomError('No se encontraron asignaciones para esta habitación', 404);
    }
    
    // Agrupar por categoría para mejor organización
    const assignmentsByCategory = assignments.reduce((acc, assignment) => {
      const category = assignment.inventory.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: assignment.id,
        quantity: assignment.quantity,
        isRequired: assignment.isRequired,
        inventory: assignment.inventory
      });
      return acc;
    }, {});
    
    res.json({
      error: false,
      message: 'Detalles de asignación recuperados exitosamente',
      data: {
        roomNumber,
        totalAssignments: assignments.length,
        assignmentsByCategory
      }
    });
};
  

module.exports = {
    getInventory,
    createPurchase,
    markAsDirty,
    updateInventory,
    getLowStockItems,
    getInventoryByType,
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
    transferDirtyToClean,
    getInventoryMovements: getInventoryMovements, // ⭐ CORREGIDO
    getInventoryValuation: getInventoryValuation, // ⭐ CORREGIDO
    getConsumptionReport: getConsumptionReport, // ⭐ CORREGIDO
    getRoomAssignments,
    createRoomAssignment,
    getRoomAssignmentDetails,
    getInventorySummary
};