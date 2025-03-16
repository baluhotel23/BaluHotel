
import  { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllBookings } from '../../Redux/Actions/bookingActions';

const BookingsPendientes = () => {
  const dispatch = useDispatch();
  const { bookings, loading, error } = useSelector((state) => state.booking); // Ajusta el nombre del reducer según tu app

  useEffect(() => {
    // Se envía el parámetro para buscar reservas con status "confirmed"
    dispatch(getAllBookings({ status: 'confirmed' }));
  }, [dispatch]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Reservas Confirmadas</h1>
      {loading && <p>Cargando reservas...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && bookings && bookings.length === 0 && (
        <p>No se encontraron reservas confirmadas.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bookings && bookings.map((booking) => (
          <div key={booking.bookingId} className="bg-white rounded-lg shadow p-4 flex flex-col">
            <div className="mb-2">
              <span className="font-semibold">ID:</span> {booking.bookingId}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Check In:</span> {new Date(booking.checkIn).toLocaleDateString()}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Check Out:</span> {new Date(booking.checkOut).toLocaleDateString()}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Punto de Venta:</span> {booking.pointOfSale}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Estado:</span> {booking.status}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Invitados:</span> {booking.guestCount}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Total:</span> ${booking.totalAmount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingsPendientes;