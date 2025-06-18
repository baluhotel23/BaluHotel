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

const { 
  getColombiaTime, 
  getColombiaDate, 
  formatColombiaDate, 
  formatForLogs,
  formatForDetailedLogs,
  isBeforeToday,
  getDaysDifference 
} = require('../utils/dateUtils');


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
          as: 'bookings', // ⭐ AGREGAR EL ALIAS CORRECTO
          attributes: ["bookingId", "checkIn", "checkOut", "status"],
          required: false,
        },
        {
          model: Service,
          as: 'Services', // ⭐ AGREGAR EL ALIAS CORRECTO
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
      // ⭐ USAR EL ALIAS CORRECTO
      const activeBookings = (room.bookings || []).filter(
        (booking) => booking.status !== "cancelled"
      );

      // ⭐ NUEVA LÓGICA DE DISPONIBILIDAD MEJORADA
      let isAvailable = true;
      let unavailabilityReason = null;

      // 1. ⭐ VERIFICAR ESTADO DE LA HABITACIÓN PRIMERO
      if (!room.isActive) {
        isAvailable = false;
        unavailabilityReason = 'Room not active';
        console.log(`🚫 Room ${room.roomNumber}: Not active`);
      }
      
      // 2. ⭐ ESTADOS QUE IMPIDEN RESERVAS - USAR LOS ESTADOS CORRECTOS DE TU MODELO
      else if (['Mantenimiento'].includes(room.status)) {
        isAvailable = false;
        unavailabilityReason = `Room status: ${room.status}`;
        console.log(`🚫 Room ${room.roomNumber}: Status ${room.status} prevents booking`);
      }
      
      // 3. ⭐ VERIFICAR CONFLICTOS DE FECHAS SOLO SI LA HABITACIÓN ESTÁ OPERATIVA
      else if (checkIn && checkOut) {
        const hasDateConflict = activeBookings.some((booking) => {
          const bookingStart = new Date(booking.checkIn);
          const bookingEnd = new Date(booking.checkOut);
          const requestStart = new Date(checkIn);
          const requestEnd = new Date(checkOut);

          return (
            (bookingStart <= requestEnd && bookingEnd >= requestStart) ||
            (requestStart <= bookingEnd && requestEnd >= bookingStart)
          );
        });

        if (hasDateConflict) {
          isAvailable = false;
          unavailabilityReason = 'Date conflict with existing booking';
          console.log(`🚫 Room ${room.roomNumber}: Date conflict`);
        }
      }
      
      // ⭐ ESTADOS QUE PERMITEN RESERVAS (SEGÚN TU MODELO)
      const bookableStatuses = ['Limpia', 'Para Limpiar'];
      if (bookableStatuses.includes(room.status) && room.isActive) {
        console.log(`✅ Room ${room.roomNumber}: Status ${room.status} allows booking`);
      }
      
      // ⭐ NO PERMITIR RESERVAS EN HABITACIONES OCUPADAS
      if (room.status === 'Ocupada') {
        isAvailable = false;
        unavailabilityReason = 'Room is currently occupied';
        console.log(`🚫 Room ${room.roomNumber}: Currently occupied`);
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
        available: room.available, // ⭐ CAMPO DE BD
        isActive: room.isActive,
        status: room.status,
        Services: room.Services,
        BasicInventories: room.BasicInventories,
        isAvailable, // ⭐ DISPONIBILIDAD CALCULADA
        bookedDates,
        currentBookings: activeBookings.length,
        availabilityReason: isAvailable ? 'Available for booking' : unavailabilityReason
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
    console.log('🚀 [CREATE-BOOKING] Starting createBooking process...');
    console.log('🇨🇴 [CREATE-BOOKING] Server time Colombia:', formatForLogs(new Date())); // ⭐ SIN SEGUNDOS
    console.log('📥 [CREATE-BOOKING] Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 [CREATE-BOOKING] Request user:', req.user ? req.user.sdocno : 'No user');
    console.log('👤 [CREATE-BOOKING] Request user:', req.user ? {
      n_document: req.user.n_document, // ⭐ CAMBIAR DE sdocno A n_document
      role: req.user.role,
      email: req.user.email
    } : 'No user');
    const {
      guestId,
      roomNumber,
      checkIn,
      checkOut,
      guestCount,
      totalPrice,
      totalAmount,
      status = 'confirmed',
      notes,
      verifyInventory = true,
      forceCreate = false,
      pointOfSale = 'Online'
    } = req.body;

    console.log('📋 [CREATE-BOOKING] Extracted fields:', {
      guestId,
      roomNumber,
      checkIn,
      checkOut,
      guestCount,
      totalPrice,
      totalAmount,
      status,
      pointOfSale,
      verifyInventory,
      forceCreate
    });

    // ⭐ VALIDACIONES BÁSICAS MEJORADAS CON LOGS
    console.log('🔍 [CREATE-BOOKING] Starting validations...');
    
    if (!guestId) {
      console.log('❌ [CREATE-BOOKING] Missing guestId');
      return res.status(400).json({
        error: true,
        message: 'Campo requerido faltante: guestId'
      });
    }
    
    if (!roomNumber) {
      console.log('❌ [CREATE-BOOKING] Missing roomNumber');
      return res.status(400).json({
        error: true,
        message: 'Campo requerido faltante: roomNumber'
      });
    }
    
    if (!checkIn) {
      console.log('❌ [CREATE-BOOKING] Missing checkIn');
      return res.status(400).json({
        error: true,
        message: 'Campo requerido faltante: checkIn'
      });
    }
    
    if (!checkOut) {
      console.log('❌ [CREATE-BOOKING] Missing checkOut');
      return res.status(400).json({
        error: true,
        message: 'Campo requerido faltante: checkOut'
      });
    }
    
    if (!guestCount) {
      console.log('❌ [CREATE-BOOKING] Missing guestCount');
      return res.status(400).json({
        error: true,
        message: 'Campo requerido faltante: guestCount'
      });
    }

    console.log('✅ [CREATE-BOOKING] Basic validations passed');

    // ⭐ VALIDAR FECHAS CON UTILIDADES DE COLOMBIA
    console.log('📅 [CREATE-BOOKING] Validating dates...');
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = getColombiaDate(); // ⭐ USAR UTILIDAD

    console.log('📅 [CREATE-BOOKING] Date objects:', {
      checkInDate: checkInDate.toISOString(),
      checkOutDate: checkOutDate.toISOString(),
      today: today.toISOString(),
      todayFormatted: formatForLogs(today), // ⭐ SIN SEGUNDOS
      checkInFormatted: formatColombiaDate(checkInDate), // ⭐ SOLO FECHA
      checkOutFormatted: formatColombiaDate(checkOutDate) // ⭐ SOLO FECHA
    });

    if (checkInDate >= checkOutDate) {
      console.log('❌ [CREATE-BOOKING] Invalid date range - checkIn >= checkOut');
      return res.status(400).json({
        error: true,
        message: 'La fecha de check-out debe ser posterior al check-in'
      });
    }

    // ⭐ USAR UTILIDAD PARA COMPARAR FECHAS
    if (isBeforeToday(checkInDate)) {
      console.log('❌ [CREATE-BOOKING] Invalid checkIn date - in the past');
      console.log('📅 [CREATE-BOOKING] Date comparison Colombia:', {
        checkInFormatted: formatColombiaDate(checkInDate),
        todayFormatted: formatColombiaDate(today),
        isPast: isBeforeToday(checkInDate)
      });
      return res.status(400).json({
        error: true,
        message: 'La fecha de check-in no puede ser anterior a hoy'
      });
    }

    console.log('✅ [CREATE-BOOKING] Date validations passed');

    // ⭐ VERIFICAR QUE EL HUÉSPED EXISTE CON LOGS
    console.log('👤 [CREATE-BOOKING] Looking for guest with ID:', guestId);
    const guest = await Buyer.findByPk(guestId);
    
    if (!guest) {
      console.log('❌ [CREATE-BOOKING] Guest not found with ID:', guestId);
      return res.status(404).json({
        error: true,
        message: `Huésped no encontrado con ID: ${guestId}`
      });
    }
    
    console.log('✅ [CREATE-BOOKING] Guest found:', {
      sdocno: guest.sdocno,
      name: guest.scostumername
    });

    // ⭐ VERIFICAR QUE LA HABITACIÓN EXISTE CON LOGS DETALLADOS
    console.log('🏨 [CREATE-BOOKING] Looking for room:', roomNumber);
    
    const room = await Room.findByPk(roomNumber, {
      include: [
        {
          model: BasicInventory,
          as: 'BasicInventories',
          attributes: ['id', 'name', 'inventoryType', 'currentStock', 'cleanStock', 'minStock'],
          through: { 
            attributes: ['quantity', 'isRequired'],
            as: 'RoomBasics'
          }
        },
        {
          model: Booking,
          as: 'bookings',
          attributes: ['bookingId', 'checkIn', 'checkOut', 'status'],
          required: false
        }
      ]
    });

    if (!room) {
      console.log('❌ [CREATE-BOOKING] Room not found:', roomNumber);
      return res.status(404).json({
        error: true,
        message: `Habitación no encontrada: ${roomNumber}`
      });
    }

    console.log('✅ [CREATE-BOOKING] Room found:', {
      roomNumber: room.roomNumber,
      type: room.type,
      status: room.status,
      isActive: room.isActive,
      available: room.available,
      maxGuests: room.maxGuests,
      existingBookings: room.bookings ? room.bookings.length : 0
    });

    // ⭐ VERIFICAR QUE LA HABITACIÓN ESTÉ ACTIVA
    if (!room.isActive) {
      console.log('❌ [CREATE-BOOKING] Room is not active:', roomNumber);
      return res.status(400).json({
        error: true,
        message: `La habitación ${roomNumber} no está activa`
      });
    }

    console.log('✅ [CREATE-BOOKING] Room is active');

    // ⭐ VERIFICAR DISPONIBILIDAD DE FECHAS CON LOGS DETALLADOS
    console.log('📅 [CREATE-BOOKING] Checking date conflicts...');
    
    const activeBookings = (room.bookings || []).filter(
      booking => booking.status !== 'cancelled'
    );

    console.log('📅 [CREATE-BOOKING] Active bookings for room:', activeBookings.map(b => ({
      bookingId: b.bookingId,
      checkIn: formatColombiaDate(b.checkIn), // ⭐ FORMATO COLOMBIA
      checkOut: formatColombiaDate(b.checkOut), // ⭐ FORMATO COLOMBIA
      status: b.status
    })));

    const hasDateConflict = activeBookings.some(booking => {
      const bookingStart = new Date(booking.checkIn);
      const bookingEnd = new Date(booking.checkOut);
      
      const conflict = (
        (bookingStart <= checkOutDate && bookingEnd >= checkInDate) ||
        (checkInDate <= bookingEnd && checkOutDate >= bookingStart)
      );
      
      if (conflict) {
        console.log('⚠️ [CREATE-BOOKING] Date conflict detected with booking:', {
          conflictingBookingId: booking.bookingId,
          existingCheckIn: formatColombiaDate(bookingStart), // ⭐ FORMATO COLOMBIA
          existingCheckOut: formatColombiaDate(bookingEnd), // ⭐ FORMATO COLOMBIA
          requestedCheckIn: formatColombiaDate(checkInDate), // ⭐ FORMATO COLOMBIA
          requestedCheckOut: formatColombiaDate(checkOutDate) // ⭐ FORMATO COLOMBIA
        });
      }
      
      return conflict;
    });

    if (hasDateConflict) {
      console.log('❌ [CREATE-BOOKING] Date conflict found');
      return res.status(400).json({
        error: true,
        message: 'La habitación no está disponible en las fechas seleccionadas',
        data: {
          conflictingBookings: activeBookings.map(b => ({
            bookingId: b.bookingId,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            status: b.status
          }))
        }
      });
    }

    console.log('✅ [CREATE-BOOKING] No date conflicts found');

    // ⭐ VERIFICAR CAPACIDAD DE LA HABITACIÓN
    console.log('👥 [CREATE-BOOKING] Checking room capacity...');
    console.log('👥 [CREATE-BOOKING] Guest count:', guestCount, 'Max guests:', room.maxGuests);
    
    if (guestCount > room.maxGuests) {
      console.log('❌ [CREATE-BOOKING] Exceeds room capacity');
      return res.status(400).json({
        error: true,
        message: `La habitación tiene capacidad máxima de ${room.maxGuests} huéspedes, solicitados: ${guestCount}`
      });
    }

    console.log('✅ [CREATE-BOOKING] Room capacity validation passed');

    // ⭐ CALCULAR PRECIO TOTAL CON LOGS DETALLADOS
    console.log('💰 [CREATE-BOOKING] Calculating price...');
    
    let finalTotalPrice = totalAmount || totalPrice;
    
    if (!finalTotalPrice) {
      console.log('💰 [CREATE-BOOKING] No price provided, calculating...');
      
      // ⭐ USAR UTILIDAD PARA CALCULAR NOCHES
      const nights = getDaysDifference(checkInDate, checkOutDate);
      console.log('💰 [CREATE-BOOKING] Nights calculated:', nights);
      
      // Usar precio según cantidad de huéspedes
      let pricePerNight;
      
      if (guestCount === 1) {
        pricePerNight = room.priceSingle || room.priceDouble;
        console.log('💰 [CREATE-BOOKING] Using single price:', pricePerNight);
      } else if (guestCount === 2) {
        pricePerNight = room.priceDouble;
        console.log('💰 [CREATE-BOOKING] Using double price:', pricePerNight);
      } else {
        pricePerNight = room.priceMultiple;
        console.log('💰 [CREATE-BOOKING] Using multiple price:', pricePerNight);
        
        // Agregar costo por huéspedes extra
        if (guestCount > 3 && room.pricePerExtraGuest) {
          const extraCost = (guestCount - 3) * room.pricePerExtraGuest;
          pricePerNight += extraCost;
          console.log('💰 [CREATE-BOOKING] Added extra guest cost:', extraCost, 'New price per night:', pricePerNight);
        }
      }

      // Aplicar precio promocional si existe
      if (room.isPromo && room.promotionPrice) {
        pricePerNight = room.promotionPrice;
        console.log('💰 [CREATE-BOOKING] Applied promotional price:', pricePerNight);
      }

      finalTotalPrice = pricePerNight * nights;
      console.log('💰 [CREATE-BOOKING] Final calculated price:', finalTotalPrice);
    } else {
      console.log('💰 [CREATE-BOOKING] Using provided price:', finalTotalPrice);
    }

    // ⭐ PREPARAR DATOS PARA CREAR LA RESERVA CON LOGS
    console.log('📝 [CREATE-BOOKING] Preparing booking data...');
    
    const bookingData = {
      guestId,
      roomNumber,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guestCount,
      totalAmount: finalTotalPrice,
      status,
      notes: notes || '',
      pointOfSale: pointOfSale, // ⭐ USAR EL POINT OF SALE ENVIADO
      
      createdBy: req.user?.n_document || null
    };

    console.log('📝 [CREATE-BOOKING] Booking data to create:', JSON.stringify(bookingData, null, 2));

    // ⭐ CREAR LA RESERVA CON TRY-CATCH ESPECÍFICO
    console.log('💾 [CREATE-BOOKING] Creating booking in database...');
    if (pointOfSale === 'Local') {
      if (req.user?.n_document) {
        console.log('✅ [CREATE-BOOKING] Reserva LOCAL creada por empleado:', req.user.n_document, req.user.role);
      } else {
        console.log('⚠️ [CREATE-BOOKING] Reserva LOCAL pero SIN empleado logueado - esto podría ser un problema');
      }
    } else {
      console.log('🌐 [CREATE-BOOKING] Reserva ONLINE - puede no tener empleado asociado');
    }

    let newBooking;
    try {
      newBooking = await Booking.create(bookingData);
      console.log('✅ [CREATE-BOOKING] Booking created successfully:', {
        bookingId: newBooking.bookingId,
        id: newBooking.id,
        createdAt: formatForLogs(newBooking.createdAt) // ⭐ FORMATO COLOMBIA
      });
    } catch (createError) {
      console.error('❌ [CREATE-BOOKING] Error creating booking at:', formatForDetailedLogs(new Date())); // ⭐ CON SEGUNDOS PARA DEBUG
      console.error('❌ [CREATE-BOOKING] Error details:', {
        name: createError.name,
        message: createError.message,
        sql: createError.sql,
        parameters: createError.parameters
      });
      
      return res.status(500).json({
        error: true,
        message: 'Error al crear la reserva en la base de datos',
        details: createError.message
      });
    }

    // ⭐ ACTUALIZAR ESTADO DE LA HABITACIÓN CON LOGS
    console.log('🏨 [CREATE-BOOKING] Updating room status...');
    
    const roomUpdateData = {
      status: status === 'confirmed' ? 'Reservada' : 'Ocupada',
      available: false
    };

    console.log('🏨 [CREATE-BOOKING] Room update data:', roomUpdateData);

    try {
      await room.update(roomUpdateData);
      console.log('✅ [CREATE-BOOKING] Room status updated successfully');
    } catch (updateError) {
      console.error('❌ [CREATE-BOOKING] Error updating room status:', updateError);
      // No fallar la reserva por esto, solo log
    }

    // ⭐ OBTENER INFORMACIÓN COMPLETA DE LA RESERVA CREADA CON LOGS
    console.log('🔍 [CREATE-BOOKING] Fetching complete booking data...');
    
    let bookingWithDetails;
    try {
      bookingWithDetails = await Booking.findByPk(newBooking.bookingId, {
        include: [
          {
            model: Room,
            attributes: ['roomNumber', 'type', 'status', 'maxGuests']
          },
          {
            model: Buyer,
            as: "guest",
            attributes: ['sdocno', 'scostumername', 'selectronicmail']
          }
        ]
      });
      
      console.log('✅ [CREATE-BOOKING] Complete booking data fetched:', {
        bookingId: bookingWithDetails?.bookingId,
        hasRoom: !!bookingWithDetails?.Room,
        hasGuest: !!bookingWithDetails?.guest
      });
      
    } catch (fetchError) {
      console.error('❌ [CREATE-BOOKING] Error fetching complete booking:', fetchError);
      // Usar la reserva básica si falla
      bookingWithDetails = newBooking;
    }

    // ⭐ PREPARAR RESPUESTA FINAL CON LOGS
    console.log('📤 [CREATE-BOOKING] Preparing final response...');
    
    const response = {
      error: false,
      message: 'Reserva creada exitosamente',
      success: true,
      data: {
        booking: bookingWithDetails,
        calculatedPrice: finalTotalPrice,
        nights: getDaysDifference(checkInDate, checkOutDate),
        roomStatusUpdated: true,
        // ⭐ INFO ADICIONAL
        pointOfSale: pointOfSale,
        createdBy: bookingData.createdBy,
        isLocalBooking: pointOfSale === 'Local'
      }
    };

    console.log('✅ [CREATE-BOOKING] Final response prepared:', {
      success: response.success,
      bookingId: response.data.booking?.bookingId,
      calculatedPrice: response.data.calculatedPrice,
      pointOfSale: response.data.pointOfSale,
      createdBy: response.data.createdBy,
      completedAt: formatForLogs(new Date())
    });

    res.status(201).json(response);

  } catch (error) {
    console.error('❌ [CREATE-BOOKING] Unexpected error at:', formatForDetailedLogs(new Date()));
    console.error('❌ [CREATE-BOOKING] Error details:', error);
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

// ...existing code...

const getBookingById = async (req, res) => {
  try {
    console.log("🔍 [GET-BOOKING-BY-ID] Iniciando búsqueda de reserva:", req.params.bookingId);
    console.log("🕐 Hora de consulta:", formatForLogs(getColombiaTime()));
    
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        error: true,
        message: 'bookingId es requerido'
      });
    }

    const booking = await Booking.findOne({
      where: { bookingId },
      include: [
        { 
          model: Room,
          as: 'room', // ⭐ AGREGAR EL ALIAS CORRECTO
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
        { 
          model: ExtraCharge,
          as: 'extraCharges', // ⭐ AGREGAR ALIAS SI EXISTE
          required: false
        },
        { 
          model: Bill,
          as: 'bill', // ⭐ AGREGAR ALIAS SI EXISTE
          required: false
        },
        { 
          model: Buyer, 
          as: "guest", 
          attributes: ["sdocno", "scostumername", "selectronicmail"]
        },
        { 
          model: Payment,
          as: 'payments', // ⭐ AGREGAR ALIAS SI EXISTE
          attributes: [
            'paymentId', 
            'amount', 
            'paymentMethod', 
            'paymentStatus', 
            'paymentDate', 
            'paymentType', 
            'transactionId',
            'paymentReference'
          ],
          required: false
        },
        { 
          model: RegistrationPass, 
          as: "registrationPasses",
          required: false
        },
        // ⭐ INCLUIR INVENTARIO ASIGNADO A ESTA RESERVA
        {
          model: BookingInventoryUsage,
          as: 'inventoryUsages',
          include: [
            {
              model: BasicInventory,
              as: 'inventory',
              attributes: ['id', 'name', 'inventoryType', 'category']
            }
          ],
          required: false
        }
      ],
    });

    if (!booking) {
      console.log("❌ [GET-BOOKING-BY-ID] Reserva no encontrada:", bookingId);
      return res.status(404).json({
        error: true,
        message: 'Reserva no encontrada'
      });
    }

    console.log("✅ [GET-BOOKING-BY-ID] Reserva encontrada:", {
      bookingId: booking.bookingId,
      status: booking.status,
      roomNumber: booking.room?.roomNumber || booking.roomNumber,
      hasRoom: !!booking.room,
      hasGuest: !!booking.guest,
      hasPayments: booking.payments?.length > 0,
      hasExtraCharges: booking.extraCharges?.length > 0,
      hasBill: !!booking.bill,
      hasRegistrationPasses: booking.registrationPasses?.length > 0,
      hasInventoryUsages: booking.inventoryUsages?.length > 0
    });

    // ⭐ PROCESAR INFORMACIÓN DE INVENTARIO
    const bookingData = booking.toJSON();
    
    // ⭐ CALCULAR ESTADO DEL INVENTARIO
    const inventoryStatus = {
      hasInventoryAssigned: bookingData.inventoryUsages && bookingData.inventoryUsages.length > 0,
      totalItemsAssigned: bookingData.inventoryUsages ? bookingData.inventoryUsages.length : 0,
      itemsReturned: bookingData.inventoryUsages ? bookingData.inventoryUsages.filter(u => u.status === 'returned').length : 0,
      itemsConsumed: bookingData.inventoryUsages ? bookingData.inventoryUsages.filter(u => u.status === 'consumed').length : 0,
      itemsPending: bookingData.inventoryUsages ? bookingData.inventoryUsages.filter(u => u.status === 'assigned' || u.status === 'in_use').length : 0,
      canProceedCheckOut: bookingData.status === 'checked-in' && 
                         bookingData.inventoryUsages && 
                         bookingData.inventoryUsages.length > 0 &&
                         bookingData.inventoryUsages.every(u => u.status === 'returned' || u.status === 'consumed')
    };

    // ⭐ CALCULAR INFORMACIÓN DE PAGOS
    let paymentInfo = {
      totalPaid: 0,
      totalAmount: parseFloat(bookingData.totalAmount || 0),
      balance: parseFloat(bookingData.totalAmount || 0),
      paymentStatus: 'unpaid',
      paymentCount: 0,
      lastPayment: null
    };

    if (bookingData.payments && bookingData.payments.length > 0) {
      const totalPaid = bookingData.payments
        .filter(p => p.paymentStatus === 'completed')
        .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
      
      const totalAmount = parseFloat(bookingData.totalAmount || 0);
      
      paymentInfo = {
        totalPaid,
        totalAmount,
        balance: totalAmount - totalPaid,
        paymentStatus: totalPaid >= totalAmount ? 'fully_paid' : 
                      totalPaid > 0 ? 'partially_paid' : 'unpaid',
        paymentCount: bookingData.payments.length,
        lastPayment: bookingData.payments.find(p => p.paymentStatus === 'completed'),
        allPayments: bookingData.payments
      };
    }

    // ⭐ CALCULAR INFORMACIÓN DE CARGOS EXTRAS
    const extraChargesInfo = {
      hasExtraCharges: bookingData.extraCharges && bookingData.extraCharges.length > 0,
      totalExtraCharges: bookingData.extraCharges ? 
        bookingData.extraCharges.reduce((sum, charge) => sum + parseFloat(charge.amount || charge.price || 0), 0) : 0,
      extraChargesCount: bookingData.extraCharges ? bookingData.extraCharges.length : 0
    };

    // ⭐ INFORMACIÓN AGREGADA DE LA HABITACIÓN
    const roomInfo = bookingData.room ? {
      roomNumber: bookingData.room.roomNumber,
      type: bookingData.room.type,
      status: bookingData.room.status,
      hasBasicInventory: bookingData.room.BasicInventories && bookingData.room.BasicInventories.length > 0,
      basicInventoryCount: bookingData.room.BasicInventories ? bookingData.room.BasicInventories.length : 0
    } : null;

    // ⭐ RESPUESTA ENRIQUECIDA
    const responseData = {
      ...bookingData,
      // ⭐ INFORMACIÓN CALCULADA
      inventoryStatus,
      paymentInfo,
      extraChargesInfo,
      roomInfo,
      
      // ⭐ FECHAS FORMATEADAS
      checkInFormatted: formatForLogs(bookingData.checkIn),
      checkOutFormatted: formatForLogs(bookingData.checkOut),
      createdAtFormatted: formatForLogs(bookingData.createdAt),
      
      // ⭐ MONTOS FORMATEADOS
      totalAmountFormatted: `$${parseFloat(bookingData.totalAmount || 0).toLocaleString()}`,
      
      // ⭐ ESTADO GENERAL
      isReadyForCheckOut: bookingData.status === 'checked-in' && inventoryStatus.canProceedCheckOut,
      canGenerateBill: ['checked-in', 'completed'].includes(bookingData.status),
      
      // ⭐ NOCHES CALCULADAS
      nights: calculateNights(bookingData.checkIn, bookingData.checkOut)
    };

    console.log("📤 [GET-BOOKING-BY-ID] Respuesta preparada:", {
      bookingId: responseData.bookingId,
      hasInventoryStatus: !!responseData.inventoryStatus,
      hasPaymentInfo: !!responseData.paymentInfo,
      isReadyForCheckOut: responseData.isReadyForCheckOut,
      canGenerateBill: responseData.canGenerateBill
    });

    res.json({
      error: false,
      message: 'Reserva obtenida exitosamente',
      data: responseData,
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ [GET-BOOKING-BY-ID] Error:", error);
    console.error("🕐 Hora del error:", formatForLogs(getColombiaTime()));
    
    res.status(500).json({
      error: true,
      message: 'Error al obtener la reserva',
      details: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// ...existing code...

// Staff only endpoints
const getAllBookings = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      roomNumber, 
      guestId,
      includeInventory = false,
      fromDate,
      toDate
    } = req.query;

    console.log("🔍 [GET-ALL-BOOKINGS] Parámetros:", {
      page, limit, status, roomNumber, guestId, 
      includeInventory, fromDate, toDate
    });

    const where = {};
    if (status) where.status = status;
    if (roomNumber) where.roomNumber = roomNumber;
    if (guestId) where.guestId = guestId;

    // ⭐ FILTRO POR FECHAS DE CHECK-IN
    if (fromDate || toDate) {
      where.checkIn = {};
      if (fromDate) where.checkIn[Op.gte] = new Date(fromDate);
      if (toDate) where.checkIn[Op.lte] = new Date(toDate + 'T23:59:59.999Z');
    }

    const includeOptions = [
      { 
        model: Room,
        as: 'room',
        attributes: ['roomNumber', 'type', 'status'],
        // ⭐ INCLUIR INVENTARIO BÁSICO DE LA HABITACIÓN
        include: [
          {
            model: BasicInventory,
            as: 'BasicInventories',
            attributes: ['id', 'name', 'description', 'currentStock'],
            through: {
              attributes: ['quantity'],
              as: 'RoomBasics'
            }
          }
        ]
      },
      { 
        model: Buyer, 
        as: "guest", 
        attributes: ["sdocno", "scostumername", "selectronicmail", "stelephone"]
      },
      // 🔧 INCLUIR PAGOS - CORREGIDO SIN 'notes'
      {
        model: Payment,
        as: 'payments',
        attributes: [
          'paymentId', 
          'amount', 
          'paymentMethod', 
          'paymentStatus', 
          'paymentDate', 
          'paymentType', 
          'transactionId',
          'paymentReference',
          'processedBy' // ✅ USAR CAMPO QUE SÍ EXISTE
        ],
        where: {
          paymentStatus: ['completed', 'pending']
        },
        required: false
      },
      {
        model: ExtraCharge,
        as: 'extraCharges',
        attributes: [
          'id',
          'description',
          'amount',
          'quantity',
          'chargeType',
          'chargeDate',
          'notes'
        ],
        required: false
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
        ],
        required: false
      });
    }

    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: includeOptions,
      order: [
        ['createdAt', 'DESC'],
        [{ model: Payment, as: 'payments' }, 'paymentDate', 'DESC'],
        [{ model: ExtraCharge, as: 'extraCharges' }, 'chargeDate', 'DESC']
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true
    });

    // 🔧 FUNCIÓN HELPER PARA PROCESAR DATOS FINANCIEROS
    const processBookingFinancials = (bookingData) => {
      // Obtener datos base
      const totalReserva = parseFloat(bookingData.totalAmount || 0);
      const extraCharges = bookingData.extraCharges || [];
      const payments = bookingData.payments || [];
      
      // Calcular total de extras
      const totalExtras = extraCharges.reduce((sum, charge) => {
        const amount = parseFloat(charge.amount || 0);
        const quantity = parseInt(charge.quantity || 1);
        return sum + (amount * quantity);
      }, 0);
      
      // Calcular total pagado (solo pagos completados)
      const totalPagado = payments
        .filter(payment => payment.paymentStatus === 'completed')
        .reduce((sum, payment) => {
          const amount = parseFloat(payment.amount || 0);
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
      
      // Calcular pagos pendientes
      const totalPendingPayments = payments
        .filter(payment => payment.paymentStatus === 'pending')
        .reduce((sum, payment) => {
          const amount = parseFloat(payment.amount || 0);
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
      
      // Totales finales
      const totalFinal = totalReserva + totalExtras;
      const totalPendiente = Math.max(0, totalFinal - totalPagado);
      
      // Estado del pago
      let paymentStatus = 'unpaid';
      if (totalPagado >= totalFinal) {
        paymentStatus = 'fully_paid';
      } else if (totalPagado > 0) {
        paymentStatus = 'partially_paid';
      }

      return {
        totalReserva,
        totalExtras,
        totalPagado,
        totalPendingPayments,
        totalFinal,
        totalPendiente,
        paymentStatus,
        isFullyPaid: totalPendiente === 0,
        hasExtras: totalExtras > 0,
        extraChargesCount: extraCharges.length,
        paymentsCount: payments.filter(p => p.paymentStatus === 'completed').length,
        pendingPaymentsCount: payments.filter(p => p.paymentStatus === 'pending').length,
        // ⭐ CAMPOS FORMATEADOS PARA EL FRONTEND
        totalReservaFormatted: `$${totalReserva.toLocaleString()}`,
        totalExtrasFormatted: `$${totalExtras.toLocaleString()}`,
        totalPagadoFormatted: `$${totalPagado.toLocaleString()}`,
        totalFinalFormatted: `$${totalFinal.toLocaleString()}`,
        totalPendienteFormatted: `$${totalPendiente.toLocaleString()}`,
        // ⭐ PORCENTAJE DE PAGO
        paymentPercentage: totalFinal > 0 ? Math.round((totalPagado / totalFinal) * 100) : 0
      };
    };

    // ⭐ PROCESAR DATOS CON INFORMACIÓN FINANCIERA MEJORADA
    const bookingsWithAllInfo = rows.map(booking => {
      const bookingData = booking.toJSON();
      
      // 🔧 AGREGAR CÁLCULOS FINANCIEROS MEJORADOS
      const financialSummary = processBookingFinancials(bookingData);
      
      // ⭐ MANTENER LA ESTRUCTURA ORIGINAL DE paymentInfo PARA COMPATIBILIDAD
      bookingData.paymentInfo = {
        totalPaid: financialSummary.totalPagado,
        totalAmount: financialSummary.totalReserva,
        balance: financialSummary.totalPendiente,
        paymentStatus: financialSummary.paymentStatus,
        paymentCount: financialSummary.paymentsCount,
        lastPayment: bookingData.payments && bookingData.payments.length > 0 
          ? bookingData.payments[0] 
          : null
      };

      // 🔧 AGREGAR NUEVA ESTRUCTURA FINANCIERA COMPLETA
      bookingData.financialSummary = financialSummary;

      // ⭐ INFORMACIÓN DE ESTADO DE LA RESERVA MEJORADA
      bookingData.bookingStatus = {
        canCheckIn: booking.status === 'confirmed' && financialSummary.totalPagado >= (financialSummary.totalReserva * 0.5), // Al menos 50% pagado
        canCheckOut: booking.status === 'checked-in' && financialSummary.isFullyPaid,
        requiresPayment: financialSummary.totalPendiente > 0,
        readyForCheckOut: booking.status === 'checked-in' && financialSummary.isFullyPaid,
        isOverdue: booking.status === 'checked-in' && new Date() > new Date(booking.checkOut),
        daysSinceCheckIn: booking.status === 'checked-in' 
          ? Math.floor((new Date() - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))
          : 0
      };
      
      // ⭐ INFORMACIÓN DE INVENTARIO SI SE SOLICITA
      if (includeInventory === 'true' && bookingData.inventoryUsages) {
        bookingData.inventoryStatus = {
          hasInventoryAssigned: bookingData.inventoryUsages.length > 0,
          totalItems: bookingData.inventoryUsages.length,
          itemsReturned: bookingData.inventoryUsages.filter(u => u.status === 'returned').length,
          itemsConsumed: bookingData.inventoryUsages.filter(u => u.status === 'consumed').length,
          readyForCheckOut: booking.status === 'checked-in' && bookingData.inventoryUsages.length > 0
        };
      }

      // ⭐ AGREGAR METADATOS ÚTILES
      bookingData.metadata = {
        lastUpdated: bookingData.updatedAt,
        lastPaymentDate: financialSummary.paymentsCount > 0 
          ? bookingData.payments[0]?.paymentDate 
          : null,
        lastExtraChargeDate: financialSummary.extraChargesCount > 0 
          ? bookingData.extraCharges[0]?.chargeDate 
          : null,
        processingFlags: {
          needsAttention: financialSummary.totalPendiente > 0 && booking.status === 'checked-in',
          hasUnprocessedExtras: financialSummary.hasExtras && financialSummary.totalPendiente > 0,
          readyForBilling: booking.status === 'checked-in' && financialSummary.isFullyPaid
        }
      };
      
      return bookingData;
    });

    // 🔧 CALCULAR ESTADÍSTICAS GLOBALES
    const statistics = {
      totalBookings: count,
      bookingsByStatus: {
        confirmed: bookingsWithAllInfo.filter(b => b.status === 'confirmed').length,
        checkedIn: bookingsWithAllInfo.filter(b => b.status === 'checked-in').length,
        completed: bookingsWithAllInfo.filter(b => b.status === 'completed').length,
        cancelled: bookingsWithAllInfo.filter(b => b.status === 'cancelled').length
      },
      financialStats: {
        totalRevenue: bookingsWithAllInfo
          .reduce((sum, b) => sum + b.financialSummary.totalPagado, 0),
        totalPendingAmount: bookingsWithAllInfo
          .reduce((sum, b) => sum + b.financialSummary.totalPendiente, 0),
        totalExtraCharges: bookingsWithAllInfo
          .reduce((sum, b) => sum + b.financialSummary.totalExtras, 0),
        fullyPaidBookings: bookingsWithAllInfo.filter(b => b.financialSummary.isFullyPaid).length,
        partiallyPaidBookings: bookingsWithAllInfo.filter(b => b.financialSummary.paymentStatus === 'partially_paid').length,
        unpaidBookings: bookingsWithAllInfo.filter(b => b.financialSummary.paymentStatus === 'unpaid').length
      },
      operationalStats: {
        bookingsNeedingAttention: bookingsWithAllInfo.filter(b => b.metadata.processingFlags.needsAttention).length,
        readyForCheckOut: bookingsWithAllInfo.filter(b => b.bookingStatus.readyForCheckOut).length,
        overdueCheckOuts: bookingsWithAllInfo.filter(b => b.bookingStatus.isOverdue).length
      }
    };

    console.log("📊 [GET-ALL-BOOKINGS] Estadísticas:", {
      total: statistics.totalBookings,
      byStatus: statistics.bookingsByStatus,
      revenue: `$${statistics.financialStats.totalRevenue.toLocaleString()}`,
      pending: `$${statistics.financialStats.totalPendingAmount.toLocaleString()}`
    });

    res.json({
      error: false,
      message: `${count} reserva(s) obtenida(s) exitosamente`,
      data: {
        bookings: bookingsWithAllInfo,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        },
        statistics,
        queryInfo: {
          filters: { status, roomNumber, guestId, fromDate, toDate },
          includeInventory: includeInventory === 'true',
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ [GET-ALL-BOOKINGS] Error:', error);
    next(error);
  }
};

const checkInGuest = async (req, res, next) => {
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



const addExtraCharge = async (req, res) => {
  try {
    console.log("📤 [ADD-EXTRA-CHARGE] Recibiendo datos completos:");
    console.log("🔍 [ADD-EXTRA-CHARGE] req.params:", req.params);
    console.log("🔍 [ADD-EXTRA-CHARGE] req.body:", JSON.stringify(req.body, null, 2));
    console.log("🕐 [ADD-EXTRA-CHARGE] Hora de procesamiento:", formatForLogs(getColombiaTime()));

    const { bookingId } = req.params;
    const { extraCharge } = req.body;

    console.log("📋 [ADD-EXTRA-CHARGE] Datos extraídos:", {
      bookingId: bookingId,
      extraCharge: extraCharge
    });

    // Validaciones
    if (!bookingId) {
      console.error("❌ [ADD-EXTRA-CHARGE] bookingId faltante en params");
      return res.status(400).json({ 
        error: true, 
        message: "bookingId es requerido en la URL" 
      });
    }

    if (!extraCharge) {
      console.error("❌ [ADD-EXTRA-CHARGE] extraCharge faltante en body");
      return res.status(400).json({ 
        error: true, 
        message: "extraCharge es requerido en el body" 
      });
    }

    if (!extraCharge.description || extraCharge.description.trim() === '') {
      console.error("❌ [ADD-EXTRA-CHARGE] description faltante o vacía:", extraCharge.description);
      return res.status(400).json({ 
        error: true, 
        message: "description es requerida y no puede estar vacía" 
      });
    }

    // 🔧 CORRECCIÓN: Usar 'amount' en lugar de 'price'
    if (!extraCharge.amount || isNaN(parseFloat(extraCharge.amount))) {
      console.error("❌ [ADD-EXTRA-CHARGE] amount inválido:", extraCharge.amount);
      return res.status(400).json({ 
        error: true, 
        message: "amount es requerido y debe ser un número válido" 
      });
    }

    console.log("✅ [ADD-EXTRA-CHARGE] Validaciones básicas pasadas");

    // Verificar que la reserva existe
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      console.error("❌ [ADD-EXTRA-CHARGE] Reserva no encontrada:", bookingId);
      return res.status(404).json({ 
        error: true, 
        message: "Reserva no encontrada" 
      });
    }

    console.log("✅ [ADD-EXTRA-CHARGE] Reserva encontrada:", {
      bookingId: booking.bookingId,
      status: booking.status,
      roomNumber: booking.roomNumber
    });

    // 🔧 CORRECCIÓN: Usar extraCharge.amount en lugar de extraCharge.price
    const chargeData = {
      bookingId: parseInt(bookingId),
      description: extraCharge.description.trim(),
      amount: parseFloat(extraCharge.amount), // ✅ CORREGIDO: usar 'amount'
      quantity: parseInt(extraCharge.quantity) || 1,
      chargeType: extraCharge.chargeType || 'service',
      chargeDate: getColombiaTime(),
      chargedBy: req.user?.n_document || 'system',
      notes: extraCharge.notes || null,
      basicId: extraCharge.basicId || null, // 🔧 AÑADIR basicId si viene
      isApproved: true,
      approvedAt: getColombiaTime(),
      approvedBy: req.user?.n_document || 'system'
    };

    console.log("📝 [ADD-EXTRA-CHARGE] Datos para crear cargo:", JSON.stringify(chargeData, null, 2));

    // Crear con try-catch específico
    let newExtraCharge;
    try {
      newExtraCharge = await ExtraCharge.create(chargeData);
      console.log("✅ [ADD-EXTRA-CHARGE] Cargo creado exitosamente:", {
        id: newExtraCharge.id,
        description: newExtraCharge.description,
        amount: newExtraCharge.amount,
        totalAmount: newExtraCharge.totalAmount // 🔧 MOSTRAR TOTAL CALCULADO
      });
    } catch (createError) {
      console.error("❌ [ADD-EXTRA-CHARGE] Error específico al crear:", createError);
      console.error("❌ [ADD-EXTRA-CHARGE] Error details:", {
        name: createError.name,
        message: createError.message,
        errors: createError.errors
      });
      
      return res.status(500).json({
        error: true,
        message: "Error al crear el cargo extra en la base de datos",
        details: createError.message,
        validationErrors: createError.errors
      });
    }

    // 🔧 FORMATEAR RESPUESTA CONSISTENTE
    const responseData = {
      ...newExtraCharge.toJSON(),
      // ✅ MANTENER COMPATIBILIDAD: incluir tanto 'amount' como 'price'
      price: newExtraCharge.amount, // Para compatibilidad con frontend antiguo
      // Formatear fechas
      chargeDate: formatForLogs(newExtraCharge.chargeDate),
      createdAt: formatForLogs(newExtraCharge.createdAt)
    };

    console.log("📤 [ADD-EXTRA-CHARGE] Respuesta preparada:", {
      id: responseData.id,
      description: responseData.description,
      amount: responseData.amount, // ✅ VALOR CORRECTO
      price: responseData.price,   // ✅ COMPATIBILIDAD
      totalAmount: responseData.totalAmount
    });

    res.status(201).json({
      error: false,
      message: "Cargo extra agregado exitosamente",
      data: responseData,
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ [ADD-EXTRA-CHARGE] Error general:", error);
    console.error("🕐 [ADD-EXTRA-CHARGE] Hora del error:", formatForLogs(getColombiaTime()));
    
    res.status(500).json({
      error: true,
      message: "Error interno del servidor",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
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




// ...existing code...

const generateBill = async (req, res, next) => {
  try {
    console.log("🧾 Iniciando generación de factura");
    console.log("🕐 Hora de procesamiento:", formatForLogs(getColombiaTime()));
    
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({ error: true, message: "bookingId es requerido" });
    }

    // ⭐ VERIFICAR SI YA EXISTE UNA FACTURA PARA ESTA RESERVA
    const existingBill = await Bill.findOne({
      where: { bookingId: bookingId }
    });

    if (existingBill) {
      console.log("⚠️ Ya existe una factura para esta reserva:", existingBill.idBill);
      return res.status(200).json({
        error: false,
        message: "Factura ya existe para esta reserva",
        data: existingBill,
        timestamp: formatForLogs(getColombiaTime())
      });
    }

    // ⭐ OBTENER DATOS DE LA RESERVA
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { 
          model: Room, 
          as: 'room'
        },
        {
          model: Buyer,
          as: 'guest',
          attributes: ["scostumername", "selectronicmail", "sdocno"]
        },
        {
          model: Payment,
          as: 'payments',
          where: { paymentStatus: 'completed' },
          required: false
        },
        {
          model: ExtraCharge,
          as: 'extraCharges',
          required: false
        }
      ],
    });

    if (!booking) {
      return res.status(404).json({ 
        error: true, 
        message: "Reserva no encontrada" 
      });
    }

    console.log("📋 Reserva encontrada:", {
      bookingId: booking.bookingId,
      roomNumber: booking.room?.roomNumber || booking.roomNumber,
      guestName: booking.guest?.scostumername,
      status: booking.status
    });

    // ⭐ VERIFICAR QUE LA RESERVA ESTÉ EN ESTADO ADECUADO
    if (!['checked-in', 'completed'].includes(booking.status)) {
      return res.status(400).json({ 
        error: true, 
        message: "La reserva debe estar en estado 'checked-in' o 'completed' para generar factura" 
      });
    }

    // ⭐ CALCULAR TOTALES CORRECTAMENTE
    const baseAmount = parseFloat(booking.totalAmount) || 0;
    const extraCharges = booking.extraCharges || [];
    
    // ⭐ USAR 'amount' EN LUGAR DE 'price' SEGÚN TU MODELO ExtraCharge
    const totalExtras = extraCharges.reduce((sum, charge) => {
      const chargeAmount = parseFloat(charge.amount || charge.price || 0);
      console.log(`💰 Cargo extra: ${charge.description} = ${chargeAmount}`);
      return sum + chargeAmount;
    }, 0);
    
    const totalAmount = baseAmount + totalExtras;

    console.log("💰 Cálculo de totales:", {
      baseAmount,
      totalExtras,
      totalAmount,
      extraChargesCount: extraCharges.length
    });

    // ⭐ CREAR LA FACTURA SOLO CON CAMPOS QUE EXISTEN EN TU MODELO
    const billData = {
  bookingId: booking.bookingId,
  reservationAmount: baseAmount,
  extraChargesAmount: totalExtras,
  taxAmount: 0,
  totalAmount: totalAmount,
  taxInvoiceId: null,
  status: 'paid', // 🔧 LA FACTURA SE CREA COMO PAGADA
  paymentMethod: 'cash', // 🔧 O EL MÉTODO QUE CORRESPONDA
  taxxaStatus: 'not_sent', // 🔧 NUEVO CAMPO: Lista para enviar a Taxxa
  sentToTaxxaAt: null,
  taxxaResponse: null,
  cufe: null
};

    console.log("📝 [GENERATE-BILL] Datos de factura a crear:");
    console.log(JSON.stringify(billData, null, 2));

    // ⭐ VALIDAR DATOS ANTES DE CREAR
    if (totalAmount < 0) {
      return res.status(400).json({
        error: true,
        message: "El monto total de la factura no puede ser negativo",
        data: { totalAmount }
      });
    }

    // ⭐ CREAR REGISTRO EN LA BASE DE DATOS
    let savedBill = null;
    try {
      savedBill = await Bill.create(billData);
      console.log("💾 Factura guardada en BD:", savedBill.idBill);
    } catch (billError) {
      console.error("❌ Error al guardar factura:", billError.message);
      console.error("❌ Detalles del error:", {
        name: billError.name,
        message: billError.message,
        errors: billError.errors,
        sql: billError.sql
      });
      
      return res.status(500).json({
        error: true,
        message: "Error al crear la factura en la base de datos",
        details: billError.message,
        validationErrors: billError.errors
      });
    }

    // ⭐ ACTUALIZAR ESTADO DE LA RESERVA A 'COMPLETED' SI ESTABA EN CHECK-IN
    if (booking.status === 'checked-in') {
      try {
        await booking.update({ 
          status: 'completed',
          completedAt: getColombiaTime()
        });
        console.log("✅ Estado de reserva actualizado a 'completed'");
      } catch (updateError) {
        console.warn("⚠️ Error al actualizar estado de reserva:", updateError.message);
        // No fallar la factura por esto
      }
    }

    // ⭐ CREAR RESPUESTA CON INFORMACIÓN ADICIONAL PARA EL FRONTEND
    const responseData = {
      ...savedBill.toJSON(),
      // ⭐ INFORMACIÓN ADICIONAL PARA EL FRONTEND (NO GUARDADA EN BD)
      guestInfo: {
        name: booking.guest?.scostumername || 'Huésped',
        document: booking.guest?.sdocno || booking.guestId,
        email: booking.guest?.selectronicmail || null
      },
      roomInfo: {
        number: booking.room?.roomNumber || booking.roomNumber,
        type: booking.room?.type || 'Standard',
        checkIn: formatForLogs(booking.checkIn),
        checkOut: formatForLogs(booking.checkOut),
      },
      bookingDetails: {
        roomCharge: baseAmount,
        extraCharges: extraCharges.map(charge => ({
          description: charge.description,
          amount: parseFloat(charge.amount || charge.price || 0),
          quantity: charge.quantity || 1
        })),
        nights: calculateNights(booking.checkIn, booking.checkOut),
        guestCount: booking.guestCount
      },
      // ⭐ FECHAS FORMATEADAS
      createdAtFormatted: formatForLogs(savedBill.createdAt),
      totalAmountFormatted: `$${totalAmount.toLocaleString()}`
    };

    console.log("✅ Factura generada exitosamente:", {
      idBill: savedBill.idBill,
      totalAmount: savedBill.totalAmount,
      generatedAt: formatForLogs(getColombiaTime())
    });

    res.status(201).json({
      error: false,
      message: "Factura generada exitosamente",
      data: responseData,
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ Error al generar la factura:", error);
    console.error("🕐 Hora del error:", formatForLogs(getColombiaTime()));
    
    res.status(500).json({ 
      error: true, 
      message: "Error al generar la factura", 
      details: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// ...existing code...





// ...existing code...

const getAllBills = async (req, res) => {
  try {
    console.log("🧾 Consultando todas las facturas");
    console.log("🕐 Hora de consulta:", formatForLogs(getColombiaTime()));

    const bills = await Bill.findAll({
      include: [
        { 
          model: Booking, 
          as: 'booking', // ⭐ USAR EL ALIAS CORRECTO
          include: [
            { 
              model: Buyer, 
              as: "guest",
              attributes: ["sdocno", "scostumername", "selectronicmail"]
            },
            {
              model: Room,
              as: 'room', // ⭐ ALIAS CORRECTO PARA ROOM
              attributes: ['roomNumber', 'type']
            }
          ]
        },
      ],
      order: [['createdAt', 'DESC']] // ⭐ ORDENAR POR MÁS RECIENTES PRIMERO
    });

    console.log(`✅ Encontradas ${bills.length} facturas`);

    // ⭐ PROCESAR DATOS CON INFORMACIÓN ADICIONAL - CORREGIDO
    const billsWithDetails = bills.map(bill => {
      const billData = bill.toJSON();
      
      // ⭐ AGREGAR INFORMACIÓN CALCULADA SOLO CON CAMPOS EXISTENTES
      return {
        ...billData,
        // ⭐ INFORMACIÓN FORMATEADA DE FECHAS - SOLO LAS QUE EXISTEN EN TU MODELO
        createdAtFormatted: formatForLogs(billData.createdAt),
        updatedAtFormatted: formatForLogs(billData.updatedAt),
        
        // ⭐ INFORMACIÓN DEL HUÉSPED
        guestName: billData.booking?.guest?.scostumername || 'N/A',
        guestDocument: billData.booking?.guest?.sdocno || 'N/A',
        guestEmail: billData.booking?.guest?.selectronicmail || 'N/A',
        
        // ⭐ INFORMACIÓN DE LA HABITACIÓN
        roomNumber: billData.booking?.room?.roomNumber || 'N/A',
        roomType: billData.booking?.room?.type || 'N/A',
        
        // ⭐ ESTADO DE PAGO - USAR SOLO EL CAMPO 'status' QUE SÍ EXISTE
        isPaid: billData.status === 'paid',
        isPending: billData.status === 'pending',
        isCancelled: billData.status === 'cancelled',
        statusLabel: billData.status === 'paid' ? 'Pagada' : 
                    billData.status === 'pending' ? 'Pendiente' : 'Cancelada',
        
        // ⭐ TOTALES FORMATEADOS - SOLO CAMPOS QUE EXISTEN
        totalAmountFormatted: billData.totalAmount ? 
          `$${parseFloat(billData.totalAmount).toLocaleString()}` : '$0',
        reservationAmountFormatted: billData.reservationAmount ? 
          `$${parseFloat(billData.reservationAmount).toLocaleString()}` : '$0',
        extraChargesAmountFormatted: billData.extraChargesAmount ? 
          `$${parseFloat(billData.extraChargesAmount).toLocaleString()}` : '$0',
        taxAmountFormatted: billData.taxAmount ? 
          `$${parseFloat(billData.taxAmount).toLocaleString()}` : '$0',
        
        // ⭐ INFORMACIÓN DE PAGO - SOLO SI EXISTE
        paymentMethodLabel: billData.paymentMethod ? 
          getPaymentMethodLabel(billData.paymentMethod) : 'No especificado',
        
        // ⭐ INFORMACIÓN DE LA RESERVA
        bookingId: billData.booking?.bookingId || billData.bookingId,
        checkIn: billData.booking?.checkIn ? formatForLogs(billData.booking.checkIn) : null,
        checkOut: billData.booking?.checkOut ? formatForLogs(billData.booking.checkOut) : null,
        
        // ⭐ CÁLCULOS ADICIONALES
        hasExtraCharges: parseFloat(billData.extraChargesAmount || 0) > 0,
        hasTaxes: parseFloat(billData.taxAmount || 0) > 0,
        
        // ⭐ IDENTIFICADOR DE FACTURA FISCAL
        hasTaxInvoice: !!billData.taxInvoiceId,
        taxInvoiceDisplay: billData.taxInvoiceId || 'No generada'
      };
    });

    // ⭐ CREAR RESUMEN CON CAMPOS CORRECTOS
    const summary = {
      totalBills: bills.length,
      paidBills: billsWithDetails.filter(b => b.isPaid).length,
      pendingBills: billsWithDetails.filter(b => b.isPending).length,
      cancelledBills: billsWithDetails.filter(b => b.isCancelled).length,
      totalRevenue: billsWithDetails
        .filter(b => b.isPaid)
        .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0),
      totalPendingAmount: billsWithDetails
        .filter(b => b.isPending)
        .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0),
      totalExtraCharges: billsWithDetails
        .reduce((sum, bill) => sum + parseFloat(bill.extraChargesAmount || 0), 0),
      totalTaxes: billsWithDetails
        .reduce((sum, bill) => sum + parseFloat(bill.taxAmount || 0), 0),
      // ⭐ FORMATEOS
      totalRevenueFormatted: `$${billsWithDetails
        .filter(b => b.isPaid)
        .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0)
        .toLocaleString()}`,
      totalPendingFormatted: `$${billsWithDetails
        .filter(b => b.isPending)
        .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0)
        .toLocaleString()}`
    };

    console.log("📊 Resumen de facturas:", {
      total: summary.totalBills,
      paid: summary.paidBills,
      pending: summary.pendingBills,
      revenue: summary.totalRevenueFormatted
    });

    res.json({
      error: false,
      message: "Facturas obtenidas exitosamente",
      data: billsWithDetails,
      summary: summary,
      timestamp: formatForLogs(getColombiaTime())
    });

  } catch (error) {
    console.error("❌ Error al obtener las facturas:", error);
    console.error("🕐 Hora del error:", formatForLogs(getColombiaTime()));
    
    res.status(500).json({
      error: true,
      message: "Error al obtener las facturas",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// ⭐ FUNCIÓN HELPER PARA ETIQUETAS DE MÉTODOS DE PAGO
const getPaymentMethodLabel = (method) => {
  const labels = {
    'cash': 'Efectivo',
    'credit_card': 'Tarjeta de Crédito',
    'debit_card': 'Tarjeta de Débito',
    'transfer': 'Transferencia'
  };
  return labels[method] || method;
};

// ...existing code...




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
  checkInGuest, // ⭐ CAMBIAR DE checkIn A checkInGuest
  checkOut,
  calculateTotalAmount,
  addExtraCharge,
  downloadBookingPdf,
  generateBill,
  updateBookingStatus,
  cancelBooking,
  getOccupancyReport,
  getRevenueReport,
  getBookingByToken,
  updateOnlinePayment,
  getBookingInventoryStatus,
  getInventoryUsageReport,
};
