import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import PaymentAndReceipt from "../Booking/PaymentAndReceipt";
import ExtraCharges from "./ExtraCharge";
import { 
  getAllBookings, 
  updateBookingStatus, 
  generateBill // 🧾 NUEVA IMPORTACIÓN
} from "../../Redux/Actions/bookingActions";

const CheckOut = () => {
  const dispatch = useDispatch();
  
  // 📊 SELECTORES ADAPTADOS A TU ESTRUCTURA
  const { 
    bookings: allBookings = [], 
    loading = {}, 
    taxxaStatus = null // 📤 ESTADO DE TAXXA
  } = useSelector((state) => state.booking || {});
  
  // 🔧 ESTADOS LOCALES
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showExtraCharges, setShowExtraCharges] = useState(false);
  const [selectedBookingForExtras, setSelectedBookingForExtras] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false); // 🧾 MODAL DE FACTURA
  const [generatedBill, setGeneratedBill] = useState(null); // 🧾 FACTURA GENERADA
  const [filters, setFilters] = useState({
    status: '',
    roomNumber: '',
    guestId: ''
  });
  const [sortBy, setSortBy] = useState('checkOut');

  // 🔧 FUNCIÓN PARA OBTENER DÍAS HASTA CHECK-OUT
  const getDaysUntilCheckOut = (checkOutDate) => {
    if (!checkOutDate) return null;
    
    const today = new Date();
    const checkOut = new Date(checkOutDate);
    const diffTime = checkOut - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // 🔧 FUNCIÓN PARA OBTENER PRIORIDAD DE CHECK-OUT
  const getCheckOutPriority = (booking) => {
    const daysUntil = getDaysUntilCheckOut(booking.checkOut);
    
    if (daysUntil === null) return 999;
    if (daysUntil < 0) return -1000 + daysUntil;
    if (daysUntil === 0) return 0;
    if (daysUntil === 1) return 1;
    return daysUntil;
  };

  // 📋 FILTRAR Y ORDENAR RESERVAS
  const bookings = React.useMemo(() => {
    console.log("🔄 [CHECKOUT] Procesando reservas para mostrar...");
    
    let filteredBookings = allBookings.filter(booking => 
      booking.status === 'checked-in' || 
      booking.status === 'confirmed' ||
      (booking.status === 'completed' && booking.financialSummary?.totalPendiente > 0)
    );

    console.log(`📊 [CHECKOUT] Reservas filtradas: ${filteredBookings.length} de ${allBookings.length} total`);

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

    const sortedBookings = [...filteredBookings].sort((a, b) => {
      if (sortBy === 'checkOut') {
        const priorityA = getCheckOutPriority(a);
        const priorityB = getCheckOutPriority(b);
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        const dateA = new Date(a.checkOut || '9999-12-31');
        const dateB = new Date(b.checkOut || '9999-12-31');
        return dateA - dateB;
        
      } else if (sortBy === 'amount') {
        const amountA = a.financialSummary?.totalPendiente || 0;
        const amountB = b.financialSummary?.totalPendiente || 0;
        return amountB - amountA;
        
      } else if (sortBy === 'room') {
        const roomA = a.roomNumber || a.room?.roomNumber || '';
        const roomB = b.roomNumber || b.room?.roomNumber || '';
        return roomA.toString().localeCompare(roomB.toString());
        
      } else {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return sortedBookings;
  }, [allBookings, filters, sortBy]);

  // 🔄 CARGAR RESERVAS AL MONTAR EL COMPONENTE
  useEffect(() => {
    loadBookings();
  }, []);

  // 🔄 FUNCIÓN PARA CARGAR RESERVAS
  const loadBookings = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 [CHECKOUT] Cargando reservas...");
      await dispatch(getAllBookings({
        includeInventory: false,
        ...filters
      }));
      console.log("✅ [CHECKOUT] Reservas cargadas exitosamente");
    } catch (error) {
      console.error("❌ [CHECKOUT] Error cargando reservas:", error);
      toast.error("Error al cargar las reservas");
    } finally {
      setIsLoading(false);
    }
  };

  // 🧾 NUEVA FUNCIÓN PARA GENERAR FACTURA
  const handleGenerateBill = async (booking) => {
    if (!booking?.bookingId) {
      toast.error("Error: No se encontró la información de la reserva");
      return;
    }

    // Validar que la reserva tenga pagos completados
    if (!booking.financialSummary?.isFullyPaid) {
      toast.error("❌ No se puede generar factura. La reserva debe estar completamente pagada.");
      return;
    }

    // Validar estado de la reserva
    if (!['checked-in', 'completed'].includes(booking.status)) {
      toast.error("❌ La reserva debe estar en estado 'checked-in' o 'completed' para generar factura");
      return;
    }

    try {
      console.log("🧾 [CHECKOUT] Generando factura para reserva:", booking.bookingId);
      
      const result = await dispatch(generateBill(booking.bookingId));
      
      if (result.success) {
        console.log("✅ [CHECKOUT] Factura generada exitosamente:", result.bill);
        
        // Guardar la factura generada y mostrar modal
        setGeneratedBill(result.bill);
        setShowBillModal(true);
        
        // Recargar datos para reflejar cambios
        await loadBookings();
        
        // Mostrar información sobre Taxxa
        if (result.taxxa) {
          console.log("✅ [CHECKOUT] Factura enviada a Taxxa exitosamente");
        } else if (result.taxxaError) {
          console.warn("⚠️ [CHECKOUT] Error al enviar a Taxxa:", result.taxxaError);
        }
        
      } else {
        throw new Error(result.error || "Error al generar factura");
      }
      
    } catch (error) {
      console.error("❌ [CHECKOUT] Error generando factura:", error);
      toast.error(`❌ Error al generar factura: ${error.message}`);
    }
  };

  // 💳 MANEJAR ÉXITO DE PAGO
  const handlePaymentSuccess = async (paymentData) => {
    if (!paymentData) {
      setSelectedBooking(null);
      return;
    }

    console.log("✅ [CHECKOUT] Pago exitoso:", paymentData);
    
    toast.success(
      paymentData.isFullyPaid 
        ? "✅ Pago completo registrado exitosamente"
        : `✅ Pago parcial de $${parseFloat(paymentData.amount).toLocaleString()} registrado`
    );

    await loadBookings();
    setSelectedBooking(null);

    if (paymentData.isFullyPaid) {
      setTimeout(() => {
        toast.info("🎉 La reserva está lista para finalizar el check-out", {
          autoClose: 5000
        });
      }, 1000);
    }
  };

  // 🏁 MANEJAR CHECK-OUT FINAL
  const handleCheckOut = async (bookingId) => {
    if (!bookingId) {
      toast.error("ID de reserva no válido");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🏁 [CHECKOUT] Procesando check-out para reserva:", bookingId);

      const booking = bookings.find(b => b.bookingId === bookingId);
      if (!booking) {
        throw new Error("Reserva no encontrada");
      }

      if (!booking.financialSummary?.isFullyPaid) {
        toast.error("❌ No se puede completar el check-out. Quedan pagos pendientes.");
        return;
      }

      const result = await dispatch(updateBookingStatus({
        bookingId,
        status: 'completed',
        notes: 'Check-out completado desde panel administrativo'
      }));

      if (result.success) {
        toast.success("🎉 Check-out completado exitosamente");
        await loadBookings();
        console.log("✅ [CHECKOUT] Check-out completado para reserva:", bookingId);
      } else {
        throw new Error(result.error || "Error al completar el check-out");
      }

    } catch (error) {
      console.error("❌ [CHECKOUT] Error en check-out:", error);
      toast.error(`❌ Error al completar check-out: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ➕ MANEJAR CARGOS EXTRAS
  const handleOpenExtraCharges = (booking) => {
    setSelectedBookingForExtras(booking);
    setShowExtraCharges(true);
  };

  // ✅ MANEJAR ÉXITO DE CARGO EXTRA
  const handleExtraChargeSuccess = async () => {
    toast.success("✅ Cargo extra agregado exitosamente");
    await loadBookings();
    setShowExtraCharges(false);
    setSelectedBookingForExtras(null);
  };

  // 🔍 MANEJAR FILTROS
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 🔍 APLICAR FILTROS
  const applyFilters = () => {
    loadBookings();
  };

  // 🧹 LIMPIAR FILTROS
  const clearFilters = () => {
    setFilters({
      status: '',
      roomNumber: '',
      guestId: ''
    });
    setSortBy('checkOut');
    setTimeout(() => {
      loadBookings();
    }, 100);
  };

  // 📊 OBTENER ESTADÍSTICAS DE LA PÁGINA ACTUAL
  const statistics = {
    total: bookings.length,
    readyForCheckout: bookings.filter(b => 
      b.status === 'checked-in' && b.financialSummary?.isFullyPaid
    ).length,
    needingPayment: bookings.filter(b => 
      !b.financialSummary?.isFullyPaid
    ).length,
    overdue: bookings.filter(b => getDaysUntilCheckOut(b.checkOut) < 0).length,
    today: bookings.filter(b => getDaysUntilCheckOut(b.checkOut) === 0).length,
    tomorrow: bookings.filter(b => getDaysUntilCheckOut(b.checkOut) === 1).length,
    totalPending: bookings.reduce((sum, b) => 
      sum + (b.financialSummary?.totalPendiente || 0), 0
    )
  };

  // 🔧 FUNCIÓN PARA OBTENER BADGE DE FECHA
  const getCheckOutBadge = (booking) => {
    const daysUntil = getDaysUntilCheckOut(booking.checkOut);
    
    if (daysUntil === null) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Sin fecha</span>;
    }
    
    if (daysUntil < 0) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
          ⚠️ Vencido ({Math.abs(daysUntil)} días)
        </span>
      );
    }
    
    if (daysUntil === 0) {
      return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-medium">🕐 HOY</span>;
    }
    
    if (daysUntil === 1) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">📅 MAÑANA</span>;
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
                  Administra pagos, facturas y check-outs - Ordenado por fecha de salida
                </p>
              </div>
              
              {/* 📊 ESTADÍSTICAS MEJORADAS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{statistics.overdue}</div>
                  <div className="text-xs text-red-600">Vencidos</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">{statistics.today}</div>
                  <div className="text-xs text-orange-600">Hoy</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">{statistics.tomorrow}</div>
                  <div className="text-xs text-yellow-600">Mañana</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{statistics.readyForCheckout}</div>
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
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="confirmed">Confirmadas</option>
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
                onChange={(e) => handleFilterChange('roomNumber', e.target.value)}
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
                onChange={(e) => handleFilterChange('guestId', e.target.value)}
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
              No se encontraron reservas que requieran procesamiento de check-out.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => {
              const financials = booking.financialSummary;
              const daysUntilCheckOut = getDaysUntilCheckOut(booking.checkOut);
              
              return (
                <div 
                  key={booking.bookingId} 
                  className={`bg-white rounded-xl shadow-lg border-l-4 hover:shadow-xl transition-shadow duration-300 ${
                    daysUntilCheckOut < 0 ? 'border-l-red-500' :
                    daysUntilCheckOut === 0 ? 'border-l-orange-500' :
                    daysUntilCheckOut === 1 ? 'border-l-yellow-500' :
                    'border-l-blue-500'
                  }`}
                >
                  
                  {/* 📋 HEADER DE LA RESERVA CON FECHA DESTACADA */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">
                          🏨 Reserva #{booking.bookingId}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm opacity-90">
                            📅 Check-out: {new Date(booking.checkOut).toLocaleDateString('es-CO')}
                          </span>
                          {getCheckOutBadge(booking)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === 'completed' ? 'bg-green-500' :
                          booking.status === 'checked-in' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}>
                          {booking.status === 'completed' ? '✅ Completada' :
                           booking.status === 'checked-in' ? '🏠 Check-in' : '📝 Confirmada'}
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
                          <div>🚪 Habitación {booking.room?.roomNumber} ({booking.room?.type})</div>
                          <div>👤 {booking.guest?.scostumername}</div>
                        </div>
                        <div>
                          <div>📧 {booking.guest?.selectronicmail}</div>
                          <div>📞 {booking.guest?.stelephone}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 💰 INFORMACIÓN FINANCIERA MEJORADA */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="font-medium text-gray-700">💰 Total reserva:</span>
                        <br />
                        <span className="text-lg font-bold">{financials.totalReservaFormatted}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">➕ Consumos extras:</span>
                        <br />
                        <span className="text-lg font-bold text-blue-600">
                          {financials.totalExtrasFormatted}
                          {financials.extraChargesCount > 0 && (
                            <span className="text-xs ml-1">({financials.extraChargesCount} items)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* 📊 RESUMEN FINANCIERO DETALLADO */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">💳 Estado de cuenta:</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            financials.isFullyPaid ? "text-green-600" : 
                            financials.paymentStatus === 'partially_paid' ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {financials.isFullyPaid ? "✅ Pagado" : 
                             financials.paymentStatus === 'partially_paid' ? "⚠️ Parcial" : "❌ Pendiente"}
                          </span>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                            {financials.paymentPercentage}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total cuenta:</span>
                          <span className="font-medium">{financials.totalFinalFormatted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Pagado:</span>
                          <span className="text-green-600 font-medium">{financials.totalPagadoFormatted}</span>
                        </div>
                        {!financials.isFullyPaid && (
                          <div className="flex justify-between border-t pt-1">
                            <span className="text-red-600 font-medium">Pendiente:</span>
                            <span className="text-red-600 font-bold">{financials.totalPendienteFormatted}</span>
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
                              financials.paymentPercentage === 100 ? 'bg-green-500' :
                              financials.paymentPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${financials.paymentPercentage}%` }}
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
                          {new Date(booking.checkIn).toLocaleDateString('es-CO', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">📅 Check-out:</span>
                        <div className="font-medium">
                          {new Date(booking.checkOut).toLocaleDateString('es-CO', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
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
                        ⚠️ Check-out vencido ({Math.abs(daysUntilCheckOut)} días de retraso)
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

                    {booking.status === 'checked-in' && daysUntilCheckOut > 1 && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                        🏠 Huésped en estadía ({booking.bookingStatus?.daysSinceCheckIn || 0} días) - Salida en {daysUntilCheckOut} días
                      </div>
                    )}
                  </div>

                  {/* 🎛️ ACCIONES MEJORADAS CON FACTURACIÓN */}
                  <div className="p-6 bg-gray-50 rounded-b-xl">
                    <div className="flex gap-3 mb-3">
                      {/* 💳 BOTÓN DE PAGO */}
                      {!financials.isFullyPaid && (
                        <button
                          className="flex-1 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          onClick={() => setSelectedBooking(booking)}
                          disabled={isLoading || loading.bills}
                        >
                          <span>💳</span>
                          Realizar Pago
                          <span className="text-xs bg-blue-500 px-2 py-1 rounded ml-1">
                            {financials.totalPendienteFormatted}
                          </span>
                        </button>
                      )}
                      
                      {/* ➕ BOTÓN DE EXTRAS */}
                      {booking.status === 'checked-in' && (
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
                      )}

                      {/* 🧾 BOTÓN DE GENERAR FACTURA */}
                      {financials.isFullyPaid && ['checked-in', 'completed'].includes(booking.status) && (
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
                      
                      {/* 🏁 BOTÓN DE CHECK-OUT */}
                      <button
                        className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center gap-2 ${
                          !financials.isFullyPaid || booking.status !== 'checked-in'
                            ? "bg-gray-400 cursor-not-allowed"
                            : daysUntilCheckOut <= 0 
                              ? "bg-red-600 hover:bg-red-700 animate-pulse"
                              : daysUntilCheckOut <= 1
                                ? "bg-orange-600 hover:bg-orange-700"
                                : "bg-green-600 hover:bg-green-700"
                        }`}
                        onClick={() => financials.isFullyPaid && booking.status === 'checked-in' && handleCheckOut(booking.bookingId)}
                        disabled={!financials.isFullyPaid || booking.status !== 'checked-in' || isLoading || loading.bills}
                      >
                        <span>{!financials.isFullyPaid ? "⏳" : daysUntilCheckOut <= 0 ? "🚨" : "🏁"}</span>
                        {!financials.isFullyPaid ? "Pago Requerido" : 
                         daysUntilCheckOut <= 0 ? "CHECK-OUT URGENTE" :
                         daysUntilCheckOut <= 1 ? "Finalizar Mañana" :
                         "Finalizar Check-Out"}
                      </button>
                    </div>

                    {/* 📊 ESTADO DE LA RESERVA */}
                    <div className="text-center">
                      {!financials.isFullyPaid ? (
                        <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                          ⚠️ Saldo pendiente: {financials.totalPendienteFormatted}
                          {financials.extraChargesCount > 0 && (
                            <span className="block text-xs mt-1">
                              Incluye {financials.extraChargesCount} consumo(s) extra(s)
                            </span>
                          )}
                        </p>
                      ) : booking.status !== 'checked-in' ? (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          ✅ Pagos completados - Estado: {
                            booking.status === 'completed' ? 'Completada' :
                            booking.status === 'confirmed' ? 'Confirmada' : booking.status
                          }
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
          amountToPay={selectedBooking.financialSummary.totalPendiente}
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
                <h3 className="text-lg font-bold mb-4 text-green-600">Factura Generada</h3>
                <p className="text-gray-600 mb-4">
                  La factura se ha generado exitosamente para la reserva #{generatedBill.bookingId}
                </p>
                
                <div className="bg-green-50 p-4 rounded mb-4">
                  <div className="text-sm text-green-700 space-y-1">
                    <div>ID Factura: <span className="font-bold">{generatedBill.idBill}</span></div>
                    <div>Total: <span className="font-bold">{generatedBill.totalAmountFormatted}</span></div>
                    <div>Estado: <span className="font-bold">{generatedBill.status}</span></div>
                    {generatedBill.createdAtFormatted && (
                      <div>Generada: <span className="font-bold">{generatedBill.createdAtFormatted}</span></div>
                    )}
                  </div>
                </div>

                {taxxaStatus === 'success' && (
                  <div className="bg-blue-50 p-3 rounded mb-4">
                    <div className="text-sm text-blue-700">
                      ✅ Enviada a Taxxa exitosamente
                    </div>
                  </div>
                )}

                {taxxaStatus === 'failed' && (
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
    </div>
  );
};

export default CheckOut;