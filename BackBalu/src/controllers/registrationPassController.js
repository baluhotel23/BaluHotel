const { Booking, Room, RegistrationPass } = require('../data');
const { 
  getColombiaTime, 
  getColombiaDate, 
  formatForLogs, 
  formatForDetailedLogs,
  toColombiaTime 
} = require('../utils/dateUtils');
const PDFDocument = require('pdfkit');

// Crear un nuevo registro de pasajero
const createRegistrationPass = async (req, res) => {
  try {
    console.log("📋 Body recibido en createRegistrationPass:", req.body);
    console.log("🕐 Hora de procesamiento:", formatForDetailedLogs(getColombiaTime()));

    const {
      bookingId,
      passengers,
      name,
      nationality,
      maritalStatus,
      profession,
      stayDuration,
      checkInTime,
      numberOfPeople,
      destination,
      idNumber,
      idIssuingPlace,
      foreignIdOrPassport,
      address,
      phoneNumber,
      vehicleType,
      vehiclePlate,
    } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: true, message: "bookingId es requerido" });
    }

    // ⭐ CORREGIR EL INCLUDE CON EL ALIAS CORRECTO
    const booking = await Booking.findByPk(bookingId, {
      include: [{ 
        model: Room, 
        as: 'room' // ⭐ USAR EL ALIAS DEFINIDO EN LAS ASOCIACIONES
      }],
    });

    if (!booking) {
      return res.status(404).json({ error: true, message: "Reserva no encontrada" });
    }

    // ⭐ CONTAR REGISTROS DE PASAJERO EXISTENTES PARA ESTA RESERVA
    const existingCount = await RegistrationPass.count({ where: { bookingId } });

    // ⭐ ACCEDER AL ROOM CON EL ALIAS CORRECTO Y USAR FECHA DE COLOMBIA
    const roomNumber = booking.room?.roomNumber || booking.roomNumber;
    const checkInDate = toColombiaTime(booking.checkIn || getColombiaDate());

    console.log("🏨 Información de reserva encontrada:", {
      bookingId,
      roomNumber,
      checkInDate: formatForLogs(checkInDate),
      bookingStatus: booking.status
    });

    if (Array.isArray(passengers)) {
      // ⭐ CREAR MÚLTIPLES PASAJEROS CON FECHA DE COLOMBIA
      const createdPassengers = await Promise.all(
        passengers.map(async (passenger, index) => {
          console.log(`👤 Creando pasajero ${index + 1}:`, passenger.name);
          
          return await RegistrationPass.create({
            bookingId,
            roomNumber,
            checkInDate,
            // ⭐ PROCESAR FECHAS DEL PASAJERO SI EXISTEN
            checkInTime: passenger.checkInTime,
            registrationDateTime: getColombiaTime(), // ⭐ FECHA/HORA DE REGISTRO
            ...passenger,
            vehicleType,
            vehiclePlate
          });
        })
      );

      // ⭐ ACTUALIZAR ESTADO DE HABITACIÓN SI ES EL PRIMER PASAJERO
      if (existingCount === 0 && createdPassengers.length) {
        await booking.room.update({ status: 'Ocupada' });
        console.log(`🔄 Estado de habitación ${roomNumber} cambiado a Ocupada automáticamente`);
      }

      console.log(`✅ ${createdPassengers.length} pasajeros creados exitosamente a las ${formatForLogs(getColombiaTime())}`);
    } else {
      // ⭐ CREAR UN SOLO PASAJERO CON FECHA DE COLOMBIA
      console.log("👤 Creando pasajero único:", name);
      
      const newPass = await RegistrationPass.create({
        bookingId,
        roomNumber,
        checkInDate,
        checkInTime,
        registrationDateTime: getColombiaTime(), // ⭐ FECHA/HORA DE REGISTRO
        name,
        nationality,
        maritalStatus,
        profession,
        stayDuration,
        numberOfPeople,
        destination,
        idNumber,
        idIssuingPlace,
        foreignIdOrPassport,
        address,
        phoneNumber,
        vehicleType,
        vehiclePlate
      });

      // ⭐ ACTUALIZAR ESTADO DE HABITACIÓN SI ES EL PRIMER PASAJERO
      if (existingCount === 0) {
        await booking.room.update({ status: 'Ocupada' });
        console.log(`🔄 Estado de habitación ${roomNumber} cambiado a Ocupada automáticamente`);
      }

      console.log(`✅ Pasajero único creado exitosamente a las ${formatForLogs(getColombiaTime())}`);
    }

    // ⭐ OBTENER TODOS LOS PASAJEROS REGISTRADOS CON ALIAS CORREGIDOS
    const allPassengers = await RegistrationPass.findAll({
      where: { bookingId },
      include: [
        { model: Room, as: "room" },
        { model: Booking, as: "booking" },
      ],
      order: [['createdAt', 'ASC']] // ⭐ ORDENAR POR FECHA DE CREACIÓN
    });

    console.log(`📊 Total de pasajeros registrados para reserva ${bookingId}: ${allPassengers.length}`);

    res.status(201).json({
      error: false,
      message: "Registro(s) de pasajero(s) creado(s) exitosamente",
      data: {
        bookingId,
        roomNumber,
        registrationTime: formatForLogs(getColombiaTime()), // ⭐ HORA DE REGISTRO EN RESPUESTA
        passengers: allPassengers,
      },
    });
  } catch (error) {
    console.error("❌ Error al crear el registro de pasajero:", error);
    console.error("🕐 Hora del error:", formatForDetailedLogs(getColombiaTime()));
    
    res.status(500).json({ 
      error: true, 
      message: "Error al crear el registro de pasajero", 
      detalle: error.message,
      timestamp: formatForLogs(getColombiaTime()) // ⭐ TIMESTAMP EN ERRORES
    });
  }
};

