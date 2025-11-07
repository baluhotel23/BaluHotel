const { ReceptionShift, Payment, Booking, User, Room } = require('../data');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ⭐ ABRIR TURNO DE RECEPCIÓN
const openShift = async (req, res, next) => {
  try {
    const { openingCash = 0, openingNotes } = req.body;
    
    console.log('🔍 [OPEN-SHIFT] req.user completo:', req.user);
    console.log('🔍 [OPEN-SHIFT] req.user.n_document:', req.user?.n_document);
    console.log('🔍 [OPEN-SHIFT] req.user.userId:', req.user?.userId);
    
    const userId = req.user.n_document;

    console.log('🔓 [OPEN-SHIFT] Abriendo turno para usuario:', userId);

    // ⭐ VERIFICAR QUE NO TENGA UN TURNO ABIERTO
    const existingOpenShift = await ReceptionShift.findOne({
      where: {
        userId,
        status: 'open'
      }
    });

    if (existingOpenShift) {
      console.log('⚠️ [OPEN-SHIFT] Usuario ya tiene un turno abierto:', existingOpenShift.shiftId);
      return res.status(400).json({
        error: true,
        message: 'Ya tienes un turno abierto. Debes cerrarlo antes de abrir uno nuevo.',
        data: {
          existingShift: existingOpenShift.shiftId,
          openedAt: existingOpenShift.openedAt
        }
      });
    }

    // ⭐ CREAR NUEVO TURNO
    const newShift = await ReceptionShift.create({
      userId,
      openingCash: parseFloat(openingCash),
      openingNotes,
      status: 'open',
      ipAddress: req.ip || req.connection.remoteAddress
    });

    console.log('✅ [OPEN-SHIFT] Turno abierto exitosamente:', newShift.shiftId);

    // Obtener información del usuario
    const user = await User.findByPk(userId, {
      attributes: ['n_document', 'first_name', 'last_name', 'email', 'role']
    });

    res.status(201).json({
      error: false,
      message: 'Turno abierto exitosamente',
      data: {
        shift: newShift,
        user
      }
    });

  } catch (error) {
    console.error('❌ [OPEN-SHIFT] Error:', error);
    next(error);
  }
};

// ⭐ OBTENER TURNO ACTUAL DEL USUARIO
const getCurrentShift = async (req, res, next) => {
  try {
    const userId = req.user.n_document;

    console.log('🔍 [GET-CURRENT-SHIFT] Buscando turno activo para usuario:', userId);

    const currentShift = await ReceptionShift.findOne({
      where: {
        userId,
        status: 'open'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['n_document', 'first_name', 'last_name', 'email', 'role']
        }
      ],
      order: [['openedAt', 'DESC']]
    });

    if (!currentShift) {
      return res.status(404).json({
        error: true,
        message: 'No tienes un turno abierto actualmente',
        data: null
      });
    }

    // ⭐ CALCULAR RESUMEN EN TIEMPO REAL
    const summary = await calculateShiftSummary(currentShift.shiftId);

    console.log('✅ [GET-CURRENT-SHIFT] Turno encontrado:', currentShift.shiftId);
    console.log('📊 [GET-CURRENT-SHIFT] Usuario:', {
      userId: currentShift.userId,
      user: currentShift.user ? {
        name: `${currentShift.user.first_name} ${currentShift.user.last_name}`,
        email: currentShift.user.email
      } : 'NO USER INCLUDED'
    });
    console.log('📊 [GET-CURRENT-SHIFT] Summary:', {
      totalCashSales: summary.totalCashSales,
      totalCardSales: summary.totalCardSales,
      totalTransferSales: summary.totalTransferSales,
      cashTransactions: summary.cashTransactions,
      cardTransactions: summary.cardTransactions,
      transferTransactions: summary.transferTransactions
    });

    res.json({
      error: false,
      data: {
        shift: currentShift,
        summary
      }
    });

  } catch (error) {
    console.error('❌ [GET-CURRENT-SHIFT] Error:', error);
    next(error);
  }
};

