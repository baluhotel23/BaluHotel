import { useEffect, useState, useCallback, useMemo } from "react";
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
  
  // ⭐ SELECTORES CORREGIDOS PARA TU REDUCER
  const { 
    bookings: allBookings = [], 
    loading = {}, 
    errors = {} 
  } = useSelector((state) => state.booking || {});
  
  // ⭐ LOADING ESPECÍFICO PARA GET_ALL_BOOKINGS
  const isLoadingBookings = loading.general || false;
  const bookingError = errors.general || null;
  
  // ⭐ SELECTORES CON FALLBACK PARA REGISTRATION REDUCER
  const { 
    registrationsByBooking = {}, 
    loading: registrationLoading = {}, 
    errors: registrationErrors = {} 
  } = useSelector((state) => state.registrationPass || {});
  
  // ⭐ ESTADOS LOCALES
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [checkedBookings, setCheckedBookings] = useState({});
  const [checkedBasics, setCheckedBasics] = useState({});
  const [basicsByBooking, setBasicsByBooking] = useState({});
  const [registeredPassengers, setRegisteredPassengers] = useState({});
  const [passengersLoaded, setPassengersLoaded] = useState({}); 
  const [passengersLoadingErrors, setPassengersLoadingErrors] = useState({});

  const [dateRange, setDateRange] = useState({
    from: dayjs().format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  });

  // ⭐ DEBUG TEMPORAL - REMOVER DESPUÉS DE CONFIRMAR QUE FUNCIONA
  useEffect(() => {
    console.log('🔍 [CHECKIN] Estado actual:', {
      isLoadingBookings,
      bookingError,
      allBookingsLength: allBookings?.length,
      loading: loading,
      errors: errors
    });
  }, [isLoadingBookings, bookingError, allBookings?.length, loading, errors]);

  // ⭐ MEMOIZAR BOOKINGS FILTRADOS PARA EVITAR RE-RENDERS
  const bookings = useMemo(() => {
    if (!Array.isArray(allBookings)) return [];
    
    return allBookings.filter(booking => 
      booking.status === 'pending' || 
      booking.status === 'confirmed' || 
      booking.status === 'paid' ||
      !booking.status
    );
  }, [allBookings]);

  // ⭐ CARGAR RESERVAS SOLO CUANDO CAMBIAN LAS FECHAS
  useEffect(() => {
    console.log("🔍 Cargando reservas para check-in con filtros:", {
      fromDate: dateRange.from,
      toDate: dateRange.to
    });
    
    dispatch(
      getAllBookings({ 
        fromDate: dateRange.from, 
        toDate: dateRange.to
      })
    );
  }, [dispatch, dateRange.from, dateRange.to]);

  // ⭐ LOG PARA DEBUG - SOLO CUANDO CAMBIAN LOS BOOKINGS
  useEffect(() => {
    if (allBookings.length > 0) {
      console.log("📊 Estado de reservas en CheckIn:");
      console.log("- Total reservas cargadas:", allBookings.length);
      console.log("- Reservas para check-in:", bookings.length);
      console.log("- Estados encontrados:", [...new Set(allBookings.map(b => b.status))]);
      
      bookings.forEach(booking => {
        const room = booking.Room || booking.room;
        console.log(`  📋 Reserva ${booking.bookingId}: ${booking.status} - Habitación ${room?.roomNumber || 'SIN HABITACIÓN'}`);
      });
    }
  }, [allBookings.length, bookings.length, allBookings, bookings]);

  // ⭐ CARGAR PASAJEROS - OPTIMIZADO SIN LOOP INFINITO
  useEffect(() => {
    const loadPassengersForBookings = async () => {
      const bookingsToLoad = bookings.filter(booking => 
        !passengersLoaded[booking.bookingId] && 
        !passengersLoadingErrors[booking.bookingId]
      );

      if (bookingsToLoad.length === 0) return;

      console.log(`🔍 Verificando pasajeros para ${bookingsToLoad.length} reserva(s)`);

      for (const booking of bookingsToLoad) {
        try {
          console.log(`  📋 Verificando reserva ${booking.bookingId}`);
          
          setPassengersLoaded(prev => ({ ...prev, [booking.bookingId]: 'loading' }));
          
          const result = await dispatch(getRegistrationPassesByBooking(booking.bookingId));
          
          if (result.isNotFound) {
            console.log(`  ℹ️ Reserva ${booking.bookingId}: Lista para check-in`);
            setPassengersLoaded(prev => ({ ...prev, [booking.bookingId]: true }));
          } else if (result.success) {
            console.log(`  ✅ Reserva ${booking.bookingId}: ${result.passengers?.length || 0} pasajero(s)`);
            setPassengersLoaded(prev => ({ ...prev, [booking.bookingId]: true }));
          } else if (result.error) {
            console.warn(`  ⚠️ Error cargando pasajeros para reserva ${booking.bookingId}:`, result.error);
            setPassengersLoadingErrors(prev => ({ ...prev, [booking.bookingId]: true }));
            setPassengersLoaded(prev => ({ ...prev, [booking.bookingId]: true }));
          }
        } catch (error) {
          console.error(`  ❌ Error inesperado para reserva ${booking.bookingId}:`, error);
          setPassengersLoadingErrors(prev => ({ ...prev, [booking.bookingId]: true }));
          setPassengersLoaded(prev => ({ ...prev, [booking.bookingId]: true }));
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    loadPassengersForBookings();
  }, [bookings, dispatch]);

  // ⭐ SINCRONIZAR ESTADO LOCAL CON REDUX
  useEffect(() => {
    const updatedRegisteredPassengers = {};
    let hasChanges = false;

    Object.keys(registrationsByBooking).forEach((bookingId) => {
      const passengers = registrationsByBooking[bookingId];
      if (passengers && passengers.length > 0) {
        updatedRegisteredPassengers[bookingId] = passengers;
        if (!registeredPassengers[bookingId] || 
            registeredPassengers[bookingId].length !== passengers.length) {
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setRegisteredPassengers(updatedRegisteredPassengers);
    }
  }, [registrationsByBooking, registeredPassengers]);

  // ⭐ FUNCIÓN PARA VERIFICAR SI HAY PASAJEROS REGISTRADOS
  const hasRegisteredPassengers = useCallback((bookingId) => {
    const fromLocal = registeredPassengers[bookingId]?.length > 0;
    const fromRedux = registrationsByBooking[bookingId]?.length > 0;
    return fromLocal || fromRedux;
  }, [registeredPassengers, registrationsByBooking]);

  // ⭐ FUNCIÓN PARA OBTENER ESTADO DE PASAJEROS
  const getPassengersStatus = useCallback((bookingId) => {
    const loadedState = passengersLoaded[bookingId];
    const hasError = passengersLoadingErrors[bookingId];
    const hasPassengers = hasRegisteredPassengers(bookingId);
    
    if (loadedState === 'loading') {
      return { status: 'loading', message: 'Verificando...', icon: '🔄' };
    }
    
    if (hasError) {
      return { status: 'error', message: 'Error al cargar', icon: '❌' };
    }
    
    if (hasPassengers) {
      const count = registrationsByBooking[bookingId]?.length || 0;
      return { 
        status: 'completed', 
        message: `Check-in completado (${count})`, 
        icon: '✅',
        count 
      };
    }
    
    if (loadedState === true) {
      return { status: 'pending', message: 'Pendiente de check-in', icon: '⏳' };
    }
    
    return { status: 'unknown', message: 'Verificando...', icon: '🔄' };
  }, [passengersLoaded, passengersLoadingErrors, hasRegisteredPassengers, registrationsByBooking]);

  // ⭐ FUNCIÓN PARA OBTENER INFORMACIÓN DE HABITACIÓN CON FALLBACK
  const getRoomInfo = useCallback((booking) => {
    const room = booking.Room || booking.room || null;
    
    if (!room) {
      console.warn(`⚠️ No se encontró información de habitación para reserva ${booking.bookingId}`, booking);
      return {
        roomNumber: booking.roomNumber || 'Sin asignar',
        type: 'Desconocido',
        status: 'Sin estado',
        maxGuests: 1,
        BasicInventories: []
      };
    }
    
    return room;
  }, []);

  // ⭐ FUNCIÓN PARA PREPARAR HABITACIÓN
  const handlePreparation = useCallback((roomNumber, status) => {
    if (!roomNumber || roomNumber === 'Sin asignar') {
      toast.error('No se puede actualizar: habitación no asignada');
      return;
    }
    
    dispatch(updateRoomStatus(roomNumber, { status }));
    toast.success(`Habitación ${roomNumber} marcada como ${status}`);
  }, [dispatch]);

  // ⭐ FUNCIÓN PARA CARGAR INVENTARIO BÁSICO
  const handleLoadBasics = useCallback((booking) => {
    const room = getRoomInfo(booking);
    const roomNumber = room.roomNumber;
    const bookingId = booking.bookingId;
    
    console.log('🔍 Cargando básicos para reserva:', bookingId);
    console.log('🏨 Información de habitación:', room);
    
    const loadedBasics = room.BasicInventories || [];
    console.log('📦 Básicos obtenidos:', loadedBasics);
    
    if (loadedBasics && loadedBasics.length > 0) {
      setCheckedBookings((prev) => ({ ...prev, [bookingId]: true }));

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

      setCheckedBasics((prev) => ({
        ...prev,
        [bookingId]: loadedBasics.reduce((acc, basic) => {
          acc[basic.id] = false;
          return acc;
        }, {}),
      }));
      
      console.log("✅ Básicos cargados para reserva", bookingId);
      toast.success(`Inventario básico cargado para reserva ${bookingId}`);
    } else {
      console.log(`ℹ️ No hay inventario básico para habitación ${roomNumber}`);
      toast.info(`No hay inventario básico configurado para la habitación ${roomNumber}`);
    }
  }, [getRoomInfo]);

  // ⭐ MANEJAR CHECKBOX DE BÁSICOS
  const handleCheckBasic = useCallback((bookingId, basicId) => {
    setCheckedBasics((prev) => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        [basicId]: !prev[bookingId]?.[basicId],
      },
    }));
  }, []);

  // ⭐ CONFIRMAR ENTREGA DE BÁSICOS
  const handleConfirmBasics = useCallback(async (bookingId) => {
    const checked = checkedBasics[bookingId];
    if (!checked) {
      toast.warning("No hay básicos seleccionados para esta reserva.");
      return;
    }

    const bookingBasics = basicsByBooking[bookingId] || [];
    const basicsToRemove = bookingBasics.filter((item) => checked[item.id]);

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

      setCheckedBasics((prev) => ({
        ...prev,
        [bookingId]: Object.keys(prev[bookingId] || {}).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {}),
      }));

      toast.success(`Inventario básico entregado para la reserva ${bookingId} exitosamente.`);
    } catch (error) {
      console.error("💥 Error en handleConfirmBasics:", error);
      toast.error("Error al confirmar la entrega de básicos.");
    }
  }, [checkedBasics, basicsByBooking, dispatch]);

  // ⭐ FUNCIÓN PARA FORZAR RECARGA DE PASAJEROS
  const reloadPassengersForBooking = useCallback(async (bookingId) => {
    console.log(`🔄 Forzando recarga de pasajeros para reserva ${bookingId}`);
    
    setPassengersLoaded(prev => ({ ...prev, [bookingId]: 'loading' }));
    setPassengersLoadingErrors(prev => ({ ...prev, [bookingId]: false }));
    
    try {
      const result = await dispatch(getRegistrationPassesByBooking(bookingId));
      
      if (result.success || result.isNotFound) {
        setPassengersLoaded(prev => ({ ...prev, [bookingId]: true }));
        console.log(`✅ Recarga completada para reserva ${bookingId}`);
      } else {
        setPassengersLoadingErrors(prev => ({ ...prev, [bookingId]: true }));
        setPassengersLoaded(prev => ({ ...prev, [bookingId]: true }));
      }
    } catch (error) {
      console.error(`❌ Error en recarga forzada:`, error);
      setPassengersLoadingErrors(prev => ({ ...prev, [bookingId]: true }));
      setPassengersLoaded(prev => ({ ...prev, [bookingId]: true }));
    }
  }, [dispatch]);

  // ⭐ MANEJAR ÉXITO EN REGISTRO DE PASAJEROS
  const handlePassengerRegistrationSuccess = useCallback((bookingId, passengers) => {
    console.log("✅ Pasajeros registrados exitosamente:", passengers);
    
    setRegisteredPassengers((prev) => ({
      ...prev,
      [bookingId]: passengers,
    }));

    // ⭐ FORZAR RECARGA PARA SINCRONIZAR CON REDUX
    setTimeout(() => {
      reloadPassengersForBooking(bookingId);
    }, 500);

    dispatch(updateBookingStatus(bookingId, { status: "checked-in" }))
      .then(() => {
        toast.success(`✅ Reserva ${bookingId} completada y movida a check-out`);
        setSelectedBooking(null);
        
        setTimeout(() => {
          dispatch(
            getAllBookings({ 
              fromDate: dateRange.from, 
              toDate: dateRange.to
            })
          );
        }, 1000);
      })
      .catch((error) => {
        console.error("❌ Error actualizando estado de reserva:", error);
        toast.error("Error al actualizar el estado de la reserva");
      });
  }, [dispatch, dateRange.from, dateRange.to, reloadPassengersForBooking]);

  // ⭐ MANEJAR CIERRE DE REGISTRO
  const handleCloseRegistration = useCallback((bookingId) => {
    setSelectedBooking(null);

    const booking = bookings.find((b) => b.bookingId === bookingId);
    if (booking) {
      const room = getRoomInfo(booking);
      if (room.roomNumber && room.roomNumber !== 'Sin asignar') {
        dispatch(updateRoomStatus(room.roomNumber, { status: "Ocupada" }));
      }
    }
  }, [bookings, dispatch, getRoomInfo]);

  // ⭐ MANEJAR CAMBIO DE FECHAS
  const handleDateChange = useCallback((e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  }, []);

  // ⭐ FUNCIÓN PARA OBTENER COLOR DEL ESTADO DE HABITACIÓN
  const getRoomStatusColor = useCallback((status) => {
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
      case "Sin estado":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  }, []);

  // ⭐ CONDICIONES DE LOADING Y ERROR CORREGIDAS
  if (isLoadingBookings) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">🔄 Cargando reservas para check-in...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (bookingError) {
    return (
      <DashboardLayout>
        <div className="text-red-500 text-center p-4">❌ {bookingError}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            🏨 Check-In de Habitaciones
          </h2>
          <p className="text-gray-600">
            Gestiona el proceso de entrada de huéspedes y preparación de habitaciones
          </p>
          <div className="mt-2 text-sm text-blue-600">
            📋 Mostrando {bookings.length} reserva(s) pendiente(s) de check-in
            {allBookings.length > bookings.length && (
              <span className="text-gray-500 ml-2">
                ({allBookings.length - bookings.length} ya procesada(s))
              </span>
            )}
          </div>
        </div>

        {/* ⭐ SELECTOR DE FECHAS */}
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

        {/* ⭐ MENSAJE CUANDO NO HAY RESERVAS */}
        {bookings.length === 0 && !isLoadingBookings && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay reservas pendientes de check-in
            </h3>
            <p className="text-gray-500 mb-4">
              {allBookings.length > 0 
                ? `Hay ${allBookings.length} reserva(s) en otros estados (checked-in, completed, etc.)`
                : "No hay reservas para estas fechas"
              }
            </p>
            {allBookings.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg inline-block">
                <p className="text-blue-700 text-sm">
                  💡 Las reservas con check-in completado aparecen en la sección de <strong>Check-Out</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ⭐ GRID DE RESERVAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {bookings.map((booking) => {
            const room = getRoomInfo(booking);
            const passengersStatus = getPassengersStatus(booking.bookingId);
            
            // ⭐ LÓGICA DE PAGOS
            const payments = booking.Payments || booking.payments || [];
            const totalPagado = payments.reduce(
              (sum, p) => sum + parseFloat(p.amount || 0),
              0
            );
            const totalReserva = parseFloat(booking.totalAmount || 0);
            let estadoPago = "Sin pago";
            let pagoColor = "bg-red-100 text-red-700";
            
            if (totalPagado >= totalReserva) {
              estadoPago = "Pago completo";
              pagoColor = "bg-green-100 text-green-700";
            } else if (totalPagado > 0) {
              estadoPago = "Pago parcial";
              pagoColor = "bg-yellow-100 text-yellow-700";
            }

            // ⭐ VERIFICAR ESTADO DE INVENTARIO
            const inventoryLoaded = checkedBookings[booking.bookingId];
            const inventoryItems = basicsByBooking[booking.bookingId] || [];
            const checkedItems = checkedBasics[booking.bookingId] || {};
            const allInventoryDelivered = inventoryItems.length > 0 && 
              inventoryItems.every(item => checkedItems[item.id] === true);

            return (
              <div
                key={booking.bookingId}
                className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
              >
                {/* ⭐ HEADER CON INFORMACIÓN PRINCIPAL */}
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
                        🔄 {booking.status || 'Pendiente'} → Check-in
                      </span>
                      {room.roomNumber === 'Sin asignar' && (
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

                  {/* ⭐ INFORMACIÓN DEL HUÉSPED */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">👤 Huésped:</span>
                      <span className="text-sm text-gray-800 font-medium">
                        {booking.guest?.scostumername || 'Sin información'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">📅 Check-in:</span>
                      <span className="text-sm text-gray-800">
                        {dayjs(booking.checkIn).format("DD/MM/YYYY")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">👥 Huéspedes:</span>
                      <span className="text-sm text-gray-800">
                        {booking.guestCount || 1}
                      </span>
                    </div>
                  </div>

                  {/* ⭐ ESTADO DE PASAJEROS MEJORADO */}
                  <div className="mt-3">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      passengersStatus.status === 'completed' 
                        ? 'bg-green-100 text-green-700'
                        : passengersStatus.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700' 
                        : passengersStatus.status === 'loading'
                        ? 'bg-blue-100 text-blue-700 animate-pulse'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {passengersStatus.icon} {passengersStatus.message}
                    </span>
                  </div>
                </div>

                {/* ⭐ ESTADO DE PAGO */}
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
                                ${parseFloat(p.amount || 0).toLocaleString()} ({p.paymentMethod})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>

                {/* ⭐ SECCIÓN DE INVENTARIO BÁSICO */}
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
                      (room.BasicInventories || []).map((item) => (
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
                        inventoryLoaded
                          ? "bg-green-500 text-white"
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
                            ? "bg-green-500 text-white"
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
                    <div className={`mt-2 p-2 rounded-md ${
                      allInventoryDelivered 
                        ? "bg-green-50 text-green-700" 
                        : "bg-yellow-50 text-yellow-700"
                    }`}>
                      <p className="text-sm flex items-center gap-2">
                        {allInventoryDelivered 
                          ? "✅ Inventario entregado completamente"
                          : "⚠️ Selecciona los elementos a entregar"
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* ⭐ PROGRESO VISUAL */}
                <div className="px-6 py-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">
                    📋 Progreso del Check-in
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        inventoryLoaded ? "bg-green-500" : "bg-gray-300"
                      }`}></div>
                      <span className="text-xs text-gray-600">Inventario verificado</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        allInventoryDelivered ? "bg-green-500" : "bg-gray-300"
                      }`}></div>
                      <span className="text-xs text-gray-600">Inventario entregado</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        room.status === "Limpia" ? "bg-green-500" : "bg-gray-300"
                      }`}></div>
                      <span className="text-xs text-gray-600">Habitación limpia</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        passengersStatus.status === 'completed' ? "bg-green-500" : "bg-gray-300"
                      }`}></div>
                      <span className="text-xs text-gray-600">
                        Ocupantes registrados {passengersStatus.status === 'completed' ? `(${passengersStatus.count})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ⭐ BOTONES DE ACCIÓN */}
                <div className="p-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        room.status === "Limpia"
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : room.roomNumber === 'Sin asignar'
                          ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5"
                      }`}
                      disabled={room.status === "Limpia" || room.roomNumber === 'Sin asignar'}
                      onClick={() => handlePreparation(room.roomNumber, "Limpia")}
                    >
                      {room.roomNumber === 'Sin asignar'
                        ? "🚫 Habitación no asignada"
                        : room.status === "Limpia"
                        ? "✅ Habitación limpia"
                        : "🧹 Marcar como limpia"}
                    </button>

                    <button
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                        passengersStatus.status === 'completed'
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : passengersStatus.status === 'loading'
                          ? "bg-blue-400 text-white cursor-not-allowed animate-pulse"
                          : room.status === "Limpia"
                          ? "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md transform hover:-translate-y-0.5"
                          : "bg-gray-400 text-gray-700 cursor-not-allowed"
                      }`}
                      disabled={
                        passengersStatus.status === 'completed' || 
                        passengersStatus.status === 'loading' ||
                        room.status !== "Limpia"
                      }
                      onClick={() =>
                        setSelectedBooking(
                          selectedBooking === booking.bookingId ? null : booking.bookingId
                        )
                      }
                    >
                      {passengersStatus.status === 'completed'
                        ? `✅ ${passengersStatus.message}`
                        : passengersStatus.status === 'loading'
                        ? "🔄 Verificando pasajeros..."
                        : room.status === "Limpia"
                        ? "👥 Registrar ocupantes"
                        : "🔒 Limpiar habitación primero"}
                    </button>

                    {/* ⭐ BOTÓN DE RECARGA MANUAL */}
                    {passengersStatus.status === 'error' && (
                      <button
                        className="w-full px-3 py-2 rounded text-sm text-blue-600 hover:bg-blue-50 border border-blue-200"
                        onClick={() => reloadPassengersForBooking(booking.bookingId)}
                      >
                        🔄 Reintentar carga de pasajeros
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700 text-center">
                    💡 Una vez completado el check-in, esta reserva aparecerá en la sección Check-Out
                  </div>
                </div>

                {/* ⭐ FORMULARIO DE REGISTRO DE OCUPANTES */}
                {selectedBooking === booking.bookingId && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        👥 Registro de Ocupantes
                      </h4>
                      <Registration
                        bookingId={booking.bookingId}
                        existingPassengers={registrationsByBooking[booking.bookingId] || []}
                        guestCount={booking.guestCount || 1}
                        booking={booking}
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
      </div>
    </DashboardLayout>
  );
};

export default CheckIn;