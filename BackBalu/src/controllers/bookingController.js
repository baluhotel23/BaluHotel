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
  RoomBasics,
  Voucher
} = require("../data");

const { Op } = require("sequelize");
const { CustomError } = require("../middleware/error");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");

const {
  getColombiaTime,
  getColombiaDate,
  formatColombiaDate,
  formatForLogs,
  formatForDetailedLogs,
  formatForDisplay,
  isBeforeToday,
  getDaysDifference,
  toColombiaTime,
  toJSDate,
  validateCheckInTime,
  validateCheckOutTime,
  getHotelSchedule,
  isValidDate,
} = require("../utils/dateUtils");

const getHotelScheduleEndpoint = async (req, res) => {
  try {
    const schedule = getHotelSchedule();
    const now = getColombiaTime();

    res.json({
      error: false,
      message: "Horarios del hotel obtenidos exitosamente",
      data: {
        checkIn: {
          time: schedule.checkIn.time,
          hour: schedule.checkIn.hour,
          minute: schedule.checkIn.minute,
          description: "Horario de entrada a las habitaciones",
          available: now >= schedule.checkIn.datetime,
        },
        checkOut: {
          time: schedule.checkOut.time,
          hour: schedule.checkOut.hour,
          minute: schedule.checkOut.minute,
          description: "Horario límite para salida de las habitaciones",
          available: now <= schedule.checkOut.datetime,
        },
        currentTime: {
          formatted: formatForDisplay(now),
          time24h: formatForLogs(now),
          timezone: schedule.timezone,
          isoString: now.toISO(),
        },
        availability: {
          canCheckInNow: now >= schedule.checkIn.datetime,
          canCheckOutNow: now <= schedule.checkOut.datetime,
          isBusinessHours: now.hour >= 6 && now.hour <= 22,
        },
      },
      timestamp: now.toISO(),
    });
  } catch (error) {
    console.error("❌ Error obteniendo horarios del hotel:", error);
    res.status(500).json({
      error: true,
      message: "Error al obtener horarios del hotel",
      details: error.message,
    });
  }
};

function generateVoucherCode() {
  const prefix = 'BLU';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

const checkAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut, roomType } = req.query;
    console.log("🔍 checkAvailability called with:", {
      checkIn,
      checkOut,
      roomType,
    });

    const where = {};
    if (roomType) {
      // Mapear "Pareja/Sencilla" a "Pareja" para compatibilidad con el ENUM
      where.type = roomType === "Pareja/Sencilla" ? "Pareja" : roomType;
    }

    const rooms = await Room.findAll({
      where,
      include: [
        {
          model: Booking,
          as: "bookings",
          attributes: ["bookingId", "checkIn", "checkOut", "status"],
          required: false,
        },
        {
          model: Service,
          as: "Services",
          through: { attributes: [] },
        },
        {
          model: BasicInventory,
          as: "BasicInventories",
          attributes: ["id", "name", "inventoryType"],
          through: {
            attributes: ["quantity"],
            as: "RoomBasics",
          },
          required: false,
        },
      ],
    });

    console.log(`📊 Found ${rooms.length} rooms`);

    const now = getColombiaTime();

    const roomsWithAvailability = rooms.map((room) => {
      const activeBookings = (room.bookings || []).filter(
        (booking) => booking.status !== "cancelled"
      );

      let isAvailable = true;
      let unavailabilityReason = null;

      // 1. Verificar estado de la habitación
      if (!room.isActive) {
        isAvailable = false;
        unavailabilityReason = "Room not active";
        console.log(`🚫 Room ${room.roomNumber}: Not active`);
      }
      // 2. Estados que impiden reservas
      else if (["Mantenimiento"].includes(room.status)) {
        isAvailable = false;
        unavailabilityReason = `Room status: ${room.status}`;
        console.log(
          `🚫 Room ${room.roomNumber}: Status ${room.status} prevents booking`
        );
      }
      // 3. Verificar conflictos de fechas (simplificado sin horas específicas)
      else if (
        checkIn &&
        checkOut &&
        isValidDate(checkIn) &&
        isValidDate(checkOut)
      ) {
        const hasDateConflict = activeBookings.some((booking) => {
          const bookingStart = toColombiaTime(booking.checkIn);
          const bookingEnd = toColombiaTime(booking.checkOut);
          const requestedStart = toColombiaTime(checkIn);
          const requestedEnd = toColombiaTime(checkOut);

          // Conflicto si las fechas se solapan (sin considerar horas específicas)
          const conflict =
            bookingStart < requestedEnd && bookingEnd > requestedStart;

          if (conflict) {
            console.log(
              "⚠️ [CHECK-AVAILABILITY] Date conflict detected with booking:",
              {
                conflictingBookingId: booking.bookingId,
                existingCheckIn: formatColombiaDate(bookingStart),
                existingCheckOut: formatColombiaDate(bookingEnd),
                requestedCheckIn: formatColombiaDate(requestedStart),
                requestedCheckOut: formatColombiaDate(requestedEnd),
              }
            );
          }

          return conflict;
        });

        if (hasDateConflict) {
          isAvailable = false;
          unavailabilityReason = "Date conflict with existing booking";
          console.log(`🚫 Room ${room.roomNumber}: Date conflict`);
        }
      }

      // 4. Verificar si está ocupada actualmente
      if (
        room.status === "Ocupada" &&
        activeBookings.some((booking) => {
          const bookingStart = toColombiaTime(booking.checkIn);
          const bookingEnd = toColombiaTime(booking.checkOut);
          return now >= bookingStart && now < bookingEnd;
        })
      ) {
        isAvailable = false;
        unavailabilityReason = "Room is currently occupied";
        console.log(`🚫 Room ${room.roomNumber}: Currently occupied`);
      }

      console.log(
        `🏨 Room ${room.roomNumber}: available=${room.available}, status=${room.status}, isAvailable=${isAvailable}`
      );

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
        available: room.available,
        isActive: room.isActive,
        status: room.status,
        Services: room.Services,
        BasicInventories: room.BasicInventories,
        isAvailable,
        bookedDates,
        currentBookings: activeBookings.length,
        availabilityReason: isAvailable
          ? "Available for booking"
          : unavailabilityReason,
      };
    });

    console.log(
      `✅ Processed ${roomsWithAvailability.length} rooms with availability`
    );
    console.log(
      `🏠 Available rooms: ${
        roomsWithAvailability.filter((r) => r.isAvailable).length
      }`
    );

    roomsWithAvailability.forEach((room) => {
      console.log(
        `🏨 Room ${room.roomNumber}: ${
          room.isAvailable ? "✅ AVAILABLE" : "❌ NOT AVAILABLE"
        } - ${room.availabilityReason}`
      );
    });

    res.json({
      error: false,
      message: "Disponibilidad consultada exitosamente",
      data: roomsWithAvailability,
    });
  } catch (error) {
    console.error("❌ Error in checkAvailability:", error);
    res.status(500).json({
      error: true,
      message: "Error al consultar disponibilidad",
      details: error.message,
    });
  }
};

const getRoomTypes = async (req, res) => {
  try {
    const types = await Room.findAll({
      attributes: ["type", , "maxGuests"],
      group: ["type", , "maxGuests"],
    });

    res.json({
      error: false,
      data: types,
    });
  } catch (error) {
    console.error("❌ Error in getRoomTypes:", error);
    res.status(500).json({
      error: true,
      message: "Error al obtener tipos de habitación",
      details: error.message,
    });
  }
};

// Client and staff endpoints
const createBooking = async (req, res, next) => {
  try {
    console.log("🚀 [CREATE-BOOKING] Starting createBooking process...");
    console.log(
      "🇨🇴 [CREATE-BOOKING] Server time Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log(
      "📥 [CREATE-BOOKING] Request body:",
      JSON.stringify(req.body, null, 2)
    );
    console.log(
      "👤 [CREATE-BOOKING] Request user:",
      req.user
        ? {
            n_document: req.user.n_document,
            role: req.user.role,
            email: req.user.email,
          }
        : "No user"
    );

    const {
      guestId,
      roomNumber,
      checkIn,
      checkOut,
      guestCount,
      totalPrice,
      totalAmount,
      status = "confirmed",
      notes,
      verifyInventory = true,
      forceCreate = false,
      pointOfSale = "Online",
    } = req.body;

    console.log("📋 [CREATE-BOOKING] Extracted fields:", {
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
      forceCreate,
    });

    // ⭐ VALIDACIONES BÁSICAS MEJORADAS CON LOGS
    console.log("🔍 [CREATE-BOOKING] Starting validations...");

    if (!guestId) {
      console.log("❌ [CREATE-BOOKING] Missing guestId");
      return res.status(400).json({
        error: true,
        message: "Campo requerido faltante: guestId",
      });
    }

    if (!roomNumber) {
      console.log("❌ [CREATE-BOOKING] Missing roomNumber");
      return res.status(400).json({
        error: true,
        message: "Campo requerido faltante: roomNumber",
      });
    }

    if (!checkIn) {
      console.log("❌ [CREATE-BOOKING] Missing checkIn");
      return res.status(400).json({
        error: true,
        message: "Campo requerido faltante: checkIn",
      });
    }

    if (!checkOut) {
      console.log("❌ [CREATE-BOOKING] Missing checkOut");
      return res.status(400).json({
        error: true,
        message: "Campo requerido faltante: checkOut",
      });
    }

    if (!guestCount) {
      console.log("❌ [CREATE-BOOKING] Missing guestCount");
      return res.status(400).json({
        error: true,
        message: "Campo requerido faltante: guestCount",
      });
    }

    console.log("✅ [CREATE-BOOKING] Basic validations passed");

    // ⭐ VALIDAR FECHAS CON UTILIDADES DE COLOMBIA - CORREGIDO
    console.log("📅 [CREATE-BOOKING] Validating dates...");

    // 🔧 CONVERTIR A OBJETOS Date NATIVOS PARA EVITAR ERRORES
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = getColombiaTime(); // Esto retorna un DateTime de Luxon

    console.log("📅 [CREATE-BOOKING] Date objects:", {
      checkInDate: checkInDate.toISOString(),
      checkOutDate: checkOutDate.toISOString(),
      // 🔧 CORREGIR: Usar .toISO() para objetos DateTime de Luxon
      today: today.toISO(), // ✅ CORRECCIÓN
      todayFormatted: formatForLogs(today),
      checkInFormatted: formatColombiaDate(checkInDate),
      checkOutFormatted: formatColombiaDate(checkOutDate),
    });

    if (checkInDate >= checkOutDate) {
      console.log(
        "❌ [CREATE-BOOKING] Invalid date range - checkIn >= checkOut"
      );
      return res.status(400).json({
        error: true,
        message: "La fecha de check-out debe ser posterior al check-in",
      });
    }

    // ⭐ USAR UTILIDAD PARA COMPARAR FECHAS - CORREGIDO
    if (isBeforeToday(checkInDate)) {
      console.log("❌ [CREATE-BOOKING] Invalid checkIn date - in the past");
      console.log("📅 [CREATE-BOOKING] Date comparison Colombia:", {
        checkInFormatted: formatColombiaDate(checkInDate),
        todayFormatted: formatForLogs(today), // Ya está formateado correctamente
        isPast: isBeforeToday(checkInDate),
      });
      return res.status(400).json({
        error: true,
        message: "La fecha de check-in no puede ser anterior a hoy",
      });
    }

    console.log("✅ [CREATE-BOOKING] Date validations passed");

    // ⭐ VERIFICAR QUE EL HUÉSPED EXISTE CON LOGS
    console.log("👤 [CREATE-BOOKING] Looking for guest with ID:", guestId);
    const guest = await Buyer.findByPk(guestId);

    if (!guest) {
      console.log("❌ [CREATE-BOOKING] Guest not found with ID:", guestId);
      return res.status(404).json({
        error: true,
        message: `Huésped no encontrado con ID: ${guestId}`,
      });
    }

    console.log("✅ [CREATE-BOOKING] Guest found:", {
      sdocno: guest.sdocno,
      name: guest.scostumername,
    });

    // ⭐ VERIFICAR QUE LA HABITACIÓN EXISTE CON LOGS DETALLADOS
    console.log("🏨 [CREATE-BOOKING] Looking for room:", roomNumber);

    const room = await Room.findByPk(roomNumber, {
      include: [
        {
          model: BasicInventory,
          as: "BasicInventories",
          attributes: [
            "id",
            "name",
            "inventoryType",
            "currentStock",
            "cleanStock",
            "minStock",
          ],
          through: {
            attributes: ["quantity", "isRequired"],
            as: "RoomBasics",
          },
        },
        {
          model: Booking,
          as: "bookings",
          attributes: ["bookingId", "checkIn", "checkOut", "status"],
          required: false,
        },
      ],
    });

    if (!room) {
      console.log("❌ [CREATE-BOOKING] Room not found:", roomNumber);
      return res.status(404).json({
        error: true,
        message: `Habitación no encontrada: ${roomNumber}`,
      });
    }

    console.log("✅ [CREATE-BOOKING] Room found:", {
      roomNumber: room.roomNumber,
      type: room.type,
      status: room.status,
      isActive: room.isActive,
      available: room.available,
      maxGuests: room.maxGuests,
      existingBookings: room.bookings ? room.bookings.length : 0,
    });

    // ⭐ VERIFICAR QUE LA HABITACIÓN ESTÉ ACTIVA
    if (!room.isActive) {
      console.log("❌ [CREATE-BOOKING] Room is not active:", roomNumber);
      return res.status(400).json({
        error: true,
        message: `La habitación ${roomNumber} no está activa`,
      });
    }

    console.log("✅ [CREATE-BOOKING] Room is active");

    // ⭐ VERIFICAR DISPONIBILIDAD DE FECHAS CON LOGS DETALLADOS
    console.log("📅 [CREATE-BOOKING] Checking date conflicts...");

    const activeBookings = (room.bookings || []).filter(
      (booking) => booking.status !== "cancelled"
    );

    console.log(
      "📅 [CREATE-BOOKING] Active bookings for room:",
      activeBookings.map((b) => ({
        bookingId: b.bookingId,
        checkIn: formatColombiaDate(b.checkIn),
        checkOut: formatColombiaDate(b.checkOut),
        status: b.status,
      }))
    );

    const hasDateConflict = activeBookings.some((booking) => {
      const bookingStart = new Date(booking.checkIn);
      const bookingEnd = new Date(booking.checkOut);

      const conflict =
        (bookingStart <= checkOutDate && bookingEnd >= checkInDate) ||
        (checkInDate <= bookingEnd && checkOutDate >= bookingStart);

      if (conflict) {
        console.log(
          "⚠️ [CREATE-BOOKING] Date conflict detected with booking:",
          {
            conflictingBookingId: booking.bookingId,
            existingCheckIn: formatColombiaDate(bookingStart),
            existingCheckOut: formatColombiaDate(bookingEnd),
            requestedCheckIn: formatColombiaDate(checkInDate),
            requestedCheckOut: formatColombiaDate(checkOutDate),
          }
        );
      }

      return conflict;
    });

    if (hasDateConflict) {
      console.log("❌ [CREATE-BOOKING] Date conflict found");
      return res.status(400).json({
        error: true,
        message: "La habitación no está disponible en las fechas seleccionadas",
        data: {
          conflictingBookings: activeBookings.map((b) => ({
            bookingId: b.bookingId,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            status: b.status,
          })),
        },
      });
    }

    console.log("✅ [CREATE-BOOKING] No date conflicts found");

    // ⭐ VERIFICAR CAPACIDAD DE LA HABITACIÓN
    console.log("👥 [CREATE-BOOKING] Checking room capacity...");
    console.log(
      "👥 [CREATE-BOOKING] Guest count:",
      guestCount,
      "Max guests:",
      room.maxGuests
    );

    if (guestCount > room.maxGuests) {
      console.log("❌ [CREATE-BOOKING] Exceeds room capacity");
      return res.status(400).json({
        error: true,
        message: `La habitación tiene capacidad máxima de ${room.maxGuests} huéspedes, solicitados: ${guestCount}`,
      });
    }

    console.log("✅ [CREATE-BOOKING] Room capacity validation passed");

    // ⭐ CALCULAR PRECIO TOTAL CON LOGS DETALLADOS
    console.log("💰 [CREATE-BOOKING] Calculating price...");

    let finalTotalPrice = totalAmount || totalPrice;

    if (!finalTotalPrice) {
      console.log("💰 [CREATE-BOOKING] No price provided, calculating...");

      // ⭐ USAR UTILIDAD PARA CALCULAR NOCHES
      const nights = getDaysDifference(checkInDate, checkOutDate);
      console.log("💰 [CREATE-BOOKING] Nights calculated:", nights);

      // Usar precio según cantidad de huéspedes
      let pricePerNight;

      if (guestCount === 1) {
        pricePerNight = room.priceSingle || room.priceDouble;
        console.log("💰 [CREATE-BOOKING] Using single price:", pricePerNight);
      } else if (guestCount === 2) {
        pricePerNight = room.priceDouble;
        console.log("💰 [CREATE-BOOKING] Using double price:", pricePerNight);
      } else {
        pricePerNight = room.priceMultiple;
        console.log("💰 [CREATE-BOOKING] Using multiple price:", pricePerNight);

        // Agregar costo por huéspedes extra
        if (guestCount > 3 && room.pricePerExtraGuest) {
          const extraCost = (guestCount - 3) * room.pricePerExtraGuest;
          pricePerNight += extraCost;
          console.log(
            "💰 [CREATE-BOOKING] Added extra guest cost:",
            extraCost,
            "New price per night:",
            pricePerNight
          );
        }
      }

      // Aplicar precio promocional si existe
      if (room.isPromo && room.promotionPrice && pointOfSale !== "Online") {
        pricePerNight = room.promotionPrice;
        console.log(
          "💰 [CREATE-BOOKING] Applied promotional price (NO online):",
          pricePerNight
        );
      } else if (
        room.isPromo &&
        room.promotionPrice &&
        pointOfSale === "Online"
      ) {
        console.log(
          "💰 [CREATE-BOOKING] NO promo price for ONLINE booking. Using regular price."
        );
      }

      finalTotalPrice = pricePerNight * nights;
      console.log(
        "💰 [CREATE-BOOKING] Final calculated price:",
        finalTotalPrice
      );
    } else {
      console.log("💰 [CREATE-BOOKING] Using provided price:", finalTotalPrice);
    }

    // ⭐ PREPARAR DATOS PARA CREAR LA RESERVA CON LOGS
    console.log("📝 [CREATE-BOOKING] Preparing booking data...");

    // ⭐ GENERAR trackingToken PARA RESERVAS ONLINE
    let trackingToken = null;
    if (pointOfSale === "Online") {
      trackingToken = jwt.sign(
        { guestId, roomNumber, timestamp: Date.now() },
        process.env.JWT_SECRET || 'secret-key',
        { expiresIn: '30d' }
      );
      console.log("🔑 [CREATE-BOOKING] Generated trackingToken for online booking");
    }

    const bookingData = {
      guestId,
      roomNumber,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guestCount,
      totalAmount: finalTotalPrice,
      status,
      notes: notes || "",
      pointOfSale: pointOfSale,
      createdBy: req.user?.n_document || null,
      trackingToken: trackingToken,
    };

    // ⭐ RESTRICCIÓN: Los admins NO pueden crear reservas 'Local' desde panel staff.
    // Solo owner y recepcionistas deben poder crear reservas desde la interfaz administrativa.
    if (bookingData.pointOfSale === 'Local' && req.user && req.user.role === 'admin') {
      console.warn(`🚫 [CREATE-BOOKING] Admin ${req.user.n_document} intentó crear una reserva Local - prohibido.`);
      return res.status(403).json({ error: true, message: 'No tienes permisos para crear reservas desde el panel administrativo' });
    }

    console.log(
      "📝 [CREATE-BOOKING] Booking data to create:",
      JSON.stringify(bookingData, null, 2)
    );

    // ⭐ CREAR LA RESERVA CON TRY-CATCH ESPECÍFICO
    console.log("💾 [CREATE-BOOKING] Creating booking in database...");
    if (pointOfSale === "Local") {
      if (req.user?.n_document) {
        console.log(
          "✅ [CREATE-BOOKING] Reserva LOCAL creada por empleado:",
          req.user.n_document,
          req.user.role
        );
      } else {
        console.log(
          "⚠️ [CREATE-BOOKING] Reserva LOCAL pero SIN empleado logueado - esto podría ser un problema"
        );
      }
    } else {
      console.log(
        "🌐 [CREATE-BOOKING] Reserva ONLINE - puede no tener empleado asociado"
      );
    }

    let newBooking;
    try {
      newBooking = await Booking.create(bookingData);
      console.log("✅ [CREATE-BOOKING] Booking created successfully:", {
        bookingId: newBooking.bookingId,
        id: newBooking.id,
        trackingToken: trackingToken ? 'Generated' : 'N/A',
        createdAt: formatForLogs(newBooking.createdAt),
      });

      // ⭐ CREAR VOUCHER PARA RESERVAS ONLINE
      if (pointOfSale === "Online" && trackingToken) {
        try {
          const voucherCode = generateVoucherCode();
          await Voucher.create({
            bookingId: newBooking.bookingId,
            voucherCode,
            guestId,
            validFrom: checkInDate,
            validUntil: checkOutDate,
            isUsed: false,
          });
          console.log("✅ [CREATE-BOOKING] Voucher created:", voucherCode);
        } catch (voucherError) {
          console.error("⚠️ [CREATE-BOOKING] Error creating voucher:", voucherError);
          // No fallar la reserva por esto
        }
      }
    } catch (createError) {
      console.error(
        "❌ [CREATE-BOOKING] Error creating booking at:",
        formatForLogs(getColombiaTime())
      );
      console.error("❌ [CREATE-BOOKING] Error details:", {
        name: createError.name,
        message: createError.message,
        sql: createError.sql,
        parameters: createError.parameters,
      });

      return res.status(500).json({
        error: true,
        message: "Error al crear la reserva en la base de datos",
        details: createError.message,
      });
    }

    // ⭐ ACTUALIZAR ESTADO DE LA HABITACIÓN CON LOGS
    console.log("🏨 [CREATE-BOOKING] Updating room status...");

    // ✅ CORRECCIÓN: Reservas "confirmed" y "paid" marcan habitación como "Reservada"
    // Reservas "pending" (online sin pagar) NO marcan como reservada hasta pago
    // Solo se marca como "Ocupada" después del check-in
    let roomStatus = null;
    let roomAvailable = room.available;

    if (["confirmed", "paid"].includes(status)) {
      roomStatus = "Reservada";
      roomAvailable = false;
      console.log("🏨 [CREATE-BOOKING] Marking room as 'Reservada' (confirmed/paid)");
    } else if (status === "checked-in") {
      roomStatus = "Ocupada";
      roomAvailable = false;
      console.log("🏨 [CREATE-BOOKING] Marking room as 'Ocupada' (checked-in)");
    } else if (status === "pending" && pointOfSale === "Online") {
      // No cambiar estado hasta que se confirme el pago
      roomStatus = room.status; // Mantener estado actual
      roomAvailable = true; // Mantener disponible
      console.log("🏨 [CREATE-BOOKING] Keeping room available (pending online payment)");
    }

    const roomUpdateData = {
      status: roomStatus,
      available: roomAvailable,
    };

    console.log("🏨 [CREATE-BOOKING] Room update data:", roomUpdateData);

    try {
      await room.update(roomUpdateData);
      console.log("✅ [CREATE-BOOKING] Room status updated successfully");
    } catch (updateError) {
      console.error(
        "❌ [CREATE-BOOKING] Error updating room status:",
        updateError
      );
      // No fallar la reserva por esto, solo log
    }

    // ⭐ OBTENER INFORMACIÓN COMPLETA DE LA RESERVA CREADA CON LOGS
    console.log("🔍 [CREATE-BOOKING] Fetching complete booking data...");

    let bookingWithDetails;
    try {
      bookingWithDetails = await Booking.findByPk(newBooking.bookingId, {
        include: [
          {
            model: Room,
            as: "room",
            attributes: ["roomNumber", "type", "status", "maxGuests"],
          },
          {
            model: Buyer,
            as: "guest",
            attributes: ["sdocno", "scostumername", "selectronicmail"],
          },
        ],
      });

      console.log("✅ [CREATE-BOOKING] Complete booking data fetched:", {
        bookingId: bookingWithDetails?.bookingId,
        hasRoom: !!bookingWithDetails?.Room,
        hasGuest: !!bookingWithDetails?.guest,
      });
    } catch (fetchError) {
      console.error(
        "❌ [CREATE-BOOKING] Error fetching complete booking:",
        fetchError
      );
      // Usar la reserva básica si falla
      bookingWithDetails = newBooking;
    }

    // ⭐ PREPARAR RESPUESTA FINAL CON LOGS
    console.log("📤 [CREATE-BOOKING] Preparing final response...");

    const response = {
      error: false,
      message: "Reserva creada exitosamente",
      success: true,
      data: {
        booking: bookingWithDetails,
        calculatedPrice: finalTotalPrice,
        nights: getDaysDifference(checkInDate, checkOutDate),
        roomStatusUpdated: true,
        // ⭐ INFO ADICIONAL
        pointOfSale: pointOfSale,
        createdBy: bookingData.createdBy,
        isLocalBooking: pointOfSale === "Local",
      },
    };

    console.log("✅ [CREATE-BOOKING] Final response prepared:", {
      success: response.success,
      bookingId: response.data.booking?.bookingId,
      calculatedPrice: response.data.calculatedPrice,
      pointOfSale: response.data.pointOfSale,
      createdBy: response.data.createdBy,
      completedAt: formatForLogs(getColombiaTime()),
    });

    res.status(201).json(response);
  } catch (error) {
    console.error(
      "❌ [CREATE-BOOKING] Unexpected error at:",
      formatForLogs(getColombiaTime())
    );
    console.error("❌ [CREATE-BOOKING] Error details:", error);
    next(error);
  }
};

