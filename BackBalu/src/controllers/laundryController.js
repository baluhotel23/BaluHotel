const { BasicInventory, LaundryMovement, Room, Booking } = require('../data');

// Obtener estado general de lavandería
const getLaundryStatus = async (req, res, next) => {
  try {
    const reusableItems = await BasicInventory.findAll({
      where: { 
        inventoryType: 'reusable',
        isActive: true 
      },
      attributes: [
        'id', 
        'name', 
        'cleanStock', 
        'dirtyStock', 
        'totalReusableStock',
        'minCleanStock',
        'category'
      ]
    });

    // Calcular alertas
    const alerts = reusableItems.filter(item => 
      item.cleanStock < item.minCleanStock
    );

    res.json({
      error: false,
      data: {
        items: reusableItems,
        alerts: alerts,
        summary: {
          totalItems: reusableItems.length,
          lowStockItems: alerts.length,
          totalClean: reusableItems.reduce((sum, item) => sum + item.cleanStock, 0),
          totalDirty: reusableItems.reduce((sum, item) => sum + item.dirtyStock, 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Enviar items a lavandería (dirty → washing)
const sendToLaundry = async (req, res, next) => {
  try {
    const { items, notes } = req.body; // items = [{basicInventoryId, quantity}, ...]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere un array de items para enviar a lavandería'
      });
    }

    const movements = [];
    
    for (const item of items) {
      const { basicInventoryId, quantity } = item;
      
      // Verificar stock sucio disponible
      const inventory = await BasicInventory.findByPk(basicInventoryId);
      if (!inventory) {
        return res.status(404).json({
          error: true,
          message: `Item de inventario ${basicInventoryId} no encontrado`
        });
      }

      if (inventory.dirtyStock < quantity) {
        return res.status(400).json({
          error: true,
          message: `Stock sucio insuficiente para ${inventory.name}. Disponible: ${inventory.dirtyStock}, Solicitado: ${quantity}`
        });
      }

      // Calcular tiempo estimado de finalización
      const estimatedCompletion = new Date();
      estimatedCompletion.setHours(estimatedCompletion.getHours() + (inventory.washingTime || 24));

      // Crear movimiento de lavandería
      const movement = await LaundryMovement.create({
        basicInventoryId,
        movementType: 'dirty_to_washing',
        quantity,
        estimatedCompletion,
        notes
      });

      // Actualizar stock (no cambiamos dirtyStock aún, solo lo marcamos como "en proceso")
      movements.push(movement);
    }

    res.json({
      error: false,
      message: `${items.length} item(s) enviado(s) a lavandería exitosamente`,
      data: movements
    });
  } catch (error) {
    next(error);
  }
};

// Recibir items limpios de lavandería (washing → clean)
const receiveFromLaundry = async (req, res, next) => {
  try {
    const { items, notes } = req.body; // items = [{basicInventoryId, quantity, damaged?}, ...]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere un array de items para recibir de lavandería'
      });
    }

    const movements = [];
    
    for (const item of items) {
      const { basicInventoryId, quantity, damaged = 0 } = item;
      
      const inventory = await BasicInventory.findByPk(basicInventoryId);
      if (!inventory) {
        return res.status(404).json({
          error: true,
          message: `Item de inventario ${basicInventoryId} no encontrado`
        });
      }

      const cleanQuantity = quantity - damaged;

      // Crear movimiento de recepción
      const movement = await LaundryMovement.create({
        basicInventoryId,
        movementType: 'washing_to_clean',
        quantity,
        notes: damaged > 0 ? `${notes} - ${damaged} item(s) dañado(s)` : notes
      });

      // Actualizar stocks
      await inventory.update({
        dirtyStock: inventory.dirtyStock - quantity,
        cleanStock: inventory.cleanStock + cleanQuantity,
        // Si hay items dañados, reducir el stock total
        totalReusableStock: inventory.totalReusableStock - damaged
      });

      // Si hay items dañados, crear movimiento separado
      if (damaged > 0) {
        await LaundryMovement.create({
          basicInventoryId,
          movementType: 'damaged',
          quantity: damaged,
          notes: `Items dañados durante lavado: ${notes}`
        });
      }

      movements.push(movement);
    }

    res.json({
      error: false,
      message: `${items.length} item(s) recibido(s) de lavandería exitosamente`,
      data: movements
    });
  } catch (error) {
    next(error);
  }
};

// Marcar items como sucios cuando se recogen de habitación
const markAsDirty = async (req, res, next) => {
  try {
    const { bookingId, roomNumber, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Se requiere un array de items para marcar como sucios'
      });
    }

    const movements = [];
    
    for (const item of items) {
      const { basicInventoryId, quantity } = item;
      
      const inventory = await BasicInventory.findByPk(basicInventoryId);
      if (!inventory) continue;

      // Crear movimiento
      const movement = await LaundryMovement.create({
        basicInventoryId,
        movementType: 'clean_to_dirty',
        quantity,
        roomId: roomNumber,
        bookingId,
        notes: `Recogido de habitación ${roomNumber} - Reserva ${bookingId}`
      });

      // Actualizar stock
      await inventory.update({
        cleanStock: inventory.cleanStock - quantity,
        dirtyStock: inventory.dirtyStock + quantity
      });

      movements.push(movement);
    }

    res.json({
      error: false,
      message: `${movements.length} item(s) marcado(s) como sucio(s)`,
      data: movements
    });
  } catch (error) {
    next(error);
  }
};

// Obtener historial de movimientos de lavandería
const getLaundryHistory = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      movementType, 
      basicInventoryId,
      startDate,
      endDate 
    } = req.query;

    const where = {};
    
    if (movementType) where.movementType = movementType;
    if (basicInventoryId) where.basicInventoryId = basicInventoryId;
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows } = await LaundryMovement.findAndCountAll({
      where,
      include: [
        {
          model: BasicInventory,
          as: 'inventory',
          attributes: ['name', 'category']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      error: false,
      data: {
        movements: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtener items pendientes en lavandería
const getPendingLaundry = async (req, res, next) => {
  try {
    const pendingItems = await LaundryMovement.findAll({
      where: {
        movementType: 'dirty_to_washing',
        estimatedCompletion: {
          [Op.lte]: new Date() // Ya deberían estar listos
        }
      },
      include: [
        {
          model: BasicInventory,
          as: 'inventory',
          attributes: ['name', 'category']
        }
      ],
      order: [['estimatedCompletion', 'ASC']]
    });

    res.json({
      error: false,
      data: pendingItems
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLaundryStatus,
  sendToLaundry,
  receiveFromLaundry,
  markAsDirty,
  getLaundryHistory,
  getPendingLaundry
};