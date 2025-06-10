const { 
  Booking, 
  Room, 
  Buyer, 
  ExtraCharge, 
  Service,
  Bill, 
  Payment, 
  RegistrationPass,
  BasicInventory,
  BookingInventoryUsage,
  RoomBasics
} = require('../data');
const { Op } = require('sequelize');
const { CustomError } = require('../middleware/error');
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

// Public endpoints
const checkAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut, roomType } = req.query;
    
    console.log('🔍 checkAvailability called with:', { checkIn, checkOut, roomType });

    const where = {};
    if (roomType) where.type = roomType;

    const rooms = await Room.findAll({
      where,
      include: [
        {
          model: Booking,
          attributes: ["bookingId", "checkIn", "checkOut", "status"],
          required: false,
        },
        {
          model: Service,
          through: { attributes: [] },
        },
        {
          model: BasicInventory,
          as: 'BasicInventories',
          attributes: ['id', 'name', 'inventoryType'],
          through: { 
            attributes: ['quantity'],
            as: 'RoomBasics'
          },
          required: false
        }
      ],
    });

    console.log(`📊 Found ${rooms.length} rooms`);

    const roomsWithAvailability = rooms.map((room) => {
      const activeBookings = (room.Bookings || []).filter(
        (booking) => booking.status !== "cancelled"
      );

      // ⭐ NUEVA LÓGICA DE DISPONIBILIDAD
      let isAvailable = true;
      
      // 1. Verificar conflictos de fechas primero
      if (checkIn && checkOut) {
        isAvailable = !activeBookings.some((booking) => {
          const bookingStart = new Date(booking.checkIn);
          const bookingEnd = new Date(booking.checkOut);
          const requestStart = new Date(checkIn);
          const requestEnd = new Date(checkOut);

          return (
            (bookingStart <= requestEnd && bookingEnd >= requestStart) ||
            (requestStart <= bookingEnd && requestEnd >= bookingStart)
          );
        });
      }

      // 2. ⭐ LÓGICA DE ESTADO DE HABITACIÓN MEJORADA
      // Solo marcar como NO disponible si está realmente fuera de servicio
      if (!room.isActive) {
        isAvailable = false;
        console.log(`🚫 Room ${room.roomNumber}: Not active`);
      }
      
      // ⭐ ESTADOS QUE IMPIDEN RESERVAS
      if (room.status === 'out_of_order' || room.status === 'maintenance' || room.status === 'blocked') {
        isAvailable = false;
        console.log(`🚫 Room ${room.roomNumber}: Status ${room.status} prevents booking`);
      }
      
      // ⭐ ESTADOS QUE PERMITEN RESERVAS (aunque necesiten preparación)
      const bookableStatuses = ['Para Limpiar', 'available', 'clean', 'ready', null, undefined];
      if (bookableStatuses.includes(room.status)) {
        // Mantener la disponibilidad basada solo en conflictos de fechas
        console.log(`✅ Room ${room.roomNumber}: Status ${room.status} allows booking`);
      }
      
      console.log(`🏨 Room ${room.roomNumber}: available=${room.available}, status=${room.status}, isAvailable=${isAvailable}`);

      const bookedDates = activeBookings.map((booking) => ({
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        bookingId: booking.bookingId,
      }));

      return {
        roomNumber: room.roomNumber,
        type: room.type,
        price: room.price,
        priceSingle: room.priceSingle,
        priceDouble: room.priceDouble,
        priceMultiple: room.priceMultiple,
        pricePerExtraGuest: room.pricePerExtraGuest,
        isPromo: room.isPromo,
        promotionPrice: room.promotionPrice,
        maxGuests: room.maxGuests,
        description: room.description,
        image_url: room.image_url,
        available: room.available, // Mantener el campo original
        isActive: room.isActive,
        status: room.status,
        Services: room.Services,
        BasicInventories: room.BasicInventories,
        isAvailable, // ⭐ NUEVA LÓGICA APLICADA
        bookedDates,
        currentBookings: activeBookings.length,
        // ⭐ INFORMACIÓN ADICIONAL PARA DEBUG
        availabilityReason: isAvailable ? 'Available for booking' : 
          !room.isActive ? 'Room not active' : 
          ['out_of_order', 'maintenance', 'blocked'].includes(room.status) ? `Room status: ${room.status}` :
          'Date conflict with existing booking'
      };
    });

    console.log(`✅ Processed ${roomsWithAvailability.length} rooms with availability`);
    console.log(`🏠 Available rooms: ${roomsWithAvailability.filter(r => r.isAvailable).length}`);
    
    // ⭐ LOG DETALLADO DE DISPONIBILIDAD
    roomsWithAvailability.forEach(room => {
      console.log(`🏨 Room ${room.roomNumber}: ${room.isAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'} - ${room.availabilityReason}`);
    });

    res.json({
      error: false,
      message: "Disponibilidad consultada exitosamente",
      data: roomsWithAvailability,
    });
  } catch (error) {
    console.error('❌ Error in checkAvailability:', error);
    res.status(500).json({
      error: true,
      message: "Error al consultar disponibilidad",
      details: error.message,
    });
  }
};

