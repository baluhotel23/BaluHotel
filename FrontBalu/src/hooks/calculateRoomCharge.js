import { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  getAllBookings,
  updateBookingStatus,
  getAllBills,
  generateBill,
  checkOut,
} from "../Redux/Actions/bookingActions";
import { getRealPaymentSummary } from "../utils/paymentUtils";
import { estimateEarlyCheckoutDiscount } from "../hooks/";

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
        inventoryReturns: [],
        forceCheckOut: forceExpiredCheckout || financials.totalPendiente > 0,
        notes: discountReason || "Check-out desde gestión",
        roomCondition: "good",
        skipInventoryValidation: true,
        generateBillAfterCheckout: financials.totalPendiente === 0,
      };

      if (discountAmount > 0 && discountReason) {
        checkOutData.applyDiscount = true;
        checkOutData.discountAmount = discountAmount;
        checkOutData.discountReason = discountReason;
      }

      if (customCheckOutDate) {
        checkOutData.actualCheckOut = customCheckOutDate;
        checkOutData.isEarlyCheckOut = new Date(customCheckOutDate) < new Date(targetBooking.checkOut);
      }

      const result = await dispatch(checkOut(bookingId, checkOutData));
      
      if (result?.error) {
        throw new Error(result.message || "Error en el check-out");
      }

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

    if (earlyCheckOut <= checkIn) {
      toast.error("❌ La fecha de salida debe ser posterior al check-in");
      return;
    }

    if (earlyCheckOut >= originalCheckOut) {
      toast.error("❌ La fecha de salida debe ser anterior a la fecha original");
      return;
    }

    // ✅ USAR ESTIMACIÓN DEL BACKEND
    const preview = estimateEarlyCheckoutDiscount(booking, earlyDate);
    
    if (!preview) {
      toast.error("❌ No se puede calcular descuento para esta fecha");
      return;
    }

    const financials = getRealPaymentSummary(booking);
    
    const confirmMessage = 
      `🗓️ RETIRO ANTICIPADO CON DESCUENTO\n\n` +
      `📅 Check-in: ${checkIn.toLocaleDateString('es-CO')}\n` +
      `📅 Salida original: ${originalCheckOut.toLocaleDateString('es-CO')} (${preview.originalNights} noches)\n` +
      `📅 Nueva salida: ${earlyCheckOut.toLocaleDateString('es-CO')} (${preview.actualNights} noches)\n` +
      `🛌 Noches ahorradas: ${preview.nightsSaved}\n\n` +
      `💰 ESTIMACIÓN FINANCIERA (el backend calculará el monto final):\n` +
      `   • Total actual (backend): $${financials.totalFinal.toLocaleString()}\n` +
      `   • Descuento estimado: ~$${preview.estimatedDiscount.toLocaleString()}\n` +
      `   • Ya pagado: $${financials.totalPagado.toLocaleString()}\n\n` +
      `⚠️ NOTA: El descuento final será calculado por el sistema del hotel.\n\n` +
      `¿Proceder con el check-out anticipado?`;

    const confirmDiscount = window.confirm(confirmMessage);

    if (confirmDiscount) {
      try {
        toast.info("🔄 Procesando retiro anticipado (el backend calculará descuentos)...", { autoClose: 3000 });

        await handleCheckOut(
          booking.bookingId,
          earlyDate,
          0, // El backend calculará el descuento
          `Retiro anticipado solicitado: ${preview.originalNights} → ${preview.actualNights} noches`,
          false
        );

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

    if (!["completed", "checked-in", "paid"].includes(booking.status)) {
      toast.error("❌ Solo se pueden generar facturas para reservas completadas o activas");
      return;
    }

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
        applyDiscounts: true
      };

      const result = await dispatch(generateBill(billData));
      
      if (result?.error) {
        throw new Error(result.message || "Error al generar factura");
      }

      if (result?.bill) {
        setGeneratedBill(result.bill);
        setShowBillModal(true);
        
        toast.success("✅ Factura generada exitosamente", { autoClose: 3000 });
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
      toast.success(
        `✅ Pago procesado: $${parseFloat(paymentData.amount || 0).toLocaleString()}`,
        { autoClose: 5000 }
      );

      setSelectedBooking(null);
      await loadBookings();

      const updatedBooking = bookings.find(b => b.bookingId === paymentData.bookingId);
      if (updatedBooking) {
        const updatedFinancials = getRealPaymentSummary(updatedBooking);
        
        if (updatedFinancials.isFullyPaid) {
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
}