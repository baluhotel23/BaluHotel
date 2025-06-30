import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  getAllBookings,
  updateBookingStatus,
} from "../../Redux/Actions/bookingActions";
import { updateRoomStatus } from "../../Redux/Actions/roomActions";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { getRegistrationPassesByBooking } from "../../Redux/Actions/registerActions";
import { removeStock } from "../../Redux/Actions/inventoryActions";
import Registration from "../Dashboard/Registration";
import dayjs from "dayjs";
import { toast } from "react-toastify";

const CheckIn = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Redux selectors
  const {
    bookings: allBookings = [],
    loading = {},
    errors = {},
  } = useSelector((state) => state.booking || {});
  const { registrationsByBooking = {} } = useSelector(
    (state) => state.registrationPass || {}
  );

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: dayjs().format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  });

  // Estados de inventario básico
  const [checkedBookings, setCheckedBookings] = useState({});
  const [checkedBasics, setCheckedBasics] = useState({});
  const [basicsByBooking, setBasicsByBooking] = useState({});

  const isLoadingBookings = loading.general || false;
  const bookingError = errors.general || null;

  // Cargar reservas al cambiar fechas
  useEffect(() => {
    dispatch(
      getAllBookings({
        fromDate: dateRange.from,
        toDate: dateRange.to,
      })
    );
  }, [dispatch, dateRange.from, dateRange.to]);

  // Memoizar bookings filtrados
  const bookings = useMemo(() => {
    if (!Array.isArray(allBookings)) return [];
    const validStatuses = ["pending", "confirmed", "paid"];
    return allBookings.filter((booking) => {
      const room = booking.Room || booking.room || {};
      const isRoomClean = room.status === "Limpia";
      const inventoryItems = basicsByBooking[booking.bookingId] || [];
      const checkedItems = checkedBasics[booking.bookingId] || {};
      const allInventoryDelivered =
        inventoryItems.length > 0 &&
        inventoryItems.every((item) => checkedItems[item.id] === true);
      const requiredGuestCount = parseInt(booking.guestCount) || 1;
      const registeredCount = booking.registrationPasses?.length || 0;
      const allPassengersRegistered = registeredCount >= requiredGuestCount;
      const hasValidStatus =
        validStatuses.includes(booking.status) || !booking.status;
      return (
        hasValidStatus &&
        (!isRoomClean || !allInventoryDelivered || !allPassengersRegistered)
      );
    });
  }, [allBookings, basicsByBooking, checkedBasics]);

  // Cargar pasajeros de cada reserva al montar/comprobar bookings
  useEffect(() => {
    bookings.forEach((booking) => {
      if (!registrationsByBooking[booking.bookingId]) {
        dispatch(getRegistrationPassesByBooking(booking.bookingId));
      }
    });
  }, [bookings, dispatch, registrationsByBooking]);

  // Helpers
  const getRoomInfo = useCallback((booking) => {
    const room = booking.Room || booking.room || null;
    if (!room) {
      return {
        roomNumber: booking.roomNumber || "Sin asignar",
        type: "Desconocido",
        status: "Sin estado",
        maxGuests: 1,
        BasicInventories: [],
      };
    }
    return room;
  }, []);

  // Estado visual de pasajeros
  const getPassengersStatus = useCallback(
    (bookingId, requiredCount) => {
      const registered = registrationsByBooking[bookingId]?.length || 0;
      if (registered >= requiredCount) {
        return {
          status: "completed",
          icon: "✅",
          message: `Todos registrados (${registered}/${requiredCount})`,
          registeredCount: registered,
          requiredCount,
          isComplete: true,
        };
      }
      if (registered > 0) {
        return {
          status: "partial",
          icon: "⏳",
          message: `Faltan ocupantes (${registered}/${requiredCount})`,
          registeredCount: registered,
          requiredCount,
          isComplete: false,
        };
      }
      return {
        status: "pending",
        icon: "⏳",
        message: `Pendiente (${registered}/${requiredCount})`,
        registeredCount: registered,
        requiredCount,
        isComplete: false,
      };
    },
    [registrationsByBooking]
  );

  // Estado visual de habitación
  const getRoomStatusColor = (status) => {
    if (status === "Limpia")
      return "bg-green-100 text-green-700 border-green-200";
    if (status === "Ocupada")
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (status === "Sucia") return "bg-red-100 text-red-700 border-red-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Inventario: cargar básicos
  const handleLoadBasics = useCallback(
    (booking) => {
      const room = getRoomInfo(booking);
      const bookingId = booking.bookingId;
      const loadedBasics = room.BasicInventories || [];
      if (loadedBasics && loadedBasics.length > 0) {
        setCheckedBookings((prev) => ({ ...prev, [bookingId]: true }));
        setBasicsByBooking((prev) => ({
          ...prev,
          [bookingId]: loadedBasics.map((basic) => ({
            id: basic.id,
            name: basic.name,
            description: basic.description,
            quantity: basic.RoomBasics?.quantity || 0,
            currentStock: basic.currentStock,
          })),
        }));
        setCheckedBasics((prev) => ({
          ...prev,
          [bookingId]: loadedBasics.reduce((acc, basic) => {
            acc[basic.id] = false;
            return acc;
          }, {}),
        }));
        toast.success(`Inventario básico cargado para reserva ${bookingId}`);
      } else {
        toast.info(
          `No hay inventario básico configurado para la habitación ${room.roomNumber}`
        );
      }
    },
    [getRoomInfo]
  );

  // Inventario: marcar/unmarcar básico
  const handleCheckBasic = useCallback((bookingId, basicId) => {
    setCheckedBasics((prev) => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        [basicId]: !prev[bookingId]?.[basicId],
      },
    }));
  }, []);

  // Inventario: confirmar entrega
  const handleConfirmBasics = useCallback(
    async (bookingId) => {
      const checked = checkedBasics[bookingId];
      const bookingBasics = basicsByBooking[bookingId] || [];
      const basicsToRemove = bookingBasics.filter((item) => checked?.[item.id]);
      if (basicsToRemove.length === 0) {
        toast.warning(
          "Seleccione al menos un básico para confirmar la entrega."
        );
        return;
      }
      try {
        for (const basic of basicsToRemove) {
          const result = await dispatch(removeStock(basic.id, basic.quantity));
          if (result && result.error) {
            toast.error(`Error al descontar ${basic.name}: ${result.message}`);
            return;
          }
        }
        setCheckedBasics((prev) => ({
          ...prev,
          [bookingId]: Object.keys(prev[bookingId] || {}).reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {}),
        }));
        toast.success(
          `Inventario básico entregado para la reserva ${bookingId} exitosamente.`
        );
        // Refrescar reservas tras entregar inventario
        setTimeout(() => {
          dispatch(
            getAllBookings({
              fromDate: dateRange.from,
              toDate: dateRange.to,
            })
          );
        }, 1000);
      } catch (error) {
        toast.error("Error al confirmar la entrega de básicos.");
      }
    },
    [checkedBasics, basicsByBooking, dispatch, dateRange.from, dateRange.to]
  );

  // Marcar habitación como limpia
  const handlePreparation = useCallback(
    async (roomNumber, status) => {
      if (!roomNumber || roomNumber === "Sin asignar") return;
      try {
        await dispatch(updateRoomStatus(roomNumber, { status }));
        toast.success(`Habitación ${roomNumber} marcada como ${status}`);
        setTimeout(() => {
          dispatch(
            getAllBookings({
              fromDate: dateRange.from,
              toDate: dateRange.to,
            })
          );
        }, 1000);
      } catch (error) {
        toast.error("Error al actualizar el estado de la habitación");
      }
    },
    [dispatch, dateRange.from, dateRange.to]
  );

  // Registro de pasajeros: éxito
  const handlePassengerRegistrationSuccess = useCallback(
    async (bookingId, passengers) => {
      setSelectedBooking(null);
      toast.success(
        `✅ Check-in completado para reserva ${bookingId}. La reserva ahora aparece en la sección Check-Out.`,
        { autoClose: 5000 }
      );
      // Actualizar estado de reserva a checked-in
      await dispatch(updateBookingStatus(bookingId, { status: "checked-in" }));
      // Refrescar reservas y pasajeros
      setTimeout(async () => {
        await dispatch(
          getAllBookings({
            fromDate: dateRange.from,
            toDate: dateRange.to,
          })
        );
        await dispatch(getRegistrationPassesByBooking(bookingId));
      }, 1000);
    },
    [dispatch, dateRange.from, dateRange.to]
  );

  // Cerrar formulario de registro
  const handleCloseRegistration = useCallback(
    (bookingId) => {
      setSelectedBooking(null);
      const booking = bookings.find((b) => b.bookingId === bookingId);
      if (booking) {
        const room = getRoomInfo(booking);
        if (room.roomNumber && room.roomNumber !== "Sin asignar") {
          dispatch(updateRoomStatus(room.roomNumber, { status: "Ocupada" }));
        }
      }
    },
    [bookings, dispatch, getRoomInfo]
  );

  const handleDateChange = useCallback((e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Recargar pasajeros manualmente
  const reloadPassengersForBooking = useCallback(
    (bookingId) => {
      dispatch(getRegistrationPassesByBooking(bookingId));
    },
    [dispatch]
  );

  // Renders condicionales y UI
  if (isLoadingBookings) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">🔄 Cargando reservas para check-in...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (
    bookingError &&
    bookingError !==
      "No hay pasajeros registrados (normal para reservas nuevas)" &&
    bookingError !== "No hay pasajeros registrados"
  ) {
    return (
      <DashboardLayout>
        <div className="text-red-500 text-center p-4">❌ {bookingError}</div>
      </DashboardLayout>
    );
  }

  // Render cuando no hay reservas
  if (bookings.length === 0 && !isLoadingBookings) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              🏨 Check-In de Habitaciones
            </h2>
            <p className="text-gray-600">
              Gestiona el proceso de entrada de huéspedes y preparación de
              habitaciones
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
              <button
                onClick={() =>
                  dispatch(
                    getAllBookings({
                      fromDate: dateRange.from,
                      toDate: dateRange.to,
                    })
                  )
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>
          {/* Mensaje informativo */}
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {allBookings.length === 0
                ? "No hay reservas para estas fechas"
                : "No hay reservas pendientes de check-in"}
            </h3>
            <p className="text-gray-500 mb-6">
              {allBookings.length > 0
                ? `Hay ${allBookings.length} reserva(s) en otros estados. Las reservas con check-in completado aparecen en Check-Out.`
                : "Intenta cambiar el rango de fechas para ver más reservas"}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Render principal con reservas
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            🏨 Check-In de Habitaciones
          </h2>
          <p className="text-gray-600">
            Gestiona el proceso de entrada de huéspedes y preparación de
            habitaciones
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
            <button
              onClick={() =>
                dispatch(
                  getAllBookings({
                    fromDate: dateRange.from,
                    toDate: dateRange.to,
                  })
                )
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
        {/* Grid de reservas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {bookings.map((booking) => {
            const room = getRoomInfo(booking);
            const requiredGuestCount = parseInt(booking.guestCount) || 1;
            const passengersStatus = getPassengersStatus(
              booking.bookingId,
              requiredGuestCount
            );
            // Lógica de pagos
            const payments = booking.payments || [];
            const totalPagado = payments
              .filter((p) =>
                ["authorized", "completed", "paid"].includes(p.paymentStatus)
              )
              .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            const totalReserva = parseFloat(booking.totalAmount || 0);
            let estadoPago, pagoColor;
            if (totalPagado >= totalReserva) {
              estadoPago = "Pago completo";
              pagoColor = "bg-green-100 text-green-700";
            } else if (totalPagado > 0) {
              estadoPago = "Pago parcial";
              pagoColor = "bg-yellow-100 text-yellow-700";
            } else {
              estadoPago = "Sin pago";
              pagoColor = "bg-red-100 text-red-700";
            }
            // Estado de inventario
            const inventoryLoaded = checkedBookings[booking.bookingId];
            const inventoryItems = basicsByBooking[booking.bookingId] || [];
            const checkedItems = checkedBasics[booking.bookingId] || {};
            const allInventoryDelivered =
              inventoryItems.length > 0 &&
              inventoryItems.every((item) => checkedItems[item.id] === true);

            return (
              <div
                key={booking.bookingId}
                className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
              >
                {/* Header de reserva */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        🏨 Habitación #{room.roomNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Reserva #{booking.bookingId}
                      </p>
                      <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        🔄 {booking.status || "Pendiente"} → Check-in
                      </span>
                      {room.roomNumber === "Sin asignar" && (
                        <span className="block mt-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          ⚠️ Habitación no asignada
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoomStatusColor(
                        room.status
                      )}`}
                    >
                      {room.status}
                    </span>
                  </div>
                  {/* Información del huésped */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        👤 Huésped:
                      </span>
                      <span className="text-sm text-gray-800 font-medium">
                        {booking.guest?.scostumername || "Sin información"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        📅 Check-in:
                      </span>
                      <span className="text-sm text-gray-800">
                        {dayjs(booking.checkIn).format("DD/MM/YYYY")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        👥 Huéspedes:
                      </span>
                      <span className="text-sm text-gray-800">
                        {booking.guestCount || 1}
                      </span>
                    </div>
                  </div>
                  {Array.isArray(booking.registrationPasses) &&
                    booking.registrationPasses.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          👥 Pasajeros registrados (
                          {booking.registrationPasses.length})
                        </h4>
                        <ul className="space-y-1">
                          {booking.registrationPasses.map((pass, idx) => (
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
                  {/* Estado de pasajeros */}
                  <div className="mt-3">
                    <span
                      className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
                        passengersStatus.status === "completed"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : passengersStatus.status === "partial"
                          ? "bg-orange-100 text-orange-700 border border-orange-200"
                          : passengersStatus.status === "pending"
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                          : passengersStatus.status === "loading"
                          ? "bg-blue-100 text-blue-700 border border-blue-200 animate-pulse"
                          : "bg-red-100 text-red-700 border-red-200"
                      }`}
                    >
                      {passengersStatus.icon} {passengersStatus.message}
                    </span>
                  </div>
                </div>
                {/* Estado de pago */}
                <div className="px-6 py-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      💳 Estado de pago:
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${pagoColor}`}
                    >
                      {estadoPago}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">
                      ${totalPagado.toLocaleString()} / $
                      {totalReserva.toLocaleString()}
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
                            <li
                              key={p.paymentId}
                              className="flex justify-between"
                            >
                              <span>
                                {p.paymentType === "full"
                                  ? "Completo"
                                  : "Parcial"}
                              </span>
                              <span>
                                ${parseFloat(p.amount || 0).toLocaleString()} (
                                {p.paymentMethod})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
                {/* Inventario básico */}
                <div className="px-6 py-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    📦 Inventario básico
                  </h4>
                  <div className="space-y-2 mb-4">
                    {inventoryLoaded ? (
                      inventoryItems.length > 0 ? (
                        inventoryItems.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checkedItems[item.id] || false}
                              onChange={() =>
                                handleCheckBasic(booking.bookingId, item.id)
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {item.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-auto">
                              Qty: {item.quantity}
                            </span>
                          </label>
                        ))
                      ) : (
                        <div className="p-2 text-gray-500 text-sm">
                          No hay inventario básico configurado para esta
                          habitación
                        </div>
                      )
                    ) : (
                      (room.BasicInventories || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2"
                        >
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <span className="text-sm text-gray-700">
                            {item.name}
                          </span>
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
                        inventoryLoaded
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : "bg-yellow-500 text-white hover:bg-yellow-600"
                      }`}
                      onClick={() => handleLoadBasics(booking)}
                      disabled={inventoryLoaded}
                    >
                      {inventoryLoaded ? "✅ Verificados" : "🔍 Verificar"}
                    </button>
                    {inventoryLoaded && inventoryItems.length > 0 && (
                      <button
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          allInventoryDelivered
                            ? "bg-green-500 text-white cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        onClick={() => handleConfirmBasics(booking.bookingId)}
                        disabled={allInventoryDelivered}
                      >
                        {allInventoryDelivered ? "✅ Entregado" : "📤 Entregar"}
                      </button>
                    )}
                  </div>
                  {inventoryLoaded && (
                    <div
                      className={`mt-2 p-2 rounded-md ${
                        allInventoryDelivered
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      <p className="text-sm flex items-center gap-2">
                        {allInventoryDelivered
                          ? "✅ Inventario entregado completamente"
                          : "⚠️ Selecciona los elementos a entregar"}
                      </p>
                    </div>
                  )}
                </div>
                {/* Progreso visual */}
                <div className="px-6 py-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">
                    📋 Progreso del Check-in
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            inventoryLoaded ? "bg-green-500" : "bg-gray-300"
                          }`}
                        ></div>
                        <span className="text-xs text-gray-600">
                          Inventario verificado
                        </span>
                      </div>
                      {inventoryLoaded && (
                        <span className="text-xs text-green-600">✓</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            allInventoryDelivered
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></div>
                        <span className="text-xs text-gray-600">
                          Inventario entregado
                        </span>
                      </div>
                      {allInventoryDelivered && (
                        <span className="text-xs text-green-600">✓</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            room.status === "Limpia"
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        ></div>
                        <span className="text-xs text-gray-600">
                          Habitación limpia
                        </span>
                      </div>
                      {room.status === "Limpia" && (
                        <span className="text-xs text-green-600">✓</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            passengersStatus.isComplete
                              ? "bg-green-500"
                              : passengersStatus.registeredCount > 0
                              ? "bg-orange-500"
                              : "bg-gray-300"
                          }`}
                        ></div>
                        <span className="text-xs text-gray-600">
                          Todos los ocupantes registrados
                        </span>
                      </div>
                      <span className="text-xs font-mono text-gray-500">
                        {passengersStatus.registeredCount}/
                        {passengersStatus.requiredCount}
                        {passengersStatus.isComplete && (
                          <span className="text-green-600 ml-1">✓</span>
                        )}
                      </span>
                    </div>
                    {/* Estado general */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Estado general:
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            passengersStatus.isComplete &&
                            room.status === "Limpia" &&
                            allInventoryDelivered
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {passengersStatus.isComplete &&
                          room.status === "Limpia" &&
                          allInventoryDelivered
                            ? "✅ Listo para ocupar"
                            : "⏳ En progreso"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Botones de acción */}
                <div className="p-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 gap-3">
                    {/* Botón de limpiar habitación */}
                    <button
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        room.status === "Limpia"
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : room.roomNumber === "Sin asignar"
                          ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5"
                      }`}
                      disabled={
                        room.status === "Limpia" ||
                        room.roomNumber === "Sin asignar"
                      }
                      onClick={() =>
                        handlePreparation(room.roomNumber, "Limpia")
                      }
                    >
                      {room.roomNumber === "Sin asignar"
                        ? "🚫 Habitación no asignada"
                        : room.status === "Limpia"
                        ? "✅ Habitación limpia"
                        : "🧹 Marcar como limpia"}
                    </button>
                    {/* Botón de registrar ocupantes */}
                    <button
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        passengersStatus.isComplete
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : passengersStatus.status === "loading"
                          ? "bg-blue-400 text-white cursor-not-allowed animate-pulse"
                          : room.status === "Limpia"
                          ? "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md transform hover:-translate-y-0.5"
                          : "bg-gray-400 text-gray-700 cursor-not-allowed"
                      }`}
                      disabled={
                        passengersStatus.isComplete ||
                        passengersStatus.status === "loading" ||
                        room.status !== "Limpia"
                      }
                      onClick={() =>
                        setSelectedBooking(
                          selectedBooking === booking.bookingId
                            ? null
                            : booking.bookingId
                        )
                      }
                    >
                      {passengersStatus.isComplete
                        ? `✅ Todos registrados (${passengersStatus.registeredCount}/${passengersStatus.requiredCount})`
                        : passengersStatus.status === "loading"
                        ? "🔄 Verificando pasajeros..."
                        : room.status === "Limpia"
                        ? `👥 Registrar ocupantes (${passengersStatus.registeredCount}/${passengersStatus.requiredCount})`
                        : "🔒 Limpiar habitación primero"}
                    </button>
                    {/* Botón para completar check-in */}
                    {passengersStatus.isComplete &&
                      room.status === "Limpia" &&
                      allInventoryDelivered && (
                        <button
                          className="w-full px-4 py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-all duration-200"
                          onClick={async () => {
                            try {
                              const result = await dispatch(
                                updateBookingStatus(booking.bookingId, {
                                  status: "checked-in",
                                })
                              );
                              if (result && !result.error) {
                                if (room.roomNumber !== "Sin asignar") {
                                  dispatch(
                                    updateRoomStatus(room.roomNumber, {
                                      status: "Ocupada",
                                    })
                                  );
                                }
                                toast.success(
                                  `✅ Check-in completado para reserva ${booking.bookingId}`
                                );
                                setTimeout(() => {
                                  dispatch(
                                    getAllBookings({
                                      fromDate: dateRange.from,
                                      toDate: dateRange.to,
                                    })
                                  );
                                }, 1000);
                              } else {
                                toast.error("Error al completar el check-in");
                              }
                            } catch (error) {
                              toast.error("Error al completar el check-in");
                            }
                          }}
                        >
                          🎉 COMPLETAR CHECK-IN
                        </button>
                      )}
                    {/* Mensaje de requisitos faltantes */}
                    {(!passengersStatus.isComplete ||
                      room.status !== "Limpia" ||
                      !allInventoryDelivered) && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 font-medium mb-2">
                          ⚠️ Requisitos pendientes:
                        </p>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          {room.status !== "Limpia" && (
                            <li>• Habitación debe estar limpia</li>
                          )}
                          {!allInventoryDelivered &&
                            inventoryItems.length > 0 && (
                              <li>• Inventario básico debe estar entregado</li>
                            )}
                          {!passengersStatus.isComplete && (
                            <li>
                              • Todos los ocupantes deben estar registrados (
                              {passengersStatus.registeredCount}/
                              {passengersStatus.requiredCount})
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {/* Botón de recarga manual */}
                    {passengersStatus.status === "error" && (
                      <button
                        className="w-full px-3 py-2 rounded text-sm text-blue-600 hover:bg-blue-50 border border-blue-200"
                        onClick={() =>
                          reloadPassengersForBooking(booking.bookingId)
                        }
                      >
                        🔄 Reintentar carga de pasajeros
                      </button>
                    )}
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700 text-center">
                    💡 Una vez completado el check-in, esta reserva aparecerá en
                    la sección Check-Out
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
                        existingPassengers={
                          registrationsByBooking[booking.bookingId] || []
                        }
                        guestCount={booking.guestCount || 1}
                        booking={booking}
                        onSuccess={(passengers) =>
                          handlePassengerRegistrationSuccess(
                            booking.bookingId,
                            passengers
                          )
                        }
                        onClose={() =>
                          handleCloseRegistration(booking.bookingId)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CheckIn;
