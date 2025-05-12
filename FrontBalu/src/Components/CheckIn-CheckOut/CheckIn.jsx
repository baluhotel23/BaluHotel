import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllBookings } from "../../Redux/Actions/bookingActions";
import { updateRoomStatus } from "../../Redux/Actions/roomActions";
import { createRegistrationPass } from "../../Redux/Actions/registerActions";
import dayjs from "dayjs";

const CheckIn = () => {
  const dispatch = useDispatch();
  const { bookings, loading, error } = useSelector((state) => state.booking);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [extraGuests, setExtraGuests] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: dayjs().format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  });

  useEffect(() => {
    dispatch(getAllBookings({ fromDate: dateRange.from, toDate: dateRange.to }));
  }, [dispatch, dateRange]);
  useEffect(() => {
  console.log("Reservas obtenidas:", bookings);
}, [bookings]);

  const handlePreparation = (bookingId, field) => {
    dispatch(updateRoomStatus(bookingId, field));
  };

  const handleAddGuest = () => {
    setExtraGuests([...extraGuests, { name: "", document: "" }]);
  };

  const handleGuestChange = (idx, field, value) => {
    const updated = [...extraGuests];
    updated[idx][field] = value;
    setExtraGuests(updated);
  };

  const handleSaveGuests = (booking) => {
    const passengers = [
      {
        name: booking.guest?.name || "",
        document: booking.guest?.sdocno || "",
      },
      ...extraGuests,
    ];

    dispatch(createRegistrationPass({
      bookingId: booking.bookingId,
      passengers,
    }));

    setExtraGuests([]);
    setSelectedBooking(null);
  };

  // NUEVO: Selector de fechas
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="text-center py-8">Cargando reservas...</div>;
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Habitaciones para preparar (Check-In)</h2>
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
        {bookings.map((booking) => (
          <div key={booking.bookingId} className="bg-white rounded shadow p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Habitación #{booking.Room?.roomNumber}</span>
              <span className={`px-2 py-1 rounded text-xs ${booking.Room?.status === "Limpia" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {booking.Room?.status || "Sin estado"}
              </span>
            </div>
            <div>
              <span className="font-medium">Reserva:</span> #{booking.bookingId} | Estado: <b>{booking.status}</b>
            </div>
            <div>
              <span className="font-medium">Huésped principal:</span> {booking.guest?.sdocno}
            </div>
            <div>
              <span className="font-medium">Check-in:</span> {dayjs(booking.checkIn).format("DD/MM/YYYY")}
            </div>
            <div>
              <span className="font-medium">Inventario básico:</span>
              <ul className="list-disc ml-6">
                {(booking.Room?.BasicInventories || []).map((item) => (
                  <li key={item.id}>
                    {item.name} <span className="text-gray-500">({item.RoomBasics?.quantity || 0})</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                className={`px-3 py-1 rounded ${booking.Room?.status === "Limpia" ? "bg-green-500 text-white" : "bg-gray-300 text-gray-700"}`}
                disabled={booking.Room?.status === "Limpia"}
                onClick={() => handlePreparation(booking.bookingId, "cleaning")}
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
                <h4 className="font-semibold mb-2">Cargar ocupantes adicionales</h4>
                {extraGuests.map((guest, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Nombre"
                      className="border rounded px-2 py-1 flex-1"
                      value={guest.name}
                      onChange={(e) => handleGuestChange(idx, "name", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Documento"
                      className="border rounded px-2 py-1 flex-1"
                      value={guest.document}
                      onChange={(e) => handleGuestChange(idx, "document", e.target.value)}
                    />
                  </div>
                ))}
                <button
                  className="px-2 py-1 bg-gray-200 rounded mr-2"
                  onClick={handleAddGuest}
                >
                  + Agregar ocupante
                </button>
                <button
                  className="px-2 py-1 bg-green-500 text-white rounded"
                  onClick={() => handleSaveGuests(booking)}
                >
                  Guardar ocupantes
                </button>
                <button
                  className="px-2 py-1 bg-red-400 text-white rounded ml-2"
                  onClick={() => setSelectedBooking(null)}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CheckIn;