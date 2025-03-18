import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/axios"

const BookingStatusPage = () => {
  const { trackingToken } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        // Suponiendo que tengas un endpoint que reciba el token y devuelva la reserva
        const response = await api.get(`/bookings/status/${trackingToken}`);
        setBooking(response.data.data);
      } catch (err) {
        setError("No se pudo obtener la información de la reserva.");
        console.error(err);
      }
    };

    fetchBookingData();
  }, [trackingToken]);

  const handleDownloadPDF = () => {
    window.open(`${import.meta.env.VITE_BACK_URL}/bookings/pdf/${trackingToken}`, "_blank");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Estado de la Reserva</h1>
      {error && <p className="text-red-500">{error}</p>}
      {booking ? (
        <div>
          <p><strong>ID de Reserva:</strong> {booking.bookingId}</p>
          <p><strong>Estado:</strong> {booking.status}</p>
          <p><strong>Fecha de Check In:</strong> {new Date(booking.checkIn).toLocaleString()}</p>
          <p><strong>Fecha de Check Out:</strong> {new Date(booking.checkOut).toLocaleString()}</p>
          <p><strong>Monto Total:</strong> {booking.totalAmount}</p>
          {/* Agrega más detalles si es necesario */}
          <button 
            onClick={handleDownloadPDF} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Descargar PDF de la Reserva
          </button>
        </div>
      ) : (
        !error && <p>Cargando información de la reserva...</p>
      )}
    </div>
  );
};

export default BookingStatusPage;