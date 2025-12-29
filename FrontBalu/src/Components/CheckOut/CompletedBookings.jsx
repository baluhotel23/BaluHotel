import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getAllBookings, generateBill, getAllBills, deleteBookingPermanently } from "../../Redux/Actions/bookingActions";

const CompletedBookings = () => {
  const dispatch = useDispatch();
  
  const {
    bookings: allBookings = [],
    loading = {},
  } = useSelector((state) => state.booking || {});

  const { user } = useSelector((state) => state.auth);
  const isOwner = user?.role === 'owner';

  const [isLoading, setIsLoading] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [filters, setFilters] = useState({
    roomNumber: "",
    guestId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [sortBy, setSortBy] = useState("completedAt");

  // ✅ FILTRAR SOLO RESERVAS COMPLETADAS CON CHECKOUT REAL
  const completedBookings = useMemo(() => {
    let filteredBookings = allBookings.filter((booking) => {
      // ⭐ DEBE tener status "completed"
      if (booking.status !== "completed") return false;
      
      // ⭐ IDEALMENTE debe tener actualCheckOut (checkout real)
      // Pero no lo hacemos obligatorio por compatibilidad con datos antiguos
      if (booking.actualCheckOut) {
        console.log(`✅ [COMPLETED] Incluir #${booking.bookingId} - completed con actualCheckOut`);
      } else {
        console.log(`⚠️ [COMPLETED] Incluir #${booking.bookingId} - completed sin actualCheckOut (datos antiguos)`);
      }
      
      return true;
    });

    // ✅ APLICAR FILTROS ADICIONALES
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

    if (filters.dateFrom) {
      filteredBookings = filteredBookings.filter(
        (b) => new Date(b.actualCheckOut || b.checkOut) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filteredBookings = filteredBookings.filter(
        (b) => new Date(b.actualCheckOut || b.checkOut) <= new Date(filters.dateTo)
      );
    }

    // ✅ ORDENAMIENTO
    const sortedBookings = [...filteredBookings].sort((a, b) => {
      if (sortBy === "completedAt") {
        return new Date(b.actualCheckOut || b.checkOut) - new Date(a.actualCheckOut || a.checkOut);
      } else if (sortBy === "room") {
        const roomA = a.roomNumber || a.room?.roomNumber || "";
        const roomB = b.roomNumber || b.room?.roomNumber || "";
        return roomA.toString().localeCompare(roomB.toString());
      } else if (sortBy === "total") {
        const totalA = parseFloat(a.totalAmount || 0) + (a.extraCharges?.reduce((sum, c) => sum + parseFloat(c.amount || 0) * (parseInt(c.quantity) || 1), 0) || 0);
        const totalB = parseFloat(b.totalAmount || 0) + (b.extraCharges?.reduce((sum, c) => sum + parseFloat(c.amount || 0) * (parseInt(c.quantity) || 1), 0) || 0);
        return totalB - totalA;
      } else {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return sortedBookings;
  }, [allBookings, filters, sortBy]);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      await dispatch(getAllBookings({
        includeInventory: false,
        status: "completed",
        ...filters,
      }));
    } catch (error) {
      toast.error("Error al cargar las reservas completadas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBill = async (booking) => {
    if (!booking?.bookingId) {
      toast.error("Error: No se encontró la información de la reserva");
      return;
    }

    try {
      const result = await dispatch(generateBill(booking.bookingId));
      if (result.success) {
        setGeneratedBill(result.bill);
        setShowBillModal(true);
        await loadBookings();
        toast.success("✅ Factura generada exitosamente");
      } else {
        throw new Error(result.error || "Error al generar factura");
      }
    } catch (error) {
      toast.error(`❌ Error al generar factura: ${error.message}`);
    }
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
      roomNumber: "",
      guestId: "",
      dateFrom: "",
      dateTo: "",
    });
    setSortBy("completedAt");
    setTimeout(() => {
      loadBookings();
    }, 100);
  };

  const getRealPaymentSummary = (booking) => {
    const payments = booking.payments || [];
    const totalPagado = payments
      .filter((p) =>
        ["authorized", "completed", "paid"].includes(p.paymentStatus)
      )
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const totalReserva = parseFloat(booking.totalAmount || 0);
    const totalExtras = booking.extraCharges?.reduce(
      (sum, c) => sum + parseFloat(c.amount || 0) * (parseInt(c.quantity) || 1),
      0
    ) || 0;
    const totalFinal = totalReserva + totalExtras;

    return {
      totalReserva,
      totalExtras,
      totalFinal,
      totalPagado,
      totalReservaFormatted: `$${totalReserva.toLocaleString()}`,
      totalExtrasFormatted: `$${totalExtras.toLocaleString()}`,
      totalFinalFormatted: `$${totalFinal.toLocaleString()}`,
      totalPagadoFormatted: `$${totalPagado.toLocaleString()}`,
      extraChargesCount: booking.extraCharges?.length || 0,
    };
  };

  const handleDeleteBooking = async (bookingId) => {
    const confirmDelete = window.confirm(
      `⚠️ ¿Estás seguro de eliminar PERMANENTEMENTE la reserva #${bookingId}?\n\n` +
      `Esta acción NO se puede deshacer y eliminará:\n` +
      `• La reserva\n` +
      `• Todos los pagos asociados\n` +
      `• Cargos extras\n` +
      `• Facturas generadas\n` +
      `• Liberará la habitación\n\n` +
      `Solo hazlo si la reserva fue cargada incorrectamente.`
    );

    if (!confirmDelete) return;

    const doubleConfirm = window.confirm(
      `🚨 ÚLTIMA ADVERTENCIA\n\n` +
      `Esta es una acción IRREVERSIBLE.\n` +
      `¿Confirmas que deseas eliminar permanentemente la reserva #${bookingId}?`
    );

    if (!doubleConfirm) return;

    setIsLoading(true);
    try {
      const result = await dispatch(deleteBookingPermanently(bookingId));
      
      if (result.success) {
        toast.success(`✅ Reserva #${bookingId} eliminada permanentemente`);
        loadBookings(); // Recargar la lista
      }
    } catch (error) {
      console.error('Error eliminando reserva:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statistics = useMemo(() => {
    const totalRevenue = completedBookings.reduce((sum, booking) => {
      const financials = getRealPaymentSummary(booking);
      return sum + financials.totalFinal;
    }, 0);

    const totalExtras = completedBookings.reduce((sum, booking) => {
      const financials = getRealPaymentSummary(booking);
      return sum + financials.totalExtras;
    }, 0);

    const averageStay = completedBookings.length > 0 
      ? completedBookings.reduce((sum, booking) => {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.actualCheckOut || booking.checkOut);
          const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
          return sum + nights;
        }, 0) / completedBookings.length
      : 0;

    return {
      total: completedBookings.length,
      totalRevenue,
      totalExtras,
      averageStay: Math.round(averageStay * 10) / 10,
      totalRevenueFormatted: `$${totalRevenue.toLocaleString()}`,
      totalExtrasFormatted: `$${totalExtras.toLocaleString()}`,
    };
  }, [completedBookings]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🎯 HEADER */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  ✅ Reservas Completadas
                </h1>
                <p className="mt-2 text-gray-600">
                  Historial de check-outs finalizados y facturas generadas
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {statistics.total}
                  </div>
                  <div className="text-xs text-green-600">Completadas</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {statistics.totalRevenueFormatted}
                  </div>
                  <div className="text-xs text-blue-600">Ingresos Totales</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {statistics.totalExtrasFormatted}
                  </div>
                  <div className="text-xs text-purple-600">Extras</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">
                    {statistics.averageStay}
                  </div>
                  <div className="text-xs text-orange-600">Noches Promedio</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 FILTROS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Ordenar por:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="completedAt">📅 Fecha check-out</option>
                <option value="total">💰 Monto total</option>
                <option value="room">🚪 Habitación</option>
                <option value="created">🕐 Fecha creación</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Habitación:
              </label>
              <input
                type="text"
                value={filters.roomNumber}
                onChange={(e) => handleFilterChange("roomNumber", e.target.value)}
                placeholder="Ej: 101"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documento:
              </label>
              <input
                type="text"
                value={filters.guestId}
                onChange={(e) => handleFilterChange("guestId", e.target.value)}
                placeholder="Documento"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desde:
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta:
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                🔍
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

      {/* 📋 LISTA DE RESERVAS COMPLETADAS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando reservas completadas...</p>
            </div>
          </div>
        ) : completedBookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay reservas completadas
            </h3>
            <p className="text-gray-600">
              No se encontraron reservas completadas con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {completedBookings.map((booking) => {
              const financials = getRealPaymentSummary(booking);
              const checkOutDate = booking.actualCheckOut || booking.checkOut;
              const checkInDate = booking.checkIn;
              const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={booking.bookingId}
                  className="bg-white rounded-xl shadow-lg border-l-4 border-l-green-500 hover:shadow-xl transition-shadow duration-300"
                >
                  {/* HEADER */}
                  <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">
                          ✅ Reserva #{booking.bookingId} - COMPLETADA
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm opacity-90">
                            🏁 Check-out: {new Date(checkOutDate).toLocaleDateString("es-CO")}
                          </span>
                          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                            {nights} noche{nights > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {financials.totalFinalFormatted}
                        </div>
                        <div className="text-sm opacity-90">
                          🚪 Habitación {booking.room?.roomNumber}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CONTENIDO */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* INFORMACIÓN DEL HUÉSPED */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">
                          👤 Información del Huésped
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-600">Nombre:</span>
                            <span className="ml-2 font-medium">{booking.guest?.scostumername}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <span className="ml-2">{booking.guest?.selectronicmail}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Teléfono:</span>
                            <span className="ml-2">{booking.guest?.stelephone}</span>
                          </div>
                        </div>
                      </div>

                      {/* RESUMEN FINANCIERO */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">
                          💰 Resumen Financiero
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Costo habitación:</span>
                            <span className="font-medium">{financials.totalReservaFormatted}</span>
                          </div>
                          {financials.totalExtras > 0 && (
                            <div className="flex justify-between">
                              <span className="text-blue-600">Consumos extras:</span>
                              <span className="text-blue-600 font-medium">
                                {financials.totalExtrasFormatted}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-1">
                            <span className="font-semibold">Total final:</span>
                            <span className="font-bold text-green-600">
                              {financials.totalFinalFormatted}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* FECHAS */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">📅 Check-in:</span>
                          <div className="font-medium">
                            {new Date(checkInDate).toLocaleDateString("es-CO")}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">🏁 Check-out:</span>
                          <div className="font-medium">
                            {new Date(checkOutDate).toLocaleDateString("es-CO")}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">⏱️ Estadía:</span>
                          <div className="font-medium">
                            {nights} noche{nights > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACCIONES */}
                    <div className="mt-4 flex gap-3">
                      <button
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        onClick={() => handleGenerateBill(booking)}
                        disabled={loading.bills}
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
                      
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        onClick={() => {
                          // TODO: Implementar vista detallada
                          toast.info("Funcionalidad en desarrollo");
                        }}
                      >
                        <span>👁️</span>
                        Ver Detalles
                      </button>

                      {isOwner && (
                        <button
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                          onClick={() => handleDeleteBooking(booking.bookingId)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Eliminando...
                            </>
                          ) : (
                            <>
                              <span>🗑️</span>
                              Eliminar
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🧾 MODAL DE FACTURA */}
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
                      ID Factura: <span className="font-bold">{generatedBill.idBill}</span>
                    </div>
                    <div>
                      Total: <span className="font-bold">{generatedBill.totalAmountFormatted}</span>
                    </div>
                  </div>
                </div>

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

export default CompletedBookings;