// ⭐ CERRAR TURNO DE RECEPCIÓN
const closeShift = async (req, res, next) => {
  try {
    const { shiftId, closingCash, closingNotes } = req.body;
    const userId = req.user.n_document;

    console.log('🔒 [CLOSE-SHIFT] Cerrando turno:', shiftId);

    // ⭐ BUSCAR EL TURNO
    const shift = await ReceptionShift.findOne({
      where: {
        shiftId,
        userId,
        status: 'open'
      }
    });

    if (!shift) {
      return res.status(404).json({
        error: true,
        message: 'Turno no encontrado o ya está cerrado'
      });
    }

    // ⭐ CALCULAR TOTALES DEL TURNO
    const summary = await calculateShiftSummary(shiftId);

    // ⭐ CALCULAR DIFERENCIA DE EFECTIVO
    const expectedCash = parseFloat(shift.openingCash) + parseFloat(summary.totalCashSales);
    const cashDifference = parseFloat(closingCash) - expectedCash;

    // ⭐ ACTUALIZAR TURNO CON DATOS DE CIERRE
    await shift.update({
      status: 'closed',
      closedAt: new Date(),
      closingCash: parseFloat(closingCash),
      closingNotes,
      totalCashSales: summary.totalCashSales,
      totalCardSales: summary.totalCardSales,
      totalTransferSales: summary.totalTransferSales,
      totalSales: summary.totalSales,
      totalTransactions: summary.totalTransactions,
      cashTransactions: summary.cashTransactions,
      cardTransactions: summary.cardTransactions,
      transferTransactions: summary.transferTransactions,
      expectedCash,
      cashDifference,
      checkInsProcessed: summary.checkInsProcessed,
      checkOutsProcessed: summary.checkOutsProcessed,
      bookingsCreated: summary.bookingsCreated
    });

    console.log('✅ [CLOSE-SHIFT] Turno cerrado exitosamente');

    res.json({
      error: false,
      message: 'Turno cerrado exitosamente',
      data: {
        shift,
        summary: {
          ...summary,
          closingCash: parseFloat(closingCash),
          expectedCash,
          cashDifference
        }
      }
    });

  } catch (error) {
    console.error('❌ [CLOSE-SHIFT] Error:', error);
    next(error);
  }
};

