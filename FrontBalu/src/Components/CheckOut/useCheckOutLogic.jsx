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
      toast.error("Error al cargar las reservas");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, filters]);

  const handleCheckOut = useCallback(async (
    bookingId,
    customCheckOutDate = null,
    discountAmount = 0,
    discountReason = "",
    forceExpiredCheckout = false
  ) => {
    // ... lógica de checkout (mantener la existente)
  }, [bookings, dispatch]);

  const handleEarlyCheckOutWithDiscount = useCallback(async (booking, earlyDate) => {
    // ... lógica existente
  }, [handleCheckOut]);

  const handleGenerateBill = useCallback(async (booking) => {
    // ... lógica existente
  }, [dispatch, loadBookings]);

  const handlePaymentSuccess = useCallback(async (paymentData) => {
    // ... lógica existente
  }, [loadBookings]);

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
    
    // Funciones
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