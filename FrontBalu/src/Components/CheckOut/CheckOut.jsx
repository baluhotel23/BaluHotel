import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
  getAllBookings, 
  updateBookingStatus, 
  generateBill 
} from "../../Redux/Actions/bookingActions";
import { updateRoomStatus } from "../../Redux/Actions/roomActions";
import { getRegistrationPassesByBooking } from "../../Redux/Actions/registerActions";
import dayjs from "dayjs";
import ExtraCharges from "./ExtraCharge";
import PaymentAndReceipt from "../Booking/PaymentAndReceipt";
import { toast } from "react-toastify";
import DashboardLayout from "../Dashboard/DashboardLayout";

const CheckOut = () => {
  const dispatch = useDispatch();
  
  // Selectores para datos de reservas
  const { 
    bookings: allBookings = [], 
    loading = {}, 
    errors = {} 
  } = useSelector((state) => state.booking || {});
  
  const isLoadingBookings = loading.bookings || loading.general || false;
  const bookingsError = errors.bookings || errors.general || null;

  // Filtrar solo reservas en estado checked-in
  const bookings = Array.isArray(allBookings) 
    ? allBookings.filter(booking => booking.status === 'checked-in')
    : [];
  
  // Estados simples para gestión de consumos
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [expandedBookings, setExpandedBookings] = useState({});
  
  // Estados para manejo de inventario y pasajeros
  const [basicsByBooking, setBasicsByBooking] = useState({});
  const [checkedBasics, setCheckedBasics] = useState({});
  const [passengersByBooking, setPassengersByBooking] = useState({});

  // Obtener datos de registration passes
  const allRegistrationsByBooking = useSelector(
    (state) => state.registrationPass?.registrationsByBooking || {}
  );

  // Función para recargar datos de forma explícita
  const refreshBookings = () => {
    console.log("🔄 [CHECK-OUT] Recargando datos manualmente...");
    dispatch(getAllBookings({ status: "checked-in" }))
      .then(data => {
        console.log(`✅ [CHECK-OUT] Datos recargados: ${data?.length || 0} reservas`);
        if (data?.length > 0) {
          // Verificar si hay extras en las reservas
          let totalExtras = 0;
          data.forEach(booking => {
            const extras = booking.extraCharges || [];
            totalExtras += extras.length;
          });
          console.log(`📊 [CHECK-OUT] Total de extras encontrados: ${totalExtras}`);
        }
        toast.success("Datos actualizados correctamente");
      })
      .catch(err => {
        console.error("❌ [CHECK-OUT] Error al recargar datos:", err);
        toast.error("Error al actualizar datos");
      });
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    console.log("🔄 CheckOut: Componente montado - Cargando reservas checked-in");
    dispatch(getAllBookings({ status: "checked-in" }));
    
    // Recarga periódica cada 2 minutos para mantener datos frescos
    const intervalId = setInterval(() => {
      console.log("⏰ [CHECK-OUT] Actualizando datos automáticamente (2min)");
      dispatch(getAllBookings({ status: "checked-in" }));
    }, 120000); // 2 minutos
    
    return () => {
      console.log("👋 CheckOut: Componente desmontado");
      clearInterval(intervalId);
    };
  }, [dispatch]);

  // Debug para verificar datos de cargos extras
  useEffect(() => {
    if (bookings?.length > 0) {
      bookings.forEach(booking => {
        const extras = booking.extraCharges || [];
        console.group(`🔍 [DEBUG] Reserva #${booking.bookingId}`);
        console.log(`👤 Huésped: ${booking.guest?.scostumername || 'N/A'}`);
        console.log(`💰 Total Reserva: $${booking.totalAmount}`);
        console.log(`📝 Extras: ${extras.length} cargos por $${extras.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)}`);
        
        if (extras.length > 0) {
          console.log('📋 Detalle de extras:');
          extras.forEach((extra, i) => {
            console.log(`  ${i+1}. ${extra.description}: $${extra.amount} x${extra.quantity} (ID: ${extra.id})`);
          });
        }
        console.groupEnd();
      });
    }
  }, [bookings]);

  // Cargar inventario básico por reserva
  const handleLoadBasics = (booking) => {
    const bookingId = booking.bookingId;
    
    console.log('🔍 Cargando básicos para checkout - reserva:', bookingId);
    
    // Usar los básicos que vienen con la reserva (desde getAllBookings)
    const loadedBasics = booking.room?.BasicInventories || [];
    console.log('📦 Básicos obtenidos para checkout:', loadedBasics);
    
    if (loadedBasics && loadedBasics.length > 0) {
      setBasicsByBooking((prev) => ({
        ...prev,
        [bookingId]: loadedBasics.map(basic => ({
          id: basic.id,
          name: basic.name,
          description: basic.description,
          quantity: basic.RoomBasics?.quantity || 0,
          currentStock: basic.currentStock,
          verified: false // Para checkout, inicia como no verificado
        }))
      }));

      setCheckedBasics((prev) => ({
        ...prev,
        [bookingId]: loadedBasics.reduce((acc, basic) => {
          acc[basic.id] = false; // Para verificación de devolución
          return acc;
        }, {}),
      }));
      
      console.log("✅ Básicos cargados para checkout - reserva", bookingId);
      toast.success(`Inventario básico cargado para verificación`);
    } else {
      toast.info(`No hay inventario básico para esta habitación`);
    }
  };

  // Cargar pasajeros registrados
  const handleLoadPassengers = async (bookingId) => {
    try {
      console.log('🔍 Cargando pasajeros para checkout - reserva:', bookingId);
      
      await dispatch(getRegistrationPassesByBooking(bookingId));
      
      // Los pasajeros se cargan en el estado de Redux
      const passengers = allRegistrationsByBooking[bookingId] || [];
      console.log('👥 Pasajeros obtenidos:', passengers);
      
      setPassengersByBooking((prev) => ({
        ...prev,
        [bookingId]: passengers
      }));
      
      if (passengers.length > 0) {
        toast.success(`${passengers.length} pasajero(s) cargado(s) para revisión`);
      } else {
        toast.info("No hay pasajeros registrados para esta reserva");
      }
    } catch (error) {
      console.error("❌ Error al cargar pasajeros:", error);
      toast.error("Error al cargar información de pasajeros");
    }
  };

  // Manejar verificación de inventario básico
  const handleCheckBasic = (bookingId, basicId) => {
    setCheckedBasics((prev) => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        [basicId]: !prev[bookingId]?.[basicId],
      },
    }));
  };

  // Expandir/colapsar detalles de reserva
  const toggleBookingDetails = (bookingId) => {
    setExpandedBookings((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
  };

  // 🎯 FUNCIÓN PRINCIPAL DE CHECKOUT CON TODAS LAS FUNCIONALIDADES
  const handleCheckOut = async (bookingId) => {
    try {
      const booking = bookings.find((b) => b.bookingId === bookingId);
      
      if (!booking) {
        toast.error("Reserva no encontrada");
        return;
      }

      // Validar inventario básico si existe
      const bookingBasics = basicsByBooking[bookingId] || [];
      if (bookingBasics.length > 0) {
        const checkedBasicsForBooking = checkedBasics[bookingId] || {};
        const allBasicsChecked = bookingBasics.every(basic => 
          checkedBasicsForBooking[basic.id] === true
        );

        if (!allBasicsChecked) {
          const confirmed = window.confirm(
            "No has verificado todo el inventario básico. ¿Deseas continuar con el checkout de todas formas?"
          );
          if (!confirmed) {
            toast.warning("Checkout cancelado. Verifica el inventario básico.");
            return;
          }
        }
      }

      console.log("🏁 Iniciando proceso de checkout para reserva:", bookingId);

      // 1. Actualizar estado de reserva a COMPLETED
      await dispatch(updateBookingStatus(bookingId, { status: "completed" }));
      toast.success(`Reserva #${bookingId} marcada como completada`);

      // 2. Generar factura y enviar a Taxxa
      await dispatch(generateBill(bookingId));
      toast.info(`Factura generada para reserva #${bookingId}`);

      // 3. Actualizar habitación a "Para Limpiar"
      if (booking.room) {
        await dispatch(
          updateRoomStatus(booking.room.roomNumber, { status: "Para Limpiar" })
        );
        toast.success(
          `Habitación #${booking.room.roomNumber} marcada como "Para Limpiar"`
        );
      }

      // 4. Limpiar estados locales
      setBasicsByBooking((prev) => {
        const updated = { ...prev };
        delete updated[bookingId];
        return updated;
      });
      setCheckedBasics((prev) => {
        const updated = { ...prev };
        delete updated[bookingId];
        return updated;
      });
      setPassengersByBooking((prev) => {
        const updated = { ...prev };
        delete updated[bookingId];
        return updated;
      });
      setExpandedBookings((prev) => {
        const updated = { ...prev };
        delete updated[bookingId];
        return updated;
      });

      // 5. Recargar lista de reservas
      dispatch(getAllBookings({ status: "checked-in" }));
      
      toast.success(
        `🎉 Check-out completado exitosamente para reserva #${bookingId}`
      );
    } catch (error) {
      console.error("❌ Error al realizar check-out:", error);
      toast.error(
        "Error al procesar el check-out. Verifique los datos o intente nuevamente."
      );
    }
  };

  // Manejar cierre de modal de pago
  const handlePaymentSuccess = () => {
    toast.success("Pago realizado exitosamente.");
    setSelectedBooking(null);
    dispatch(getAllBookings({ status: "checked-in" }));
  };

  // Condiciones de loading y error
  if (isLoadingBookings) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent border-solid rounded-full animate-spin mb-4"></div>
            <p className="text-xl text-gray-700">🔄 Cargando reservas activas...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (bookingsError) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)] px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> No se pudieron cargar las reservas: {bookingsError}. Por favor, intente más tarde.</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
  <DashboardLayout>
    <div className="container mx-auto p-6">
      {/* Encabezado con botón de actualización */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">🏨 Check-Out de Habitaciones</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshBookings}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg flex items-center gap-1 hover:bg-blue-700 transition-colors"
          >
            <span>🔄</span> Actualizar
          </button>
          <div className="text-sm text-gray-600">
            📊 {bookings.length} reserva(s) lista(s) para checkout
          </div>
        </div>
      </div>

      {/* Guía del proceso */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">🧭 Proceso de Check-Out</h3>
        <p className="text-sm text-blue-700">
          Complete los pagos pendientes y verifique el inventario antes de finalizar el check-out. 
          El sistema generará automáticamente la factura y actualizará el estado de la habitación.
        </p>
      </div>

      {/* Mensaje cuando no hay reservas */}
      {bookings.length === 0 && !isLoadingBookings && (
        <div className="bg-blue-50 border border-blue-200 p-6 text-blue-700 rounded-lg text-center">
          <div className="text-xl mb-2">🏖️</div>
          <div className="font-medium">No hay habitaciones para check-out</div>
          <div className="text-sm mt-1">
            {allBookings.length > 0 
              ? `Hay ${allBookings.length} reserva(s) en otros estados`
              : "No hay reservas checked-in disponibles"
            }
          </div>
        </div>
      )}

      {/* Grid de reservas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bookings.map((booking) => {
          const payments = booking.payments || [];
          const totalPagado = payments
            .filter(p => p.paymentStatus === 'completed')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
          
          const totalReserva = parseFloat(booking.totalAmount) || 0;
          const extras = booking.extraCharges || [];
          const totalExtras = extras.reduce(
            (sum, e) => sum + (parseFloat(e.amount) || 0),
            0
          );
          const totalFinal = totalReserva + totalExtras;
          const totalPendiente = Math.max(0, totalFinal - totalPagado);

          // Obtener datos de inventario y pasajeros
          const bookingBasics = basicsByBooking[booking.bookingId] || [];
          const bookingPassengers = passengersByBooking[booking.bookingId] || [];
          const isExpanded = expandedBookings[booking.bookingId];

          // Verificar si el inventario está completo
          const basicsChecked = checkedBasics[booking.bookingId] || {};
          const allBasicsVerified = bookingBasics.length === 0 || 
            bookingBasics.every(basic => basicsChecked[basic.id] === true);

          return (
            <div
              key={booking.bookingId}
              className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
            >
              {/* Header de la reserva */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      🏠 Habitación #{booking.room?.roomNumber || booking.roomNumber}
                    </h3>
                    <p className="text-gray-600">Reserva #{booking.bookingId}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    🟢 Checked-in
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">📅 Check-in:</span>
                    <br />
                    {dayjs(booking.checkIn).format("DD/MM/YYYY")}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">📅 Check-out:</span>
                    <br />
                    {dayjs(booking.checkOut).format("DD/MM/YYYY")}
                  </div>
                </div>

                {/* Información de huésped */}
                {booking.guest && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">👤 Huésped:</span>
                      <br />
                      {booking.guest.scostumername}
                    </div>
                  </div>
                )}
              </div>

              {/* Información financiera */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium text-gray-700">💰 Total reserva:</span>
                    <br />
                    <span className="text-lg font-bold">${totalReserva.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">➕ Consumos extras:</span>
                    <br />
                    <span className="text-lg font-bold text-blue-600">${totalExtras.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">💳 Estado de cuenta:</span>
                    <span className={`font-bold ${
                      totalPendiente > 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      {totalPagado >= totalFinal ? "✅ Pagado" : 
                       totalPagado > 0 ? "⚠️ Parcial" : "❌ Pendiente"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Pagado: ${totalPagado.toLocaleString()} / Total: ${totalFinal.toLocaleString()}
                  </div>
                  {totalPendiente > 0 && (
                    <div className="text-red-600 font-medium mt-1">
                      Pendiente: ${totalPendiente.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Cargos extras - SECCIÓN CENTRAL */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-semibold text-gray-800">
                    💰 Consumos y Cargos Extras
                  </h4>
                  <button
                    onClick={() => toggleBookingDetails(booking.bookingId)}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                  >
                    {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                  </button>
                </div>

                {/* Componente ExtraCharges */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <ExtraCharges bookingId={booking.bookingId} isLoading={isLoadingBookings} />
                </div>
                
                {/* Historial de cargos - expandible */}
                {isExpanded && extras.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-700 mb-2">📋 Historial de consumos:</h5>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full bg-white rounded-lg overflow-hidden">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-600">Fecha</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-600">Descripción</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-600">Cant.</th>
                            <th className="py-2 px-3 text-right text-xs font-medium text-gray-600">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extras.map((extra, idx) => (
                            <tr key={extra.id || idx} className="border-t border-gray-200">
                              <td className="py-2 px-3 text-xs text-gray-700">
                                {extra.chargeDate ? dayjs(extra.chargeDate).format("DD/MM/YYYY HH:mm") : 'N/A'}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900">{extra.description}</td>
                              <td className="py-2 px-3 text-sm text-gray-700">{extra.quantity || 1}</td>
                              <td className="py-2 px-3 text-right text-sm font-medium">
                                ${parseFloat(extra.amount || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan="3" className="py-2 px-3 text-right text-sm font-medium">Total:</td>
                            <td className="py-2 px-3 text-right text-sm font-bold text-blue-600">
                              ${totalExtras.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Detalles expandibles - inventario y pasajeros */}
                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    {/* Sección de pasajeros */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium text-gray-700">👥 Pasajeros registrados</h5>
                        <button
                          onClick={() => handleLoadPassengers(booking.bookingId)}
                          className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                          🔄 Cargar
                        </button>
                      </div>
                      
                      {bookingPassengers.length > 0 ? (
                        <div className="space-y-2">
                          {bookingPassengers.map((passenger, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 bg-green-50 rounded text-sm">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span className="font-medium">{passenger.name}</span>
                              <span className="text-gray-600">•</span>
                              <span>{passenger.nationality}</span>
                              <span className="text-gray-600">•</span>
                              <span className="font-mono text-gray-500">{passenger.idNumber}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Click "Cargar" para ver los pasajeros</p>
                      )}
                    </div>

                    {/* Sección de inventario básico */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium text-gray-700">📦 Inventario básico</h5>
                        <button
                          onClick={() => handleLoadBasics(booking)}
                          className="text-sm bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                        >
                          🔍 Verificar
                        </button>
                      </div>

                      {bookingBasics.length > 0 ? (
                        <div className="space-y-2">
                          {bookingBasics.map((basic) => (
                            <label
                              key={basic.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={basicsChecked[basic.id] || false}
                                onChange={() => handleCheckBasic(booking.bookingId, basic.id)}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span className="text-sm text-gray-700">{basic.name}</span>
                              <span className="text-xs text-gray-500 ml-auto">
                                Qty: {basic.quantity}
                              </span>
                            </label>
                          ))}
                          <div className={`mt-2 p-2 rounded text-sm ${
                            allBasicsVerified 
                              ? "bg-green-50 text-green-700" 
                              : "bg-yellow-50 text-yellow-700"
                          }`}>
                            {allBasicsVerified 
                              ? "✅ Inventario verificado" 
                              : "⚠️ Verificar todos los elementos"
                            }
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Click "Verificar" para cargar inventario</p>
                      )}
                    </div>
                  </div>
                )}
                
                {isExpanded && extras.length === 0 && (
                  <div className="text-center p-4 text-gray-500">
                    📝 No hay consumos registrados para esta reserva.
                  </div>
                )}
              </div>

              {/* Acciones de checkout */}
              <div className="p-6 bg-gray-50 rounded-b-xl">
                <div className="flex gap-3">
                  {/* Botón de Pago - Solo si hay saldo pendiente */}
                  {totalPendiente > 0 && (
                    <button
                      className="flex-1 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <span>💳</span>
                      Realizar Pago
                      <span className="text-xs bg-blue-500 px-2 py-1 rounded ml-1">
                        ${totalPendiente.toLocaleString()}
                      </span>
                    </button>
                  )}
                  
                  {/* Botón de Finalizar Check-Out */}
                  <button
                    className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center gap-2 ${
                      totalPendiente > 0
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    onClick={() => totalPendiente === 0 && handleCheckOut(booking.bookingId)}
                    disabled={totalPendiente > 0}
                    title={totalPendiente > 0 ? "Complete el pago antes de finalizar" : "Finalizar check-out"}
                  >
                    <span>{totalPendiente > 0 ? "⏳" : "🏁"}</span>
                    {totalPendiente > 0 ? "Pago Requerido" : "Finalizar Check-Out"}
                  </button>
                </div>

                {/* Indicador de estado de pago */}
                <div className="mt-3 text-center">
                  {totalPendiente > 0 ? (
                    <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                      ⚠️ Saldo pendiente: ${totalPendiente.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                      ✅ Pagos completados - Listo para finalizar
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Componente de pago fuera del grid */}
    {selectedBooking && (
      <PaymentAndReceipt
        bookingData={selectedBooking}
        amountToPay={Math.max(
          0,
          parseFloat(selectedBooking.totalAmount) +
            (selectedBooking.extraCharges || []).reduce(
              (sum, e) => sum + (parseFloat(e.amount) || 0),
              0
            ) -
            (selectedBooking.payments || []).reduce(
              (sum, p) => sum + (parseFloat(p.amount) || 0),
              0
            )
        )}
        currentBuyerData={selectedBooking.guest}
        selectedRoom={selectedBooking.room}
        onPaymentSuccess={handlePaymentSuccess}
      />
    )}
  </DashboardLayout>
);
};

export default CheckOut;