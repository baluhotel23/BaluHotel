const { Room, Service } = require('../data'); // Asegúrate de que estos modelos estén correctamente exportados
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
        }
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
    const { roomNumber } = req.params;
    const room = await Room.findByPk(roomNumber, {
      include: [
        {
          model: Service,
          attributes: ['name'], // Solo incluir el campo 'name' de los servicios
          through: { attributes: [] } // Excluir atributos de la tabla intermedia
        }
      ]
    });
    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }
    res.status(200).json({
      error: false,
      data: room,
      message: 'Habitación obtenida correctamente'
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
    const { roomNumber, price, amenities, description, image_url, maxGuests, services, type } = req.body;

    // Crear la habitación
    const newRoom = await Room.create({
      roomNumber,
      price,
      amenities,
      description,
      image_url,
      maxGuests,
      type
    });

    // Asociar los servicios a la habitación
    if (services && services.length > 0) {
      const serviceInstances = await Service.findAll({
        where: {
          name: services
        }
      });
      await newRoom.addServices(serviceInstances);
    }
    const roomWithServices = await Room.findByPk(newRoom.roomNumber, {
      include: [
        {
          model: Service,
          attributes: ['name'], // Solo incluir el campo 'name' de los servicios
          through: { attributes: [] } // Excluir atributos de la tabla intermedia
        }
      ]
    });


    res.status(201).json({
      error: false,
      data: roomWithServices,
      message: 'Habitación creada correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar una habitación
const updateRoom = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const { services, ...roomData } = req.body;
    const room = await Room.findByPk(roomNumber);
    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }
    const updatedRoom = await room.update(roomData);

    // Actualizar las asociaciones con servicios
    if (services && services.length > 0) {
      const serviceInstances = await Service.findAll({
        where: {
          name: services
        }
      });
      await room.setServices(serviceInstances);
    }

    const roomWithServices = await Room.findByPk(updatedRoom.roomNumber, {
      include: [
        {
          model: Service,
          attributes: ['name'], // Solo incluir el campo 'name' de los servicios
          through: { attributes: [] } // Excluir atributos de la tabla intermedia
        }
      ]
    });

    res.status(200).json({
      error: false,
      data: roomWithServices,
      message: 'Habitación actualizada correctamente'
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
    const { id } = req.params;
    const room = await Room.findByPk(id);
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
    const { id } = req.params;
    const { amenities } = req.body; // array de strings
    const room = await Room.findByPk(id);
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
    const { id } = req.params;
    const room = await Room.findByPk(id);
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
  
};