// ⭐ FUNCIÓN AUXILIAR: CALCULAR RESUMEN DEL TURNO
const calculateShiftSummary = async (shiftId) => {
  try {
    const shift = await ReceptionShift.findByPk(shiftId);
    
    if (!shift) {
      throw new Error('Turno no encontrado');
    }

    // ⭐ OBTENER TODOS LOS PAGOS DEL TURNO
    console.log(`📊 [CALCULATE-SUMMARY] Buscando pagos para turno: ${shiftId}`);
    
    const payments = await Payment.findAll({
      where: {
        shiftId,
        paymentStatus: {
          [Op.in]: ['completed', 'authorized']
        },
        // ⭐ EXCLUIR PAGOS ONLINE (WOMPI)
        paymentMethod: {
          [Op.notIn]: ['wompi', 'wompi_checkout']
        }
      },
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['bookingId', 'roomNumber', 'status']
        }
      ]
    });

    console.log(`💰 [CALCULATE-SUMMARY] Pagos encontrados: ${payments.length}`);
    if (payments.length > 0) {
      console.log(`💰 [CALCULATE-SUMMARY] Detalle:`, payments.map(p => ({
        paymentId: p.paymentId,
        amount: p.amount,
        method: p.paymentMethod,
        status: p.paymentStatus,
        shiftId: p.shiftId
      })));
    }

    // ⭐ INICIALIZAR CONTADORES
    let totalCashSales = 0;
    let totalCardSales = 0;
    let totalTransferSales = 0;
    let cashTransactions = 0;
    let cardTransactions = 0;
    let transferTransactions = 0;

    // ⭐ PROCESAR CADA PAGO
    payments.forEach(payment => {
      const amount = parseFloat(payment.amount);

      switch (payment.paymentMethod) {
        case 'cash':
          totalCashSales += amount;
          cashTransactions++;
          break;
        case 'credit_card':
        case 'debit_card':
          totalCardSales += amount;
          cardTransactions++;
          break;
        case 'transfer':
          totalTransferSales += amount;
          transferTransactions++;
          break;
      }
    });

    const totalSales = totalCashSales + totalCardSales + totalTransferSales;
    const totalTransactions = payments.length;

    // ⭐ CALCULAR EFECTIVO ESPERADO EN CAJA
    const expectedCash = parseFloat(shift.openingCash || 0) + totalCashSales;
    console.log(`💵 [CALCULATE-SUMMARY] Efectivo esperado: Caja inicial $${shift.openingCash} + Ventas efectivo $${totalCashSales} = $${expectedCash}`);

    // ⭐ CONTAR CHECK-INS Y CHECK-OUTS DEL TURNO
    const checkInsProcessed = await Booking.count({
      where: {
        status: 'checked-in',
        checkIn: {
          [Op.between]: [shift.openedAt, shift.closedAt || new Date()]
        }
      }
    });

    const checkOutsProcessed = await Booking.count({
      where: {
        status: 'completed',
        checkOut: {
          [Op.between]: [shift.openedAt, shift.closedAt || new Date()]
        }
      }
    });

    const bookingsCreated = await Booking.count({
      where: {
        createdAt: {
          [Op.between]: [shift.openedAt, shift.closedAt || new Date()]
        }
      }
    });

    return {
      totalCashSales,
      totalCardSales,
      totalTransferSales,
      totalSales,
      totalTransactions,
      cashTransactions,
      cardTransactions,
      transferTransactions,
      checkInsProcessed,
      checkOutsProcessed,
      bookingsCreated,
      expectedCash, // ⭐ NUEVO: Efectivo esperado (caja inicial + ventas efectivo)
      payments
    };

  } catch (error) {
    console.error('❌ [CALCULATE-SUMMARY] Error:', error);
    throw error;
  }
};

// ⭐ OBTENER HISTORIAL DE TURNOS
const getShiftHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, userId, status, limit = 20, offset = 0 } = req.query;

    const whereClause = {};

    // Filtros opcionales
    if (userId) whereClause.userId = userId;
    if (status) whereClause.status = status;
    
    if (startDate && endDate) {
      whereClause.openedAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const shifts = await ReceptionShift.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['n_document', 'first_name', 'last_name', 'email', 'role']
        }
      ],
      order: [['openedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      error: false,
      data: {
        shifts: shifts.rows,
        total: shifts.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('❌ [GET-SHIFT-HISTORY] Error:', error);
    next(error);
  }
};

// ⭐ OBTENER REPORTE DETALLADO DE UN TURNO
const getShiftReport = async (req, res, next) => {
  try {
    const { shiftId } = req.params;

    const shift = await ReceptionShift.findByPk(shiftId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['n_document', 'first_name', 'last_name', 'email', 'role']
        }
      ]
    });

    if (!shift) {
      return res.status(404).json({
        error: true,
        message: 'Turno no encontrado'
      });
    }

    const summary = await calculateShiftSummary(shiftId);

    // ⭐ DEBUG: Ver datos completos antes de enviar
    console.log('📊 [GET-SHIFT-REPORT] Shift encontrado:', {
      shiftId: shift.shiftId,
      userId: shift.userId,
      user: shift.user ? {
        name: `${shift.user.first_name} ${shift.user.last_name}`,
        email: shift.user.email
      } : 'NO USER'
    });
    
    console.log('📊 [GET-SHIFT-REPORT] Summary:', {
      totalCashSales: summary.totalCashSales,
      totalCardSales: summary.totalCardSales,
      totalTransferSales: summary.totalTransferSales,
      cashTransactions: summary.cashTransactions,
      cardTransactions: summary.cardTransactions,
      transferTransactions: summary.transferTransactions
    });

    res.json({
      error: false,
      data: {
        shift,
        summary
      }
    });

  } catch (error) {
    console.error('❌ [GET-SHIFT-REPORT] Error:', error);
    next(error);
  }
};

