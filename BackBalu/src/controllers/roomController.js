const { Room, RoomCheckIn, RoomBasics, Booking, Payment, BasicInventory, Service, BookingInventoryUsage } = require('../data');
const { Op } = require("sequelize");

// Obtener todas las habitaciones
const getAllRooms = async (req, res, next) => {
  try {
    console.log('🚀 INICIANDO getAllRooms...');
    
    // ⭐ PASO 1: Verificar modelos disponibles
    console.log('📋 Modelos disponibles:', Object.keys(require('../data').sequelize.models));
    
    // ⭐ PASO 2: Verificar asociaciones de Room
    const { Room, Service, BasicInventory } = require('../data');
    console.log('🔍 Asociaciones de Room:', Object.keys(Room.associations || {}));
    console.log('🔍 Asociaciones de Service:', Object.keys(Service.associations || {}));
    console.log('🔍 Asociaciones de BasicInventory:', Object.keys(BasicInventory.associations || {}));
    
    // ⭐ PASO 3: Probar query básica primero
    console.log('🔄 Intentando query básica sin includes...');
    const basicRooms = await Room.findAll({
      attributes: ['roomNumber', 'type', 'description'],
      limit: 2
    });
    console.log('✅ Query básica exitosa:', basicRooms.length, 'habitaciones encontradas');
    
    // ⭐ PASO 4: Probar solo con Services
    console.log('🔄 Probando solo con Services...');
    try {
      const roomsWithServices = await Room.findAll({
        include: [
          {
            model: Service,
            as: 'Services',
            attributes: ['serviceId', 'name'],
            through: { attributes: [] },
          }
        ],
        limit: 1
      });
      console.log('✅ Query con Services exitosa:', roomsWithServices.length);
    } catch (serviceError) {
      console.log('❌ Error con Services:', serviceError.message);
    }
    
    // ⭐ PASO 5: Probar solo con BasicInventories
    console.log('🔄 Probando solo con BasicInventories...');
    try {
      const roomsWithInventory = await Room.findAll({
        include: [
          {
            model: BasicInventory,
            as: 'BasicInventories',
            attributes: ['id', 'name'],
            through: { 
              attributes: ['quantity'],
              as: 'RoomBasics'
            },
          }
        ],
        limit: 1
      });
      console.log('✅ Query con BasicInventories exitosa:', roomsWithInventory.length);
    } catch (inventoryError) {
      console.log('❌ Error con BasicInventories:', inventoryError.message);
    }
    
    // ⭐ PASO 6: Intentar query completa
    console.log('🔄 Intentando query completa...');
    const rooms = await Room.findAll({
      include: [
        {
          model: Service,
          as: 'Services',
          attributes: ['serviceId', 'name', 'category', 'icon'],
          through: { attributes: [] },
        },
        {
          model: BasicInventory,
          as: 'BasicInventories',
          attributes: ['id', 'name', 'category', 'currentStock'],
          through: { 
            attributes: ['quantity', 'isRequired', 'priority'],
            as: 'RoomBasics'
          },
        },
      ],
      order: [['roomNumber', 'ASC']]
    });

    console.log('✅ Query completa exitosa:', rooms.length, 'habitaciones con relaciones');

    res.json({
      error: false,
      data: rooms,
      message: 'Habitaciones obtenidas exitosamente'
    });
  } catch (error) {
    console.error('❌ Error en getAllRooms:', error.message);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ SQL Query (si existe):', error.sql);
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
          as: 'BasicInventories',
          attributes: [
            "id", "name", "description", "inventoryType", 
            "currentStock", "cleanStock", "dirtyStock", 
            "minStock", "minCleanStock", "category"
          ],
          through: { 
            attributes: ["quantity", "isRequired", "priority"],
            as: 'RoomBasics'
          },
        },
        {
          model: Service,
          attributes: ["name"],
          through: { attributes: [] },
        },
        {
          model: Booking,
          where: { status: { [Op.in]: ['checked-in', 'confirmed'] } },
          required: false,
          attributes: ['bookingId', 'status', 'checkIn', 'checkOut'],
          include: [
            {
              model: BookingInventoryUsage,
              as: 'inventoryUsages',
              include: [
                {
                  model: BasicInventory,
                  as: 'inventory',
                  attributes: ['name', 'inventoryType']
                }
              ]
            }
          ]
        }
      ],
    });

    if (!room) {
      return res.status(404).json({
        error: true,
        message: "Habitación no encontrada",
      });
    }

    // ⭐ CALCULAR DISPONIBILIDAD DE INVENTARIO
    const roomData = room.toJSON();
    let canCheckIn = true;
    const inventoryChecklist = [];

    if (roomData.BasicInventories) {
      roomData.BasicInventories.forEach(item => {
        const requiredQty = item.RoomBasics.quantity;
        let availableQty = 0;
        let status = 'available';

        if (item.inventoryType === 'reusable') {
          availableQty = item.cleanStock;
          if (availableQty < requiredQty) {
            status = item.RoomBasics.isRequired ? 'insufficient' : 'warning';
            if (item.RoomBasics.isRequired) canCheckIn = false;
          }
        } else {
          availableQty = item.currentStock;
          if (availableQty < requiredQty) {
            status = item.RoomBasics.isRequired ? 'insufficient' : 'warning';
            if (item.RoomBasics.isRequired) canCheckIn = false;
          }
        }

        inventoryChecklist.push({
          id: item.id,
          name: item.name,
          category: item.category,
          type: item.inventoryType,
          required: requiredQty,
          available: availableQty,
          isRequired: item.RoomBasics.isRequired,
          priority: item.RoomBasics.priority,
          status
        });
      });
    }

    res.status(200).json({
      error: false,
      data: {
        ...roomData,
        canCheckIn,
        inventoryChecklist,
        currentBookings: roomData.Bookings || []
      },
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



const createRoom = async (req, res, next) => {
  try {
    console.log('📥 Datos recibidos en createRoom:', JSON.stringify(req.body, null, 2));
    
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
      isPromo,
      promotionPrice
    } = req.body;

    // Validaciones básicas
    if (!roomNumber || !priceSingle || !priceDouble || !priceMultiple) {
      return res.status(400).json({
        error: true,
        message: "Campos requeridos faltantes"
      });
    }

    // Verificar que no exista la habitación
    const existingRoom = await Room.findByPk(roomNumber);
    if (existingRoom) {
      return res.status(400).json({
        error: true,
        message: "Ya existe una habitación con este número"
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
      isPromo: isPromo || false,
      promotionPrice: promotionPrice || null
    });

    console.log('✅ Habitación creada:', newRoom.roomNumber);

    // ⭐ ASOCIAR SERVICIOS
    if (services && services.length > 0) {
      console.log('🔧 Buscando servicios por nombre:', services);
      
      const serviceInstances = await Service.findAll({
        where: {
          name: services,
        },
      });

      console.log('🔧 Servicios encontrados:', serviceInstances.length);
      
      if (serviceInstances.length > 0) {
        await newRoom.setServices(serviceInstances);
        console.log('✅ Servicios asociados correctamente');
      }
    }

    // ⭐ ASOCIAR INVENTARIO BÁSICO - CORREGIDO
    if (basicInventories && basicInventories.length > 0) {
      console.log('🔧 Procesando basicInventories:', basicInventories);
      
      for (const inventoryConfig of basicInventories) {
        const { id, quantity, isRequired = true, priority = 3 } = inventoryConfig;
        
        console.log('🔍 Buscando inventario con id:', id);
        
        // ⭐ BUSCAR EL ITEM - El 'id' que llega es realmente itemId en la base de datos
        const inventory = await BasicInventory.findOne({
          where: { id: id } // ⭐ Ahora debería funcionar porque enviamos itemId como id
        });
        
        if (!inventory) {
          console.log('❌ Item de inventario no encontrado:', id);
          console.log('🔍 Disponibles en BD:', await BasicInventory.findAll({
            attributes: ['id', 'name'],
            limit: 5
          }));
          continue; // Continuar con los demás items
        }

        console.log('✅ Item encontrado:', inventory.name);

        // Crear la relación en RoomBasics
        const roomBasic = await RoomBasics.create({
          roomNumber: newRoom.roomNumber,
          basicId: inventory.id,
          quantity,
          isRequired,
          priority
        });
        
        console.log('✅ RoomBasic creado:', roomBasic.toJSON());
      }
    }

    // Obtener la habitación con todas las relaciones
  const roomWithDetails = await Room.findByPk(newRoom.roomNumber, {
  include: [
    {
      model: Service,
      as: 'Services', // ⭐ AGREGAR ESTA LÍNEA SI NO ESTÁ
      attributes: ['serviceId', 'name', 'category'],
      through: { attributes: [] },
    },
    {
      model: BasicInventory,
      as: 'BasicInventories', // ⭐ ASEGURAR QUE ESTÉ
      attributes: ['id', 'name', 'category', 'currentStock'],
      through: { 
        attributes: ['quantity', 'isRequired', 'priority'],
        as: 'RoomBasics'
      },
    },
  ],
});

    console.log('✅ Habitación creada exitosamente con detalles');

    res.status(201).json({
      error: false,
      data: roomWithDetails,
      message: "Habitación creada correctamente",
    });
  } catch (error) {
    console.error('❌ Error completo en createRoom:', error);
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

    // ⭐ NUEVA LÓGICA: Actualizar BasicInventories con configuración
    if (basicInventories && basicInventories.length > 0) {
      // Eliminar configuraciones actuales
      await RoomBasics.destroy({
        where: { roomNumber }
      });

      // Crear nuevas configuraciones
      for (const inventoryConfig of basicInventories) {
        const { id, quantity, isRequired = true, priority = 3 } = inventoryConfig;
        
        await RoomBasics.create({
          roomNumber,
          basicId: id,
          quantity,
          isRequired,
          priority
        });
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
          as: 'BasicInventories',
          attributes: ["id", "name", "inventoryType", "currentStock", "cleanStock"],
          through: { 
            attributes: ["quantity", "isRequired", "priority"],
            as: 'RoomBasics'
          },
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
          as: 'BasicInventories',
          attributes: [
            'id', 'name', 'description', 'inventoryType', 
            'currentStock', 'cleanStock', 'dirtyStock',
            'minStock', 'minCleanStock', 'category'
          ],
          through: { 
            attributes: ['quantity', 'isRequired', 'priority'],
            as: 'RoomBasics'
          }
        }
      ]
    });
    
    if (!room) {
      return res.status(404).json({ 
        error: true, 
        message: 'Habitación no encontrada' 
      });
    }
    
    // ⭐ PROCESAR INVENTARIO CON ESTADO DETALLADO
    const basics = room.BasicInventories.map(basic => {
      const requiredQty = basic.RoomBasics.quantity;
      let availableQty = 0;
      let stockStatus = 'ok';
      let stockInfo = {};

      if (basic.inventoryType === 'reusable') {
        availableQty = basic.cleanStock;
        stockInfo = {
          cleanStock: basic.cleanStock,
          dirtyStock: basic.dirtyStock,
          totalStock: basic.cleanStock + basic.dirtyStock,
          minCleanStock: basic.minCleanStock
        };
        
        if (availableQty < requiredQty) {
          stockStatus = 'insufficient';
        } else if (availableQty <= basic.minCleanStock) {
          stockStatus = 'low';
        }
      } else {
        availableQty = basic.currentStock;
        stockInfo = {
          currentStock: basic.currentStock,
          minStock: basic.minStock
        };
        
        if (availableQty < requiredQty) {
          stockStatus = 'insufficient';
        } else if (availableQty <= basic.minStock) {
          stockStatus = 'low';
        }
      }

      return {
        id: basic.id,
        name: basic.name,
        description: basic.description,
        category: basic.category,
        inventoryType: basic.inventoryType,
        required: requiredQty,
        available: availableQty,
        isRequired: basic.RoomBasics.isRequired,
        priority: basic.RoomBasics.priority,
        stockStatus,
        stockInfo,
        canAssign: availableQty >= requiredQty
      };
    });
    
    // ⭐ CALCULAR RESUMEN GENERAL
    const summary = {
      totalItems: basics.length,
      readyItems: basics.filter(b => b.canAssign).length,
      insufficientItems: basics.filter(b => !b.canAssign && b.isRequired).length,
      warningItems: basics.filter(b => b.stockStatus === 'low').length,
      canProceedCheckIn: basics.filter(b => b.isRequired && !b.canAssign).length === 0
    };
    
    res.json({
      error: false,
      data: {
        roomNumber,
        basics,
        summary
      },
      message: 'Inventario básico de la habitación recuperado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};


const checkInventoryAvailability = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const { bookingId } = req.query;

    const room = await Room.findByPk(roomNumber, {
      include: [
        {
          model: BasicInventory,
          as: 'BasicInventories',
          attributes: ['id', 'name', 'inventoryType', 'currentStock', 'cleanStock'],
          through: { 
            attributes: ['quantity', 'isRequired'],
            as: 'RoomBasics'
          }
        }
      ]
    });

    if (!room) {
      return res.status(404).json({
        error: true,
        message: 'Habitación no encontrada'
      });
    }

    // Verificar si ya tiene inventario asignado
    let existingAssignment = null;
    if (bookingId) {
      existingAssignment = await BookingInventoryUsage.findOne({
        where: { bookingId }
      });
    }

    const availabilityCheck = {
      roomNumber,
      canProceedCheckIn: true,
      hasExistingAssignment: !!existingAssignment,
      items: [],
      issues: []
    };

    for (const item of room.BasicInventories) {
      const requiredQty = item.RoomBasics.quantity;
      const availableQty = item.inventoryType === 'reusable' ? item.cleanStock : item.currentStock;
      const isAvailable = availableQty >= requiredQty;

      if (!isAvailable && item.RoomBasics.isRequired) {
        availabilityCheck.canProceedCheckIn = false;
        availabilityCheck.issues.push({
          item: item.name,
          type: item.inventoryType,
          required: requiredQty,
          available: availableQty,
          severity: 'critical'
        });
      }

      availabilityCheck.items.push({
        id: item.id,
        name: item.name,
        type: item.inventoryType,
        required: requiredQty,
        available: availableQty,
        isRequired: item.RoomBasics.isRequired,
        status: isAvailable ? 'ok' : (item.RoomBasics.isRequired ? 'critical' : 'warning')
      });
    }

    res.json({
      error: false,
      data: availabilityCheck,
      message: 'Verificación de disponibilidad de inventario completada'
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

const getRoomInventoryHistory = async (req, res, next) => {
  try {
    const { roomNumber } = req.params;
    const { startDate, endDate, limit = 20 } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.assignedAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const usageHistory = await BookingInventoryUsage.findAll({
      where: whereClause,
      include: [
        {
          model: Booking,
          as: 'booking',
          where: { roomNumber },
          attributes: ['bookingId', 'checkIn', 'checkOut', 'status']
        },
        {
          model: BasicInventory,
          as: 'inventory',
          attributes: ['name', 'inventoryType', 'category']
        }
      ],
      order: [['assignedAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Procesar estadísticas
    const stats = {
      totalUsages: usageHistory.length,
      itemsSummary: {},
      averageUsageByType: {}
    };

    usageHistory.forEach(usage => {
      const itemName = usage.inventory.name;
      const itemType = usage.inventory.inventoryType;

      if (!stats.itemsSummary[itemName]) {
        stats.itemsSummary[itemName] = {
          name: itemName,
          type: itemType,
          totalAssigned: 0,
          totalConsumed: 0,
          totalReturned: 0,
          usageCount: 0
        };
      }

      stats.itemsSummary[itemName].totalAssigned += usage.quantityAssigned;
      stats.itemsSummary[itemName].totalConsumed += usage.quantityConsumed;
      stats.itemsSummary[itemName].totalReturned += usage.quantityReturned;
      stats.itemsSummary[itemName].usageCount += 1;

      if (!stats.averageUsageByType[itemType]) {
        stats.averageUsageByType[itemType] = { total: 0, count: 0 };
      }
      stats.averageUsageByType[itemType].total += usage.quantityAssigned;
      stats.averageUsageByType[itemType].count += 1;
    });

    // Calcular promedios
    Object.keys(stats.averageUsageByType).forEach(type => {
      const data = stats.averageUsageByType[type];
      stats.averageUsageByType[type] = data.count > 0 ? (data.total / data.count).toFixed(2) : 0;
    });

    res.json({
      error: false,
      data: {
        roomNumber,
        period: { startDate, endDate },
        usageHistory,
        statistics: {
          ...stats,
          itemsSummary: Object.values(stats.itemsSummary)
        }
      },
      message: 'Historial de inventario de habitación obtenido exitosamente'
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
  calculateMultipleRoomPrices,
   checkInventoryAvailability, // ⭐ NUEVO
  getRoomInventoryHistory, // ⭐ NUEVO
};