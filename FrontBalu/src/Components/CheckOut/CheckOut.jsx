import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import PaymentAndReceipt from "../Booking/PaymentAndReceipt";
import ExtraCharges from "./ExtraCharge";
import { calculateRoomCharge } from "../../utils/calculateRoomCharge";
import {
  getAllBookings,
  updateBookingStatus,
  getAllBills,
  generateBill,
  checkOut, // ⭐ AGREGAR
} from "../../Redux/Actions/bookingActions";

const getRealPaymentSummary = (booking) => {
  const payments = booking.payments || [];
  const totalPagado = payments
    .filter((p) =>
      ["authorized", "completed", "paid"].includes(p.paymentStatus)
    )
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  // ✅ OBTENER MONTOS CON SOPORTE PARA DESCUENTOS
  const originalAmount = parseFloat(
    booking.originalAmount || booking.totalAmount || 0
  );
  const discountAmount = parseFloat(booking.discountAmount || 0);
  const totalReserva = parseFloat(booking.totalAmount || 0); // Ya incluye descuentos aplicados

  const totalExtras =
    booking.extraCharges?.reduce(
      (sum, c) => sum + parseFloat(c.amount || 0) * (parseInt(c.quantity) || 1),
      0
    ) || 0;

  // ✅ CALCULAR TOTAL FINAL CON DESCUENTOS APLICADOS
  const totalFinal = totalReserva + totalExtras;
  const totalPendiente = Math.max(totalFinal - totalPagado, 0);

  // ✅ INFORMACIÓN DE DESCUENTO
  const hasDiscount = discountAmount > 0;
  const originalTotalWithExtras = originalAmount + totalExtras;
  const totalSavings = hasDiscount ? discountAmount : 0;
  const effectiveDiscountPercentage =
    originalAmount > 0
      ? Math.round((discountAmount / originalAmount) * 100)
      : 0;

  return {
    // ✅ MONTOS BÁSICOS
    totalReserva,
    totalExtras,
    totalFinal,
    totalPagado,
    totalPendiente,

    // ✅ INFORMACIÓN DE DESCUENTOS
    originalAmount,
    discountAmount,
    totalSavings,
    hasDiscount,
    effectiveDiscountPercentage,
    discountReason: booking.discountReason || null,
    discountAppliedAt: booking.discountAppliedAt || null,
    discountAppliedBy: booking.discountAppliedBy || null,

    // ✅ ESTADOS DE PAGO
    paymentStatus:
      totalPendiente === 0
        ? "paid"
        : totalPagado > 0
        ? "partially_paid"
        : "unpaid",
    isFullyPaid: totalPendiente === 0,
    paymentPercentage:
      totalFinal > 0 ? Math.round((totalPagado / totalFinal) * 100) : 100,

    // ✅ FORMATEOS MEJORADOS
    totalReservaFormatted: `$${totalReserva.toLocaleString()}`,
    totalExtrasFormatted: `$${totalExtras.toLocaleString()}`,
    totalFinalFormatted: `$${totalFinal.toLocaleString()}`,
    totalPagadoFormatted: `$${totalPagado.toLocaleString()}`,
    totalPendienteFormatted: `$${totalPendiente.toLocaleString()}`,

    // ✅ FORMATEOS DE DESCUENTO
    originalAmountFormatted: `$${originalAmount.toLocaleString()}`,
    discountAmountFormatted: `$${discountAmount.toLocaleString()}`,
    totalSavingsFormatted: `$${totalSavings.toLocaleString()}`,
    originalTotalWithExtrasFormatted: `$${originalTotalWithExtras.toLocaleString()}`,

    // ✅ INFORMACIÓN ADICIONAL
    extraChargesCount: booking.extraCharges?.length || 0,

    // ✅ RESUMEN PARA MOSTRAR EN UI
    summaryMessage: hasDiscount
      ? `Total original: $${originalTotalWithExtras.toLocaleString()} - Descuento: $${discountAmount.toLocaleString()} (${effectiveDiscountPercentage}%) = Final: $${totalFinal.toLocaleString()}`
      : `Total: $${totalFinal.toLocaleString()}`,

    // ✅ BREAKDOWN DETALLADO
    breakdown: {
      originalReservation: originalAmount,
      discountApplied: discountAmount,
      adjustedReservation: totalReserva,
      extraCharges: totalExtras,
      grandTotal: totalFinal,
      totalPaid: totalPagado,
      remainingBalance: totalPendiente,
    },

    // ✅ BREAKDOWN FORMATEADO
    breakdownFormatted: {
      originalReservation: `$${originalAmount.toLocaleString()}`,
      discountApplied: hasDiscount
        ? `-$${discountAmount.toLocaleString()}`
        : "$0",
      adjustedReservation: `$${totalReserva.toLocaleString()}`,
      extraCharges:
        totalExtras > 0 ? `+$${totalExtras.toLocaleString()}` : "$0",
      grandTotal: `$${totalFinal.toLocaleString()}`,
      totalPaid: `$${totalPagado.toLocaleString()}`,
      remainingBalance: `$${totalPendiente.toLocaleString()}`,
    },
  };
};

