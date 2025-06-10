import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllBookings,
  updateBookingStatus,
  generateBill,
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
  const { bookings, loading, error } = useSelector((state) => state.booking);
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // ⭐ ESTADOS PARA MANEJO DE INVENTARIO Y PASAJEROS
  const [expandedBookings, setExpandedBookings] = useState({});
  const [basicsByBooking, setBasicsByBooking] = useState({});
  const [checkedBasics, setCheckedBasics] = useState({});
  const [passengersByBooking, setPassengersByBooking] = useState({});

  // ⭐ OBTENER DATOS DE REGISTRATION PASSES
  const allRegistrationsByBooking = useSelector(
    (state) => state.registrationPass?.registrationsByBooking || {}
  );

  useEffect(() => {
    dispatch(getAllBookings({ status: "checked-in" }));
  }, [dispatch]);

  // ⭐ CARGAR INVENTARIO BÁSICO POR RESERVA
  const handleLoadBasics = (booking) => {
    const bookingId = booking.bookingId;
    
    console.log('🔍 Cargando básicos para checkout - reserva:', bookingId);
    
    // ⭐ USAR LOS BÁSICOS QUE VIENEN CON LA RESERVA (desde getAllBookings)
    const loadedBasics = booking.Room?.BasicInventories || [];
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
          verified: false // ⭐ PARA CHECKOUT, INICIA COMO NO VERIFICADO
        }))
      }));

      setCheckedBasics((prev) => ({
        ...prev,
        [bookingId]: loadedBasics.reduce((acc, basic) => {
          acc[basic.id] = false; // ⭐ PARA VERIFICACIÓN DE DEVOLUCIÓN
          return acc;
        }, {}),
      }));
      
      console.log("✅ Básicos cargados para checkout - reserva", bookingId);
      toast.success(`Inventario básico cargado para verificación`);
    } else {
      toast.info(`No hay inventario básico para esta habitación`);
    }
  };

  // ⭐ CARGAR PASAJEROS REGISTRADOS
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

  // ⭐ MANEJAR VERIFICACIÓN DE INVENTARIO BÁSICO
  const handleCheckBasic = (bookingId, basicId) => {
    setCheckedBasics((prev) => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        [basicId]: !prev[bookingId]?.[basicId],
      },
    }));
  };

  // ⭐ EXPANDIR/COLAPSAR DETALLES DE RESERVA
  const toggleBookingDetails = (bookingId) => {
    setExpandedBookings((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
  };

  // ⭐ CHECKOUT MEJORADO CON VALIDACIONES
  const handleCheckOut = async (bookingId) => {
    try {
      const booking = bookings.find((b) => b.bookingId === bookingId);
      
      if (!booking) {
        toast.error("Reserva no encontrada");
        return;
      }

      // ⭐ VALIDAR INVENTARIO BÁSICO SI EXISTE
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

      // 1. ⭐ ACTUALIZAR ESTADO DE RESERVA A COMPLETED
      await dispatch(updateBookingStatus(bookingId, { status: "completed" }));
      toast.success(`Reserva #${bookingId} marcada como completada`);

      // 2. ⭐ GENERAR FACTURA
      await dispatch(generateBill(bookingId));
      toast.info(`Factura generada para reserva #${bookingId}`);

      // 3. ⭐ ACTUALIZAR HABITACIÓN A "PARA LIMPIAR" (NO DISPONIBLE)
      if (booking.Room) {
        await dispatch(
          updateRoomStatus(booking.Room.roomNumber, { status: "Para Limpiar" })
        );
        toast.success(
          `Habitación #${booking.Room.roomNumber} marcada como "Para Limpiar"`
        );
      }

      // 4. ⭐ LIMPIAR ESTADOS LOCALES
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

      // 5. ⭐ RECARGAR LISTA DE RESERVAS
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

  const handlePaymentSuccess = () => {
    toast.success("Pago realizado exitosamente.");
    setSelectedBooking(null);
    dispatch(getAllBookings({ status: "checked-in" }));
  };

  if (loading) return <div className="flex justify-center items-center h-64">
    <div className="text-lg">🔄 Cargando reservas para checkout...</div>
  </div>;
  
  if (error) return <div className="text-red-500 text-center p-4">❌ {error}</div>;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">🏨 Check-Out de Habitaciones</h2>
          <div className="text-sm text-gray-600">
            📊 {bookings.length} reserva(s) lista(s) para checkout
          </div>
        </div>

        {bookings.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 p-6 text-blue-700 rounded-lg text-center">
            <div className="text-xl mb-2">🏖️</div>
            <div className="font-medium">No hay habitaciones para check-out</div>
            <div className="text-sm mt-1">Todas las reservas están en otros estados</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bookings.map((booking) => {
            const payments = booking.Payments || [];
            const totalPagado = payments.reduce(
              (sum, p) => sum + (parseFloat(p.amount) || 0),
              0
            );
            const totalReserva = parseFloat(booking.totalAmount) || 0;
            const extras = booking.ExtraCharges || [];
            const totalExtras = extras.reduce(
              (sum, e) => sum + (parseFloat(e.price) || 0),
              0
            );
            const totalFinal = totalReserva + totalExtras;
            const totalPendiente = Math.max(0, totalFinal - totalPagado);

            // ⭐ OBTENER DATOS DE INVENTARIO Y PASAJEROS
            const bookingBasics = basicsByBooking[booking.bookingId] || [];
            const bookingPassengers = passengersByBooking[booking.bookingId] || [];
            const isExpanded = expandedBookings[booking.bookingId];

            // ⭐ VERIFICAR SI EL INVENTARIO ESTÁ COMPLETO
            const basicsChecked = checkedBasics[booking.bookingId] || {};
            const allBasicsVerified = bookingBasics.length === 0 || 
              bookingBasics.every(basic => basicsChecked[basic.id] === true);

            return (
              <div
                key={booking.bookingId}
                className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
              >
                {/* ⭐ HEADER DE LA RESERVA */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        🏠 Habitación #{booking.Room?.roomNumber}
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

                  {/* ⭐ INFORMACIÓN DE HUÉSPED */}
                  {booking.guest && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">👤 Huésped:</span>
                        <br />
                        {booking.guest.scostumername}
                        {booking.guest.selectronicmail && (
                          <span className="text-gray-500"> • {booking.guest.selectronicmail}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ⭐ INFORMACIÓN FINANCIERA */}
                <div className="p-6 border-b border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-medium text-gray-700">💰 Total reserva:</span>
                      <br />
                      <span className="text-lg font-bold">${totalReserva.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">➕ Extras:</span>
                      <br />
                      <span className="text-lg font-bold text-blue-600">${totalExtras.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">💳 Estado de pago:</span>
                      <span className={`font-bold ${
                        totalPendiente > 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {totalPagado >= totalFinal ? "✅ Pagado" : 
                         totalPagado > 0 ? "⚠️ Parcial" : "❌ Sin pago"}
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

                {/* ⭐ CARGOS EXTRAS */}
                <div className="p-6 border-b border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-3">💰 Cargos extras</h4>
                  {extras.length > 0 ? (
                    <ul className="space-y-1 text-sm mb-3">
                      {extras.map((extra, idx) => (
                        <li key={idx} className="flex justify-between items-center">
                          <span>{extra.description}</span>
                          <span className="font-medium">${(parseFloat(extra.price) || 0).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm mb-3">Sin cargos extras</p>
                  )}
                  <ExtraCharges bookingId={booking.bookingId} />
                </div>

                {/* ⭐ DETALLES EXPANDIBLES */}
                <div className="p-6">
                  <button
                    onClick={() => toggleBookingDetails(booking.bookingId)}
                    className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-700">
                      📋 Ver detalles completos
                    </span>
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ⬇️
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-4">
                      {/* ⭐ SECCIÓN DE PASAJEROS */}
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
                          <p className="text-gray-500 text-sm">Click &quot;Cargar&quot; para ver los pasajeros</p>
                        )}
                      </div>

                      {/* ⭐ SECCIÓN DE INVENTARIO BÁSICO */}
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
                          <p className="text-gray-500 text-sm">Click &quot;Verificar&quot; para cargar inventario</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ⭐ ACCIONES DE CHECKOUT */}
                <div className="p-6 bg-gray-50 rounded-b-xl">
                  <div className="flex gap-3">
                    {totalPendiente > 0 && (
                      <button
                        className="flex-1 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <span>💳</span>
                        Pagar pendiente
                      </button>
                    )}
                    <button
                      className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center gap-2 ${
                        totalPendiente > 0
                          ? "bg-yellow-600 hover:bg-yellow-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                      onClick={() => handleCheckOut(booking.bookingId)}
                    >
                      <span>🏁</span>
                      {totalPendiente > 0
                        ? "Finalizar (Pago pendiente)"
                        : "Finalizar Check-Out"}
                    </button>
                  </div>
                  
                  {!allBasicsVerified && bookingBasics.length > 0 && (
                    <p className="text-yellow-600 text-xs mt-2 text-center">
                      ⚠️ Recuerda verificar el inventario básico antes del checkout
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ⭐ MODAL DE PAGO */}
      {selectedBooking && (
        <PaymentAndReceipt
          bookingData={selectedBooking}
          amountToPay={Math.max(
            0,
            parseFloat(selectedBooking.totalAmount) +
              selectedBooking.ExtraCharges.reduce(
                (sum, e) => sum + (parseFloat(e.price) || 0),
                0
              ) -
              selectedBooking.Payments.reduce(
                (sum, p) => sum + (parseFloat(p.amount) || 0),
                0
              )
          )}
          currentBuyerData={selectedBooking.guest}
          selectedRoom={selectedBooking.Room}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </DashboardLayout>
  );
};

export default CheckOut;