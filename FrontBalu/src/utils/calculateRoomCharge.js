import { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  getAllBookings,
  updateBookingStatus,
  getAllBills,
  generateBill,
  checkOut,
} from "../../../Redux/Actions/bookingActions";
import { getRealPaymentSummary } from "../utils/paymentUtils";
import { calculateRoomCharge } from "../../../utils/calculateRoomCharge";

export const useCheckOutLogic = () => {
  const dispatch = useDispatch();
  
  const {
    bookings: allBookings = [],
    loading = {},
    taxxaStatus = null,
  } = useSelector((state) => state.booking || {});

  // Estados
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showExtraCharges, setShowExtraCharges] = useState(false);
  const [selectedBookingForExtras, setSelectedBookingForExtras] = useState(null);
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

  // Utilidades memoizadas
  const getDaysUntilCheckOut = useCallback((checkOutDate) => {
    if (!checkOutDate) return null;
    const today = new Date();
    const checkOut = new Date(checkOutDate);
    const diffTime = checkOut - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  const getCheckOutPriority = useCallback((booking) => {
    const daysUntil = getDaysUntilCheckOut(booking.checkOut);
    if (daysUntil === null) return 999;
    if (daysUntil < 0) return -1000 + daysUntil;
    if (daysUntil === 0) return 0;
    if (daysUntil === 1) return 1;
    return daysUntil;
  }, [getDaysUntilCheckOut]);

  // Bookings filtradas y ordenadas
  const bookings = useMemo(() => {
    let filteredBookings = allBookings.filter((booking) => {
      if (booking.status === "completed") return false;

      const readyForCheckOut = booking.status === "checked-in";
      const needsPaymentProcessing = ["confirmed", "paid"].includes(booking.status);
      const hasFinancialIssues = booking.status === "completed" && 
        getRealPaymentSummary(booking).totalPendiente > 0;
      const isOverdue = booking.bookingStatus?.isOverdue || 
        getDaysUntilCheckOut(booking.checkOut) < 0;

      return readyForCheckOut || needsPaymentProcessing || hasFinancialIssues || isOverdue;
    });

    // Aplicar filtros
    if (filters.status) {
      filteredBookings = filteredBookings.filter(b => b.status === filters.status);
    }
    if (filters.roomNumber) {
      filteredBookings = filteredBookings.filter(b =>
        b.roomNumber?.toString().includes(filters.roomNumber) ||
        b.room?.roomNumber?.toString().includes(filters.roomNumber)
      );
    }
    if (filters.guestId) {
      filteredBookings = filteredBookings.filter(b =>
        b.guestId?.toString().includes(filters.guestId) ||
        b.guest?.sdocno?.toString().includes(filters.guestId)
      );
    }

    // Ordenamiento
    return [...filteredBookings].sort((a, b) => {
      if (sortBy === "checkOut") {
        const priorityA = getCheckOutPriority(a);
        const priorityB = getCheckOutPriority(b);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(a.checkOut || "9999-12-31") - new Date(b.checkOut || "9999-12-31");
      } else if (sortBy === "amount") {
        return getRealPaymentSummary(b).totalPendiente - getRealPaymentSummary(a).totalPendiente;
      } else if (sortBy === "room") {
        const roomA = a.roomNumber || a.room?.roomNumber || "";
        const roomB = b.roomNumber || b.room?.roomNumber || "";
        return roomA.toString().localeCompare(roomB.toString());
      } else if (sortBy === "status") {
        const statusPriority = { "checked-in": 1, paid: 2, confirmed: 3, completed: 4 };
        const priorityA = statusPriority[a.status] || 999;
        const priorityB = statusPriority[b.status] || 999;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(a.checkOut || "9999-12-31") - new Date(b.checkOut || "9999-12-31");
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [allBookings, filters, sortBy, getDaysUntilCheckOut, getCheckOutPriority]);

  // Estadísticas memoizadas
  const statistics = useMemo(() => ({
    total: bookings.length,
    readyForCheckout: bookings.filter(b => 
      b.status === "checked-in" && getRealPaymentSummary(b).isFullyPaid
    ).length,
    needingPayment: bookings.filter(b => !getRealPaymentSummary(b).isFullyPaid).length,
    overdue: bookings.filter(b => getDaysUntilCheckOut(b.checkOut) < 0).length,
    today: bookings.filter(b => getDaysUntilCheckOut(b.checkOut) === 0).length,
    tomorrow: bookings.filter(b => getDaysUntilCheckOut(b.checkOut) === 1).length,
    totalPending: bookings.reduce((sum, b) => 
      sum + (getRealPaymentSummary(b).totalPendiente || 0), 0
    ),
  }), [bookings, getDaysUntilCheckOut]);

  // Funciones de acción
  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      await dispatch(getAllBookings({ includeInventory: false, ...filters }));
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast.error("Error al cargar las reservas");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, filters]);

  // ✅ FUNCIÓN COMPLETA DE CHECK-OUT CON SOPORTE PARA DESCUENTOS
  const handleCheckOut = useCallback(async (
    bookingId,
    customCheckOutDate = null,
    discountAmount = 0,
    discountReason = "",
    forceExpiredCheckout = false
  ) => {
    if (!bookingId) {
      toast.error("❌ ID de reserva requerido");
      return;
    }

    const targetBooking = bookings.find(b => b.bookingId === bookingId);
    if (!targetBooking) {
      toast.error("❌ Reserva no encontrada");
      return;
    }

    // Verificar estado válido para check-out
    const validStates = ["checked-in", "confirmed", "paid"];
    if (!validStates.includes(targetBooking.status)) {
      toast.error(`❌ No se puede hacer check-out desde estado '${targetBooking.status}'`);
      return;
    }

    // Verificar pagos pendientes
    const financials = getRealPaymentSummary(targetBooking);
    if (!forceExpiredCheckout && financials.totalPendiente > 0) {
      const confirmForce = window.confirm(
        `⚠️ PAGOS PENDIENTES\n\n` +
        `Saldo pendiente: $${financials.totalPendiente.toLocaleString()}\n\n` +
        `¿Desea proceder con el check-out de todas formas?\n` +
        `(Se marcará como cuenta pendiente)`
      );
      
      if (!confirmForce) {
        toast.warning("Check-out cancelado - Resolver pagos pendientes");
        return;
      }
    }

    setIsLoading(true);
    
    try {
      console.log("🔄 [CHECK-OUT] Iniciando proceso:", {
        bookingId,
        customCheckOutDate,
        discountAmount,
        discountReason,
        forceExpiredCheckout
      });

      // Preparar datos de check-out
      const checkOutData = {
        inventoryReturns: [], // Si tienes inventario, agrégalo aquí
        forceCheckOut: forceExpiredCheckout || financials.totalPendiente > 0,
        notes: discountReason || "Check-out desde gestión",
        roomCondition: "good",
        skipInventoryValidation: true,
        generateBillAfterCheckout: financials.totalPendiente === 0,
      };

      // ✅ AGREGAR DATOS DE DESCUENTO SI SE PROPORCIONA
      if (discountAmount > 0 && discountReason) {
        checkOutData.applyDiscount = true;
        checkOutData.discountAmount = discountAmount;
        checkOutData.discountReason = discountReason;
      }

      // ✅ AGREGAR FECHA PERSONALIZADA SI SE PROPORCIONA
      if (customCheckOutDate) {
        checkOutData.actualCheckOut = customCheckOutDate;
        checkOutData.isEarlyCheckOut = new Date(customCheckOutDate) < new Date(targetBooking.checkOut);
      }

      // Realizar check-out
      const result = await dispatch(checkOut(bookingId, checkOutData));
      
      if (result?.error) {
        throw new Error(result.message || "Error en el check-out");
      }

      // ✅ MENSAJE DE ÉXITO CON INFORMACIÓN DETALLADA
      const isEarlyCheckOut = checkOutData.isEarlyCheckOut;
      const hasDiscount = discountAmount > 0;
      
      let successMessage = "✅ Check-out realizado exitosamente";
      
      if (isEarlyCheckOut && hasDiscount) {
        successMessage = `✅ Check-out anticipado con descuento de $${discountAmount.toLocaleString()}`;
      } else if (hasDiscount) {
        successMessage = `✅ Check-out con descuento de $${discountAmount.toLocaleString()}`;
      } else if (isEarlyCheckOut) {
        successMessage = "✅ Check-out anticipado realizado";
      }

      toast.success(successMessage, { autoClose: 5000 });

      // Recargar datos
      await loadBookings();

      console.log("✅ [CHECK-OUT] Completado exitosamente:", {
        bookingId,
        isEarlyCheckOut,
        hasDiscount,
        discountAmount
      });

    } catch (error) {
      console.error("❌ [CHECK-OUT] Error:", error);
      toast.error(`❌ Error en check-out: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [bookings, dispatch, loadBookings]);

  // ✅ FUNCIÓN COMPLETA DE CHECK-OUT ANTICIPADO CON DESCUENTO
  const handleEarlyCheckOutWithDiscount = useCallback(async (booking, earlyDate) => {
    if (!booking || !earlyDate) {
      toast.error("❌ Datos incompletos para check-out anticipado");
      return;
    }

    const checkIn = new Date(booking.checkIn);
    const earlyCheckOut = new Date(earlyDate);
    const originalCheckOut = new Date(booking.checkOut);

    // ✅ VALIDACIONES DE FECHA
    if (earlyCheckOut <= checkIn) {
      toast.error("❌ La fecha de salida debe ser posterior al check-in");
      return;
    }

    if (earlyCheckOut >= originalCheckOut) {
      toast.error("❌ La fecha de salida debe ser anterior a la fecha original");
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
    
    // ✅ CONSIDERAR DESCUENTOS EXISTENTES
    const originalAmount = parseFloat(booking.originalAmount || booking.totalAmount || 0);
    const existingDiscount = parseFloat(booking.discountAmount || 0);

    // Calcular nuevo costo por las noches reales
    let newRoomCost;
    try {
      newRoomCost = calculateRoomCharge(
        booking.room,
        booking.guestCount,
        actualNights
      );
    } catch (error) {
      // Fallback: cálculo proporcional simple
      newRoomCost = (originalAmount / originalNights) * actualNights;
    }
    
    // ✅ CALCULAR DESCUENTO BASADO EN DIFERENCIA DE NOCHES
    const potentialDiscount = Math.max(0, originalAmount - newRoomCost);
    const nightsSaved = originalNights - actualNights;
    const savingsPercentage = originalAmount > 0 
      ? Math.round((potentialDiscount / originalAmount) * 100) 
      : 0;

    // ✅ INFORMACIÓN PARA EL USUARIO
    const newTotalWithExtras = newRoomCost + financials.totalExtras;
    const newBalance = Math.max(0, newTotalWithExtras - financials.totalPagado);

    console.log("📊 [EARLY CHECKOUT] Cálculos:", {
      originalNights,
      actualNights,
      nightsSaved,
      originalAmount,
      newRoomCost,
      potentialDiscount,
      savingsPercentage,
      existingDiscount,
      newBalance
    });

    // ✅ MODAL DE CONFIRMACIÓN DETALLADO
    const confirmMessage = 
      `🗓️ RETIRO ANTICIPADO CON DESCUENTO\n\n` +
      `📅 Check-in: ${checkIn.toLocaleDateString('es-CO')}\n` +
      `📅 Salida original: ${originalCheckOut.toLocaleDateString('es-CO')} (${originalNights} noches)\n` +
      `📅 Nueva salida: ${earlyCheckOut.toLocaleDateString('es-CO')} (${actualNights} noches)\n` +
      `🛌 Noches ahorradas: ${nightsSaved}\n\n` +
      `💰 CÁLCULO FINANCIERO:\n` +
      `   • Costo original habitación: $${originalAmount.toLocaleString()}\n` +
      `   • Nuevo costo habitación: $${newRoomCost.toLocaleString()}\n` +
      `   • Descuento por noches no usadas: $${potentialDiscount.toLocaleString()} (${savingsPercentage}%)\n` +
      (financials.totalExtras > 0 ? `   • Consumos extras: $${financials.totalExtras.toLocaleString()}\n` : '') +
      `   • Total ajustado: $${newTotalWithExtras.toLocaleString()}\n` +
      `   • Ya pagado: $${financials.totalPagado.toLocaleString()}\n` +
      `   • ${newBalance > 0 ? `Saldo pendiente: $${newBalance.toLocaleString()}` : 'Cuenta saldada ✅'}\n\n` +
      (existingDiscount > 0 ? `⚠️ NOTA: Ya tiene descuento previo de $${existingDiscount.toLocaleString()}\n\n` : '') +
      `¿Proceder con el check-out anticipado y aplicar descuento?`;

    const confirmDiscount = window.confirm(confirmMessage);

    if (confirmDiscount) {
      try {
        // ✅ MENSAJE INFORMATIVO MIENTRAS PROCESA
        toast.info(
          `🔄 Procesando retiro anticipado con descuento de $${potentialDiscount.toLocaleString()}...`, 
          { autoClose: 3000 }
        );

        const discountReason = `Retiro anticipado: ${originalNights} noches → ${actualNights} noches (${nightsSaved} día${nightsSaved > 1 ? 's' : ''} menos)`;
        
        await handleCheckOut(
          booking.bookingId,
          earlyDate,
          potentialDiscount,
          discountReason,
          false
        );

        console.log("✅ [EARLY CHECKOUT] Completado:", {
          bookingId: booking.bookingId,
          nightsSaved,
          discountApplied: potentialDiscount,
          newTotal: newTotalWithExtras
        });

      } catch (error) {
        console.error("❌ [EARLY CHECKOUT] Error:", error);
        toast.error(`❌ Error al procesar retiro anticipado: ${error.message}`);
      }
    } else {
      toast.info("🚫 Retiro anticipado cancelado por el usuario");
    }
  }, [handleCheckOut]);

  // ✅ FUNCIÓN COMPLETA PARA GENERAR FACTURA
  const handleGenerateBill = useCallback(async (booking) => {
    if (!booking) {
      toast.error("❌ Información de reserva requerida");
      return;
    }

    // Verificar estado válido
    if (!["completed", "checked-in", "paid"].includes(booking.status)) {
      toast.error("❌ Solo se pueden generar facturas para reservas completadas o activas");
      return;
    }

    // Verificar pagos
    const financials = getRealPaymentSummary(booking);
    if (financials.totalPendiente > 0) {
      const confirmGenerate = window.confirm(
        `⚠️ PAGOS PENDIENTES\n\n` +
        `Saldo pendiente: $${financials.totalPendiente.toLocaleString()}\n\n` +
        `¿Generar factura de todas formas?\n` +
        `(Se marcará como factura pendiente de pago)`
      );
      
      if (!confirmGenerate) {
        toast.warning("Generación de factura cancelada");
        return;
      }
    }

    setIsLoading(true);
    
    try {
      console.log("🧾 [GENERATE-BILL] Iniciando:", booking.bookingId);

      const billData = {
        bookingId: booking.bookingId,
        includeExtras: true,
        paymentMethod: financials.isFullyPaid ? "mixed" : "pending",
        generatePDF: true,
        applyDiscounts: true // ✅ Incluir descuentos aplicados
      };

      const result = await dispatch(generateBill(billData));
      
      if (result?.error) {
        throw new Error(result.message || "Error al generar factura");
      }

      // ✅ MOSTRAR FACTURA GENERADA
      if (result?.bill) {
        setGeneratedBill(result.bill);
        setShowBillModal(true);
        
        toast.success("✅ Factura generada exitosamente", { autoClose: 3000 });
        
        // Recargar datos para actualizar estado
        await loadBookings();
      }

      console.log("✅ [GENERATE-BILL] Completado:", result?.bill?.idBill);

    } catch (error) {
      console.error("❌ [GENERATE-BILL] Error:", error);
      toast.error(`❌ Error al generar factura: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, loadBookings]);

  // ✅ FUNCIÓN PARA MANEJAR ÉXITO DE PAGO
  const handlePaymentSuccess = useCallback(async (paymentData) => {
    console.log("💳 [PAYMENT-SUCCESS] Datos recibidos:", paymentData);
    
    try {
      // Mensaje de éxito
      toast.success(
        `✅ Pago procesado: $${parseFloat(paymentData.amount || 0).toLocaleString()}`,
        { autoClose: 5000 }
      );

      // Cerrar modal de pago
      setSelectedBooking(null);

      // Recargar datos para reflejar el nuevo pago
      await loadBookings();

      // ✅ VERIFICAR SI AHORA ESTÁ COMPLETAMENTE PAGADO
      const updatedBooking = bookings.find(b => b.bookingId === paymentData.bookingId);
      if (updatedBooking) {
        const updatedFinancials = getRealPaymentSummary(updatedBooking);
        
        if (updatedFinancials.isFullyPaid) {
          // Preguntar si desea generar factura automáticamente
          setTimeout(() => {
            const generateBill = window.confirm(
              `🎉 ¡PAGO COMPLETADO!\n\n` +
              `La reserva #${paymentData.bookingId} está ahora completamente pagada.\n\n` +
              `¿Desea generar la factura automáticamente?`
            );
            
            if (generateBill) {
              handleGenerateBill(updatedBooking);
            }
          }, 1500);
        }
      }

    } catch (error) {
      console.error("❌ [PAYMENT-SUCCESS] Error:", error);
      toast.error("❌ Error al procesar el éxito del pago");
    }
  }, [bookings, loadBookings, handleGenerateBill]);

  // ✅ CARGAR DATOS INICIAL
  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return {
    // Estados
    selectedBooking,
    setSelectedBooking,
    showExtraCharges,
    setShowExtraCharges,
    selectedBookingForExtras,
    setSelectedBookingForExtras,
    showEarlyCheckOutModal,
    setShowEarlyCheckOutModal,
    earlyCheckOutDate,
    setEarlyCheckOutDate,
    bookingForEarlyCheckOut,
    setBookingForEarlyCheckOut,
    isLoading,
    showBillModal,
    setShowBillModal,
    generatedBill,
    setGeneratedBill,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    
    // Datos
    bookings,
    statistics,
    loading,
    taxxaStatus,
    
    // Funciones principales
    getDaysUntilCheckOut,
    handleCheckOut,
    handleEarlyCheckOutWithDiscount,
    handleGenerateBill,
    handlePaymentSuccess,
    loadBookings,
    
    // Handlers de UI
    handleFilterChange: useCallback((key, value) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    }, []),
    
    applyFilters: useCallback(() => {
      loadBookings();
    }, [loadBookings]),
    
    clearFilters: useCallback(() => {
      setFilters({ status: "", roomNumber: "", guestId: "" });
      setSortBy("checkOut");
      setTimeout(loadBookings, 100);
    }, [loadBookings]),
    
    handleOpenExtraCharges: useCallback((booking) => {
      setSelectedBookingForExtras(booking);
      setShowExtraCharges(true);
    }, []),
    
    handleExtraChargeSuccess: useCallback(async () => {
      toast.success("✅ Cargo extra agregado exitosamente");
      await loadBookings();
      setShowExtraCharges(false);
      setSelectedBookingForExtras(null);
    }, [loadBookings]),
  };
};