// Obtener todos los registros de pasajeros
const getAllRegistrationPasses = async (req, res) => {
  try {
    console.log("📋 Consultando todos los registros de pasajeros a las:", formatForLogs(getColombiaTime()));
    
    // ⭐ CORREGIR ALIAS EN ESTE MÉTODO TAMBIÉN
    const registrationPasses = await RegistrationPass.findAll({
      include: [
        { model: Room, as: "room" },
        { model: Booking, as: "booking" },
      ],
      order: [['createdAt', 'DESC']] // ⭐ MÁS RECIENTES PRIMERO
    });

    if (!registrationPasses.length) {
      return res.status(404).json({ 
        error: true, 
        message: "No se encontraron registros de pasajeros",
        timestamp: formatForLogs(getColombiaTime())
      });
    }

    // Agrupar pasajeros por bookingId
    const groupedByBooking = registrationPasses.reduce((acc, pass) => {
      const bookingId = pass.bookingId;

      if (!acc[bookingId]) {
        acc[bookingId] = {
          bookingId,
          roomNumber: pass.roomNumber,
          // ⭐ AGREGAR INFORMACIÓN DE FECHAS
          checkInDate: pass.checkInDate ? formatForLogs(pass.checkInDate) : null,
          registrationDate: pass.createdAt ? formatForLogs(pass.createdAt) : null,
          passengers: [],
        };
      }

      acc[bookingId].passengers.push({
        ...pass.toJSON(),
        // ⭐ FORMATEAR FECHAS EN CADA PASAJERO
        checkInDate: pass.checkInDate ? formatForLogs(pass.checkInDate) : null,
        registrationDateTime: pass.registrationDateTime ? formatForLogs(pass.registrationDateTime) : null,
        createdAt: formatForLogs(pass.createdAt),
        updatedAt: formatForLogs(pass.updatedAt)
      });
      return acc;
    }, {});

    // Convertir el objeto agrupado en un array
    const result = Object.values(groupedByBooking).map((group) => ({
      bookingId: group.bookingId,
      roomNumber: group.roomNumber,
      checkInDate: group.checkInDate,
      registrationDate: group.registrationDate,
      passengerCount: group.passengers.length,
      passengers: group.passengers,
    }));

    console.log(`📊 Encontrados ${result.length} grupos de reservas con pasajeros registrados`);

    res.status(200).json({ 
      error: false, 
      data: result,
      timestamp: formatForLogs(getColombiaTime()) // ⭐ TIMESTAMP EN RESPUESTA
    });
  } catch (error) {
    console.error("❌ Error al obtener los registros de pasajeros:", error);
    console.error("🕐 Hora del error:", formatForDetailedLogs(getColombiaTime()));
    
    res.status(500).json({ 
      error: true, 
      message: "Error al obtener los registros de pasajeros",
      detalle: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// Actualizar un registro de pasajero
const updateRegistrationPass = async (req, res) => {
  try {
    const { registrationNumber } = req.params;
    const { 
      name, 
      nationality, 
      maritalStatus, 
      profession, 
      stayDuration, 
      checkInTime, 
      numberOfPeople, 
      destination, 
      idNumber, 
      idIssuingPlace, 
      foreignIdOrPassport, 
      address, 
      phoneNumber,
      vehicleType,
      vehiclePlate
    } = req.body;

    console.log(`📝 Actualizando pasajero ${registrationNumber} a las:`, formatForLogs(getColombiaTime()));

    // Buscar el registro de pasajero
    const registrationPass = await RegistrationPass.findByPk(registrationNumber);

    if (!registrationPass) {
      return res.status(404).json({ 
        error: true, 
        message: "Registro de pasajero no encontrado",
        timestamp: formatForLogs(getColombiaTime())
      });
    }

    // ⭐ AGREGAR TIMESTAMP DE ÚLTIMA ACTUALIZACIÓN
    const updateData = {
      name,
      nationality,
      maritalStatus,
      profession,
      stayDuration,
      checkInTime,
      numberOfPeople,
      destination,
      idNumber,
      idIssuingPlace,
      foreignIdOrPassport,
      address,
      phoneNumber,
      vehicleType,
      vehiclePlate,
      lastModified: getColombiaTime(), // ⭐ AGREGAR CAMPO DE ÚLTIMA MODIFICACIÓN
    };

    // Actualizar el registro
    await registrationPass.update(updateData);

    console.log(`✅ Pasajero ${registrationNumber} actualizado exitosamente`);

    res.status(200).json({ 
      error: false, 
      message: "Registro de pasajero actualizado exitosamente", 
      data: {
        ...registrationPass.toJSON(),
        // ⭐ FORMATEAR FECHAS EN LA RESPUESTA
        checkInDate: registrationPass.checkInDate ? formatForLogs(registrationPass.checkInDate) : null,
        createdAt: formatForLogs(registrationPass.createdAt),
        updatedAt: formatForLogs(registrationPass.updatedAt),
        lastModified: formatForLogs(getColombiaTime())
      },
      timestamp: formatForLogs(getColombiaTime())
    });
  } catch (error) {
    console.error("❌ Error al actualizar el registro de pasajero:", error);
    console.error("🕐 Hora del error:", formatForDetailedLogs(getColombiaTime()));
    
    res.status(500).json({ 
      error: true, 
      message: "Error al actualizar el registro de pasajero",
      detalle: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// Eliminar un registro de pasajero
const deleteRegistrationPass = async (req, res) => {
  try {
    const { registrationNumber } = req.params;

    console.log(`🗑️ Eliminando pasajero ${registrationNumber} a las:`, formatForLogs(getColombiaTime()));

    // Buscar el registro de pasajero
    const registrationPass = await RegistrationPass.findByPk(registrationNumber);

    if (!registrationPass) {
      return res.status(404).json({ 
        error: true, 
        message: "Registro de pasajero no encontrado",
        timestamp: formatForLogs(getColombiaTime())
      });
    }

    // ⭐ LOG DEL PASAJERO ANTES DE ELIMINAR
    console.log(`📋 Eliminando pasajero: ${registrationPass.name} (Reserva: ${registrationPass.bookingId})`);

    // Eliminar el registro
    await registrationPass.destroy();

    console.log(`✅ Pasajero ${registrationNumber} eliminado exitosamente`);

    res.status(200).json({ 
      error: false, 
      message: "Registro de pasajero eliminado exitosamente",
      deletedAt: formatForLogs(getColombiaTime()), // ⭐ TIMESTAMP DE ELIMINACIÓN
      timestamp: formatForLogs(getColombiaTime())
    });
  } catch (error) {
    console.error("❌ Error al eliminar el registro de pasajero:", error);
    console.error("🕐 Hora del error:", formatForDetailedLogs(getColombiaTime()));
    
    res.status(500).json({ 
      error: true, 
      message: "Error al eliminar el registro de pasajero",
      detalle: error.message,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// Obtener todos los pasajeros de una reserva específica
const getRegistrationPassesByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    console.log(`🔍 Consultando pasajeros para reserva ${bookingId} a las:`, formatForLogs(getColombiaTime()));
    
    // ⭐ CORREGIR ALIAS AQUÍ TAMBIÉN
    const passengers = await RegistrationPass.findAll({
      where: { bookingId },
      include: [
        { model: Room, as: "room" },
        { model: Booking, as: "booking" },
      ],
      order: [['createdAt', 'ASC']] // ⭐ ORDENAR POR ORDEN DE REGISTRO
    });

    if (!passengers.length) {
      console.log(`ℹ️ No se encontraron pasajeros para la reserva ${bookingId}`);
      return res.status(404).json({ 
        error: true, 
        message: "No se encontraron pasajeros para esta reserva",
        bookingId: parseInt(bookingId),
        timestamp: formatForLogs(getColombiaTime())
      });
    }

    // ⭐ FORMATEAR FECHAS EN CADA PASAJERO
    const formattedPassengers = passengers.map(passenger => ({
      ...passenger.toJSON(),
      checkInDate: passenger.checkInDate ? formatForLogs(passenger.checkInDate) : null,
      registrationDateTime: passenger.registrationDateTime ? formatForLogs(passenger.registrationDateTime) : null,
      createdAt: formatForLogs(passenger.createdAt),
      updatedAt: formatForLogs(passenger.updatedAt)
    }));

    console.log(`✅ Encontrados ${passengers.length} pasajeros para la reserva ${bookingId}`);

    res.status(200).json({ 
      error: false, 
      data: formattedPassengers,
      bookingId: parseInt(bookingId),
      passengerCount: passengers.length,
      timestamp: formatForLogs(getColombiaTime())
    });
  } catch (error) {
    console.error("❌ Error al obtener los pasajeros por reserva:", error);
    console.error("🕐 Hora del error:", formatForDetailedLogs(getColombiaTime()));
    
    res.status(500).json({ 
      error: true, 
      message: "Error al obtener los pasajeros por reserva",
      detalle: error.message,
      bookingId: req.params.bookingId,
      timestamp: formatForLogs(getColombiaTime())
    });
  }
};

// Nuevo: Generar PDF de lista de pasajeros
const downloadPassengerListPdf = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const registrationPasses = await RegistrationPass.findAll({
      where: { bookingId },
      order: [['checkInDate', 'ASC']]
    });
    if (!registrationPasses.length) {
      return res.status(404).json({ error: true, message: 'No se encontraron registros de pasajeros' });
    }
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=passenger_list_${bookingId}.pdf`,
        'Content-Length': pdfData.length
      });
      res.end(pdfData);
    });
    // Cabecera
    doc.fontSize(18).text(`Lista de Pasajeros - Reserva ${bookingId}`, { align: 'center' });
    doc.moveDown();
    // Tabla de pasajeros
    doc.fontSize(12);
    registrationPasses.forEach((pass, idx) => {
      doc.text(`${idx + 1}. Nombre: ${pass.name}`, { continued: false });
      doc.text(`   Nacionalidad: ${pass.nationality}`);
      doc.text(`   Documento: ${pass.idNumber}`);
      doc.text(`   Teléfono: ${pass.phoneNumber || 'N/A'}`);
      if (pass.vehicleType || pass.vehiclePlate) {
        doc.text(`   Vehículo: ${pass.vehicleType || 'N/A'} - Placa: ${pass.vehiclePlate || 'N/A'}`);
      }
      doc.moveDown(0.5);
    });
    doc.end();
  } catch (error) {
    console.error('Error generando PDF de lista de pasajeros:', error);
    res.status(500).json({ error: true, message: 'Error al generar PDF', details: error.message });
  }
};

module.exports = {
  createRegistrationPass,
  getAllRegistrationPasses,
  updateRegistrationPass,
  deleteRegistrationPass,
  getRegistrationPassesByBooking,
  downloadPassengerListPdf
};