const CheckOut = () => {
  const dispatch = useDispatch();

  const {
    bookings: allBookings = [],
    loading = {},
    taxxaStatus = null,
  } = useSelector((state) => state.booking || {});

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showExtraCharges, setShowExtraCharges] = useState(false);
  const [selectedBookingForExtras, setSelectedBookingForExtras] =
    useState(null);
  const [showEarlyCheckOutModal, setShowEarlyCheckOutModal] = useState(false);
  const [earlyCheckOutDate, setEarlyCheckOutDate] = useState("");
  const [bookingForEarlyCheckOut, setBookingForEarlyCheckOut] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    roomNumber: "",
    guestId: "",
  });
  const [sortBy, setSortBy] = useState("checkOut");

  const getDaysUntilCheckOut = (checkOutDate) => {
    if (!checkOutDate) return null;
    const today = new Date();
    const checkOut = new Date(checkOutDate);
    const diffTime = checkOut - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCheckOutPriority = (booking) => {
    const daysUntil = getDaysUntilCheckOut(booking.checkOut);
    if (daysUntil === null) return 999;
    if (daysUntil < 0) return -1000 + daysUntil;
    if (daysUntil === 0) return 0;
    if (daysUntil === 1) return 1;
    return daysUntil;
  };

  const bookings = React.useMemo(() => {
    let filteredBookings = allBookings.filter((booking) => {
      if (booking.status === "completed") {
        return false;
      }

      // 1. Reservas listas para check-out (estado correcto + pagadas)
      const readyForCheckOut = booking.status === "checked-in";

      // 2. Reservas que necesitan pago antes del check-out
      const needsPaymentProcessing = ["confirmed", "paid"].includes(
        booking.status
      );

      // 3. Reservas completadas con problemas financieros
      const hasFinancialIssues =
        booking.status === "completed" &&
        getRealPaymentSummary(booking).totalPendiente > 0;

      // 4. Reservas vencidas que requieren atención inmediata
      const isOverdue =
        booking.bookingStatus?.isOverdue ||
        getDaysUntilCheckOut(booking.checkOut) < 0;

      // ✅ INCLUIR SI CUMPLE CUALQUIERA DE ESTOS CRITERIOS
      return (
        readyForCheckOut ||
        needsPaymentProcessing ||
        hasFinancialIssues ||
        isOverdue
      );
    });

    // ✅ APLICAR FILTROS ADICIONALES DEL USUARIO
    if (filters.status) {
      filteredBookings = filteredBookings.filter(
        (b) => b.status === filters.status
      );
    }

    if (filters.roomNumber) {
      filteredBookings = filteredBookings.filter(
        (b) =>
          b.roomNumber?.toString().includes(filters.roomNumber) ||
          b.room?.roomNumber?.toString().includes(filters.roomNumber)
      );
    }

    if (filters.guestId) {
      filteredBookings = filteredBookings.filter(
        (b) =>
          b.guestId?.toString().includes(filters.guestId) ||
          b.guest?.sdocno?.toString().includes(filters.guestId)
      );
    }

    // ✅ ORDENAMIENTO MEJORADO CON PRIORIDADES CLARAS
    const sortedBookings = [...filteredBookings].sort((a, b) => {
      if (sortBy === "checkOut") {
        // Prioridad 1: Reservas vencidas (más urgentes primero)
        const priorityA = getCheckOutPriority(a);
        const priorityB = getCheckOutPriority(b);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Prioridad 2: Por fecha de check-out
        const dateA = new Date(a.checkOut || "9999-12-31");
        const dateB = new Date(b.checkOut || "9999-12-31");
        return dateA - dateB;
      } else if (sortBy === "amount") {
        // Ordenar por monto pendiente (mayor primero)
        const amountA = getRealPaymentSummary(a).totalPendiente || 0;
        const amountB = getRealPaymentSummary(b).totalPendiente || 0;
        return amountB - amountA;
      } else if (sortBy === "room") {
        // Ordenar por número de habitación
        const roomA = a.roomNumber || a.room?.roomNumber || "";
        const roomB = b.roomNumber || b.room?.roomNumber || "";
        return roomA.toString().localeCompare(roomB.toString());
      } else if (sortBy === "status") {
        // ✅ NUEVO: Ordenar por estado (prioridad de procesamiento)
        const statusPriority = {
          "checked-in": 1, // Listas para check-out
          paid: 2, // Necesitan check-in primero
          confirmed: 3, // Necesitan pago
          completed: 4, // Con problemas financieros
        };

        const priorityA = statusPriority[a.status] || 999;
        const priorityB = statusPriority[b.status] || 999;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Si mismo estado, ordenar por fecha de check-out
        const dateA = new Date(a.checkOut || "9999-12-31");
        const dateB = new Date(b.checkOut || "9999-12-31");
        return dateA - dateB;
      } else {
        // Por defecto: fecha de creación (más recientes primero)
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return sortedBookings;
  }, [allBookings, filters, sortBy]);

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      await dispatch(
        getAllBookings({
          includeInventory: false,
          ...filters,
        })
      );
    } catch (error) {
      toast.error("Error al cargar las reservas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBill = async (booking) => {
    const financials = getRealPaymentSummary(booking);
    if (!booking?.bookingId) {
      toast.error("Error: No se encontró la información de la reserva");
      return;
    }
    if (!financials.isFullyPaid) {
      toast.error(
        "❌ No se puede generar factura. La reserva debe estar completamente pagada."
      );
      return;
    }
    if (!["checked-in", "completed"].includes(booking.status)) {
      toast.error(
        "❌ La reserva debe estar en estado 'checked-in' o 'completed' para generar factura"
      );
      return;
    }
    try {
      const result = await dispatch(generateBill(booking.bookingId));
      if (result.success) {
        setGeneratedBill(result.bill);
        setShowBillModal(true);
        await loadBookings();
      } else {
        throw new Error(result.error || "Error al generar factura");
      }
    } catch (error) {
      toast.error(`❌ Error al generar factura: ${error.message}`);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (!paymentData) {
      setSelectedBooking(null);
      return;
    }
    toast.success(
      paymentData.isFullyPaid
        ? "✅ Pago completo registrado exitosamente"
        : `✅ Pago parcial de $${parseFloat(
            paymentData.amount
          ).toLocaleString()} registrado`
    );
    await loadBookings();
    setSelectedBooking(null);
    if (paymentData.isFullyPaid) {
      setTimeout(() => {
        toast.info("🎉 La reserva está lista para finalizar el check-out", {
          autoClose: 5000,
        });
      }, 1000);
    }
  };

  // ⭐ CORRECCIÓN COMPLETA DE LA FUNCIÓN handleCheckOut
  // ⭐ FUNCIÓN handleCheckOut COMPLETAMENTE CORREGIDA
  const handleCheckOut = async (
    bookingId,
    customCheckOutDate = null,
    discountAmount = 0,
    discountReason = "",
    forceExpiredCheckout = false // ✅ NUEVO PARÁMETRO PARA FORZAR
  ) => {
    console.log("🏁 [CHECKOUT] Handler handleCheckOut llamado", {
      bookingId,
      customCheckOutDate,
      discountAmount,
      discountReason,
      forceExpiredCheckout,
    });

    if (!bookingId) {
      toast.error("ID de reserva no válido");
      return;
    }

    setIsLoading(true);

    try {
      const booking = bookings.find((b) => b.bookingId === bookingId);
      const financials = getRealPaymentSummary(booking);

      if (!booking) {
        throw new Error("Reserva no encontrada");
      }

      // ✅ VERIFICAR SI ES RESERVA VENCIDA
      const daysUntilCheckOut = getDaysUntilCheckOut(booking.checkOut);
      const isExpired = daysUntilCheckOut < 0;
      const isOverdue = booking.bookingStatus?.isOverdue || isExpired;

      console.log("📊 [CHECKOUT] Estado actual de la reserva:", {
        bookingId: booking.bookingId,
        status: booking.status,
        totalAmount: booking.totalAmount,
        daysUntilCheckOut,
        isExpired,
        isOverdue,
        financials: {
          totalFinal: financials.totalFinal,
          totalPagado: financials.totalPagado,
          isFullyPaid: financials.isFullyPaid,
          balance: financials.balance,
        },
      });

      // ✅ VALIDACIÓN DE ESTADO MEJORADA PARA RESERVAS VENCIDAS
      const validStatusesForNormal = ["checked-in", "paid", "confirmed"];
      const validStatusesForExpired = [
        ...validStatusesForNormal,
        "completed",
        "pending",
      ];

      const allowedStatuses = isOverdue
        ? validStatusesForExpired
        : validStatusesForNormal;

      if (!allowedStatuses.includes(booking.status)) {
        toast.error(
          `❌ No se puede procesar check-out para reservas en estado "${booking.status}"`
        );

        // ✅ SUGERIR ACCIÓN SEGÚN ESTADO
        if (booking.status === "cancelled") {
          toast.info("💡 Las reservas canceladas no requieren check-out", {
            autoClose: 5000,
          });
        } else {
          toast.info(`💡 Estado "${booking.status}" no válido para check-out`, {
            autoClose: 5000,
          });
        }
        return;
      }

      // ✅ MENSAJES ESPECÍFICOS MEJORADOS
      if (isOverdue) {
        toast.warning(
          `🚨 RESERVA VENCIDA (${Math.abs(
            daysUntilCheckOut
          )} días) - Procesando cierre forzado para liberar habitación`,
          { autoClose: 4000 }
        );
      } else if (booking.status === "paid") {
        toast.info("📝 Procesando check-out directo desde estado 'pagada'", {
          autoClose: 3000,
        });
      } else if (booking.status === "confirmed") {
        toast.info("📝 Procesando check-out desde estado 'confirmada'", {
          autoClose: 3000,
        });
      }

      // ✅ CALCULAR DESCUENTOS Y TOTALES - LÓGICA ESPECIAL PARA VENCIDAS
      let finalTotal = financials.totalFinal;
      let needsPayment = false;
      let automaticDiscount = 0;
      let automaticDiscountReason = "";

      // ✅ DESCUENTO AUTOMÁTICO PARA RESERVAS VENCIDAS SIN PAGO
      if (isOverdue && !financials.isFullyPaid && discountAmount === 0) {
        const daysPastDue = Math.abs(daysUntilCheckOut);

        // Aplicar descuento total si está muy vencida (más de 3 días)
        if (daysPastDue > 3) {
          automaticDiscount = financials.totalPendiente;
          automaticDiscountReason = `Descuento automático por reserva vencida ${daysPastDue} días - Liberación de habitación`;
          discountAmount = automaticDiscount;
          discountReason = automaticDiscountReason;

          toast.warning(
            `⚠️ Aplicando descuento automático de $${automaticDiscount.toLocaleString()} por reserva muy vencida`,
            { autoClose: 5000 }
          );
        } else {
          // Para vencidas recientes, sugerir descuento pero permitir continuar
          toast.info(
            `💡 Reserva vencida ${daysPastDue} día(s). Se puede aplicar descuento o continuar con pago pendiente.`,
            { autoClose: 4000 }
          );
        }
      }

      if (discountAmount > 0) {
        // ✅ APLICAR DESCUENTO SOLO AL CARGO DE HABITACIÓN, NO A EXTRAS
        const roomCharge = parseFloat(booking.totalAmount) || 0;
        const extraCharges = financials.totalFinal - roomCharge;

        // El descuento se aplica solo al cargo de habitación
        const discountedRoomCharge = Math.max(0, roomCharge - discountAmount);
        finalTotal = discountedRoomCharge + extraCharges;

        const newBalance = Math.max(0, finalTotal - financials.totalPagado);
        needsPayment = newBalance > 0;

        console.log("💰 [CHECKOUT] Cálculo de descuento:", {
          roomCharge,
          extraCharges,
          discountAmount,
          discountedRoomCharge,
          finalTotal,
          totalPagado: financials.totalPagado,
          newBalance,
          needsPayment,
          isExpired,
          automaticDiscount,
        });

        toast.info(
          `💰 Descuento aplicado: $${discountAmount.toLocaleString()} - Nuevo total: $${finalTotal.toLocaleString()}`,
          { autoClose: 4000 }
        );
      } else {
        needsPayment = !financials.isFullyPaid;
      }

      // ✅ VALIDACIÓN DE PAGOS RELAJADA PARA RESERVAS VENCIDAS
      if (needsPayment && discountAmount === 0 && !isOverdue) {
        toast.error(
          `❌ No se puede completar el check-out. Balance pendiente: $${(
            finalTotal - financials.totalPagado
          ).toLocaleString()}. Realice el pago o aplique un descuento.`
        );
        return;
      }

      if (needsPayment && discountAmount === 0 && isOverdue) {
        // ✅ PARA VENCIDAS, OFRECER OPCIONES
        const confirmForceCheckout = window.confirm(
          `🚨 RESERVA VENCIDA CON BALANCE PENDIENTE\n\n` +
            `💰 Balance pendiente: $${(
              finalTotal - financials.totalPagado
            ).toLocaleString()}\n` +
            `📅 Vencida hace ${Math.abs(daysUntilCheckOut)} día(s)\n\n` +
            `¿Desea forzar el check-out para liberar la habitación?\n` +
            `(Se puede aplicar descuento automático o gestionar el pago posteriormente)`
        );

        if (!confirmForceCheckout) {
          toast.info("Check-out cancelado por el usuario");
          return;
        }

        // Aplicar descuento automático si usuario acepta
        const applyAutoDiscount = window.confirm(
          `¿Aplicar descuento automático de $${financials.totalPendiente.toLocaleString()} para cerrar la cuenta?`
        );

        if (applyAutoDiscount) {
          discountAmount = financials.totalPendiente;
          discountReason = `Descuento por reserva vencida ${Math.abs(
            daysUntilCheckOut
          )} días - Cierre forzado`;
          finalTotal = financials.totalPagado; // Solo lo que ya se pagó
          needsPayment = false;

          toast.warning(
            `⚠️ Aplicando descuento automático de $${discountAmount.toLocaleString()}`,
            { autoClose: 4000 }
          );
        } else {
          // Continuar con balance pendiente
          toast.warning(
            `⚠️ Continuando con balance pendiente de $${financials.totalPendiente.toLocaleString()} - Requiere seguimiento posterior`,
            { autoClose: 6000 }
          );
        }
      }

      if (needsPayment && discountAmount > 0) {
        const remainingBalance = finalTotal - financials.totalPagado;

        if (remainingBalance > 0 && !isOverdue) {
          toast.error(
            `❌ El descuento no es suficiente. Balance restante: $${remainingBalance.toLocaleString()}. Aumente el descuento o complete el pago.`
          );
          return;
        } else if (remainingBalance > 0 && isOverdue) {
          toast.warning(
            `⚠️ Balance restante: $${remainingBalance.toLocaleString()}. Continuando con reserva vencida...`,
            { autoClose: 4000 }
          );
        }
      }

      // ✅ CALCULAR NUEVO TOTAL PARA RETIRO ANTICIPADO (MEJORADO)
      let recalculatedTotal = null;
      let nightsCalculated = null;

      if (customCheckOutDate) {
        const checkIn = new Date(booking.checkIn);
        const earlyCheckOut = new Date(customCheckOutDate);
        nightsCalculated = Math.max(
          1,
          Math.ceil((earlyCheckOut - checkIn) / (1000 * 60 * 60 * 24))
        );

        recalculatedTotal = calculateRoomCharge(
          booking.room,
          booking.guestCount,
          nightsCalculated
        );

        console.log("📅 [CHECKOUT] Cálculo de retiro anticipado:", {
          checkIn: checkIn.toISOString(),
          earlyCheckOut: earlyCheckOut.toISOString(),
          nightsCalculated,
          recalculatedTotal,
          originalTotal: booking.totalAmount,
        });

        toast.info(
          `🗓️ Retiro anticipado: ${nightsCalculated} noche${
            nightsCalculated > 1 ? "s" : ""
          } - Total recalculado: $${recalculatedTotal.toLocaleString()}`,
          { autoClose: 5000 }
        );
      }

      console.log(
        `🏁 [CHECKOUT] Iniciando check-out para reserva: ${bookingId}`,
        {
          currentStatus: booking.status,
          isFullyPaid: !needsPayment,
          customCheckOutDate,
          discountAmount,
          finalTotal,
          recalculatedTotal,
          nightsCalculated,
          isOverdue,
          forceExpiredCheckout: isOverdue,
        }
      );

      // ✅ PREPARAR PAYLOAD DE CHECK-OUT MEJORADO CON SOPORTE PARA VENCIDAS
      const checkOutPayload = {
        actualCheckOut: customCheckOutDate
          ? new Date(customCheckOutDate).toISOString()
          : new Date().toISOString(),
        notes: isOverdue
          ? `Check-out forzado para reserva vencida ${Math.abs(
              daysUntilCheckOut
            )} días - Liberación de habitación${
              discountAmount > 0
                ? ` - Descuento: $${discountAmount.toLocaleString()} (${discountReason})`
                : ""
            }`
          : customCheckOutDate
          ? `Check-out anticipado desde panel - ${
              discountReason || "Retiro anticipado"
            }: ${nightsCalculated} noche${nightsCalculated > 1 ? "s" : ""}${
              discountAmount > 0
                ? ` - Descuento: $${discountAmount.toLocaleString()} (${discountReason})`
                : ""
            }`
          : `Check-out completado desde panel administrativo${
              discountAmount > 0
                ? ` - Descuento: $${discountAmount.toLocaleString()} (${discountReason})`
                : ""
            }`,
        completedBy: "admin",
        // ✅ CAMPOS DE DESCUENTO CONSISTENTES CON EL BACKEND
        applyDiscount: discountAmount > 0,
        discountAmount: discountAmount || 0,
        discountReason: discountReason || "",
        recalculatedTotal: recalculatedTotal || null,
        skipInventoryValidation: true,
        roomCondition: "good",
        generateBillAfterCheckout: true,
        // ✅ NUEVOS CAMPOS PARA RESERVAS VENCIDAS
        isExpiredCheckout: isOverdue,
        daysPastDue: isOverdue ? Math.abs(daysUntilCheckOut) : 0,
        forceCheckOut: isOverdue, // Forzar completado para liberar habitación
      };

      // ✅ EJECUTAR CHECK-OUT CON MEJOR MANEJO DE ERRORES
      try {
        console.log("➡️ [CHECKOUT] Enviando payload:", checkOutPayload);
        const checkOutResult = await dispatch(
          checkOut(bookingId, checkOutPayload)
        );

        console.log("📋 [CHECKOUT] Resultado del check-out:", checkOutResult);

        // ✅ VALIDAR RESULTADO CON MAYOR DETALLE
        if (!checkOutResult) {
          throw new Error("No se recibió respuesta del servidor");
        }

        if (checkOutResult.success === false || checkOutResult.error) {
          throw new Error(
            checkOutResult.error ||
              checkOutResult.message ||
              "Error desconocido en check-out"
          );
        }

        // ✅ CHECK-OUT EXITOSO
        console.log(
          "✅ [CHECKOUT] Check-out exitoso, intentando generar factura..."
        );

        // ✅ MENSAJE DE ÉXITO ESPECÍFICO PARA VENCIDAS
        if (isOverdue) {
          toast.success(
            `🎉 Reserva vencida procesada exitosamente - Habitación ${
              booking.room?.roomNumber
            } liberada${
              discountAmount > 0
                ? ` con descuento de $${discountAmount.toLocaleString()}`
                : ""
            }`,
            { autoClose: 6000 }
          );
        }

        // ✅ GENERAR FACTURA CON MANEJO MEJORADO
        try {
          console.log("🧾 [CHECKOUT] Iniciando generación de factura...");
          const billResult = await dispatch(generateBill(bookingId));

          console.log(
            "📋 [CHECKOUT] Resultado de generación de factura:",
            billResult
          );

          if (billResult && billResult.error === false && billResult.data) {
            // ✅ FACTURA GENERADA EXITOSAMENTE
            if (!isOverdue) {
              toast.success(
                `🎉 Check-out y facturación completados exitosamente${
                  discountAmount > 0
                    ? ` con descuento de $${discountAmount.toLocaleString()}`
                    : ""
                }`,
                { autoClose: 6000 }
              );
            }

            // ✅ MOSTRAR FACTURA GENERADA
            setGeneratedBill(billResult.data);
            setShowBillModal(true);

            // ✅ DISPARAR RECARGA DE FACTURAS PARA TAXXA
            setTimeout(() => {
              dispatch(getAllBills());
            }, 1000);
          } else {
            // ✅ CHECK-OUT OK, FACTURA FALLÓ (NO ES CRÍTICO)
            console.warn(
              "⚠️ [CHECKOUT] Factura no se generó automáticamente:",
              billResult
            );
            const successMessage = isOverdue
              ? `✅ Reserva vencida procesada - Habitación liberada${
                  discountAmount > 0
                    ? ` con descuento de $${discountAmount.toLocaleString()}`
                    : ""
                }`
              : `✅ Check-out completado${
                  discountAmount > 0
                    ? ` con descuento de $${discountAmount.toLocaleString()}`
                    : ""
                }`;

            toast.warning(
              `${successMessage}. La factura se puede generar manualmente desde el panel.`,
              { autoClose: 8000 }
            );
          }
        } catch (billError) {
          console.warn(
            "⚠️ [CHECKOUT] Error generando factura automática:",
            billError
          );
          const successMessage = isOverdue
            ? `✅ Reserva vencida procesada - Habitación liberada${
                discountAmount > 0
                  ? ` con descuento de $${discountAmount.toLocaleString()}`
                  : ""
              }`
            : `✅ Check-out completado${
                discountAmount > 0
                  ? ` con descuento de $${discountAmount.toLocaleString()}`
                  : ""
              }`;

          toast.warning(
            `${successMessage}. Error al generar factura automática - puede generarla manualmente.`,
            { autoClose: 8000 }
          );
        }

        // ✅ SIEMPRE RECARGAR DATOS AL FINAL
        console.log("🔄 [CHECKOUT] Recargando datos de reservas...");
        await loadBookings();

        // ✅ LOG FINAL DE ÉXITO
        console.log("🎯 [CHECKOUT] Proceso completado exitosamente:", {
          bookingId,
          finalStatus: "completed",
          discountApplied: discountAmount,
          totalProcessed: finalTotal,
          wasExpired: isOverdue,
          roomLiberated: true,
        });
      } catch (checkOutError) {
        console.error(
          "❌ [CHECKOUT] Error específico en check-out:",
          checkOutError
        );
        throw new Error(`Error en check-out: ${checkOutError.message}`);
      }
    } catch (error) {
      console.error("❌ [CHECKOUT] Error general:", error);

      // ✅ MENSAJE DE ERROR MÁS ESPECÍFICO
      const errorMessage = error.message || "Error desconocido";

      if (errorMessage.includes("payment")) {
        toast.error(`❌ Error de pagos: ${errorMessage}`);
      } else if (errorMessage.includes("status")) {
        toast.error(`❌ Error de estado: ${errorMessage}`);
      } else if (errorMessage.includes("network")) {
        toast.error(`❌ Error de conexión: ${errorMessage}`);
      } else {
        toast.error(`❌ Error al completar check-out: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NUEVO: FUNCIÓN PARA MANEJAR RETIRO ANTICIPADO CON DESCUENTO
  const handleEarlyCheckOutWithDiscount = async (booking, earlyDate) => {
    const checkIn = new Date(booking.checkIn);
    const earlyCheckOut = new Date(earlyDate);
    const originalCheckOut = new Date(booking.checkOut);

    // ✅ VALIDAR FECHA DE RETIRO ANTICIPADO
    if (earlyCheckOut <= checkIn) {
      toast.error("❌ La fecha de salida debe ser posterior al check-in");
      return;
    }

    if (earlyCheckOut >= originalCheckOut) {
      toast.error(
        "❌ La fecha de salida debe ser anterior a la fecha original"
      );
      return;
    }

    // Calcular noches originales vs actuales
    const originalNights = Math.ceil(
      (originalCheckOut - checkIn) / (1000 * 60 * 60 * 24)
    );
    const actualNights = Math.max(
      1,
      Math.ceil((earlyCheckOut - checkIn) / (1000 * 60 * 60 * 24))
    );

    // ✅ OBTENER INFORMACIÓN FINANCIERA ACTUAL
    const financials = getRealPaymentSummary(booking);

    // ✅ CONSIDERAR DESCUENTOS EXISTENTES AL CALCULAR
    const originalAmount = parseFloat(
      booking.originalAmount || booking.totalAmount || 0
    );
    const existingDiscount = parseFloat(booking.discountAmount || 0);
    const baseAmountForCalculation = originalAmount; // Usar monto original para cálculo limpio

    // Calcular nuevo costo por las noches reales
    const newRoomCost = calculateRoomCharge(
      booking.room,
      booking.guestCount,
      actualNights
    );

    // ✅ CALCULAR DESCUENTO BASADO EN DIFERENCIA DE NOCHES
    const potentialDiscount = Math.max(
      0,
      baseAmountForCalculation - newRoomCost
    );
    const nightsSaved = originalNights - actualNights;
    const savingsPercentage =
      baseAmountForCalculation > 0
        ? Math.round((potentialDiscount / baseAmountForCalculation) * 100)
        : 0;

    // ✅ INFORMACIÓN PARA EL USUARIO
    const newTotalWithExtras = newRoomCost + financials.totalExtras;
    const newBalance = Math.max(0, newTotalWithExtras - financials.totalPagado);

    console.log("📊 [EARLY CHECKOUT] Cálculos de retiro anticipado:", {
      originalNights,
      actualNights,
      nightsSaved,
      originalAmount: baseAmountForCalculation,
      newRoomCost,
      potentialDiscount,
      savingsPercentage,
      existingDiscount,
      totalExtras: financials.totalExtras,
      totalPaid: financials.totalPagado,
      newBalance,
    });

    // ✅ MODAL DE CONFIRMACIÓN MEJORADO CON MÁS DETALLES
    const confirmMessage =
      `🗓️ RETIRO ANTICIPADO CON DESCUENTO\n\n` +
      `📅 Check-in: ${checkIn.toLocaleDateString("es-CO")}\n` +
      `📅 Salida original: ${originalCheckOut.toLocaleDateString(
        "es-CO"
      )} (${originalNights} noches)\n` +
      `📅 Nueva salida: ${earlyCheckOut.toLocaleDateString(
        "es-CO"
      )} (${actualNights} noches)\n` +
      `🛌 Noches ahorradas: ${nightsSaved}\n\n` +
      `💰 CÁLCULO FINANCIERO:\n` +
      `   • Costo original habitación: $${baseAmountForCalculation.toLocaleString()}\n` +
      `   • Nuevo costo habitación: $${newRoomCost.toLocaleString()}\n` +
      `   • Descuento por noches no usadas: $${potentialDiscount.toLocaleString()} (${savingsPercentage}%)\n` +
      (financials.totalExtras > 0
        ? `   • Consumos extras: $${financials.totalExtras.toLocaleString()}\n`
        : "") +
      `   • Total ajustado: $${newTotalWithExtras.toLocaleString()}\n` +
      `   • Ya pagado: $${financials.totalPagado.toLocaleString()}\n` +
      `   • ${
        newBalance > 0
          ? `Saldo pendiente: $${newBalance.toLocaleString()}`
          : "Cuenta saldada ✅"
      }\n\n` +
      (existingDiscount > 0
        ? `⚠️ NOTA: Ya tiene descuento previo de $${existingDiscount.toLocaleString()}\n\n`
        : "") +
      `¿Proceder con el check-out anticipado y aplicar descuento?`;

    const confirmDiscount = window.confirm(confirmMessage);

    if (confirmDiscount) {
      try {
        setIsLoading(true);

        // ✅ MENSAJE INFORMATIVO MIENTRAS PROCESA
        toast.info(
          `🔄 Procesando retiro anticipado con descuento de $${potentialDiscount.toLocaleString()}...`,
          { autoClose: 3000 }
        );

        const discountReason = `Retiro anticipado: ${originalNights} noches → ${actualNights} noches (${nightsSaved} día${
          nightsSaved > 1 ? "s" : ""
        } menos)`;

        await handleCheckOut(
          booking.bookingId,
          earlyDate,
          potentialDiscount,
          discountReason
        );

        // ✅ LOG DE ÉXITO
        console.log("✅ [EARLY CHECKOUT] Retiro anticipado completado:", {
          bookingId: booking.bookingId,
          nightsSaved,
          discountApplied: potentialDiscount,
          newTotal: newTotalWithExtras,
        });
      } catch (error) {
        console.error("❌ [EARLY CHECKOUT] Error en retiro anticipado:", error);
        toast.error(`❌ Error al procesar retiro anticipado: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.info("🚫 Retiro anticipado cancelado por el usuario");
    }
  };

  const handleOpenExtraCharges = (booking) => {
    setSelectedBookingForExtras(booking);
    setShowExtraCharges(true);
  };

  const handleExtraChargeSuccess = async () => {
    toast.success("✅ Cargo extra agregado exitosamente");
    await loadBookings();
    setShowExtraCharges(false);
    setSelectedBookingForExtras(null);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyFilters = () => {
    loadBookings();
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      roomNumber: "",
      guestId: "",
    });
    setSortBy("checkOut");
    setTimeout(() => {
      loadBookings();
    }, 100);
  };

  const statistics = React.useMemo(() => {
    return {
      total: bookings.length,
      readyForCheckout: bookings.filter(
        (b) => b.status === "checked-in" && getRealPaymentSummary(b).isFullyPaid
      ).length,
      needingPayment: bookings.filter(
        (b) => !getRealPaymentSummary(b).isFullyPaid
      ).length,
      overdue: bookings.filter((b) => getDaysUntilCheckOut(b.checkOut) < 0)
        .length,
      today: bookings.filter((b) => getDaysUntilCheckOut(b.checkOut) === 0)
        .length,
      tomorrow: bookings.filter((b) => getDaysUntilCheckOut(b.checkOut) === 1)
        .length,
      totalPending: bookings.reduce(
        (sum, b) => sum + (getRealPaymentSummary(b).totalPendiente || 0),
        0
      ),
    };
  }, [bookings]);

  const getCheckOutBadge = (booking) => {
    const daysUntil = getDaysUntilCheckOut(booking.checkOut);
    if (daysUntil === null) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
          Sin fecha
        </span>
      );
    }
    if (daysUntil < 0) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
          ⚠️ Vencido ({Math.abs(daysUntil)} días)
        </span>
      );
    }
    if (daysUntil === 0) {
      return (
        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium">
          🕐 HOY
        </span>
      );
    }
    if (daysUntil === 1) {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
          📅 MAÑANA
        </span>
      );
    }
    if (daysUntil <= 3) {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
          📅 En {daysUntil} días
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
        📅 En {daysUntil} días
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🎯 HEADER */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  🏁 Gestión de Check-Out
                </h1>
                <p className="mt-2 text-gray-600">
                  Administra pagos, facturas y check-outs - Ordenado por fecha
                  de salida
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-red-600">
                    {statistics.overdue}
                  </div>
                  <div className="text-xs text-red-600">Vencidos</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">
                    {statistics.today}
                  </div>
                  <div className="text-xs text-orange-600">Hoy</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">
                    {statistics.tomorrow}
                  </div>
                  <div className="text-xs text-yellow-600">Mañana</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {statistics.readyForCheckout}
                  </div>
                  <div className="text-xs text-green-600">Listas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 FILTROS Y ORDENAMIENTO */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Filtro por ordenamiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Ordenar por:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="checkOut">📅 Fecha de salida</option>
                <option value="status">
                  🎯 Prioridad de procesamiento
                </option>{" "}
                {/* ✅ AGREGAR ESTA LÍNEA FALTANTE */}
                <option value="amount">💰 Monto pendiente</option>
                <option value="room">🚪 Número habitación</option>
                <option value="created">🕐 Fecha creación</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado:
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="confirmed">Confirmadas</option>
                <option value="paid">Pagadas</option>
                <option value="checked-in">Check-in</option>
                <option value="completed">Completadas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Habitación:
              </label>
              <input
                type="text"
                value={filters.roomNumber}
                onChange={(e) =>
                  handleFilterChange("roomNumber", e.target.value)
                }
                placeholder="Ej: 101"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documento Huésped:
              </label>
              <input
                type="text"
                value={filters.guestId}
                onChange={(e) => handleFilterChange("guestId", e.target.value)}
                placeholder="Documento"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                🔍 Filtrar
              </button>
              <button
                onClick={clearFilters}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 transition-colors"
              >
                🧹
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 LISTA DE RESERVAS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {isLoading && !loading.bills ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando reservas...</p>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏨</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay reservas para check-out
            </h3>
            <p className="text-gray-600">
              No se encontraron reservas que requieran procesamiento de
              check-out.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => {
              const financials = getRealPaymentSummary(booking);
              const daysUntilCheckOut = getDaysUntilCheckOut(booking.checkOut);
              const payments = booking.payments || [];
              const passengers = booking.registrationPasses || [];

              return (
                <div
                  key={booking.bookingId}
                  className={`bg-white rounded-xl shadow-lg border-l-4 hover:shadow-xl transition-shadow duration-300 ${
                    daysUntilCheckOut < 0
                      ? "border-l-red-500"
                      : daysUntilCheckOut === 0
                      ? "border-l-orange-500"
                      : daysUntilCheckOut === 1
                      ? "border-l-yellow-500"
                      : "border-l-blue-500"
                  }`}
                >
                  {/* HEADER */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">
                          🏨 Reserva #{booking.bookingId}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm opacity-90">
                            📅 Check-out:{" "}
                            {new Date(booking.checkOut).toLocaleDateString(
                              "es-CO"
                            )}
                          </span>
                          {getCheckOutBadge(booking)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            booking.status === "completed"
                              ? "bg-green-500"
                              : booking.status === "checked-in"
                              ? "bg-yellow-500"
                              : booking.status === "paid"
                              ? "bg-blue-500"
                              : "bg-blue-500"
                          }`}
                        >
                          {booking.status === "completed"
                            ? "✅ Completada"
                            : booking.status === "checked-in"
                            ? "🏠 Check-in"
                            : booking.status === "paid"
                            ? "💳 Pagada"
                            : "📝 Confirmada"}
                        </span>
                        {booking.bookingStatus?.isOverdue && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                            ⏰ Vencida
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm opacity-90">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div>
                            🚪 Habitación {booking.room?.roomNumber} (
                            {booking.room?.type})
                          </div>
                          <div>👤 {booking.guest?.scostumername}</div>
                        </div>
                        <div>
                          <div>📧 {booking.guest?.selectronicmail}</div>
                          <div>📞 {booking.guest?.stelephone}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 👥 PASAJEROS */}
                  {passengers.length > 0 && (
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        👥 Pasajeros registrados ({passengers.length})
                      </h4>
                      <ul className="space-y-1">
                        {passengers.map((pass, idx) => (
                          <li
                            key={pass.registrationNumber}
                            className="text-xs text-gray-700 flex flex-col md:flex-row md:items-center gap-1 md:gap-3 border-b border-gray-100 pb-1"
                          >
                            <span className="font-medium">
                              {idx + 1}. {pass.name}
                            </span>
                            <span className="text-gray-500">
                              Doc: {pass.idNumber}
                            </span>
                            <span className="text-gray-500">
                              Nacionalidad: {pass.nationality}
                            </span>
                            <span className="text-gray-500">
                              Profesión: {pass.profession}
                            </span>
                            <span className="text-gray-500">
                              Estado civil: {pass.maritalStatus}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 💵 PAGOS REALIZADOS */}
                  {payments.length > 0 && (
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        💵 Pagos realizados ({payments.length})
                      </h4>
                      <ul className="space-y-1">
                        {payments.map((p, idx) => (
                          <li
                            key={p.paymentId || idx}
                            className="text-xs text-gray-700 flex flex-col md:flex-row md:items-center gap-1 md:gap-3 border-b border-gray-100 pb-1"
                          >
                            <span className="font-medium">
                              {idx + 1}.{" "}
                              {p.paymentMethod?.toUpperCase() || "Pago"}
                            </span>
                            <span className="text-gray-500">
                              Monto: ${parseFloat(p.amount).toLocaleString()}
                            </span>
                            <span className="text-gray-500">
                              Estado: {p.paymentStatus}
                            </span>
                            {p.paymentDate && (
                              <span className="text-gray-500">
                                Fecha:{" "}
                                {new Date(p.paymentDate).toLocaleDateString(
                                  "es-CO"
                                )}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 💰 INFORMACIÓN FINANCIERA MEJORADA */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="font-medium text-gray-700">
                          💰 Total reserva:
                        </span>
                        <br />
                        <span className="text-lg font-bold">
                          {financials.totalReservaFormatted}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          ➕ Consumos extras:
                        </span>
                        <br />
                        <span className="text-lg font-bold text-blue-600">
                          {financials.totalExtrasFormatted}
                          {financials.extraChargesCount > 0 && (
                            <span className="text-xs ml-1">
                              ({financials.extraChargesCount} items)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">
                          💳 Estado de cuenta:
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              financials.isFullyPaid
                                ? "text-green-600"
                                : financials.paymentStatus === "partially_paid"
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {financials.isFullyPaid
                              ? "✅ Pagado"
                              : financials.paymentStatus === "partially_paid"
                              ? "⚠️ Parcial"
                              : "❌ Pendiente"}
                          </span>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                            {financials.paymentPercentage}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {/* Sección de cálculo detallado */}
                        <div className="border-b border-gray-200 pb-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Costo reserva:
                            </span>
                            <span className="font-medium">
                              {financials.totalReservaFormatted}
                            </span>
                          </div>

                          {financials.totalExtras > 0 && (
                            <div className="flex justify-between">
                              <span className="text-blue-600">
                                + Gastos extras:
                              </span>
                              <span className="text-blue-600 font-medium">
                                {financials.totalExtrasFormatted}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between mt-1 font-medium">
                            <span className="text-gray-800">
                              = Total facturación:
                            </span>
                            <span className="text-gray-800">
                              {financials.totalFinalFormatted}
                            </span>
                          </div>
                        </div>

                        {/* Sección de pagos */}
                        <div
                          className={`pt-1 ${
                            !financials.isFullyPaid
                              ? "border-b border-gray-200 pb-2"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between">
                            <span className="text-green-600">Pagado:</span>
                            <span className="text-green-600 font-medium">
                              {financials.totalPagadoFormatted}
                            </span>
                          </div>
                        </div>

                        {/* Sección de pendiente (solo si hay) */}
                        {!financials.isFullyPaid && (
                          <div className="pt-1">
                            <div className="flex justify-between font-medium">
                              <span className="text-red-600">
                                Pendiente por pagar:
                              </span>
                              <span className="text-red-600 font-bold">
                                {financials.totalPendienteFormatted}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 📈 BARRA DE PROGRESO DE PAGO */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progreso de pago</span>
                          <span>{financials.paymentPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              financials.paymentPercentage === 100
                                ? "bg-green-500"
                                : financials.paymentPercentage >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${financials.paymentPercentage}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 📅 INFORMACIÓN DE FECHAS MEJORADA */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">📅 Check-in:</span>
                        <div className="font-medium">
                          {new Date(booking.checkIn).toLocaleDateString(
                            "es-CO",
                            {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">📅 Check-out:</span>
                        <div className="font-medium">
                          {new Date(booking.checkOut).toLocaleDateString(
                            "es-CO",
                            {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">⏰ Estado:</span>
                        <div className="font-medium">
                          {getCheckOutBadge(booking)}
                        </div>
                      </div>
                    </div>

                    {/* ⏰ INFORMACIÓN ADICIONAL SEGÚN ESTADO */}
                    {booking.bookingStatus?.isOverdue && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        ⚠️ Check-out vencido ({Math.abs(daysUntilCheckOut)} días
                        de retraso)
                      </div>
                    )}

                    {daysUntilCheckOut === 0 && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-700 text-sm">
                        🕐 Check-out programado para HOY - Prioridad alta
                      </div>
                    )}

                    {daysUntilCheckOut === 1 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                        📅 Check-out programado para MAÑANA - Preparar proceso
                      </div>
                    )}

                    {booking.status === "checked-in" &&
                      daysUntilCheckOut > 1 && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                          🏠 Huésped en estadía (
                          {booking.bookingStatus?.daysSinceCheckIn || 0} días) -
                          Salida en {daysUntilCheckOut} días
                        </div>
                      )}
                  </div>

                  {/* 🎛️ ACCIONES MEJORADAS CON FACTURACIÓN */}
                  <div className="p-6 bg-gray-50 rounded-b-xl">
                    <div className="flex gap-3 mb-3">
                      {/* 💳 BOTÓN DE PAGO */}
                      <button
                        className="flex-1 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        onClick={() => setSelectedBooking(booking)}
                        disabled={isLoading || loading.bills}
                      >
                        <span>💳</span>
                        Registrar Pago
                        <span className="text-xs bg-blue-500 px-2 py-1 rounded ml-1">
                          {financials.totalPendienteFormatted}
                        </span>
                      </button>

                      {/* ➕ BOTÓN DE EXTRAS */}
                      <button
                        className="px-4 py-2 rounded-lg text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
                        onClick={() => handleOpenExtraCharges(booking)}
                        disabled={isLoading || loading.bills}
                      >
                        <span>➕</span>
                        Extras
                        {financials.extraChargesCount > 0 && (
                          <span className="text-xs bg-blue-100 px-1 py-0.5 rounded">
                            {financials.extraChargesCount}
                          </span>
                        )}
                      </button>

                      {/* 🧾 BOTÓN DE GENERAR FACTURA */}
                      {financials.isFullyPaid &&
                        ["checked-in", "completed", "paid"].includes(
                          booking.status
                        ) && ( // ✅ AGREGAR "paid"
                          <button
                            className="px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center gap-2"
                            onClick={() => handleGenerateBill(booking)}
                            disabled={isLoading || loading.bills}
                          >
                            {loading.bills ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Generando...
                              </>
                            ) : (
                              <>
                                <span>🧾</span>
                                Generar Factura
                              </>
                            )}
                          </button>
                        )}

                      {/* 🏁 BOTÓN DE CHECK-OUT CORREGIDO */}
                      <button
                        className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center gap-2 ${
                          !financials.isFullyPaid ||
                          ![
                            "pending",
                            "confirmed",
                            "paid",
                            "checked-in",
                            "completed",
                            "advanced",
                          ].includes(booking.status)
                            ? "bg-gray-400 cursor-not-allowed"
                            : daysUntilCheckOut <= 0
                            ? "bg-red-600 hover:bg-red-700 animate-pulse"
                            : daysUntilCheckOut <= 1
                            ? "bg-orange-600 hover:bg-orange-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                        onClick={() => {
                          if (
                            financials.isFullyPaid &&
                            ["checked-in", "paid"].includes(booking.status)
                          ) {
                            handleCheckOut(booking.bookingId);
                          }
                        }}
                        disabled={
                          !financials.isFullyPaid ||
                          !(
                            ["checked-in", "paid"].includes(booking.status) ||
                            booking.bookingStatus?.isOverdue
                          ) ||
                          isLoading ||
                          loading.bills
                        }
                      >
                        <span>
                          {!financials.isFullyPaid
                            ? "⏳"
                            : daysUntilCheckOut <= 0
                            ? "🚨"
                            : "🏁"}
                        </span>
                        {!financials.isFullyPaid
                          ? "Pago Requerido"
                          : daysUntilCheckOut <= 0
                          ? "CHECK-OUT URGENTE"
                          : daysUntilCheckOut <= 1
                          ? "Finalizar Mañana"
                          : "Finalizar Check-Out"}
                      </button>

                      {/* ⏩ BOTÓN DE RETIRO ANTICIPADO */}
                      {["checked-in", "paid"].includes(booking.status) && (
                        <button
                          className="flex-1 px-4 py-2 rounded-lg text-blue-700 border border-blue-700 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                          onClick={() => {
                            setBookingForEarlyCheckOut(booking);
                            setEarlyCheckOutDate(
                              new Date().toISOString().slice(0, 16)
                            );
                            setShowEarlyCheckOutModal(true);
                          }}
                          disabled={isLoading || loading.bills}
                        >
                          <span>⏩</span>
                          Retiro anticipado
                        </button>
                      )}
                    </div>

                    {/* 📊 ESTADO DE LA RESERVA CORREGIDO */}
                    <div className="text-center">
                      {!financials.isFullyPaid ? (
                        <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                          ⚠️ Saldo pendiente:{" "}
                          {financials.totalPendienteFormatted}
                          {financials.extraChargesCount > 0 && (
                            <span className="block text-xs mt-1">
                              Incluye {financials.extraChargesCount} consumo(s)
                              extra(s)
                            </span>
                          )}
                        </p>
                      ) : !["checked-in", "paid"].includes(booking.status) ? (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          ✅ Pagos completados - Estado:{" "}
                          {booking.status === "completed"
                            ? "Completada"
                            : booking.status === "confirmed"
                            ? "Confirmada"
                            : booking.status}
                          <span className="block text-xs mt-1 text-purple-600">
                            🧾 Puede generar factura fiscal
                          </span>
                        </p>
                      ) : daysUntilCheckOut <= 0 ? (
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          🚨 CHECK-OUT VENCIDO - Procesamiento urgente requerido
                        </p>
                      ) : (
                        <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                          ✅ Cuenta saldada - Listo para check-out y facturación
                          {daysUntilCheckOut === 1 && (
                            <span className="block text-xs mt-1 text-orange-600">
                              📅 Programado para mañana
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 💳 MODAL DE PAGO */}
      {selectedBooking && (
        <PaymentAndReceipt
          bookingData={selectedBooking}
          amountToPay={getRealPaymentSummary(selectedBooking).totalPendiente}
          currentBuyerData={selectedBooking.guest}
          selectedRoom={selectedBooking.room}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* ➕ MODAL DE CARGOS EXTRAS */}
      {showExtraCharges && selectedBookingForExtras && (
        <ExtraCharges
          bookingId={selectedBookingForExtras.bookingId}
          isLoading={isLoading}
          onSuccess={handleExtraChargeSuccess}
          onClose={() => {
            setShowExtraCharges(false);
            setSelectedBookingForExtras(null);
          }}
        />
      )}

      {/* 🧾 MODAL DE FACTURA GENERADA */}
      {showBillModal && generatedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🧾</div>
                <h3 className="text-lg font-bold mb-4 text-green-600">
                  Factura Generada
                </h3>
                <p className="text-gray-600 mb-4">
                  La factura se ha generado exitosamente para la reserva #
                  {generatedBill.bookingId}
                </p>

                <div className="bg-green-50 p-4 rounded mb-4">
                  <div className="text-sm text-green-700 space-y-1">
                    <div>
                      ID Factura:{" "}
                      <span className="font-bold">{generatedBill.idBill}</span>
                    </div>
                    <div>
                      Total:{" "}
                      <span className="font-bold">
                        {generatedBill.totalAmountFormatted}
                      </span>
                    </div>
                    <div>
                      Estado:{" "}
                      <span className="font-bold">{generatedBill.status}</span>
                    </div>
                    {generatedBill.createdAtFormatted && (
                      <div>
                        Generada:{" "}
                        <span className="font-bold">
                          {generatedBill.createdAtFormatted}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {taxxaStatus === "success" && (
                  <div className="bg-blue-50 p-3 rounded mb-4">
                    <div className="text-sm text-blue-700">
                      ✅ Enviada a Taxxa exitosamente
                    </div>
                  </div>
                )}

                {taxxaStatus === "failed" && (
                  <div className="bg-yellow-50 p-3 rounded mb-4">
                    <div className="text-sm text-yellow-700">
                      ⚠️ Error al enviar a Taxxa (revisar conexión)
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowBillModal(false);
                    setGeneratedBill(null);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEarlyCheckOutModal && bookingForEarlyCheckOut && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2 text-blue-700">
              ⏩ Retiro Anticipado
            </h3>
            <p className="mb-4 text-gray-700">
              Selecciona la nueva fecha de salida. El sistema calculará
              automáticamente el descuento correspondiente.
            </p>

            <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
              <div className="font-medium text-blue-800">
                Reserva #{bookingForEarlyCheckOut.bookingId}
              </div>
              <div className="text-blue-600">
                📅 Check-in:{" "}
                {new Date(bookingForEarlyCheckOut.checkIn).toLocaleDateString()}
              </div>
              <div className="text-blue-600">
                📅 Salida original:{" "}
                {new Date(
                  bookingForEarlyCheckOut.checkOut
                ).toLocaleDateString()}
              </div>
            </div>

            <input
              type="datetime-local"
              className="w-full border px-3 py-2 rounded mb-4"
              value={earlyCheckOutDate}
              onChange={(e) => setEarlyCheckOutDate(e.target.value)}
              min={bookingForEarlyCheckOut.checkIn?.slice(0, 16)}
              max={bookingForEarlyCheckOut.checkOut?.slice(0, 16)}
            />

            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={async () => {
                  if (earlyCheckOutDate) {
                    setIsLoading(true);
                    try {
                      // ✅ USAR LA FUNCIÓN CON DESCUENTO AUTOMÁTICO
                      await handleEarlyCheckOutWithDiscount(
                        bookingForEarlyCheckOut,
                        earlyCheckOutDate
                      );
                      setShowEarlyCheckOutModal(false);
                      setBookingForEarlyCheckOut(null);
                      setEarlyCheckOutDate("");
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }}
                disabled={!earlyCheckOutDate || isLoading}
              >
                {isLoading ? "Procesando..." : "Confirmar con Descuento"}
              </button>
              <button
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                onClick={() => {
                  setShowEarlyCheckOutModal(false);
                  setBookingForEarlyCheckOut(null);
                  setEarlyCheckOutDate("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckOut;
