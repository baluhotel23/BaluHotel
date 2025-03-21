import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { checkAvailability } from "../../Redux/Actions/bookingActions";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./RoomAvailability.css";
import DashboardLayout from "../Dashboard/DashboardLayout";
import RoomReservation from "./RoomReservation";

const RoomAvailability = () => {
  const dispatch = useDispatch();
  const { checkIn, checkOut, availability, loading, error } = useSelector(
    (state) => state.booking
  );
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    dispatch(checkAvailability({ checkIn, checkOut }));
  }, [dispatch, checkIn, checkOut]);

  // Función para determinar la clase de cada fecha en el calendario
  const getTileClassName = ({ date }, bookedDates) => {
    const isBooked = bookedDates.some(
      (booking) =>
        new Date(booking.checkIn) <= date && date <= new Date(booking.checkOut)
    );
    return isBooked ? "booked-date" : "available-date";
  };

  if (loading) {
    return <p>Cargando habitaciones...</p>;
  }

  if (error) {
    return <p className="error-message">Error: {error}</p>;
  }

  if (selectedRoom) {
    return (
      <RoomReservation
        room={selectedRoom}
        checkIn={checkIn}
        checkOut={checkOut}
      />
    );
  }

  const sortedAvailability = [...availability].sort((a, b) => a.roomNumber - b.roomNumber);

  return (
    <DashboardLayout>
      <div className="room-availability-container">
        <h1 className="title">Disponibilidad de Habitaciones</h1>
        <div className="rooms-grid">
          {sortedAvailability.map((room) => (
            <div key={room.roomNumber} className="room-card">
              <h2 className="font-semibold text-2xl text-degrade">Habitación {room.roomNumber}</h2>
              <h5 className="font-semibold text-degrade">Capacidad Maxima {room.maxGuests}</h5>
              <ul>
                {room.Services.map((service) => (
                  <li key={service.serviceId}>{service.name}</li>
                ))}
              </ul>
              <div className="calendar-container">
                <Calendar
                  tileClassName={({ date }) =>
                    getTileClassName({ date }, room.bookedDates)
                  }
                />
              </div>
              <button
                onClick={() => setSelectedRoom(room)}
                className="bg-boton text-white text-lg p-1 rounded-xl"
              >
                Reservar
              </button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RoomAvailability;