// ⭐ GENERAR PDF DEL REPORTE DE TURNO
const generateShiftPDF = async (req, res, next) => {
  try {
    const { shiftId } = req.params;

    const shift = await ReceptionShift.findByPk(shiftId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['n_document', 'first_name', 'last_name', 'email', 'role']
        }
      ]
    });

    if (!shift) {
      return res.status(404).json({
        error: true,
        message: 'Turno no encontrado'
      });
    }

    const summary = await calculateShiftSummary(shiftId);

    // ⭐ CREAR DOCUMENTO PDF
    const doc = new PDFDocument({ margin: 50 });
    
    const filename = `turno_${shiftId}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../../pdfs', filename);

    // Asegurar que existe el directorio
    const pdfDir = path.join(__dirname, '../../pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ⭐ ENCABEZADO
    doc.fontSize(20).text('REPORTE DE TURNO - RECEPCIÓN', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Turno #${shiftId}`, { align: 'center' });
    doc.moveDown(2);

    // ⭐ INFORMACIÓN DEL RECEPCIONISTA
    doc.fontSize(14).text('Recepcionista:', { underline: true });
    doc.fontSize(11).text(`Nombre: ${shift.user.first_name} ${shift.user.last_name}`);
    doc.text(`Email: ${shift.user.email}`);
    doc.moveDown();

    // ⭐ INFORMACIÓN DEL TURNO
    doc.fontSize(14).text('Información del Turno:', { underline: true });
    doc.fontSize(11).text(`Apertura: ${new Date(shift.openedAt).toLocaleString('es-CO')}`);
    if (shift.closedAt) {
      doc.text(`Cierre: ${new Date(shift.closedAt).toLocaleString('es-CO')}`);
      const duration = Math.floor((new Date(shift.closedAt) - new Date(shift.openedAt)) / (1000 * 60 * 60));
      doc.text(`Duración: ${duration} horas`);
    }
    doc.moveDown();

    // ⭐ MOVIMIENTOS DE CAJA
    doc.fontSize(14).text('Movimientos de Caja:', { underline: true });
    doc.fontSize(11).text(`Efectivo inicial: $${parseFloat(shift.openingCash).toLocaleString('es-CO')}`);
    doc.text(`Ventas en efectivo: $${summary.totalCashSales.toLocaleString('es-CO')} (${summary.cashTransactions} transacciones)`);
    doc.text(`Ventas con tarjeta: $${summary.totalCardSales.toLocaleString('es-CO')} (${summary.cardTransactions} transacciones)`);
    doc.text(`Ventas por transferencia: $${summary.totalTransferSales.toLocaleString('es-CO')} (${summary.transferTransactions} transacciones)`);
    doc.moveDown();
    doc.fontSize(12).text(`TOTAL VENTAS: $${summary.totalSales.toLocaleString('es-CO')}`, { bold: true });
    
    if (shift.closedAt) {
      doc.moveDown();
      doc.text(`Efectivo esperado: $${parseFloat(shift.expectedCash).toLocaleString('es-CO')}`);
      doc.text(`Efectivo real: $${parseFloat(shift.closingCash).toLocaleString('es-CO')}`);
      const diffColor = shift.cashDifference >= 0 ? 'green' : 'red';
      doc.fillColor(diffColor).text(`Diferencia: $${parseFloat(shift.cashDifference).toLocaleString('es-CO')}`);
      doc.fillColor('black');
    }
    doc.moveDown();

    // ⭐ ACTIVIDADES PROCESADAS
    doc.fontSize(14).text('Actividades Procesadas:', { underline: true });
    doc.fontSize(11).text(`Check-ins: ${summary.checkInsProcessed}`);
    doc.text(`Check-outs: ${summary.checkOutsProcessed}`);
    doc.text(`Reservas creadas: ${summary.bookingsCreated}`);
    doc.moveDown();

    // ⭐ ESTADO DE HABITACIONES
    doc.fontSize(14).text('Estado de Habitaciones al Cierre:', { underline: true });
    doc.moveDown(0.5);

    // Obtener todas las habitaciones
    const rooms = await Room.findAll({
      order: [['roomNumber', 'ASC']]
    });

    // Obtener todas las reservas activas y futuras
    const allBookings = await Booking.findAll({
      where: {
        status: {
          [Op.in]: ['checked-in', 'confirmed', 'paid']
        }
      },
      attributes: ['bookingId', 'roomNumber', 'status', 'checkIn', 'checkOut', 'guestCount'],
      order: [['checkIn', 'ASC']]
    });

    // Agrupar reservas por habitación
    const bookingsByRoom = {};
    allBookings.forEach(booking => {
      const roomNum = booking.roomNumber;
      if (!bookingsByRoom[roomNum]) {
        bookingsByRoom[roomNum] = [];
      }
      bookingsByRoom[roomNum].push(booking);
    });

    // Generar reporte por habitación
    rooms.forEach(room => {
      const roomBookings = bookingsByRoom[room.roomNumber] || [];
      const checkedInBooking = roomBookings.find(b => b.status === 'checked-in');
      const futureBookings = roomBookings.filter(b => b.status === 'confirmed' || b.status === 'paid');

      let statusText = '';
      
      if (checkedInBooking) {
        // Habitación ocupada
        statusText = `Hab. ${room.roomNumber}: OCUPADA - ${checkedInBooking.guestCount} huésped(es) - Check-out: ${new Date(checkedInBooking.checkOut).toLocaleDateString('es-CO')}`;
      } else if (futureBookings.length > 0) {
        // Habitación reservada
        const nextBooking = futureBookings[0];
        statusText = `Hab. ${room.roomNumber}: RESERVADA - Check-in: ${new Date(nextBooking.checkIn).toLocaleDateString('es-CO')} - ${nextBooking.guestCount} huésped(es)`;
      } else {
        // Habitación disponible
        statusText = `Hab. ${room.roomNumber}: ${room.status.toUpperCase()}`;
      }

      doc.fontSize(10).text(statusText);
    });
    
    doc.moveDown();

    // ⭐ NOTAS
    if (shift.openingNotes) {
      doc.fontSize(14).text('Notas de Apertura:', { underline: true });
      doc.fontSize(10).text(shift.openingNotes);
      doc.moveDown();
    }

    if (shift.closingNotes) {
      doc.fontSize(14).text('Notas de Cierre:', { underline: true });
      doc.fontSize(10).text(shift.closingNotes);
      doc.moveDown();
    }

    // ⭐ PIE DE PÁGINA
    doc.moveDown(2);
    doc.fontSize(8).text(`Generado el ${new Date().toLocaleString('es-CO')}`, { align: 'center' });

    doc.end();

    // ⭐ ESPERAR A QUE SE GENERE EL PDF
    stream.on('finish', async () => {
      // Actualizar el shift con la URL del PDF
      await shift.update({ pdfReportUrl: `/pdfs/${filename}` });

      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Error al descargar PDF:', err);
        }
      });
    });

  } catch (error) {
    console.error('❌ [GENERATE-PDF] Error:', error);
    next(error);
  }
};

module.exports = {
  openShift,
  getCurrentShift,
  closeShift,
  getShiftHistory,
  getShiftReport,
  generateShiftPDF
};
