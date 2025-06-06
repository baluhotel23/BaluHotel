import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllBookings,
  updateBookingStatus,
} from "../../Redux/Actions/bookingActions";
import {
  updateRoomStatus,
  updateRoomBasicsStock,
} from "../../Redux/Actions/roomActions";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { 
  createRegistrationPass,
  getRegistrationPassesByBooking 
} from "../../Redux/Actions/registerActions";
import { removeStock } from "../../Redux/Actions/inventoryActions";
import Registration from "../Dashboard/Registration";
import dayjs from "dayjs";
import { toast } from "react-toastify";

const CheckIn = () => {
  const dispatch = useDispatch();
  const { bookings, loading, error } = useSelector((state) => state.booking);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [manualBookingId, setManualBookingId] = useState("");
  
  // ⭐ SELECTORES CON FALLBACK
  const { registrationsByBooking = {} } = useSelector((state) => state.registrationPass || {});
  
  // ⭐ CAMBIAR DE HABITACIÓN A RESERVA
  const [checkedBookings, setCheckedBookings] = useState({}); // Por bookingId
  const [checkedBasics, setCheckedBasics] = useState({}); // Por bookingId
  const [basicsByBooking, setBasicsByBooking] = useState({}); // Por bookingId
  const [registeredPassengers, setRegisteredPassengers] = useState({});

  const [dateRange, setDateRange] = useState({
    from: dayjs().format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  });

  // ⭐ CARGAR RESERVAS CUANDO CAMBIAN LAS FECHAS
  useEffect(() => {
    dispatch(
      getAllBookings({ fromDate: dateRange.from, toDate: dateRange.to })
    );
  }, [dispatch, dateRange]);

  // ⭐ CARGAR PASAJEROS EXISTENTES PARA CADA RESERVA
  useEffect(() => {
    bookings.forEach((booking) => {
      dispatch(getRegistrationPassesByBooking(booking.bookingId));
    });
  }, [bookings, dispatch]);

  // ⭐ SINCRONIZAR ESTADO LOCAL CON REDUX
  useEffect(() => {
    const updatedRegisteredPassengers = {};
    Object.keys(registrationsByBooking).forEach((bookingId) => {
      const passengers = registrationsByBooking[bookingId];
      if (passengers && passengers.length > 0) {
        updatedRegisteredPassengers[bookingId] = passengers;
      }
    });
    setRegisteredPassengers(updatedRegisteredPassengers);
  }, [registrationsByBooking]);

  useEffect(() => {
    console.log("Reservas obtenidas:", bookings);
  }, [bookings]);

  // ⭐ FUNCIÓN PARA VERIFICAR SI HAY PASAJEROS REGISTRADOS
  const hasRegisteredPassengers = (bookingId) => {
    return (
      registeredPassengers[bookingId]?.length > 0 ||
      registrationsByBooking[bookingId]?.length > 0
    );
  };

  const handlePreparation = (roomNumber, status) => {
    dispatch(updateRoomStatus(roomNumber, { status }));
  };

  // ⭐ NUEVA FUNCIÓN handleLoadBasics USANDO DATOS DE getAllBookings
  const handleLoadBasics = (booking) => {
    const roomNumber = booking.Room?.roomNumber;
    const bookingId = booking.bookingId;
    
    console.log('🔍 Usando básicos de getAllBookings para reserva:', bookingId);
    
    // ⭐ USAR LOS BÁSICOS QUE YA VIENEN EN LA RESERVA
    const loadedBasics = booking.Room?.BasicInventories || [];
    console.log('📦 Básicos obtenidos de getAllBookings:', loadedBasics);
    
    if (loadedBasics && loadedBasics.length > 0) {
      // ⭐ MARCAR COMO VERIFICADO POR RESERVA
      setCheckedBookings((prev) => ({ ...prev, [bookingId]: true }));

      // ⭐ GUARDAR BÁSICOS POR RESERVA
      setBasicsByBooking((prev) => ({
        ...prev,
        [bookingId]: loadedBasics.map(basic => ({
          id: basic.id,
          name: basic.name,
          description: basic.description,
          quantity: basic.RoomBasics?.quantity || 0,
          currentStock: basic.currentStock
        }))
      }));

      // ⭐ INICIALIZAR CHECKBOXES POR RESERVA
      setCheckedBasics((prev) => ({
        ...prev,
        [bookingId]: loadedBasics.reduce((acc, basic) => {
          acc[basic.id] = false;
          return acc;
        }, {}),
      }));
      
      console.log("✅ Básicos cargados para reserva", bookingId);
      toast.success(`Básicos cargados para reserva ${bookingId}`);
    } else {
      toast.info(`No hay inventario básico configurado para la habitación ${roomNumber}`);
    }
  };

  // ⭐ CAMBIAR handleCheckBasic PARA USAR BOOKING ID
  const handleCheckBasic = (bookingId, basicId) => {
    setCheckedBasics((prev) => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        [basicId]: !prev[bookingId]?.[basicId],
      },
    }));
  };

  // ⭐ CAMBIAR handleConfirmBasics PARA USAR BOOKING ID
  const handleConfirmBasics = async (bookingId) => {
    const checked = checkedBasics[bookingId];
    if (!checked) {
      toast.warning("No hay básicos seleccionados para esta reserva.");
      return;
    }

    const bookingBasics = basicsByBooking[bookingId] || [];
    console.log('🔍 Básicos disponibles para confirmar:', bookingBasics);
    console.log('🔍 Checkboxes marcados:', checked);
    
    const basicsToRemove = bookingBasics.filter((item) => checked[item.id]);
    console.log('📦 Básicos seleccionados para entrega:', basicsToRemove);

    if (basicsToRemove.length === 0) {
      toast.warning("Seleccione al menos un básico para confirmar la entrega.");
      return;
    }

    try {
      console.log("✅ Confirmando básicos para reserva:", bookingId);

      for (const basic of basicsToRemove) {
        console.log(`📤 Descontando stock: ${basic.name}, cantidad: ${basic.quantity}`);
        const result = await dispatch(removeStock(basic.id, basic.quantity));
        
        if (result && result.error) {
          toast.error(`Error al descontar ${basic.name}: ${result.message}`);
          return;
        }
      }

      // ⭐ MARCAR COMO ENTREGADO PARA ESTA RESERVA ESPECÍFICA
      setCheckedBasics((prev) => ({
        ...prev,
        [bookingId]: Object.keys(prev[bookingId] || {}).reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {}),
      }));

      toast.success(`Stock descontado para la reserva ${bookingId} exitosamente.`);
    } catch (error) {
      console.error("💥 Error en handleConfirmBasics:", error);
      toast.error("Error al confirmar la entrega de básicos.");
    }
  };

  const handlePassengerRegistrationSuccess = (bookingId, passengers) => {
    console.log("Pasajeros registrados exitosamente:", passengers);
    
    setRegisteredPassengers((prev) => ({
      ...prev,
      [bookingId]: passengers,
    }));

    toast.success(`Pasajeros registrados exitosamente para la reserva ${bookingId}`);
    dispatch(updateBookingStatus(bookingId, { status: "checked-in" }));
  };

  const handleCloseRegistration = (bookingId) => {
    setSelectedBooking(null);

    // ⭐ ACTUALIZAR ESTADO DE LA HABITACIÓN A OCUPADA
    const booking = bookings.find((b) => b.bookingId === bookingId);
    if (booking && booking.Room) {
      dispatch(
        updateRoomStatus(booking.Room.roomNumber, { status: "Ocupada" })
      );
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  if (loading)
    return <div className="text-center py-8">Cargando reservas...</div>;
  if (error)
    return <div className="text-red-500 text-center py-8">{error}</div>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Check-In de Habitaciones
          </h2>
          <p className="text-gray-600">
            Gestiona el proceso de entrada de huéspedes y preparación de habitaciones
          </p>
        </div>

        {/* Selector de fechas */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📅 Filtrar por fechas
          </h3>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desde
              </label>
              <input
                type="date"
                name="from"
                value={dateRange.from}
                onChange={handleDateChange}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta
              </label>
              <input
                type="date"
                name="to"
                value={dateRange.to}
                min={dateRange.from}
                onChange={handleDateChange}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Grid de reservas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {bookings.map((booking) => {
            // Lógica de pagos
            const payments = booking.Payments || [];
            const totalPagado = payments.reduce(
              (sum, p) => sum + parseFloat(p.amount),
              0
            );
            const totalReserva = parseFloat(booking.totalAmount);
            let estadoPago = "Sin pago";
            let pagoColor = "bg-red-100 text-red-700";
            
            if (totalPagado >= totalReserva) {
              estadoPago = "Pago completo";
              pagoColor = "bg-green-100 text-green-700";
            } else if (totalPagado > 0) {
              estadoPago = "Pago parcial";
              pagoColor = "bg-yellow-100 text-yellow-700";
            }

            // Estado de la habitación
            const getRoomStatusColor = (status) => {
              switch (status) {
                case "Limpia":
                  return "bg-green-100 text-green-700 border-green-200";
                case "Ocupada":
                  return "bg-red-100 text-red-700 border-red-200";
                case "Mantenimiento":
                  return "bg-orange-100 text-orange-700 border-orange-200";
                case "Reservada":
                  return "bg-blue-100 text-blue-700 border-blue-200";
                case "Para Limpiar":
                  return "bg-yellow-100 text-yellow-700 border-yellow-200";
                default:
                  return "bg-gray-100 text-gray-700 border-gray-200";
              }
            };

            // ⭐ USAR LA NUEVA FUNCIÓN PARA VERIFICAR PASAJEROS
            const hasPassengers = hasRegisteredPassengers(booking.bookingId);
            const passengersCount = registrationsByBooking[booking.bookingId]?.length || 0;

            return (
              <div
                key={booking.bookingId}
                className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
              >
                {/* Header con información principal */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        🏨 Habitación #{booking.Room?.roomNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Reserva #{booking.bookingId}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoomStatusColor(
                        booking.Room?.status
                      )}`}
                    >
                      {booking.Room?.status || "Sin estado"}
                    </span>
                  </div>

                  {/* Información del huésped */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">👤 Huésped:</span>
                      <span className="text-sm text-gray-800 font-medium">
                        {booking.guest?.scostumername}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">📅 Check-in:</span>
                      <span className="text-sm text-gray-800">
                        {dayjs(booking.checkIn).format("DD/MM/YYYY")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">📊 Estado:</span>
                      <span className="text-sm font-medium text-blue-600">
                        {booking.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estado de pago */}
                <div className="px-6 py-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">💳 Estado de pago:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${pagoColor}`}>
                      {estadoPago}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">
                      ${totalPagado.toLocaleString()} / ${totalReserva.toLocaleString()}
                    </span>
                  </div>
                  {payments.length > 0 && (
                    <div className="mt-2">
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer hover:text-gray-800">
                          Ver detalles de pagos ({payments.length})
                        </summary>
                        <ul className="mt-2 space-y-1 ml-4">
                          {payments.map((p) => (
                            <li key={p.paymentId} className="flex justify-between">
                              <span>
                                {p.paymentType === "full" ? "Completo" : "Parcial"}
                              </span>
                              <span>
                                ${parseFloat(p.amount).toLocaleString()} ({p.paymentMethod})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>

                {/* ⭐ SECCIÓN DE INVENTARIO BÁSICO - USANDO BOOKING ID */}
                <div className="px-6 py-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    📦 Inventario básico - Reserva #{booking.bookingId}
                  </h4>
                  
                  <div className="space-y-2 mb-4">
                    {checkedBookings[booking.bookingId] ? (
                      // ⭐ MOSTRAR BÁSICOS CARGADOS PARA ESTA RESERVA
                      (basicsByBooking[booking.bookingId] || []).length > 0 ? (
                        basicsByBooking[booking.bookingId].map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checkedBasics[booking.bookingId]?.[item.id] || false}
                              onChange={() => handleCheckBasic(booking.bookingId, item.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{item.name}</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              Qty: {item.quantity}
                            </span>
                          </label>
                        ))
                      ) : (
                        <div className="p-2 text-gray-500 text-sm">
                          No hay inventario básico configurado para esta habitación
                        </div>
                      )
                    ) : (
                      // ⭐ MOSTRAR BÁSICOS ESTÁTICOS DESDE getAllBookings
                      (booking.Room?.BasicInventories || []).map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2">
                          <div className="w-4 h-4 bg-gray-200 rounded"></div>
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            Qty: {item.RoomBasics?.quantity || 0}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        checkedBookings[booking.bookingId]
                          ? "bg-green-500 text-white"
                          : "bg-yellow-500 text-white hover:bg-yellow-600"
                      }`}
                      onClick={() => handleLoadBasics(booking)} // ⭐ PASAR TODA LA RESERVA
                      disabled={checkedBookings[booking.bookingId]}
                    >
                      {checkedBookings[booking.bookingId]
                        ? "✅ Verificados"
                        : "🔍 Verificar"}
                    </button>

                    {checkedBookings[booking.bookingId] && (
                      <button
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                        onClick={() => handleConfirmBasics(booking.bookingId)}
                      >
                        📤 Entregar
                      </button>
                    )}
                  </div>

                  {checkedBookings[booking.bookingId] && (
                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                      <p className="text-green-700 text-sm flex items-center gap-2">
                        ✅ Básicos listos para entrega - Reserva #{booking.bookingId}
                      </p>
                    </div>
                  )}
                </div>

                {/* ⭐ PROGRESO VISUAL - USANDO BOOKING ID */}
                <div className="px-6 py-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">
                    📋 Progreso del Check-in
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        checkedBookings[booking.bookingId] ? "bg-green-500" : "bg-gray-300"
                      }`}></div>
                      <span className="text-xs text-gray-600">Inventario verificado</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        booking.Room?.status === "Limpia" ? "bg-green-500" : "bg-gray-300"
                      }`}></div>
                      <span className="text-xs text-gray-600">Habitación limpia</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        hasPassengers ? "bg-green-500" : "bg-gray-300"
                      }`}></div>
                      <span className="text-xs text-gray-600">
                        Ocupantes registrados {hasPassengers ? `(${passengersCount})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ⭐ BOTONES DE ACCIÓN MEJORADOS */}
                <div className="p-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        booking.Room?.status === "Limpia"
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5"
                      }`}
                      disabled={booking.Room?.status === "Limpia"}
                      onClick={() => handlePreparation(booking.Room?.roomNumber, "Limpia")}
                    >
                      {booking.Room?.status === "Limpia"
                        ? "✅ Habitación limpia"
                        : "🧹 Marcar como limpia"}
                    </button>

                    <button
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        hasPassengers
                          ? "bg-green-500 text-white"
                          : booking.Room?.status === "Limpia"
                          ? "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md transform hover:-translate-y-0.5"
                          : "bg-gray-400 text-gray-700 cursor-not-allowed"
                      }`}
                      disabled={booking.Room?.status !== "Limpia" && !hasPassengers}
                      onClick={() =>
                        setSelectedBooking(
                          selectedBooking === booking.bookingId ? null : booking.bookingId
                        )
                      }
                    >
                      {hasPassengers
                        ? `✅ Ocupantes registrados (${passengersCount})`
                        : booking.Room?.status === "Limpia"
                        ? "👥 Registrar ocupantes"
                        : "🔒 Limpiar habitación primero"}
                    </button>
                  </div>
                </div>

                {/* Formulario de registro de ocupantes */}
                {selectedBooking === booking.bookingId && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        👥 Registro de Ocupantes
                      </h4>
                      <Registration
                        bookingId={booking.bookingId}
                        onSuccess={(passengers) =>
                          handlePassengerRegistrationSuccess(
                            booking.bookingId,
                            passengers
                          )
                        }
                        onClose={() => handleCloseRegistration(booking.bookingId)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {bookings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏨</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay reservas para estas fechas
            </h3>
            <p className="text-gray-500">
              Selecciona un rango de fechas diferente para ver las reservas
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CheckIn;