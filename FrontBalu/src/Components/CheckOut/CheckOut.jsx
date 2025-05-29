import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllBookings,
  updateBookingStatus,
  generateBill,
} from "../../Redux/Actions/bookingActions";
import { updateRoomStatus } from "../../Redux/Actions/roomActions";
import dayjs from "dayjs";
import ExtraCharges from "./ExtraCharge";
import PaymentAndReceipt from "../Booking/PaymentAndReceipt";
import { toast } from "react-toastify";
import DashboardLayout from "../Dashboard/DashboardLayout";

const CheckOut = () => {
  const dispatch = useDispatch();
  const { bookings, loading, error } = useSelector((state) => state.booking);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    dispatch(getAllBookings({ status: "checked-in" }));
  }, [dispatch]);

  const handleCheckOut = async (bookingId) => {
    try {
      await dispatch(updateBookingStatus(bookingId, { status: "completed" }));
      toast.success(
        `Estado de la reserva #${bookingId} actualizado a "completed".`
      );

      await dispatch(generateBill(bookingId));
      toast.info(`Factura solicitada para la reserva #${bookingId}.`);

      const booking = bookings.find((b) => b.bookingId === bookingId);
      if (booking && booking.Room) {
        await dispatch(
          updateRoomStatus(booking.Room.roomNumber, { status: "Disponible" })
        );
        toast.success(
          `Habitación #${booking.Room.roomNumber} actualizada a "Disponible".`
        );
      }

      dispatch(getAllBookings({ status: "checked-in" }));
      toast.success(
        `Check-out completado exitosamente para la reserva #${bookingId}`
      );
    } catch (error) {
      console.error("Error al realizar check-out:", error);
      toast.error(
        "Error al procesar el check-out. Verifique los mensajes anteriores o intente nuevamente."
      );
    }
  };

  const handlePaymentSuccess = (transaction) => {
    toast.success("Pago realizado exitosamente.");
    setSelectedBooking(null); // Cerrar el modal de pago
    dispatch(getAllBookings({ status: "checked-in" })); // Actualizar las reservas
  };

  if (loading) return <div>Cargando reservas...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Habitaciones para Check-Out</h2>

        {bookings.length === 0 && (
          <div className="bg-blue-50 p-4 text-blue-700 rounded mb-4">
            No hay habitaciones con huéspedes en estado de check-in actualmente.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((booking) => {
            const payments = booking.Payments || [];
            const totalPagado = payments.reduce(
              (sum, p) => sum + (parseFloat(p.amount) || 0),
              0
            );
            const totalReserva = parseFloat(booking.totalAmount) || 0;

            // Lógica de extras
            const extras = booking.ExtraCharges || [];
            const totalExtras = extras.reduce(
              (sum, e) => sum + (parseFloat(e.price) || 0),
              0
            );

            // Total final (incluye los gastos extras)
            const totalFinal = totalReserva + totalExtras;

            // Total pendiente (incluye los gastos extras)
            const totalPendiente = Math.max(0, totalFinal - totalPagado);

            return (
              <div
                key={booking.bookingId}
                className="bg-white rounded shadow p-4 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    Habitación #{booking.Room?.roomNumber}
                  </span>
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    Check-in
                  </span>
                </div>
                <div>
                  <span className="font-medium">Reserva:</span> #
                  {booking.bookingId}
                </div>
                <div>
                  <span className="font-medium">Check-in:</span>{" "}
                  {dayjs(booking.checkIn).format("DD/MM/YYYY")}
                </div>
                <div>
                  <span className="font-medium">Check-out:</span>{" "}
                  {dayjs(booking.checkOut).format("DD/MM/YYYY")}
                </div>
                <div>
                  <span className="font-medium">Pago:</span>{" "}
                  <span
                    className={
                      totalPendiente > 0
                        ? "text-red-600 font-bold"
                        : "text-green-600"
                    }
                  >
                    {totalPagado >= totalFinal
                      ? "Pago total"
                      : totalPagado > 0
                      ? "Pago parcial"
                      : "Sin pago"}{" "}
                    ({totalPagado.toLocaleString()} /{" "}
                    {totalFinal.toLocaleString()})
                  </span>
                </div>
                <div>
                  <span className="font-medium">Gastos extras:</span>
                  <ul className="list-disc ml-6">
                    {extras.length > 0 ? (
                      extras.map((e, idx) => (
                        <li key={idx}>
                          {e.description}:{" "}
                          {(parseFloat(e.price) || 0).toLocaleString()}
                        </li>
                      ))
                    ) : (
                      <li>No hay gastos extras</li>
                    )}
                  </ul>
                  <ExtraCharges bookingId={booking.bookingId} />
                </div>
                <div>
                  <span className="font-medium">Total a pagar:</span>{" "}
                  <span className="font-bold">
                    {totalFinal.toLocaleString()}
                  </span>
                </div>
                {totalPendiente > 0 && (
                  <div className="text-red-600">
                    <span className="font-medium">Pendiente por cobrar:</span>{" "}
                    <span className="font-bold">
                      {totalPendiente.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  {totalPendiente > 0 && (
                    <button
                      className="mt-2 px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      Pagar pendiente
                    </button>
                  )}
                  <button
                    className={`mt-2 px-3 py-2 rounded text-white ${
                      totalPendiente > 0
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    onClick={() => handleCheckOut(booking.bookingId)}
                  >
                    {totalPendiente > 0
                      ? "Finalizar Check-Out (Pago pendiente)"
                      : "Finalizar Check-Out"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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