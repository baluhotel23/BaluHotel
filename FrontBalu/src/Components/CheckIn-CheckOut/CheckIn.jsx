import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllBookings, getBookingById, updateBookingStatus  } from "../../Redux/Actions/bookingActions";
import {
  updateRoomStatus,
  getRoomBasics,
} from "../../Redux/Actions/roomActions";
import DashboardLayout from "../Dashboard/DashboardLayout";
import { createRegistrationPass } from "../../Redux/Actions/registerActions";
import { removeStock } from "../../Redux/Actions/inventoryActions";
import Registration from "../Dashboard/Registration";
import dayjs from "dayjs";

const CheckIn = () => {
  const dispatch = useDispatch();
  const { bookings, loading, error } = useSelector((state) => state.booking);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const { roomBasics } = useSelector((state) => state.room);
  const [checkedRooms, setCheckedRooms] = useState({});
  const [checkedBasics, setCheckedBasics] = useState({});

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

  //   // const handleAddGuest = () => {
  //   //   setExtraGuests([...extraGuests, { name: "", document: "" }]);
  //   // };

  //   // const handleGuestChange = (idx, field, value) => {
  //   //   const updated = [...extraGuests];
  //   //   updated[idx][field] = value;
  //   //   setExtraGuests(updated);
  //   // };

  // const handleSaveGuests = (booking) => {
  //   const passengers = [
  //     {
  //       name: booking.guest?.name || "",
  //       document: booking.guest?.sdocno || "",

  //     },
  //     ...extraGuests,
  //   ];

  //   dispatch(createRegistrationPass({
  //     bookingId: booking.bookingId,
  //     passengers,
  //   }));

  //   // Si hay más de un huésped, cambia el estado a "Ocupada"
  //   if (passengers.length > 1) {
  //     dispatch(updateRoomStatus(booking.bookingId, "occupied"));
  //   }

  //   setExtraGuests([]);
  //   setSelectedBooking(null);
  // };

  const handleLoadBasics = async (roomNumber) => {
    await dispatch(getRoomBasics(roomNumber));
    setCheckedRooms((prev) => ({ ...prev, [roomNumber]: true }));
    // Inicializa el estado de los básicos como no chequeados
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
    // Obtén los básicos chequeados para la habitación
    const checked = checkedBasics[roomNumber];
    if (!checked) return;

    // Filtra los básicos marcados como entregados
    const basicsToRemove = roomBasics.filter((item) => checked[item.id]);

    // Llama a removeStock por cada básico entregado
    for (const basic of basicsToRemove) {
      await dispatch(removeStock(basic.id, basic.quantity));
    }

    // Opcional: muestra un mensaje de éxito
    toast.success("Stock descontado para los básicos entregados.");
  };

  // NUEVO: Selector de fechas
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
  <div className="max-w-5xl mx-auto p-4">
    <h2 className="text-2xl font-bold mb-4">
      Habitaciones para preparar (Check-In)
    </h2>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {bookings.map((booking) => {
        // --- Lógica de pagos ---
        const payments = booking.Payments || [];
        const totalPagado = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const totalReserva = parseFloat(booking.totalAmount);
        let estadoPago = "Sin pago";
        if (totalPagado >= totalReserva) {
          estadoPago = "Pago total";
        } else if (totalPagado > 0) {
          estadoPago = "Pago parcial";
        }
        // --- Fin lógica de pagos ---

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
              {booking.guest?.sdocno}
            </div>
            <div>
              <span className="font-medium">Check-in:</span>{" "}
              {dayjs(booking.checkIn).format("DD/MM/YYYY")}
            </div>
            {/* Estado de pago */}
            <div>
              <span className="font-medium">Pago:</span>{" "}
              <span>
                {estadoPago} ({totalPagado.toLocaleString()} / {totalReserva.toLocaleString()})
              </span>
            </div>
            {payments.length > 0 && (
              <ul className="text-xs text-gray-600">
                {payments.map((p) => (
                  <li key={p.paymentId}>
                    {p.paymentType === "full" ? "Total" : "Parcial"}: {parseFloat(p.amount).toLocaleString()} ({p.paymentMethod})
                  </li>
                ))}
              </ul>
            )}
            {/* Fin estado de pago */}
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
  </div>
  </DashboardLayout>
);
};

export default CheckIn;
