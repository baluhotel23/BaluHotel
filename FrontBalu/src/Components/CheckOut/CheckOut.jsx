import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllBookings } from "../../Redux/Actions/bookingActions";
import dayjs from "dayjs";
import ExtraCharges from "./ExtraCharge";

const CheckOut = () => {
  const dispatch = useDispatch();
  const { bookings, loading, error } = useSelector((state) => state.booking);

  useEffect(() => {
    // Puedes pasar roomStatus="Ocupada" si tu backend lo soporta
    dispatch(getAllBookings({ roomStatus: "Ocupada" }));
  }, [dispatch]);

  if (loading) return <div>Cargando reservas...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Habitaciones para Check-Out</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bookings.map((booking) => {
          // Lógica de pagos
          const payments = booking.Payments || [];
          const totalPagado = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const totalReserva = parseFloat(booking.totalAmount);
          let estadoPago = "Sin pago";
          if (totalPagado >= totalReserva) {
            estadoPago = "Pago total";
          } else if (totalPagado > 0) {
            estadoPago = "Pago parcial";
          }

          // Lógica de extras
          const extras = booking.ExtraCharges || [];
          const totalExtras = extras.reduce((sum, e) => sum + parseFloat(e.amount), 0);

          // Total final
          const totalFinal = totalReserva + totalExtras;

          return (
            <div key={booking.bookingId} className="bg-white rounded shadow p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">
                  Habitación #{booking.Room?.roomNumber}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">
                  Ocupada
                </span>
              </div>
              <div>
                <span className="font-medium">Reserva:</span> #{booking.bookingId} | Estado: <b>{booking.status}</b>
              </div>
              <div>
                <span className="font-medium">Check-in:</span> {dayjs(booking.checkIn).format("DD/MM/YYYY")}
              </div>
              <div>
                <span className="font-medium">Check-out:</span> {dayjs(booking.checkOut).format("DD/MM/YYYY")}
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
              {/* Lista de huéspedes */}
              <div>
                <span className="font-medium">Huéspedes:</span>
                <ul className="list-disc ml-6">
                  {booking.RegistrationPasses
                    ? booking.RegistrationPasses.map((pass, idx) => (
                        <li key={idx}>{pass.name}</li>
                      ))
                    : booking.guest && (
                        <li>{booking.guest.scostumername || booking.guest.sdocno}</li>
                      )}
                </ul>
              </div>
              {/* Gastos extras */}
              <div>
                <span className="font-medium">Gastos extras:</span>
                <ul className="list-disc ml-6">
                  {extras.length > 0 ? (
                    extras.map((e, idx) => (
                      <li key={idx}>
                        {e.description}: {parseFloat(e.amount).toLocaleString()}
                      </li>
                    ))
                  ) : (
                    <li>No hay gastos extras</li>
                  )}
                </ul>
                <ExtraCharges bookingId={booking.bookingId} />
              </div>
              {/* Total final */}
              <div>
                <span className="font-medium">Total a pagar:</span>{" "}
                <span className="font-bold">{totalFinal.toLocaleString()}</span>
              </div>
              {/* Botón para finalizar check-out */}
              <button
                className="mt-2 px-3 py-1 rounded bg-green-600 text-white"
                 onClick={() => handleCheckOut(booking.bookingId)}
              >
                Finalizar Check-Out
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheckOut;