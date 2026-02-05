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
import { estimateEarlyCheckoutDiscount } from "../utils/calculateRoomCharge";

export const useCheckOutLogic = () => {
  const dispatch = useDispatch();
  
  const {
    bookings: allBookings = [],
    loading = {},
    taxxaStatus = null,
  } = useSelector((state) => state.booking || {});

  // ⭐ LOG DE DEPURACIÓN
  useEffect(() => {
    console.log("📊 [CHECK-OUT] Estado Redux actualizado:", {
      totalBookings: allBookings?.length || 0,
      bookingsType: Array.isArray(allBookings) ? 'array' : typeof allBookings,
      loading,
      firstBooking: allBookings?.[0] ? {
        id: allBookings[0].bookingId,
        status: allBookings[0].status,
        room: allBookings[0].roomNumber
      } : null
    });
  }, [allBookings, loading]);

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

  // ⭐ Bookings filtradas y ordenadas con lógica corregida
  const bookings = useMemo(() => {
    console.log("🔍 [CHECK-OUT] Aplicando filtro a reservas:", {
      totalInput: allBookings?.length || 0,
      isArray: Array.isArray(allBookings)
    });

    let filteredBookings = allBookings.filter((booking) => {
      // ⭐ EXCLUIR CANCELADAS SIEMPRE
      if (booking.status === "cancelled") return false;

      // ⭐ CALCULAR SI ESTÁ VENCIDA (pasó el checkout sin hacer check-in)
      const today = new Date();
      const checkOutDate = new Date(booking.checkOut);
      const isPastCheckOut = checkOutDate < today; // Ya pasó el checkout (vencida)

      // ⭐ VERIFICAR PAGOS PENDIENTES
      const financials = getRealPaymentSummary(booking);
      const hasFinancialIssues = financials.totalPendiente > 0;
      
      // ⭐ REGLA 1: CHECKED-IN (huésped en habitación) - SIEMPRE MOSTRAR
      if (booking.status === "checked-in") {
        console.log(`✅ [CHECK-OUT] Incluir #${booking.bookingId} - checked-in (huésped en habitación)`);
        return true;
      }

      // ⭐ REGLA 2: COMPLETED con pagos pendientes - MOSTRAR
      if (booking.status === "completed" && hasFinancialIssues) {
        console.log(`✅ [CHECK-OUT] Incluir #${booking.bookingId} - completed con saldo pendiente`);
        return true;
      }

      // ⭐ REGLA 3: COMPLETED sin pendientes - NO MOSTRAR (va a CompletedBookings)
      if (booking.status === "completed" && !hasFinancialIssues) {
        return false;
      }

      // ⭐ REGLA 4: PAID o CONFIRMED - SOLO SI ESTÁN VENCIDAS (no hicieron check-in a tiempo)
      // NO mostrar si es hoy o está en período normal - esas deben ir a CheckIn
      if (["confirmed", "paid"].includes(booking.status)) {
        // Solo mostrar si ya pasó la fecha de check-out (vencida sin check-in)
        if (isPastCheckOut) {
          console.log(`✅ [CHECK-OUT] Incluir #${booking.bookingId} - ${booking.status} VENCIDA (checkout era ${checkOutDate.toLocaleDateString()})`);
          return true;
        } else {
          // Check-in hoy o futuro = debe ir a CheckIn, no a CheckOut
          console.log(`❌ [CHECK-OUT] Excluir #${booking.bookingId} - ${booking.status} (debe completar check-in primero)`);
          return false;
        }
      }

      // ⭐ EXCLUIR TODO LO DEMÁS
      return false;
    });

    console.log("📊 [CHECK-OUT] Resultado del filtro:", {
      input: allBookings?.length || 0,
      output: filteredBookings.length,
      statuses: filteredBookings.map(b => b.status)
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
    console.log("🔄 [CHECK-OUT] Cargando reservas...");
    setIsLoading(true);
    try {
      // ⭐ NO ENVIAR FILTROS DE FECHA - Necesitamos TODAS las reservas activas
      // para poder mostrar checkout anticipado de reservas con estado "checked-in"
      // independientemente de su fecha de checkout programada
      const result = await dispatch(getAllBookings({ 
        includeInventory: false,
        // Sin fromDate/toDate para obtener TODAS las reservas
      }));
      console.log("✅ [CHECK-OUT] Reservas cargadas desde Redux:", result);
    } catch (error) {
      console.error("❌ [CHECK-OUT] Error loading bookings:", error);
      toast.error("Error al cargar las reservas");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // ✅ FUNCIÓN COMPLETA DE CHECK-OUT CON SOPORTE PARA DESCUENTOS
  const handleCheckOut = useCallback(async (
    bookingId,
    customCheckOutDate = null,
    discountAmount = 0,
    discountReason = "",
    forceExpiredCheckout = false
  ) => {
    console.log("🔍 [HANDLE-CHECKOUT] Parámetros recibidos:", {
      bookingId,
      bookingIdType: typeof bookingId,
      customCheckOutDate,
      discountAmount,
      discountReason,
      forceExpiredCheckout
    });

    if (!bookingId) {
      toast.error("❌ ID de reserva requerido");
      return;
    }

    const targetBooking = bookings.find(b => b.bookingId === bookingId);
    console.log("🔍 [HANDLE-CHECKOUT] Buscando reserva en array local:", {
      bookingId,
      encontrada: !!targetBooking,
      totalBookings: bookings.length,
      bookingIdsDisponibles: bookings.map(b => ({ id: b.bookingId, tipo: typeof b.bookingId }))
    });

    if (!targetBooking) {
      console.error("❌ [HANDLE-CHECKOUT] Reserva no encontrada en array local");
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

      console.log("📤 [HANDLE-CHECKOUT] Enviando al backend:", {
        bookingId,
        bookingIdType: typeof bookingId,
        checkOutData,
        endpoint: `/bookings/${bookingId}/check-out`
      });

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
  const handleEarlyCheckOutWithDiscount = useCallback(async (booking, earlyDate, customReason = "") => {
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
  
  // ✅ MOSTRAR PREVIEW DETALLADO DEL DESCUENTO
  const confirmMessage = 
    `🗓️ RETIRO ANTICIPADO CON DESCUENTO\n\n` +
    `📅 Check-in: ${checkIn.toLocaleDateString('es-CO')}\n` +
    `📅 Salida original: ${originalCheckOut.toLocaleDateString('es-CO')} (${preview.originalNights} noches)\n` +
    `📅 Nueva salida: ${earlyCheckOut.toLocaleDateString('es-CO')} (${preview.actualNights} noches)\n` +
    `🛌 Noches ahorradas: ${preview.nightsSaved}\n\n` +
    `💰 CÁLCULO FINANCIERO:\n` +
    `   • Total original: $${financials.totalOriginal.toLocaleString()}\n` +
    `   • Descuento estimado: $${preview.estimatedDiscount.toLocaleString()}\n` +
    `   • Nuevo total estimado: $${(financials.totalOriginal - preview.estimatedDiscount + financials.totalExtras).toLocaleString()}\n` +
    `   • Ya pagado: $${financials.totalPagado.toLocaleString()}\n` +
    `   • Balance estimado: $${Math.max(0, (financials.totalOriginal - preview.estimatedDiscount + financials.totalExtras) - financials.totalPagado).toLocaleString()}\n\n` +
    `⚠️ NOTA: Los montos finales serán calculados por el backend.\n\n` +
    `¿Proceder con el check-out anticipado?`;

  const confirmDiscount = window.confirm(confirmMessage);

  if (confirmDiscount) {
    try {
      toast.info("🔄 Procesando retiro anticipado con descuento...", { autoClose: 3000 });

      // ✅ USAR RAZÓN PERSONALIZADA SI SE PROPORCIONA
      const reason = customReason || 
        `Check-out anticipado: ${preview.originalNights} → ${preview.actualNights} noches. ` +
        `Descuento estimado: $${preview.estimatedDiscount.toLocaleString()}`;

      await handleCheckOut(
        booking.bookingId,
        earlyDate,
        preview.estimatedDiscount, // ✅ PASAR EL DESCUENTO ESTIMADO
        reason,
        false
      );

      // ✅ MOSTRAR MENSAJE DE ÉXITO CON DETALLES
      setTimeout(() => {
        toast.success(
          `✅ Check-out anticipado completado!\n` +
          `Descuento aplicado: $${preview.estimatedDiscount.toLocaleString()}`, 
          { autoClose: 7000 }
        );
      }, 1000);

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

      // ⭐ CORREGIR: La acción generateBill solo necesita el bookingId (número)
      // El backend ya maneja automáticamente extras, descuentos, etc.
      const result = await dispatch(generateBill(booking.bookingId));
      
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

    // ✅ CERRAR MODAL DE PAGO INMEDIATAMENTE
    setSelectedBooking(null);
    
    // ✅ RECARGAR DATOS Y ESPERAR A QUE TERMINE
    console.log("🔄 [PAYMENT-SUCCESS] Recargando reservas...");
    await loadBookings();
    
    // ✅ BUSCAR LA RESERVA ACTUALIZADA CON DIFERENTES FORMATOS DE ID
    const bookingIdToFind = paymentData.bookingId || paymentData.id;
    console.log("🔍 [PAYMENT-SUCCESS] Buscando reserva actualizada:", bookingIdToFind);
    
    // Dar tiempo a que se actualice el estado de Redux
    setTimeout(async () => {
      // Obtener la lista más reciente del estado de Redux
      const freshBookings = allBookings;
      console.log("📊 [PAYMENT-SUCCESS] Reservas disponibles:", freshBookings.map(b => ({
        id: b.bookingId,
        status: b.status,
        room: b.roomNumber
      })));
      
      const updatedBooking = freshBookings.find(b => 
        b.bookingId === bookingIdToFind || 
        b.bookingId === parseInt(bookingIdToFind) ||
        b.id === bookingIdToFind
      );
      
      if (updatedBooking) {
        console.log("✅ [PAYMENT-SUCCESS] Reserva encontrada:", {
          bookingId: updatedBooking.bookingId,
          status: updatedBooking.status,
          room: updatedBooking.roomNumber
        });
        
        const updatedFinancials = getRealPaymentSummary(updatedBooking);
        console.log("💰 [PAYMENT-SUCCESS] Estado financiero actualizado:", {
          totalFinal: updatedFinancials.totalFinal,
          totalPagado: updatedFinancials.totalPagado,
          totalPendiente: updatedFinancials.totalPendiente,
          isFullyPaid: updatedFinancials.isFullyPaid
        });
        
        // ✅ VERIFICAR SI ESTÁ COMPLETAMENTE PAGADA
        if (updatedFinancials.isFullyPaid) {
          const generateBill = window.confirm(
            `🎉 ¡PAGO COMPLETADO!\n\n` +
            `La reserva #${updatedBooking.bookingId} está ahora completamente pagada.\n\n` +
            `Total: $${updatedFinancials.totalFinal.toLocaleString()}\n` +
            `Pagado: $${updatedFinancials.totalPagado.toLocaleString()}\n\n` +
            `¿Desea generar la factura automáticamente?`
          );
          
          if (generateBill) {
            console.log("🧾 [PAYMENT-SUCCESS] Generando factura automáticamente...");
            await handleGenerateBill(updatedBooking);
          }
        } else {
          // ✅ MOSTRAR ESTADO ACTUAL SI AÚN HAY PENDIENTES
          toast.info(
            `💰 Pago aplicado correctamente.\n` +
            `Saldo pendiente: $${updatedFinancials.totalPendiente.toLocaleString()}`,
            { autoClose: 7000 }
          );
        }
      } else {
        console.warn("⚠️ [PAYMENT-SUCCESS] No se encontró la reserva actualizada:", {
          searchedId: bookingIdToFind,
          availableIds: freshBookings.map(b => b.bookingId)
        });
        
        // ✅ FALLBACK: MOSTRAR MENSAJE GENÉRICO
        toast.warning(
          "✅ Pago procesado correctamente.\n" +
          "📋 Actualice la lista para ver los cambios.",
          { autoClose: 5000 }
        );
      }
    }, 2000); // Dar 2 segundos para que se actualice el estado

  } catch (error) {
    console.error("❌ [PAYMENT-SUCCESS] Error:", error);
    toast.error(`❌ Error al procesar el éxito del pago: ${error.message}`);
  }
}, [allBookings, loadBookings, handleGenerateBill]); // ✅ AGREGAR allBookings A LAS DEPENDENCIAS

// ✅ FUNCIÓN MEJORADA PARA BUSCAR RESERVA POR ID
const findBookingById = useCallback((bookingId) => {
  if (!bookingId) return null;
  
  // ✅ BUSCAR EN DIFERENTES FORMATOS
  const candidates = [
    bookingId,
    parseInt(bookingId),
    bookingId.toString(),
  ].filter(id => id !== null && !isNaN(id));
  
  for (const candidate of candidates) {
    const found = allBookings.find(b => 
      b.bookingId === candidate || 
      b.id === candidate ||
      b.bookingId === candidate.toString() ||
      b.id === candidate.toString()
    );
    
    if (found) {
      console.log("✅ [FIND-BOOKING] Encontrada:", {
        searchId: bookingId,
        foundId: found.bookingId,
        roomNumber: found.roomNumber
      });
      return found;
    }
  }
  
  console.warn("⚠️ [FIND-BOOKING] No encontrada:", {
    searchId: bookingId,
    availableIds: allBookings.map(b => ({ id: b.bookingId, room: b.roomNumber }))
  });
  
  return null;
}, [allBookings]);

// ✅ FUNCIÓN AUXILIAR PARA PROCESAR PAGOS
const processPaymentResult = useCallback(async (paymentResult) => {
  if (!paymentResult || paymentResult.error) {
    const errorMsg = paymentResult?.message || "Error desconocido en el pago";
    console.error("❌ [PROCESS-PAYMENT] Error:", errorMsg);
    toast.error(`❌ Error en el pago: ${errorMsg}`);
    return false;
  }

  console.log("✅ [PROCESS-PAYMENT] Pago exitoso:", paymentResult);
  
  // ✅ LLAMAR A handlePaymentSuccess CON LOS DATOS CORRECTOS
  await handlePaymentSuccess({
    bookingId: paymentResult.bookingId || paymentResult.booking?.bookingId,
    amount: paymentResult.amount || paymentResult.payment?.amount,
    paymentId: paymentResult.paymentId || paymentResult.payment?.paymentId,
    method: paymentResult.method || paymentResult.payment?.paymentMethod
  });
  
  return true;
}, [handlePaymentSuccess]);

// ✅ FUNCIÓN PARA RECARGAR RESERVA ESPECÍFICA
const reloadSpecificBooking = useCallback(async (bookingId) => {
  try {
    console.log("🔄 [RELOAD-BOOKING] Recargando reserva específica:", bookingId);
    
    // Recargar todas las reservas
    await loadBookings();
    
    // Buscar la reserva específica
    const booking = findBookingById(bookingId);
    
    if (booking) {
      console.log("✅ [RELOAD-BOOKING] Reserva actualizada:", {
        bookingId: booking.bookingId,
        status: booking.status,
        totalAmount: booking.totalAmount
      });
      return booking;
    } else {
      console.warn("⚠️ [RELOAD-BOOKING] Reserva no encontrada después de recargar");
      return null;
    }
  } catch (error) {
    console.error("❌ [RELOAD-BOOKING] Error:", error);
    return null;
  }
}, [loadBookings, findBookingById]);

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

    findBookingById,
  processPaymentResult,
  reloadSpecificBooking,
    
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