const updateOnlinePayment = async (req, res, next) => {
  try {
    console.log(
      "💳 [UPDATE-ONLINE-PAYMENT] Iniciando actualización de pago online"
    );
    console.log(
      "🕐 [UPDATE-ONLINE-PAYMENT] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log(
      "📥 [UPDATE-ONLINE-PAYMENT] Request body:",
      JSON.stringify(req.body, null, 2)
    );

    const {
      bookingId,
      amount,
      transactionId,
      paymentReference,
      paymentMethod,
      paymentStatus = "completed", // Por defecto completado
      wompiTransactionId,
      wompiStatus,
    } = req.body;

    // ⭐ VALIDACIONES MEJORADAS CON LOGS
    console.log("🔍 [UPDATE-ONLINE-PAYMENT] Validando datos...");

    if (!bookingId) {
      console.log("❌ [UPDATE-ONLINE-PAYMENT] bookingId faltante");
      return res.status(400).json({
        error: true,
        message: "bookingId es requerido",
      });
    }

    if (!amount || isNaN(parseFloat(amount))) {
      console.log("❌ [UPDATE-ONLINE-PAYMENT] amount inválido:", amount);
      return res.status(400).json({
        error: true,
        message: "amount es requerido y debe ser un número válido",
      });
    }

    if (!transactionId && !wompiTransactionId) {
      console.log("❌ [UPDATE-ONLINE-PAYMENT] transactionId faltante");
      return res.status(400).json({
        error: true,
        message: "transactionId o wompiTransactionId es requerido",
      });
    }

    console.log("✅ [UPDATE-ONLINE-PAYMENT] Validaciones básicas pasadas");

    // ⭐ BUSCAR LA RESERVA CON LOGS
    console.log("🔍 [UPDATE-ONLINE-PAYMENT] Buscando reserva:", bookingId);

    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "status", "type"],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: ["scostumername", "sdocno"],
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "paymentId",
            "amount",
            "paymentStatus",
            "paymentType",
            "isCheckoutPayment",
            "includesExtras",
            "isReservationPayment",
          ],
        },
        {
          model: ExtraCharge,
          as: "extraCharges",
          attributes: ["id", "amount", "description", "quantity"],
        },
      ],
    });

    if (!booking) {
      console.log(
        "❌ [UPDATE-ONLINE-PAYMENT] Reserva no encontrada:",
        bookingId
      );
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
      });
    }

    console.log("✅ [UPDATE-ONLINE-PAYMENT] Reserva encontrada:", {
      bookingId: booking.bookingId,
      pointOfSale: booking.pointOfSale,
      status: booking.status,
      totalAmount: booking.totalAmount,
      existingPayments: booking.payments ? booking.payments.length : 0,
    });

    // ⭐ VERIFICAR QUE SEA RESERVA ONLINE
    if (booking.pointOfSale !== "Online") {
      console.log(
        "❌ [UPDATE-ONLINE-PAYMENT] No es reserva online:",
        booking.pointOfSale
      );
      return res.status(400).json({
        error: true,
        message: "Esta reserva no es de pago online",
      });
    }

    console.log("✅ [UPDATE-ONLINE-PAYMENT] Reserva online confirmada");

    // ⭐ CALCULAR TOTALES FINANCIEROS - IGUAL QUE EN registerLocalPayment
    const paymentAmount = parseFloat(amount);
    const reservationAmount = parseFloat(booking.totalAmount);

    // Calcular gastos extras
    const extraChargesTotal =
      booking.extraCharges?.reduce((sum, charge) => {
        const chargeAmount = parseFloat(charge.amount) || 0;
        const quantity = parseInt(charge.quantity) || 1;
        return sum + chargeAmount * quantity;
      }, 0) || 0;

    const grandTotal = reservationAmount + extraChargesTotal;

    // ⭐ CALCULAR PAGOS PREVIOS (solo authorized y completed)
    const previousPayments =
      booking.payments?.filter(
        (p) =>
          p.paymentStatus === "authorized" || p.paymentStatus === "completed"
      ) || [];

    const totalPreviousPaid = previousPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0
    );

    console.log("💰 [UPDATE-ONLINE-PAYMENT] Cálculo de pagos:", {
      paymentAmount,
      reservationAmount,
      extraChargesTotal,
      grandTotal,
      totalPreviousPaid,
      remaining: grandTotal - totalPreviousPaid,
    });

    // ⭐ BUSCAR PAGO EXISTENTE O CREAR UNO NUEVO
    console.log("🔍 [UPDATE-ONLINE-PAYMENT] Buscando pago existente...");

    let payment = await Payment.findOne({
      where: {
        bookingId,
        paymentType: "online",
        [Op.or]: [
          { paymentStatus: "pending" },
          { transactionId: transactionId || wompiTransactionId },
        ],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!payment) {
      console.log(
        "📝 [UPDATE-ONLINE-PAYMENT] Creando nuevo registro de pago..."
      );

      try {
        payment = await Payment.create({
          bookingId,
          amount: paymentAmount,
          paymentMethod: paymentMethod || "wompi",
          paymentType: "online",
          paymentStatus: "pending", // Se actualizará después
          paymentDate: getColombiaTime(),
          transactionId: transactionId || wompiTransactionId,
          paymentReference: paymentReference,
          processedBy: "wompi_webhook",
          // ⭐ CAMPOS SEGÚN NUEVO MODELO
          includesExtras: false, // Los pagos online son solo para reserva
          isReservationPayment: true,
          isCheckoutPayment: false,
        });

        console.log(
          "✅ [UPDATE-ONLINE-PAYMENT] Nuevo pago creado:",
          payment.paymentId
        );
      } catch (createError) {
        console.error(
          "❌ [UPDATE-ONLINE-PAYMENT] Error al crear pago:",
          createError
        );
        return res.status(500).json({
          error: true,
          message: "Error al crear el registro de pago",
          details: createError.message,
        });
      }
    } else {
      console.log(
        "✅ [UPDATE-ONLINE-PAYMENT] Pago existente encontrado:",
        payment.paymentId
      );
    }

    // ⭐ ACTUALIZAR EL REGISTRO DE PAGO CON LOGS
    console.log("💾 [UPDATE-ONLINE-PAYMENT] Actualizando registro de pago...");

    const updateData = {
      amount: paymentAmount, // Monto confirmado por Wompi
      paymentMethod: paymentMethod || payment.paymentMethod,
      transactionId:
        transactionId || wompiTransactionId || payment.transactionId,
      paymentReference: paymentReference || payment.paymentReference,
      paymentStatus: paymentStatus,
      paymentDate: getColombiaTime(),
      processedBy: "wompi_webhook",
      // ⭐ CAMPOS ADICIONALES PARA WOMPI
      wompiTransactionId: wompiTransactionId,
      wompiStatus: wompiStatus,
    };

    console.log(
      "📝 [UPDATE-ONLINE-PAYMENT] Datos de actualización:",
      updateData
    );

    try {
      await payment.update(updateData);
      console.log("✅ [UPDATE-ONLINE-PAYMENT] Pago actualizado exitosamente");
    } catch (updateError) {
      console.error(
        "❌ [UPDATE-ONLINE-PAYMENT] Error al actualizar pago:",
        updateError
      );
      return res.status(500).json({
        error: true,
        message: "Error al actualizar el pago",
        details: updateError.message,
      });
    }

    // ⭐ ACTUALIZAR ESTADO DE LA RESERVA BASADO EN PAGOS - NUEVA LÓGICA
    let newBookingStatus = booking.status;
    let shouldUpdateBookingStatus = false;

    if (paymentStatus === "completed") {
      // ⭐ APLICAR MISMA LÓGICA QUE registerLocalPayment
      const totalPaid = totalPreviousPaid + paymentAmount;

      if (totalPaid >= reservationAmount) {
        // ⭐ CAMBIO PRINCIPAL: Cambiar a 'paid' NO 'confirmed'
        newBookingStatus = "paid";
        shouldUpdateBookingStatus = true;
        console.log(
          "✅ [UPDATE-ONLINE-PAYMENT] Reserva completamente pagada - Status: PAID (listo para check-in físico)"
        );
      } else if (totalPaid > 0) {
        newBookingStatus = "confirmed"; // Pago parcial pero confirmado
        shouldUpdateBookingStatus = true;
        console.log(
          "⚠️ [UPDATE-ONLINE-PAYMENT] Reserva parcialmente pagada - Status: CONFIRMED"
        );
      }
    } else if (paymentStatus === "failed") {
      // Mantener estado actual si el pago falló
      console.log(
        "❌ [UPDATE-ONLINE-PAYMENT] Pago falló, manteniendo estado actual"
      );
    }

    // ⭐ ACTUALIZAR RESERVA SI CAMBIÓ EL ESTADO
    if (shouldUpdateBookingStatus && newBookingStatus !== booking.status) {
      console.log(
        "🔄 [UPDATE-ONLINE-PAYMENT] Actualizando estado de reserva:",
        {
          from: booking.status,
          to: newBookingStatus,
        }
      );

      try {
        const bookingUpdateData = {
          status: newBookingStatus,
          statusUpdatedAt: getColombiaTime(),
          statusUpdatedBy: "payment_system",
        };

        // ⭐ AGREGAR TIMESTAMP DE PAGO COMPLETO SI CORRESPONDE
        if (newBookingStatus === "paid") {
          bookingUpdateData.paymentCompletedAt = getColombiaTime();
        }

        await booking.update(bookingUpdateData);
        console.log("✅ [UPDATE-ONLINE-PAYMENT] Estado de reserva actualizado");

        // ⭐ ACTUALIZAR HABITACIÓN SEGÚN NUEVO ESTADO
        const room = await Room.findByPk(booking.roomNumber);
        if (room) {
          let newRoomStatus = room.status;
          let newRoomAvailability = room.available;

          if (newBookingStatus === "paid") {
            // ⭐ CUANDO ESTÁ PAGADO PERO NO CHECKED-IN, MANTENER RESERVADA
            newRoomStatus = "Reservada";
            newRoomAvailability = false;
          } else if (newBookingStatus === "confirmed") {
            newRoomStatus = "Reservada";
            newRoomAvailability = false;
          }

          await room.update({
            status: newRoomStatus,
            available: newRoomAvailability,
          });

          console.log("🏨 [UPDATE-ONLINE-PAYMENT] Habitación actualizada:", {
            roomNumber: booking.roomNumber,
            status: newRoomStatus,
            available: newRoomAvailability,
          });
        }
      } catch (bookingUpdateError) {
        console.error(
          "❌ [UPDATE-ONLINE-PAYMENT] Error al actualizar reserva:",
          bookingUpdateError
        );
        // No fallar por esto, solo log
      }
    }

    // ⭐ OBTENER RESERVA ACTUALIZADA - IGUAL QUE registerLocalPayment
    const updatedBooking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "status", "type"],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: ["scostumername", "sdocno"],
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "paymentId",
            "amount",
            "paymentMethod",
            "paymentStatus",
            "paymentType",
            "paymentDate",
            "includesExtras",
            "isReservationPayment",
          ],
        },
        {
          model: ExtraCharge,
          as: "extraCharges",
          attributes: ["id", "amount", "description", "quantity"],
        },
      ],
    });

    // ⭐ CALCULAR TOTALES ACTUALIZADOS
    const authorizedPayments =
      updatedBooking.payments?.filter(
        (p) =>
          p.paymentStatus === "authorized" || p.paymentStatus === "completed"
      ) || [];

    const totalPaid = authorizedPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0
    );

    const newRemainingAmount = grandTotal - totalPaid;
    const isFullyPaid = newRemainingAmount <= 0;

    console.log("✅ [UPDATE-ONLINE-PAYMENT] Pago procesado exitosamente:", {
      paymentId: payment.paymentId,
      amount: paymentAmount,
      status: paymentStatus,
      bookingStatus: newBookingStatus,
      totalPaid,
      remainingAmount: newRemainingAmount,
      isFullyPaid,
      readyForPhysicalCheckIn: newBookingStatus === "paid",
      completedAt: formatForLogs(getColombiaTime()),
    });

    // ⭐ DETERMINAR MENSAJE DE RESPUESTA - ACTUALIZADO
    let responseMessage = "";
    if (paymentStatus === "completed") {
      if (newBookingStatus === "paid") {
        responseMessage =
          "✅ Pago online completado. Reserva lista para check-in físico.";
      } else if (newBookingStatus === "confirmed") {
        responseMessage = "📊 Pago parcial completado. Reserva confirmada.";
      } else {
        responseMessage = "✅ Pago online registrado exitosamente.";
      }
    } else if (paymentStatus === "failed") {
      responseMessage =
        "❌ Pago online falló. Verificar con el proveedor de pagos.";
    } else {
      responseMessage = "💳 Pago online en proceso.";
    }

    // ⭐ PREPARAR RESPUESTA COMPLETA
    const responseData = {
      payment: {
        ...payment.toJSON(),
        paymentDateFormatted: formatForLogs(payment.paymentDate),
        amountFormatted: `$${parseFloat(payment.amount).toLocaleString()}`,
      },
      booking: {
        bookingId: booking.bookingId,
        status: newBookingStatus,
        totalAmount: reservationAmount,
        totalAmountFormatted: `$${reservationAmount.toLocaleString()}`,
      },
      paymentSummary: {
        reservationAmount,
        extraChargesTotal,
        grandTotal,
        totalPaid,
        remainingAmount: newRemainingAmount,
        isFullyPaid,
        readyForPhysicalCheckIn: newBookingStatus === "paid", // ⭐ NUEVO CAMPO
        canCheckout: isFullyPaid && newBookingStatus === "checked-in",
        paymentsCount: updatedBooking.payments?.length || 0,
        // Formateos
        totalPaidFormatted: `$${totalPaid.toLocaleString()}`,
        remainingFormatted: `$${Math.max(
          0,
          newRemainingAmount
        ).toLocaleString()}`,
        grandTotalFormatted: `$${grandTotal.toLocaleString()}`,
        paymentPercentage:
          reservationAmount > 0
            ? Math.round((totalPaid / reservationAmount) * 100)
            : 0,
      },
      statusChanged: shouldUpdateBookingStatus,
      newStatus: newBookingStatus,
      roomStatus: updatedBooking.room?.status,
    };

    res.status(200).json({
      error: false,
      message: responseMessage,
      data: responseData,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [UPDATE-ONLINE-PAYMENT] Error general:", error);
    console.error(
      "🕐 [UPDATE-ONLINE-PAYMENT] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error interno al procesar el pago online",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

const downloadBookingPdf = async (req, res, next) => {
  try {
    console.log("📄 [DOWNLOAD-PDF] Iniciando generación de PDF de reserva");
    console.log(
      "🕐 [DOWNLOAD-PDF] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log("📥 [DOWNLOAD-PDF] trackingToken:", req.params.trackingToken);

    const { trackingToken } = req.params;

    // ⭐ VALIDACIONES BÁSICAS CON LOGS
    if (!trackingToken) {
      console.log("❌ [DOWNLOAD-PDF] trackingToken faltante");
      return res.status(400).json({
        error: true,
        message: "Token de seguimiento es requerido",
      });
    }

    console.log("✅ [DOWNLOAD-PDF] Token recibido, verificando...");

    // ⭐ VERIFICAR Y DECODIFICAR EL TOKEN CON MANEJO DE ERRORES
    let decoded;
    try {
      decoded = jwt.verify(trackingToken, process.env.BOOKING_SECRET);
      console.log("✅ [DOWNLOAD-PDF] Token verificado exitosamente:", {
        bookingId: decoded.bookingId,
        iat: decoded.iat,
        exp: decoded.exp,
      });
    } catch (tokenError) {
      console.error(
        "❌ [DOWNLOAD-PDF] Error al verificar token:",
        tokenError.message
      );
      return res.status(401).json({
        error: true,
        message: "Token de seguimiento inválido o expirado",
        details: tokenError.message,
      });
    }

    const bookingId = decoded.bookingId;

    if (!bookingId) {
      console.log("❌ [DOWNLOAD-PDF] bookingId no encontrado en token");
      return res.status(400).json({
        error: true,
        message: "Token no contiene un ID de reserva válido",
      });
    }

    const cancellationToken = jwt.sign(
      {
        bookingId: booking.bookingId,
        action: "cancellation",
        guestId: booking.guestId,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.BOOKING_SECRET,
      {
        expiresIn: "30d", // Válido por 30 días
      }
    );

    const cancellationUrl = `${process.env.FRONT_URL}/cancel-booking/${cancellationToken}`;

    console.log("🔍 [DOWNLOAD-PDF] Buscando reserva:", bookingId);

    // ⭐ OBTENER DATOS COMPLETOS DE LA RESERVA CON INCLUDES MEJORADOS
    const booking = await Booking.findOne({
      where: { bookingId },
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "type", "description", "maxGuests"],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: [
            "sdocno",
            "scostumername",
            "selectronicmail",
            "stelephone",
          ],
        },
        {
          model: ExtraCharge,
          as: "extraCharges",
          attributes: ["description", "amount", "quantity", "chargeDate"],
          required: false,
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "amount",
            "paymentMethod",
            "paymentStatus",
            "paymentDate",
          ],
          where: { paymentStatus: "completed" },
          required: false,
        },
      ],
    });

    if (!booking) {
      console.log("❌ [DOWNLOAD-PDF] Reserva no encontrada:", bookingId);
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
      });
    }

    console.log("✅ [DOWNLOAD-PDF] Reserva encontrada:", {
      bookingId: booking.bookingId,
      guestName: booking.guest?.scostumername,
      roomNumber: booking.room?.roomNumber || booking.roomNumber,
      status: booking.status,
    });

    // ⭐ CALCULAR INFORMACIÓN ADICIONAL PARA EL PDF
    const bookingData = booking.toJSON();
    const nights = calculateNights(booking.checkIn, booking.checkOut);

    // Calcular totales
    const baseAmount = parseFloat(booking.totalAmount || 0);
    const extraChargesTotal = (bookingData.extraCharges || []).reduce(
      (sum, charge) => {
        return (
          sum + parseFloat(charge.amount || 0) * parseInt(charge.quantity || 1)
        );
      },
      0
    );
    const totalPaid = (bookingData.payments || []).reduce((sum, payment) => {
      return sum + parseFloat(payment.amount || 0);
    }, 0);
    const grandTotal = baseAmount + extraChargesTotal;

    console.log("💰 [DOWNLOAD-PDF] Cálculos financieros:", {
      baseAmount,
      extraChargesTotal,
      totalPaid,
      grandTotal,
      nights,
    });

    // ⭐ GENERAR PDF CON MANEJO MEJORADO DE ERRORES
    console.log("📝 [DOWNLOAD-PDF] Generando documento PDF...");

    let doc;
    try {
      doc = new PDFDocument({ margin: 50 });
    } catch (pdfError) {
      console.error(
        "❌ [DOWNLOAD-PDF] Error al crear documento PDF:",
        pdfError
      );
      return res.status(500).json({
        error: true,
        message: "Error al crear el documento PDF",
        details: pdfError.message,
      });
    }

    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));

    doc.on("end", () => {
      try {
        const pdfData = Buffer.concat(buffers);
        console.log(
          "✅ [DOWNLOAD-PDF] PDF generado exitosamente, tamaño:",
          pdfData.length
        );

        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment;filename=reserva_${bookingId}_${formatColombiaDate(
            new Date()
          ).replace(/\//g, "-")}.pdf`,
          "Content-Length": pdfData.length,
        });
        res.end(pdfData);

        console.log("📤 [DOWNLOAD-PDF] PDF enviado al cliente exitosamente");
      } catch (responseError) {
        console.error("❌ [DOWNLOAD-PDF] Error al enviar PDF:", responseError);
      }
    });

    doc.on("error", (pdfError) => {
      console.error("❌ [DOWNLOAD-PDF] Error en generación de PDF:", pdfError);
      if (!res.headersSent) {
        res.status(500).json({
          error: true,
          message: "Error al generar el PDF",
          details: pdfError.message,
        });
      }
    });

    try {
      // ⭐ ENCABEZADO DEL HOTEL
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("BALU HOTEL", { align: "center" });
      doc
        .fontSize(12)
        .font("Helvetica")
        .text("Comprobante de Reserva", { align: "center" });
      doc.moveDown(1.5);

      // ⭐ INFORMACIÓN DE LA RESERVA
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Información de la Reserva", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica");
      doc.text(`ID de Reserva: ${booking.bookingId}`);
      doc.text(`Estado: ${booking.status.toUpperCase()}`);
      doc.text(`Fecha de Creación: ${formatColombiaDate(booking.createdAt)}`);
      doc.text(`Punto de Venta: ${booking.pointOfSale || "Online"}`);
      doc.moveDown();

      // ⭐ INFORMACIÓN DEL HUÉSPED
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Información del Huésped", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica");
      doc.text(`Nombre: ${booking.guest?.scostumername || "No disponible"}`);
      doc.text(`Documento: ${booking.guest?.sdocno || booking.guestId}`);
      doc.text(
        `Email: ${booking.guest?.selectronicmail || "No proporcionado"}`
      );
      doc.text(`Teléfono: ${booking.guest?.stelephone || "No proporcionado"}`);
      doc.moveDown();

      // ⭐ INFORMACIÓN DE LA HABITACIÓN
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Información de la Habitación", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica");
      doc.text(`Habitación: ${booking.room?.roomNumber || booking.roomNumber}`);
      doc.text(`Tipo: ${booking.room?.type || "Standard"}`);
      doc.text(
        `Capacidad Máxima: ${
          booking.room?.maxGuests || "No especificada"
        } huéspedes`
      );
      doc.text(`Huéspedes Registrados: ${booking.guestCount}`);
      doc.moveDown();

      // ⭐ FECHAS DE ESTADÍA
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Fechas de Estadía", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica");
      doc.text(`Check-in: ${formatColombiaDate(booking.checkIn)}`);
      doc.text(`Check-out: ${formatColombiaDate(booking.checkOut)}`);
      doc.text(`Noches: ${nights}`);
      doc.moveDown();

      // ⭐ DESGLOSE FINANCIERO
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Desglose Financiero", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica");
      doc.text(
        `Tarifa Base (${nights} ${
          nights === 1 ? "noche" : "noches"
        }): $${baseAmount.toLocaleString()}`
      );

      // Mostrar cargos extras si existen
      if (bookingData.extraCharges && bookingData.extraCharges.length > 0) {
        doc.moveDown(0.3);
        doc.font("Helvetica-Bold").text("Cargos Adicionales:");
        doc.font("Helvetica");

        bookingData.extraCharges.forEach((charge) => {
          const chargeAmount = parseFloat(charge.amount || 0);
          const quantity = parseInt(charge.quantity || 1);
          const lineTotal = chargeAmount * quantity;
          doc.text(
            `  • ${
              charge.description
            }: $${chargeAmount.toLocaleString()} x ${quantity} = $${lineTotal.toLocaleString()}`
          );
        });

        doc.moveDown(0.3);
        doc.text(`Subtotal Extras: $${extraChargesTotal.toLocaleString()}`);
      }

      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(14);
      doc.text(`TOTAL: $${grandTotal.toLocaleString()}`);
      doc.font("Helvetica").fontSize(12);

      // ⭐ INFORMACIÓN DE PAGOS
      if (bookingData.payments && bookingData.payments.length > 0) {
        doc.moveDown();
        doc.font("Helvetica-Bold").text("Pagos Registrados:");
        doc.font("Helvetica");

        bookingData.payments.forEach((payment, index) => {
          doc.text(
            `  ${index + 1}. $${parseFloat(
              payment.amount
            ).toLocaleString()} - ${
              payment.paymentMethod
            } (${formatColombiaDate(payment.paymentDate)})`
          );
        });

        doc.moveDown(0.3);
        doc.text(`Total Pagado: $${totalPaid.toLocaleString()}`);

        const balance = grandTotal - totalPaid;
        if (balance > 0) {
          doc
            .font("Helvetica-Bold")
            .text(`Saldo Pendiente: $${balance.toLocaleString()}`);
        } else {
          doc.font("Helvetica-Bold").text("✓ TOTALMENTE PAGADO");
        }
        doc.font("Helvetica");
      } else {
        doc.moveDown();
        doc.text("Estado de Pago: Pendiente");
      }

      // ⭐ SECCIÓN DE CANCELACIÓN (NUEVA)
      doc.moveDown(2);
      doc.fontSize(10).text("═".repeat(60), { align: "center" });
      doc.moveDown(0.5);

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("¿Necesitas cancelar o modificar tu reserva?", {
          align: "center",
        });

      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      doc.text("Hotel Balú - Políticas de Cancelación:", { align: "center" });
      doc.moveDown(0.3);

      doc.text("• Modificaciones de fechas: Mínimo 5 días de anticipación", {
        align: "center",
      });
      doc.text("• Más de 5 días antes: Crédito válido por 30 días calendario", {
        align: "center",
      });
      doc.text("• Menos de 5 días: El hotel retiene el anticipo", {
        align: "center",
      });
      doc.text("• No se realizan devoluciones de dinero", { align: "center" });

      doc.moveDown(0.5);
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Enlace de Cancelación:", { align: "center" });
      doc.fontSize(9).font("Helvetica").text(cancellationUrl, {
        align: "center",
        link: cancellationUrl,
        underline: true,
      });

      doc.moveDown(0.3);
      doc
        .fontSize(8)
        .text(
          `Enlace válido hasta: ${formatColombiaDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          )}`,
          {
            align: "center",
          }
        );

      // ⭐ ENLACE DE SEGUIMIENTO
      doc.moveDown(1.5);
      doc.fontSize(10).text("═".repeat(60), { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Seguimiento de Reserva", { align: "center" });
      doc.fontSize(10).font("Helvetica");
      doc.text(`Consulta el estado actualizado de tu reserva en:`, {
        align: "center",
      });
      doc.text(`${process.env.FRONT_URL}/booking-status/${trackingToken}`, {
        align: "center",
        link: `${process.env.FRONT_URL}/booking-status/${trackingToken}`,
      });

      // ⭐ CONTACTO DE EMERGENCIA
      doc.moveDown(1);
      doc.fontSize(10).text("═".repeat(60), { align: "center" });
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Contacto Hotel Balú", { align: "center" });
      doc.fontSize(9).font("Helvetica");
      doc.text("Email: reservas@baluhotel.com", { align: "center" });
      doc.text("Teléfono: +57 300 123 4567", { align: "center" });
      doc.text("Atención al cliente: 24 horas", { align: "center" });

      // ⭐ PIE DE PÁGINA
      doc.moveDown(1);
      doc.fontSize(8).text("═".repeat(80), { align: "center" });
      doc.text(`Documento generado el ${formatForLogs(getColombiaTime())}`, {
        align: "center",
      });
      doc.text("Este es un documento oficial de Balu Hotel", {
        align: "center",
      });
      doc.text("Habitaciones sujetas a disponibilidad previa del hotel", {
        align: "center",
      });

      console.log("✅ [DOWNLOAD-PDF] Contenido del PDF escrito exitosamente");
      doc.end();
    } catch (contentError) {
      console.error(
        "❌ [DOWNLOAD-PDF] Error al escribir contenido del PDF:",
        contentError
      );
      if (!res.headersSent) {
        res.status(500).json({
          error: true,
          message: "Error al generar el contenido del PDF",
          details: contentError.message,
        });
      }
    }
  } catch (error) {
    console.error("❌ [DOWNLOAD-PDF] Error general:", error);
    console.error(
      "🕐 [DOWNLOAD-PDF] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    if (!res.headersSent) {
      res.status(500).json({
        error: true,
        message: "Error interno al generar el PDF",
        details: error.message,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }
  }
};

const getBookingByToken = async (req, res, next) => {
  try {
    console.log(
      "🔍 [GET-BOOKING-BY-TOKEN] Iniciando consulta de reserva por token"
    );
    console.log(
      "🕐 [GET-BOOKING-BY-TOKEN] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log(
      "📥 [GET-BOOKING-BY-TOKEN] trackingToken:",
      req.params.trackingToken
    );

    const { trackingToken } = req.params;

    // ⭐ VALIDACIONES BÁSICAS CON LOGS
    if (!trackingToken) {
      console.log("❌ [GET-BOOKING-BY-TOKEN] trackingToken faltante");
      return res.status(400).json({
        error: true,
        message: "Token de seguimiento es requerido",
      });
    }

    console.log("✅ [GET-BOOKING-BY-TOKEN] Token recibido, verificando...");

    // ⭐ VERIFICAR Y DECODIFICAR EL TOKEN CON MANEJO DE ERRORES
    let decoded;
    try {
      decoded = jwt.verify(trackingToken, process.env.BOOKING_SECRET);
      console.log("✅ [GET-BOOKING-BY-TOKEN] Token verificado exitosamente:", {
        bookingId: decoded.bookingId,
        iat: decoded.iat,
        exp: decoded.exp,
        issuedAt: formatForLogs(new Date(decoded.iat * 1000)),
        expiresAt: formatForLogs(new Date(decoded.exp * 1000)),
      });
    } catch (tokenError) {
      console.error(
        "❌ [GET-BOOKING-BY-TOKEN] Error al verificar token:",
        tokenError.message
      );

      let errorMessage = "Token de seguimiento inválido";
      if (tokenError.name === "TokenExpiredError") {
        errorMessage = "Token de seguimiento expirado";
      } else if (tokenError.name === "JsonWebTokenError") {
        errorMessage = "Token de seguimiento malformado";
      }

      return res.status(401).json({
        error: true,
        message: errorMessage,
        details: tokenError.message,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    const bookingId = decoded.bookingId;

    if (!bookingId) {
      console.log("❌ [GET-BOOKING-BY-TOKEN] bookingId no encontrado en token");
      return res.status(400).json({
        error: true,
        message: "Token no contiene un ID de reserva válido",
      });
    }

    console.log("🔍 [GET-BOOKING-BY-TOKEN] Buscando reserva:", bookingId);

    // ⭐ OBTENER DATOS COMPLETOS DE LA RESERVA CON INCLUDES MEJORADOS
    const booking = await Booking.findOne({
      where: { bookingId },
      include: [
        {
          model: Room,
          as: "room",
          attributes: [
            "roomNumber",
            "type",
            "description",
            "maxGuests",
            "status",
          ],
          include: [
            {
              model: BasicInventory,
              as: "BasicInventories",
              attributes: ["id", "name", "description", "inventoryType"],
              through: {
                attributes: ["quantity", "isRequired"],
                as: "RoomBasics",
              },
              required: false,
            },
          ],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: [
            "sdocno",
            "scostumername",
            "selectronicmail",
            "stelephone",
          ],
        },
        {
          model: ExtraCharge,
          as: "extraCharges",
          attributes: [
            "id",
            "description",
            "amount",
            "quantity",
            "chargeDate",
            "chargeType",
          ],
          required: false,
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "paymentId",
            "amount",
            "paymentMethod",
            "paymentStatus",
            "paymentDate",
            "paymentType",
            "transactionId",
            "paymentReference",
          ],
          required: false,
        },
        {
          model: Bill,
          as: "bill",
          attributes: [
            "idBill",
            "totalAmount",
            "status",
            "createdAt",
            "taxInvoiceId",
          ],
          required: false,
        },
        {
          model: BookingInventoryUsage,
          as: "inventoryUsages",
          include: [
            {
              model: BasicInventory,
              as: "inventory",
              attributes: ["id", "name", "inventoryType", "category"],
            },
          ],
          required: false,
        },
      ],
    });

    if (!booking) {
      console.log(
        "❌ [GET-BOOKING-BY-TOKEN] Reserva no encontrada:",
        bookingId
      );
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [GET-BOOKING-BY-TOKEN] Reserva encontrada:", {
      bookingId: booking.bookingId,
      status: booking.status,
      guestName: booking.guest?.scostumername,
      roomNumber: booking.room?.roomNumber || booking.roomNumber,
      hasPayments: booking.payments?.length > 0,
      hasExtraCharges: booking.extraCharges?.length > 0,
      hasBill: !!booking.bill,
    });

    // ⭐ PROCESAR DATOS DE LA RESERVA CON INFORMACIÓN CALCULADA
    const bookingData = booking.toJSON();

    // ⭐ CALCULAR INFORMACIÓN FINANCIERA
    const baseAmount = parseFloat(bookingData.totalAmount || 0);
    const extraCharges = bookingData.extraCharges || [];
    const payments = bookingData.payments || [];

    const totalExtras = extraCharges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount || 0);
      const quantity = parseInt(charge.quantity || 1);
      return sum + amount * quantity;
    }, 0);

    const totalPaid = payments
      .filter((payment) => payment.paymentStatus === "completed")
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

    const totalPending = payments
      .filter((payment) => payment.paymentStatus === "pending")
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

    const grandTotal = baseAmount + totalExtras;
    const balance = Math.max(0, grandTotal - totalPaid);

    // ⭐ ESTADO DE PAGO
    let paymentStatus = "unpaid";
    if (totalPaid >= grandTotal) {
      paymentStatus = "fully_paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partially_paid";
    }

    // ⭐ INFORMACIÓN DE INVENTARIO
    const inventoryUsages = bookingData.inventoryUsages || [];
    const inventoryInfo = {
      hasInventory: inventoryUsages.length > 0,
      totalItems: inventoryUsages.length,
      itemsAssigned: inventoryUsages.filter((u) => u.status === "assigned")
        .length,
      itemsReturned: inventoryUsages.filter((u) => u.status === "returned")
        .length,
      itemsConsumed: inventoryUsages.filter((u) => u.status === "consumed")
        .length,
      readyForCheckOut:
        inventoryUsages.length > 0 &&
        inventoryUsages.every(
          (u) => u.status === "returned" || u.status === "consumed"
        ),
    };

    // ⭐ CALCULAR NOCHES DE ESTADÍA
    const nights = getDaysDifference(bookingData.checkIn, bookingData.checkOut);

    // ⭐ ESTADO DE LA RESERVA
    const now = getColombiaTime();
    const checkInDate = new Date(bookingData.checkIn);
    const checkOutDate = new Date(bookingData.checkOut);

    const bookingStatus = {
      canCheckIn:
        bookingData.status === "confirmed" &&
        checkInDate <= now &&
        paymentStatus !== "unpaid",
      canCheckOut:
        bookingData.status === "checked-in" &&
        paymentStatus === "fully_paid" &&
        inventoryInfo.readyForCheckOut,
      isActive: ["confirmed", "checked-in"].includes(bookingData.status),
      isCompleted: bookingData.status === "completed",
      isCancelled: bookingData.status === "cancelled",
      isOverdue: bookingData.status === "checked-in" && now > checkOutDate,
      daysSinceCheckIn:
        bookingData.status === "checked-in" && bookingData.actualCheckIn
          ? Math.floor(
              (now - new Date(bookingData.actualCheckIn)) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
      daysUntilCheckIn:
        bookingData.status === "confirmed"
          ? Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24))
          : 0,
      daysUntilCheckOut: ["confirmed", "checked-in"].includes(
        bookingData.status
      )
        ? Math.ceil((checkOutDate - now) / (1000 * 60 * 60 * 24))
        : 0,
    };

    // ⭐ PREPARAR RESPUESTA ENRIQUECIDA
    const responseData = {
      ...bookingData,

      // ⭐ FECHAS FORMATEADAS EN ZONA HORARIA DE COLOMBIA
      checkInFormatted: formatColombiaDate(bookingData.checkIn),
      checkOutFormatted: formatColombiaDate(bookingData.checkOut),
      createdAtFormatted: formatForLogs(bookingData.createdAt),
      actualCheckInFormatted: bookingData.actualCheckIn
        ? formatForLogs(bookingData.actualCheckIn)
        : null,
      actualCheckOutFormatted: bookingData.actualCheckOut
        ? formatForLogs(bookingData.actualCheckOut)
        : null,

      // ⭐ INFORMACIÓN FINANCIERA CALCULADA
      financialSummary: {
        baseAmount,
        totalExtras,
        grandTotal,
        totalPaid,
        totalPending,
        balance,
        paymentStatus,
        isFullyPaid: paymentStatus === "fully_paid",
        hasExtraCharges: totalExtras > 0,
        paymentsCount: payments.filter((p) => p.paymentStatus === "completed")
          .length,
        pendingPaymentsCount: payments.filter(
          (p) => p.paymentStatus === "pending"
        ).length,
        // Formateos para mostrar
        baseAmountFormatted: `$${baseAmount.toLocaleString()}`,
        totalExtrasFormatted: `$${totalExtras.toLocaleString()}`,
        grandTotalFormatted: `$${grandTotal.toLocaleString()}`,
        totalPaidFormatted: `$${totalPaid.toLocaleString()}`,
        balanceFormatted: `$${balance.toLocaleString()}`,
        paymentPercentage:
          grandTotal > 0 ? Math.round((totalPaid / grandTotal) * 100) : 0,
      },

      // ⭐ INFORMACIÓN DE ESTADÍA
      stayInfo: {
        nights,
        guestCount: bookingData.guestCount,
        pointOfSale: bookingData.pointOfSale || "Online",
        isOnlineBooking: (bookingData.pointOfSale || "Online") === "Online",
        checkInTime: formatForDisplay(checkInDate),
        checkOutTime: formatForDisplay(checkOutDate),
        totalDuration: `${nights} ${nights === 1 ? "noche" : "noches"}`,
      },

      // ⭐ ESTADO DE LA RESERVA
      bookingStatus,

      // ⭐ INFORMACIÓN DE INVENTARIO
      inventoryInfo,

      // ⭐ INFORMACIÓN DE LA HABITACIÓN
      roomInfo: bookingData.room
        ? {
            number: bookingData.room.roomNumber,
            type: bookingData.room.type,
            description: bookingData.room.description,
            maxGuests: bookingData.room.maxGuests,
            currentStatus: bookingData.room.status,
            hasBasicInventory:
              bookingData.room.BasicInventories &&
              bookingData.room.BasicInventories.length > 0,
          }
        : null,

      // ⭐ INFORMACIÓN DEL HUÉSPED
      guestInfo: bookingData.guest
        ? {
            name: bookingData.guest.scostumername,
            document: bookingData.guest.sdocno,
            email: bookingData.guest.selectronicmail,
            phone: bookingData.guest.stelephone,
          }
        : null,

      // ⭐ INFORMACIÓN DE FACTURACIÓN
      billInfo: bookingData.bill
        ? {
            billId: bookingData.bill.idBill,
            totalAmount: bookingData.bill.totalAmount,
            status: bookingData.bill.status,
            createdAt: formatForLogs(bookingData.bill.createdAt),
            hasTaxInvoice: !!bookingData.bill.taxInvoiceId,
            taxInvoiceId: bookingData.bill.taxInvoiceId,
          }
        : null,

      // ⭐ ACCIONES DISPONIBLES
      availableActions: {
        canViewDetails: true,
        canDownloadPdf: true,
        canModify:
          ["confirmed"].includes(bookingData.status) &&
          bookingStatus.daysUntilCheckIn > 1,
        canCancel:
          ["confirmed"].includes(bookingData.status) &&
          bookingStatus.daysUntilCheckIn > 0,
        canMakePayment: balance > 0 && !bookingStatus.isCancelled,
        canCheckIn: bookingStatus.canCheckIn,
        canCheckOut: bookingStatus.canCheckOut,
        canGenerateBill:
          ["checked-in", "completed"].includes(bookingData.status) &&
          !bookingData.bill,
      },

      // ⭐ METADATOS
      metadata: {
        lastUpdated: formatForLogs(bookingData.updatedAt),
        tokenIssuedAt: formatForLogs(new Date(decoded.iat * 1000)),
        tokenExpiresAt: formatForLogs(new Date(decoded.exp * 1000)),
        consultedAt: formatForLogs(getColombiaTime()),
        trackingUrl: `${process.env.FRONT_URL}/booking-status/${trackingToken}`,
        pdfDownloadUrl: `${process.env.API_URL}/bookings/download-pdf/${trackingToken}`,
      },
    };

    console.log("📤 [GET-BOOKING-BY-TOKEN] Respuesta preparada:", {
      bookingId: responseData.bookingId,
      status: responseData.status,
      paymentStatus: responseData.financialSummary.paymentStatus,
      balance: responseData.financialSummary.balanceFormatted,
      nights: responseData.stayInfo.nights,
      hasActions: Object.values(responseData.availableActions).some(
        (action) => action === true
      ),
      completedAt: formatForLogs(getColombiaTime()),
    });

    res.json({
      error: false,
      message: "Reserva obtenida exitosamente",
      data: responseData,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [GET-BOOKING-BY-TOKEN] Error general:", error);
    console.error(
      "🕐 [GET-BOOKING-BY-TOKEN] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    // Si no se han enviado headers, enviar error JSON
    if (!res.headersSent) {
      res.status(500).json({
        error: true,
        message: "Error interno al obtener la reserva",
        details: error.message,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    console.log(
      "👤 [GET-USER-BOOKINGS] Iniciando consulta de reservas de usuario"
    );
    console.log(
      "🕐 [GET-USER-BOOKINGS] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log("📥 [GET-USER-BOOKINGS] Parámetros recibidos:", {
      paramsUserId: req.params.sdocno,
      buyerUserId: req.buyer?.sdocno,
      hasReqBuyer: !!req.buyer,
      hasReqUser: !!req.user,
    });

    // ⭐ OBTENER IDENTIFICADOR DE USUARIO CON VALIDACIÓN MEJORADA
    const userId = req.params.sdocno || req.buyer?.sdocno;

    if (!userId) {
      console.log(
        "❌ [GET-USER-BOOKINGS] Identificador de usuario no encontrado"
      );
      return res.status(400).json({
        error: true,
        message: "Identificador de usuario no encontrado en el token",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [GET-USER-BOOKINGS] Usuario identificado:", userId);

    // ⭐ PARÁMETROS DE CONSULTA OPCIONALES
    const {
      status,
      limit = 50,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "DESC",
      includeCompleted = "true",
      fromDate,
      toDate,
    } = req.query;

    console.log("🔍 [GET-USER-BOOKINGS] Filtros aplicados:", {
      status,
      limit,
      page,
      sortBy,
      sortOrder,
      includeCompleted,
      fromDate,
      toDate,
    });

    // ⭐ CONSTRUIR FILTROS DE BÚSQUEDA
    const whereConditions = { guestId: userId };

    if (status) {
      whereConditions.status = status;
    }

    if (includeCompleted === "false") {
      whereConditions.status = {
        [Op.not]: "completed",
      };
    }

    // ⭐ FILTRO POR RANGO DE FECHAS
    if (fromDate || toDate) {
      whereConditions.checkIn = {};
      if (fromDate) {
        whereConditions.checkIn[Op.gte] = toColombiaTime(fromDate);
      }
      if (toDate) {
        whereConditions.checkIn[Op.lte] = toColombiaTime(toDate);
      }
    }

    console.log("🔍 [GET-USER-BOOKINGS] Condiciones WHERE:", whereConditions);

    // ⭐ CONSULTAR RESERVAS CON INCLUDES COMPLETOS
    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Room,
          as: "room",
          attributes: [
            "roomNumber",
            "type",
            "description",
            "maxGuests",
            "status",
          ],
          include: [
            {
              model: BasicInventory,
              as: "BasicInventories",
              attributes: ["id", "name", "inventoryType", "description"],
              through: {
                attributes: ["quantity", "isRequired"],
                as: "RoomBasics",
              },
              required: false,
            },
          ],
        },
        {
          model: ExtraCharge,
          as: "extraCharges",
          attributes: [
            "id",
            "description",
            "amount",
            "quantity",
            "chargeDate",
            "chargeType",
          ],
          required: false,
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "paymentId",
            "amount",
            "paymentMethod",
            "paymentStatus",
            "paymentDate",
            "paymentType",
            "transactionId",
            "paymentReference",
          ],
          required: false,
        },
        {
          model: Bill,
          as: "bill",
          attributes: [
            "idBill",
            "totalAmount",
            "status",
            "createdAt",
            "taxInvoiceId",
          ],
          required: false,
        },
        {
          model: BookingInventoryUsage,
          as: "inventoryUsages",
          include: [
            {
              model: BasicInventory,
              as: "inventory",
              attributes: ["id", "name", "inventoryType", "category"],
            },
          ],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true,
    });

    if (!bookings || bookings.length === 0) {
      console.log(
        "📭 [GET-USER-BOOKINGS] No se encontraron reservas para el usuario:",
        userId
      );
      return res.json({
        error: false,
        message: "No se encontraron reservas para este usuario",
        data: {
          bookings: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0,
          },
          summary: {
            totalBookings: 0,
            byStatus: {},
            upcomingBookings: 0,
            completedBookings: 0,
          },
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [GET-USER-BOOKINGS] Reservas encontradas:", {
      count,
      bookingsReturned: bookings.length,
      userId,
    });

    // ⭐ PROCESAR DATOS DE RESERVAS CON INFORMACIÓN CALCULADA
    const now = getColombiaTime();
    const processedBookings = bookings.map((booking) => {
      const bookingData = booking.toJSON();

      // ⭐ CALCULAR INFORMACIÓN FINANCIERA
      const baseAmount = parseFloat(bookingData.totalAmount || 0);
      const extraCharges = bookingData.extraCharges || [];
      const payments = bookingData.payments || [];

      const totalExtras = extraCharges.reduce((sum, charge) => {
        const amount = parseFloat(charge.amount || 0);
        const quantity = parseInt(charge.quantity || 1);
        return sum + amount * quantity;
      }, 0);

      const totalPaid = payments
        .filter((payment) => payment.paymentStatus === "completed")
        .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

      const grandTotal = baseAmount + totalExtras;
      const balance = Math.max(0, grandTotal - totalPaid);

      // ⭐ ESTADO DE PAGO
      let paymentStatus = "unpaid";
      if (totalPaid >= grandTotal) {
        paymentStatus = "fully_paid";
      } else if (totalPaid > 0) {
        paymentStatus = "partially_paid";
      }

      // ⭐ CALCULAR NOCHES DE ESTADÍA
      const nights = getDaysDifference(
        bookingData.checkIn,
        bookingData.checkOut
      );

      // ⭐ ESTADO DE LA RESERVA
      const checkInDate = toColombiaTime(bookingData.checkIn);
      const checkOutDate = toColombiaTime(bookingData.checkOut);

      const bookingStatus = {
        isUpcoming: bookingData.status === "confirmed" && checkInDate > now,
        isActive: ["confirmed", "checked-in"].includes(bookingData.status),
        isCompleted: bookingData.status === "completed",
        isCancelled: bookingData.status === "cancelled",
        canCancel: bookingData.status === "confirmed" && checkInDate > now,
        canModify: bookingData.status === "confirmed" && checkInDate > now,
        canCheckIn:
          bookingData.status === "confirmed" &&
          checkInDate <= now &&
          paymentStatus !== "unpaid",
        daysUntilCheckIn:
          bookingData.status === "confirmed"
            ? Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24))
            : 0,
        daysUntilCheckOut: ["confirmed", "checked-in"].includes(
          bookingData.status
        )
          ? Math.ceil((checkOutDate - now) / (1000 * 60 * 60 * 24))
          : 0,
      };

      // ⭐ INFORMACIÓN DE INVENTARIO
      const inventoryUsages = bookingData.inventoryUsages || [];
      const inventoryInfo = {
        hasInventory: inventoryUsages.length > 0,
        totalItems: inventoryUsages.length,
        itemsAssigned: inventoryUsages.filter((u) => u.status === "assigned")
          .length,
        itemsReturned: inventoryUsages.filter((u) => u.status === "returned")
          .length,
        itemsConsumed: inventoryUsages.filter((u) => u.status === "consumed")
          .length,
      };

      return {
        ...bookingData,

        // ⭐ FECHAS FORMATEADAS EN ZONA HORARIA DE COLOMBIA
        checkInFormatted: formatColombiaDate(bookingData.checkIn),
        checkOutFormatted: formatColombiaDate(bookingData.checkOut),
        createdAtFormatted: formatForLogs(bookingData.createdAt),
        actualCheckInFormatted: bookingData.actualCheckIn
          ? formatForLogs(bookingData.actualCheckIn)
          : null,
        actualCheckOutFormatted: bookingData.actualCheckOut
          ? formatForLogs(bookingData.actualCheckOut)
          : null,

        // ⭐ INFORMACIÓN FINANCIERA CALCULADA
        financialSummary: {
          baseAmount,
          totalExtras,
          grandTotal,
          totalPaid,
          balance,
          paymentStatus,
          isFullyPaid: paymentStatus === "fully_paid",
          hasExtraCharges: totalExtras > 0,
          paymentsCount: payments.filter((p) => p.paymentStatus === "completed")
            .length,
          pendingPaymentsCount: payments.filter(
            (p) => p.paymentStatus === "pending"
          ).length,
          // Formateos para mostrar
          baseAmountFormatted: `$${baseAmount.toLocaleString()}`,
          totalExtrasFormatted: `$${totalExtras.toLocaleString()}`,
          grandTotalFormatted: `$${grandTotal.toLocaleString()}`,
          totalPaidFormatted: `$${totalPaid.toLocaleString()}`,
          balanceFormatted: `$${balance.toLocaleString()}`,
          paymentPercentage:
            grandTotal > 0 ? Math.round((totalPaid / grandTotal) * 100) : 0,
        },

        // ⭐ INFORMACIÓN DE ESTADÍA
        stayInfo: {
          nights,
          guestCount: bookingData.guestCount,
          pointOfSale: bookingData.pointOfSale || "Online",
          isOnlineBooking: (bookingData.pointOfSale || "Online") === "Online",
          checkInTime: formatForDisplay(checkInDate),
          checkOutTime: formatForDisplay(checkOutDate),
          totalDuration: `${nights} ${nights === 1 ? "noche" : "noches"}`,
        },

        // ⭐ ESTADO DE LA RESERVA
        bookingStatus,

        // ⭐ INFORMACIÓN DE INVENTARIO
        inventoryInfo,

        // ⭐ INFORMACIÓN DE LA HABITACIÓN
        roomInfo: bookingData.room
          ? {
              number: bookingData.room.roomNumber,
              type: bookingData.room.type,
              description: bookingData.room.description,
              maxGuests: bookingData.room.maxGuests,
              currentStatus: bookingData.room.status,
              hasBasicInventory:
                bookingData.room.BasicInventories &&
                bookingData.room.BasicInventories.length > 0,
            }
          : null,

        // ⭐ INFORMACIÓN DE FACTURACIÓN
        billInfo: bookingData.bill
          ? {
              billId: bookingData.bill.idBill,
              totalAmount: bookingData.bill.totalAmount,
              status: bookingData.bill.status,
              createdAt: formatForLogs(bookingData.bill.createdAt),
              hasTaxInvoice: !!bookingData.bill.taxInvoiceId,
              taxInvoiceId: bookingData.bill.taxInvoiceId,
            }
          : null,

        // ⭐ ACCIONES DISPONIBLES
        availableActions: {
          canViewDetails: true,
          canModify: bookingStatus.canModify,
          canCancel: bookingStatus.canCancel,
          canMakePayment: balance > 0 && !bookingStatus.isCancelled,
          canCheckIn: bookingStatus.canCheckIn,
          canDownloadReceipt:
            bookingData.bill || paymentStatus === "fully_paid",
          canContactSupport: true,
        },
      };
    });

    // ⭐ CREAR RESUMEN DE RESERVAS
    const summary = {
      totalBookings: count,
      bookingsByStatus: {
        confirmed: processedBookings.filter((b) => b.status === "confirmed")
          .length,
        checkedIn: processedBookings.filter((b) => b.status === "checked-in")
          .length,
        completed: processedBookings.filter((b) => b.status === "completed")
          .length,
        cancelled: processedBookings.filter((b) => b.status === "cancelled")
          .length,
      },
      upcomingBookings: processedBookings.filter(
        (b) => b.bookingStatus.isUpcoming
      ).length,
      activeBookings: processedBookings.filter((b) => b.bookingStatus.isActive)
        .length,
      completedBookings: processedBookings.filter(
        (b) => b.bookingStatus.isCompleted
      ).length,
      totalSpent: processedBookings
        .filter((b) => b.bookingStatus.isCompleted)
        .reduce((sum, b) => sum + b.financialSummary.totalPaid, 0),
      totalPending: processedBookings
        .filter((b) => b.bookingStatus.isActive)
        .reduce((sum, b) => sum + b.financialSummary.balance, 0),
      // Formateos
      totalSpentFormatted: `$${processedBookings
        .filter((b) => b.bookingStatus.isCompleted)
        .reduce((sum, b) => sum + b.financialSummary.totalPaid, 0)
        .toLocaleString()}`,
      totalPendingFormatted: `$${processedBookings
        .filter((b) => b.bookingStatus.isActive)
        .reduce((sum, b) => sum + b.financialSummary.balance, 0)
        .toLocaleString()}`,
    };

    console.log("📊 [GET-USER-BOOKINGS] Resumen generado:", {
      total: summary.totalBookings,
      upcoming: summary.upcomingBookings,
      active: summary.activeBookings,
      completed: summary.completedBookings,
      totalSpent: summary.totalSpentFormatted,
    });

    // ⭐ PREPARAR RESPUESTA ENRIQUECIDA
    const responseData = {
      bookings: processedBookings,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < count,
        hasPrev: parseInt(page) > 1,
      },
      summary,
      queryInfo: {
        userId,
        filters: { status, includeCompleted, fromDate, toDate },
        sorting: { sortBy, sortOrder },
        timestamp: formatForLogs(getColombiaTime()),
      },
    };

    console.log("📤 [GET-USER-BOOKINGS] Respuesta preparada:", {
      bookingsCount: responseData.bookings.length,
      totalCount: responseData.pagination.total,
      currentPage: responseData.pagination.page,
      totalPages: responseData.pagination.totalPages,
      completedAt: formatForLogs(getColombiaTime()),
    });

    res.json({
      error: false,
      message: `${count} reserva(s) obtenida(s) exitosamente para el usuario`,
      data: responseData,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [GET-USER-BOOKINGS] Error general:", error);
    console.error(
      "🕐 [GET-USER-BOOKINGS] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error interno al obtener las reservas del usuario",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    console.log(
      "🔍 [GET-BOOKING-BY-ID] Iniciando búsqueda de reserva:",
      req.params.bookingId
    );
    console.log(
      "🕐 [GET-BOOKING-BY-ID] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );

    const { bookingId } = req.params;

    // ⭐ VALIDACIONES BÁSICAS CON LOGS
    if (!bookingId) {
      console.log("❌ [GET-BOOKING-BY-ID] bookingId faltante");
      return res.status(400).json({
        error: true,
        message: "bookingId es requerido",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("🔍 [GET-BOOKING-BY-ID] Buscando reserva:", bookingId);

    // ⭐ OBTENER DATOS COMPLETOS DE LA RESERVA CON INCLUDES MEJORADOS
    const booking = await Booking.findOne({
      where: { bookingId },
      include: [
        {
          model: Room,
          as: "room",
          attributes: [
            "roomNumber",
            "type",
            "description",
            "maxGuests",
            "status",
            "isActive",
          ],
          include: [
            {
              model: BasicInventory,
              as: "BasicInventories",
              attributes: [
                "id",
                "name",
                "description",
                "inventoryType",
                "currentStock",
                "cleanStock",
                "category",
              ],
              through: {
                attributes: ["quantity", "isRequired", "priority"],
                as: "RoomBasics",
              },
              required: false,
            },
          ],
        },
        {
          model: ExtraCharge,
          as: "extraCharges",
          attributes: [
            "id",
            "description",
            "amount",
            "quantity",
            "chargeDate",
            "chargeType",
            "notes",
          ],
          required: false,
        },
        {
          model: Bill,
          as: "bill",
          attributes: [
            "idBill",
            "totalAmount",
            "status",
            "createdAt",
            "taxInvoiceId",
            "paymentMethod",
          ],
          required: false,
        },
        {
          model: Buyer,
          as: "guest",
          attributes: [
            "sdocno",
            "scostumername",
            "selectronicmail",
            "stelephone",
          ],
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "paymentId",
            "amount",
            "paymentMethod",
            "paymentStatus",
            "paymentDate",
            "paymentType",
            "transactionId",
            "paymentReference",
            "processedBy",
          ],
          required: false,
        },
        {
          model: RegistrationPass,
          as: "registrationPasses",
          attributes: [
            "registrationNumber",
            "checkInDate",
            "name",
            "nationality",
            "maritalStatus",
            "profession",
            "stayDuration",
            "checkInTime",
            "numberOfPeople",
            "destination",
            "idNumber",
            "idIssuingPlace",
            "foreignIdOrPassport",
            "address",
            "phoneNumber",
            "bookingId",
            "roomNumber",
          ],
          required: false,
        },
        {
          model: BookingInventoryUsage,
          as: "inventoryUsages",
          attributes: [
            "quantityAssigned",
            "quantityConsumed",
            "quantityReturned",
            "status",
            "assignedAt",
            "returnedAt",
            "notes",
          ],
          include: [
            {
              model: BasicInventory,
              as: "inventory",
              attributes: [
                "id",
                "name",
                "inventoryType",
                "category",
                "description",
              ],
            },
          ],
          required: false,
        },
      ],
    });

    if (!booking) {
      console.log("❌ [GET-BOOKING-BY-ID] Reserva no encontrada:", bookingId);
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
        timestamp: formatForLogs(getColombiaTime()),
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
      hasInventoryUsages: booking.inventoryUsages?.length > 0,
    });

    // ⭐ PROCESAR DATOS DE LA RESERVA CON INFORMACIÓN CALCULADA
    const bookingData = booking.toJSON();

    // ⭐ CALCULAR INFORMACIÓN FINANCIERA COMPLETA
    const baseAmount = parseFloat(bookingData.totalAmount || 0);
    const extraCharges = bookingData.extraCharges || [];
    const payments = bookingData.payments || [];

    const totalExtras = extraCharges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount || 0);
      const quantity = parseInt(charge.quantity || 1);
      return sum + amount * quantity;
    }, 0);

    const totalPaid = payments
      .filter((payment) => payment.paymentStatus === "completed")
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

    const totalPending = payments
      .filter((payment) => payment.paymentStatus === "pending")
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

    const grandTotal = baseAmount + totalExtras;
    const balance = Math.max(0, grandTotal - totalPaid);

    // ⭐ ESTADO DE PAGO
    let paymentStatus = "unpaid";
    if (totalPaid >= grandTotal) {
      paymentStatus = "fully_paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partially_paid";
    }

    // ⭐ CALCULAR ESTADO DEL INVENTARIO CON MAYOR DETALLE
    const inventoryUsages = bookingData.inventoryUsages || [];
    const inventoryStatus = {
      hasInventoryAssigned: inventoryUsages.length > 0,
      totalItemsAssigned: inventoryUsages.length,
      itemsReturned: inventoryUsages.filter((u) => u.status === "returned")
        .length,
      itemsConsumed: inventoryUsages.filter((u) => u.status === "consumed")
        .length,
      itemsPending: inventoryUsages.filter(
        (u) => u.status === "assigned" || u.status === "in_use"
      ).length,
      canProceedCheckOut:
        bookingData.status === "checked-in" &&
        inventoryUsages.length > 0 &&
        inventoryUsages.every(
          (u) => u.status === "returned" || u.status === "consumed"
        ),
      inventoryDetails: inventoryUsages.map((usage) => ({
        id: usage.inventory?.id,
        name: usage.inventory?.name,
        type: usage.inventory?.inventoryType,
        category: usage.inventory?.category,
        assigned: usage.quantityAssigned,
        consumed: usage.quantityConsumed,
        returned: usage.quantityReturned,
        status: usage.status,
        assignedAt: usage.assignedAt ? formatForLogs(usage.assignedAt) : null,
        returnedAt: usage.returnedAt ? formatForLogs(usage.returnedAt) : null,
        notes: usage.notes,
      })),
    };

    // ⭐ INFORMACIÓN DE CARGOS EXTRAS MEJORADA
    const extraChargesInfo = {
      hasExtraCharges: extraCharges.length > 0,
      totalExtraCharges: totalExtras,
      extraChargesCount: extraCharges.length,
      extraChargesDetails: extraCharges.map((charge) => ({
        id: charge.id,
        description: charge.description,
        amount: parseFloat(charge.amount || 0),
        quantity: parseInt(charge.quantity || 1),
        totalAmount:
          parseFloat(charge.amount || 0) * parseInt(charge.quantity || 1),
        chargeType: charge.chargeType,
        chargeDate: formatForLogs(charge.chargeDate),
        notes: charge.notes,
        amountFormatted: `$${parseFloat(charge.amount || 0).toLocaleString()}`,
      })),
    };

    // ⭐ INFORMACIÓN DE PAGOS MEJORADA
    const paymentInfo = {
      totalPaid,
      totalPending,
      totalAmount: baseAmount,
      grandTotal,
      balance,
      paymentStatus,
      isFullyPaid: paymentStatus === "fully_paid",
      paymentCount: payments.filter((p) => p.paymentStatus === "completed")
        .length,
      pendingPaymentsCount: payments.filter(
        (p) => p.paymentStatus === "pending"
      ).length,
      lastPayment: payments.find((p) => p.paymentStatus === "completed"),
      allPayments: payments.map((payment) => ({
        paymentId: payment.paymentId,
        amount: parseFloat(payment.amount || 0),
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        paymentType: payment.paymentType,
        paymentDate: formatForLogs(payment.paymentDate),
        transactionId: payment.transactionId,
        paymentReference: payment.paymentReference,
        processedBy: payment.processedBy,
        amountFormatted: `$${parseFloat(payment.amount || 0).toLocaleString()}`,
      })),
      // Formateos
      totalPaidFormatted: `$${totalPaid.toLocaleString()}`,
      balanceFormatted: `$${balance.toLocaleString()}`,
      grandTotalFormatted: `$${grandTotal.toLocaleString()}`,
      paymentPercentage:
        grandTotal > 0 ? Math.round((totalPaid / grandTotal) * 100) : 0,
    };

    // ⭐ INFORMACIÓN DE LA HABITACIÓN MEJORADA
    const roomInfo = bookingData.room
      ? {
          roomNumber: bookingData.room.roomNumber,
          type: bookingData.room.type,
          description: bookingData.room.description,
          maxGuests: bookingData.room.maxGuests,
          status: bookingData.room.status,
          isActive: bookingData.room.isActive,
          hasBasicInventory:
            bookingData.room.BasicInventories &&
            bookingData.room.BasicInventories.length > 0,
          basicInventoryCount: bookingData.room.BasicInventories
            ? bookingData.room.BasicInventories.length
            : 0,
          basicInventoryDetails: bookingData.room.BasicInventories
            ? bookingData.room.BasicInventories.map((item) => ({
                id: item.id,
                name: item.name,
                type: item.inventoryType,
                category: item.category,
                currentStock: item.currentStock,
                cleanStock: item.cleanStock,
                requiredQuantity: item.RoomBasics?.quantity,
                isRequired: item.RoomBasics?.isRequired,
                priority: item.RoomBasics?.priority,
              }))
            : [],
        }
      : null;

    // ⭐ CALCULAR NOCHES DE ESTADÍA
    const nights = getDaysDifference(bookingData.checkIn, bookingData.checkOut);

    // ⭐ ESTADO DE LA RESERVA CON LÓGICA MEJORADA
    const now = getColombiaTime();
    const checkInDate = toColombiaTime(bookingData.checkIn);
    const checkOutDate = toColombiaTime(bookingData.checkOut);

    const bookingStatus = {
      canCheckIn:
        bookingData.status === "confirmed" &&
        checkInDate <= now &&
        paymentStatus !== "unpaid",
      canCheckOut:
        bookingData.status === "checked-in" &&
        paymentStatus === "fully_paid" &&
        inventoryStatus.canProceedCheckOut,
      isActive: ["confirmed", "checked-in"].includes(bookingData.status),
      isCompleted: bookingData.status === "completed",
      isCancelled: bookingData.status === "cancelled",
      isOverdue: bookingData.status === "checked-in" && now > checkOutDate,
      canModify: bookingData.status === "confirmed" && checkInDate > now,
      canCancel: bookingData.status === "confirmed" && checkInDate > now,
      isReadyForCheckOut:
        bookingData.status === "checked-in" &&
        inventoryStatus.canProceedCheckOut,
      canGenerateBill: ["checked-in", "completed"].includes(bookingData.status),
      daysSinceCheckIn:
        bookingData.status === "checked-in" && bookingData.actualCheckIn
          ? Math.floor(
              (now - toColombiaTime(bookingData.actualCheckIn)) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
      daysUntilCheckIn:
        bookingData.status === "confirmed"
          ? Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24))
          : 0,
      daysUntilCheckOut: ["confirmed", "checked-in"].includes(
        bookingData.status
      )
        ? Math.ceil((checkOutDate - now) / (1000 * 60 * 60 * 24))
        : 0,
    };

    // ⭐ INFORMACIÓN DEL HUÉSPED
    const guestInfo = bookingData.guest
      ? {
          name: bookingData.guest.scostumername,
          document: bookingData.guest.sdocno,
          email: bookingData.guest.selectronicmail,
          phone: bookingData.guest.stelephone,
        }
      : {
          name: "Huésped no encontrado",
          document: bookingData.guestId,
          email: null,
          phone: null,
        };

    // ⭐ INFORMACIÓN DE FACTURACIÓN
    const billInfo = bookingData.bill
      ? {
          billId: bookingData.bill.idBill,
          totalAmount: parseFloat(bookingData.bill.totalAmount || 0),
          status: bookingData.bill.status,
          paymentMethod: bookingData.bill.paymentMethod,
          createdAt: formatForLogs(bookingData.bill.createdAt),
          hasTaxInvoice: !!bookingData.bill.taxInvoiceId,
          taxInvoiceId: bookingData.bill.taxInvoiceId,
          totalAmountFormatted: `$${parseFloat(
            bookingData.bill.totalAmount || 0
          ).toLocaleString()}`,
        }
      : null;

    // ⭐ INFORMACIÓN DE REGISTRO DE HUÉSPEDES
    const registrationInfo = {
      hasRegistrationPasses:
        bookingData.registrationPasses &&
        bookingData.registrationPasses.length > 0,
      passesCount: bookingData.registrationPasses
        ? bookingData.registrationPasses.length
        : 0,
      passes: bookingData.registrationPasses
        ? bookingData.registrationPasses.map((pass) => ({
            id: pass.id,
            passNumber: pass.passNumber,
            status: pass.status,
            issuedAt: formatForLogs(pass.issuedAt),
          }))
        : [],
    };

    // ⭐ RESPUESTA ENRIQUECIDA CON TODA LA INFORMACIÓN
    const responseData = {
      ...bookingData,

      // ⭐ FECHAS FORMATEADAS EN ZONA HORARIA DE COLOMBIA
      checkInFormatted: formatColombiaDate(bookingData.checkIn),
      checkOutFormatted: formatColombiaDate(bookingData.checkOut),
      createdAtFormatted: formatForLogs(bookingData.createdAt),
      updatedAtFormatted: formatForLogs(bookingData.updatedAt),
      actualCheckInFormatted: bookingData.actualCheckIn
        ? formatForLogs(bookingData.actualCheckIn)
        : null,
      actualCheckOutFormatted: bookingData.actualCheckOut
        ? formatForLogs(bookingData.actualCheckOut)
        : null,

      // ⭐ INFORMACIÓN FINANCIERA CALCULADA
      financialSummary: {
        baseAmount,
        totalExtras,
        grandTotal,
        totalPaid,
        totalPending,
        balance,
        paymentStatus,
        isFullyPaid: paymentStatus === "fully_paid",
        hasExtraCharges: totalExtras > 0,
        paymentsCount: paymentInfo.paymentCount,
        pendingPaymentsCount: paymentInfo.pendingPaymentsCount,
        // Formateos para mostrar
        baseAmountFormatted: `$${baseAmount.toLocaleString()}`,
        totalExtrasFormatted: `$${totalExtras.toLocaleString()}`,
        grandTotalFormatted: `$${grandTotal.toLocaleString()}`,
        totalPaidFormatted: `$${totalPaid.toLocaleString()}`,
        balanceFormatted: `$${balance.toLocaleString()}`,
        paymentPercentage:
          grandTotal > 0 ? Math.round((totalPaid / grandTotal) * 100) : 0,
      },

      // ⭐ INFORMACIÓN DE ESTADÍA
      stayInfo: {
        nights,
        guestCount: bookingData.guestCount,
        pointOfSale: bookingData.pointOfSale || "Online",
        isOnlineBooking: (bookingData.pointOfSale || "Online") === "Online",
        checkInTime: formatForDisplay(checkInDate),
        checkOutTime: formatForDisplay(checkOutDate),
        totalDuration: `${nights} ${nights === 1 ? "noche" : "noches"}`,
      },

      // ⭐ INFORMACIÓN CALCULADA HEREDADA (para compatibilidad)
      inventoryStatus,
      paymentInfo,
      extraChargesInfo,
      roomInfo,
      bookingStatus,
      guestInfo,
      billInfo,
      registrationInfo,

      // ⭐ MONTOS FORMATEADOS (para compatibilidad)
      totalAmountFormatted: `$${parseFloat(
        bookingData.totalAmount || 0
      ).toLocaleString()}`,

      // ⭐ ESTADO GENERAL (para compatibilidad)
      isReadyForCheckOut: bookingStatus.isReadyForCheckOut,
      canGenerateBill: bookingStatus.canGenerateBill,

      // ⭐ NOCHES CALCULADAS (para compatibilidad)
      nights,

      // ⭐ ACCIONES DISPONIBLES
      availableActions: {
        canViewDetails: true,
        canModify: bookingStatus.canModify,
        canCancel: bookingStatus.canCancel,
        canMakePayment: balance > 0 && !bookingStatus.isCancelled,
        canCheckIn: bookingStatus.canCheckIn,
        canCheckOut: bookingStatus.canCheckOut,
        canGenerateBill: bookingStatus.canGenerateBill,
        canAddExtraCharges: ["confirmed", "checked-in"].includes(
          bookingData.status
        ),
        canManageInventory: bookingData.status === "checked-in",
        canDownloadReceipt: billInfo !== null,
        canIssueRegistrationPass: bookingData.status === "checked-in",
      },

      // ⭐ METADATOS ÚTILES
      metadata: {
        lastUpdated: formatForLogs(bookingData.updatedAt),
        consultedAt: formatForLogs(getColombiaTime()),
        processingFlags: {
          needsAttention: balance > 0 && bookingData.status === "checked-in",
          hasUnprocessedExtras: totalExtras > 0 && balance > 0,
          readyForBilling:
            bookingData.status === "checked-in" &&
            paymentStatus === "fully_paid",
          inventoryPending: inventoryStatus.itemsPending > 0,
          isOverdue: bookingStatus.isOverdue,
        },
      },
    };

    console.log("📤 [GET-BOOKING-BY-ID] Respuesta preparada:", {
      bookingId: responseData.bookingId,
      status: responseData.status,
      paymentStatus: responseData.financialSummary.paymentStatus,
      balance: responseData.financialSummary.balanceFormatted,
      hasInventoryStatus: !!responseData.inventoryStatus,
      hasPaymentInfo: !!responseData.paymentInfo,
      isReadyForCheckOut: responseData.isReadyForCheckOut,
      canGenerateBill: responseData.canGenerateBill,
      hasActions: Object.values(responseData.availableActions).some(
        (action) => action === true
      ),
      completedAt: formatForLogs(getColombiaTime()),
    });

    res.json({
      error: false,
      message: "Reserva obtenida exitosamente",
      data: responseData,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [GET-BOOKING-BY-ID] Error general:", error);
    console.error(
      "🕐 [GET-BOOKING-BY-ID] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error al obtener la reserva",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

const getAllBookings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = null, // ⭐ NULL = sin paginación, devolver TODAS las reservas
      status,
      roomNumber,
      guestId,
      includeInventory = false,
      fromDate,
      toDate,
    } = req.query;

    console.log("🔍 [GET-ALL-BOOKINGS] Parámetros:", {
      page,
      limit: limit || 'ALL (sin paginación)',
      status,
      roomNumber,
      guestId,
      includeInventory,
      fromDate,
      toDate,
    });

    const where = {};
    if (status) where.status = status;
    if (roomNumber) where.roomNumber = roomNumber;
    if (guestId) where.guestId = guestId;

    // ⭐ FILTRO POR FECHAS DE CHECK-IN
    if (fromDate || toDate) {
      where.checkIn = {};
      if (fromDate) where.checkIn[Op.gte] = new Date(fromDate);
      if (toDate) where.checkIn[Op.lte] = new Date(toDate + "T23:59:59.999Z");
    }

    const includeOptions = [
      {
        model: Room,
        as: "room",
        attributes: ["roomNumber", "type", "status"],
        // ⭐ INCLUIR INVENTARIO BÁSICO DE LA HABITACIÓN
        include: [
          {
            model: BasicInventory,
            as: "BasicInventories",
            attributes: ["id", "name", "description", "currentStock"],
            through: {
              attributes: ["quantity"],
              as: "RoomBasics",
            },
          },
        ],
      },
      {
        model: Buyer,
        as: "guest",
        attributes: [
          "sdocno",
          "scostumername",
          "selectronicmail",
          "stelephone",
        ],
      },
      {
        model: Payment,
        as: "payments",
        attributes: [
          "paymentId",
          "amount",
          "paymentMethod",
          "paymentStatus",
          "paymentDate",
          "paymentType",
          "transactionId",
          "paymentReference",
          "processedBy",
        ],
        required: false,
      },
      {
        model: RegistrationPass,
        as: "registrationPasses",
        attributes: [
          "registrationNumber",
          "checkInDate",
          "name",
          "nationality",
          "maritalStatus",
          "profession",
          "stayDuration",
          "checkInTime",
          "numberOfPeople",
          "destination",
          "idNumber",
          "idIssuingPlace",
          "foreignIdOrPassport",
          "address",
          "phoneNumber",
          "roomNumber",
        ],
        required: false,
      },
      {
        model: ExtraCharge,
        as: "extraCharges",
        attributes: [
          "id",
          "description",
          "amount",
          "quantity",
          "chargeType",
          "chargeDate",
          "notes",
        ],
        required: false,
      },
    ];

    // ⭐ INCLUIR INVENTARIO SI SE SOLICITA
    if (includeInventory === "true") {
      includeOptions.push({
        model: BookingInventoryUsage,
        as: "inventoryUsages",
        attributes: [
          "quantityAssigned",
          "quantityConsumed",
          "quantityReturned",
          "status",
        ],
        include: [
          {
            model: BasicInventory,
            as: "inventory",
            attributes: ["name", "inventoryType"],
          },
        ],
        required: false,
      });
    }

    // ⭐ MODIFICACIÓN PRINCIPAL: Agregar attributes para incluir los nuevos campos
    const queryOptions = {
      where,
      include: includeOptions,
      // ⭐ AGREGAR ATTRIBUTES CON LOS NUEVOS CAMPOS
      attributes: [
        "bookingId",
        "checkIn",
        "checkOut",
        "status",
        "pointOfSale",
        "guestCount",
        "totalAmount",
        "guestId",
        "roomNumber",
        "trackingToken",
        "createdBy",
        "paymentCompletedAt",
        "actualCheckIn",
        "actualCheckOut",
        "createdAt",
        "updatedAt",
        // ⭐ NUEVOS CAMPOS AGREGADOS EN LA MIGRACIÓN
        "inventoryVerified",
        "inventoryVerifiedAt",
        "inventoryDelivered",
        "inventoryDeliveredAt",
        "inventoryDeliveredBy",
        "passengersCompleted",
        "passengersCompletedAt",
        "checkInReadyAt",
        "checkInProgress",
      ],
      order: [
        ["createdAt", "DESC"],
        [{ model: Payment, as: "payments" }, "paymentDate", "DESC"],
        [{ model: ExtraCharge, as: "extraCharges" }, "chargeDate", "DESC"],
      ],
      distinct: true,
    };

    // ⭐ SOLO PAGINAR SI SE ESPECIFICA LIMIT
    if (limit) {
      queryOptions.limit = parseInt(limit);
      queryOptions.offset = (parseInt(page) - 1) * parseInt(limit);
    }

    const { count, rows } = await Booking.findAndCountAll(queryOptions);

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
        return sum + amount * quantity;
      }, 0);

      // Calcular total pagado (solo pagos completados)
      const totalPagado = payments
        .filter((payment) =>
          ["completed", "authorized"].includes(payment.paymentStatus)
        )
        .reduce((sum, payment) => {
          const amount = parseFloat(payment.amount || 0);
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
      // Calcular pagos pendientes
      const totalPendingPayments = payments
        .filter((payment) => payment.paymentStatus === "pending")
        .reduce((sum, payment) => {
          const amount = parseFloat(payment.amount || 0);
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

      // Totales finales
      const totalFinal = totalReserva + totalExtras;
      const totalPendiente = Math.max(0, totalFinal - totalPagado);

      // Estado del pago
      let paymentStatus = "unpaid";
      if (totalPagado >= totalFinal) {
        paymentStatus = "fully_paid";
      } else if (totalPagado > 0) {
        paymentStatus = "partially_paid";
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
        paymentsCount: payments.filter((p) => p.paymentStatus === "completed")
          .length,
        pendingPaymentsCount: payments.filter(
          (p) => p.paymentStatus === "pending"
        ).length,
        // ⭐ CAMPOS FORMATEADOS PARA EL FRONTEND
        totalReservaFormatted: `$${totalReserva.toLocaleString()}`,
        totalExtrasFormatted: `$${totalExtras.toLocaleString()}`,
        totalPagadoFormatted: `$${totalPagado.toLocaleString()}`,
        totalFinalFormatted: `$${totalFinal.toLocaleString()}`,
        totalPendienteFormatted: `$${totalPendiente.toLocaleString()}`,
        // ⭐ PORCENTAJE DE PAGO
        paymentPercentage:
          totalFinal > 0 ? Math.round((totalPagado / totalFinal) * 100) : 0,
      };
    };

    // ⭐ PROCESAR DATOS CON INFORMACIÓN FINANCIERA MEJORADA
    const bookingsWithAllInfo = rows.map((booking) => {
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
        lastPayment:
          bookingData.payments && bookingData.payments.length > 0
            ? bookingData.payments[0]
            : null,
      };

      // 🔧 AGREGAR NUEVA ESTRUCTURA FINANCIERA COMPLETA
      bookingData.financialSummary = financialSummary;

      // ⭐ INFORMACIÓN DE ESTADO DE LA RESERVA MEJORADA
      bookingData.bookingStatus = {
        canCheckIn:
          booking.status === "confirmed" &&
          financialSummary.totalPagado >= financialSummary.totalReserva * 0.5, // Al menos 50% pagado
        canCheckOut:
          booking.status === "checked-in" && financialSummary.isFullyPaid,
        requiresPayment: financialSummary.totalPendiente > 0,
        readyForCheckOut:
          booking.status === "checked-in" && financialSummary.isFullyPaid,
        isOverdue:
          booking.status === "checked-in" &&
          new Date() > new Date(booking.checkOut),
        daysSinceCheckIn:
          booking.status === "checked-in"
            ? Math.floor(
                (new Date() - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)
              )
            : 0,
      };

      // ⭐ INFORMACIÓN DE INVENTARIO SI SE SOLICITA
      if (includeInventory === "true" && bookingData.inventoryUsages) {
        bookingData.inventoryStatus = {
          hasInventoryAssigned: bookingData.inventoryUsages.length > 0,
          totalItems: bookingData.inventoryUsages.length,
          itemsReturned: bookingData.inventoryUsages.filter(
            (u) => u.status === "returned"
          ).length,
          itemsConsumed: bookingData.inventoryUsages.filter(
            (u) => u.status === "consumed"
          ).length,
          readyForCheckOut:
            booking.status === "checked-in" &&
            bookingData.inventoryUsages.length > 0,
        };
      }

      // ⭐ AGREGAR INFORMACIÓN DE CHECK-IN TRACKING
      bookingData.checkInTracking = {
        inventoryVerified: bookingData.inventoryVerified || false,
        inventoryVerifiedAt: bookingData.inventoryVerifiedAt,
        inventoryDelivered: bookingData.inventoryDelivered || false,
        inventoryDeliveredAt: bookingData.inventoryDeliveredAt,
        inventoryDeliveredBy: bookingData.inventoryDeliveredBy,
        passengersCompleted: bookingData.passengersCompleted || false,
        passengersCompletedAt: bookingData.passengersCompletedAt,
        checkInProgress: bookingData.checkInProgress || false,
        checkInReadyAt: bookingData.checkInReadyAt,
        // ⭐ ESTADO CALCULADO - SOLO REQUIERE PASAJEROS
        allRequirementsMet: (bookingData.passengersCompleted || false),
        // ⭐ PASOS COMPLETADOS
        completedSteps: [
          ...(bookingData.passengersCompleted || false
            ? ["Pasajeros registrados"]
            : []),
        ],
        // ⭐ PASOS PENDIENTES
        pendingSteps: [
          ...(!(bookingData.passengersCompleted || false)
            ? ["Completar registro de pasajeros"]
            : []),
        ],
      };

      // ⭐ AGREGAR METADATOS ÚTILES
      bookingData.metadata = {
        lastUpdated: bookingData.updatedAt,
        lastPaymentDate:
          financialSummary.paymentsCount > 0
            ? bookingData.payments[0]?.paymentDate
            : null,
        lastExtraChargeDate:
          financialSummary.extraChargesCount > 0
            ? bookingData.extraCharges[0]?.chargeDate
            : null,
        processingFlags: {
          needsAttention:
            financialSummary.totalPendiente > 0 &&
            booking.status === "checked-in",
          hasUnprocessedExtras:
            financialSummary.hasExtras && financialSummary.totalPendiente > 0,
          readyForBilling:
            booking.status === "checked-in" && financialSummary.isFullyPaid,
          // ⭐ NUEVAS FLAGS
          hasInventoryTracking: !!(
            bookingData.inventoryVerified || bookingData.inventoryDelivered
          ),
          hasPassengerTracking: !!bookingData.passengersCompleted,
          isCheckInReady: bookingData.checkInTracking.allRequirementsMet,
        },
      };

      return bookingData;
    });

    // 🔧 CALCULAR ESTADÍSTICAS GLOBALES
    const statistics = {
      totalBookings: count,
      bookingsByStatus: {
        confirmed: bookingsWithAllInfo.filter((b) => b.status === "confirmed")
          .length,
        checkedIn: bookingsWithAllInfo.filter((b) => b.status === "checked-in")
          .length,
        completed: bookingsWithAllInfo.filter((b) => b.status === "completed")
          .length,
        cancelled: bookingsWithAllInfo.filter((b) => b.status === "cancelled")
          .length,
      },
      financialStats: {
        totalRevenue: bookingsWithAllInfo.reduce(
          (sum, b) => sum + b.financialSummary.totalPagado,
          0
        ),
        totalPendingAmount: bookingsWithAllInfo.reduce(
          (sum, b) => sum + b.financialSummary.totalPendiente,
          0
        ),
        totalExtraCharges: bookingsWithAllInfo.reduce(
          (sum, b) => sum + b.financialSummary.totalExtras,
          0
        ),
        fullyPaidBookings: bookingsWithAllInfo.filter(
          (b) => b.financialSummary.isFullyPaid
        ).length,
        partiallyPaidBookings: bookingsWithAllInfo.filter(
          (b) => b.financialSummary.paymentStatus === "partially_paid"
        ).length,
        unpaidBookings: bookingsWithAllInfo.filter(
          (b) => b.financialSummary.paymentStatus === "unpaid"
        ).length,
      },
      operationalStats: {
        bookingsNeedingAttention: bookingsWithAllInfo.filter(
          (b) => b.metadata.processingFlags.needsAttention
        ).length,
        readyForCheckOut: bookingsWithAllInfo.filter(
          (b) => b.bookingStatus.readyForCheckOut
        ).length,
        overdueCheckOuts: bookingsWithAllInfo.filter(
          (b) => b.bookingStatus.isOverdue
        ).length,
        // ⭐ NUEVAS ESTADÍSTICAS DE CHECK-IN TRACKING
        withInventoryTracking: bookingsWithAllInfo.filter(
          (b) => b.metadata.processingFlags.hasInventoryTracking
        ).length,
        withPassengerTracking: bookingsWithAllInfo.filter(
          (b) => b.metadata.processingFlags.hasPassengerTracking
        ).length,
        readyForCheckIn: bookingsWithAllInfo.filter(
          (b) => b.metadata.processingFlags.isCheckInReady
        ).length,
      },
    };

    console.log("📊 [GET-ALL-BOOKINGS] Estadísticas:", {
      total: statistics.totalBookings,
      byStatus: statistics.bookingsByStatus,
      revenue: `$${statistics.financialStats.totalRevenue.toLocaleString()}`,
      pending: `$${statistics.financialStats.totalPendingAmount.toLocaleString()}`,
      // ⭐ NUEVAS ESTADÍSTICAS
      withTracking: statistics.operationalStats.withInventoryTracking,
      readyForCheckIn: statistics.operationalStats.readyForCheckIn,
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
          totalPages: Math.ceil(count / parseInt(limit)),
        },
        statistics,
        queryInfo: {
          filters: { status, roomNumber, guestId, fromDate, toDate },
          includeInventory: includeInventory === "true",
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("❌ [GET-ALL-BOOKINGS] Error:", error);
    next(error);
  }
};

const checkInGuest = async (req, res, next) => {
  try {
    console.log("🏨 [CHECK-IN-GUEST] Iniciando proceso de check-in");
    console.log(
      "🕐 [CHECK-IN-GUEST] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log("📥 [CHECK-IN-GUEST] Parámetros recibidos:", {
      bookingId: req.params.bookingId,
      body: req.body,
    });

    const { bookingId } = req.params;
    const {
      assignInventory = true,
      customItems = [],
      forceCheckIn = false,
      notes = "",
    } = req.body;

    // ⭐ VALIDACIONES BÁSICAS CON LOGS
    if (!bookingId) {
      console.log("❌ [CHECK-IN-GUEST] bookingId faltante");
      return res.status(400).json({
        error: true,
        message: "bookingId es requerido",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("🔍 [CHECK-IN-GUEST] Buscando reserva:", bookingId);

    // ⭐ OBTENER DATOS COMPLETOS DE LA RESERVA CON INCLUDES MEJORADOS
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "type", "status", "isActive", "maxGuests"],
          include: [
            {
              model: BasicInventory,
              as: "BasicInventories",
              attributes: [
                "id",
                "name",
                "inventoryType",
                "currentStock",
                "cleanStock",
                "minStock",
                "category",
                "description",
              ],
              through: {
                attributes: ["quantity", "isRequired", "priority"],
                as: "RoomBasics",
              },
            },
          ],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: [
            "sdocno",
            "scostumername",
            "selectronicmail",
            "stelephone",
          ],
        },
        {
          model: Payment,
          as: "payments",
          attributes: ["paymentId", "amount", "paymentStatus", "paymentMethod"],
          // ✅ CORRECCIÓN CRÍTICA: No filtrar por estado aquí, obtener todos
          required: false,
        },
      ],
    });

    if (!booking) {
      console.log("❌ [CHECK-IN-GUEST] Reserva no encontrada:", bookingId);
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [CHECK-IN-GUEST] Reserva encontrada:", {
      bookingId: booking.bookingId,
      status: booking.status,
      roomNumber: booking.room?.roomNumber || booking.roomNumber,
      guestName: booking.guest?.scostumername,
      hasRoom: !!booking.room,
      hasPayments: booking.payments?.length > 0,
      totalPayments: booking.payments?.length || 0,
      paymentStatuses: booking.payments?.map((p) => p.paymentStatus) || [],
    });

    // ⭐ VALIDACIONES DE ESTADO CON LOGS DETALLADOS
    if (!["confirmed", "paid"].includes(booking.status)) {
      console.log(
        "❌ [CHECK-IN-GUEST] Estado de reserva inválido:",
        booking.status
      );
      return res.status(400).json({
        error: true,
        message: `Solo se pueden hacer check-in a reservas confirmadas o pagadas. Estado actual: ${booking.status}`,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ VALIDAR FECHAS DE CHECK-IN CON UTILIDADES DE COLOMBIA
    const now = getColombiaTime();
    const checkInDate = toColombiaTime(booking.checkIn);
    const checkOutDate = toColombiaTime(booking.checkOut);

    // ⭐ COMPARAR SOLO FECHAS (sin horas) para permitir check-in el mismo día
    const nowDate = now.startOf('day');
    const checkInDateOnly = checkInDate.startOf('day');
    const checkOutDateOnly = checkOutDate.startOf('day');

    console.log("📅 [CHECK-IN-GUEST] Validación de fechas:", {
      now: formatForLogs(now),
      checkInDate: formatForLogs(checkInDate),
      checkOutDate: formatForLogs(checkOutDate),
      nowDate: nowDate.toISO(),
      checkInDateOnly: checkInDateOnly.toISO(),
      canCheckInToday: nowDate >= checkInDateOnly,
      isNotExpired: nowDate < checkOutDateOnly,
    });

    // ⭐ VALIDAR QUE ES EL DÍA CORRECTO PARA CHECK-IN (comparando solo fechas)
    if (!forceCheckIn && nowDate < checkInDateOnly) {
      const daysUntilCheckIn = Math.ceil(
        checkInDateOnly.diff(nowDate, 'days').days
      );
      console.log(
        "❌ [CHECK-IN-GUEST] Check-in anticipado:",
        daysUntilCheckIn,
        "días antes"
      );
      return res.status(400).json({
        error: true,
        message: `El check-in no está disponible hasta ${formatColombiaDate(
          checkInDate
        )} (${daysUntilCheckIn} días)`,
        data: {
          checkInDate: formatColombiaDate(checkInDate),
          daysUntilCheckIn,
          currentTime: formatForLogs(now),
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ VALIDAR QUE NO ESTÉ EXPIRADO (comparando solo fechas)
    if (nowDate > checkOutDateOnly) {
      console.log("❌ [CHECK-IN-GUEST] Reserva expirada");
      return res.status(400).json({
        error: true,
        message: `La reserva ha expirado. Fecha de check-out era: ${formatColombiaDate(
          checkOutDate
        )}`,
        data: {
          checkOutDate: formatColombiaDate(checkOutDate),
          expired: true,
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ VALIDAR ESTADO DE PAGOS - LÓGICA CORREGIDA
    const totalAmount = parseFloat(booking.totalAmount || 0);

    // ✅ NUEVA LÓGICA: Si el estado es "paid", asumir que está completamente pagado
    let totalPaid = 0;
    let paymentPercentage = 0;

    if (booking.status === "paid") {
      // ✅ Si está en estado "paid", considerar como completamente pagado
      totalPaid = totalAmount;
      paymentPercentage = 100;
      console.log(
        "💰 [CHECK-IN-GUEST] Reserva en estado 'paid' - considerando completamente pagada"
      );
    } else {
      // ✅ Para otros estados, calcular basado en pagos reales
      totalPaid = booking.payments
        ? booking.payments
            .filter((payment) =>
              ["completed", "authorized"].includes(payment.paymentStatus)
            )
            .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0)
        : 0;
      paymentPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
    }

    console.log("💰 [CHECK-IN-GUEST] Estado de pagos:", {
      bookingStatus: booking.status,
      totalAmount,
      totalPaid,
      paymentPercentage: Math.round(paymentPercentage),
      hasMinimumPayment: paymentPercentage >= 50,
      isConsideredPaid: booking.status === "paid",
      actualPaymentsCount: booking.payments?.length || 0,
    });

    // ⭐ VALIDACIÓN DE PAGO DESHABILITADA
    // El hotel permite check-in sin pago completo, ya que pueden cobrar durante la estadía o al checkout
    console.log("ℹ️ [CHECK-IN-GUEST] Validación de pago omitida (permitido por política del hotel)");
    
    // ✅ CÓDIGO ANTERIOR COMENTADO - El pago NO es requisito para check-in
    /*
    if (!forceCheckIn && booking.status !== "paid" && paymentPercentage < 50) {
      console.log(
        "❌ [CHECK-IN-GUEST] Pago insuficiente para reserva no marcada como 'paid'"
      );
      return res.status(400).json({
        error: true,
        message:
          "Se requiere al menos 50% del pago total para realizar check-in o que la reserva esté en estado 'paid'",
        data: {
          bookingStatus: booking.status,
          totalAmount: `$${totalAmount.toLocaleString()}`,
          totalPaid: `$${totalPaid.toLocaleString()}`,
          paymentPercentage: Math.round(paymentPercentage),
          minimumRequired: `$${(totalAmount * 0.5).toLocaleString()}`,
          suggestion:
            "Complete los pagos o marque la reserva como 'paid' si ya fue pagada por otro medio",
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }
    */

    console.log("✅ [CHECK-IN-GUEST] Validación de pagos omitida (permitido sin pago)");

    // ⭐ VERIFICAR SI YA TIENE INVENTARIO ASIGNADO
    console.log("📦 [CHECK-IN-GUEST] Verificando inventario existente...");

    const existingInventory = await BookingInventoryUsage.findOne({
      where: { bookingId },
    });

    if (existingInventory) {
      console.log("⚠️ [CHECK-IN-GUEST] Ya tiene inventario asignado");
      return res.status(400).json({
        error: true,
        message:
          "Esta reserva ya tiene inventario asignado. Use el endpoint de gestión de inventario para modificaciones.",
        data: {
          hasInventory: true,
          existingAssignmentId: existingInventory.id,
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [CHECK-IN-GUEST] No hay inventario previo asignado");

    // ⭐ VALIDAR ESTADO DE LA HABITACIÓN
    if (!booking.room) {
      console.log("❌ [CHECK-IN-GUEST] Habitación no encontrada");
      return res.status(400).json({
        error: true,
        message: "Información de habitación no disponible",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    if (!booking.room.isActive) {
      console.log("❌ [CHECK-IN-GUEST] Habitación inactiva");
      return res.status(400).json({
        error: true,
        message: "La habitación no está activa",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ VALIDAR ESTADOS CORRECTOS SEGÚN TU MODELO ROOM
    // Estados válidos para check-in: null (Disponible), "Limpia", "Reservada"
    // Estados que impiden check-in: "Mantenimiento", "Ocupada"
    const validStatesForCheckIn = [null, "Limpia", "Reservada"];
    const invalidStatesForCheckIn = ["Mantenimiento", "Ocupada"];
    
    if (invalidStatesForCheckIn.includes(booking.room.status)) {
      console.log(
        "❌ [CHECK-IN-GUEST] Estado de habitación impide check-in:",
        booking.room.status
      );
      return res.status(400).json({
        error: true,
        message: `La habitación no está disponible para check-in. Estado actual: ${booking.room.status}`,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [CHECK-IN-GUEST] Habitación disponible para check-in:", {
      roomStatus: booking.room.status,
      isValidState: validStatesForCheckIn.includes(booking.room.status)
    });

    // ⭐ PROCESAR INVENTARIO AUTOMÁTICO CON LOGS DETALLADOS
    console.log("📦 [CHECK-IN-GUEST] Iniciando asignación de inventario...");

    const inventoryAssignments = [];
    const inventoryErrors = [];
    const inventoryWarnings = [];

    if (assignInventory && booking.room.BasicInventories) {
      console.log(
        "📦 [CHECK-IN-GUEST] Procesando inventario básico de habitación:",
        {
          itemsCount: booking.room.BasicInventories.length,
        }
      );

      for (const item of booking.room.BasicInventories) {
        const requiredQty = item.RoomBasics.quantity;
        let availableQty = 0;

        if (item.inventoryType === "reusable") {
          availableQty = item.cleanStock;
        } else {
          availableQty = item.currentStock;
        }

        console.log("📦 [CHECK-IN-GUEST] Procesando item:", {
          name: item.name,
          type: item.inventoryType,
          required: requiredQty,
          available: availableQty,
          isRequired: item.RoomBasics.isRequired,
        });

        if (availableQty < requiredQty) {
          const error = {
            item: item.name,
            type: item.inventoryType,
            required: requiredQty,
            available: availableQty,
            deficit: requiredQty - availableQty,
            severity: item.RoomBasics.isRequired ? "critical" : "warning",
          };

          if (item.RoomBasics.isRequired) {
            inventoryErrors.push(error);
            console.log(
              "❌ [CHECK-IN-GUEST] Error crítico de inventario:",
              error
            );
          } else {
            inventoryWarnings.push(error);
            console.log("⚠️ [CHECK-IN-GUEST] Warning de inventario:", error);
          }
          continue;
        }

        try {
          // ⭐ CREAR ASIGNACIÓN DE INVENTARIO CON FECHA DE COLOMBIA
          const assignment = await BookingInventoryUsage.create({
            bookingId,
            basicInventoryId: item.id,
            quantityAssigned: requiredQty,
            status: "assigned",
            assignedAt: getColombiaTime(),
            assignedBy: req.user?.n_document || "system",
            notes: `Asignación automática durante check-in`,
          });

          // ⭐ ACTUALIZAR STOCK SEGÚN TIPO
          if (item.inventoryType === "reusable") {
            await item.update({
              cleanStock: item.cleanStock - requiredQty,
            });
          } else {
            await item.update({
              currentStock: item.currentStock - requiredQty,
            });
          }

          inventoryAssignments.push({
            assignmentId: assignment.id,
            item: item.name,
            type: item.inventoryType,
            category: item.category,
            assigned: requiredQty,
            isRequired: item.RoomBasics.isRequired,
            priority: item.RoomBasics.priority,
            assignedAt: formatForLogs(assignment.assignedAt),
          });

          console.log(
            "✅ [CHECK-IN-GUEST] Item asignado exitosamente:",
            item.name
          );
        } catch (assignError) {
          console.error(
            "❌ [CHECK-IN-GUEST] Error al asignar item:",
            item.name,
            assignError
          );
          inventoryErrors.push({
            item: item.name,
            type: item.inventoryType,
            required: requiredQty,
            available: availableQty,
            severity: "critical",
            error: "Error en base de datos",
          });
        }
      }
    }

    // ⭐ PROCESAR ITEMS PERSONALIZADOS CON LOGS
    if (customItems && customItems.length > 0) {
      console.log(
        "📦 [CHECK-IN-GUEST] Procesando items personalizados:",
        customItems.length
      );

      for (const customItem of customItems) {
        const { basicInventoryId, quantity, notes: itemNotes } = customItem;

        if (!basicInventoryId || !quantity) {
          console.log(
            "⚠️ [CHECK-IN-GUEST] Item personalizado inválido:",
            customItem
          );
          continue;
        }

        try {
          const item = await BasicInventory.findByPk(basicInventoryId);
          if (!item) {
            console.log(
              "❌ [CHECK-IN-GUEST] Item personalizado no encontrado:",
              basicInventoryId
            );
            continue;
          }

          const availableQty =
            item.inventoryType === "reusable"
              ? item.cleanStock
              : item.currentStock;

          console.log("📦 [CHECK-IN-GUEST] Procesando item personalizado:", {
            name: item.name,
            requested: quantity,
            available: availableQty,
          });

          if (availableQty >= quantity) {
            const assignment = await BookingInventoryUsage.create({
              bookingId,
              basicInventoryId,
              quantityAssigned: quantity,
              status: "assigned",
              assignedAt: getColombiaTime(),
              assignedBy: req.user?.n_document || "system",
              notes:
                itemNotes || "Item personalizado agregado durante check-in",
            });

            // ⭐ ACTUALIZAR STOCK
            if (item.inventoryType === "reusable") {
              await item.update({
                cleanStock: item.cleanStock - quantity,
              });
            } else {
              await item.update({
                currentStock: item.currentStock - quantity,
              });
            }

            inventoryAssignments.push({
              assignmentId: assignment.id,
              item: item.name,
              type: item.inventoryType,
              category: item.category,
              assigned: quantity,
              isCustom: true,
              notes: itemNotes,
              assignedAt: formatForLogs(assignment.assignedAt),
            });

            console.log(
              "✅ [CHECK-IN-GUEST] Item personalizado asignado:",
              item.name
            );
          } else {
            inventoryWarnings.push({
              item: item.name,
              type: item.inventoryType,
              required: quantity,
              available: availableQty,
              severity: "warning",
              isCustom: true,
            });
            console.log(
              "⚠️ [CHECK-IN-GUEST] Stock insuficiente para item personalizado:",
              item.name
            );
          }
        } catch (customError) {
          console.error(
            "❌ [CHECK-IN-GUEST] Error procesando item personalizado:",
            customError
          );
        }
      }
    }

    // ⭐ EVALUAR ERRORES CRÍTICOS
    const criticalErrors = inventoryErrors.filter(
      (e) => e.severity === "critical"
    );
    if (criticalErrors.length > 0 && !forceCheckIn) {
      console.log(
        "❌ [CHECK-IN-GUEST] Errores críticos de inventario:",
        criticalErrors.length
      );
      return res.status(400).json({
        error: true,
        message:
          "No se puede completar el check-in debido a falta de inventario crítico",
        data: {
          criticalErrors,
          warnings: inventoryWarnings,
          canForceCheckIn: true,
          suggestion:
            "Use forceCheckIn: true para proceder sin inventario crítico",
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("📦 [CHECK-IN-GUEST] Resumen de inventario:", {
      assigned: inventoryAssignments.length,
      criticalErrors: criticalErrors.length,
      warnings: inventoryWarnings.length,
      forceCheckIn,
    });

    // ⭐ DESCONTAR INVENTARIO BÁSICO AUTOMÁTICAMENTE
    console.log("📦 [CHECK-IN-GUEST] Descontando inventario básico automáticamente...");
    
    if (booking.room.BasicInventories && booking.room.BasicInventories.length > 0) {
      console.log(`📦 [CHECK-IN-GUEST] Items en inventario básico: ${booking.room.BasicInventories.length}`);
      
      for (const item of booking.room.BasicInventories) {
        const requiredQty = item.RoomBasics.quantity;
        const itemName = item.name;
        
        try {
          // Determinar stock disponible según tipo
          let availableQty = 0;
          if (item.inventoryType === "reusable") {
            availableQty = item.cleanStock;
          } else {
            availableQty = item.currentStock;
          }
          
          console.log(`📦 [CHECK-IN-GUEST] ${itemName}: requiere ${requiredQty}, disponible ${availableQty}`);
          
          // Descontar stock
          if (availableQty >= requiredQty) {
            if (item.inventoryType === "reusable") {
              await item.update({
                cleanStock: item.cleanStock - requiredQty,
              });
            } else {
              await item.update({
                currentStock: item.currentStock - requiredQty,
              });
            }
            
            console.log(`✅ [CHECK-IN-GUEST] ${itemName}: ${requiredQty} unidades descontadas automáticamente`);
          } else {
            console.log(`⚠️ [CHECK-IN-GUEST] ${itemName}: Stock insuficiente (disponible: ${availableQty}, requerido: ${requiredQty})`);
          }
        } catch (inventoryError) {
          console.error(`❌ [CHECK-IN-GUEST] Error al descontar ${itemName}:`, inventoryError);
          // No bloquear el check-in por errores de inventario
        }
      }
    } else {
      console.log("ℹ️ [CHECK-IN-GUEST] No hay inventario básico configurado para esta habitación");
    }

    // ⭐ ACTUALIZAR ESTADO DE LA RESERVA
    console.log("🔄 [CHECK-IN-GUEST] Actualizando estado de reserva...");

    try {
      const updateData = {
        status: "checked-in",
        actualCheckIn: getColombiaTime().toJSDate(), // ⭐ AGREGAR actualCheckIn
        inventoryVerified: true,
        inventoryVerifiedAt: getColombiaTime().toJSDate(),
        inventoryDelivered: true,
        inventoryDeliveredAt: getColombiaTime().toJSDate(),
        inventoryDeliveredBy: req.user?.n_document || "system",
      };

      await booking.update(updateData);
      console.log("✅ [CHECK-IN-GUEST] Estado de reserva actualizado", {
        status: updateData.status,
        actualCheckIn: formatForLogs(updateData.actualCheckIn),
        inventoryAutoDeducted: true
      });
    } catch (bookingUpdateError) {
      console.error(
        "❌ [CHECK-IN-GUEST] Error al actualizar reserva:",
        bookingUpdateError
      );
      return res.status(500).json({
        error: true,
        message: "Error al actualizar el estado de la reserva",
        details: bookingUpdateError.message,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ ACTUALIZAR ESTADO DE LA HABITACIÓN
    console.log("🏨 [CHECK-IN-GUEST] Actualizando estado de habitación...");

    try {
      const roomUpdateData = {
        status: "Ocupada",
        available: false,
      };

      await booking.room.update(roomUpdateData);
      console.log("✅ [CHECK-IN-GUEST] Estado de habitación actualizado");
    } catch (roomUpdateError) {
      console.error(
        "❌ [CHECK-IN-GUEST] Error al actualizar habitación:",
        roomUpdateError
      );
      // No fallar el check-in por esto, solo log
    }

    // ⭐ PREPARAR RESPUESTA COMPLETA
    console.log("📤 [CHECK-IN-GUEST] Preparando respuesta final...");

    const responseData = {
      booking: {
        bookingId: booking.bookingId,
        status: "checked-in",
        actualCheckIn: formatForLogs(getColombiaTime()),
        roomNumber: booking.room?.roomNumber || booking.roomNumber,
        guestName: booking.guest?.scostumername,
        checkInTime: formatForDisplay(getColombiaTime()),
        checkedInBy: req.user?.n_document || "system",
      },
      room: {
        roomNumber: booking.room.roomNumber,
        type: booking.room.type,
        status: "Ocupada",
        maxGuests: booking.room.maxGuests,
        currentGuests: booking.guestCount,
      },
      inventory: {
        hasInventoryAssigned: inventoryAssignments.length > 0,
        totalItemsAssigned: inventoryAssignments.length,
        inventoryAssigned: inventoryAssignments,
        inventoryWarnings: inventoryWarnings,
        criticalErrorsOverridden:
          criticalErrors.length > 0 && forceCheckIn ? criticalErrors : [],
      },
      checkInSummary: {
        checkInDate: formatColombiaDate(booking.checkIn),
        checkOutDate: formatColombiaDate(booking.checkOut),
        actualCheckInTime: formatForLogs(getColombiaTime()),
        nightsBooked: getDaysDifference(booking.checkIn, booking.checkOut),
        paymentStatus: {
          bookingStatus: booking.status,
          totalAmount: `$${totalAmount.toLocaleString()}`,
          totalPaid: `$${totalPaid.toLocaleString()}`,
          paymentPercentage: Math.round(paymentPercentage),
          isFullyPaid: paymentPercentage >= 100,
          isConsideredPaid: booking.status === "paid",
        },
      },
      nextActions: {
        canAddExtraCharges: true,
        canManageInventory: true,
        canCheckOut:
          inventoryAssignments.length === 0 ||
          inventoryAssignments.every((item) => !item.isRequired),
        requiresInventoryReturn: inventoryAssignments.some(
          (item) => item.type === "reusable"
        ),
        estimatedCheckOutDate: formatColombiaDate(booking.checkOut),
      },
    };

    console.log("✅ [CHECK-IN-GUEST] Check-in completado exitosamente:", {
      bookingId: booking.bookingId,
      guestName: booking.guest?.scostumername,
      roomNumber: booking.room?.roomNumber,
      inventoryItems: inventoryAssignments.length,
      wasInPaidStatus: booking.status === "paid",
      completedAt: formatForLogs(getColombiaTime()),
    });

    res.json({
      error: false,
      message: "Check-in realizado exitosamente",
      data: responseData,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [CHECK-IN-GUEST] Error general:", error);
    console.error(
      "🕐 [CHECK-IN-GUEST] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error interno durante el proceso de check-in",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

const checkOut = async (req, res, next) => {
  try {
    console.log("🏁 [CHECK-OUT] Iniciando proceso de check-out");
    console.log(
      "🕐 [CHECK-OUT] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log("📥 [CHECK-OUT] Parámetros recibidos:", {
      bookingId: req.params.bookingId,
      body: req.body,
    });

    const { bookingId } = req.params;
    const {
      inventoryReturns = [],
      forceCheckOut = false,
      notes = "",
      roomCondition = "good",
      skipInventoryValidation = false,
      // ✅ NUEVOS CAMPOS PARA CHECK-OUT ANTICIPADO
      actualCheckOut,
      isEarlyCheckOut = false,
      applyDiscount = false,
      discountAmount = 0,
      discountReason = "",
      recalculatedTotal = null,
      generateBillAfterCheckout = true,
    } = req.body;

    // ✅ VALIDACIONES BÁSICAS
    if (!bookingId) {
      return res.status(400).json({
        error: true,
        message: "bookingId es requerido",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ✅ OBTENER DATOS DE LA RESERVA CON LOGS DETALLADOS
    console.log("🔍 [CHECK-OUT] Obteniendo datos de la reserva...");

    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: [
            "roomNumber",
            "type",
            "status",
            "isActive",
            "maxGuests",
            "priceSingle",
            "priceDouble",
            "priceMultiple",
            "pricePerExtraGuest",
            "promotionPrice",
            "isPromo",
          ],
        },
        {
          model: BookingInventoryUsage,
          as: "inventoryUsages",
          attributes: [
            "id",
            "basicInventoryId",
            "quantityAssigned",
            "quantityConsumed",
            "quantityReturned",
            "status",
            "assignedAt",
            "notes",
          ],
          include: [
            {
              model: BasicInventory,
              as: "inventory",
              attributes: [
                "id",
                "name",
                "inventoryType",
                "category",
                "currentStock",
                "cleanStock",
                "dirtyStock",
              ],
            },
          ],
          required: false,
        },
        {
          model: Buyer,
          as: "guest",
          attributes: ["sdocno", "scostumername", "selectronicmail"],
        },
        {
          model: ExtraCharge,
          as: "extraCharges",
          attributes: ["id", "description", "amount", "quantity"],
          required: false,
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "paymentId",
            "amount",
            "paymentStatus",
            "paymentMethod",
            "paymentType",
          ],
          required: false,
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ✅ LOG DETALLADO DE LA RESERVA ENCONTRADA
    console.log("✅ [CHECK-OUT] Reserva encontrada:", {
      bookingId: booking.bookingId,
      status: booking.status,
      totalAmount: booking.totalAmount,
      originalAmount: booking.originalAmount,
      discountAmount: booking.discountAmount,
      roomNumber: booking.room?.roomNumber,
      guestName: booking.guest?.scostumername,
      checkInOriginal: formatForLogs(booking.checkIn),
      checkOutOriginal: formatForLogs(booking.checkOut),
      hasExistingDiscount: booking.hasDiscount(),
    });

    // ✅ VALIDACIÓN DE ESTADO
    if (!["checked-in", "paid", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        error: true,
        message: `Solo se puede hacer check-out de reservas activas. Estado actual: ${booking.status}`,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // Si está paid o confirmed, hacer check-in automático antes de continuar
    if (["paid", "confirmed"].includes(booking.status)) {
      console.log(
        `🔄 [CHECK-OUT] Actualizando estado de ${booking.status} a checked-in`
      );
      await booking.update({ status: "checked-in" });
    }

    // ✅ CÁLCULO DE FECHAS Y DETECCIÓN DE CHECK-OUT ANTICIPADO
    const now = getColombiaTime();
    const originalCheckIn = toColombiaTime(booking.checkIn);
    const originalCheckOut = toColombiaTime(booking.checkOut);
    const effectiveCheckOut = actualCheckOut
      ? toColombiaTime(actualCheckOut)
      : now;

    // Determinar si es check-out anticipado
    const isReallyEarlyCheckOut =
      effectiveCheckOut < originalCheckOut || isEarlyCheckOut;

    // Calcular noches originales vs efectivas
    const originalNights = getDaysDifference(originalCheckIn, originalCheckOut);
    const effectiveNights = Math.max(
      1,
      getDaysDifference(originalCheckIn, effectiveCheckOut)
    );

    console.log("📅 [CHECK-OUT] Análisis de fechas:", {
      originalCheckIn: formatForLogs(originalCheckIn),
      originalCheckOut: formatForLogs(originalCheckOut),
      effectiveCheckOut: formatForLogs(effectiveCheckOut),
      originalNights,
      effectiveNights,
      isEarlyCheckOut: isReallyEarlyCheckOut,
      daysSaved: isReallyEarlyCheckOut ? originalNights - effectiveNights : 0,
    });

    // ✅ CÁLCULO DE PRECIOS CON SOPORTE PARA CHECK-OUT ANTICIPADO
    let originalTotalAmount = parseFloat(
      booking.originalAmount || booking.totalAmount
    );
    let effectiveTotalAmount = originalTotalAmount;
    let autoDiscountAmount = 0;
    let autoDiscountReason = "";

    // ✅ SI ES CHECK-OUT ANTICIPADO, CALCULAR DESCUENTO AUTOMÁTICO
    if (isReallyEarlyCheckOut && !applyDiscount && recalculatedTotal === null) {
      console.log(
        "🗓️ [CHECK-OUT] Calculando descuento automático por check-out anticipado..."
      );

      // Calcular precio por noche basado en la configuración de la habitación
      let pricePerNight = originalTotalAmount / originalNights;

      try {
        // Usar precios específicos si están disponibles
        if (booking.guestCount === 1 && booking.room?.priceSingle) {
          pricePerNight = parseFloat(booking.room.priceSingle);
        } else if (booking.guestCount === 2 && booking.room?.priceDouble) {
          pricePerNight = parseFloat(booking.room.priceDouble);
        } else if (booking.guestCount > 2 && booking.room?.priceMultiple) {
          pricePerNight = parseFloat(booking.room.priceMultiple);
        }

        // Aplicar precio promocional si existe
        if (booking.room?.isPromo && booking.room?.promotionPrice) {
          pricePerNight = parseFloat(booking.room.promotionPrice);
        }

        // Agregar costo por huéspedes extra
        if (booking.guestCount > 3 && booking.room?.pricePerExtraGuest) {
          const extraCost =
            (booking.guestCount - 3) *
            parseFloat(booking.room.pricePerExtraGuest);
          pricePerNight += extraCost;
        }
      } catch (priceError) {
        console.warn(
          "⚠️ [CHECK-OUT] Error calculando precio por noche, usando precio promedio:",
          priceError.message
        );
        pricePerNight = originalTotalAmount / originalNights;
      }

      // Calcular nuevo total basado en noches efectivas
      const newRoomTotal = pricePerNight * effectiveNights;
      autoDiscountAmount = Math.max(0, originalTotalAmount - newRoomTotal);
      autoDiscountReason = `Check-out anticipado: ${originalNights} noches → ${effectiveNights} noches (${
        originalNights - effectiveNights
      } día${originalNights - effectiveNights > 1 ? "s" : ""} menos)`;

      effectiveTotalAmount = newRoomTotal;

      console.log("💰 [CHECK-OUT] Cálculo de descuento automático:", {
        pricePerNight,
        originalNights,
        effectiveNights,
        originalTotalAmount,
        newRoomTotal,
        autoDiscountAmount,
        autoDiscountReason,
      });

      // Aplicar descuento automático
      if (autoDiscountAmount > 0) {
        applyDiscount = true;
        discountAmount = autoDiscountAmount;
        discountReason = autoDiscountReason;

        console.log(
          `✅ [CHECK-OUT] Aplicando descuento automático: $${autoDiscountAmount.toLocaleString()}`
        );
      }
    }

    // ✅ SI SE PROPORCIONA UN TOTAL RECALCULADO, USARLO
    if (recalculatedTotal !== null && recalculatedTotal > 0) {
      console.log(
        "📊 [CHECK-OUT] Usando total recalculado proporcionado:",
        recalculatedTotal
      );
      const providedDiscount = Math.max(
        0,
        originalTotalAmount - recalculatedTotal
      );
      if (providedDiscount > 0) {
        applyDiscount = true;
        discountAmount = providedDiscount;
        discountReason =
          discountReason ||
          `Ajuste de total: $${originalTotalAmount.toLocaleString()} → $${recalculatedTotal.toLocaleString()}`;
        effectiveTotalAmount = recalculatedTotal;
      }
    }

    // ✅ APLICAR DESCUENTO MANUAL SI SE PROPORCIONA
    if (applyDiscount && discountAmount > 0) {
      console.log(
        `💰 [CHECK-OUT] Aplicando descuento: $${discountAmount} - Razón: ${discountReason}`
      );

      // Usar el método del modelo para aplicar el descuento
      booking.applyDiscount(
        discountAmount,
        discountReason,
        req.user?.n_document || "system"
      );

      // Guardar cambios de descuento en la base de datos
      await booking.save();

      effectiveTotalAmount = booking.getEffectiveAmount();

      console.log("💰 [CHECK-OUT] Descuento aplicado exitosamente:", {
        originalAmount: booking.originalAmount,
        discountAmount: booking.discountAmount,
        newTotalAmount: booking.totalAmount,
        effectiveAmount: effectiveTotalAmount,
      });
    }

    // ✅ CALCULAR CARGOS EXTRAS (sin cambios)
    const extraCharges = booking.extraCharges || [];
    const totalExtras = extraCharges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount || 0);
      const quantity = parseInt(charge.quantity || 1);
      const lineTotal = amount * quantity;
      console.log(
        `💰 [CHECK-OUT] Cargo extra: ${charge.description} = $${amount} x ${quantity} = $${lineTotal}`
      );
      return sum + lineTotal;
    }, 0);

    // ✅ TOTAL FINAL CON DESCUENTOS APLICADOS
    const grandTotal = effectiveTotalAmount + totalExtras;
    console.log("💰 [CHECK-OUT] Cálculo final con descuentos:", {
      originalAmount: originalTotalAmount,
      discountApplied: applyDiscount ? discountAmount : 0,
      effectiveRoomCharge: effectiveTotalAmount,
      totalExtras,
      grandTotal,
    });

    // ✅ CALCULAR PAGOS REALIZADOS (sin cambios en la lógica)
    const allPayments = booking.payments || [];
    const validPayments = allPayments.filter((payment) =>
      ["completed", "authorized"].includes(payment.paymentStatus)
    );

    const totalPaid = validPayments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount || 0);
      return sum + amount;
    }, 0);

    const balance = Math.max(0, grandTotal - totalPaid);

    // ✅ LOG FINAL DE CÁLCULOS FINANCIEROS CON INFO DE DESCUENTO
    console.log("💰 [CHECK-OUT] RESUMEN FINANCIERO CON DESCUENTOS:", {
      originalTotalAmount,
      discountAmount: applyDiscount ? discountAmount : 0,
      effectiveRoomCharge: effectiveTotalAmount,
      totalExtras,
      grandTotal,
      totalPaid,
      balance,
      isEarlyCheckOut: isReallyEarlyCheckOut,
      nightsStayed: effectiveNights,
      originalNights,
      discountReason: applyDiscount ? discountReason : null,
    });

    // ✅ VALIDAR PAGOS
    if (!forceCheckOut && balance > 0) {
      console.log("❌ [CHECK-OUT] BLOQUEANDO CHECK-OUT POR PAGOS PENDIENTES");

      return res.status(400).json({
        error: true,
        message: "No se puede hacer check-out con pagos pendientes",
        data: {
          originalAmount: `$${originalTotalAmount.toLocaleString()}`,
          discountApplied: applyDiscount
            ? `$${discountAmount.toLocaleString()}`
            : null,
          effectiveAmount: `$${effectiveTotalAmount.toLocaleString()}`,
          grandTotal: `$${grandTotal.toLocaleString()}`,
          totalPaid: `$${totalPaid.toLocaleString()}`,
          balance: `$${balance.toLocaleString()}`,
          canForceCheckOut: true,
          isEarlyCheckOut: isReallyEarlyCheckOut,
          nightsStayed: effectiveNights,
          originalNights,
          discountReason: applyDiscount ? discountReason : null,
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [CHECK-OUT] Validación de pagos exitosa, continuando...");

    // ✅ PROCESAR INVENTARIO (sin cambios)
    const processedReturns = [];
    const laundryItems = [];
    const inventoryErrors = [];
    const inventoryUsages = booking.inventoryUsages || [];

    // [CÓDIGO DE INVENTARIO SIN CAMBIOS]
    if (inventoryUsages.length > 0) {
      for (const usage of inventoryUsages) {
        const returnData =
          inventoryReturns.find(
            (r) => r.basicInventoryId === usage.basicInventoryId
          ) || {};

        const {
          quantityReturned = 0,
          quantityConsumed = 0,
          notes: itemNotes = "",
        } = returnData;

        const totalProcessed = quantityReturned + quantityConsumed;
        if (totalProcessed > usage.quantityAssigned) {
          const error = `Cantidad total procesada (${totalProcessed}) excede la asignada (${usage.quantityAssigned}) para ${usage.inventory.name}`;
          if (!skipInventoryValidation) {
            return res.status(400).json({
              error: true,
              message: error,
              timestamp: formatForLogs(getColombiaTime()),
            });
          } else {
            inventoryErrors.push(error);
          }
        }

        const unprocessed = usage.quantityAssigned - totalProcessed;
        if (unprocessed > 0 && !forceCheckOut) {
          const error = `${unprocessed} unidad(es) de ${usage.inventory.name} sin procesar`;
          if (!skipInventoryValidation) {
            return res.status(400).json({
              error: true,
              message:
                "Todo el inventario asignado debe ser devuelto o marcado como consumido",
              data: {
                unprocessedItems: [error],
                canForceCheckOut: true,
              },
              timestamp: formatForLogs(getColombiaTime()),
            });
          } else {
            inventoryErrors.push(error);
          }
        }

        // Procesar devolución/consumo de inventario
        try {
          const updateData = {
            quantityReturned,
            quantityConsumed,
            status: quantityReturned > 0 ? "returned" : "consumed",
            returnedAt: getColombiaTime(),
            returnedBy: req.user?.n_document || "system",
            notes: itemNotes || usage.notes,
            checkOutNotes: itemNotes,
          };

          if (unprocessed > 0 && forceCheckOut) {
            updateData.quantityConsumed = quantityConsumed + unprocessed;
            updateData.status = "consumed";
            updateData.notes = `${
              updateData.notes || ""
            } - ${unprocessed} unidades marcadas como consumidas en check-out forzado`;
          }

          await usage.update(updateData);

          if (
            usage.inventory.inventoryType === "reusable" &&
            quantityReturned > 0
          ) {
            const newDirtyStock =
              (usage.inventory.dirtyStock || 0) + quantityReturned;
            await usage.inventory.update({ dirtyStock: newDirtyStock });

            laundryItems.push({
              id: usage.inventory.id,
              item: usage.inventory.name,
              category: usage.inventory.category,
              quantity: quantityReturned,
              fromRoom: booking.room?.roomNumber || booking.roomNumber,
              processedAt: formatForLogs(getColombiaTime()),
              priority:
                usage.inventory.category === "bedding" ? "high" : "normal",
            });
          }

          processedReturns.push({
            id: usage.id,
            inventoryId: usage.inventory.id,
            item: usage.inventory.name,
            type: usage.inventory.inventoryType,
            category: usage.inventory.category,
            assigned: usage.quantityAssigned,
            returned: quantityReturned,
            consumed:
              quantityConsumed +
              (unprocessed > 0 && forceCheckOut ? unprocessed : 0),
            unprocessed: forceCheckOut ? 0 : unprocessed,
            status: updateData.status,
            processedAt: formatForLogs(updateData.returnedAt),
            notes: updateData.notes,
          });
        } catch (inventoryError) {
          inventoryErrors.push(
            `Error procesando ${usage.inventory.name}: ${inventoryError.message}`
          );
        }
      }
    }

    // ✅ ACTUALIZAR ESTADO DE LA RESERVA CON INFORMACIÓN COMPLETA
    const bookingUpdateData = {
      status: "completed",
      actualCheckOut: effectiveCheckOut,
      checkOutNotes:
        notes ||
        (isReallyEarlyCheckOut
          ? `Check-out anticipado - ${discountReason}`
          : ""),
      completedBy: req.body.completedBy || req.user?.n_document || "system",
      completedAt: getColombiaTime(),
    };

    // ✅ NO NECESITAMOS APLICAR DESCUENTO AQUÍ PORQUE YA SE APLICÓ ARRIBA
    // El booking ya tiene los campos de descuento actualizados

    await booking.update(bookingUpdateData);

    // ✅ ACTUALIZAR ESTADO DE LA HABITACIÓN - Dejarla disponible
    if (booking.room) {
      await booking.room.update({
        status: null, // NULL = Disponible
        available: true,
      });
    }

    // ✅ GENERAR FACTURA AUTOMÁTICAMENTE SI SE SOLICITA
    let billGenerated = null;
    if (generateBillAfterCheckout && balance === 0) {
      try {
        console.log("🧾 [CHECK-OUT] Generando factura automáticamente...");

        // Verificar que no exista factura previa
        const existingBill = await Bill.findOne({ where: { bookingId } });

        if (!existingBill) {
          const billData = {
            bookingId: booking.bookingId,
            reservationAmount: effectiveTotalAmount,
            extraChargesAmount: totalExtras,
            taxAmount: 0,
            totalAmount: grandTotal,
            status: "paid",
            paymentMethod:
              validPayments.length > 0
                ? validPayments[0].paymentMethod
                : "cash",
          };

          billGenerated = await Bill.create(billData);
          console.log(
            "✅ [CHECK-OUT] Factura generada automáticamente:",
            billGenerated.idBill
          );
        }
      } catch (billError) {
        console.warn(
          "⚠️ [CHECK-OUT] Error al generar factura automática:",
          billError.message
        );
        // No fallar el check-out por esto
      }
    }

    // ✅ RESPUESTA FINAL ENRIQUECIDA CON INFO DE DESCUENTOS
    console.log("✅ [CHECK-OUT] Check-out completado exitosamente:", {
      bookingId: booking.bookingId,
      isEarlyCheckOut: isReallyEarlyCheckOut,
      originalNights,
      effectiveNights,
      discountApplied: applyDiscount ? discountAmount : 0,
      grandTotal,
      balance,
      billGenerated: !!billGenerated,
      completedAt: formatForLogs(getColombiaTime()),
    });

    res.json({
      error: false,
      message: isReallyEarlyCheckOut
        ? `Check-out anticipado realizado exitosamente${
            applyDiscount
              ? ` con descuento de $${discountAmount.toLocaleString()}`
              : ""
          }`
        : "Check-out realizado exitosamente",
      data: {
        booking: {
          bookingId: booking.bookingId,
          status: "completed",
          actualCheckOut: formatForLogs(effectiveCheckOut),
          isEarlyCheckOut: isReallyEarlyCheckOut,
          originalNights,
          effectiveNights,
          nightsSaved: isReallyEarlyCheckOut
            ? originalNights - effectiveNights
            : 0,
          guestName: booking.guest?.scostumername,
          roomNumber: booking.room?.roomNumber || booking.roomNumber,
        },

        // ✅ INFORMACIÓN DE FECHAS MEJORADA
        stayInfo: {
          originalCheckIn: formatColombiaDate(originalCheckIn),
          originalCheckOut: formatColombiaDate(originalCheckOut),
          actualCheckOut: formatForLogs(effectiveCheckOut),
          originalNights,
          effectiveNights,
          isEarlyCheckOut: isReallyEarlyCheckOut,
          daysSaved: isReallyEarlyCheckOut
            ? originalNights - effectiveNights
            : 0,
        },

        // ✅ INFORMACIÓN FINANCIERA CON DESCUENTOS
        financial: {
          originalAmount: originalTotalAmount,
          discountApplied: applyDiscount ? discountAmount : 0,
          discountReason: applyDiscount ? discountReason : null,
          effectiveRoomCharge: effectiveTotalAmount,
          totalExtras,
          grandTotal,
          totalPaid,
          balance,
          // ✅ INFORMACIÓN ADICIONAL DE DESCUENTO
          discountInfo: booking.getDiscountInfo(),
          // ✅ CÁLCULOS PARA MOSTRAR
          originalRoomRate:
            originalNights > 0 ? originalTotalAmount / originalNights : 0,
          effectiveRoomRate:
            effectiveNights > 0 ? effectiveTotalAmount / effectiveNights : 0,
          totalSavings: applyDiscount ? discountAmount : 0,
        },

        inventory: {
          hasInventoryProcessed: processedReturns.length > 0,
          totalItemsProcessed: processedReturns.length,
          inventoryProcessed: processedReturns,
          laundryItems: laundryItems.length > 0 ? laundryItems : null,
          inventoryErrors: inventoryErrors.length > 0 ? inventoryErrors : null,
        },

        // ✅ INFORMACIÓN DE FACTURA SI SE GENERÓ
        billing: billGenerated
          ? {
              billGenerated: true,
              billId: billGenerated.idBill,
              billAmount: billGenerated.totalAmount,
              billStatus: billGenerated.status,
            }
          : {
              billGenerated: false,
              canGenerateLater: balance === 0,
            },

        nextActions: {
          canGenerateBill: !billGenerated && balance === 0,
          paymentFollowUp: balance > 0,
          roomNeedsCleaning: true,
          inventoryNeedsProcessing: laundryItems.length > 0,
          discountApplied: applyDiscount,
        },
      },
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [CHECK-OUT] Error general:", error);
    console.error("❌ [CHECK-OUT] Stack trace:", error.stack);
    res.status(500).json({
      error: true,
      message: "Error interno durante el proceso de check-out",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};



// Helper functions
const calculateTotalAmount = (booking) => {
  const roomCharge = calculateRoomCharge(booking);
  // 🔧 CORRECCIÓN: Usar 'extraCharges' en lugar de 'ExtraCharges' y 'amount' en lugar de 'price'
  const extraCharges = (
    booking.extraCharges ||
    booking.ExtraCharges ||
    []
  ).reduce((total, charge) => {
    // ✅ USAR 'amount' QUE ES EL CAMPO CORRECTO EN TU MODELO ExtraCharge
    const chargeAmount = parseFloat(charge.amount || 0);
    const quantity = parseInt(charge.quantity || 1);
    return total + chargeAmount * quantity;
  }, 0);
  return roomCharge + extraCharges;
};

const addExtraCharge = async (req, res) => {
  try {
    console.log("📤 [ADD-EXTRA-CHARGE] Recibiendo datos completos:");
    console.log("🔍 [ADD-EXTRA-CHARGE] req.params:", req.params);
    console.log(
      "🔍 [ADD-EXTRA-CHARGE] req.body:",
      JSON.stringify(req.body, null, 2)
    );
    console.log(
      "🕐 [ADD-EXTRA-CHARGE] Hora de procesamiento:",
      formatForLogs(getColombiaTime())
    );

    const { bookingId } = req.params;
    const { extraCharge } = req.body;

    console.log("📋 [ADD-EXTRA-CHARGE] Datos extraídos:", {
      bookingId: bookingId,
      extraCharge: extraCharge,
    });

    // ⭐ VALIDACIONES BÁSICAS CON LOGS
    if (!bookingId) {
      console.error("❌ [ADD-EXTRA-CHARGE] bookingId faltante en params");
      return res.status(400).json({
        error: true,
        message: "bookingId es requerido en la URL",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    if (!extraCharge) {
      console.error("❌ [ADD-EXTRA-CHARGE] extraCharge faltante en body");
      return res.status(400).json({
        error: true,
        message: "extraCharge es requerido en el body",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    if (!extraCharge.description || extraCharge.description.trim() === "") {
      console.error(
        "❌ [ADD-EXTRA-CHARGE] description faltante o vacía:",
        extraCharge.description
      );
      return res.status(400).json({
        error: true,
        message: "description es requerida y no puede estar vacía",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ✅ VALIDACIÓN CORRECTA: Usar 'amount' según tu modelo ExtraCharge
    if (!extraCharge.amount || isNaN(parseFloat(extraCharge.amount))) {
      console.error(
        "❌ [ADD-EXTRA-CHARGE] amount inválido:",
        extraCharge.amount
      );
      return res.status(400).json({
        error: true,
        message: "amount es requerido y debe ser un número válido",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    const amountValue = parseFloat(extraCharge.amount);
    if (amountValue <= 0) {
      console.error(
        "❌ [ADD-EXTRA-CHARGE] amount debe ser mayor a cero:",
        amountValue
      );
      return res.status(400).json({
        error: true,
        message: "El monto debe ser mayor a cero",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [ADD-EXTRA-CHARGE] Validaciones básicas pasadas");

    // ⭐ VERIFICAR QUE LA RESERVA EXISTE
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      console.error("❌ [ADD-EXTRA-CHARGE] Reserva no encontrada:", bookingId);
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [ADD-EXTRA-CHARGE] Reserva encontrada:", {
      bookingId: booking.bookingId,
      status: booking.status,
      roomNumber: booking.roomNumber,
    });

    // ⭐ VALIDAR ESTADO DE LA RESERVA
    if (!["confirmed", "checked-in", "paid"].includes(booking.status)) {
      console.error(
        "❌ [ADD-EXTRA-CHARGE] Estado de reserva no permite cargos extra:",
        booking.status
      );
      return res.status(400).json({
        error: true,
        message: `No se pueden agregar cargos extra a reservas en estado '${booking.status}'. Solo se permite en 'confirmed' o 'checked-in'`,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ✅ DATOS CORRECTOS SEGÚN TU MODELO ExtraCharge
    const chargeData = {
      bookingId: parseInt(bookingId),
      description: extraCharge.description.trim(),
      amount: amountValue, // ✅ CAMPO CORRECTO
      quantity: parseInt(extraCharge.quantity) || 1,
      chargeType: extraCharge.chargeType || "service",
      chargeDate: getColombiaTime(),
      chargedBy: req.user?.n_document || "system",
      notes: extraCharge.notes || null,
      // ⭐ CAMPOS ADICIONALES SI EXISTEN EN TU MODELO
      // basicId: extraCharge.basicId || null,
      // isApproved: true,
      // approvedAt: getColombiaTime(),
      // approvedBy: req.user?.n_document || 'system'
    };

    console.log(
      "📝 [ADD-EXTRA-CHARGE] Datos para crear cargo:",
      JSON.stringify(chargeData, null, 2)
    );

    // ⭐ CREAR CON MANEJO DE ERRORES MEJORADO
    let newExtraCharge;
    try {
      newExtraCharge = await ExtraCharge.create(chargeData);
      console.log("✅ [ADD-EXTRA-CHARGE] Cargo creado exitosamente:", {
        id: newExtraCharge.id,
        description: newExtraCharge.description,
        amount: newExtraCharge.amount,
        quantity: newExtraCharge.quantity,
        totalAmount: newExtraCharge.amount * newExtraCharge.quantity,
      });
    } catch (createError) {
      console.error(
        "❌ [ADD-EXTRA-CHARGE] Error específico al crear:",
        createError
      );
      console.error("❌ [ADD-EXTRA-CHARGE] Error details:", {
        name: createError.name,
        message: createError.message,
        errors: createError.errors,
      });

      return res.status(500).json({
        error: true,
        message: "Error al crear el cargo extra en la base de datos",
        details: createError.message,
        validationErrors: createError.errors,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ FORMATEAR RESPUESTA CONSISTENTE
    const totalAmount = newExtraCharge.amount * newExtraCharge.quantity;

    const responseData = {
      ...newExtraCharge.toJSON(),
      // ✅ CAMPOS CALCULADOS
      totalAmount: totalAmount,
      totalAmountFormatted: `$${totalAmount.toLocaleString()}`,
      // ✅ MANTENER COMPATIBILIDAD: incluir 'price' para frontend antiguo
      price: newExtraCharge.amount,
      // ⭐ FECHAS FORMATEADAS
      chargeDate: formatForLogs(newExtraCharge.chargeDate),
      createdAt: formatForLogs(newExtraCharge.createdAt),
      chargeDateFormatted: formatForDisplay(newExtraCharge.chargeDate),
      amountFormatted: `$${newExtraCharge.amount.toLocaleString()}`,
    };

    console.log("📤 [ADD-EXTRA-CHARGE] Respuesta preparada:", {
      id: responseData.id,
      description: responseData.description,
      amount: responseData.amount,
      quantity: responseData.quantity,
      totalAmount: responseData.totalAmount,
      totalAmountFormatted: responseData.totalAmountFormatted,
    });

    res.status(201).json({
      error: false,
      message: "Cargo extra agregado exitosamente",
      data: responseData,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [ADD-EXTRA-CHARGE] Error general:", error);
    console.error(
      "🕐 [ADD-EXTRA-CHARGE] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error interno del servidor",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
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
          as: "inventory",
          attributes: ["id", "name", "inventoryType", "category"],
        },
      ],
    });

    if (inventoryUsage.length === 0) {
      return res.json({
        error: false,
        message: "No hay inventario asignado a esta reserva",
        data: {
          hasInventory: false,
          items: [],
        },
      });
    }

    // Procesar estado del inventario
    const inventoryItems = inventoryUsage.map((usage) => ({
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
      notes: usage.notes,
    }));

    const summary = {
      hasInventory: true,
      totalItems: inventoryItems.length,
      totalAssigned: inventoryItems.reduce(
        (sum, item) => sum + item.quantityAssigned,
        0
      ),
      totalConsumed: inventoryItems.reduce(
        (sum, item) => sum + item.quantityConsumed,
        0
      ),
      totalReturned: inventoryItems.reduce(
        (sum, item) => sum + item.quantityReturned,
        0
      ),
      pendingReturn: inventoryItems.filter(
        (item) => item.status === "assigned" || item.status === "in_use"
      ).length,
      readyForCheckOut: inventoryItems.every(
        (item) => item.status === "returned" || item.status === "consumed"
      ),
    };

    res.json({
      error: false,
      data: {
        bookingId,
        summary,
        items: inventoryItems,
      },
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
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const includeClause = [
      {
        model: BasicInventory,
        as: "inventory",
        attributes: ["name", "inventoryType", "category"],
        where: inventoryType ? { inventoryType } : {},
      },
      {
        model: Booking,
        as: "booking",
        attributes: ["bookingId", "roomNumber", "checkIn", "checkOut"],
        where: roomNumber ? { roomNumber } : {},
      },
    ];

    const usageData = await BookingInventoryUsage.findAll({
      where: whereClause,
      include: includeClause,
      order: [["assignedAt", "DESC"]],
    });

    // Procesar estadísticas
    const stats = {
      totalUsages: usageData.length,
      itemStats: {},
      roomStats: {},
      typeStats: {},
    };

    usageData.forEach((usage) => {
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
          usageCount: 0,
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
          uniqueItems: new Set(),
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
          totalReturned: 0,
        };
      }
      stats.typeStats[itemType].totalAssigned += usage.quantityAssigned;
      stats.typeStats[itemType].totalConsumed += usage.quantityConsumed;
      stats.typeStats[itemType].totalReturned += usage.quantityReturned;
    });

    // Convertir Sets a números
    Object.keys(stats.roomStats).forEach((room) => {
      stats.roomStats[room].uniqueItems =
        stats.roomStats[room].uniqueItems.size;
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
          typeStats: Object.values(stats.typeStats),
        },
        usageDetails: usageData,
      },
    });
  } catch (error) {
    next(error);
  }
};

const generateBill = async (req, res, next) => {
  try {
    console.log("🧾 [GENERATE-BILL] Iniciando generación de factura");
    console.log(
      "🕐 [GENERATE-BILL] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log("📥 [GENERATE-BILL] Parámetros:", {
      bookingId: req.params.bookingId,
      user: req.user ? req.user.n_document : "No user",
    });

    const { bookingId } = req.params;

    // ⭐ VALIDACIONES BÁSICAS CON LOGS
    if (!bookingId) {
      console.log("❌ [GENERATE-BILL] bookingId faltante");
      return res.status(400).json({
        error: true,
        message: "bookingId es requerido",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("🔍 [GENERATE-BILL] Verificando factura existente...");

    // ⭐ VERIFICAR SI YA EXISTE UNA FACTURA PARA ESTA RESERVA
    const existingBill = await Bill.findOne({
      where: { bookingId: bookingId },
    });

    if (existingBill) {
      console.log(
        "⚠️ [GENERATE-BILL] Ya existe una factura para esta reserva:",
        existingBill.idBill
      );

      // ⭐ ENRIQUECER DATOS DE FACTURA EXISTENTE
      const enrichedBill = {
        ...existingBill.toJSON(),
        createdAtFormatted: formatForLogs(existingBill.createdAt),
        updatedAtFormatted: formatForLogs(existingBill.updatedAt),
        totalAmountFormatted: `$${parseFloat(
          existingBill.totalAmount || 0
        ).toLocaleString()}`,
        statusLabel:
          existingBill.status === "paid"
            ? "Pagada"
            : existingBill.status === "pending"
            ? "Pendiente"
            : "Cancelada",
      };

      return res.status(200).json({
        error: false,
        message: "Factura ya existe para esta reserva",
        data: enrichedBill,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [GENERATE-BILL] No hay factura existente, procediendo...");

    // ⭐ OBTENER DATOS COMPLETOS DE LA RESERVA - INCLUIR DESCUENTOS
    console.log("🔍 [GENERATE-BILL] Obteniendo datos de la reserva...");

    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: [
            "roomNumber",
            "type",
            "priceSingle",
            "priceDouble",
            "priceMultiple",
          ],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: [
            "scostumername",
            "selectronicmail",
            "sdocno",
            "stelephone",
          ],
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "paymentId",
            "amount",
            "paymentStatus",
            "paymentMethod",
            "paymentDate",
            "paymentType",
          ],
          where: { paymentStatus: "completed" },
          required: false,
        },
        {
          model: ExtraCharge,
          as: "extraCharges",
          attributes: [
            "id",
            "description",
            "amount",
            "quantity",
            "chargeType",
            "chargeDate",
          ],
          required: false,
        },
      ],
    });

    if (!booking) {
      console.log("❌ [GENERATE-BILL] Reserva no encontrada:", bookingId);
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [GENERATE-BILL] Reserva encontrada:", {
      bookingId: booking.bookingId,
      roomNumber: booking.room?.roomNumber || booking.roomNumber,
      guestName: booking.guest?.scostumername,
      status: booking.status,
      hasPayments: booking.payments?.length > 0,
      hasExtraCharges: booking.extraCharges?.length > 0,
      // ✅ AGREGAR INFO DE DESCUENTO
      discountAmount: booking.discountAmount,
      discountReason: booking.discountReason,
      hasDiscount: !!(booking.discountAmount && booking.discountAmount > 0),
    });

    // ⭐ VERIFICAR QUE LA RESERVA ESTÉ EN ESTADO ADECUADO
    if (!["checked-in", "completed"].includes(booking.status)) {
      console.log(
        "❌ [GENERATE-BILL] Estado de reserva inválido:",
        booking.status
      );
      return res.status(400).json({
        error: true,
        message:
          "La reserva debe estar en estado 'checked-in' o 'completed' para generar factura",
        data: {
          currentStatus: booking.status,
          validStatuses: ["checked-in", "completed"],
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ CALCULAR TOTALES CON DESCUENTOS APLICADOS
    console.log("💰 [GENERATE-BILL] Calculando totales con descuentos...");

    // ✅ MONTO BASE ORIGINAL DE LA RESERVA
    const originalReservationAmount = parseFloat(booking.totalAmount) || 0;

    // ✅ DESCUENTO APLICADO (si existe)
    const discountAmount = parseFloat(booking.discountAmount) || 0;

    // ✅ MONTO DE RESERVA DESPUÉS DEL DESCUENTO
    const adjustedReservationAmount = Math.max(
      0,
      originalReservationAmount - discountAmount
    );

    console.log("💰 [GENERATE-BILL] Cálculo de montos base:", {
      originalReservationAmount,
      discountAmount,
      adjustedReservationAmount,
      discountReason: booking.discountReason || "N/A",
    });

    const extraCharges = booking.extraCharges || [];
    const payments = booking.payments || [];

    // ⭐ CALCULAR CARGOS EXTRAS (sin cambios)
    const totalExtras = extraCharges.reduce((sum, charge) => {
      const chargeAmount = parseFloat(charge.amount || 0);
      const quantity = parseInt(charge.quantity || 1);
      const lineTotal = chargeAmount * quantity;
      console.log(
        `💰 [GENERATE-BILL] Cargo extra: ${charge.description} = $${chargeAmount} x ${quantity} = $${lineTotal}`
      );
      return sum + lineTotal;
    }, 0);

    // ⭐ CALCULAR TOTAL PAGADO
    const totalPaid = payments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount || 0);
      console.log(
        `💳 [GENERATE-BILL] Pago: ${payment.paymentMethod} = $${amount}`
      );
      return sum + amount;
    }, 0);

    // ✅ TOTAL FINAL: RESERVA AJUSTADA + EXTRAS
    const totalAmount = adjustedReservationAmount + totalExtras;
    const balance = Math.max(0, totalAmount - totalPaid);

    console.log("💰 [GENERATE-BILL] Cálculo de totales FINAL con descuento:", {
      originalReservationAmount,
      discountAmount,
      adjustedReservationAmount,
      totalExtras,
      totalAmount,
      totalPaid,
      balance,
      extraChargesCount: extraCharges.length,
      paymentsCount: payments.length,
      hasDiscount: discountAmount > 0,
    });

    // ⭐ VERIFICAR QUE EL MONTO TOTAL SEA VÁLIDO
    if (totalAmount <= 0) {
      console.log("❌ [GENERATE-BILL] Monto total inválido:", totalAmount);
      return res.status(400).json({
        error: true,
        message: "El monto total de la factura debe ser mayor a cero",
        data: {
          originalReservationAmount,
          discountAmount,
          adjustedReservationAmount,
          totalExtras,
          totalAmount,
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ DETERMINAR MÉTODO DE PAGO PRINCIPAL
    const primaryPaymentMethod =
      payments.length > 0
        ? payments.reduce((prev, current) =>
            parseFloat(prev.amount) > parseFloat(current.amount)
              ? prev
              : current
          ).paymentMethod
        : "cash";

    console.log(
      "💳 [GENERATE-BILL] Método de pago principal:",
      primaryPaymentMethod
    );

    // ⭐ CREAR LA FACTURA CON MONTOS AJUSTADOS
    const billData = {
      bookingId: booking.bookingId,
      reservationAmount: adjustedReservationAmount, // ✅ MONTO AJUSTADO CON DESCUENTO
      extraChargesAmount: totalExtras,
      taxAmount: 0, // Por ahora 0, se puede calcular después
      totalAmount: totalAmount, // ✅ TOTAL AJUSTADO
      taxInvoiceId: null,
      status: balance === 0 ? "paid" : "pending",
      paymentMethod: primaryPaymentMethod,
      // ✅ CAMPOS ADICIONALES PARA DESCUENTOS (si existen en tu modelo)
      // discountAmount: discountAmount || null,
      // discountReason: booking.discountReason || null,
      // originalAmount: originalReservationAmount || null,
    };

    console.log(
      "📝 [GENERATE-BILL] Datos de factura a crear (con descuentos):"
    );
    console.log(JSON.stringify(billData, null, 2));

    // ⭐ CREAR REGISTRO EN LA BASE DE DATOS CON MANEJO DE ERRORES MEJORADO
    console.log("💾 [GENERATE-BILL] Creando factura en base de datos...");

    let savedBill = null;
    try {
      savedBill = await Bill.create(billData);
      console.log("✅ [GENERATE-BILL] Factura guardada en BD:", {
        idBill: savedBill.idBill,
        totalAmount: savedBill.totalAmount,
        reservationAmount: savedBill.reservationAmount,
        discountApplied: discountAmount,
        status: savedBill.status,
      });
    } catch (billError) {
      console.error(
        "❌ [GENERATE-BILL] Error al guardar factura:",
        billError.message
      );
      console.error("❌ [GENERATE-BILL] Detalles del error:", {
        name: billError.name,
        message: billError.message,
        errors: billError.errors,
        sql: billError.sql,
      });

      return res.status(500).json({
        error: true,
        message: "Error al crear la factura en la base de datos",
        details: billError.message,
        validationErrors: billError.errors,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ ACTUALIZAR ESTADO DE LA RESERVA SOLO SI ESTÁ COMPLETAMENTE PAGADA
    if (balance === 0 && booking.status === "checked-in") {
      console.log(
        "🔄 [GENERATE-BILL] Actualizando estado de reserva a completed..."
      );
      try {
        await booking.update({
          status: "completed",
          // completedAt: getColombiaTime() // Si tienes este campo
        });
        console.log(
          "✅ [GENERATE-BILL] Estado de reserva actualizado a 'completed'"
        );
      } catch (updateError) {
        console.warn(
          "⚠️ [GENERATE-BILL] Error al actualizar estado de reserva:",
          updateError.message
        );
        // No fallar la factura por esto
      }
    } else {
      console.log("📝 [GENERATE-BILL] No se actualiza estado de reserva:", {
        balance,
        currentStatus: booking.status,
        reason: balance > 0 ? "Balance pendiente" : "Estado no es checked-in",
      });
    }

    // ⭐ CALCULAR NOCHES DE ESTADÍA
    const nights = getDaysDifference(booking.checkIn, booking.checkOut);

    // ⭐ CREAR RESPUESTA ENRIQUECIDA CON INFORMACIÓN DE DESCUENTOS
    console.log("📤 [GENERATE-BILL] Preparando respuesta enriquecida...");

    const responseData = {
      ...savedBill.toJSON(),

      // ⭐ INFORMACIÓN DEL HUÉSPED
      guestInfo: {
        name: booking.guest?.scostumername || "Huésped",
        document: booking.guest?.sdocno || booking.guestId,
        email: booking.guest?.selectronicmail || null,
        phone: booking.guest?.stelephone || null,
      },

      // ⭐ INFORMACIÓN DE LA HABITACIÓN
      roomInfo: {
        number: booking.room?.roomNumber || booking.roomNumber,
        type: booking.room?.type || "Standard",
        checkIn: formatForLogs(booking.checkIn),
        checkOut: formatForLogs(booking.checkOut),
        checkInFormatted: formatColombiaDate(booking.checkIn),
        checkOutFormatted: formatColombiaDate(booking.checkOut),
      },

      // ⭐ DETALLES DE LA RESERVA CON INFORMACIÓN DE DESCUENTO
      bookingDetails: {
        bookingId: booking.bookingId,
        roomCharge: adjustedReservationAmount, // ✅ USAR MONTO AJUSTADO
        originalRoomCharge: originalReservationAmount, // ✅ AGREGAR MONTO ORIGINAL
        discountApplied: discountAmount, // ✅ AGREGAR DESCUENTO
        discountReason: booking.discountReason || null, // ✅ AGREGAR RAZÓN
        discountAppliedAt: booking.discountAppliedAt
          ? formatForLogs(booking.discountAppliedAt)
          : null,
        extraCharges: extraCharges.map((charge) => ({
          id: charge.id,
          description: charge.description,
          amount: parseFloat(charge.amount || 0),
          quantity: parseInt(charge.quantity || 1),
          totalAmount:
            parseFloat(charge.amount || 0) * parseInt(charge.quantity || 1),
          chargeType: charge.chargeType,
          chargeDate: formatForLogs(charge.chargeDate),
          amountFormatted: `$${parseFloat(
            charge.amount || 0
          ).toLocaleString()}`,
        })),
        nights,
        guestCount: booking.guestCount,
        pointOfSale: booking.pointOfSale || "Local",
        // ✅ FORMATEOS DE DESCUENTO
        originalRoomChargeFormatted: `$${originalReservationAmount.toLocaleString()}`,
        discountAppliedFormatted:
          discountAmount > 0 ? `$${discountAmount.toLocaleString()}` : null,
        roomChargeFormatted: `$${adjustedReservationAmount.toLocaleString()}`,
      },

      // ⭐ INFORMACIÓN DE PAGOS
      paymentsInfo: {
        totalPaid,
        balance,
        paymentCount: payments.length,
        isFullyPaid: balance === 0,
        payments: payments.map((payment) => ({
          paymentId: payment.paymentId,
          amount: parseFloat(payment.amount || 0),
          paymentMethod: payment.paymentMethod,
          paymentType: payment.paymentType,
          paymentDate: formatForLogs(payment.paymentDate),
          amountFormatted: `$${parseFloat(
            payment.amount || 0
          ).toLocaleString()}`,
        })),
        totalPaidFormatted: `$${totalPaid.toLocaleString()}`,
        balanceFormatted: `$${balance.toLocaleString()}`,
      },

      // ⭐ FECHAS FORMATEADAS
      createdAtFormatted: formatForLogs(savedBill.createdAt),
      createdAtDisplay: formatForDisplay(savedBill.createdAt),
      totalAmountFormatted: `$${totalAmount.toLocaleString()}`,
      reservationAmountFormatted: `$${adjustedReservationAmount.toLocaleString()}`, // ✅ AJUSTADO
      extraChargesAmountFormatted: `$${totalExtras.toLocaleString()}`,

      // ⭐ INFORMACIÓN DE ESTADO
      statusInfo: {
        status: savedBill.status,
        statusLabel:
          savedBill.status === "paid"
            ? "Pagada"
            : savedBill.status === "pending"
            ? "Pendiente"
            : "Cancelada",
        isPaid: savedBill.status === "paid",
        isPending: savedBill.status === "pending",
        needsPayment: balance > 0,
        paymentPercentage:
          totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0,
      },

      // ✅ INFORMACIÓN DE DESCUENTO EN LA RESPUESTA
      discountInfo:
        discountAmount > 0
          ? {
              discountAmount,
              discountReason: booking.discountReason || "Descuento aplicado",
              discountAppliedAt: booking.discountAppliedAt
                ? formatForLogs(booking.discountAppliedAt)
                : null,
              originalAmount: originalReservationAmount,
              adjustedAmount: adjustedReservationAmount,
              discountPercentage:
                originalReservationAmount > 0
                  ? Math.round(
                      (discountAmount / originalReservationAmount) * 100
                    )
                  : 0,
              // Formateos
              discountAmountFormatted: `$${discountAmount.toLocaleString()}`,
              originalAmountFormatted: `$${originalReservationAmount.toLocaleString()}`,
              adjustedAmountFormatted: `$${adjustedReservationAmount.toLocaleString()}`,
              savingsMessage: `Ahorro de $${discountAmount.toLocaleString()} aplicado por ${
                booking.discountReason || "descuento"
              }`,
            }
          : null,

      // ⭐ ACCIONES DISPONIBLES
      availableActions: {
        canSendToTaxxa: savedBill.status === "paid" && !savedBill.taxInvoiceId,
        canGenerateTaxInvoice: savedBill.status === "paid",
        canCancelBill: savedBill.status === "pending",
        canMakeAdditionalPayment: balance > 0,
        canDownloadPdf: true,
        canEmailToGuest: !!booking.guest?.selectronicmail,
      },

      // ⭐ METADATOS CON INFO DE DESCUENTO
      metadata: {
        generatedAt: formatForLogs(getColombiaTime()),
        generatedBy: req.user?.n_document || "system",
        timezone: "America/Bogota",
        currency: "COP",
        hasExtraCharges: totalExtras > 0,
        hasTaxes: parseFloat(savedBill.taxAmount || 0) > 0,
        hasDiscount: discountAmount > 0, // ✅ AGREGAR FLAG
        nightsStayed: nights,
        // ✅ CÁLCULOS ADICIONALES
        totalSavings: discountAmount,
        effectiveRate: nights > 0 ? adjustedReservationAmount / nights : 0,
        originalRate: nights > 0 ? originalReservationAmount / nights : 0,
      },
    };

    console.log(
      "✅ [GENERATE-BILL] Factura generada exitosamente con descuentos:",
      {
        idBill: savedBill.idBill,
        originalAmount: originalReservationAmount,
        discountAmount: discountAmount,
        finalAmount: savedBill.totalAmount,
        status: savedBill.status,
        balance: balance,
        isFullyPaid: balance === 0,
        discountApplied: discountAmount > 0,
        generatedAt: formatForLogs(getColombiaTime()),
      }
    );

    res.status(201).json({
      error: false,
      message:
        discountAmount > 0
          ? `Factura generada exitosamente con descuento de $${discountAmount.toLocaleString()}`
          : "Factura generada exitosamente",
      data: responseData,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [GENERATE-BILL] Error general:", error);
    console.error(
      "🕐 [GENERATE-BILL] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error interno al generar la factura",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

const getAllBills = async (req, res) => {
  try {
    console.log("🧾 [GET-ALL-BILLS] Iniciando consulta de facturas");
    console.log(
      "🕐 [GET-ALL-BILLS] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log("📥 [GET-ALL-BILLS] Parámetros de consulta:", req.query);

    // ⭐ PARÁMETROS DE CONSULTA OPCIONALES
    const {
      status,
      limit = 50,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "DESC",
      fromDate,
      toDate,
      roomNumber,
      guestDocument,
      includeDetails = "true",
    } = req.query;

    // ⭐ CONSTRUIR FILTROS DE BÚSQUEDA
    const whereConditions = {};

    if (status) {
      whereConditions.status = status;
      console.log("🔍 [GET-ALL-BILLS] Filtro por estado:", status);
    }

    // ⭐ FILTRO POR RANGO DE FECHAS
    if (fromDate || toDate) {
      whereConditions.createdAt = {};
      if (fromDate) {
        whereConditions.createdAt[Op.gte] = toColombiaTime(fromDate);
      }
      if (toDate) {
        whereConditions.createdAt[Op.lte] = toColombiaTime(toDate);
      }
      console.log("📅 [GET-ALL-BILLS] Filtro por fechas:", {
        fromDate,
        toDate,
      });
    }

    // ⭐ CONSTRUIR INCLUDES CON FILTROS OPCIONALES
    const includeOptions = [
      {
        model: Booking,
        as: "booking",
        attributes: [
          "bookingId",
          "roomNumber",
          "checkIn",
          "checkOut",
          "guestCount",
          "status",
          "pointOfSale",
          "totalAmount",
        ],
        where: {
          ...(roomNumber && { roomNumber }),
        },
        include: [
          {
            model: Buyer,
            as: "guest",
            attributes: [
              "sdocno",
              "scostumername",
              "selectronicmail",
              "stelephone",
            ],
            where: {
              ...(guestDocument && { sdocno: guestDocument }),
            },
            required: !!guestDocument,
          },
          {
            model: Room,
            as: "room",
            attributes: ["roomNumber", "type", "maxGuests"],
            required: false,
          },
        ],
        required: !!(roomNumber || guestDocument),
      },
    ];

    console.log("🔍 [GET-ALL-BILLS] Ejecutando consulta con filtros...");

    // ⭐ CONSULTAR FACTURAS CON PAGINACIÓN
    const { count, rows: bills } = await Bill.findAndCountAll({
      where: whereConditions,
      include: includeOptions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true,
    });

    if (!bills || bills.length === 0) {
      console.log("📭 [GET-ALL-BILLS] No se encontraron facturas");
      return res.json({
        error: false,
        message: "No se encontraron facturas con los filtros aplicados",
        data: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        },
        summary: {
          totalBills: 0,
          byStatus: {},
          totalRevenue: 0,
          totalPending: 0,
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log(
      `✅ [GET-ALL-BILLS] Encontradas ${bills.length} facturas de ${count} totales`
    );

    // ⭐ PROCESAR DATOS CON INFORMACIÓN ENRIQUECIDA
    console.log("🔄 [GET-ALL-BILLS] Procesando datos de facturas...");

    const billsWithDetails = bills.map((bill) => {
      const billData = bill.toJSON();

      // ⭐ CALCULAR INFORMACIÓN ADICIONAL
      const totalAmount = parseFloat(billData.totalAmount || 0);
      const reservationAmount = parseFloat(billData.reservationAmount || 0);
      const extraChargesAmount = parseFloat(billData.extraChargesAmount || 0);
      const taxAmount = parseFloat(billData.taxAmount || 0);

      return {
        ...billData,

        // ⭐ INFORMACIÓN FORMATEADA DE FECHAS
        createdAtFormatted: formatForLogs(billData.createdAt),
        updatedAtFormatted: formatForLogs(billData.updatedAt),
        createdAtDisplay: formatForDisplay(billData.createdAt),

        // ⭐ INFORMACIÓN DEL HUÉSPED
        guestName: billData.booking?.guest?.scostumername || "N/A",
        guestDocument: billData.booking?.guest?.sdocno || "N/A",
        guestEmail: billData.booking?.guest?.selectronicmail || "N/A",
        guestPhone: billData.booking?.guest?.stelephone || "N/A",

        // ⭐ INFORMACIÓN DE LA HABITACIÓN
        roomNumber:
          billData.booking?.room?.roomNumber ||
          billData.booking?.roomNumber ||
          "N/A",
        roomType: billData.booking?.room?.type || "N/A",

        // ⭐ INFORMACIÓN DE LA RESERVA
        bookingId: billData.booking?.bookingId || billData.bookingId,
        checkIn: billData.booking?.checkIn
          ? formatForLogs(billData.booking.checkIn)
          : null,
        checkOut: billData.booking?.checkOut
          ? formatForLogs(billData.booking.checkOut)
          : null,
        checkInFormatted: billData.booking?.checkIn
          ? formatColombiaDate(billData.booking.checkIn)
          : null,
        checkOutFormatted: billData.booking?.checkOut
          ? formatColombiaDate(billData.booking.checkOut)
          : null,
        guestCount: billData.booking?.guestCount || 0,
        bookingStatus: billData.booking?.status || "unknown",
        pointOfSale: billData.booking?.pointOfSale || "Local",

        // ⭐ ESTADO DE PAGO
        isPaid: billData.status === "paid",
        isPending: billData.status === "pending",
        isCancelled: billData.status === "cancelled",
        statusLabel:
          billData.status === "paid"
            ? "Pagada"
            : billData.status === "pending"
            ? "Pendiente"
            : "Cancelada",

        // ⭐ TOTALES FORMATEADOS
        totalAmountFormatted: `$${totalAmount.toLocaleString()}`,
        reservationAmountFormatted: `$${reservationAmount.toLocaleString()}`,
        extraChargesAmountFormatted: `$${extraChargesAmount.toLocaleString()}`,
        taxAmountFormatted: `$${taxAmount.toLocaleString()}`,

        // ⭐ INFORMACIÓN DE PAGO
        paymentMethodLabel: billData.paymentMethod
          ? getPaymentMethodLabel(billData.paymentMethod)
          : "No especificado",

        // ⭐ CÁLCULOS ADICIONALES
        hasExtraCharges: extraChargesAmount > 0,
        hasTaxes: taxAmount > 0,
        nightsStayed:
          billData.booking?.checkIn && billData.booking?.checkOut
            ? getDaysDifference(
                billData.booking.checkIn,
                billData.booking.checkOut
              )
            : 0,

        // ⭐ IDENTIFICADOR DE FACTURA FISCAL
        hasTaxInvoice: !!billData.taxInvoiceId,
        taxInvoiceDisplay: billData.taxInvoiceId || "No generada",

        // ⭐ INFORMACIÓN DE ESTADO FINANCIERO
        financialStatus: {
          isPaid: billData.status === "paid",
          isPending: billData.status === "pending",
          totalAmount,
          reservationAmount,
          extraChargesAmount,
          taxAmount,
          percentageExtras:
            reservationAmount > 0
              ? Math.round((extraChargesAmount / reservationAmount) * 100)
              : 0,
        },

        // ⭐ ACCIONES DISPONIBLES
        availableActions: {
          canCancel: billData.status === "pending",
          canSendToTaxxa: billData.status === "paid" && !billData.taxInvoiceId,
          canDownload: true,
          canResend: !!billData.booking?.guest?.selectronicmail,
        },
      };
    });

    // ⭐ CREAR RESUMEN ESTADÍSTICO
    console.log("📊 [GET-ALL-BILLS] Calculando estadísticas...");

    const summary = {
      totalBills: count,
      billsByStatus: {
        paid: billsWithDetails.filter((b) => b.isPaid).length,
        pending: billsWithDetails.filter((b) => b.isPending).length,
        cancelled: billsWithDetails.filter((b) => b.isCancelled).length,
      },
      financialSummary: {
        totalRevenue: billsWithDetails
          .filter((b) => b.isPaid)
          .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0),
        totalPendingAmount: billsWithDetails
          .filter((b) => b.isPending)
          .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0),
        totalExtraCharges: billsWithDetails.reduce(
          (sum, bill) => sum + parseFloat(bill.extraChargesAmount || 0),
          0
        ),
        totalTaxes: billsWithDetails.reduce(
          (sum, bill) => sum + parseFloat(bill.taxAmount || 0),
          0
        ),
        averageBillAmount:
          count > 0
            ? billsWithDetails.reduce(
                (sum, bill) => sum + parseFloat(bill.totalAmount || 0),
                0
              ) / count
            : 0,
      },
      operationalStats: {
        billsWithExtraCharges: billsWithDetails.filter((b) => b.hasExtraCharges)
          .length,
        billsWithTaxes: billsWithDetails.filter((b) => b.hasTaxes).length,
        billsWithTaxInvoice: billsWithDetails.filter((b) => b.hasTaxInvoice)
          .length,
        onlineBookings: billsWithDetails.filter(
          (b) => b.pointOfSale === "Online"
        ).length,
        localBookings: billsWithDetails.filter((b) => b.pointOfSale === "Local")
          .length,
      },
    };

    // ⭐ FORMATEAR TOTALES EN RESUMEN
    summary.financialSummary.totalRevenueFormatted = `$${summary.financialSummary.totalRevenue.toLocaleString()}`;
    summary.financialSummary.totalPendingFormatted = `$${summary.financialSummary.totalPendingAmount.toLocaleString()}`;
    summary.financialSummary.averageBillAmountFormatted = `$${Math.round(
      summary.financialSummary.averageBillAmount
    ).toLocaleString()}`;

    console.log("📊 [GET-ALL-BILLS] Resumen calculado:", {
      total: summary.totalBills,
      paid: summary.billsByStatus.paid,
      pending: summary.billsByStatus.pending,
      revenue: summary.financialSummary.totalRevenueFormatted,
      pending: summary.financialSummary.totalPendingFormatted,
    });

    // ⭐ PREPARAR RESPUESTA FINAL
    const responseData = {
      bills:
        includeDetails === "true"
          ? billsWithDetails
          : billsWithDetails.map((bill) => ({
              idBill: bill.idBill,
              bookingId: bill.bookingId,
              guestName: bill.guestName,
              roomNumber: bill.roomNumber,
              totalAmountFormatted: bill.totalAmountFormatted,
              statusLabel: bill.statusLabel,
              createdAtFormatted: bill.createdAtFormatted,
            })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < count,
        hasPrev: parseInt(page) > 1,
      },
      summary,
      queryInfo: {
        filters: { status, fromDate, toDate, roomNumber, guestDocument },
        sorting: { sortBy, sortOrder },
        includeDetails: includeDetails === "true",
        timestamp: formatForLogs(getColombiaTime()),
      },
    };

    console.log("📤 [GET-ALL-BILLS] Respuesta preparada:", {
      billsCount: responseData.bills.length,
      totalCount: responseData.pagination.total,
      currentPage: responseData.pagination.page,
      totalPages: responseData.pagination.totalPages,
      completedAt: formatForLogs(getColombiaTime()),
    });

    res.json({
      error: false,
      message: `${count} factura(s) obtenida(s) exitosamente`,
      data: responseData.bills,
      pagination: responseData.pagination,
      summary: responseData.summary,
      queryInfo: responseData.queryInfo,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [GET-ALL-BILLS] Error general:", error);
    console.error(
      "🕐 [GET-ALL-BILLS] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error interno al obtener las facturas",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

// ⭐ FUNCIÓN HELPER PARA ETIQUETAS DE MÉTODOS DE PAGO
const getPaymentMethodLabel = (method) => {
  const labels = {
    cash: "Efectivo",
    credit_card: "Tarjeta de Crédito",
    debit_card: "Tarjeta de Débito",
    transfer: "Transferencia",
    online: "Pago Online",
    wompi: "Wompi",
    pse: "PSE",
    nequi: "Nequi",
    daviplata: "Daviplata",
  };
  return labels[method] || method;
};

const updateBookingStatus = async (req, res) => {
  try {
    console.log("🔄 [UPDATE-BOOKING-STATUS] Iniciando actualización de estado");
    console.log(
      "🕐 [UPDATE-BOOKING-STATUS] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log("📥 [UPDATE-BOOKING-STATUS] Parámetros:", {
      bookingId: req.params.bookingId,
      body: req.body,
      user: req.user ? req.user.n_document : "No user",
      buyer: req.buyer ? req.buyer.sdocno : "No buyer",
    });

    const { bookingId } = req.params;
    const {
      status,
      reason,
      notes,
      // ✅ NUEVOS CAMPOS PARA DESCUENTOS
      discountAmount = 0,
      discountReason = "",
      applyDiscount = false,
    } = req.body;

    // ⭐ VALIDACIONES BÁSICAS CON LOGS
    if (!bookingId) {
      console.log("❌ [UPDATE-BOOKING-STATUS] bookingId faltante");
      return res.status(400).json({
        error: true,
        message: "bookingId es requerido",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    if (!status) {
      console.log("❌ [UPDATE-BOOKING-STATUS] status faltante");
      return res.status(400).json({
        error: true,
        message: "status es requerido",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "cancelled",
      "checked-in",
      "completed",
      "paid", // ✅ AGREGAR 'paid' COMO ESTADO VÁLIDO
    ];

    if (!validStatuses.includes(status)) {
      console.log("❌ [UPDATE-BOOKING-STATUS] Estado inválido:", status);
      return res.status(400).json({
        error: true,
        message: "Estado de reserva inválido",
        data: {
          providedStatus: status,
          validStatuses,
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ✅ VALIDAR DESCUENTO SI SE APLICA
    if (applyDiscount) {
      if (!discountAmount || discountAmount <= 0) {
        console.log(
          "❌ [UPDATE-BOOKING-STATUS] Descuento inválido:",
          discountAmount
        );
        return res.status(400).json({
          error: true,
          message:
            "El monto del descuento debe ser mayor a cero cuando applyDiscount es true",
          timestamp: formatForLogs(getColombiaTime()),
        });
      }

      if (!discountReason || discountReason.trim() === "") {
        console.log("❌ [UPDATE-BOOKING-STATUS] Razón de descuento faltante");
        return res.status(400).json({
          error: true,
          message:
            "La razón del descuento es requerida cuando se aplica un descuento",
          timestamp: formatForLogs(getColombiaTime()),
        });
      }
    }

    console.log("🔍 [UPDATE-BOOKING-STATUS] Buscando reserva:", bookingId);

    // ⭐ OBTENER DATOS COMPLETOS DE LA RESERVA
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "type", "status"],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: ["sdocno", "scostumername"],
        },
      ],
    });

    if (!booking) {
      console.log(
        "❌ [UPDATE-BOOKING-STATUS] Reserva no encontrada:",
        bookingId
      );
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [UPDATE-BOOKING-STATUS] Reserva encontrada:", {
      bookingId: booking.bookingId,
      currentStatus: booking.status,
      newStatus: status,
      guestName: booking.guest?.scostumername,
      roomNumber: booking.room?.roomNumber || booking.roomNumber,
      currentTotalAmount: booking.totalAmount,
      hasExistingDiscount: !!(
        booking.discountAmount && booking.discountAmount > 0
      ),
    });

    // ✅ VALIDAR DESCUENTO CONTRA MONTO TOTAL
    if (applyDiscount) {
      const currentTotal = parseFloat(booking.totalAmount || 0);
      const existingDiscount = parseFloat(booking.discountAmount || 0);
      const originalAmount = parseFloat(booking.originalAmount || currentTotal);

      // Calcular el monto base disponible para descuento
      const availableForDiscount = originalAmount - existingDiscount;

      if (discountAmount > availableForDiscount) {
        console.log(
          "❌ [UPDATE-BOOKING-STATUS] Descuento excede monto disponible:",
          {
            discountAmount,
            availableForDiscount,
            originalAmount,
            existingDiscount,
          }
        );
        return res.status(400).json({
          error: true,
          message: `El descuento de $${discountAmount.toLocaleString()} excede el monto disponible de $${availableForDiscount.toLocaleString()}`,
          data: {
            originalAmount: `$${originalAmount.toLocaleString()}`,
            existingDiscount: `$${existingDiscount.toLocaleString()}`,
            availableForDiscount: `$${availableForDiscount.toLocaleString()}`,
            requestedDiscount: `$${discountAmount.toLocaleString()}`,
          },
          timestamp: formatForLogs(getColombiaTime()),
        });
      }
    }

    // ⭐ VALIDAR TRANSICIONES DE ESTADO VÁLIDAS
    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["checked-in", "cancelled", "paid"], // ⭐ AGREGAR 'paid'
      paid: ["checked-in", "cancelled"], // ⭐ NUEVA TRANSICIÓN
      "checked-in": ["completed", "cancelled"],
      completed: [], // No se puede cambiar desde completed
      cancelled: ["confirmed"], // Solo se puede reactivar a confirmed
    };

    const allowedNextStates = validTransitions[booking.status] || [];

    if (!allowedNextStates.includes(status)) {
      console.log("❌ [UPDATE-BOOKING-STATUS] Transición de estado inválida:", {
        from: booking.status,
        to: status,
        allowed: allowedNextStates,
      });

      return res.status(400).json({
        error: true,
        message: `No se puede cambiar de '${booking.status}' a '${status}'`,
        data: {
          currentStatus: booking.status,
          requestedStatus: status,
          allowedTransitions: allowedNextStates,
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ VALIDACIONES ESPECÍFICAS POR ESTADO
    const now = getColombiaTime();
    const checkInDate = toColombiaTime(booking.checkIn);
    const checkOutDate = toColombiaTime(booking.checkOut);

    if (status === "checked-in") {
      // Validar que sea el día correcto para check-in
      if (now < checkInDate) {
        const daysUntil = Math.ceil(
          (checkInDate - now) / (1000 * 60 * 60 * 24)
        );
        console.log(
          "❌ [UPDATE-BOOKING-STATUS] Check-in anticipado:",
          daysUntil,
          "días"
        );

        return res.status(400).json({
          error: true,
          message: `El check-in no está disponible hasta ${formatColombiaDate(
            checkInDate
          )}`,
          data: {
            checkInDate: formatColombiaDate(checkInDate),
            daysUntilCheckIn: daysUntil,
          },
          timestamp: formatForLogs(getColombiaTime()),
        });
      }

      // Validar que no esté expirado
      if (now > checkOutDate) {
        console.log("❌ [UPDATE-BOOKING-STATUS] Reserva expirada");
        return res.status(400).json({
          error: true,
          message: `La reserva expiró el ${formatColombiaDate(checkOutDate)}`,
          data: {
            checkOutDate: formatColombiaDate(checkOutDate),
            expired: true,
          },
          timestamp: formatForLogs(getColombiaTime()),
        });
      }
    }

    // ⭐ DETERMINAR QUIÉN REALIZA LA ACTUALIZACIÓN
    const updatedBy = req.user?.n_document || req.buyer?.sdocno || "system";
    console.log("👤 [UPDATE-BOOKING-STATUS] Actualizado por:", updatedBy);

    // ⭐ PREPARAR DATOS DE ACTUALIZACIÓN CON SOPORTE PARA DESCUENTOS
    const updateData = {
      status,
      statusReason: reason || null,
      statusUpdatedBy: updatedBy,
      statusUpdatedAt: getColombiaTime(),
    };

    // ✅ APLICAR DESCUENTO SI SE SOLICITA
    if (applyDiscount) {
      console.log("💰 [UPDATE-BOOKING-STATUS] Aplicando descuento:", {
        discountAmount,
        discountReason,
        currentTotal: booking.totalAmount,
        existingDiscount: booking.discountAmount || 0,
      });

      // Guardar monto original si no existe
      if (!booking.originalAmount) {
        updateData.originalAmount = booking.totalAmount;
      }

      // Actualizar campos de descuento
      const existingDiscount = parseFloat(booking.discountAmount || 0);
      const newTotalDiscount = existingDiscount + discountAmount;
      const originalAmount = parseFloat(
        booking.originalAmount || booking.totalAmount
      );
      const newTotalAmount = Math.max(0, originalAmount - newTotalDiscount);

      updateData.discountAmount = newTotalDiscount;
      updateData.discountReason =
        existingDiscount > 0
          ? `${
              booking.discountReason || "Descuento previo"
            } + ${discountReason}`
          : discountReason;
      updateData.discountAppliedAt = getColombiaTime();
      updateData.discountAppliedBy = updatedBy;
      updateData.totalAmount = newTotalAmount;

      console.log("💰 [UPDATE-BOOKING-STATUS] Cálculo de descuento:", {
        originalAmount,
        existingDiscount,
        newDiscountAmount: discountAmount,
        newTotalDiscount,
        newTotalAmount,
        discountReason: updateData.discountReason,
      });
    }

    // ⭐ CAMPOS ADICIONALES SEGÚN EL ESTADO
    if (status === "cancelled") {
      updateData.cancelledBy = updatedBy;
      updateData.cancelledAt = getColombiaTime();
      // updateData.cancellationReason = reason; // Si tienes este campo
    } else if (status === "completed") {
      updateData.completedAt = getColombiaTime();
      updateData.completedBy = updatedBy;
    } else if (status === "paid") {
      updateData.paymentCompletedAt = getColombiaTime();
    }

    console.log(
      "📝 [UPDATE-BOOKING-STATUS] Datos de actualización:",
      JSON.stringify(updateData, null, 2)
    );

    // ⭐ ACTUALIZAR RESERVA CON MANEJO DE ERRORES
    try {
      await booking.update(updateData);
      console.log(
        "✅ [UPDATE-BOOKING-STATUS] Reserva actualizada exitosamente"
      );
    } catch (updateError) {
      console.error(
        "❌ [UPDATE-BOOKING-STATUS] Error al actualizar reserva:",
        updateError
      );
      return res.status(500).json({
        error: true,
        message: "Error al actualizar el estado de la reserva",
        details: updateError.message,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ ACTUALIZAR ESTADO DE LA HABITACIÓN SI ES NECESARIO
    if (booking.room && ["cancelled", "completed"].includes(status)) {
      console.log(
        "🏨 [UPDATE-BOOKING-STATUS] Actualizando estado de habitación..."
      );

      try {
        const roomUpdateData = {
          status: null, // NULL = Disponible (tanto para canceladas como completadas)
          available: true,
        };

        await booking.room.update(roomUpdateData);
        console.log(
          "✅ [UPDATE-BOOKING-STATUS] Estado de habitación actualizado:",
          roomUpdateData
        );
      } catch (roomUpdateError) {
        console.warn(
          "⚠️ [UPDATE-BOOKING-STATUS] Error al actualizar habitación:",
          roomUpdateError.message
        );
        // No fallar por esto
      }
    }

    // ⭐ OBTENER DATOS ACTUALIZADOS PARA LA RESPUESTA
    console.log("🔄 [UPDATE-BOOKING-STATUS] Obteniendo datos actualizados...");

    const updatedBooking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "type", "status", "available"],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: ["sdocno", "scostumername", "selectronicmail"],
        },
      ],
    });

    // ✅ PREPARAR RESPUESTA ENRIQUECIDA CON INFORMACIÓN DE DESCUENTO
    const responseData = {
      ...updatedBooking.toJSON(),

      // ⭐ FECHAS FORMATEADAS
      checkInFormatted: formatColombiaDate(updatedBooking.checkIn),
      checkOutFormatted: formatColombiaDate(updatedBooking.checkOut),
      statusUpdatedAtFormatted: formatForLogs(updatedBooking.statusUpdatedAt),

      // ⭐ INFORMACIÓN DE LA ACTUALIZACIÓN
      updateInfo: {
        previousStatus: booking.status,
        newStatus: updatedBooking.status,
        updatedBy,
        updatedAt: formatForLogs(updatedBooking.statusUpdatedAt),
        reason: reason || null,
        notes: notes || null,
        discountApplied: applyDiscount,
        discountAmount: applyDiscount ? discountAmount : null,
        discountReason: applyDiscount ? discountReason : null,
      },

      // ✅ INFORMACIÓN DE DESCUENTO
      discountInfo:
        updatedBooking.discountAmount && updatedBooking.discountAmount > 0
          ? {
              discountAmount: parseFloat(updatedBooking.discountAmount),
              discountReason: updatedBooking.discountReason,
              discountAppliedAt: updatedBooking.discountAppliedAt
                ? formatForLogs(updatedBooking.discountAppliedAt)
                : null,
              discountAppliedBy: updatedBooking.discountAppliedBy,
              originalAmount: parseFloat(
                updatedBooking.originalAmount || updatedBooking.totalAmount
              ),
              adjustedAmount: parseFloat(updatedBooking.totalAmount),
              discountPercentage:
                updatedBooking.originalAmount > 0
                  ? Math.round(
                      (parseFloat(updatedBooking.discountAmount) /
                        parseFloat(updatedBooking.originalAmount)) *
                        100
                    )
                  : 0,
              // Formateos
              discountAmountFormatted: `$${parseFloat(
                updatedBooking.discountAmount
              ).toLocaleString()}`,
              originalAmountFormatted: `$${parseFloat(
                updatedBooking.originalAmount || updatedBooking.totalAmount
              ).toLocaleString()}`,
              adjustedAmountFormatted: `$${parseFloat(
                updatedBooking.totalAmount
              ).toLocaleString()}`,
              savingsMessage: `Ahorro de $${parseFloat(
                updatedBooking.discountAmount
              ).toLocaleString()} aplicado por ${
                updatedBooking.discountReason
              }`,
            }
          : null,

      // ⭐ INFORMACIÓN DE ESTADO
      statusInfo: {
        canCheckIn:
          updatedBooking.status === "confirmed" ||
          updatedBooking.status === "paid",
        canCheckOut: updatedBooking.status === "checked-in",
        isActive: ["confirmed", "checked-in", "paid"].includes(
          updatedBooking.status
        ),
        isCompleted: updatedBooking.status === "completed",
        isCancelled: updatedBooking.status === "cancelled",
        isPaid: updatedBooking.status === "paid",
        allowedNextStates: validTransitions[updatedBooking.status] || [],
      },

      // ⭐ INFORMACIÓN DE LA HABITACIÓN
      roomInfo: updatedBooking.room
        ? {
            roomNumber: updatedBooking.room.roomNumber,
            type: updatedBooking.room.type,
            status: updatedBooking.room.status,
            available: updatedBooking.room.available,
          }
        : null,

      // ⭐ INFORMACIÓN DEL HUÉSPED
      guestInfo: updatedBooking.guest
        ? {
            name: updatedBooking.guest.scostumername,
            document: updatedBooking.guest.sdocno,
            email: updatedBooking.guest.selectronicmail,
          }
        : null,

      // ✅ MONTOS FORMATEADOS
      totalAmountFormatted: `$${parseFloat(
        updatedBooking.totalAmount || 0
      ).toLocaleString()}`,
      originalAmountFormatted: updatedBooking.originalAmount
        ? `$${parseFloat(updatedBooking.originalAmount).toLocaleString()}`
        : null,
    };

    console.log(
      "✅ [UPDATE-BOOKING-STATUS] Actualización completada exitosamente:",
      {
        bookingId: updatedBooking.bookingId,
        previousStatus: booking.status,
        newStatus: updatedBooking.status,
        discountApplied: applyDiscount,
        newTotalAmount: updatedBooking.totalAmount,
        updatedBy,
        completedAt: formatForLogs(getColombiaTime()),
      }
    );

    res.json({
      error: false,
      message: applyDiscount
        ? `Estado de reserva actualizado exitosamente con descuento de $${discountAmount.toLocaleString()}`
        : "Estado de reserva actualizado exitosamente",
      data: responseData,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [UPDATE-BOOKING-STATUS] Error general:", error);
    console.error(
      "🕐 [UPDATE-BOOKING-STATUS] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error interno al actualizar el estado de la reserva",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    console.log("❌ [CANCEL-BOOKING] Iniciando proceso de cancelación");
    console.log(
      "🕐 [CANCEL-BOOKING] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log("📥 [CANCEL-BOOKING] Parámetros:", {
      bookingId: req.params.bookingId,
      body: req.body,
      user: req.user?.n_document || req.buyer?.sdocno || "No user",
    });

    const { bookingId } = req.params;
    const {
      reason,
      requestType = "cancellation", // "cancellation" | "date_change" | "credit_voucher"
      newCheckIn = null,
      newCheckOut = null,
      notes = "",
    } = req.body;

    // ⭐ VALIDACIONES BÁSICAS
    if (!bookingId) {
      return res.status(400).json({
        error: true,
        message: "bookingId es requerido",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "La razón de cancelación es requerida",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ OBTENER DATOS COMPLETOS DE LA RESERVA
    console.log("🔍 [CANCEL-BOOKING] Buscando reserva:", bookingId);

    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "type", "status"],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: ["sdocno", "scostumername", "selectronicmail"],
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "paymentId",
            "amount",
            "paymentStatus",
            "paymentMethod",
            "paymentDate",
          ],
          where: { paymentStatus: ["completed", "authorized"] },
          required: false,
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log("✅ [CANCEL-BOOKING] Reserva encontrada:", {
      bookingId: booking.bookingId,
      status: booking.status,
      checkIn: formatForLogs(booking.checkIn),
      roomNumber: booking.room?.roomNumber,
      guestName: booking.guest?.scostumername,
      hasPayments: booking.payments?.length > 0,
    });

    // ⭐ VALIDAR QUE LA RESERVA PUEDA SER CANCELADA
    if (!["confirmed", "paid", "pending"].includes(booking.status)) {
      return res.status(400).json({
        error: true,
        message: `No se puede cancelar una reserva en estado '${booking.status}'`,
        data: {
          currentStatus: booking.status,
          allowedStatuses: ["confirmed", "paid", "pending"],
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐⭐ NUEVA VALIDACIÓN: PREVENIR CANCELACIÓN DE RESERVAS COMPLETAMENTE PAGADAS
    // Calcular pagos primero para validar
    const totalPaidForValidation =
      booking.payments?.reduce((sum, payment) => {
        return sum + parseFloat(payment.amount || 0);
      }, 0) || 0;

    // Si está completamente pagada y no es modificación de fechas, NO permitir cancelación
    const isFullyPaid = totalPaidForValidation >= parseFloat(booking.totalAmount || 0);
    const isAdminForceCancel = req.body.forceCancel === true && req.user?.role === 'owner';
    
    if (isFullyPaid && requestType === "cancellation" && !isAdminForceCancel) {
      console.log("⛔ [CANCEL-BOOKING] Intento de cancelar reserva completamente pagada");
      return res.status(400).json({
        error: true,
        message: "No se puede cancelar una reserva que está completamente pagada",
        data: {
          currentStatus: booking.status,
          totalAmount: booking.totalAmount,
          totalPaid: totalPaidForValidation,
          suggestion: "Si el huésped ya no se hospedará, debe hacer el checkout o modificar las fechas",
          note: "Para cancelaciones administrativas forzadas, contacte al administrador del sistema"
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    if (isFullyPaid && requestType === "cancellation" && isAdminForceCancel) {
      console.log("⚠️ [CANCEL-BOOKING] Cancelación administrativa forzada de reserva pagada");
      console.log("   Usuario:", req.user?.n_document);
      console.log("   Rol:", req.user?.role);
    }

    // ⭐ CALCULAR DÍAS HASTA EL CHECK-IN
    const now = getColombiaTime();
    const checkInDate = toColombiaTime(booking.checkIn);
    const daysUntilCheckIn = Math.ceil(
      (checkInDate - now) / (1000 * 60 * 60 * 24)
    );

    console.log("📅 [CANCEL-BOOKING] Análisis de fechas:", {
      now: formatForLogs(now),
      checkIn: formatForLogs(checkInDate),
      daysUntilCheckIn,
      canModifyDates: daysUntilCheckIn >= 5,
      isAfterCheckIn: daysUntilCheckIn < 0,
    });

    // ⭐ VALIDAR POLÍTICA DE 5 DÍAS PARA MODIFICACIÓN
    if (requestType === "date_change" && daysUntilCheckIn < 5) {
      return res.status(400).json({
        error: true,
        message:
          "Las modificaciones de fecha deben realizarse con un mínimo de 5 días de anticipación",
        data: {
          daysUntilCheckIn,
          minimumRequired: 5,
          checkInDate: formatColombiaDate(checkInDate),
          policy:
            "Política del Hotel Balú: modificaciones requieren 5 días mínimo",
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ CALCULAR PAGOS REALIZADOS
    const totalPaid =
      booking.payments?.reduce((sum, payment) => {
        return sum + parseFloat(payment.amount || 0);
      }, 0) || 0;

    console.log("💰 [CANCEL-BOOKING] Análisis financiero:", {
      totalAmount: booking.totalAmount,
      totalPaid,
      hasPayments: totalPaid > 0,
      paymentCount: booking.payments?.length || 0,
    });

    // ⭐ DETERMINAR TIPO DE CANCELACIÓN Y POLÍTICAS
    let cancellationPolicy;
    let refundPolicy;
    let creditVoucherPolicy;

    if (daysUntilCheckIn >= 5) {
      // ✅ CANCELACIÓN CON SUFICIENTE ANTICIPACIÓN
      cancellationPolicy = {
        type: "early_cancellation",
        description: "Cancelación con más de 5 días de anticipación",
        allowsModification: true,
        allowsFullCancellation: true,
        refundType: totalPaid > 0 ? "credit_voucher" : "no_refund_needed",
      };

      if (totalPaid > 0) {
        refundPolicy = {
          type: "no_refund",
          amount: 0,
          reason: "Hotel Balú no realiza devoluciones de dinero",
        };

        creditVoucherPolicy = {
          type: "credit_voucher",
          amount: totalPaid,
          validityDays: 30,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          description:
            "Crédito válido por 30 días calendario para nueva reserva",
        };
      } else {
        // Sin pagos previos
        refundPolicy = {
          type: "no_payment",
          amount: 0,
          reason: "No había pagos realizados",
        };

        creditVoucherPolicy = {
          type: "no_payment",
          amount: 0,
          description: "No aplica crédito porque no había pagos",
        };
      }
    } else if (daysUntilCheckIn >= 0) {
      // ⚠️ CANCELACIÓN CON MENOS DE 5 DÍAS
      cancellationPolicy = {
        type: "late_cancellation",
        description: "Cancelación con menos de 5 días de anticipación",
        allowsModification: false,
        allowsFullCancellation: true,
        refundType: "forfeit_payment",
      };

      refundPolicy = {
        type: "forfeit",
        amount: 0,
        reason: "Cancelación tardía: el hotel se queda con el anticipo",
      };

      creditVoucherPolicy = {
        type: "forfeit",
        amount: 0,
        description: "No aplica crédito por cancelación tardía",
      };
    } else {
      // ❌ CANCELACIÓN DESPUÉS DEL CHECK-IN (NO SHOW)
      cancellationPolicy = {
        type: "no_show",
        description: "Cancelación después de la fecha de check-in",
        allowsModification: false,
        allowsFullCancellation: true,
        refundType: "forfeit_payment",
      };

      refundPolicy = {
        type: "forfeit",
        amount: 0,
        reason: "No show: el hotel se queda con el anticipo",
      };

      creditVoucherPolicy = {
        type: "forfeit",
        amount: 0,
        description: "No aplica crédito por no presentarse",
      };
    }

    console.log("📋 [CANCEL-BOOKING] Políticas aplicables:", {
      cancellationPolicy: cancellationPolicy.type,
      refundPolicy: refundPolicy.type,
      creditVoucherPolicy: creditVoucherPolicy.type,
      allowsModification: cancellationPolicy.allowsModification,
    });

    // ⭐ VALIDAR CAMBIO DE FECHAS SI SE SOLICITA
    if (requestType === "date_change") {
      if (!newCheckIn || !newCheckOut) {
        return res.status(400).json({
          error: true,
          message:
            "Para cambio de fechas se requieren newCheckIn y newCheckOut",
          timestamp: formatForLogs(getColombiaTime()),
        });
      }

      if (!cancellationPolicy.allowsModification) {
        return res.status(400).json({
          error: true,
          message:
            "No se permite modificación de fechas con menos de 5 días de anticipación",
          data: {
            daysUntilCheckIn,
            policy: cancellationPolicy.description,
          },
          timestamp: formatForLogs(getColombiaTime()),
        });
      }

      // Validar que las nuevas fechas sean válidas
      const newCheckInDate = toColombiaTime(newCheckIn);
      const newCheckOutDate = toColombiaTime(newCheckOut);

      if (newCheckInDate <= now) {
        return res.status(400).json({
          error: true,
          message: "La nueva fecha de check-in debe ser posterior a hoy",
          timestamp: formatForLogs(getColombiaTime()),
        });
      }

      if (newCheckOutDate <= newCheckInDate) {
        return res.status(400).json({
          error: true,
          message: "La nueva fecha de check-out debe ser posterior al check-in",
          timestamp: formatForLogs(getColombiaTime()),
        });
      }

      // TODO: Verificar disponibilidad de la habitación en las nuevas fechas
      // Esto requeriría una consulta adicional de disponibilidad
    }

    // ⭐ DETERMINAR QUIÉN CANCELA
    const cancelledBy = req.user?.n_document || req.buyer?.sdocno || "guest";
    const isStaffCancellation = !!req.user?.n_document;

    // ⭐ EJECUTAR LA CANCELACIÓN O MODIFICACIÓN
    const updateData = {
      statusReason: reason,
      statusUpdatedBy: cancelledBy,
      statusUpdatedAt: getColombiaTime(),
      cancelledBy: cancelledBy,
      cancelledAt: getColombiaTime(),
      cancellationNotes: notes || null,
      cancellationType: cancellationPolicy.type,
      // ⭐ NUEVOS CAMPOS PARA POLÍTICAS
      refundType: refundPolicy.type,
      refundAmount: refundPolicy.amount || 0,
      creditVoucherAmount: creditVoucherPolicy.amount || 0,
      creditVoucherValidUntil: creditVoucherPolicy.validUntil || null,
      creditVoucherIssued: creditVoucherPolicy.amount > 0,
    };

    if (requestType === "date_change") {
      // MODIFICACIÓN DE FECHAS
      updateData.status = "confirmed";
      updateData.checkIn = newCheckIn;
      updateData.checkOut = newCheckOut;
      updateData.dateChanged = true;
      updateData.dateChangedAt = getColombiaTime();
      updateData.dateChangedBy = cancelledBy;
      updateData.originalCheckIn = booking.checkIn;
      updateData.originalCheckOut = booking.checkOut;

      console.log("🔄 [CANCEL-BOOKING] Modificando fechas de la reserva");
    } else {
      // CANCELACIÓN COMPLETA
      updateData.status = "cancelled";
      console.log("❌ [CANCEL-BOOKING] Cancelando reserva completamente");
    }

    console.log("📝 [CANCEL-BOOKING] Datos de actualización:", updateData);

    // ⭐ ACTUALIZAR LA RESERVA
    try {
      await booking.update(updateData);
      console.log("✅ [CANCEL-BOOKING] Reserva actualizada exitosamente");
    } catch (updateError) {
      console.error(
        "❌ [CANCEL-BOOKING] Error al actualizar reserva:",
        updateError
      );
      return res.status(500).json({
        error: true,
        message: "Error al procesar la cancelación",
        details: updateError.message,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ LIBERAR LA HABITACIÓN (solo si es cancelación completa)
    if (requestType !== "date_change" && booking.room) {
      try {
        await booking.room.update({
          status: null, // NULL = Disponible
          available: true,
        });
        console.log(
          "🏨 [CANCEL-BOOKING] Habitación liberada:",
          booking.room.roomNumber
        );
      } catch (roomError) {
        console.warn(
          "⚠️ [CANCEL-BOOKING] Error al liberar habitación:",
          roomError.message
        );
      }
    }

    // ⭐ GENERAR VOUCHER DE CRÉDITO SI APLICA
    let creditVoucher = null;
    
    if (creditVoucherPolicy.amount > 0) {
      console.log("💳 [CANCEL-BOOKING] Creando voucher en base de datos...");
      
      const voucherId = `VOUCHER-${booking.bookingId}-${Date.now()}`;
      const voucherCode = generateVoucherCode();
      
      try {
        const newVoucher = await Voucher.create({
          voucherId: voucherId,
          voucherCode: voucherCode,
          amount: creditVoucherPolicy.amount,
          status: 'active',
          guestId: booking.guestId,
          originalBookingId: booking.bookingId,
          validUntil: creditVoucherPolicy.validUntil,
          createdBy: req.user?.n_document || req.buyer?.sdocno || 'system',
          notes: `Crédito por cancelación de reserva #${booking.bookingId}. Motivo: ${reason}`,
          metadata: {
            originalCheckIn: formatForLogs(booking.checkIn),
            originalCheckOut: formatForLogs(booking.checkOut),
            originalAmount: parseFloat(booking.totalAmount),
            cancelReason: reason,
            cancellationType: cancellationPolicy.type,
            daysUntilCheckIn: daysUntilCheckIn,
            isStaffCancellation: !!req.user?.n_document,
            cancelledAt: formatForLogs(getColombiaTime()),
            requestType: requestType
          }
        });

        console.log("✅ [CANCEL-BOOKING] Voucher creado exitosamente en BD:", {
          voucherId: newVoucher.voucherId,
          voucherCode: newVoucher.voucherCode,
          amount: parseFloat(newVoucher.amount),
          validUntil: formatForLogs(newVoucher.validUntil),
          guestId: newVoucher.guestId
        });

        // ⭐ ACTUALIZAR creditVoucher CON DATOS REALES DE LA BD
        creditVoucher = {
          voucherId: newVoucher.voucherId,
          voucherCode: newVoucher.voucherCode,
          amount: parseFloat(newVoucher.amount),
          validUntil: newVoucher.validUntil,
          guestId: newVoucher.guestId,
          originalBookingId: newVoucher.originalBookingId,
          createdAt: newVoucher.createdAt,
          status: newVoucher.status,
          notes: newVoucher.notes,
          // ⭐ FORMATEOS PARA EL FRONTEND
          amountFormatted: `$${parseFloat(newVoucher.amount).toLocaleString()}`,
          validUntilFormatted: formatColombiaDate(newVoucher.validUntil),
          createdAtFormatted: formatForLogs(newVoucher.createdAt),
          // ⭐ INFORMACIÓN ÚTIL PARA EL USUARIO
          daysUntilExpiry: Math.ceil((new Date(newVoucher.validUntil) - new Date()) / (1000 * 60 * 60 * 24)),
          canBeUsed: true,
          usageInstructions: "Presente este código al hacer una nueva reserva: " + newVoucher.voucherCode
        };

      } catch (voucherError) {
        console.error("❌ [CANCEL-BOOKING] Error creando voucher en BD:", voucherError);
        console.error("🔍 [CANCEL-BOOKING] Detalles del error:", {
          message: voucherError.message,
          name: voucherError.name,
          sql: voucherError.sql,
          errors: voucherError.errors
        });
        
        // ⭐ NO FALLAR LA CANCELACIÓN POR EL VOUCHER, PERO INFORMAR EL ERROR
        creditVoucher = {
          error: true,
          errorMessage: "No se pudo crear el voucher automáticamente en la base de datos",
          errorDetails: voucherError.message,
          // ⭐ DATOS TEMPORALES PARA REFERENCIA
          voucherId: voucherId,
          amount: creditVoucherPolicy.amount,
          validUntil: creditVoucherPolicy.validUntil,
          status: "error",
          manualCreationRequired: true,
          contactInfo: "Contacte al hotel para que generen manualmente su voucher de crédito",
          // ⭐ FORMATEOS PARA MOSTRAR AL USUARIO
          amountFormatted: `$${creditVoucherPolicy.amount.toLocaleString()}`,
          validUntilFormatted: formatColombiaDate(creditVoucherPolicy.validUntil)
        };

        // ⭐ LOG ADICIONAL PARA SEGUIMIENTO MANUAL
        console.error("🚨 [CANCEL-BOOKING] VOUCHER MANUAL REQUERIDO:", {
          bookingId: booking.bookingId,
          guestId: booking.guestId,
          guestName: booking.guest?.scostumername,
          amount: creditVoucherPolicy.amount,
          reason: reason,
          timestamp: formatForLogs(getColombiaTime())
        });
      }
    }

    // ⭐ PREPARAR RESPUESTA COMPLETA (resto del código sin cambios)
    const responseData = {
      booking: {
        bookingId: booking.bookingId,
        status: updateData.status,
        originalCheckIn:
          requestType === "date_change" ? formatForLogs(booking.checkIn) : null,
        originalCheckOut:
          requestType === "date_change"
            ? formatForLogs(booking.checkOut)
            : null,
        newCheckIn:
          requestType === "date_change" ? formatForLogs(newCheckIn) : null,
        newCheckOut:
          requestType === "date_change" ? formatForLogs(newCheckOut) : null,
        cancelledAt: formatForLogs(updateData.cancelledAt),
        cancelledBy: cancelledBy,
        cancellationType: cancellationPolicy.type,
        isStaffCancellation,
      },

      // ⭐ INFORMACIÓN DE POLÍTICAS APLICADAS
      policies: {
        cancellation: cancellationPolicy,
        refund: refundPolicy,
        creditVoucher: creditVoucherPolicy,
        daysUntilCheckIn,
        appliedRule:
          daysUntilCheckIn >= 5
            ? "5+ días antes: Crédito válido por 30 días"
            : daysUntilCheckIn >= 0
            ? "Menos de 5 días: Hotel se queda con anticipo"
            : "No show: Hotel se queda con anticipo",
      },

      // ⭐ INFORMACIÓN FINANCIERA
      financial: {
        totalAmount: parseFloat(booking.totalAmount || 0),
        totalPaid,
        refundAmount: refundPolicy.amount || 0,
        creditVoucherAmount: creditVoucherPolicy.amount || 0,
        forfeited: refundPolicy.type === "forfeit",
        // Formateos
        totalAmountFormatted: `$${parseFloat(
          booking.totalAmount || 0
        ).toLocaleString()}`,
        totalPaidFormatted: `$${totalPaid.toLocaleString()}`,
        refundAmountFormatted: `$${(
          refundPolicy.amount || 0
        ).toLocaleString()}`,
        creditVoucherFormatted: `$${(
          creditVoucherPolicy.amount || 0
        ).toLocaleString()}`,
      },

      // ⭐ VOUCHER DE CRÉDITO (AHORA CON DATOS REALES DE LA BD)
      creditVoucher,

      // ⭐ INFORMACIÓN DE LA HABITACIÓN
      room: booking.room
        ? {
            roomNumber: booking.room.roomNumber,
            type: booking.room.type,
            statusAfterCancellation:
              requestType === "date_change" ? booking.room.status : null,
            available: requestType !== "date_change",
          }
        : null,

      // ⭐ PRÓXIMOS PASOS (MEJORADOS CON INFO DEL VOUCHER)
      nextSteps: {
        needsNewBooking:
          requestType !== "date_change" && creditVoucherPolicy.amount > 0,
        creditValidDays: creditVoucherPolicy.amount > 0 ? 30 : 0,
        canRebook: creditVoucherPolicy.amount > 0 && creditVoucher && !creditVoucher.error,
        voucherCode: creditVoucher && !creditVoucher.error ? creditVoucher.voucherCode : null,
        voucherInstructions: creditVoucher && !creditVoucher.error 
          ? `Use el código ${creditVoucher.voucherCode} para aplicar su crédito en una nueva reserva`
          : null,
        contactInfo: creditVoucher && creditVoucher.error 
          ? "Contacte al hotel para generar manualmente su voucher de crédito"
          : "Para nueva reserva con crédito, contactar recepción o usar el código proporcionado",
        hotelPolicies: [
          "Modificaciones requieren 5 días mínimo de anticipación",
          "No se realizan devoluciones de dinero",
          "Créditos válidos por 30 días calendario",
          "Habitaciones sujetas a disponibilidad",
          "Los vouchers se pueden usar para cualquier tipo de habitación"
        ],
        // ⭐ ACCIONES DISPONIBLES
        availableActions: {
          canUseVoucherOnline: creditVoucher && !creditVoucher.error,
          canCheckVoucherStatus: creditVoucher && !creditVoucher.error,
          needsManualVoucherCreation: creditVoucher && creditVoucher.error,
          canMakeNewReservation: true,
          canContactSupport: true
        }
      },
    };

    // ⭐ MENSAJE DE RESPUESTA PERSONALIZADO (MEJORADO)
    let responseMessage;
    if (requestType === "date_change") {
      responseMessage = "Fechas de reserva modificadas exitosamente";
    } else if (creditVoucherPolicy.amount > 0) {
      if (creditVoucher && !creditVoucher.error) {
        responseMessage = `Reserva cancelada exitosamente. Voucher ${creditVoucher.voucherCode} creado por $${creditVoucherPolicy.amount.toLocaleString()} válido por 30 días`;
      } else {
        responseMessage = `Reserva cancelada. Crédito de $${creditVoucherPolicy.amount.toLocaleString()} pendiente de generar manualmente`;
      }
    } else {
      responseMessage =
        "Reserva cancelada. Sin derecho a reembolso según políticas del hotel";
    }

    console.log("✅ [CANCEL-BOOKING] Cancelación procesada exitosamente:", {
      bookingId: booking.bookingId,
      type: requestType,
      daysUntilCheckIn,
      totalPaid,
      creditAmount: creditVoucherPolicy.amount || 0,
      voucherCreated: creditVoucher && !creditVoucher.error,
      voucherCode: creditVoucher && !creditVoucher.error ? creditVoucher.voucherCode : null,
      voucherError: creditVoucher && creditVoucher.error ? true : false,
      completedAt: formatForLogs(getColombiaTime()),
    });

    res.json({
      error: false,
      message: responseMessage,
      data: responseData,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [CANCEL-BOOKING] Error general:", error);
    console.error(
      "🕐 [CANCEL-BOOKING] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error interno al procesar la cancelación",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

// ...existing code...

const getCancellationPolicies = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findByPk(bookingId, {
      attributes: ["bookingId", "checkIn", "checkOut", "status", "totalAmount"],
      include: [
        {
          model: Payment,
          as: "payments",
          attributes: ["amount", "paymentStatus"],
          where: { paymentStatus: ["completed", "authorized"] },
          required: false,
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
      });
    }

    const now = getColombiaTime(); // DateTime de Luxon
    const checkInDate = toColombiaTime(booking.checkIn); // DateTime de Luxon

    // ✅ CORRECTO: Usar diff() de Luxon
    const daysUntilCheckIn = Math.ceil(checkInDate.diff(now, "days").days);
    console.log("🧪 [TEST] Verificando cálculo de días:", {
      now: formatForLogs(now),
      checkInDate: formatForLogs(checkInDate),
      nowType: typeof now,
      checkInType: typeof checkInDate,
      daysUntilCheckIn,
      isLuxonDateTime: now.constructor.name === "DateTime",
    });
    const totalPaid =
      booking.payments?.reduce(
        (sum, payment) => sum + parseFloat(payment.amount || 0),
        0
      ) || 0;

    let policies;
    if (daysUntilCheckIn >= 5) {
      policies = {
        canModifyDates: true,
        canCancel: true,
        refundType: "credit_voucher",
        creditAmount: totalPaid,
        creditValidityDays: 30,
        message:
          "Puede modificar fechas o cancelar con crédito válido por 30 días",
      };
    } else if (daysUntilCheckIn >= 0) {
      policies = {
        canModifyDates: false,
        canCancel: true,
        refundType: "forfeit",
        creditAmount: 0,
        forfeitAmount: totalPaid,
        message:
          "Solo puede cancelar. El hotel se queda con el anticipo por cancelación tardía",
      };
    } else {
      policies = {
        canModifyDates: false,
        canCancel: true,
        refundType: "forfeit",
        creditAmount: 0,
        forfeitAmount: totalPaid,
        message:
          "Solo puede cancelar. El hotel se queda con el anticipo por no presentarse",
      };
    }

    res.json({
      error: false,
      data: {
        bookingId: booking.bookingId,
        checkIn: formatColombiaDate(booking.checkIn),
        checkOut: formatColombiaDate(booking.checkOut),
        daysUntilCheckIn,
        totalAmount: parseFloat(booking.totalAmount || 0),
        totalPaid,
        policies,
        hotelPolicies: {
          modificationDeadline: "5 días mínimo de anticipación",
          refundPolicy: "No se realizan devoluciones de dinero",
          creditPolicy: "Créditos válidos por 30 días calendario",
          availabilityNote: "Habitaciones sujetas a disponibilidad",
        },
      },
    });
  } catch (error) {
    console.error("Error obteniendo políticas de cancelación:", error);
    res.status(500).json({
      error: true,
      message: "Error al obtener políticas de cancelación",
      details: error.message,
    });
  }
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

const updateInventoryStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { inventoryVerified, inventoryDelivered } = req.body;

    console.log(`📦 [INVENTORY-STATUS] Updating for booking: ${bookingId}`, {
      inventoryVerified,
      inventoryDelivered,
    });

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
      });
    }

    const updateData = {};
    if (inventoryVerified !== undefined) {
      updateData.inventoryVerified = inventoryVerified;
      updateData.inventoryVerifiedAt = inventoryVerified
        ? getColombiaTime()
        : null;
    }
    if (inventoryDelivered !== undefined) {
      updateData.inventoryDelivered = inventoryDelivered;
      updateData.inventoryDeliveredAt = inventoryDelivered
        ? getColombiaTime()
        : null;
      updateData.inventoryDeliveredBy = inventoryDelivered
        ? req.user?.n_document || "system"
        : null;
    }

    await booking.update(updateData);

    console.log(
      `✅ [INVENTORY-STATUS] Updated booking ${bookingId}:`,
      updateData
    );

    res.json({
      error: false,
      message: "Estado de inventario actualizado exitosamente",
      data: {
        bookingId,
        inventoryVerified: booking.inventoryVerified,
        inventoryDelivered: booking.inventoryDelivered,
        inventoryVerifiedAt: booking.inventoryVerifiedAt
          ? formatForLogs(booking.inventoryVerifiedAt)
          : null,
        inventoryDeliveredAt: booking.inventoryDeliveredAt
          ? formatForLogs(booking.inventoryDeliveredAt)
          : null,
        inventoryDeliveredBy: booking.inventoryDeliveredBy,
      },
    });
  } catch (error) {
    console.error("❌ [INVENTORY-STATUS] Error:", error);
    res.status(500).json({
      error: true,
      message: "Error al actualizar estado de inventario",
      details: error.message,
    });
  }
};

// ⭐ NUEVO ENDPOINT: Verificar y actualizar estado de pasajeros
const updatePassengersStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    console.log(`👥 [PASSENGERS-STATUS] Checking for booking: ${bookingId}`);

    // Obtener la reserva
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "status"],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
      });
    }

    // Contar pasajeros registrados
    const registeredCount = await RegistrationPass.count({
      where: { bookingId },
    });

    const requiredCount = parseInt(booking.guestCount) || 1;
    const passengersCompleted = registeredCount >= requiredCount;

    // Actualizar estado si cambió
    if (booking.passengersCompleted !== passengersCompleted) {
      await booking.update({
        passengersCompleted,
        passengersCompletedAt: passengersCompleted ? getColombiaTime() : null,
      });
    }

    // Verificar si está listo para check-in completo
    const isReadyForCheckIn =
      booking.inventoryDelivered &&
      passengersCompleted;

    if (isReadyForCheckIn && !booking.checkInReadyAt) {
      await booking.update({
        checkInReadyAt: getColombiaTime(),
      });
    }

    console.log(
      `✅ [PASSENGERS-STATUS] Updated booking ${bookingId}: ${passengersCompleted} (${registeredCount}/${requiredCount})`
    );

    res.json({
      error: false,
      message: "Estado de pasajeros actualizado exitosamente",
      data: {
        bookingId,
        registeredCount,
        requiredCount,
        passengersCompleted,
        passengersCompletedAt: booking.passengersCompletedAt
          ? formatForLogs(booking.passengersCompletedAt)
          : null,
        isReadyForCheckIn,
        checkInReadyAt: booking.checkInReadyAt
          ? formatForLogs(booking.checkInReadyAt)
          : null,
      },
    });
  } catch (error) {
    console.error("❌ [PASSENGERS-STATUS] Error:", error);
    res.status(500).json({
      error: true,
      message: "Error al actualizar estado de pasajeros",
      details: error.message,
    });
  }
};

// ⭐ NUEVO ENDPOINT: Obtener estado completo de check-in
const getCheckInStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    console.log(`🔍 [CHECKIN-STATUS] Getting status for booking: ${bookingId}`);

    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "status", "type"],
        },
        {
          model: RegistrationPass,
          as: "registrationPasses",
          attributes: ["registrationNumber", "name"],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
      });
    }

    const registeredCount = booking.registrationPasses?.length || 0;
    const requiredCount = parseInt(booking.guestCount) || 1;

    const checkInStatus = {
      bookingId,
      currentStatus: booking.status,

      // Estados de inventario
      inventoryVerified: booking.inventoryVerified || false,
      inventoryVerifiedAt: booking.inventoryVerifiedAt
        ? formatForLogs(booking.inventoryVerifiedAt)
        : null,
      inventoryDelivered: booking.inventoryDelivered || false,
      inventoryDeliveredAt: booking.inventoryDeliveredAt
        ? formatForLogs(booking.inventoryDeliveredAt)
        : null,
      inventoryDeliveredBy: booking.inventoryDeliveredBy,

      // Estados de pasajeros
      passengersCompleted: booking.passengersCompleted || false,
      passengersCompletedAt: booking.passengersCompletedAt
        ? formatForLogs(booking.passengersCompletedAt)
        : null,
      registeredPassengers: registeredCount,
      requiredPassengers: requiredCount,
      passengersProgress: `${registeredCount}/${requiredCount}`,

      // Estado de habitación
      roomStatus: booking.room?.status || "unknown",

      // Estado general
      checkInProgress: booking.checkInProgress || false,
      checkInReadyAt: booking.checkInReadyAt
        ? formatForLogs(booking.checkInReadyAt)
        : null,

      // Verificaciones
      allRequirementsMet:
        (booking.inventoryDelivered || false) &&
        (booking.passengersCompleted || false),

      // Pasos pendientes
      pendingSteps: [
        ...(!(booking.inventoryVerified || false)
          ? ["Verificar inventario"]
          : []),
        ...(!(booking.inventoryDelivered || false)
          ? ["Entregar inventario"]
          : []),
        ...(!(booking.passengersCompleted || false)
          ? ["Completar registro de pasajeros"]
          : []),
      ],

      // Pasos completados
      completedSteps: [
        ...(booking.inventoryVerified || false
          ? ["Inventario verificado"]
          : []),
        ...(booking.inventoryDelivered || false
          ? ["Inventario entregado"]
          : []),
        ...(booking.passengersCompleted || false
          ? ["Pasajeros registrados"]
          : []),
      ],
    };

    console.log(
      `✅ [CHECKIN-STATUS] Status retrieved for booking ${bookingId}`,
      {
        allRequirementsMet: checkInStatus.allRequirementsMet,
        pendingSteps: checkInStatus.pendingSteps.length,
        completedSteps: checkInStatus.completedSteps.length,
      }
    );

    res.json({
      error: false,
      message: "Estado de check-in obtenido exitosamente",
      data: checkInStatus,
    });
  } catch (error) {
    console.error("❌ [CHECKIN-STATUS] Error:", error);
    res.status(500).json({
      error: true,
      message: "Error al obtener estado de check-in",
      details: error.message,
    });
  }
};

// ⭐ AGREGAR AL FINAL DEL ARCHIVO, ANTES DEL module.exports:
const updateCheckInProgress = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { checkInProgress } = req.body;

    console.log(
      `🚀 [CHECKIN-PROGRESS] Updating progress for booking: ${bookingId}`,
      { checkInProgress }
    );

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
      });
    }

    await booking.update({
      checkInProgress,
      ...(checkInProgress && { checkInStartedAt: getColombiaTime() }),
    });

    console.log(
      `✅ [CHECKIN-PROGRESS] Updated booking ${bookingId} progress: ${checkInProgress}`
    );

    res.json({
      error: false,
      message: `Proceso de check-in ${
        checkInProgress ? "iniciado" : "detenido"
      } exitosamente`,
      data: {
        bookingId,
        checkInProgress: booking.checkInProgress,
        checkInStartedAt: booking.checkInStartedAt
          ? formatForLogs(booking.checkInStartedAt)
          : null,
      },
    });
  } catch (error) {
    console.error("❌ [CHECKIN-PROGRESS] Error:", error);
    res.status(500).json({
      error: true,
      message: "Error al actualizar progreso de check-in",
      details: error.message,
    });
  }
};

const validateCancellation = async (req, res) => {
  try {
    console.log(
      "🔍 [VALIDATE-CANCELLATION] Iniciando validación de cancelación"
    );
    console.log(
      "🕐 [VALIDATE-CANCELLATION] Hora Colombia:",
      formatForLogs(getColombiaTime())
    );
    console.log("📥 [VALIDATE-CANCELLATION] Parámetros:", {
      bookingId: req.params.bookingId,
      body: req.body,
      user: req.user?.n_document || "No user",
    });

    const { bookingId } = req.params;
    const { reason, validateRefund = true, requiredAmount = 0 } = req.body;

    // ⭐ VALIDACIONES BÁSICAS
    if (!bookingId) {
      return res.status(400).json({
        error: true,
        message: "ID de reserva es requerido",
      });
    }

    console.log("🔍 [VALIDATE-CANCELLATION] Buscando reserva:", bookingId);

    // ⭐ OBTENER DATOS COMPLETOS DE LA RESERVA
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["roomNumber", "type", "status"],
        },
        {
          model: Buyer,
          as: "guest",
          attributes: ["sdocno", "scostumername", "selectronicmail"],
        },
        {
          model: Payment,
          as: "payments",
          attributes: [
            "paymentId",
            "amount",
            "paymentStatus",
            "paymentMethod",
            "paymentDate",
          ],
          where: { paymentStatus: ["completed", "authorized"] },
          required: false,
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        error: true,
        message: "Reserva no encontrada",
      });
    }

    console.log("✅ [VALIDATE-CANCELLATION] Reserva encontrada:", {
      bookingId: booking.bookingId,
      status: booking.status,
      checkIn: formatForLogs(booking.checkIn),
      roomNumber: booking.room?.roomNumber,
      guestName: booking.guest?.scostumername,
      hasPayments: booking.payments?.length > 0,
    });

    // ⭐ VALIDAR QUE LA RESERVA PUEDA SER CANCELADA
    if (!["confirmed", "paid", "pending"].includes(booking.status)) {
      return res.status(400).json({
        error: true,
        message: `No se puede cancelar una reserva con estado: ${booking.status}`,
        canCancel: false,
      });
    }

    // ⭐ CALCULAR DÍAS HASTA EL CHECK-IN
    const now = getColombiaTime();
    const checkInDate = toColombiaTime(booking.checkIn);
    const daysUntilCheckIn = Math.ceil(
      (checkInDate - now) / (1000 * 60 * 60 * 24)
    );

    console.log("📅 [VALIDATE-CANCELLATION] Análisis de fechas:", {
      now: formatForLogs(now),
      checkIn: formatForLogs(checkInDate),
      daysUntilCheckIn,
      canModifyDates: daysUntilCheckIn >= 5,
      isAfterCheckIn: daysUntilCheckIn < 0,
    });

    // ⭐ CALCULAR PAGOS REALIZADOS
    const totalPaid =
      booking.payments?.reduce((sum, payment) => {
        return sum + parseFloat(payment.amount || 0);
      }, 0) || 0;

    console.log("💰 [VALIDATE-CANCELLATION] Análisis financiero:", {
      totalAmount: booking.totalAmount,
      totalPaid,
      hasPayments: totalPaid > 0,
      paymentCount: booking.payments?.length || 0,
    });

    // ⭐ DETERMINAR POLÍTICAS DE CANCELACIÓN
    let cancellationPolicy;
    let refundPolicy;
    let creditVoucherPolicy;

    if (daysUntilCheckIn >= 5) {
      // Más de 5 días: Se puede cancelar con crédito
      cancellationPolicy = {
        canCancel: true,
        canModifyDates: true,
        type: "standard",
        allowsModification: true,
        message: "Cancelación permitida con crédito por 30 días",
      };

      refundPolicy = {
        type: "credit_voucher",
        amount: 0,
        message: "No se realizan devoluciones de dinero",
      };

      creditVoucherPolicy = {
        amount: totalPaid,
        validUntil: now.plus({ days: 30 }).toJSDate(),
        type: "credit_voucher",
        message: `Crédito por $${totalPaid.toLocaleString()} válido por 30 días`,
      };
    } else if (daysUntilCheckIn >= 0) {
      // Menos de 5 días pero antes del check-in: Hotel se queda con anticipo
      cancellationPolicy = {
        canCancel: true,
        canModifyDates: false,
        type: "late_cancellation",
        allowsModification: false,
        message: "Cancelación tardía - Hotel retiene el anticipo",
      };

      refundPolicy = {
        type: "forfeit",
        amount: 0,
        message: "Hotel se queda con el anticipo pagado",
      };

      creditVoucherPolicy = {
        amount: 0,
        validUntil: null,
        type: "forfeit",
        message: "No se genera crédito por cancelación tardía",
      };
    } else {
      // Después del check-in: No show
      cancellationPolicy = {
        canCancel: false,
        canModifyDates: false,
        type: "no_show",
        allowsModification: false,
        message: "No se puede cancelar después del check-in",
      };

      refundPolicy = {
        type: "forfeit",
        amount: 0,
        message: "No show - Hotel se queda con el pago completo",
      };

      creditVoucherPolicy = {
        amount: 0,
        validUntil: null,
        type: "forfeit",
        message: "No se genera crédito por no show",
      };
    }

    console.log("📋 [VALIDATE-CANCELLATION] Políticas aplicables:", {
      cancellationPolicy: cancellationPolicy.type,
      refundPolicy: refundPolicy.type,
      creditVoucherPolicy: creditVoucherPolicy.type,
      canCancel: cancellationPolicy.canCancel,
    });

    // ⭐ PREPARAR RESPUESTA DE VALIDACIÓN
    const validationResult = {
      canCancel: cancellationPolicy.canCancel,
      booking: {
        bookingId: booking.bookingId,
        status: booking.status,
        checkIn: formatColombiaDate(booking.checkIn),
        checkOut: formatColombiaDate(booking.checkOut),
        roomNumber: booking.room?.roomNumber,
        guestName: booking.guest?.scostumername,
        totalAmount: parseFloat(booking.totalAmount || 0),
        totalPaid,
      },
      policies: {
        cancellation: cancellationPolicy,
        refund: refundPolicy,
        creditVoucher: creditVoucherPolicy,
        daysUntilCheckIn,
        appliedRule:
          daysUntilCheckIn >= 5
            ? "Más de 5 días: Crédito por 30 días"
            : daysUntilCheckIn >= 0
            ? "Menos de 5 días: Hotel se queda con anticipo"
            : "No show: Hotel se queda con anticipo",
      },
      financial: {
        totalAmount: parseFloat(booking.totalAmount || 0),
        totalPaid,
        estimatedRefund: refundPolicy.amount || 0,
        estimatedCredit: creditVoucherPolicy.amount || 0,
        forfeited: refundPolicy.type === "forfeit",
        totalAmountFormatted: `$${parseFloat(
          booking.totalAmount || 0
        ).toLocaleString()}`,
        totalPaidFormatted: `$${totalPaid.toLocaleString()}`,
        estimatedRefundFormatted: `$${(
          refundPolicy.amount || 0
        ).toLocaleString()}`,
        estimatedCreditFormatted: `$${(
          creditVoucherPolicy.amount || 0
        ).toLocaleString()}`,
      },
      warnings: [],
      errors: [],
    };

    // ⭐ AGREGAR ADVERTENCIAS SI APLICAN
    if (!cancellationPolicy.canCancel) {
      validationResult.errors.push("Esta reserva no puede ser cancelada");
    }

    if (daysUntilCheckIn < 5 && daysUntilCheckIn >= 0) {
      validationResult.warnings.push(
        "Cancelación tardía: Hotel retendrá el anticipo"
      );
    }

    if (totalPaid === 0) {
      validationResult.warnings.push("No hay pagos realizados para procesar");
    }

    console.log("✅ [VALIDATE-CANCELLATION] Validación completada:", {
      bookingId: booking.bookingId,
      canCancel: validationResult.canCancel,
      daysUntilCheckIn,
      totalPaid,
      creditAmount: creditVoucherPolicy.amount || 0,
      completedAt: formatForLogs(getColombiaTime()),
    });

    res.json({
      error: false,
      message: "Validación de cancelación completada",
      data: validationResult,
      timestamp: formatForLogs(getColombiaTime()),
    });
  } catch (error) {
    console.error("❌ [VALIDATE-CANCELLATION] Error general:", error);
    console.error(
      "🕐 [VALIDATE-CANCELLATION] Hora del error:",
      formatForLogs(getColombiaTime())
    );

    res.status(500).json({
      error: true,
      message: "Error interno al validar cancelación",
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// � CANCELAR RESERVA CON REEMBOLSO - CASOS EXCEPCIONALES (Solo Owner)
// ═══════════════════════════════════════════════════════════════
const cancelBookingWithRefund = async (req, res) => {
  const transaction = await Booking.sequelize.transaction();
  
  try {
    const { bookingId } = req.params;
    const { refundReason, refundMethod = 'transfer', notes } = req.body;
    
    console.log('💸 [CANCEL-WITH-REFUND] ⭐ CASO EXCEPCIONAL - Cancelación con reembolso');
    console.log('🕐 [CANCEL-WITH-REFUND] Hora Colombia:', formatForLogs(getColombiaTime()));
    console.log('📥 [CANCEL-WITH-REFUND] Request:', {
      bookingId,
      refundReason,
      refundMethod,
      user: req.user?.n_document,
      role: req.user?.role
    });

    // ⭐ VALIDACIÓN #1: Solo owner puede ejecutar reembolsos
    if (req.user?.role !== 'owner') {
      await transaction.rollback();
      return res.status(403).json({
        error: true,
        message: '🚫 ACCESO DENEGADO: Solo el dueño del hotel puede autorizar reembolsos por fuerza mayor',
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ VALIDACIÓN #2: Debe incluir razón del reembolso
    if (!refundReason || refundReason.trim() === '') {
      await transaction.rollback();
      return res.status(400).json({
        error: true,
        message: 'Debe especificar la razón del reembolso (fuerza mayor, emergencia, etc.)',
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ BUSCAR LA RESERVA CON DATOS COMPLETOS
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['roomNumber', 'status', 'available', 'type']
        },
        {
          model: Buyer,
          as: 'guest',
          attributes: ['scostumername', 'sdocno', 'semail', 'sphone']
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['paymentId', 'amount', 'paymentMethod', 'paymentStatus', 'paymentType', 'paymentDate']
        },
        {
          model: ExtraCharge,
          as: 'extraCharges',
          attributes: ['id', 'amount', 'description']
        }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        error: true,
        message: `Reserva ${bookingId} no encontrada`,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log('📋 [CANCEL-WITH-REFUND] Reserva encontrada:', {
      bookingId: booking.bookingId,
      roomNumber: booking.roomNumber,
      status: booking.status,
      totalAmount: booking.totalAmount,
      guest: booking.guest?.scostumername,
      checkIn: formatForLogs(toColombiaTime(booking.checkIn)),
      checkOut: formatForLogs(toColombiaTime(booking.checkOut))
    });

    // ⭐ VALIDACIÓN #3: No se puede cancelar si ya está checked-in o completed
    if (booking.status === 'checked-in') {
      await transaction.rollback();
      return res.status(400).json({
        error: true,
        message: '❌ No se puede cancelar una reserva cuando el huésped ya está hospedado (checked-in)',
        data: {
          suggestion: 'Debe hacer checkout primero o esperar a que el huésped se retire',
          currentStatus: booking.status
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    if (booking.status === 'completed') {
      await transaction.rollback();
      return res.status(400).json({
        error: true,
        message: '❌ No se puede cancelar una reserva ya completada',
        data: {
          suggestion: 'Esta reserva ya fue finalizada. Contacte con el administrador del sistema',
          currentStatus: booking.status
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ CALCULAR PAGOS REALIZADOS
    const completedPayments = booking.payments?.filter(p => 
      p.paymentStatus === 'authorized' || p.paymentStatus === 'completed'
    ) || [];

    const totalPaid = completedPayments.reduce((sum, p) => 
      sum + parseFloat(p.amount || 0), 0
    );

    console.log('💰 [CANCEL-WITH-REFUND] Cálculo de pagos:', {
      totalPaid,
      paymentsCount: completedPayments.length,
      totalAmount: booking.totalAmount
    });

    // ⭐ VALIDACIÓN #4: Debe haber pagos para reembolsar
    if (totalPaid <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: true,
        message: '❌ No hay pagos que reembolsar en esta reserva',
        data: {
          totalPaid,
          suggestion: 'Use la cancelación normal para reservas sin pago'
        },
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ REGISTRAR EL REEMBOLSO COMO PAGO NEGATIVO
    const refundPayment = await Payment.create({
      bookingId,
      amount: -totalPaid, // ⭐ MONTO NEGATIVO para indicar salida de dinero
      paymentMethod: refundMethod,
      paymentType: 'refund',
      paymentStatus: 'completed',
      paymentDate: getColombiaTime().toJSDate(),
      transactionId: `REFUND-${bookingId}-${Date.now()}`,
      paymentReference: `REEMBOLSO FUERZA MAYOR - ${refundReason}`,
      notes: `
🚨 CASO EXCEPCIONAL - REEMBOLSO POR FUERZA MAYOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Razón: ${refundReason}
Monto reembolsado: $${totalPaid.toLocaleString('es-CO')}
Autorizado por: ${req.user?.n_document} (Owner)
Método: ${refundMethod}
${notes ? `Notas adicionales: ${notes}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `.trim(),
      processedBy: req.user?.n_document,
      isReservationPayment: false,
      isCheckoutPayment: false,
      includesExtras: false
    }, { transaction });

    console.log('✅ [CANCEL-WITH-REFUND] Reembolso registrado:', {
      paymentId: refundPayment.paymentId,
      amount: refundPayment.amount,
      method: refundMethod
    });

    // ⭐ ACTUALIZAR ESTADO DE LA RESERVA A CANCELLED
    await booking.update({
      status: 'cancelled',
      notes: `
${booking.notes || ''}

🚨 CANCELACIÓN EXCEPCIONAL CON REEMBOLSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fecha: ${formatForLogs(getColombiaTime())}
Razón: ${refundReason}
Monto reembolsado: $${totalPaid.toLocaleString('es-CO')}
Autorizado por: ${req.user?.n_document} (Owner)
${notes ? `Notas: ${notes}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `.trim()
    }, { transaction });

    console.log('✅ [CANCEL-WITH-REFUND] Reserva actualizada a cancelled');

    // ⭐ LIBERAR HABITACIÓN
    if (booking.roomNumber) {
      await Room.update(
        {
          status: null,
          available: true,
          updatedAt: new Date()
        },
        {
          where: { roomNumber: booking.roomNumber },
          transaction
        }
      );

      console.log(`🔓 [CANCEL-WITH-REFUND] Habitación ${booking.roomNumber} liberada`);
    }

    // ⭐ CONFIRMAR TRANSACCIÓN
    await transaction.commit();

    console.log('🎉 [CANCEL-WITH-REFUND] Proceso completado exitosamente');

    res.json({
      error: false,
      success: true,
      message: '✅ Reserva cancelada y reembolso registrado exitosamente',
      data: {
        booking: {
          bookingId: booking.bookingId,
          roomNumber: booking.roomNumber,
          guest: booking.guest?.scostumername,
          previousStatus: booking.status,
          newStatus: 'cancelled'
        },
        refund: {
          paymentId: refundPayment.paymentId,
          amount: totalPaid,
          method: refundMethod,
          reason: refundReason,
          transactionId: refundPayment.transactionId
        },
        financial: {
          originalPayments: completedPayments.length,
          totalRefunded: totalPaid,
          refundMethod: refundMethod
        },
        room: {
          number: booking.roomNumber,
          status: 'Disponible',
          liberated: true
        }
      },
      timestamp: formatForLogs(getColombiaTime()),
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [CANCEL-WITH-REFUND] Error:', error);
    
    res.status(500).json({
      error: true,
      message: 'Error al procesar la cancelación con reembolso',
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// �🗑️ ELIMINAR RESERVA COMPLETAMENTE (Solo Owner)
// ═══════════════════════════════════════════════════════════════
const deleteBookingPermanently = async (req, res) => {
  const transaction = await Booking.sequelize.transaction();
  
  try {
    const { bookingId } = req.params;
    console.log('🗑️ [DELETE-BOOKING] Iniciando eliminación permanente de reserva:', bookingId);

    // ⭐ VALIDACIÓN: Solo owner puede eliminar
    if (req.user?.role !== 'owner') {
      await transaction.rollback();
      return res.status(403).json({
        error: true,
        message: 'Solo el dueño del hotel puede eliminar reservas permanentemente',
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    // ⭐ BUSCAR LA RESERVA
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['roomNumber', 'status', 'available']
        },
        {
          model: Payment,
          as: 'payments'
        }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        error: true,
        message: `Reserva ${bookingId} no encontrada`,
        timestamp: formatForLogs(getColombiaTime()),
      });
    }

    console.log('📋 [DELETE-BOOKING] Reserva encontrada:', {
      bookingId: booking.bookingId,
      roomNumber: booking.roomNumber,
      status: booking.status,
      totalAmount: booking.totalAmount,
      payments: booking.payments?.length || 0
    });

    // ⭐ ELIMINAR PAGOS ASOCIADOS
    const paymentsDeleted = await Payment.destroy({
      where: { bookingId },
      transaction
    });

    console.log(`✅ [DELETE-BOOKING] ${paymentsDeleted} pago(s) eliminado(s)`);

    // ⭐ ELIMINAR CARGOS EXTRAS (si existen)
    const extraChargesDeleted = await ExtraCharge.destroy({
      where: { bookingId },
      transaction
    });

    console.log(`✅ [DELETE-BOOKING] ${extraChargesDeleted} cargo(s) extra(s) eliminado(s)`);

    // ⭐ ELIMINAR BILL ASOCIADO (si existe)
    const billsDeleted = await Bill.destroy({
      where: { bookingId },
      transaction
    });

    console.log(`✅ [DELETE-BOOKING] ${billsDeleted} factura(s) eliminada(s)`);

    // ⭐ LIBERAR HABITACIÓN
    if (booking.roomNumber) {
      await Room.update(
        {
          status: null,
          available: true,
          updatedAt: new Date()
        },
        {
          where: { roomNumber: booking.roomNumber },
          transaction
        }
      );

      console.log(`🔓 [DELETE-BOOKING] Habitación ${booking.roomNumber} liberada`);
    }

    // ⭐ ELIMINAR LA RESERVA
    await booking.destroy({ transaction });

    console.log(`✅ [DELETE-BOOKING] Reserva ${bookingId} eliminada exitosamente`);

    // ⭐ CONFIRMAR TRANSACCIÓN
    await transaction.commit();

    res.json({
      error: false,
      message: 'Reserva eliminada permanentemente con éxito',
      data: {
        bookingId,
        roomNumber: booking.roomNumber,
        paymentsDeleted,
        extraChargesDeleted,
        billsDeleted,
        roomLiberated: !!booking.roomNumber
      },
      timestamp: formatForLogs(getColombiaTime()),
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [DELETE-BOOKING] Error:', error);
    
    res.status(500).json({
      error: true,
      message: 'Error al eliminar la reserva permanentemente',
      details: error.message,
      timestamp: formatForLogs(getColombiaTime()),
    });
  }
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
  cancelBookingWithRefund, // ⭐ NUEVO: Cancelación con reembolso excepcional
  deleteBookingPermanently,
  getCancellationPolicies,
  validateCancellation,
  getOccupancyReport,
  getRevenueReport,
  getBookingByToken,
  updateOnlinePayment,
  getBookingInventoryStatus,
  getInventoryUsageReport,
  updateInventoryStatus,
  updatePassengersStatus,
  getCheckInStatus,
  updateCheckInProgress,
};
