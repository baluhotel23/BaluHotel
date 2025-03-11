const { Room, Bill, BasicInventory } = require('../data');


const getCombinedReport = async (req, res, next) => {
    try {
      // Reporte de ocupación
      const totalRooms = await Room.count();
      const occupiedRooms = await Room.count({ where: { status: 'Ocupada' } });
      const occupancyRate = totalRooms ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : '0.00';
  
      // Reporte de ingresos
      const totalRevenue = await Bill.sum('totalAmount');
  
      // Reporte de uso del inventario
      const inventoryItems = await BasicInventory.findAll({
        attributes: ['id', 'name', 'stock']
      });
  
      res.status(200).json({
        error: false,
        data: {
          occupancy: {
            totalRooms,
            occupiedRooms,
            occupancyRate: `${occupancyRate}%`
          },
          revenue: { totalRevenue },
          inventoryUsage: inventoryItems
        },
        message: 'Reporte combinado obtenido correctamente'
      });
    } catch (error) {
      next(error);
    }
  };
// GET /reports/occupancy - Reporte de ocupación
const getOccupancyReport = async (req, res, next) => {
  try {
    // Contar el total de habitaciones y las que están ocupadas (se asume que el campo status en Room indica "Ocupada")
    const totalRooms = await Room.count();
    const occupiedRooms = await Room.count({ where: { status: 'Ocupada' }});
    const occupancyRate = totalRooms ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : '0.00';

    res.status(200).json({
      error: false,
      data: {
        totalRooms,
        occupiedRooms,
        occupancyRate: `${occupancyRate}%`
      },
      message: 'Reporte de ocupación obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// GET /reports/revenue - Reporte de ingresos
const getRevenueReport = async (req, res, next) => {
  try {
    // Se asume que el modelo Bill tiene el campo totalAmount que almacena el ingreso de cada factura
    const totalRevenue = await Bill.sum('totalAmount');
    res.status(200).json({
      error: false,
      data: { totalRevenue },
      message: 'Reporte de ingresos obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// GET /reports/inventory-usage - Reporte de uso del inventario
const getInventoryUsageReport = async (req, res, next) => {
  try {
    // Obtener la lista de items del inventario (por ejemplo, BasicInventory) junto con su stock
    const inventoryItems = await BasicInventory.findAll({
      attributes: ['id', 'name', 'stock']
    });
    res.status(200).json({
      error: false,
      data: inventoryItems,
      message: 'Reporte de uso del inventario obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOccupancyReport,
  getRevenueReport,
  getInventoryUsageReport,
  getCombinedReport
};