import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllBookings, updateBookingStatus, generateBill } from "../../Redux/Actions/bookingActions"; // Asegúrate de importar generateBill
import { updateRoomStatus } from "../../Redux/Actions/roomActions";
import dayjs from "dayjs";
import ExtraCharges from "./ExtraCharge";
import { toast } from "react-toastify";
import DashboardLayout from '../Dashboard/DashboardLayout';

const CheckOut = () => {
  const dispatch = useDispatch();
  const { bookings, loading, error } = useSelector((state) => state.booking);

  useEffect(() => {
    // Modificado para filtrar por status="checked-in" en lugar de roomStatus
    dispatch(getAllBookings({ status: "checked-in" }));
  }, [dispatch]);
  
  // Agregar función para manejar el check-out
  const handleCheckOut = async (bookingId) => {
    try {
      // 1. Actualizar estado de la reserva a "completed"
       await dispatch(updateBookingStatus(bookingId, { status: "completed" }));
      toast.success(`Estado de la reserva #${bookingId} actualizado a "completed".`);
      
      await dispatch(generateBill(bookingId));
      toast.info(`Factura solicitada para la reserva #${bookingId}.`);
      // 2. Encontrar la habitación asociada con esta reserva
       const booking = bookings.find(b => b.bookingId === bookingId);
      if (booking && booking.Room) {
        // 4. Actualizar estado de la habitación a "Disponible"
        await dispatch(updateRoomStatus(booking.Room.roomNumber, { status: "Disponible" }));
        toast.success(`Habitación #${booking.Room.roomNumber} actualizada a "Disponible".`);
      }
      // 4. Refrescar la lista de reservas
      dispatch(getAllBookings({ status: "checked-in" }));
      
      toast.success(`Check-out completado exitosamente para la reserva #${bookingId}`);
    } catch (error) {
      console.error("Error al realizar check-out:", error);
      // El error ya se muestra por las actions individuales, pero puedes agregar un toast general si quieres.
      toast.error("Error al procesar el check-out. Verifique los mensajes anteriores o intente nuevamente.");
    }
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
            // Total pendiente
            const totalPendiente = Math.max(0, totalFinal - totalPagado);

            return (
              <div key={booking.bookingId} className="bg-white rounded shadow p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    Habitación #{booking.Room?.roomNumber}
                  </span>
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    Check-in
                  </span>
                </div>
                <div>
                  <span className="font-medium">Reserva:</span> #{booking.bookingId}
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
                  <span className={totalPendiente > 0 ? "text-red-600 font-bold" : "text-green-600"}>
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
                    {booking.RegistrationPasses && booking.RegistrationPasses.length > 0
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
                {/* Monto pendiente si aplica */}
                {totalPendiente > 0 && (
                  <div className="text-red-600">
                    <span className="font-medium">Pendiente por cobrar:</span>{" "}
                    <span className="font-bold">{totalPendiente.toLocaleString()}</span>
                  </div>
                )}
                {/* Botón para finalizar check-out */}
                <button
                  className={`mt-2 px-3 py-2 rounded text-white ${totalPendiente > 0 ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                  onClick={() => handleCheckOut(booking.bookingId)}
                >
                  {totalPendiente > 0 ? 'Finalizar Check-Out (Pago pendiente)' : 'Finalizar Check-Out'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CheckOut;