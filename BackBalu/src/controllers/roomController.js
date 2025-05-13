const { Room,RoomCheckIn, RoomBasics, Booking, Payment, BasicInventory, Service  } = require('../data'); // Asegúrate de que estos modelos estén correctamente exportados
const { Op } = require("sequelize");

// Obtener todas las habitaciones
const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.findAll({
      include: [
        {
          model: Service,
          attributes: ['name'], // Solo incluir el campo 'name' de los servicios
          through: { attributes: [] } // Excluir atributos de la tabla intermedia
        },
        {
          model: BasicInventory, // Incluir el modelo BasicInventory
          attributes: ["id", "name"], // Campos que deseas incluir
          through: { attributes: ["quantity"] }, // Excluir atributos de la tabla intermedia
        },
      ]
    });
    res.status(200).json({
      error: false,
      data: rooms,
      message: 'Habitaciones obtenidas correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener tipos de habitación (se asume que los tipos se definen en los "tags")
const getRoomTypes = async (req, res, next) => {
  try {
    // Obtenemos el campo tags de todas las habitaciones y extraemos los tipos únicos
    const rooms = await Room.findAll({
      attributes: ['tags']
    });
    const typesSet = new Set();
    rooms.forEach(room => {
      if (Array.isArray(room.tags)) {
        room.tags.forEach(tag => typesSet.add(tag));
      }
    });
    res.status(200).json({
      error: false,
      data: Array.from(typesSet),
      message: 'Tipos de habitación obtenidos correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener una habitación en particular por su roomNumber
const getRoomById = async (req, res, next) => {
  try {
    // Obtener el roomNumber desde params o query
    const roomNumber = req.params.roomNumber || req.query.roomNumber;

    if (!roomNumber) {
      return res.status(400).json({
        error: true,
        message: "El número de habitación es requerido",
      });
    }

    // Buscar la habitación por roomNumber e incluir los amenities (BasicInventory)
    const room = await Room.findByPk(roomNumber, {
      include: [
        {
          model: BasicInventory, // Incluir el modelo BasicInventory
          attributes: ["id", "name"], // Campos que deseas incluir
          through: { attributes: ["quantity"] }, // Excluir atributos de la tabla intermedia
        },
        {
          model: Service, // Incluir servicios si es necesario
          attributes: ["name"], // Campos que deseas incluir
          through: { attributes: [] }, // Excluir atributos de la tabla intermedia
        },
      ],
    });

    if (!room) {
      return res.status(404).json({
        error: true,
        message: "Habitación no encontrada",
      });
    }

    res.status(200).json({
      error: false,
      data: room,
      message: "Habitación obtenida correctamente",
    });
  } catch (error) {
    next(error);
  }
};

// Revisar disponibilidad (ejemplo básico: habitaciones con available = true)
const checkAvailability = async (req, res, next) => {
  try {
    // Suponemos que se reciben fechas en el parámetro (formato: "YYYY-MM-DD,YYYY-MM-DD")
    const { dates } = req.params;
    const [startDate, endDate] = dates.split(',');
    // Esta lógica puede modificarse para validar según reservas existentes.
    const availableRooms = await Room.findAll({
      where: { available: true }
    });
    res.status(200).json({
      error: false,
      data: availableRooms,
      message: 'Habitaciones disponibles obtenidas correctamente'
    });
  } catch (error) {
    next(error);
  }
};


// Crear una nueva habitación
const createRoom = async (req, res, next) => {
  try {
    const {
      roomNumber,
      price,
      description,
      image_url,
      maxGuests,
      services,
      type,
      basicInventories, // Array de amenities con id y quantity
    } = req.body;

    // Crear la habitación
    const newRoom = await Room.create({
      roomNumber,
      price,
      description,
      image_url,
      maxGuests,
      type,
    });

    // Asociar los servicios a la habitación
    if (services && services.length > 0) {
      const serviceInstances = await Service.findAll({
        where: {
          name: services,
        },
      });
      await newRoom.addServices(serviceInstances);
    }

    // Asociar los BasicInventories a la habitación y actualizar el stock
    if (basicInventories && basicInventories.length > 0) {
      await Promise.all(
        basicInventories.map(async (amenity) => {
          const inventory = await BasicInventory.findByPk(amenity.id);
          if (inventory) {
            // Verificar si hay suficiente stock
            if (inventory.currentStock < amenity.quantity) {
              throw new CustomError(
                `No hay suficiente stock para el item ${inventory.name}`,
                400
              );
            }

            // Descontar del stock global
            await inventory.decrement("currentStock", { by: amenity.quantity });

            // Crear la relación en la tabla intermedia con la cantidad
            await newRoom.addBasicInventory(inventory, {
              through: { quantity: amenity.quantity },
            });
          }
        })
      );
    }

    // Incluir servicios y amenities en la respuesta
    const roomWithDetails = await Room.findByPk(newRoom.roomNumber, {
      include: [
        {
          model: Service,
          attributes: ["name"],
          through: { attributes: [] },
        },
        {
          model: BasicInventory,
          attributes: ["id", "name"], // Incluir solo los campos necesarios
          through: { attributes: ["quantity"] }, // Incluir la cantidad asignada desde RoomBasics
        },
      ],
    });

    res.status(201).json({
      error: false,
      data: roomWithDetails,
      message: "Habitación creada correctamente",
    });
  } catch (error) {
    next(error);
  }
};
// Actualizar una habitación
const updateRoom = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const { services, basicInventories, ...roomData } = req.body;

    // Buscar la habitación
    const room = await Room.findByPk(roomNumber);
    if (!room) {
      return res.status(404).json({
        error: true,
        message: "Habitación no encontrada",
      });
    }

    // Actualizar los datos de la habitación
    const updatedRoom = await room.update(roomData);

    // Actualizar las asociaciones con servicios
    if (services && services.length > 0) {
      const serviceInstances = await Service.findAll({
        where: {
          name: services,
        },
      });
      await room.setServices(serviceInstances);
    }

    // Actualizar los BasicInventories
    if (basicInventories && basicInventories.length > 0) {
      // Obtener los inventarios actuales asociados a la habitación
      const currentInventories = await room.getBasicInventories();

      // Crear un mapa de los inventarios actuales
      const currentInventoryMap = new Map(
        currentInventories.map((inv) => [inv.id, inv.RoomBasics.quantity])
      );

      // Procesar los nuevos inventarios
      for (const inventory of basicInventories) {
        const { id, quantity } = inventory;

        // Verificar si el inventario ya está asociado
        if (currentInventoryMap.has(id)) {
          // Actualizar la cantidad si es diferente
          if (currentInventoryMap.get(id) !== quantity) {
            await room.addBasicInventory(id, { through: { quantity } });
          }
          currentInventoryMap.delete(id); // Marcar como procesado
        } else {
          // Agregar un nuevo inventario
          await room.addBasicInventory(id, { through: { quantity } });
        }
      }

      // Eliminar los inventarios que ya no están en la lista
      for (const [id] of currentInventoryMap) {
        await room.removeBasicInventory(id);
      }
    }

    // Incluir servicios y BasicInventories en la respuesta
    const roomWithDetails = await Room.findByPk(updatedRoom.roomNumber, {
      include: [
        {
          model: Service,
          attributes: ["name"],
          through: { attributes: [] },
        },
        {
          model: BasicInventory,
          attributes: ["id", "name"],
          through: { attributes: ["quantity"] },
        },
      ],
    });

    res.status(200).json({
      error: false,
      data: roomWithDetails,
      message: "Habitación actualizada correctamente",
    });
  } catch (error) {
    next(error);
  }
};
const deleteRoom = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const room = await Room.findOne({ where: { roomNumber: parseInt(roomNumber, 10) } });
    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }

    // Eliminar las asociaciones con servicios
    await room.setServices([]);

    await room.destroy();
    res.status(200).json({
      error: false,
      message: 'Habitación eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
};


// Actualizar el estado de la habitación (campo status)
const updateRoomStatus = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const { status } = req.body;
    const room = await Room.findByPk(roomNumber);
    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }
    const validStatuses = ["Limpia", "Ocupada", "Mantenimiento", "Reservada"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: true,
        message: 'Estado inválido'
      });
    }
    const updatedRoom = await room.update({ status });
    res.status(200).json({
      error: false,
      data: updatedRoom,
      message: 'Estado de la habitación actualizado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener amenities de una habitación (se asume que están en el campo "tags")
const getRoomAmenities = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const room = await Room.findByPk(roomNumber);
    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }
    res.status(200).json({
      error: false,
      data: room.tags,
      message: 'Amenities obtenidos correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar amenities de una habitación
const updateRoomAmenities = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const { amenities } = req.body; // array de strings
    const room = await Room.findByPk(roomNumber);
    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }
    const updatedRoom = await room.update({ tags: amenities });
    res.status(200).json({
      error: false,
      data: updatedRoom,
      message: 'Amenities actualizados correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener servicios de una habitación (campo service)
const getRoomServices = async (req, res, next) => {
  try {
    const {roomNumber } = req.params;
    const room = await Room.findByPk(roomNumber);
    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }
    res.status(200).json({
      error: false,
      data: room.service,
      message: 'Servicios obtenidos correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar servicios de una habitación
const updateRoomServices = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const { services } = req.body; // array de strings
    const room = await Room.findByPk(roomNumber);
    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }
    const updatedRoom = await room.update({ service: services });
    res.status(200).json({
      error: false,
      data: updatedRoom,
      message: 'Servicios actualizados correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Reporte de ocupación
const getOccupancyReport = async (req, res, next) => {
  try {
    const totalRooms = await Room.count();
    const occupiedRooms = await Room.count({ where: { status: 'Ocupada' } });
    const occupancyRate = totalRooms ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : '0.00';
    res.status(200).json({
      error: false,
      data: { totalRooms, occupiedRooms, occupancyRate: `${occupancyRate}%` },
      message: 'Reporte de ocupación obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Reporte de ingresos por tipo de habitación (ejemplo dummy)
const getRevenueByRoomType = async (req, res, next) => {
  try {
    // Este reporte se basa en lógica de negocio; se muestra un ejemplo fijo
    const revenue = [
      { roomType: 'Suite', totalRevenue: 10000 },
      { roomType: 'Doble', totalRevenue: 8000 },
      { roomType: 'Individual', totalRevenue: 5000 }
    ];
    res.status(200).json({
      error: false,
      data: revenue,
      message: 'Reporte de ingresos por tipo de habitación obtenido correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getActivePromotions = async (req, res, next) => {
  try {
    const promotions = await Room.findAll({
      where: {
        isPromo: true,
        available: true
      },
      include: [
        {
          model: Service,
          attributes: ['name'],
          through: { attributes: [] }
        }
      ]
    });
    res.status(200).json({
      error: false,
      data: promotions,
      message: 'Promociones activas obtenidas correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener ofertas especiales (habitaciones en promoción que tienen precio promocional definido)
const getSpecialOffers = async (req, res, next) => {
  try {
    const specialOffers = await Room.findAll({
      where: {
        isPromo: true,
        promotionPrice: {
          [Op.ne]: null
        },
        available: true
      },
      include: [
        {
          model: Service,
          attributes: ['name'],
          through: { attributes: [] }
        }
      ]
    });
    res.status(200).json({
      error: false,
      data: specialOffers,
      message: 'Ofertas especiales obtenidas correctamente'
    });
  } catch (error) {
    next(error);
  }
};

const getRoomPreparationStatus = async (req, res) => {
  try {
    const { roomNumber } = req.params;
    const room = await Room.findOne({
  where: { roomNumber },
  include: [
    { model: Service, attributes: ['name'] },
    { model: RoomCheckIn, as: 'preparation' },
    {
      model: BasicInventory,
      attributes: ['id', 'name'],
      through: { attributes: ['quantity'] }, // Aquí accedes a RoomBasics
    },
  ]
});

    if (!room) {
      return res.status(404).json({ error: true, message: 'Habitación no encontrada' });
    }

    res.json({
      error: false,
      data: {
        roomNumber: room.roomNumber,
        status: room.status,
        services: room.Services,
        lastPreparation: room.preparation || null, // <-- Usa el alias aquí
        basics: room.RoomBasics
      }
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

const getRoomBasics = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const room = await Room.findByPk(roomNumber, {
      include: [
        {
          model: BasicInventory,
          attributes: ['id', 'name', 'description'],
          through: { attributes: ['quantity'] }
        }
      ]
    });
    if (!room) {
      return res.status(404).json({ error: true, message: 'Habitación no encontrada' });
    }
    const basics = room.BasicInventories.map(basic => ({
      id: basic.id,
      name: basic.name,
      description: basic.description,
      quantity: basic.RoomBasics.quantity
    }));
    res.json({
      error: false,
      data: basics,
      message: 'Básicos de la habitación recuperados exitosamente'
    });
  } catch (error) {
    next(error);
  }
}; 


module.exports = {
  getActivePromotions,
  getSpecialOffers,
  getAllRooms,
  getRoomTypes,
  getRoomById,
  checkAvailability,
  createRoom,
  updateRoom,
  deleteRoom,
 updateRoomStatus,
  getRoomAmenities,
  updateRoomAmenities,
  getRoomServices,
  updateRoomServices,
  getOccupancyReport,
  getRevenueByRoomType,
  getRoomPreparationStatus,
  getRoomBasics
};