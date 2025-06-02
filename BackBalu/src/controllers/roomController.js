const { Room, RoomCheckIn, RoomBasics, Booking, Payment, BasicInventory, Service } = require('../data');
const { Op } = require("sequelize");

// Obtener todas las habitaciones
const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.findAll({
      include: [
        {
          model: Service,
          attributes: ['name'],
          through: { attributes: [] }
        },
        {
          model: BasicInventory,
          attributes: ["id", "name"],
          through: { attributes: ["quantity"] },
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

// Obtener tipos de habitación
const getRoomTypes = async (req, res, next) => {
  try {
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

// Obtener una habitación por ID
const getRoomById = async (req, res, next) => {
  try {
    const roomNumber = req.params.roomNumber || req.query.roomNumber;

    if (!roomNumber) {
      return res.status(400).json({
        error: true,
        message: "El número de habitación es requerido",
      });
    }

    const room = await Room.findByPk(roomNumber, {
      include: [
        {
          model: BasicInventory,
          attributes: ["id", "name"],
          through: { attributes: ["quantity"] },
        },
        {
          model: Service,
          attributes: ["name"],
          through: { attributes: [] },
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

// Revisar disponibilidad
const checkAvailability = async (req, res, next) => {
  try {
    const { dates } = req.params;
    const [startDate, endDate] = dates.split(',');
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
      priceSingle,
      priceDouble,
      priceMultiple,
      pricePerExtraGuest,
      description,
      image_url,
      maxGuests,
      services,
      type,
      basicInventories,
    } = req.body;

    // Validaciones básicas
    if (!roomNumber || !priceSingle || !priceDouble || !priceMultiple) {
      return res.status(400).json({
        error: true,
        message: "Faltan campos requeridos: roomNumber, priceSingle, priceDouble, priceMultiple"
      });
    }

    // Crear la habitación
    const newRoom = await Room.create({
      roomNumber,
      priceSingle,
      priceDouble,
      priceMultiple,
      pricePerExtraGuest: pricePerExtraGuest || 0,
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

    // Asociar los BasicInventories a la habitación
    if (basicInventories && basicInventories.length > 0) {
      await Promise.all(
        basicInventories.map(async (amenity) => {
          const inventory = await BasicInventory.findByPk(amenity.id);
          if (inventory) {
            // Verificar si hay suficiente stock
            if (inventory.currentStock < amenity.quantity) {
              throw new Error(
                `No hay suficiente stock para el item ${inventory.name}`
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
          attributes: ["id", "name"],
          through: { attributes: ["quantity"] },
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
      const currentInventories = await room.getBasicInventories();

      const currentInventoryMap = new Map(
        currentInventories.map((inv) => [inv.id, inv.RoomBasics.quantity])
      );

      for (const inventory of basicInventories) {
        const { id, quantity } = inventory;

        if (currentInventoryMap.has(id)) {
          if (currentInventoryMap.get(id) !== quantity) {
            await room.addBasicInventory(id, { through: { quantity } });
          }
          currentInventoryMap.delete(id);
        } else {
          await room.addBasicInventory(id, { through: { quantity } });
        }
      }

      for (const [id] of currentInventoryMap) {
        await room.removeBasicInventory(id);
      }
    }

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

// Eliminar habitación
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

// Actualizar el estado de la habitación
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

// Obtener amenities de una habitación
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
    const { amenities } = req.body;
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

// Obtener servicios de una habitación
const getRoomServices = async (req, res, next) => {
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
    const { services } = req.body;
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

// Reporte de ingresos por tipo de habitación
const getRevenueByRoomType = async (req, res, next) => {
  try {
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

// Obtener promociones activas
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

// Obtener ofertas especiales
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

// Obtener estado de preparación de la habitación
const getRoomPreparationStatus = async (req, res, next) => {
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
          through: { attributes: ['quantity'] },
        },
      ]
    });

    if (!room) {
      return res.status(404).json({ 
        error: true, 
        message: 'Habitación no encontrada' 
      });
    }

    res.json({
      error: false,
      data: {
        roomNumber: room.roomNumber,
        status: room.status,
        services: room.Services,
        lastPreparation: room.preparation || null,
        basics: room.BasicInventories
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtener básicos de la habitación
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
      return res.status(404).json({ 
        error: true, 
        message: 'Habitación no encontrada' 
      });
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

// ⭐ NUEVO: Calcular precio de habitación
const calculateRoomPrice = async (req, res, next) => {
  try {
    const { roomNumber, guestCount, checkIn, checkOut, promoCode } = req.body;

    // Validaciones de entrada
    if (!roomNumber || !guestCount || !checkIn || !checkOut) {
      return res.status(400).json({
        error: true,
        message: 'Faltan parámetros requeridos: roomNumber, guestCount, checkIn, checkOut'
      });
    }

    if (guestCount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'La cantidad de huéspedes debe ser mayor a 0'
      });
    }

    // Buscar la habitación
    const room = await Room.findByPk(roomNumber);
    
    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }

    if (!room.isActive) {
      return res.status(400).json({
        error: true,
        message: 'Habitación no disponible'
      });
    }

    // Calcular noches
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    if (nights < 1) {
      return res.status(400).json({
        error: true,
        message: 'La fecha de salida debe ser posterior a la fecha de entrada'
      });
    }

    // Aplicar código promocional si existe
    if (promoCode && room.promotionPrice) {
      room.isPromo = true;
    }

    // Calcular precio usando el método del modelo (si existe)
    let priceCalculation;
    if (typeof room.calculatePrice === 'function') {
      try {
        priceCalculation = room.calculatePrice(guestCount, nights);
      } catch (calculationError) {
        return res.status(400).json({
          error: true,
          message: calculationError.message
        });
      }
    } else {
      // ⭐ FALLBACK: Cálculo manual si no existe el método
      let pricePerNight;
      
      if (room.isPromo && room.promotionPrice) {
        pricePerNight = parseFloat(room.promotionPrice);
      } else {
        if (guestCount === 1) {
          pricePerNight = parseFloat(room.priceSingle || room.price || 0);
        } else if (guestCount === 2) {
          pricePerNight = parseFloat(room.priceDouble || room.price || 0);
        } else {
          pricePerNight = parseFloat(room.priceMultiple || room.price || 0);
        }
      }

      const totalAmount = pricePerNight * nights;
      
      priceCalculation = {
        pricePerNight,
        totalAmount,
        isPromotion: room.isPromo && room.promotionPrice ? true : false,
        breakdown: {
          basePrice: pricePerNight,
          nights,
          guestCount,
          extraGuestCharges: 0
        }
      };
    }

    // Respuesta exitosa
    res.json({
      error: false,
      message: 'Precio calculado exitosamente',
      data: {
        roomNumber: room.roomNumber,
        roomType: room.type,
        guestCount,
        nights,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        ...priceCalculation,
        roomDetails: {
          description: room.description,
          maxGuests: room.maxGuests,
          available: room.available,
          status: room.status
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// ⭐ NUEVO: Calcular precios de múltiples habitaciones
const calculateMultipleRoomPrices = async (req, res, next) => {
  try {
    const { roomNumbers, guestCount, checkIn, checkOut } = req.body;

    if (!Array.isArray(roomNumbers) || roomNumbers.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'Debe proporcionar al menos un número de habitación'
      });
    }

    const rooms = await Room.findAll({
      where: {
        roomNumber: roomNumbers,
        isActive: true
      }
    });

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    const calculations = rooms.map(room => {
      try {
        let priceCalculation;
        
        if (typeof room.calculatePrice === 'function') {
          priceCalculation = room.calculatePrice(guestCount, nights);
        } else {
          // Fallback calculation
          let pricePerNight;
          
          if (guestCount === 1) {
            pricePerNight = parseFloat(room.priceSingle || room.price || 0);
          } else if (guestCount === 2) {
            pricePerNight = parseFloat(room.priceDouble || room.price || 0);
          } else {
            pricePerNight = parseFloat(room.priceMultiple || room.price || 0);
          }

          priceCalculation = {
            pricePerNight,
            totalAmount: pricePerNight * nights,
            isPromotion: false
          };
        }

        return {
          roomNumber: room.roomNumber,
          roomType: room.type,
          maxGuests: room.maxGuests,
          available: room.available,
          ...priceCalculation,
          error: null
        };
      } catch (error) {
        return {
          roomNumber: room.roomNumber,
          error: error.message,
          available: false
        };
      }
    });

    res.json({
      error: false,
      message: 'Precios calculados exitosamente',
      data: {
        guestCount,
        nights,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        rooms: calculations
      }
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
  getRoomBasics,
  calculateRoomPrice,
  calculateMultipleRoomPrices
};