const getRoomTypes = async (req, res) => {
  const types = await Room.findAll({
    attributes: ["type", "price", "maxGuests"],
    group: ["type", "price", "maxGuests"],
  });

  res.json({
    error: false,
    data: types,
  });
};

// Client and staff endpoints
const createBooking = async (req, res, next) => {
  try {
    const {
      guestId,
      roomNumber,
      checkIn,
      checkOut,
      guestCount,
      totalPrice,
      status = 'confirmed',
      notes,
      verifyInventory = true // ⭐ OPCIÓN PARA VERIFICAR INVENTARIO
    } = req.body;

    // Validaciones básicas
    if (!guestId || !roomNumber || !checkIn || !checkOut || !guestCount) {
      return res.status(400).json({
        error: true,
        message: 'Faltan campos requeridos'
      });
    }

    // Verificar que la habitación existe
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

    // ⭐ VERIFICAR DISPONIBILIDAD DE INVENTARIO SI SE SOLICITA
    const inventoryIssues = [];
    if (verifyInventory && room.BasicInventories) {
      for (const item of room.BasicInventories) {
        const requiredQty = item.RoomBasics.quantity;
        const availableQty = item.inventoryType === 'reusable' ? item.cleanStock : item.currentStock;
        
        if (availableQty < requiredQty && item.RoomBasics.isRequired) {
          inventoryIssues.push({
            item: item.name,
            required: requiredQty,
            available: availableQty,
            type: item.inventoryType
          });
        }
      }
    }

    // Si hay problemas de inventario y la verificación está activada, alertar
    if (inventoryIssues.length > 0 && verifyInventory) {
      return res.status(400).json({
        error: true,
        message: 'Inventario insuficiente para la reserva',
        data: {
          inventoryIssues,
          canCreateAnyway: true // Permitir crear la reserva de todas formas
        }
      });
    }

    // Crear la reserva
    const newBooking = await Booking.create({
      guestId,
      roomNumber,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guestCount,
      totalPrice,
      status,
      notes
    });

    // Incluir información completa en la respuesta
    const bookingWithDetails = await Booking.findByPk(newBooking.bookingId, {
      include: [
        { model: Room },
        { model: Buyer, as: "guest" }
      ]
    });

    res.status(201).json({
      error: false,
      message: 'Reserva creada exitosamente',
      data: {
        booking: bookingWithDetails,
        inventoryWarnings: inventoryIssues.length > 0 ? inventoryIssues : null
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateOnlinePayment = async (req, res, next) => {
  try {
    console.log("updateOnlinePayment - req.body:", req.body);
    const {
      bookingId,
      amount,
      transactionId,
      paymentReference,
      paymentMethod,
    } = req.body;

    // Buscar la reserva
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    // Verificar que la reserva sea de pago online
    if (booking.pointOfSale !== "Online") {
      throw new CustomError("Esta reserva no es de pago online", 400);
    }

    // Buscar el pago pendiente de tipo online asociado a la reserva
    let payment = await Payment.findOne({
      where: { bookingId, paymentType: "online", paymentStatus: "pending" },
      order: [["createdAt", "DESC"]],
    });

    // Si no existe, crearlo (opción 2)
    if (!payment) {
      payment = await Payment.create({
        bookingId,
        amount,
        paymentMethod,
        paymentType: "online",
        paymentStatus: "pending", // se actualizará a 'completed' a continuación
        paymentDate: new Date(),
      });
    }

    // Actualizar el registro de pago
    payment.amount = amount; // Monto confirmado por Wompi
    payment.paymentMethod = paymentMethod; // Método específico usado en Wompi
    payment.transactionId = transactionId;
    payment.paymentReference = paymentReference;
    payment.paymentStatus = "completed";
    await payment.save();

    // Actualizar el estado de la reserva según el monto pagado
    const totalAmount = Number(booking.totalAmount);
    const paidAmount = Number(amount);

    if (paidAmount < totalAmount) {
      booking.status = "advanced";
    } else {
      booking.status = "confirmed";
    }
    await booking.save();

    res.status(200).json({
      error: false,
      message: "Pago online registrado y reserva actualizada exitosamente",
      data: payment,
    });
  } catch (error) {
    console.error("Error al actualizar el pago online:", error);
    next(error);
  }
};

const downloadBookingPdf = async (req, res, next) => {
  try {
    const { trackingToken } = req.params;

    // Verificar y decodificar el token
    const decoded = jwt.verify(trackingToken, process.env.BOOKING_SECRET);
    const bookingId = decoded.bookingId;

    const booking = await Booking.findOne({
      where: { bookingId },
      include: [
        { model: Room },
        // incluir demás relaciones si es necesario
      ],
    });

    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    // Generar PDF (puedes personalizar la lógica)
    const doc = new PDFDocument();
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          "attachment;filename=booking_" + bookingId + ".pdf",
        "Content-Length": pdfData.length,
      });
      res.end(pdfData);
    });

    // Escribe contenido del PDF
    doc.fontSize(18).text("Detalle de Reserva", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Booking ID: ${booking.bookingId}`);
    doc.text(`Estado: ${booking.status}`);
    doc.text(`Fecha de check-in: ${booking.checkIn}`);
    doc.text(`Fecha de check-out: ${booking.checkOut}`);
    doc.text(`Monto Total: ${booking.totalAmount}`);
    // Agrega más detalles según sea necesario

    // Incluir enlace de seguimiento en el PDF
    doc.moveDown();
    doc.text(
      `Revisa el estado de tu reserva aquí: ${process.env.FRONT_URL}/booking-status/${trackingToken}`
    );

    doc.end();
  } catch (error) {
    next(error);
  }
};
const getBookingByToken = async (req, res, next) => {
  try {
    const { trackingToken } = req.params;

    // Verify and decode token
    const decoded = jwt.verify(trackingToken, process.env.BOOKING_SECRET);
    const bookingId = decoded.bookingId;

    const booking = await Booking.findOne({
      where: { bookingId },
      include: [
        { model: Room },
        // Include other relations if needed
      ],
    });

    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    res.json({
      error: false,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    // Se utiliza req.params.sdocno si está presente, sino se toma de req.buyer.sdocno
    const userId = req.params.sdocno || req.buyer?.sdocno;
    if (!userId) {
      return res.status(400).json({
        error: true,
        message: "Identificador de usuario no encontrado en el token",
      });
    }
    const bookings = await Booking.findAll({
      where: { guestId: userId },
      include: [{ model: Room }],
    });
    res.json({
      error: false,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res) => {
  const { bookingId } = req.params;

  const booking = await Booking.findOne({
    where: { bookingId },
    include: [
      { 
        model: Room,
        include: [
          {
            model: BasicInventory,
            as: 'BasicInventories',
            attributes: ['id', 'name', 'description', 'inventoryType', 'currentStock', 'cleanStock'],
            through: { 
              attributes: ['quantity', 'isRequired', 'priority'],
              as: 'RoomBasics'
            }
          }
        ]
      },
      { model: ExtraCharge },
      { model: Bill },
      { model: Buyer, as: "guest", attributes: ["sdocno", "scostumername"] },
      { model: Payment },
      { model: RegistrationPass, as: "registrationPasses" },
      // ⭐ NUEVO: Incluir inventario asignado a esta reserva
      {
        model: BookingInventoryUsage,
        as: 'inventoryUsages',
        include: [
          {
            model: BasicInventory,
            as: 'inventory',
            attributes: ['id', 'name', 'inventoryType', 'category']
          }
        ]
      }
    ],
  });

  if (!booking) {
    return res.status(404).json({
      error: true,
      message: 'Reserva no encontrada'
    });
  }

  // ⭐ PROCESAR INFORMACIÓN DE INVENTARIO
  const bookingData = booking.toJSON();
  
  // Calcular estado del inventario
  const inventoryStatus = {
    hasInventoryAssigned: bookingData.inventoryUsages && bookingData.inventoryUsages.length > 0,
    totalItemsAssigned: bookingData.inventoryUsages ? bookingData.inventoryUsages.length : 0,
    itemsReturned: bookingData.inventoryUsages ? bookingData.inventoryUsages.filter(u => u.status === 'returned').length : 0,
    itemsConsumed: bookingData.inventoryUsages ? bookingData.inventoryUsages.filter(u => u.status === 'consumed').length : 0,
    canProceedCheckOut: bookingData.status === 'checked-in' && bookingData.inventoryUsages && bookingData.inventoryUsages.length > 0
  };

  res.json({
    error: false,
    data: {
      ...bookingData,
      inventoryStatus
    }
  });
};

// Staff only endpoints
const getAllBookings = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      roomNumber, 
      guestId,
      includeInventory = false 
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (roomNumber) where.roomNumber = roomNumber;
    if (guestId) where.guestId = guestId;

    const includeOptions = [
      { 
        model: Room,
        attributes: ['roomNumber', 'type', 'status']
      },
      { 
        model: Buyer, 
        as: "guest", 
        attributes: ["sdocno", "scostumername"] 
      }
    ];

    // ⭐ INCLUIR INVENTARIO SI SE SOLICITA
    if (includeInventory === 'true') {
      includeOptions.push({
        model: BookingInventoryUsage,
        as: 'inventoryUsages',
        attributes: ['quantityAssigned', 'quantityConsumed', 'quantityReturned', 'status'],
        include: [
          {
            model: BasicInventory,
            as: 'inventory',
            attributes: ['name', 'inventoryType']
          }
        ]
      });
    }

    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: includeOptions,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // ⭐ PROCESAR DATOS CON ESTADO DE INVENTARIO
    const bookingsWithInventoryStatus = rows.map(booking => {
      const bookingData = booking.toJSON();
      
      if (includeInventory === 'true' && bookingData.inventoryUsages) {
        bookingData.inventoryStatus = {
          hasInventoryAssigned: bookingData.inventoryUsages.length > 0,
          totalItems: bookingData.inventoryUsages.length,
          itemsReturned: bookingData.inventoryUsages.filter(u => u.status === 'returned').length,
          itemsConsumed: bookingData.inventoryUsages.filter(u => u.status === 'consumed').length,
          readyForCheckOut: booking.status === 'checked-in' && bookingData.inventoryUsages.length > 0
        };
      }
      
      return bookingData;
    });

    res.json({
      error: false,
      data: {
        bookings: bookingsWithInventoryStatus,
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

const checkIn = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { assignInventory = true, customItems = [] } = req.body;

    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          include: [
            {
              model: BasicInventory,
              as: 'BasicInventories',
              attributes: ['id', 'name', 'inventoryType', 'currentStock', 'cleanStock'],
              through: { 
                attributes: ['quantity', 'isRequired', 'priority'],
                as: 'RoomBasics'
              }
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

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        error: true,
        message: 'Solo se pueden hacer check-in a reservas confirmadas'
      });
    }

    // Verificar si ya tiene inventario asignado
    const existingInventory = await BookingInventoryUsage.findOne({
      where: { bookingId }
    });

    if (existingInventory) {
      return res.status(400).json({
        error: true,
        message: 'Esta reserva ya tiene inventario asignado'
      });
    }

    // ⭐ ASIGNAR INVENTARIO AUTOMÁTICAMENTE
    const inventoryAssignments = [];
    const inventoryErrors = [];

    if (assignInventory && booking.Room.BasicInventories) {
      for (const item of booking.Room.BasicInventories) {
        const requiredQty = item.RoomBasics.quantity;
        let availableQty = 0;
        
        if (item.inventoryType === 'reusable') {
          availableQty = item.cleanStock;
        } else {
          availableQty = item.currentStock;
        }

        if (availableQty < requiredQty) {
          if (item.RoomBasics.isRequired) {
            inventoryErrors.push({
              item: item.name,
              required: requiredQty,
              available: availableQty,
              severity: 'critical'
            });
          } else {
            inventoryErrors.push({
              item: item.name,
              required: requiredQty,
              available: availableQty,
              severity: 'warning'
            });
          }
          continue;
        }

        // Crear asignación de inventario
        const assignment = await BookingInventoryUsage.create({
          bookingId,
          basicInventoryId: item.id,
          quantityAssigned: requiredQty,
          status: 'assigned',
          assignedAt: new Date()
        });

        // Actualizar stock
        if (item.inventoryType === 'reusable') {
          await item.update({
            cleanStock: item.cleanStock - requiredQty
          });
        } else {
          await item.update({
            currentStock: item.currentStock - requiredQty
          });
        }

        inventoryAssignments.push({
          item: item.name,
          type: item.inventoryType,
          assigned: requiredQty
        });
      }
    }

    // ⭐ PROCESAR ITEMS PERSONALIZADOS
    for (const customItem of customItems) {
      const { basicInventoryId, quantity } = customItem;
      
      const item = await BasicInventory.findByPk(basicInventoryId);
      if (!item) continue;

      const availableQty = item.inventoryType === 'reusable' ? item.cleanStock : item.currentStock;
      
      if (availableQty >= quantity) {
        await BookingInventoryUsage.create({
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

        inventoryAssignments.push({
          item: item.name,
          type: item.inventoryType,
          assigned: quantity,
          isCustom: true
        });
      }
    }

    // Si hay errores críticos, no permitir check-in
    const criticalErrors = inventoryErrors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'No se puede completar el check-in debido a falta de inventario crítico',
        data: {
          criticalErrors,
          warnings: inventoryErrors.filter(e => e.severity === 'warning')
        }
      });
    }

    // Actualizar estado de la reserva
    await booking.update({
      status: 'checked-in',
      actualCheckIn: new Date()
    });

    // Actualizar estado de la habitación
    await booking.Room.update({
      status: 'Ocupada',
      available: false
    });

    res.json({
      error: false,
      message: 'Check-in realizado exitosamente',
      data: {
        booking: {
          bookingId: booking.bookingId,
          status: 'checked-in',
          actualCheckIn: booking.actualCheckIn,
          roomNumber: booking.roomNumber
        },
        inventoryAssigned: inventoryAssignments,
        inventoryWarnings: inventoryErrors.filter(e => e.severity === 'warning')
      }
    });
  } catch (error) {
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { inventoryReturns = [] } = req.body; // [{basicInventoryId, quantityReturned, quantityConsumed, notes}]

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Room },
        {
          model: BookingInventoryUsage,
          as: 'inventoryUsages',
          include: [
            {
              model: BasicInventory,
              as: 'inventory'
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

    if (booking.status !== 'checked-in') {
      return res.status(400).json({
        error: true,
        message: 'Solo se puede hacer check-out de reservas con check-in activo'
      });
    }

    // ⭐ PROCESAR DEVOLUCIONES DE INVENTARIO
    const processedReturns = [];
    const laundryItems = [];

    for (const usage of booking.inventoryUsages) {
      const returnData = inventoryReturns.find(r => r.basicInventoryId === usage.basicInventoryId) || {};
      const { quantityReturned = 0, quantityConsumed = 0, notes = '' } = returnData;

      // Validar cantidades
      const totalProcessed = quantityReturned + quantityConsumed;
      if (totalProcessed > usage.quantityAssigned) {
        return res.status(400).json({
          error: true,
          message: `Cantidad total procesada excede la asignada para ${usage.inventory.name}`
        });
      }

      // Actualizar registro de uso
      await usage.update({
        quantityReturned,
        quantityConsumed,
        status: quantityReturned > 0 ? 'returned' : 'consumed',
        returnedAt: new Date(),
        notes
      });

      // Procesar según tipo de inventario
      if (usage.inventory.inventoryType === 'reusable' && quantityReturned > 0) {
        // Items reutilizables van a stock sucio
        await usage.inventory.update({
          dirtyStock: usage.inventory.dirtyStock + quantityReturned
        });

        laundryItems.push({
          item: usage.inventory.name,
          quantity: quantityReturned,
          fromRoom: booking.roomNumber
        });
      }

      processedReturns.push({
        item: usage.inventory.name,
        type: usage.inventory.inventoryType,
        assigned: usage.quantityAssigned,
        returned: quantityReturned,
        consumed: quantityConsumed,
        status: usage.status
      });
    }

    // Actualizar estado de la reserva
    await booking.update({
      status: 'checked-out',
      actualCheckOut: new Date()
    });

    // Actualizar estado de la habitación
    await booking.Room.update({
      status: 'Limpieza', // Necesita limpieza después del check-out
      available: false // Disponible después de limpieza
    });

    res.json({
      error: false,
      message: 'Check-out realizado exitosamente',
      data: {
        booking: {
          bookingId: booking.bookingId,
          status: 'checked-out',
          actualCheckOut: booking.actualCheckOut,
          roomNumber: booking.roomNumber
        },
        inventoryProcessed: processedReturns,
        laundryItems: laundryItems.length > 0 ? laundryItems : null,
        nextActions: {
          roomNeedsCleaning: true,
          laundryRequired: laundryItems.length > 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const calculateTotalAmount = (booking) => {
  const roomCharge = calculateRoomCharge(booking);
  const extraCharges = booking.ExtraCharges.reduce(
    (total, charge) => total + charge.amount,
    0
  );
  return roomCharge + extraCharges;
};

const addExtraCharges = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { price, quantity, description, itemId } = req.body;

    // Validar que req.user exista
    

    // Buscar la reserva usando el bookingId de los parámetros
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    // Solo se permiten cargos si el estado de la reserva es "checked-in"
    if (booking.status.toLowerCase() !== "checked-in") {
      throw new CustomError(
        "Solo se pueden agregar cargos a reservas con check-in",
        400
      );
    }

    // Validar stock si se proporciona itemId
    if (itemId) {
      const inventoryItem = await BasicInventory.findByPk(itemId);
      if (!inventoryItem) {
        throw new CustomError("El ítem del inventario no existe", 404);
      }

      if (inventoryItem.currentStock < quantity) {
        throw new CustomError(`Stock insuficiente para el ítem ${inventoryItem.name}. Disponible: ${inventoryItem.currentStock}`, 400);
      }

      // Reducir el stock después de crear el cargo extra
      await inventoryItem.update({
        currentStock: inventoryItem.currentStock - quantity,
      });
    }

    // Crear el cargo extra
    const extraCharge = await ExtraCharge.create({
      bookingId, // bookingId proveniente de req.params
      description,
      price,
      quantity,
      amount: price * quantity,
      createdBy: req.user.sdocno, // Usar req.user en lugar de req.buyer
    });

    res.status(201).json({
      error: false,
      message: "Cargo extra agregado exitosamente",
      data: extraCharge,
    });
  } catch (error) {
    console.error("Error al agregar cargo extra:", error);
    next(error);
  }
};

const getBookingInventoryStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const inventoryUsage = await BookingInventoryUsage.findAll({
      where: { bookingId },
      include: [
        {
          model: BasicInventory,
          as: 'inventory',
          attributes: ['id', 'name', 'inventoryType', 'category']
        }
      ]
    });

    if (inventoryUsage.length === 0) {
      return res.json({
        error: false,
        message: 'No hay inventario asignado a esta reserva',
        data: {
          hasInventory: false,
          items: []
        }
      });
    }

    // Procesar estado del inventario
    const inventoryItems = inventoryUsage.map(usage => ({
      id: usage.inventory.id,
      name: usage.inventory.name,
      type: usage.inventory.inventoryType,
      category: usage.inventory.category,
      quantityAssigned: usage.quantityAssigned,
      quantityConsumed: usage.quantityConsumed,
      quantityReturned: usage.quantityReturned,
      status: usage.status,
      assignedAt: usage.assignedAt,
      returnedAt: usage.returnedAt,
      notes: usage.notes
    }));

    const summary = {
      hasInventory: true,
      totalItems: inventoryItems.length,
      totalAssigned: inventoryItems.reduce((sum, item) => sum + item.quantityAssigned, 0),
      totalConsumed: inventoryItems.reduce((sum, item) => sum + item.quantityConsumed, 0),
      totalReturned: inventoryItems.reduce((sum, item) => sum + item.quantityReturned, 0),
      pendingReturn: inventoryItems.filter(item => item.status === 'assigned' || item.status === 'in_use').length,
      readyForCheckOut: inventoryItems.every(item => item.status === 'returned' || item.status === 'consumed')
    };

    res.json({
      error: false,
      data: {
        bookingId,
        summary,
        items: inventoryItems
      }
    });
  } catch (error) {
    next(error);
  }
};


const getInventoryUsageReport = async (req, res, next) => {
  try {
    const { startDate, endDate, roomNumber, inventoryType } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.assignedAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const includeClause = [
      {
        model: BasicInventory,
        as: 'inventory',
        attributes: ['name', 'inventoryType', 'category'],
        where: inventoryType ? { inventoryType } : {}
      },
      {
        model: Booking,
        as: 'booking',
        attributes: ['bookingId', 'roomNumber', 'checkIn', 'checkOut'],
        where: roomNumber ? { roomNumber } : {}
      }
    ];

    const usageData = await BookingInventoryUsage.findAll({
      where: whereClause,
      include: includeClause,
      order: [['assignedAt', 'DESC']]
    });

    // Procesar estadísticas
    const stats = {
      totalUsages: usageData.length,
      itemStats: {},
      roomStats: {},
      typeStats: {}
    };

    usageData.forEach(usage => {
      const itemName = usage.inventory.name;
      const roomNum = usage.booking.roomNumber;
      const itemType = usage.inventory.inventoryType;

      // Estadísticas por item
      if (!stats.itemStats[itemName]) {
        stats.itemStats[itemName] = {
          name: itemName,
          type: itemType,
          totalAssigned: 0,
          totalConsumed: 0,
          totalReturned: 0,
          usageCount: 0
        };
      }
      stats.itemStats[itemName].totalAssigned += usage.quantityAssigned;
      stats.itemStats[itemName].totalConsumed += usage.quantityConsumed;
      stats.itemStats[itemName].totalReturned += usage.quantityReturned;
      stats.itemStats[itemName].usageCount += 1;

      // Estadísticas por habitación
      if (!stats.roomStats[roomNum]) {
        stats.roomStats[roomNum] = {
          roomNumber: roomNum,
          totalAssignments: 0,
          uniqueItems: new Set()
        };
      }
      stats.roomStats[roomNum].totalAssignments += 1;
      stats.roomStats[roomNum].uniqueItems.add(itemName);

      // Estadísticas por tipo
      if (!stats.typeStats[itemType]) {
        stats.typeStats[itemType] = {
          type: itemType,
          totalAssigned: 0,
          totalConsumed: 0,
          totalReturned: 0
        };
      }
      stats.typeStats[itemType].totalAssigned += usage.quantityAssigned;
      stats.typeStats[itemType].totalConsumed += usage.quantityConsumed;
      stats.typeStats[itemType].totalReturned += usage.quantityReturned;
    });

    // Convertir Sets a números
    Object.keys(stats.roomStats).forEach(room => {
      stats.roomStats[room].uniqueItems = stats.roomStats[room].uniqueItems.size;
    });

    res.json({
      error: false,
      data: {
        period: { startDate, endDate },
        filters: { roomNumber, inventoryType },
        statistics: {
          ...stats,
          itemStats: Object.values(stats.itemStats),
          roomStats: Object.values(stats.roomStats),
          typeStats: Object.values(stats.typeStats)
        },
        usageDetails: usageData
      }
    });
  } catch (error) {
    next(error);
  }
};


const generateBill = async (req, res) => {
  const { bookingId } = req.params;

  try {
    // Buscar la reserva
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Room },
        { model: ExtraCharge },
        { model: Buyer, as: "guest", attributes: ["scostumername", "selectronicmail", "sdocno"] },
      ],
    });

    if (!booking) {
      throw new CustomError("Reserva no encontrada", 404);
    }

    // Calcular los montos
    const reservationAmount = parseFloat(booking.totalAmount) || 0; // Monto base de la reserva
    const extraChargesAmount = booking.ExtraCharges.reduce(
      (sum, charge) => sum + (parseFloat(charge.price) || 0),
      0
    ); // Total de cargos extra
    const totalAmount = reservationAmount + extraChargesAmount; // Total final

    // Crear la factura
    const bill = await Bill.create({
      bookingId: booking.bookingId,
      reservationAmount,
      extraChargesAmount,
      totalAmount,
      generatedBy: req.user?.n_document || "system",
      details: {
        roomCharge: reservationAmount,
        extraCharges: booking.ExtraCharges,
        nights: calculateNights(booking.checkIn, booking.checkOut),
        roomDetails: booking.Room,
        guestDetails: booking.guest,
      },
    });

    res.json({
      error: false,
      message: "Factura generada exitosamente",
      data: bill,
    });
  } catch (error) {
    console.error("Error al generar la factura:", error);
    res.status(500).json({
      error: true,
      message: "Error al generar la factura",
      details: error.message,
    });
  }
};

const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.findAll({
      include: [
        { model: Booking, include: [{ model: Buyer, as: "guest" }] },
      ],
    });

    res.json({
      error: false,
      data: bills,
    });
  } catch (error) {
    console.error("Error al obtener las facturas:", error);
    res.status(500).json({
      error: true,
      message: "Error al obtener las facturas",
    });
  }
};


const updateBookingStatus = async (req, res) => {
  const { bookingId } = req.params;
  const { status, reason } = req.body;

  const validStatuses = [
    "pending",
    "confirmed",
    "cancelled",
    "checked-in",
    "completed",
  ];
  
  if (!validStatuses.includes(status)) {
    throw new CustomError("Estado de reserva inválido", 400);
  }

  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new CustomError("Reserva no encontrada", 404);
  }

  // Solución: Manejar caso donde req.buyer o req.user puede no existir
  const updatedBy = req.user?.n_document || req.buyer?.sdocno || "system";

  await booking.update({
    status,
    statusReason: reason,
    statusUpdatedBy: updatedBy,  // Usar el valor seguro
    statusUpdatedAt: new Date(),
  });

  res.json({
    error: false,
    message: "Estado de reserva actualizado exitosamente",
    data: booking,
  });
};

const cancelBooking = async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    throw new CustomError("Reserva no encontrada", 404);
  }

  if (["checked-in", "completed"].includes(booking.status)) {
    throw new CustomError(
      "No se puede cancelar una reserva con check-in o completada",
      400
    );
  }

  await booking.update({
    status: "cancelled",
    statusReason: reason,
    cancelledBy: req.buyer.sdocno,
    cancelledAt: new Date(),
  });

  res.json({
    error: false,
    message: "Reserva cancelada exitosamente",
    data: booking,
  });
};

const getOccupancyReport = async (req, res) => {
  const { startDate, endDate } = req.query;

  const bookings = await Booking.findAll({
    where: {
      checkIn: { [Op.between]: [startDate, endDate] },
      status: { [Op.in]: ["checked-in", "completed"] },
    },
    include: [{ model: Room }],
  });

  const totalRooms = await Room.count();
  const occupiedRoomDays = calculateOccupiedRoomDays(bookings);
  const totalDays = Math.ceil(
    (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
  );
  const occupancyRate = (occupiedRoomDays / (totalRooms * totalDays)) * 100;

  res.json({
    error: false,
    data: {
      occupancyRate,
      totalRooms,
      occupiedRoomDays,
      periodDays: totalDays,
      bookings: bookings.length,
    },
  });
};

const getRevenueReport = async (req, res) => {
  const { startDate, endDate } = req.query;

  const bookings = await Booking.findAll({
    where: {
      checkOut: { [Op.between]: [startDate, endDate] },
      status: "completed",
    },
    include: [{ model: Room }, { model: ExtraCharge }, { model: Bill }],
  });

  const revenue = {
    total: 0,
    roomRevenue: 0,
    extraChargesRevenue: 0,
    bookingsCount: bookings.length,
    averagePerBooking: 0,
  };

  bookings.forEach((booking) => {
    const roomCharge = calculateRoomCharge(booking);
    const extraCharges = booking.ExtraCharges.reduce(
      (total, charge) => total + charge.amount,
      0
    );

    revenue.roomRevenue += roomCharge;
    revenue.extraChargesRevenue += extraCharges;
    revenue.total += roomCharge + extraCharges;
  });

  revenue.averagePerBooking = revenue.bookingsCount
    ? revenue.total / revenue.bookingsCount
    : 0;

  res.json({
    error: false,
    data: revenue,
  });
};

// Helper functions
const calculateRoomCharge = (booking) => {
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  return nights * booking.Room.price;
};

const calculateNights = (checkIn, checkOut) => {
  return Math.ceil(
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
  );
};

const calculateOccupiedRoomDays = (bookings) => {
  return bookings.reduce((total, booking) => {
    const nights = calculateNights(booking.checkIn, booking.checkOut);
    return total + nights;
  }, 0);
};

module.exports = {
  checkAvailability,
  getRoomTypes,
  createBooking,
  getAllBills,
  getUserBookings,
  getBookingById,
  getAllBookings,
  checkIn,
  checkOut,
  calculateTotalAmount,
  addExtraCharges,
  downloadBookingPdf,
  generateBill,
  updateBookingStatus,
  cancelBooking,
  getOccupancyReport,
  getRevenueReport,
  getBookingByToken,
  updateOnlinePayment,
  getBookingInventoryStatus, // ⭐ NUEVOn
  getInventoryUsageReport, // ⭐ NUEVO
};
