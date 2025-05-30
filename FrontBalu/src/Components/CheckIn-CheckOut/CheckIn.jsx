import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllBookings, getBookingById, updateBookingStatus } from "../../Redux/Actions/bookingActions";
import { registerLocalPayment } from "../../Redux/Actions/paymentActions"; // Agregar esta importación
import { updateRoomStatus, getRoomBasics } from "../../Redux/Actions/roomActions";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { createRegistrationPass } from "../../Redux/Actions/registerActions";
import { removeStock } from "../../Redux/Actions/inventoryActions";
import Registration from "../Dashboard/Registration";
import { toast } from "react-toastify"; // Agregar esta importación
import dayjs from "dayjs";

const CheckIn = () => {
  const dispatch = useDispatch();
  const { bookings, loading, error } = useSelector((state) => state.booking);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [manualBookingId, setManualBookingId] = useState("");
  const { roomBasics } = useSelector((state) => state.room);
  const [checkedRooms, setCheckedRooms] = useState({});
  const [checkedBasics, setCheckedBasics] = useState({});

  // Estados para el sistema de pagos adicionales
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentBookingForPayment, setCurrentBookingForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentConcept, setPaymentConcept] = useState('additional'); // 'pending', 'additional', 'extension'
  const [paymentDescription, setPaymentDescription] = useState('');

  const [dateRange, setDateRange] = useState({
    from: dayjs().format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  });

  useEffect(() => {
    dispatch(
      getAllBookings({ fromDate: dateRange.from, toDate: dateRange.to })
    );
  }, [dispatch, dateRange]);

  useEffect(() => {
    console.log("Reservas obtenidas:", bookings);
  }, [bookings]);

  const handlePreparation = (roomNumber, status) => {
    dispatch(updateRoomStatus(roomNumber, { status }));
  };

  const handleLoadBasics = async (roomNumber) => {
    await dispatch(getRoomBasics(roomNumber));
    setCheckedRooms((prev) => ({ ...prev, [roomNumber]: true }));
    if (roomBasics && roomBasics.length > 0) {
      setCheckedBasics((prev) => ({
        ...prev,
        [roomNumber]: roomBasics.reduce((acc, basic) => {
          acc[basic.id] = false;
          return acc;
        }, {}),
      }));
      console.log("Básicos para habitación", roomNumber, roomBasics);
    }
  };

  const handleCheckBasic = (roomNumber, basicId) => {
    setCheckedBasics((prev) => ({
      ...prev,
      [roomNumber]: {
        ...prev[roomNumber],
        [basicId]: !prev[roomNumber]?.[basicId],
      },
    }));
  };

  const handleConfirmBasics = async (roomNumber) => {
    const checked = checkedBasics[roomNumber];
    if (!checked) return;

    const basicsToRemove = roomBasics.filter((item) => checked[item.id]);

    for (const basic of basicsToRemove) {
      await dispatch(removeStock(basic.id, basic.quantity));
    }

    toast.success("Stock descontado para los básicos entregados.");
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  // ⭐ NUEVAS FUNCIONES PARA PAGOS ADICIONALES
  const openPaymentModal = (booking) => {
    setCurrentBookingForPayment(booking);
    setShowPaymentModal(true);
    setPaymentAmount(0);
    setPaymentMethod('cash');
    setPaymentConcept('additional');
    setPaymentDescription('');
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setCurrentBookingForPayment(null);
    setPaymentAmount(0);
    setPaymentDescription('');
  };

  const handleAdditionalPayment = async () => {
    if (!currentBookingForPayment || !paymentAmount || paymentAmount <= 0) {
      toast.error('Por favor, ingrese un monto válido para el pago.');
      return;
    }

    const paymentPayload = {
      bookingId: currentBookingForPayment.bookingId,
      amount: parseFloat(paymentAmount),
      paymentMethod: paymentMethod,
      paymentType: 'partial', // Los pagos adicionales son siempre parciales
      concept: paymentConcept,
      description: paymentDescription || `Pago adicional - ${paymentConcept}`,
    };

    console.log('Registrando pago adicional:', paymentPayload);

    const resultPaymentAction = await dispatch(registerLocalPayment(paymentPayload));

    if (resultPaymentAction && resultPaymentAction.success) {
      toast.success('Pago adicional registrado exitosamente.');
      closePaymentModal();
      // Refrescar las reservas para mostrar el pago actualizado
      dispatch(getAllBookings({ fromDate: dateRange.from, toDate: dateRange.to }));
    } else {
      toast.error(resultPaymentAction.message || 'Error al registrar el pago adicional.');
    }
  };

  // Función para calcular el balance pendiente
  const calculatePendingBalance = (booking) => {
    const payments = booking.Payments || [];
    const totalPagado = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalReserva = parseFloat(booking.totalAmount);
    return totalReserva - totalPagado;
  };

  if (loading)
    return <div className="text-center py-8">Cargando reservas...</div>;
  if (error)
    return <div className="text-red-500 text-center py-8">{error}</div>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">
          Habitaciones para preparar (Check-In)
        </h2>
        
        {/* Selector de fechas */}
        <div className="flex gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Desde</label>
            <input
              type="date"
              name="from"
              value={dateRange.from}
              onChange={handleDateChange}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hasta</label>
            <input
              type="date"
              name="to"
              value={dateRange.to}
              min={dateRange.from}
              onChange={handleDateChange}
              className="border rounded px-2 py-1"
            />
          </div>
        </div>

        {/* Grid de reservas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((booking) => {
            // Lógica de pagos
            const payments = booking.Payments || [];
            const totalPagado = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            const totalReserva = parseFloat(booking.totalAmount);
            const pendingBalance = calculatePendingBalance(booking);
            
            let estadoPago = "Sin pago";
            if (totalPagado >= totalReserva) {
              estadoPago = "Pago total";
            } else if (totalPagado > 0) {
              estadoPago = "Pago parcial";
            }

            return (
              <div
                key={booking.bookingId}
                className="bg-white rounded shadow p-4 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    Habitación #{booking.Room?.roomNumber}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      booking.Room?.status === "Limpia"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {booking.Room?.status || "Sin estado"}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium">Reserva:</span> #{booking.bookingId}{" "}
                  | Estado: <b>{booking.status}</b>
                </div>
                
                <div>
                  <span className="font-medium">Huésped principal:</span>{" "}
                  {booking.guest?.scostumername}
                </div>
                
                <div>
                  <span className="font-medium">Check-in:</span>{" "}
                  {dayjs(booking.checkIn).format("DD/MM/YYYY")}
                </div>

                {/* ⭐ SECCIÓN DE PAGOS MEJORADA */}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Estado de Pago:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      estadoPago === "Pago total" ? "bg-green-100 text-green-700" :
                      estadoPago === "Pago parcial" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {estadoPago}
                    </span>
                  </div>
                  
                  <div className="text-sm mb-2">
                    <span>Pagado: ${totalPagado.toLocaleString()} / Total: ${totalReserva.toLocaleString()}</span>
                    {pendingBalance > 0 && (
                      <div className="text-red-600 font-medium">
                        Pendiente: ${pendingBalance.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {payments.length > 0 && (
                    <div className="bg-gray-50 p-2 rounded mb-2">
                      <span className="text-xs font-medium">Historial de Pagos:</span>
                      <ul className="text-xs text-gray-600 mt-1">
                        {payments.map((p) => (
                          <li key={p.paymentId} className="flex justify-between">
                            <span>{p.paymentType === "full" ? "Total" : "Parcial"}: ${parseFloat(p.amount).toLocaleString()}</span>
                            <span>({p.paymentMethod})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* ⭐ BOTÓN PARA PAGOS ADICIONALES */}
                  <button
                    className="w-full px-3 py-1 rounded bg-blue-500 text-white text-sm hover:bg-blue-600 mb-2"
                    onClick={() => openPaymentModal(booking)}
                  >
                    💳 Registrar Pago Adicional
                  </button>
                </div>

                {/* Inventario básico */}
                <div>
                  <span className="font-medium">Inventario básico:</span>
                  <ul className="list-disc ml-6">
                    {checkedRooms[booking.Room?.roomNumber] && roomBasics.length > 0
                      ? roomBasics.map((item) => (
                          <li key={item.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={
                                checkedBasics[booking.Room?.roomNumber]?.[
                                  item.id
                                ] || false
                              }
                              onChange={() =>
                                handleCheckBasic(booking.Room?.roomNumber, item.id)
                              }
                            />
                            {item.name}{" "}
                            <span className="text-gray-500">({item.quantity})</span>
                          </li>
                        ))
                      : (booking.Room?.BasicInventories || []).map((item) => (
                          <li key={item.id}>
                            {item.name}{" "}
                            <span className="text-gray-500">
                              ({item.RoomBasics?.quantity || 0})
                            </span>
                          </li>
                        ))}
                  </ul>
                  
                  <button
                    className={`px-2 py-1 rounded mt-2 ${
                      checkedRooms[booking.Room?.roomNumber]
                        ? "bg-green-400 text-white"
                        : "bg-yellow-400 text-black"
                    }`}
                    onClick={() => handleLoadBasics(booking.Room?.roomNumber)}
                    disabled={checkedRooms[booking.Room?.roomNumber]}
                  >
                    {checkedRooms[booking.Room?.roomNumber]
                      ? "Básicos verificados"
                      : "Verificar básicos"}
                  </button>
                  
                  {checkedRooms[booking.Room?.roomNumber] && (
                    <div className="text-green-600 text-sm mt-1">
                      ✔ Básicos listos
                    </div>
                  )}
                  
                  {checkedRooms[booking.Room?.roomNumber] && (
                    <button
                      className="px-2 py-1 bg-blue-600 text-white rounded mt-2"
                      onClick={() => handleConfirmBasics(booking.Room?.roomNumber)}
                    >
                      Confirmar entrega de básicos y descontar stock
                    </button>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 mt-2">
                  <button
                    className={`px-3 py-1 rounded ${
                      booking.Room?.status === "Limpia"
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-gray-700"
                    }`}
                    disabled={booking.Room?.status === "Limpia"}
                    onClick={() =>
                      handlePreparation(booking.Room?.roomNumber, "Limpia")
                    }
                  >
                    Marcar como limpia
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-blue-500 text-white"
                    onClick={() => setSelectedBooking(booking.bookingId)}
                  >
                    Cargar ocupantes
                  </button>
                </div>

                {selectedBooking === booking.bookingId && (
                  <div className="mt-4 border-t pt-2">
                    <Registration bookingId={booking.bookingId} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ⭐ MODAL PARA PAGOS ADICIONALES */}
        {showPaymentModal && currentBookingForPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Registrar Pago Adicional</h3>
                <button 
                  onClick={closePaymentModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="block text-sm font-medium">Reserva:</span>
                  <span className="text-lg">#{currentBookingForPayment.bookingId}</span>
                </div>

                <div>
                  <span className="block text-sm font-medium">Huésped:</span>
                  <span>{currentBookingForPayment.guest?.scostumername}</span>
                </div>

                <div>
                  <span className="block text-sm font-medium">Balance Pendiente:</span>
                  <span className="text-lg font-bold text-red-600">
                    ${calculatePendingBalance(currentBookingForPayment).toLocaleString()}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Concepto del Pago:</label>
                  <select
                    value={paymentConcept}
                    onChange={(e) => setPaymentConcept(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="pending">Pago Pendiente</option>
                    <option value="additional">Servicios Adicionales</option>
                    <option value="extension">Extensión de Estadía</option>
                    <option value="minibar">Minibar</option>
                    <option value="spa">Spa/Wellness</option>
                    <option value="restaurant">Restaurante</option>
                    <option value="laundry">Lavandería</option>
                    <option value="other">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descripción (Opcional):</label>
                  <input
                    type="text"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    placeholder="Descripción del servicio o concepto"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Monto a Pagar:</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Método de Pago:</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="credit_card">Tarjeta de Crédito</option>
                    <option value="debit_card">Tarjeta de Débito</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleAdditionalPayment}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Registrar Pago
                  </button>
                  <button
                    onClick={closePaymentModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CheckIn;