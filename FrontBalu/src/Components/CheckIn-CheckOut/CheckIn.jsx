/* eslint-disable react/prop-types */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  getAllBookings,
  // ⭐ Inventario se maneja automáticamente en backend
  updatePassengersStatus,
  checkAllCheckInRequirements,
  checkIn,
} from "../../Redux/Actions/bookingActions";
import CancellationManager from '../Booking/CancellationManager';
import { updateRoomStatus } from "../../Redux/Actions/roomActions";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { getRegistrationPassesByBooking } from "../../Redux/Actions/registerActions";
// ⭐ Inventario se descuenta automáticamente en check-in (backend)
import Registration from "../Dashboard/Registration";
import dayjs from "dayjs";
import { toast } from "react-toastify";

// ⭐ COMPONENTE MODAL
const Modal = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <span className="text-2xl text-gray-500">×</span>
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const CheckIn = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // ⭐ Hook para navegación
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

  const [showPassengerModal, setShowPassengerModal] = useState(null); // ⭐ Modal para registro de pasajeros
  const [dateRange, setDateRange] = useState({
    from: dayjs().format("YYYY-MM-DD"), // ⭐ Ambas del día actual
    to: dayjs().format("YYYY-MM-DD"),   // ⭐ Ambas del día actual
  });

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
    
    return allBookings.filter((booking) => {
      // ⭐ EXCLUIR: Reservas que ya hicieron check-in
      if (booking.status === "checked-in") {
        console.log(`❌ [CHECK-IN] Excluir #${booking.bookingId} - ya hizo check-in (debe ir a CheckOut)`);
        return false;
      }

      // ⭐ EXCLUIR: Reservas completadas
      if (booking.status === "completed") {
        console.log(`❌ [CHECK-IN] Excluir #${booking.bookingId} - ya completada (debe ir a CompletedBookings)`);
        return false;
      }

      // ⭐ EXCLUIR: Reservas canceladas
      if (booking.status === "cancelled") {
        console.log(`❌ [CHECK-IN] Excluir #${booking.bookingId} - cancelada`);
        return false;
      }

      // ⭐ SOLO INCLUIR: pending, confirmed, paid
      const validStatuses = ["pending", "confirmed", "paid"];
      if (!validStatuses.includes(booking.status)) {
        return false;
      }

      // ⭐ VERIFICAR REQUISITOS DE CHECK-IN
      const isInventoryVerified = booking.inventoryVerified === true;
      const isInventoryDelivered = booking.inventoryDelivered === true;
      const isPassengersCompleted = booking.passengersCompleted === true;

      // ⭐ SIEMPRE MOSTRAR reservas con status válido (pending, confirmed, paid)
      // Estas son las que están en proceso de check-in
      console.log(`✅ [CHECK-IN] Incluir #${booking.bookingId} - ${booking.status}`, {
        inventoryVerified: isInventoryVerified,
        inventoryDelivered: isInventoryDelivered,
        passengersCompleted: isPassengersCompleted
      });
      return true;
    });
  }, [allBookings]);

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

  // Estado visual de habitación
  const getRoomStatusColor = (status) => {
    if (!status || status === "Disponible")
      return "bg-green-100 text-green-700 border-green-200";
    if (status === "Ocupada")
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (status === "Mantenimiento") 
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (status === "Reservada") 
      return "bg-purple-100 text-purple-700 border-purple-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  // ⭐ CARGAR INVENTARIO BÁSICO (SOLO INFO - Sin checkboxes)
  const handleLoadBasics = useCallback(
    async (booking) => {
      try {
        console.log(
          `📦 [LOAD-BASICS] Mostrando info de inventario para reserva: ${booking.bookingId}`
        );

        const room = getRoomInfo(booking);
        const loadedBasics = room.BasicInventories || [];

        if (loadedBasics && loadedBasics.length > 0) {
          const itemsList = loadedBasics.map((basic) => 
            `${basic.name} (${basic.RoomBasics?.quantity || 0})`
          ).join(", ");
          
          toast.info(
            `📦 Inventario: ${itemsList}. Se descontará automáticamente en check-in.`,
            { duration: 5000 }
          );
        } else {
          toast.info(
            `ℹ️ No hay inventario básico configurado para habitación ${room.roomNumber}`
          );
        }
      } catch (error) {
        console.error("❌ [LOAD-BASICS] Error:", error);
        toast.error(
          `Error al cargar inventario: ${error.message || "Desconocido"}`
        );
      }
    },
    [getRoomInfo]
  );

  // ⭐ FUNCIONES DE CHECKBOX ELIMINADAS - Inventario se descuenta automáticamente en check-in

  // Registro de pasajeros: éxito
  // Registro de pasajeros: éxito
  // ⭐ REGISTRO DE PASAJEROS: ÉXITO - MEJORADO
  const handlePassengerRegistrationSuccess = useCallback(
    async (bookingId, passengers) => {
      try {
        console.log(
          `👥 [PASSENGERS-SUCCESS] Completando registro para reserva: ${bookingId}`,
          passengers
        );

        // ⭐ ACTUALIZAR EL BACKEND CON LA ACTION MEJORADA
        const result = await dispatch(
          updatePassengersStatus(bookingId, {
            passengersCompleted: true,
            passengersCompletedAt: new Date().toISOString(),
            numberOfPassengers: passengers?.length || 1,
            passengersData: passengers,
          })
        );

        if (result.success) {
          console.log(
            "✅ [PASSENGERS-SUCCESS] Pasajeros completados en backend"
          );

          // ⭐ REFRESCAR DATOS PARA SINCRONIZAR
          await Promise.all([
            dispatch(
              getAllBookings({
                fromDate: dateRange.from,
                toDate: dateRange.to,
              })
            ),
            dispatch(getRegistrationPassesByBooking(bookingId)),
          ]);

          toast.success(
            `👥✅ Pasajeros registrados para reserva ${bookingId}.`,
            { autoClose: 3000 }
          );

          // ⭐ NAVEGAR AL LISTADO DE PASAJEROS PARA DESCARGAR PDF
          setTimeout(() => {
            navigate(`/admin/PassengerList/${bookingId}`);
          }, 1500);
        } else {
          console.error(
            "❌ [PASSENGERS-SUCCESS] Error al actualizar backend:",
            result.error
          );
          toast.error(`Error al completar registro: ${result.error}`);
        }
      } catch (error) {
        console.error("❌ [PASSENGERS-SUCCESS] Error:", error);
        toast.error(
          `Error al completar registro de pasajeros: ${
            error.message || "Desconocido"
          }`
        );
      }
    },
    [dispatch, dateRange, navigate]
  );

  // ⭐ NUEVA: VERIFICAR REQUISITOS DE CHECK-IN
  const handleCheckRequirements = useCallback(
    async (booking) => {
      try {
        console.log(
          `✅ [CHECK-REQUIREMENTS] Verificando requisitos para reserva: ${booking.bookingId}`
        );

        // ⭐ USAR LA ACTION OPTIMIZADA PASANDO LOS DATOS DE LA RESERVA
        const result = await dispatch(
          checkAllCheckInRequirements(booking.bookingId, booking)
        );

        if (result.success) {
          console.log(
            "📊 [CHECK-REQUIREMENTS] Análisis completo:",
            result.data
          );

          // ⭐ MOSTRAR INFORMACIÓN ÚTIL AL USUARIO
          if (result.allRequirementsMet) {
            toast.success(
              "🎉 ¡Todos los requisitos están completos! Listo para check-in."
            );
          } else {
            const nextStepsText =
              result.data?.nextSteps?.join(", ") ||
              "Completar requisitos pendientes";
            toast.info(`📋 Próximos pasos: ${nextStepsText}`);
          }

          return result;
        } else {
          console.error("❌ [CHECK-REQUIREMENTS] Error:", result.error);
          toast.error(`Error al verificar requisitos: ${result.error}`);
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error("❌ [CHECK-REQUIREMENTS] Error:", error);
        toast.error(
          `Error al verificar requisitos: ${error.message || "Desconocido"}`
        );
        return { success: false, error: error.message };
      }
    },
    [dispatch]
  );

  // ⭐ COMPLETAR CHECK-IN - COMPLETAMENTE MEJORADO
  const handleCompleteCheckIn = useCallback(
    async (bookingId, roomNumber) => {
      try {
        console.log(
          `🏨 [COMPLETE-CHECKIN] Iniciando check-in completo para reserva: ${bookingId}`
        );

        // ⭐ PASO 1: VERIFICAR TODOS LOS REQUISITOS
        const booking = bookings.find((b) => b.bookingId === bookingId);
        if (!booking) {
          throw new Error("Reserva no encontrada");
        }

        const requirementsCheck = await handleCheckRequirements(booking);
        if (
          !requirementsCheck.success ||
          !requirementsCheck.allRequirementsMet
        ) {
          const missingSteps =
            requirementsCheck.data?.pendingSteps?.join(", ") ||
            "Requisitos no cumplidos";
          throw new Error(
            `No se puede completar el check-in. Faltan: ${missingSteps}`
          );
        }

        // ⭐ PASO 2: USAR LA ACTION MEJORADA DE CHECK-IN
        const checkInResult = await dispatch(
          checkIn(bookingId, {
            actualCheckIn: new Date().toISOString(),
            checkInProgress: false,
            completedBy: user?.n_document || "staff",
            completedAt: new Date().toISOString(),
          })
        );

        if (checkInResult.success) {
          console.log("✅ [COMPLETE-CHECKIN] Check-in completado en backend");

          // ⭐ PASO 3: ACTUALIZAR HABITACIÓN SI ES NECESARIO
          if (roomNumber && roomNumber !== "Sin asignar") {
            const roomResult = await dispatch(
              updateRoomStatus(roomNumber, {
                status: "Ocupada",
                available: false,
              })
            );

            if (roomResult?.success) {
              console.log(
                `🏨 [COMPLETE-CHECKIN] Habitación ${roomNumber} marcada como ocupada`
              );
            }
          }

          // ⭐ PASO 4: REFRESCAR DATOS
          await dispatch(
            getAllBookings({
              fromDate: dateRange.from,
              toDate: dateRange.to,
            })
          );

          toast.success(
            `🎉 Check-in completado exitosamente para reserva ${bookingId}`
          );

          return { success: true };
        } else {
          throw new Error(
            checkInResult.error || "Error al completar el check-in"
          );
        }
      } catch (error) {
        console.error("❌ [COMPLETE-CHECKIN] Error:", error);
        toast.error(
          `❌ Error al completar check-in: ${error.message || "Desconocido"}`
        );
        return { success: false, error: error.message };
      }
    },
    [dispatch, dateRange, bookings, handleCheckRequirements, user]
  );

  // ⭐ NUEVA: OBTENER ESTADO INTELIGENTE DE REQUISITOS
  // ⭐ VALIDAR REQUISITOS DE CHECK-IN (SIMPLIFICADO)
  const getBookingRequirementsStatus = useCallback(
    (booking) => {
      // ⭐ SOLO VALIDAR PASAJEROS - Inventario se maneja automáticamente
      const requirements = {
        passengersCompleted: {
          completed: booking.passengersCompleted === true,
          name: "Pasajeros registrados",
          icon: booking.passengersCompleted === true ? "✅" : "👥",
        },
      };

      const completedRequirements = Object.values(requirements).filter(
        (req) => req.completed
      );
      const allRequirementsMet =
        completedRequirements.length === Object.keys(requirements).length;
      const progressPercentage = Math.round(
        (completedRequirements.length / Object.keys(requirements).length) * 100
      );

      return {
        requirements,
        allRequirementsMet,
        completedCount: completedRequirements.length,
        totalCount: Object.keys(requirements).length,
        progressPercentage,
        canCompleteCheckIn: allRequirementsMet,
      };
    },
    []
  );

  const handleDateChange = useCallback((e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  }, []);

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

        {/* ⭐ AGREGAR USEEFFECT DE DEBUG */}
        {import.meta.env.DEV && (
          <div className="bg-gray-100 p-4 rounded-lg mb-6 text-xs">
            <h4 className="font-bold mb-2">🔍 Debug Info:</h4>
            <p>Total reservas obtenidas: {allBookings.length}</p>
            <p>Reservas filtradas para check-in: {bookings.length}</p>
            <details className="mt-2">
              <summary className="cursor-pointer">
                Ver detalles de filtrado
              </summary>
              <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(
                  allBookings.map((b) => ({
                    id: b.bookingId,
                    status: b.status,
                    inventoryVerified: b.inventoryVerified,
                    inventoryDelivered: b.inventoryDelivered,
                    passengersCompleted: b.passengersCompleted,
                    roomStatus: b.room?.status || b.Room?.status,
                  })),
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        )}

        {/* Grid de reservas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {bookings.map((booking) => {
            const room = getRoomInfo(booking);
            const requiredGuestCount = parseInt(booking.guestCount) || 1;

            // ⭐ USAR FUNCIÓN MEJORADA PARA OBTENER ESTADO
            const requirementsStatus = getBookingRequirementsStatus(booking);

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

            // ⭐ Inventario básico de la habitación
            const inventoryItems = room.BasicInventories || [];

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
                        🔄 {booking.status === 'confirmed' ? 'confirmada' : booking.status || "Pendiente"} → Check-in
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

                  {/* ⭐ MOSTRAR PASAJEROS REGISTRADOS DESDE BACKEND */}
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
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* ⭐ ESTADO DE PASAJEROS BASADO EN BACKEND */}
                  <div className="mt-3">
                    <span
                      className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
                        booking.passengersCompleted === true
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : (booking.registrationPasses?.length || 0) > 0
                          ? "bg-orange-100 text-orange-700 border border-orange-200"
                          : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                      }`}
                    >
                      {booking.passengersCompleted === true
                        ? "✅ Pasajeros completados"
                        : (booking.registrationPasses?.length || 0) > 0
                        ? `⏳ Parcialmente registrados (${
                            booking.registrationPasses?.length || 0
                          }/${requiredGuestCount})`
                        : "⏳ Pendiente registro"}
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

                {/* ⭐ INVENTARIO BÁSICO - SIMPLIFICADO (Sin checkboxes) */}
                <div className="px-6 py-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    📦 Inventario básico
                  </h4>

                  {/* Info automática */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                      ℹ️ Se descontará automáticamente al completar check-in
                    </p>
                  </div>

                  {/* Lista de items */}
                  {inventoryItems.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {inventoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 rounded-md bg-gray-50"
                        >
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">
                            {item.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-auto">
                            Cantidad: {item.RoomBasics?.quantity || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-gray-500 text-sm bg-gray-50 rounded-md mb-4">
                      ℹ️ No hay inventario básico configurado
                    </div>
                  )}

                  {/* Botón para cargar/ver inventario */}
                  <button
                    className="w-full px-3 py-2 rounded-md text-sm font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                    onClick={() => handleLoadBasics(booking)}
                  >
                    🔍 Ver inventario básico
                  </button>
                </div>

                {/* ⭐ PROGRESO VISUAL - USANDO requirementsStatus */}
                <div className="px-6 py-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">
                    📋 Progreso del Check-in
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(requirementsStatus.requirements).map(
                      ([key, requirement]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                requirement.completed
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                            <span className="text-xs text-gray-600">
                              {requirement.name}
                            </span>
                          </div>
                          {requirement.completed && (
                            <span className="text-xs text-green-600">✓</span>
                          )}
                        </div>
                      )
                    )}

                    {/* Estado general */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Estado general:
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            requirementsStatus.allRequirementsMet
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {requirementsStatus.allRequirementsMet
                            ? "✅ Listo para check-in"
                            : `⏳ ${requirementsStatus.progressPercentage}% completado`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ⭐ BOTONES DE ACCIÓN - ACTUALIZADOS */}
                <div className="p-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 gap-3">
                    {/* Botón de registrar ocupantes */}
                    <button
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        requirementsStatus.requirements.passengersCompleted
                          .completed
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md transform hover:-translate-y-0.5"
                      }`}
                      disabled={
                        requirementsStatus.requirements.passengersCompleted
                          .completed
                      }
                      onClick={() => setShowPassengerModal(booking.bookingId)}
                    >
                      {requirementsStatus.requirements.passengersCompleted
                        .completed
                        ? "✅ Todos registrados"
                        : `👥 Registrar ocupantes (${
                            booking.registrationPasses?.length || 0
                          }/${requiredGuestCount})`}
                    </button>

                    {/* ✅ Botón de cancelación - Solo para owners */}
                    {user?.role === 'owner' ? (
                      <CancellationManager
                        booking={booking}
                        onCancel={(cancelledBooking) => {
                          console.log('Reserva cancelada:', cancelledBooking);
                          // Refrescar la lista de reservas
                          dispatch(getAllBookings({
                            fromDate: dateRange.from,
                            toDate: dateRange.to,
                          }));
                        }}
                      />
                    ) : (
                      <div className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center gap-2">
                        🔒 Solo el propietario puede cancelar reservas
                      </div>
                    )}

                    {/* ⭐ BOTÓN PARA COMPLETAR CHECK-IN - USANDO FUNCIÓN MEJORADA */}
                    {requirementsStatus.allRequirementsMet && (
                      <button
                        className="w-full px-4 py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-all duration-200"
                        onClick={() =>
                          handleCompleteCheckIn(
                            booking.bookingId,
                            room.roomNumber
                          )
                        }
                      >
                        🎉 COMPLETAR CHECK-IN
                      </button>
                    )}

                    {requirementsStatus.requirements.passengersCompleted
                      .completed && (
                      <div className="mt-3 flex justify-center">
                        <Link
                          to={`/admin/PassengerList/${booking.bookingId}`}
                          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          👀 Ver pasajeros de la reserva
                        </Link>
                      </div>
                    )}

                    {/* ⭐ MENSAJE DE REQUISITOS FALTANTES - ACTUALIZADO */}
                    {!requirementsStatus.allRequirementsMet && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 font-medium mb-2">
                          ⚠️ Requisitos pendientes:
                        </p>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          {Object.entries(requirementsStatus.requirements)
                            .filter(([, req]) => !req.completed)
                            .map(([key, req]) => (
                              <li key={key}>• {req.name}</li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700 text-center">
                    💡 Una vez completado el check-in, esta reserva aparecerá en
                    la sección Check-Out
                  </div>
                </div>

                {/* ⭐ MODAL de registro de ocupantes */}
                <Modal
                  isOpen={showPassengerModal === booking.bookingId}
                  onClose={() => setShowPassengerModal(null)}
                  title={`👥 Registro de Ocupantes - Reserva #${booking.bookingId}`}
                >
                  <Registration
                    bookingId={booking.bookingId}
                    existingPassengers={
                      registrationsByBooking[booking.bookingId] || []
                    }
                    guestCount={booking.guestCount || 1}
                    booking={booking}
                    onSuccess={(passengers) => {
                      handlePassengerRegistrationSuccess(
                        booking.bookingId,
                        passengers
                      );
                      setShowPassengerModal(null); // Cerrar modal
                    }}
                    onClose={() => setShowPassengerModal(null)}
                  />
                </Modal>
              </div>
            );
          })}
        </div>

        {/* ⭐ MENSAJE CUANDO NO HAY RESERVAS */}
        {bookings.length === 0 && !isLoadingBookings && (
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
        )}
      </div>
    </DashboardLayout>
  );
};
export default CheckIn;
