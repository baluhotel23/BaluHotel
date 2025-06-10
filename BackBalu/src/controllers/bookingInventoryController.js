const { BookingInventoryUsage, BasicInventory, Booking, Room, RoomBasics } = require('../data');
const { Op } = require('sequelize');

// Asignar inventario durante check-in
const assignInventoryToBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { customItems = [] } = req.body; // Items personalizados adicionales

    // Obtener la reserva con la habitación
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          include: [
            {
              model: BasicInventory,
              through: { 
                attributes: ['quantity'],
                as: 'RoomBasics'
              },
              as: 'BasicInventories'
            }
          ]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: 'Reserva no encontrada'
      });
    }

    // Verificar que no tenga inventario ya asignado
    const existingUsage = await BookingInventoryUsage.findOne({
      where: { bookingId }
    });

    if (existingUsage) {
      return res.status(400).json({
        error: true,
        message: 'Esta reserva ya tiene inventario asignado'
      });
    }

    const assignments = [];
    const errors = [];

    // Asignar inventario básico de la habitación
    for (const item of booking.Room.BasicInventories) {
      const requiredQuantity = item.RoomBasics.quantity;
      
      // Verificar stock disponible según tipo
      let availableStock = 0;
      if (item.inventoryType === 'reusable') {
        availableStock = item.cleanStock;
      } else {
        availableStock = item.currentStock;
      }

      if (availableStock < requiredQuantity) {
        errors.push({
          item: item.name,
          required: requiredQuantity,
          available: availableStock
        });
        continue;
      }

      // Crear asignación
      const assignment = await BookingInventoryUsage.create({
        bookingId,
        basicInventoryId: item.id,
        quantityAssigned: requiredQuantity,
        status: 'assigned',
        assignedAt: new Date()
      });

      // Actualizar stock
      if (item.inventoryType === 'reusable') {
        await item.update({
          cleanStock: item.cleanStock - requiredQuantity
        });
      } else {
        await item.update({
          currentStock: item.currentStock - requiredQuantity
        });
      }

      assignments.push(assignment);
    }

    // Asignar items personalizados si los hay
    for (const customItem of customItems) {
      const { basicInventoryId, quantity } = customItem;
      
      const item = await BasicInventory.findByPk(basicInventoryId);
      if (!item) continue;

      let availableStock = item.inventoryType === 'reusable' ? item.cleanStock : item.currentStock;
      
      if (availableStock >= quantity) {
        const assignment = await BookingInventoryUsage.create({
          bookingId,
          basicInventoryId,
          quantityAssigned: quantity,
          status: 'assigned',
          assignedAt: new Date()
        });

        // Actualizar stock
        if (item.inventoryType === 'reusable') {
          await item.update({
            cleanStock: item.cleanStock - quantity
          });
        } else {
          await item.update({
            currentStock: item.currentStock - quantity
          });
        }

        assignments.push(assignment);
      }
    }

    res.json({
      error: false,
      message: `Inventario asignado exitosamente a la reserva ${bookingId}`,
      data: {
        assignments,
        errors: errors.length > 0 ? errors : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// Procesar devolución durante check-out
const processCheckoutInventory = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { returns } = req.body; // [{basicInventoryId, quantityReturned, quantityConsumed, notes}, ...]

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        error: true,
        message: 'Reserva no encontrada'
      });
    }

    const processedReturns = [];
    
    for (const returnItem of returns) {
      const { basicInventoryId, quantityReturned, quantityConsumed = 0, notes } = returnItem;
      
      // Buscar la asignación original
      const assignment = await BookingInventoryUsage.findOne({
        where: { bookingId, basicInventoryId }
      });

      if (!assignment) continue;

      const inventory = await BasicInventory.findByPk(basicInventoryId);
      if (!inventory) continue;

      // Actualizar el registro de uso
      await assignment.update({
        quantityReturned,
        quantityConsumed,
        status: quantityReturned > 0 ? 'returned' : 'consumed',
        returnedAt: new Date(),
        notes
      });

      // Procesar devoluciones según tipo de inventario
      if (inventory.inventoryType === 'reusable' && quantityReturned > 0) {
        // Items reutilizables van a stock sucio
        await inventory.update({
          dirtyStock: inventory.dirtyStock + quantityReturned
        });
      }
      // Los consumibles no se devuelven al stock

      processedReturns.push({
        item: inventory.name,
        assigned: assignment.quantityAssigned,
        returned: quantityReturned,
        consumed: quantityConsumed
      });
    }

    res.json({
      error: false,
      message: `Check-out de inventario procesado para reserva ${bookingId}`,
      data: processedReturns
    });
  } catch (error) {
    next(error);
  }
};

// Obtener uso de inventario por reserva
const getBookingInventoryUsage = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const usage = await BookingInventoryUsage.findAll({
      where: { bookingId },
      include: [
        {
          model: BasicInventory,
          as: 'inventory',
          attributes: ['id', 'name', 'inventoryType', 'category']
        }
      ]
    });

    res.json({
      error: false,
      data: usage
    });
  } catch (error) {
    next(error);
  }
};

// Obtener resumen de uso de inventario por habitación
const getRoomInventoryUsage = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.assignedAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const usage = await BookingInventoryUsage.findAll({
      where,
      include: [
        {
          model: Booking,
          as: 'booking',
          where: { roomNumber },
          attributes: ['bookingId', 'checkIn', 'checkOut']
        },
        {
          model: BasicInventory,
          as: 'inventory',
          attributes: ['name', 'inventoryType', 'category']
        }
      ]
    });

    // Agrupar por item
    const summary = usage.reduce((acc, item) => {
      const key = item.inventory.name;
      if (!acc[key]) {
        acc[key] = {
          item: item.inventory.name,
          category: item.inventory.category,
          type: item.inventory.inventoryType,
          totalAssigned: 0,
          totalConsumed: 0,
          totalReturned: 0,
          usageCount: 0
        };
      }
      
      acc[key].totalAssigned += item.quantityAssigned;
      acc[key].totalConsumed += item.quantityConsumed;
      acc[key].totalReturned += item.quantityReturned;
      acc[key].usageCount += 1;
      
      return acc;
    }, {});

    res.json({
      error: false,
      data: {
        roomNumber,
        period: { startDate, endDate },
        summary: Object.values(summary)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignInventoryToBooking,
  processCheckoutInventory,
  getBookingInventoryUsage,
  getRoomInventoryUsage
};