/* eslint-disable react/prop-types */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  getAllBookings,
  // ⭐ NUEVAS IMPORTACIONES OPTIMIZADAS
  updateInventoryStatus,
  updatePassengersStatus,
  checkAllCheckInRequirements,
  checkIn,
} from "../../Redux/Actions/bookingActions";
import CancellationManager from '../Booking/CancellationManager';
import { updateRoomStatus } from "../../Redux/Actions/roomActions";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { getRegistrationPassesByBooking } from "../../Redux/Actions/registerActions";
import { removeStock } from "../../Redux/Actions/inventoryActions";
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

  // Estados de inventario básico
  const [, setCheckedBookings] = useState({});
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
      const isRoomClean =
        (booking.room?.status || booking.Room?.status) === "Limpia";
      const isInventoryVerified = booking.inventoryVerified === true;
      const isInventoryDelivered = booking.inventoryDelivered === true;
      const isPassengersCompleted = booking.passengersCompleted === true;

      // ⭐ SIEMPRE MOSTRAR reservas con status válido (pending, confirmed, paid)
      // Estas son las que están en proceso de check-in
      console.log(`✅ [CHECK-IN] Incluir #${booking.bookingId} - ${booking.status}`, {
        roomClean: isRoomClean,
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
    if (status === "Limpia")
      return "bg-green-100 text-green-700 border-green-200";
    if (status === "Ocupada")
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (status === "Sucia") return "bg-red-100 text-red-700 border-red-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Inventario: cargar básicos
  // Inventario: cargar básicos
  const handleLoadBasics = useCallback(
    async (booking) => {
      try {
        console.log(
          `📦 [LOAD-BASICS] Iniciando verificación para reserva: ${booking.bookingId}`
        );

        const room = getRoomInfo(booking);
        const bookingId = booking.bookingId;
        const loadedBasics = room.BasicInventories || [];

        if (loadedBasics && loadedBasics.length > 0) {
          // ⭐ ACTUALIZAR ESTADO LOCAL PRIMERO
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

          // ⭐ ACTUALIZAR EL BACKEND CON LA ACTION MEJORADA
          const result = await dispatch(
            updateInventoryStatus(bookingId, {
              inventoryVerified: true,
              inventoryVerifiedAt: new Date().toISOString(),
            })
          );

          if (result.success) {
            console.log("✅ [LOAD-BASICS] Inventario verificado en backend");

            // ⭐ REFRESCAR DATOS PARA SINCRONIZAR
            await dispatch(
              getAllBookings({
                fromDate: dateRange.from,
                toDate: dateRange.to,
              })
            );

            toast.success(
              `📦✅ Inventario básico verificado para reserva ${bookingId}`
            );
          } else {
            console.error(
              "❌ [LOAD-BASICS] Error al actualizar backend:",
              result.error
            );
            toast.error(`Error al verificar inventario: ${result.error}`);

            // ⭐ REVERTIR ESTADO LOCAL SI FALLA EL BACKEND
            setCheckedBookings((prev) => ({ ...prev, [bookingId]: false }));
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
          }
        } else {
          toast.info(
            `ℹ️ No hay inventario básico configurado para la habitación ${room.roomNumber}`
          );
        }
      } catch (error) {
        console.error("❌ [LOAD-BASICS] Error:", error);
        toast.error(
          `Error al cargar inventario: ${error.message || "Desconocido"}`
        );
      }
    },
    [getRoomInfo, dispatch, dateRange]
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
  // ⭐ INVENTARIO: CONFIRMAR ENTREGA - MEJORADO
  const handleConfirmBasics = useCallback(
    async (bookingId) => {
      try {
        console.log(
          `📤 [CONFIRM-BASICS] Iniciando entrega para reserva: ${bookingId}`
        );

        const checked = checkedBasics[bookingId];
        const bookingBasics = basicsByBooking[bookingId] || [];
        const basicsToRemove = bookingBasics.filter(
          (item) => checked?.[item.id]
        );

        if (basicsToRemove.length === 0) {
          toast.warning(
            "⚠️ Seleccione al menos un básico para confirmar la entrega."
          );
          return;
        }

        // ⭐ PROCESAR DESCUENTO DE STOCK
        for (const basic of basicsToRemove) {
          const result = await dispatch(removeStock(basic.id, basic.quantity));
          if (result && result.error) {
            toast.error(
              `❌ Error al descontar ${basic.name}: ${result.message}`
            );
            return;
          }
        }

        // ⭐ ACTUALIZAR ESTADO LOCAL
        setCheckedBasics((prev) => ({
          ...prev,
          [bookingId]: Object.keys(prev[bookingId] || {}).reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {}),
        }));

        // ⭐ ACTUALIZAR EL BACKEND CON LA ACTION MEJORADA
        const result = await dispatch(
          updateInventoryStatus(bookingId, {
            inventoryDelivered: true,
            inventoryDeliveredAt: new Date().toISOString(),
            inventoryDeliveredBy: user?.n_document || "staff",
          })
        );

        if (result.success) {
          console.log("✅ [CONFIRM-BASICS] Inventario entregado en backend");

          // ⭐ REFRESCAR RESERVAS
          await dispatch(
            getAllBookings({
              fromDate: dateRange.from,
              toDate: dateRange.to,
            })
          );

          toast.success(
            `📤✅ Inventario básico entregado para la reserva ${bookingId} exitosamente.`
          );
        } else {
          console.error(
            "❌ [CONFIRM-BASICS] Error al actualizar backend:",
            result.error
          );
          toast.error(`Error al confirmar entrega: ${result.error}`);
        }
      } catch (_error) {
        console.error("❌ [CONFIRM-BASICS] Error:", _error);
        toast.error(
          `Error al confirmar la entrega de básicos: ${
            _error.message || "Desconocido"
          }`
        );
      }
    },
    [checkedBasics, basicsByBooking, dispatch, dateRange, user]
  );
  // Marcar habitación como limpia
  const handlePreparation = useCallback(
    async (roomNumber, status) => {
      if (!roomNumber || roomNumber === "Sin asignar") return;
      try {
        const result = await dispatch(updateRoomStatus(roomNumber, { status }));
        
        // ⭐ Verificar si el resultado fue exitoso
        if (result && result.success) {
          toast.success(`Habitación ${roomNumber} marcada como lista para ocupar`);
          setTimeout(() => {
            dispatch(
              getAllBookings({
                fromDate: dateRange.from,
                toDate: dateRange.to,
              })
            );
          }, 1000);
        } else if (result && result.status === 403) {
          // ⭐ Error de permisos
          toast.error("No tienes permisos para realizar esta acción. Contacta al administrador.");
        } else {
          toast.error(result?.error || "Error al actualizar el estado de la habitación");
        }
      } catch (error) {
        console.error("Error en handlePreparation:", error);
        toast.error("Error al actualizar el estado de la habitación");
      }
    },
    [dispatch, dateRange.from, dateRange.to]
  );

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
  const getBookingRequirementsStatus = useCallback(
    (booking) => {
      const room = getRoomInfo(booking);

      // ⭐ USAR DATOS DEL BACKEND EN LUGAR DE ESTADOS LOCALES
      const requirements = {
        roomClean: {
          completed: room.status === "Limpia",
          name: "Habitación limpia",
          icon: room.status === "Limpia" ? "✅" : "🧹",
        },
        inventoryVerified: {
          completed: booking.inventoryVerified === true,
          name: "Inventario verificado",
          icon: booking.inventoryVerified === true ? "✅" : "📦",
        },
        inventoryDelivered: {
          completed: booking.inventoryDelivered === true,
          name: "Inventario entregado",
          icon: booking.inventoryDelivered === true ? "✅" : "📤",
        },
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
    [getRoomInfo]
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

            // ⭐ USAR DATOS DEL BACKEND PARA INVENTARIO
            const inventoryLoaded = booking.inventoryVerified === true;
            const inventoryDelivered = booking.inventoryDelivered === true;
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

                {/* ⭐ INVENTARIO BÁSICO - COMPLETAMENTE ACTUALIZADO */}
                <div className="px-6 py-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    📦 Inventario básico
                  </h4>

                  {/* Estado basado en backend */}
                  {inventoryLoaded && inventoryDelivered ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                      <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                        ✅ Inventario completado
                      </p>
                      {booking.inventoryVerifiedAt &&
                        booking.inventoryDeliveredAt && (
                          <p className="text-xs text-green-700 mt-1">
                            Verificado:{" "}
                            {new Date(
                              booking.inventoryVerifiedAt
                            ).toLocaleString("es-CO")}
                            <br />
                            Entregado:{" "}
                            {new Date(
                              booking.inventoryDeliveredAt
                            ).toLocaleString("es-CO")}
                            {booking.inventoryDeliveredBy &&
                              ` por ${booking.inventoryDeliveredBy}`}
                          </p>
                        )}
                    </div>
                  ) : inventoryLoaded && !inventoryDelivered ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800 font-medium flex items-center gap-2">
                        ⏳ Inventario verificado, pendiente entrega
                      </p>
                      {inventoryItems.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-yellow-700 mb-2">
                            Selecciona elementos para entregar:
                          </p>
                          <div className="space-y-1">
                            {inventoryItems.map((item) => (
                              <label
                                key={item.id}
                                className="flex items-center gap-2 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    checkedBasics[booking.bookingId]?.[
                                      item.id
                                    ] || false
                                  }
                                  onChange={() =>
                                    handleCheckBasic(booking.bookingId, item.id)
                                  }
                                  className="w-3 h-3 text-blue-600 rounded"
                                />
                                <span>
                                  {item.name} (Qty:{" "}
                                  {item.RoomBasics?.quantity || 0})
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {inventoryItems.length > 0 ? (
                        inventoryItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50"
                          >
                            <div className="w-4 h-4 bg-gray-200 rounded"></div>
                            <span className="text-sm text-gray-700">
                              {item.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-auto">
                              Qty: {item.RoomBasics?.quantity || 0}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-gray-500 text-sm">
                          No hay inventario básico configurado para esta
                          habitación
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botones de inventario */}
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
                      {inventoryLoaded ? "✅ Verificado" : "🔍 Verificar"}
                    </button>

                    {inventoryLoaded && inventoryItems.length > 0 && (
                      <button
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          inventoryDelivered
                            ? "bg-green-500 text-white cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        onClick={() => handleConfirmBasics(booking.bookingId)}
                        disabled={inventoryDelivered}
                      >
                        {inventoryDelivered ? "✅ Entregado" : "📤 Entregar"}
                      </button>
                    )}
                  </div>
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
                    {/* Botón de limpiar habitación */}
                    <button
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        requirementsStatus.requirements.roomClean.completed
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : room.roomNumber === "Sin asignar"
                          ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5"
                      }`}
                      disabled={
                        requirementsStatus.requirements.roomClean.completed ||
                        room.roomNumber === "Sin asignar"
                      }
                      onClick={() =>
                        handlePreparation(room.roomNumber, "Limpia")
                      }
                    >
                      {room.roomNumber === "Sin asignar"
                        ? "🚫 Habitación no asignada"
                        : requirementsStatus.requirements.roomClean.completed
                        ? "✅ Lista para ocupar"
                        : "🏨 Marcar como lista para ocupar"}
                    </button>

                    {/* Botón de registrar ocupantes */}
                    <button
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        requirementsStatus.requirements.passengersCompleted
                          .completed
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : requirementsStatus.requirements.roomClean.completed
                          ? "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md transform hover:-translate-y-0.5"
                          : "bg-gray-400 text-gray-700 cursor-not-allowed"
                      }`}
                      disabled={
                        requirementsStatus.requirements.passengersCompleted
                          .completed ||
                        !requirementsStatus.requirements.roomClean.completed
                      }
                      onClick={() => setShowPassengerModal(booking.bookingId)}
                    >
                      {requirementsStatus.requirements.passengersCompleted
                        .completed
                        ? "✅ Todos registrados"
                        : requirementsStatus.requirements.roomClean.completed
                        ? `👥 Registrar ocupantes (${
                            booking.registrationPasses?.length || 0
                          }/${requiredGuestCount})`
                        : "🔒 Limpiar habitación primero"}
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
